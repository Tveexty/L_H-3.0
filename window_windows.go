//go:build windows

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"

	"github.com/jchv/go-webview2"
)

var (
	dwmapiDLL               = syscall.NewLazyDLL("dwmapi.dll")
	procDwmSetWindowAttr    = dwmapiDLL.NewProc("DwmSetWindowAttribute")

	user32WinDLL            = syscall.NewLazyDLL("user32.dll")
	procGetWindowLongW      = user32WinDLL.NewProc("GetWindowLongW")
	procSetWindowLongW      = user32WinDLL.NewProc("SetWindowLongW")
	procGetWindowRect       = user32WinDLL.NewProc("GetWindowRect")
	procMonitorFromWindow   = user32WinDLL.NewProc("MonitorFromWindow")
	procGetMonitorInfoW     = user32WinDLL.NewProc("GetMonitorInfoW")
	procSetWindowPos        = user32WinDLL.NewProc("SetWindowPos")
	procShowWindow          = user32WinDLL.NewProc("ShowWindow")
	procFindWindowW         = user32WinDLL.NewProc("FindWindowW")
	procSystemParametersInf = user32WinDLL.NewProc("SystemParametersInfoW")
	procGetSystemMetrics    = user32WinDLL.NewProc("GetSystemMetrics")
)

const (
	gwlStyle             = ^uintptr(15) // -16
	wsOverlappedWindow   = 0x00CF0000
	wsPopup              = 0x80000000
	swpFrameChanged      = 0x0020
	swpNoOwnerZOrder     = 0x0200
	swpNoMove            = 0x0002
	swpNoSize            = 0x0001
	monitorDefaultToNear = 2
	dwmwaUseDarkMode     = 20
	swHide               = 0
	swShow               = 5
	spiSetWorkArea       = 0x002F
	spiGetWorkArea       = 0x0030
	spifSendChange       = 0x0002
	smCXScreen           = 0
	smCYScreen           = 1
	hwndTopmost          = ^uintptr(0) // -1
	hwndNoTopmost        = ^uintptr(1) // -2
)

type winRect struct {
	Left, Top, Right, Bottom int32
}

type monitorInfo struct {
	CbSize    uint32
	RcMonitor winRect
	RcWork    winRect
	DwFlags   uint32
}

var (
	nativeWinMu       sync.Mutex
	nativeWebView     webview2.WebView
	nativeFull        bool
	savedWinStyle     uintptr
	savedWinRect      winRect
	winTaskbarHidden  bool
	savedOrigWorkArea winRect
	hasSavedWorkArea  bool
	activeShellCfg    = defaultShellConfig()
)

func defaultShellConfig() ShellModeConfig {
	return ShellModeConfig{
		StartFullscreen:    false,
		AutostartWithOS:    false,
		HideWindowsTaskbar: false,
		ReserveWorkArea:    true,
		AlwaysOnTop:        false,
		ReplaceHotkeys:     true,
		TaskbarPosition:    "bottom",
		TaskbarSizePx:      54,
	}
}

func shellConfigFilePath() string {
	cfgDir, err := os.UserConfigDir()
	if err != nil || cfgDir == "" {
		cfgDir = os.TempDir()
	}
	dir := filepath.Join(cfgDir, "LumaOS")
	_ = os.MkdirAll(dir, 0o700)
	return filepath.Join(dir, "shell_config.json")
}

func loadShellConfig() ShellModeConfig {
	cfg := defaultShellConfig()
	raw, err := os.ReadFile(shellConfigFilePath())
	if err == nil {
		_ = json.Unmarshal(raw, &cfg)
	}
	if cfg.TaskbarSizePx < 38 || cfg.TaskbarSizePx > 96 {
		cfg.TaskbarSizePx = 54
	}
	if cfg.TaskbarPosition == "" {
		cfg.TaskbarPosition = "bottom"
	}
	cfg.AutostartWithOS = isWindowsAutostartEnabled()
	nativeWinMu.Lock()
	activeShellCfg = cfg
	nativeWinMu.Unlock()

	setCustomAltTabEnabled(cfg.ReplaceHotkeys)
	setWinDToLumaEnabled(cfg.ReplaceHotkeys)
	setWinKeyToLumaEnabled(cfg.ReplaceHotkeys)
	return cfg
}

func saveShellConfig(cfg ShellModeConfig) {
	if cfg.TaskbarSizePx < 38 {
		cfg.TaskbarSizePx = 38
	}
	if cfg.TaskbarSizePx > 96 {
		cfg.TaskbarSizePx = 96
	}
	if cfg.TaskbarPosition == "" {
		cfg.TaskbarPosition = "bottom"
	}
	nativeWinMu.Lock()
	activeShellCfg = cfg
	nativeWinMu.Unlock()
	if raw, err := json.MarshalIndent(cfg, "", "  "); err == nil {
		_ = os.WriteFile(shellConfigFilePath(), raw, 0o600)
	}
}

func getShellConfig() ShellModeConfig {
	nativeWinMu.Lock()
	cfg := activeShellCfg
	nativeWinMu.Unlock()
	return cfg
}

func findWindowByClass(className string) uintptr {
	ptr, err := syscall.UTF16PtrFromString(className)
	if err != nil {
		return 0
	}
	hwnd, _, _ := procFindWindowW.Call(uintptr(unsafe.Pointer(ptr)), 0)
	return hwnd
}

func setWindowsTaskbarVisible(visible bool) {
	cmd := uintptr(swHide)
	if visible {
		cmd = uintptr(swShow)
	}
	for _, cls := range []string{"Shell_TrayWnd", "Shell_SecondaryTrayWnd"} {
		if hwnd := findWindowByClass(cls); hwnd != 0 {
			_, _, _ = procShowWindow.Call(hwnd, cmd)
		}
	}
	winTaskbarHidden = !visible
}

