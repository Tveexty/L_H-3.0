//go:build windows

package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"syscall"
	"unsafe"
)

// ==================== LUMA OS 1.6.3: FULL WINDOWS PRECISION TOUCHPAD GESTURE SUPPRESSION ====================
// Disables ALL Windows Precision Touchpad multi-finger gestures (3-finger & 4-finger slides/taps/directions,
// pinch-zoom system hijack, and Windows EdgeUI corner/edge swipes) while Luma OS is running,
// backing up exact original registry DWORDs and cleanly restoring them on toggle-off, Ctrl+Alt+Shift+W, or exit!
// 100% pure Win32 advapi32 + WM_SETTINGCHANGE — ZERO PowerShell, ZERO NewCallback!

var (
	tpAdvapi32DLL          = syscall.NewLazyDLL("advapi32.dll")
	tpProcRegCreateKeyExW  = tpAdvapi32DLL.NewProc("RegCreateKeyExW")
	tpProcRegQueryValueExW = tpAdvapi32DLL.NewProc("RegQueryValueExW")
	tpProcRegSetValueExW   = tpAdvapi32DLL.NewProc("RegSetValueExW")
	tpProcRegDeleteValueW  = tpAdvapi32DLL.NewProc("RegDeleteValueW")
	tpProcRegCloseKey      = tpAdvapi32DLL.NewProc("RegCloseKey")

	tpUser32DLL             = syscall.NewLazyDLL("user32.dll")
	tpProcSendMessageTimout = tpUser32DLL.NewProc("SendMessageTimeoutW")

	touchpadMu       sync.Mutex
	touchpadDisabled bool
)

const (
	tpHkeyCurrentUser = uintptr(0x80000001)
	tpKeyAllWrite     = 0x2001F
	tpRegDword        = 4
	tpHwndBroadcast   = uintptr(0xFFFF)
	tpWmSettingChange = 0x001A
	tpSmtoAbortIfHung = 0x0002

	tpRegSubkeyPath = `Software\Microsoft\Windows\CurrentVersion\PrecisionTouchPad`
	tpEdgeUiSubkey  = `Software\Microsoft\Windows\CurrentVersion\ImmersiveShell\EdgeUi`
)

type touchpadRegBackupValue struct {
	Existed bool   `json:"existed"`
	Value   uint32 `json:"value"`
}

type touchpadRegBackup struct {
	Values map[string]touchpadRegBackupValue `json:"values"`
	EdgeUI map[string]touchpadRegBackupValue `json:"edge_ui,omitempty"`
}

// ALL Windows 10 / 11 Precision Touchpad multi-finger & pinch gestures
var touchpadGestureRegNames = []string{
	"ThreeFingerSlideEnabled",
	"ThreeFingerTapEnabled",
	"ThreeFingerUp",
	"ThreeFingerDown",
	"ThreeFingerLeft",
	"ThreeFingerRight",
	"FourFingerSlideEnabled",
	"FourFingerTapEnabled",
	"FourFingerUp",
	"FourFingerDown",
	"FourFingerLeft",
	"FourFingerRight",
	"ZoomEnabled",
}

// Windows Edge / Corner swipe gestures
var touchpadEdgeUiRegValues = map[string]uint32{
	"DisableCharmsHint": 1,
	"DisableTLCorner":   1,
	"DisableTRCorner":   1,
}

func touchpadBackupPath() string {
	cfgDir, err := os.UserConfigDir()
	if err != nil || cfgDir == "" {
		cfgDir = os.TempDir()
	}
	dir := filepath.Join(cfgDir, "LumaOS")
	_ = os.MkdirAll(dir, 0o700)
	return filepath.Join(dir, "touchpad_gestures_backup.json")
}

func tpOpenOrCreateKey(subkey string) uintptr {
	subPtr, err := syscall.UTF16PtrFromString(subkey)
	if err != nil {
		return 0
	}
	var hKey uintptr
	r, _, _ := tpProcRegCreateKeyExW.Call(
		tpHkeyCurrentUser,
		uintptr(unsafe.Pointer(subPtr)),
		0,
		0,
		0,
		tpKeyAllWrite,
		0,
		uintptr(unsafe.Pointer(&hKey)),
		0,
	)
	if r != 0 {
		return 0
	}
	return hKey
}

func tpRegReadDword(hKey uintptr, name string) (uint32, bool) {
	namePtr, err := syscall.UTF16PtrFromString(name)
	if err != nil {
		return 0, false
	}
	var val uint32
	var valType uint32
	size := uint32(unsafe.Sizeof(val))
	r, _, _ := tpProcRegQueryValueExW.Call(
		hKey,
		uintptr(unsafe.Pointer(namePtr)),
		0,
		uintptr(unsafe.Pointer(&valType)),
		uintptr(unsafe.Pointer(&val)),
		uintptr(unsafe.Pointer(&size)),
	)
	if r != 0 || valType != tpRegDword {
		return 0, false
	}
	return val, true
}

