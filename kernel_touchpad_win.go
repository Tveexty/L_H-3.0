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

// ==================== LUMA OS 1.6.2b: WINDOWS PRECISION TOUCHPAD GESTURES CONTROL ====================
// Cleanly backs up & disables Windows 3-finger / 4-finger Precision Touchpad gestures when
// "Замена горячих клавиш" (ReplaceHotkeys) is active, and restores exact original registry values
// on toggle-off, Ctrl+Alt+Shift+W, or exit — pure Win32 advapi32 + WM_SETTINGCHANGE (zero PowerShell, zero callbacks!).

var (
	tpAdvapi32DLL          = syscall.NewLazyDLL("advapi32.dll")
	tpProcRegCreateKeyExW  = tpAdvapi32DLL.NewProc("RegCreateKeyExW")
	tpProcRegOpenKeyExW    = tpAdvapi32DLL.NewProc("RegOpenKeyExW")
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
	tpHkeyCurrentUser   = uintptr(0x80000001)
	tpKeyRead           = 0x20019
	tpKeySetValue       = 0x0002
	tpKeyAllWrite       = 0x2001F
	tpRegDword          = 4
	tpHwndBroadcast     = uintptr(0xFFFF)
	tpWmSettingChange   = 0x001A
	tpSmtoAbortIfHung   = 0x0002
	tpRegSubkeyPath     = `Software\Microsoft\Windows\CurrentVersion\PrecisionTouchPad`
)

type touchpadRegBackupValue struct {
	Existed bool   `json:"existed"`
	Value   uint32 `json:"value"`
}

type touchpadRegBackup struct {
	Values map[string]touchpadRegBackupValue `json:"values"`
}

var touchpadGestureRegNames = []string{
	"ThreeFingerSlideEnabled",
	"ThreeFingerTapEnabled",
	"FourFingerSlideEnabled",
	"FourFingerTapEnabled",
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
	if ptr, err := syscall.UTF16PtrFromString("PrecisionTouchPad"); err == nil {
		var res uintptr
		_, _, _ = tpProcSendMessageTimout.Call(
			tpHwndBroadcast,
			tpWmSettingChange,
			0,
			uintptr(unsafe.Pointer(ptr)),
			tpSmtoAbortIfHung,
			400,
			uintptr(unsafe.Pointer(&res)),
		)
	}
}

func setWindowsTouchpadGesturesDisabled(disable bool) {
	touchpadMu.Lock()
	defer touchpadMu.Unlock()

	subPtr, err := syscall.UTF16PtrFromString(tpRegSubkeyPath)
	if err != nil {
		return
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
	if r != 0 || hKey == 0 {
		return
	}
	defer tpProcRegCloseKey.Call(hKey)

	bPath := touchpadBackupPath()

	if disable {
		// Save original Windows values ONCE before zeroing them out
		if _, statErr := os.Stat(bPath); os.IsNotExist(statErr) {
			bk := touchpadRegBackup{Values: make(map[string]touchpadRegBackupValue, len(touchpadGestureRegNames))}
			for _, name := range touchpadGestureRegNames {
				v, ok := tpRegReadDword(hKey, name)
				bk.Values[name] = touchpadRegBackupValue{Existed: ok, Value: v}
			}
			if raw, mErr := json.MarshalIndent(bk, "", "  "); mErr == nil {
				_ = os.WriteFile(bPath, raw, 0o600)
			}
		}
		for _, name := range touchpadGestureRegNames {
			tpRegWriteDword(hKey, name, 0)
		}
		touchpadDisabled = true
		tpBroadcastSettingChange()
		return
	}

	// Restore original values from backup (or clean Windows defaults if previously zeroed without backup)
	if raw, rErr := os.ReadFile(bPath); rErr == nil {
		var bk touchpadRegBackup
		if json.Unmarshal(raw, &bk) == nil && len(bk.Values) > 0 {
			for _, name := range touchpadGestureRegNames {
				if orig, ok := bk.Values[name]; ok {
					if orig.Existed {
						tpRegWriteDword(hKey, name, orig.Value)
					} else {
						tpRegDeleteValue(hKey, name)
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
		}
		for name, defVal := range defaults {
			tpRegWriteDword(hKey, name, defVal)
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