func applyDesktopWorkArea(cfg ShellModeConfig) {
	if !hasSavedWorkArea {
		var rc winRect
		r, _, _ := procSystemParametersInf.Call(spiGetWorkArea, 0, uintptr(unsafe.Pointer(&rc)), 0)
		if r != 0 {
			savedOrigWorkArea = rc
			hasSavedWorkArea = true
		}
	}

	scrW, _, _ := procGetSystemMetrics.Call(smCXScreen)
	scrH, _, _ := procGetSystemMetrics.Call(smCYScreen)
	if scrW == 0 || scrH == 0 {
		return
	}

	if cfg.HideWindowsTaskbar && cfg.ReserveWorkArea {
		bar := int32(cfg.TaskbarSizePx)
		if bar < 38 {
			bar = 38
		}
		if bar > 96 {
			bar = 96
		}
		rc := winRect{Left: 0, Top: 0, Right: int32(scrW), Bottom: int32(scrH)}
		switch cfg.TaskbarPosition {
		case "top":
			rc.Top = bar
		case "left":
			rc.Left = bar
		case "right":
			rc.Right = int32(scrW) - bar
		default:
			rc.Bottom = int32(scrH) - bar
		}
		_, _, _ = procSystemParametersInf.Call(spiSetWorkArea, 0, uintptr(unsafe.Pointer(&rc)), spifSendChange)
	} else if hasSavedWorkArea {
		rc := savedOrigWorkArea
		_, _, _ = procSystemParametersInf.Call(spiSetWorkArea, 0, uintptr(unsafe.Pointer(&rc)), spifSendChange)
	}
}

func restoreWindowsShell() {
	nativeWinMu.Lock()
	wasHidden := winTaskbarHidden
	orig := savedOrigWorkArea
	hadOrig := hasSavedWorkArea
	nativeWinMu.Unlock()

	if wasHidden {
		setWindowsTaskbarVisible(true)
	}
	if hadOrig {
		_, _, _ = procSystemParametersInf.Call(spiSetWorkArea, 0, uintptr(unsafe.Pointer(&orig)), spifSendChange)
	}
	restoreWindowsTouchpadGestures()
}

func isWindowsAutostartEnabled() bool {
	out, err := runHiddenPowerShell(`(Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'LumaOS' -ErrorAction SilentlyContinue).LumaOS`)
	return err == nil && strings.TrimSpace(out) != ""
}

func setWindowsAutostart(enabled bool, startFullscreen bool) error {
	if !enabled {
		_, err := runHiddenPowerShell(`Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'LumaOS' -ErrorAction SilentlyContinue`)
		return err
	}
	exe, err := os.Executable()
	if err != nil || exe == "" {
		return fmt.Errorf("cannot locate LumaOS executable")
	}
	val := fmt.Sprintf(`"%s"`, exe)
	if startFullscreen {
		val += " --fullscreen"
	}
	escaped := strings.ReplaceAll(val, "'", "''")
	script := fmt.Sprintf(`New-Item -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Force | Out-Null; Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'LumaOS' -Value '%s'`, escaped)
	_, err = runHiddenPowerShell(script)
	return err
}

func applyShellModeConfig(cfg ShellModeConfig) ShellModeConfig {
	saveShellConfig(cfg)
	_ = setWindowsAutostart(cfg.AutostartWithOS, cfg.StartFullscreen)

	// Atomically sync all Luma OS hotkey replacements + Windows Precision Touchpad gesture suppression
	setCustomAltTabEnabled(cfg.ReplaceHotkeys)
	setWinDToLumaEnabled(cfg.ReplaceHotkeys)
	setWinKeyToLumaEnabled(cfg.ReplaceHotkeys)
	setWindowsTouchpadGesturesDisabled(cfg.ReplaceHotkeys)

	// Hide or show native Windows taskbar (Shell_TrayWnd)
	setWindowsTaskbarVisible(!cfg.HideWindowsTaskbar)
	applyDesktopWorkArea(cfg)

	// Toggle native fullscreen if requested
	if cfg.StartFullscreen != isNativeFullscreen() {
		f := cfg.StartFullscreen
		toggleNativeFullscreen(&f)
	}

	// Update Always-On-Top flag on native WebView2 window
	nativeWinMu.Lock()
	wv := nativeWebView
	nativeWinMu.Unlock()
	if wv != nil {
		topmost := cfg.AlwaysOnTop
		wv.Dispatch(func() {
			hwnd := uintptr(wv.Window())
			if hwnd == 0 {
				return
			}
			insertAfter := hwndNoTopmost
			if topmost {
				insertAfter = hwndTopmost
			}
			_, _, _ = procSetWindowPos.Call(hwnd, insertAfter, 0, 0, 0, 0, swpNoMove|swpNoSize|swpNoOwnerZOrder)
		})
	}
	return getShellConfig()
}

func enableDarkTitlebar(hwnd uintptr) {
	if hwnd == 0 {
		return
	}
	var dark int32 = 1
	_, _, _ = procDwmSetWindowAttr.Call(
		hwnd,
		uintptr(dwmwaUseDarkMode),
		uintptr(unsafe.Pointer(&dark)),
		unsafe.Sizeof(dark),
	)
}