func tpRegWriteDword(hKey uintptr, name string, val uint32) bool {
	namePtr, err := syscall.UTF16PtrFromString(name)
	if err != nil {
		return false
	}
	r, _, _ := tpProcRegSetValueExW.Call(
		hKey,
		uintptr(unsafe.Pointer(namePtr)),
		0,
		tpRegDword,
		uintptr(unsafe.Pointer(&val)),
		unsafe.Sizeof(val),
	)
	return r == 0
}

func tpRegDeleteValue(hKey uintptr, name string) {
	namePtr, err := syscall.UTF16PtrFromString(name)
	if err != nil {
		return
	}
	_, _, _ = tpProcRegDeleteValueW.Call(hKey, uintptr(unsafe.Pointer(namePtr)))
}

func tpBroadcastSettingChange() {
	for _, topic := range []string{"PrecisionTouchPad", "ImmersiveShell"} {
		if ptr, err := syscall.UTF16PtrFromString(topic); err == nil {
			var res uintptr
			_, _, _ = tpProcSendMessageTimout.Call(
				tpHwndBroadcast,
				tpWmSettingChange,
				0,
				uintptr(unsafe.Pointer(ptr)),
				tpSmtoAbortIfHung,
				350,
				uintptr(unsafe.Pointer(&res)),
			)
		}
	}
}

func setWindowsTouchpadGesturesDisabled(disable bool) {
	touchpadMu.Lock()
	defer touchpadMu.Unlock()

	hKey := tpOpenOrCreateKey(tpRegSubkeyPath)
	if hKey == 0 {
		return
	}
	defer tpProcRegCloseKey.Call(hKey)

	hEdge := tpOpenOrCreateKey(tpEdgeUiSubkey)
	if hEdge != 0 {
		defer tpProcRegCloseKey.Call(hEdge)
	}

	bPath := touchpadBackupPath()

	if disable {
		// Save original Windows values ONCE before disabling ALL Windows touchpad & edge gestures
		if _, statErr := os.Stat(bPath); os.IsNotExist(statErr) {
			bk := touchpadRegBackup{
				Values: make(map[string]touchpadRegBackupValue, len(touchpadGestureRegNames)),
				EdgeUI: make(map[string]touchpadRegBackupValue, len(touchpadEdgeUiRegValues)),
			}
			for _, name := range touchpadGestureRegNames {
				v, ok := tpRegReadDword(hKey, name)
				bk.Values[name] = touchpadRegBackupValue{Existed: ok, Value: v}
			}
			if hEdge != 0 {
				for name := range touchpadEdgeUiRegValues {
					v, ok := tpRegReadDword(hEdge, name)
					bk.EdgeUI[name] = touchpadRegBackupValue{Existed: ok, Value: v}
				}
			}
			if raw, mErr := json.MarshalIndent(bk, "", "  "); mErr == nil {
				_ = os.WriteFile(bPath, raw, 0o600)
			}
		}
		for _, name := range touchpadGestureRegNames {
			tpRegWriteDword(hKey, name, 0)
		}
		if hEdge != 0 {
			for name, val := range touchpadEdgeUiRegValues {
				tpRegWriteDword(hEdge, name, val)
			}
		}
		touchpadDisabled = true
		tpBroadcastSettingChange()
		return
	}

	// Restore exact original Windows values from backup
	if raw, rErr := os.ReadFile(bPath); rErr == nil {
		var bk touchpadRegBackup
		if json.Unmarshal(raw, &bk) == nil {
			for _, name := range touchpadGestureRegNames {
				if orig, ok := bk.Values[name]; ok {
					if orig.Existed {
						tpRegWriteDword(hKey, name, orig.Value)
					} else {
						tpRegDeleteValue(hKey, name)
					}
				}
			}
			if hEdge != 0 && len(bk.EdgeUI) > 0 {
				for name := range touchpadEdgeUiRegValues {
					if orig, ok := bk.EdgeUI[name]; ok {
						if orig.Existed {
							tpRegWriteDword(hEdge, name, orig.Value)
						} else {
							tpRegDeleteValue(hEdge, name)
						}
					}
				}
			}
		}
		_ = os.Remove(bPath)
	} else if touchpadDisabled {
		defaults := map[string]uint32{
			"ThreeFingerSlideEnabled": 1,
			"ThreeFingerTapEnabled":   2,
			"FourFingerSlideEnabled":  1,
			"FourFingerTapEnabled":    4,
			"ZoomEnabled":             1,
		}
		for name, defVal := range defaults {
			tpRegWriteDword(hKey, name, defVal)
		}
		if hEdge != 0 {
			for name := range touchpadEdgeUiRegValues {
				tpRegWriteDword(hEdge, name, 0)
			}
		}
	}
	touchpadDisabled = false
	tpBroadcastSettingChange()
}

func restoreWindowsTouchpadGestures() {
	touchpadMu.Lock()
	wasDisabled := touchpadDisabled
	_, backupExists := os.Stat(touchpadBackupPath())
	touchpadMu.Unlock()
	if wasDisabled || backupExists == nil {
		setWindowsTouchpadGesturesDisabled(false)
	}
}

func isWindowsTouchpadGesturesDisabled() bool {
	touchpadMu.Lock()
	defer touchpadMu.Unlock()
	return touchpadDisabled
}