func toggleNativeFullscreen(force *bool) bool {
	nativeWinMu.Lock()
	wv := nativeWebView
	if wv == nil {
		nativeWinMu.Unlock()
		return false
	}
	target := !nativeFull
	if force != nil {
		target = *force
	}
	nativeFull = target
	topmost := activeShellCfg.AlwaysOnTop
	nativeWinMu.Unlock()

	wv.Dispatch(func() {
		hwnd := uintptr(wv.Window())
		if hwnd == 0 {
			return
		}
		insertAfter := uintptr(0)
		if topmost {
			insertAfter = hwndTopmost
		}
		if target {
			style, _, _ := procGetWindowLongW.Call(hwnd, gwlStyle)
			savedWinStyle = style
			_, _, _ = procGetWindowRect.Call(hwnd, uintptr(unsafe.Pointer(&savedWinRect)))

			hMon, _, _ := procMonitorFromWindow.Call(hwnd, monitorDefaultToNear)
			var mi monitorInfo
			mi.CbSize = uint32(unsafe.Sizeof(mi))
			_, _, _ = procGetMonitorInfoW.Call(hMon, uintptr(unsafe.Pointer(&mi)))

			newStyle := (style &^ uintptr(wsOverlappedWindow)) | uintptr(wsPopup)
			_, _, _ = procSetWindowLongW.Call(hwnd, gwlStyle, newStyle)
			_, _, _ = procSetWindowPos.Call(
				hwnd,
				insertAfter,
				uintptr(mi.RcMonitor.Left),
				uintptr(mi.RcMonitor.Top),
				uintptr(mi.RcMonitor.Right-mi.RcMonitor.Left),
				uintptr(mi.RcMonitor.Bottom-mi.RcMonitor.Top),
				swpNoOwnerZOrder|swpFrameChanged,
			)
		} else {
			if savedWinStyle != 0 {
				_, _, _ = procSetWindowLongW.Call(hwnd, gwlStyle, savedWinStyle)
			} else {
				_, _, _ = procSetWindowLongW.Call(hwnd, gwlStyle, wsOverlappedWindow)
			}
			w := savedWinRect.Right - savedWinRect.Left
			h := savedWinRect.Bottom - savedWinRect.Top
			if w < 640 || h < 480 {
				savedWinRect = winRect{Left: 80, Top: 50, Right: 1520, Bottom: 950}
				w = 1440
				h = 900
			}
			_, _, _ = procSetWindowPos.Call(
				hwnd,
				insertAfter,
				uintptr(savedWinRect.Left),
				uintptr(savedWinRect.Top),
				uintptr(w),
				uintptr(h),
				swpNoOwnerZOrder|swpFrameChanged,
			)
		}
	})
	return target
}

func isNativeFullscreen() bool {
	nativeWinMu.Lock()
	defer nativeWinMu.Unlock()
	return nativeFull
}

// runNativeDesktopWindow hosts Luma OS 1.2.0 (Lithium) inside its standalone Win32 WebView2 GUI window
// with permanent version-independent WebView2 DataPath so user widgets, folders & apps survive EVERY update!
func runNativeDesktopWindow(url string, forceFullscreen bool) bool {
	cfg := loadShellConfig()
	if forceFullscreen {
		cfg.StartFullscreen = true
	}

	cfgDir, err := os.UserConfigDir()
	if err != nil {
		cfgDir = os.TempDir()
	}
	dataPath := filepath.Join(cfgDir, "LumaOS", "WebView2")
	// Auto-migrate existing WebView2 localStorage from older versioned folders if permanent profile doesn't exist yet
	if _, statErr := os.Stat(dataPath); os.IsNotExist(statErr) {
		for _, legacy := range []string{
			filepath.Join(cfgDir, "LumaOS_Helium", "WebView2"),
			filepath.Join(cfgDir, "LumaOS_1.0.4", "WebView2"),
			filepath.Join(cfgDir, "LumaOS_1.0.3", "WebView2"),
		} {
			if st, err2 := os.Stat(legacy); err2 == nil && st.IsDir() {
				_ = os.MkdirAll(filepath.Dir(dataPath), 0o700)
				if errMove := os.Rename(legacy, dataPath); errMove != nil {
					_ = copyPathRecursive(legacy, dataPath)
				}
				break
			}
		}
	}
	_ = os.MkdirAll(dataPath, 0o700)

	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     false,
		AutoFocus: true,
		DataPath:  dataPath,
		WindowOptions: webview2.WindowOptions{
			Title:  "Luma OS 1.6.4 (Nitrogen)",
			Width:  1440,
			Height: 900,
			IconId: 1,
			Center: true,
		},
	})
	if w == nil {
		log.Printf("[LumaOS] WebView2 runtime unavailable — falling back.")
		return false
	}
	defer func() {
		restoreWindowsShell()
		w.Destroy()
	}()

	nativeWinMu.Lock()
	nativeWebView = w
	nativeWinMu.Unlock()

	hwnd := uintptr(w.Window())
	enableDarkTitlebar(hwnd)

	w.SetSize(1440, 900, webview2.HintNone)

	// Inject early capture-phase Alt+R interceptor BEFORE React loads so WebView2 never swallows Alt+R into Win32 menu focus,
	// using stopImmediatePropagation to prevent double-toggle with React's document keydown listener!
	w.Init(`
		(function() {
			if (window.__lumaHotkeysInit) return;
			window.__lumaHotkeysInit = true;
			document.addEventListener('keydown', function(e) {
				var isR = (e.code === 'KeyR' || e.keyCode === 82 || (e.key && (e.key.toLowerCase() === 'r' || e.key.toLowerCase() === 'к')));
				if (e.altKey && !e.ctrlKey && !e.metaKey && isR) {
					e.preventDefault();
					e.stopPropagation();
					if (e.stopImmediatePropagation) e.stopImmediatePropagation();
					window.dispatchEvent(new CustomEvent('luma-toggle-spotlight'));
				}
			}, true);
		})();
	`)

	// Native Win32 hotkey + instant keyboard layout push monitor + Luma Alt+Tab Hook + Precision Touchpad HID Gestures!
	stopHotkeys := make(chan struct{})
	go startWin32AltRListener(w, hwnd, stopHotkeys)
	go startWin32AltTabHook(w, hwnd, stopHotkeys)
	go startNativeTouchpadRawInputListener(w, hwnd, stopHotkeys)

	// Apply persisted shell mode (fullscreen, hide Windows taskbar, reserve work area, touchpad gesture override)
	if cfg.ReplaceHotkeys {
		setWindowsTouchpadGesturesDisabled(true)
	}
	if cfg.HideWindowsTaskbar {
		setWindowsTaskbarVisible(false)
		applyDesktopWorkArea(cfg)
	}
	if cfg.StartFullscreen {
		f := true
		toggleNativeFullscreen(&f)
	}

	w.Navigate(url)
	w.Run()

	close(stopHotkeys)
	nativeWinMu.Lock()
	nativeWebView = nil
	nativeWinMu.Unlock()
	return true
}

var (
	customAltTabMu      sync.Mutex
	customAltTabEnabled = true
	winDToLumaEnabled   = true
	winKeyToLumaEnabled = true
	altTabPinnedTopmost = false
)

func setCustomAltTabEnabled(enabled bool) {
	customAltTabMu.Lock()
	customAltTabEnabled = enabled
	customAltTabMu.Unlock()
}

func isCustomAltTabEnabled() bool {
	customAltTabMu.Lock()
	defer customAltTabMu.Unlock()
	return customAltTabEnabled
}

func setWinDToLumaEnabled(enabled bool) {
	customAltTabMu.Lock()
	winDToLumaEnabled = enabled
	customAltTabMu.Unlock()
}

func isWinDToLumaEnabled() bool {
	customAltTabMu.Lock()
	defer customAltTabMu.Unlock()
	return winDToLumaEnabled
}

func setWinKeyToLumaEnabled(enabled bool) {
	customAltTabMu.Lock()
	winKeyToLumaEnabled = enabled
	customAltTabMu.Unlock()
}

func isWinKeyToLumaEnabled() bool {
	customAltTabMu.Lock()
	defer customAltTabMu.Unlock()
	return winKeyToLumaEnabled
}

// focusWebView2InnerChild ensures keyboard focus lands inside the embedded WebView2 Chrome_WidgetWin child HWND
// so Alt+Tab / Start / Ubuntu panel immediately respond to keyboard events over Luma Desktop AND Windows Desktop.
func focusWebView2InnerChild(parentHwnd uintptr) {
	if parentHwnd == 0 {
		return
	}
	procFindWindowExW := user32WinDLL.NewProc("FindWindowExW")
	procGetWindowChild := user32WinDLL.NewProc("GetWindow")
	procSetFocusLocal := user32WinDLL.NewProc("SetFocus")
	const gwChild = 5

	for _, cls := range []string{"Chrome_WidgetWin_1", "Chrome_WidgetWin_0"} {
		if ptr, err := syscall.UTF16PtrFromString(cls); err == nil {
			if child, _, _ := procFindWindowExW.Call(parentHwnd, 0, uintptr(unsafe.Pointer(ptr)), 0); child != 0 {
				_, _, _ = procSetFocusLocal.Call(child)
				if grand, _, _ := procGetWindowChild.Call(child, gwChild); grand != 0 {
					_, _, _ = procSetFocusLocal.Call(grand)
				}
				return
			}
		}
	}
	if child, _, _ := procGetWindowChild.Call(parentHwnd, gwChild); child != 0 {
		_, _, _ = procSetFocusLocal.Call(child)
	}
}

// forceBringLumaToFront elevates Luma OS ABOVE all active Windows apps (Chrome, Telegram, fullscreen borderless apps,
// and bare Windows Desktop Progman/WorkerW) using AttachThreadInput + AllowSetForegroundWindow + HWND_TOPMOST
// AND transfers Win32 keyboard focus into the WebView2 inner child HWND.
func forceBringLumaToFront(lumaHwnd uintptr, pinTopmost bool) {
	if lumaHwnd == 0 {
		return
	}
	procIsIconic := user32WinDLL.NewProc("IsIconic")
	procGetFg := user32WinDLL.NewProc("GetForegroundWindow")
	procGetWinThreadProcId := user32WinDLL.NewProc("GetWindowThreadProcessId")
	procAttachThreadInput := user32WinDLL.NewProc("AttachThreadInput")
	procAllowSetFg := user32WinDLL.NewProc("AllowSetForegroundWindow")
	procBringToTop := user32WinDLL.NewProc("BringWindowToTop")
	procSetFg := user32WinDLL.NewProc("SetForegroundWindow")
	procSetFocus := user32WinDLL.NewProc("SetFocus")

	const (
		swRestore     = 9
		swpShowWindow = 0x0040
		asfwAny       = ^uintptr(0)
	)

	iconic, _, _ := procIsIconic.Call(lumaHwnd)
	if iconic != 0 {
		_, _, _ = procShowWindow.Call(lumaHwnd, swRestore)
	} else {
		_, _, _ = procShowWindow.Call(lumaHwnd, swShow)
	}

	fgHwnd, _, _ := procGetFg.Call()
	var fgTid, lumaTid uintptr
	if fgHwnd != 0 {
		fgTid, _, _ = procGetWinThreadProcId.Call(fgHwnd, 0)
	}
	lumaTid, _, _ = procGetWinThreadProcId.Call(lumaHwnd, 0)

	attached := false
	if fgTid != 0 && lumaTid != 0 && fgTid != lumaTid {
		ok, _, _ := procAttachThreadInput.Call(fgTid, lumaTid, 1)
		attached = ok != 0
	}

	_, _, _ = procAllowSetFg.Call(asfwAny)
	_, _, _ = procSetWindowPos.Call(lumaHwnd, hwndTopmost, 0, 0, 0, 0, swpNoMove|swpNoSize|swpShowWindow)
	_, _, _ = procBringToTop.Call(lumaHwnd)
	_, _, _ = procSetFg.Call(lumaHwnd)
	_, _, _ = procSetFocus.Call(lumaHwnd)
	focusWebView2InnerChild(lumaHwnd)

	if attached {
		_, _, _ = procAttachThreadInput.Call(fgTid, lumaTid, 0)
	}

	if pinTopmost {
		customAltTabMu.Lock()
		altTabPinnedTopmost = true
		customAltTabMu.Unlock()
	} else {
		nativeWinMu.Lock()
		keepTop := activeShellCfg.AlwaysOnTop || pinnedLumaWindowTopmost
		nativeWinMu.Unlock()
		if !keepTop {
			_, _, _ = procSetWindowPos.Call(lumaHwnd, hwndNoTopmost, 0, 0, 0, 0, swpNoMove|swpNoSize|swpNoOwnerZOrder)
		}
		customAltTabMu.Lock()
		altTabPinnedTopmost = false
		customAltTabMu.Unlock()
	}
}

var pinnedLumaWindowTopmost bool

func setLumaPinnedWindowTopmost(enabled bool) bool {
	nativeWinMu.Lock()
	pinnedLumaWindowTopmost = enabled
	wv := nativeWebView
	keepTop := activeShellCfg.AlwaysOnTop || pinnedLumaWindowTopmost
	nativeWinMu.Unlock()
	if wv != nil {
		wv.Dispatch(func() {
			hwnd := uintptr(wv.Window())
			if hwnd == 0 {
				return
			}
			insertAfter := hwndNoTopmost
			if keepTop {
				insertAfter = hwndTopmost
			}
			_, _, _ = procSetWindowPos.Call(hwnd, insertAfter, 0, 0, 0, 0, swpNoMove|swpNoSize|swpNoOwnerZOrder)
		})
	}
	return keepTop
}

func isLumaPinnedWindowTopmost() bool {
	nativeWinMu.Lock()
	defer nativeWinMu.Unlock()
	return pinnedLumaWindowTopmost || activeShellCfg.AlwaysOnTop
}

func releaseAltTabTopmost() {
	kbdHookStateMu.Lock()
	kbdAltTabActive = false
	kbdHookStateMu.Unlock()

	customAltTabMu.Lock()
	wasPinned := altTabPinnedTopmost
	altTabPinnedTopmost = false
	customAltTabMu.Unlock()

	nativeWinMu.Lock()
	wv := nativeWebView
	keepTop := activeShellCfg.AlwaysOnTop || pinnedLumaWindowTopmost
	nativeWinMu.Unlock()
	if wv == nil || keepTop || !wasPinned {
		return
	}
	wv.Dispatch(func() {
		hwnd := uintptr(wv.Window())
		if hwnd == 0 {
			return
		}
		_, _, _ = procSetWindowPos.Call(hwnd, hwndNoTopmost, 0, 0, 0, 0, swpNoMove|swpNoSize|swpNoOwnerZOrder)
	})
}

func bringLumaHomeNow() {
	nativeWinMu.Lock()
	wv := nativeWebView
	nativeWinMu.Unlock()
	if wv == nil {
		return
	}
	wv.Dispatch(func() {
		hwnd := uintptr(wv.Window())
		if hwnd != 0 {
			forceBringLumaToFront(hwnd, false)
		}
	})
}

func suspendWindowTopmost(suspend bool) {
	nativeWinMu.Lock()
	wv := nativeWebView
	restoreTop := activeShellCfg.AlwaysOnTop || pinnedLumaWindowTopmost
	nativeWinMu.Unlock()
	if wv == nil {
		return
	}
	wv.Dispatch(func() {
		hwnd := uintptr(wv.Window())
		if hwnd == 0 {
			return
		}
		insertAfter := hwndNoTopmost
		if !suspend && restoreTop {
			insertAfter = hwndTopmost
		}
		_, _, _ = procSetWindowPos.Call(hwnd, insertAfter, 0, 0, 0, 0, swpNoMove|swpNoSize|swpNoOwnerZOrder)
	})
}

type kbdLLHookStruct struct {
	VkCode      uint32
	ScanCode    uint32
	Flags       uint32
	Time        uint32
	DwExtraInfo uintptr
}

type winMsgStruct struct {
	Hwnd    uintptr
	Message uint32
	WParam  uintptr
	LParam  uintptr
	Time    uint32
	PtX     int32
	PtY     int32
}

func safeWebViewEval(wv webview2.WebView, stopCh <-chan struct{}, js string) {
	defer func() { _ = recover() }()
	if wv == nil {
		return
	}
	select {
	case <-stopCh:
		return
	default:
	}
	wv.Dispatch(func() {
		defer func() { _ = recover() }()
		select {
		case <-stopCh:
			return
		default:
		}
		wv.Eval(js)
	})
}

// ==================== PACKAGE-LEVEL SINGLETON WH_KEYBOARD_LL HOOK (ZERO CALLBACK LEAKS!) ====================
// All Win32 procs & the single syscall.NewCallback are allocated ONCE at package init time.
var (
	procHookSetWindowsHookExW   = user32WinDLL.NewProc("SetWindowsHookExW")
	procHookUnhookWindowsHookEx = user32WinDLL.NewProc("UnhookWindowsHookEx")
	procHookCallNextHookEx      = user32WinDLL.NewProc("CallNextHookEx")
	procHookGetMessageW         = user32WinDLL.NewProc("GetMessageW")
	procHookPostThreadMessageW  = user32WinDLL.NewProc("PostThreadMessageW")
	procHookGetAsyncKeyState    = user32WinDLL.NewProc("GetAsyncKeyState")
	procHookGetFg               = user32WinDLL.NewProc("GetForegroundWindow")
	procHookIsChild             = user32WinDLL.NewProc("IsChild")
	procHookKeybdEvent          = user32WinDLL.NewProc("keybd_event")
	kernel32HookDLL             = syscall.NewLazyDLL("kernel32.dll")
	procHookGetCurrentThreadId  = kernel32HookDLL.NewProc("GetCurrentThreadId")

	kbdHookStateMu    sync.Mutex
	kbdHookHandle     uintptr
	kbdHookWebView    webview2.WebView
	kbdHookLumaHwnd   uintptr
	kbdHookStopCh     <-chan struct{}
	kbdAltTabActive   bool
	kbdAltTabOpenedMs int64
	kbdAltTabSeq      uint64
	kbdLWinDown       bool
	kbdRWinDown       bool
	kbdWinComboUsed   bool
	kbdLastWinTapMs   int64

	// Single permanent package-level Win32 keyboard hook callback (NEVER allocated inside any function/loop!)
	kbdLLHookCallback = syscall.NewCallback(win32KbdLLHookProc)
)

const (
	hkWhKeyboardLL  = 13
	hkWmKeyDown     = 0x0100
	hkWmKeyUp       = 0x0101
	hkWmSysKeyDown  = 0x0104
	hkWmSysKeyUp    = 0x0105
	hkWmQuit        = 0x0012
	hkVkTab         = 0x09
	hkVkReturn      = 0x0D
	hkVkShift       = 0x10
	hkVkControl     = 0x11
	hkVkMenu        = 0x12
	hkVkEscape      = 0x1B
	hkVkLeft        = 0x25
	hkVkUp          = 0x26
	hkVkRight       = 0x27
	hkVkDown        = 0x28
	hkVkD           = 0x44
	hkVkLWin        = 0x5B
	hkVkRWin        = 0x5C
	hkVkLMenu       = 0xA4
	hkVkRMenu       = 0xA5
	hkVkDummyMask   = 0xE8 // Standard unassigned VK used to cancel native Windows Start Menu without sticking Win key
	hkKeyeventfUp   = 0x0002
	hkLlkhfAltDown  = 0x20
	hkLlkhfInjected = 0x10
)

func win32KbdLLHookProc(nCode int, wParam uintptr, lParam uintptr) uintptr {
	kbdHookStateMu.Lock()
	hHook := kbdHookHandle
	wv := kbdHookWebView
	lumaHwnd := kbdHookLumaHwnd
	stopCh := kbdHookStopCh
	kbdHookStateMu.Unlock()

	if nCode >= 0 && lParam != 0 {
		info := (*kbdLLHookStruct)(unsafe.Pointer(lParam))
		isDown := wParam == hkWmKeyDown || wParam == hkWmSysKeyDown
		isUp := wParam == hkWmKeyUp || wParam == hkWmSysKeyUp
		injected := (info.Flags & hkLlkhfInjected) != 0

		if !injected {
			// --- 0. Self-heal stale Win key flags (e.g. if an elevated UAC window swallowed WM_KEYUP) ---
			if info.VkCode != hkVkLWin && kbdLWinDown {
				st, _, _ := procHookGetAsyncKeyState.Call(hkVkLWin)
				if (st & 0x8000) == 0 {
					kbdLWinDown = false
					if !kbdRWinDown {
						kbdWinComboUsed = false
					}
				}
			}
			if info.VkCode != hkVkRWin && kbdRWinDown {
				st, _, _ := procHookGetAsyncKeyState.Call(hkVkRWin)
				if (st & 0x8000) == 0 {
					kbdRWinDown = false
					if !kbdLWinDown {
						kbdWinComboUsed = false
					}
				}
			}

			// --- 1. Track Win Key & Solo Tap vs Combo (Win -> Luma Start / Win+D -> Luma Home; preserves Win+L/Shift+S/Space/E!) ---
			if info.VkCode == hkVkLWin || info.VkCode == hkVkRWin {
				if isDown {
					wasDown := kbdLWinDown || kbdRWinDown
					if info.VkCode == hkVkLWin {
						kbdLWinDown = true
					} else {
						kbdRWinDown = true
					}
					if !wasDown {
						kbdWinComboUsed = false
					}
				} else if isUp {
					if info.VkCode == hkVkLWin {
						kbdLWinDown = false
					} else {
						kbdRWinDown = false
					}
					// Standalone Win key tap -> suppress native Windows Start Menu safely via 0xE8 mask & open Luma Start / Luma Nova Panel!
					if !kbdWinComboUsed && !kbdLWinDown && !kbdRWinDown && isWinKeyToLumaEnabled() && !kbdAltTabActive {
						ctrlSt, _, _ := procHookGetAsyncKeyState.Call(hkVkControl)
						altSt, _, _ := procHookGetAsyncKeyState.Call(hkVkMenu)
						shiftSt, _, _ := procHookGetAsyncKeyState.Call(hkVkShift)
						if (ctrlSt&0x8000) == 0 && (altSt&0x8000) == 0 && (shiftSt&0x8000) == 0 {
							nowMs := time.Now().UnixMilli()
							if nowMs-kbdLastWinTapMs > 180 {
								kbdLastWinTapMs = nowMs
								// Synchronously pulse unassigned dummy VK 0xE8 BEFORE releasing Win keyup to Windows:
								// Windows cancels its native Start Menu AND receives Win KEYUP cleanly (zero stuck Win key!).
								_, _, _ = procHookKeybdEvent.Call(hkVkDummyMask, 0, 0, 0)
								_, _, _ = procHookKeybdEvent.Call(hkVkDummyMask, 0, hkKeyeventfUp, 0)
								go func() {
									defer func() { _ = recover() }()
									if lumaHwnd != 0 {
										forceBringLumaToFront(lumaHwnd, false)
									}
									safeWebViewEval(wv, stopCh, `try{window.focus();}catch(e){} window.dispatchEvent(new CustomEvent('luma-win-start'));`)
								}()
							}
						}
					}
					kbdWinComboUsed = false
				}
			} else if isDown && (kbdLWinDown || kbdRWinDown) {
				// Any other key pressed while Win is held marks it as a system combo (Win+L, Win+Shift+S, Win+Space, Win+E, Win+D...)
				kbdWinComboUsed = true

				// Intercept ONLY Win+D (no Ctrl/Shift/Alt) -> instant return to Luma OS Home Desktop!
				if info.VkCode == hkVkD && isWinDToLumaEnabled() && (info.Flags&hkLlkhfAltDown) == 0 {
					ctrlState, _, _ := procHookGetAsyncKeyState.Call(hkVkControl)
					shiftState, _, _ := procHookGetAsyncKeyState.Call(hkVkShift)
					if (ctrlState&0x8000) == 0 && (shiftState&0x8000) == 0 {
						_, _, _ = procHookKeybdEvent.Call(hkVkDummyMask, 0, 0, 0)
						_, _, _ = procHookKeybdEvent.Call(hkVkDummyMask, 0, hkKeyeventfUp, 0)
						go func() {
							defer func() { _ = recover() }()
							if lumaHwnd != 0 {
								forceBringLumaToFront(lumaHwnd, false)
							}
							safeWebViewEval(wv, stopCh, `try{window.focus();}catch(e){} window.dispatchEvent(new CustomEvent('luma-win-d-home'));`)
						}()
						return 1
					}
				}
				// All other Win combos (Win+L, Win+Shift+S, Win+Space, Win+E, Win+V, Win+Arrows) pass straight to Windows!
			}

			// --- 2. Fixed Desktop & External Alt+Tab Switcher (WebView2 Focus + Arrow/Enter/Esc Forwarding + Auto-Recovery Watchdog) ---
			if isCustomAltTabEnabled() {
				// Watchdog: if Alt was released externally (e.g. over an elevated window), auto-recover so keyboard is NEVER stuck!
				if kbdAltTabActive && isDown && (info.Flags&hkLlkhfAltDown) == 0 {
					altSt, _, _ := procHookGetAsyncKeyState.Call(hkVkMenu)
					if (altSt & 0x8000) == 0 {
						isNavKey := info.VkCode == hkVkEscape || info.VkCode == hkVkReturn ||
							info.VkCode == hkVkLeft || info.VkCode == hkVkRight || info.VkCode == hkVkUp || info.VkCode == hkVkDown
						if !isNavKey || (time.Now().UnixMilli()-kbdAltTabOpenedMs) > 12000 {
							kbdAltTabActive = false
							go func() {
								defer func() { _ = recover() }()
								releaseAltTabTopmost()
								safeWebViewEval(wv, stopCh, `window.dispatchEvent(new CustomEvent('luma-alt-tab-cancel'));`)
							}()
						}
					}
				}

				if info.VkCode == hkVkTab && isDown && (info.Flags&hkLlkhfAltDown) != 0 {
					ctrlState, _, _ := procHookGetAsyncKeyState.Call(hkVkControl)
					if (ctrlState & 0x8000) == 0 {
						shiftState, _, _ := procHookGetAsyncKeyState.Call(hkVkShift)
						reverse := (shiftState & 0x8000) != 0
						fgHwnd, _, _ := procHookGetFg.Call()
						isOurs := lumaHwnd != 0 && fgHwnd == lumaHwnd
						if !isOurs && fgHwnd != 0 && lumaHwnd != 0 {
							ch, _, _ := procHookIsChild.Call(lumaHwnd, fgHwnd)
							isOurs = ch != 0
						}
						fromExternal := !isOurs
						kbdAltTabActive = true
						kbdAltTabOpenedMs = time.Now().UnixMilli()
						kbdAltTabSeq++
						seq := kbdAltTabSeq
						go func(rev, ext bool, s uint64) {
							defer func() { _ = recover() }()
							if lumaHwnd != 0 {
								forceBringLumaToFront(lumaHwnd, true)
							}
							js := fmt.Sprintf(`try{window.focus();}catch(e){} window.dispatchEvent(new CustomEvent('luma-alt-tab',{detail:{reverse:%v,fromExternal:%v,seq:%d,native:true}}));`, rev, ext, s)
							safeWebViewEval(wv, stopCh, js)
						}(reverse, fromExternal, seq)
						return 1 // Swallow native Windows Alt+Tab cleanly!
					}
				}

				// Forward Arrow keys, Enter, and Escape DIRECTLY to WebView2 while Alt+Tab is active
				// so navigation works over Luma Desktop AND Windows Desktop even before OS focus settles!
				if kbdAltTabActive && isDown {
					switch info.VkCode {
					case hkVkEscape:
						kbdAltTabActive = false
						go func() {
							defer func() { _ = recover() }()
							releaseAltTabTopmost()
							safeWebViewEval(wv, stopCh, `window.dispatchEvent(new CustomEvent('luma-alt-tab-cancel'));`)
						}()
						return 1
					case hkVkReturn:
						kbdAltTabActive = false
						go func() {
							defer func() { _ = recover() }()
							safeWebViewEval(wv, stopCh, `window.dispatchEvent(new CustomEvent('luma-alt-tab-commit',{detail:{native:true}}));`)
						}()
						return 1
					case hkVkRight, hkVkLeft, hkVkDown, hkVkUp:
						keyName := "ArrowRight"
						if info.VkCode == hkVkLeft {
							keyName = "ArrowLeft"
						} else if info.VkCode == hkVkDown {
							keyName = "ArrowDown"
						} else if info.VkCode == hkVkUp {
							keyName = "ArrowUp"
						}
						go func(k string) {
							defer func() { _ = recover() }()
							js := fmt.Sprintf(`window.dispatchEvent(new CustomEvent('luma-alt-tab-nav',{detail:{key:%q}}));`, k)
							safeWebViewEval(wv, stopCh, js)
						}(keyName)
						return 1
					}
				}

				// Commit selected window when Alt key is released
				if isUp && kbdAltTabActive && (info.VkCode == hkVkLMenu || info.VkCode == hkVkRMenu || info.VkCode == hkVkMenu) {
					kbdAltTabActive = false
					seq := kbdAltTabSeq
					go func(s uint64) {
						defer func() { _ = recover() }()
						js := fmt.Sprintf(`window.dispatchEvent(new CustomEvent('luma-alt-tab-commit',{detail:{seq:%d,native:true}}));`, s)
						safeWebViewEval(wv, stopCh, js)
					}(seq)
				}
			} else if kbdAltTabActive {
				// If user toggled ReplaceHotkeys OFF while Alt+Tab was active, cleanly disengage
				kbdAltTabActive = false
			}
		}
	}

	ret, _, _ := procHookCallNextHookEx.Call(hHook, uintptr(nCode), wParam, lParam)
	return ret
}

// startWin32AltTabHook (LumaCore 1.5.0): Installs the permanent singleton WH_KEYBOARD_LL hook (zero callback leaks).
func startWin32AltTabHook(wv webview2.WebView, lumaHwnd uintptr, stopCh <-chan struct{}) {
	defer func() { _ = recover() }()
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	kbdHookStateMu.Lock()
	kbdHookWebView = wv
	kbdHookLumaHwnd = lumaHwnd
	kbdHookStopCh = stopCh
	kbdAltTabActive = false
	kbdLWinDown = false
	kbdRWinDown = false
	kbdWinComboUsed = false
	kbdHookStateMu.Unlock()

	tid, _, _ := procHookGetCurrentThreadId.Call()
	h, _, _ := procHookSetWindowsHookExW.Call(hkWhKeyboardLL, kbdLLHookCallback, 0, 0)
	if h == 0 {
		return
	}
	kbdHookStateMu.Lock()
	kbdHookHandle = h
	kbdHookStateMu.Unlock()
	defer func() {
		_, _, _ = procHookUnhookWindowsHookEx.Call(h)
		kbdHookStateMu.Lock()
		kbdHookHandle = 0
		kbdHookWebView = nil
		kbdHookStateMu.Unlock()
	}()

	go func() {
		<-stopCh
		if tid != 0 {
			_, _, _ = procHookPostThreadMessageW.Call(tid, hkWmQuit, 0, 0)
		}
	}()

	var msg winMsgStruct
	for {
		ret, _, _ := procHookGetMessageW.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
		if int32(ret) <= 0 {
			break
		}
	}
}

// startWin32AltRListener (LumaCore 1.4.7): Ultra-low-CPU Alt+R hook + instant (<35ms) Win32 HKL push on Alt+Shift / Win+Space!
func startWin32AltRListener(wv webview2.WebView, lumaHwnd uintptr, stopCh <-chan struct{}) {
	defer func() { _ = recover() }()
	procGetAsyncKeyState := user32WinDLL.NewProc("GetAsyncKeyState")
	procGetFg := user32WinDLL.NewProc("GetForegroundWindow")
	procIsChild := user32WinDLL.NewProc("IsChild")
	const vkMenu = 0x12 // Alt
	const vkR = 0x52    // R (physical scan code independent of keyboard layout!)
	const vkCtrl = 0x11

	wasPressed := false
	lastKbdTag := ""
	timer := time.NewTimer(45 * time.Millisecond)
	defer timer.Stop()

	for {
		select {
		case <-stopCh:
			return
		case <-timer.C:
			func() {
				defer func() { _ = recover() }()
				// Instant active keyboard layout push (<40ms latency whenever user presses Alt+Shift / Ctrl+Shift / Win+Space!)
				tag, short := readActiveWin32KeyboardFast()
				if tag != "" && tag != lastKbdTag {
					lastKbdTag = tag
					js := fmt.Sprintf(`window.dispatchEvent(new CustomEvent('luma-kbd-changed',{detail:{tag:%q,short:%q}}));`, tag, short)
					safeWebViewEval(wv, stopCh, js)
				}

				fg, _, _ := procGetFg.Call()
				isOurs := fg == lumaHwnd
				if !isOurs && fg != 0 && lumaHwnd != 0 {
					child, _, _ := procIsChild.Call(lumaHwnd, fg)
					isOurs = child != 0
				}
				if !isOurs {
					wasPressed = false
					timer.Reset(110 * time.Millisecond)
					return
				}

				altState, _, _ := procGetAsyncKeyState.Call(vkMenu)
				rState, _, _ := procGetAsyncKeyState.Call(vkR)
				ctrlState, _, _ := procGetAsyncKeyState.Call(vkCtrl)
				pressed := (altState&0x8000) != 0 && (rState&0x8000) != 0 && (ctrlState&0x8000) == 0
				if pressed && !wasPressed {
					safeWebViewEval(wv, stopCh, `window.dispatchEvent(new CustomEvent('luma-toggle-spotlight'));`)
				}
				wasPressed = pressed
				timer.Reset(40 * time.Millisecond)
			}()
		}
	}
}
