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
			Title:  "Luma OS 1.5.4 (Carbon)",
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

	// Native Win32 hotkey + instant keyboard layout push monitor + Luma Alt+Tab Switcher Hook!
	stopHotkeys := make(chan struct{})
	go startWin32AltRListener(w, hwnd, stopHotkeys)
	go startWin32AltTabHook(w, hwnd, stopHotkeys)

	// Apply persisted shell mode (fullscreen, hide Windows taskbar, reserve work area)
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

// forceBringLumaToFront elevates Luma OS ABOVE all active Windows apps (Chrome, Telegram, fullscreen borderless apps)
// using AttachThreadInput + AllowSetForegroundWindow + HWND_TOPMOST without un-maximizing a maximized window.
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
	// Always pulse HWND_TOPMOST so Windows immediately lifts Luma OS above Chrome / external apps!
	_, _, _ = procSetWindowPos.Call(lumaHwnd, hwndTopmost, 0, 0, 0, 0, swpNoMove|swpNoSize|swpShowWindow)
	_, _, _ = procBringToTop.Call(lumaHwnd)
	_, _, _ = procSetFg.Call(lumaHwnd)
	_, _, _ = procSetFocus.Call(lumaHwnd)

	if attached {
		_, _, _ = procAttachThreadInput.Call(fgTid, lumaTid, 0)
	}

	if pinTopmost {
		customAltTabMu.Lock()
		altTabPinnedTopmost = true
		customAltTabMu.Unlock()
	} else {
		nativeWinMu.Lock()
		keepTop := activeShellCfg.AlwaysOnTop
		nativeWinMu.Unlock()
		if !keepTop {
			_, _, _ = procSetWindowPos.Call(lumaHwnd, hwndNoTopmost, 0, 0, 0, 0, swpNoMove|swpNoSize|swpNoOwnerZOrder)
		}
		customAltTabMu.Lock()
		altTabPinnedTopmost = false
		customAltTabMu.Unlock()
	}
}

// releaseAltTabTopmost drops the temporary HWND_TOPMOST elevation applied during Alt+Tab
// so external Windows apps (Chrome, Telegram, Steam) smoothly return to the foreground when selected.
func releaseAltTabTopmost() {
	customAltTabMu.Lock()
	wasPinned := altTabPinnedTopmost
	altTabPinnedTopmost = false
	customAltTabMu.Unlock()

	nativeWinMu.Lock()
	wv := nativeWebView
	keepTop := activeShellCfg.AlwaysOnTop
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

// suspendWindowTopmost temporarily clears HWND_TOPMOST before browser pickers / screen recording
// so Windows capture dialogs NEVER get trapped behind Luma OS!
func suspendWindowTopmost(suspend bool) {
	nativeWinMu.Lock()
	wv := nativeWebView
	restoreTop := activeShellCfg.AlwaysOnTop
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

// safeWebViewEval guards WebView2 Dispatch against shutdown races and panics.
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

// startWin32AltTabHook (LumaCore 1.4.7): Ultra-fast non-blocking WH_KEYBOARD_LL hook that:
//   1. Replaces Windows Alt+Tab with Luma OS's glassmorphic switcher GUARANTEED ON TOP OF ALL WINDOWS (Chrome, Telegram, games).
//   2. Replaces Win+D with instant return to Luma OS Home Desktop (never minimizing Luma OS to bare Windows desktop!).
// Never blocks Ctrl+Alt+Del / Ctrl+Shift+Esc and always unhooks cleanly on shutdown.
func startWin32AltTabHook(wv webview2.WebView, lumaHwnd uintptr, stopCh <-chan struct{}) {
	defer func() { _ = recover() }()
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	procSetWindowsHookExW := user32WinDLL.NewProc("SetWindowsHookExW")
	procUnhookWindowsHookEx := user32WinDLL.NewProc("UnhookWindowsHookEx")
	procCallNextHookEx := user32WinDLL.NewProc("CallNextHookEx")
	procGetMessageW := user32WinDLL.NewProc("GetMessageW")
	procPostThreadMessageW := user32WinDLL.NewProc("PostThreadMessageW")
	procGetAsyncKeyState := user32WinDLL.NewProc("GetAsyncKeyState")
	procGetFg := user32WinDLL.NewProc("GetForegroundWindow")
	procKeybdEvent := user32WinDLL.NewProc("keybd_event")
	kernel32Local := syscall.NewLazyDLL("kernel32.dll")
	procGetCurrentThreadId := kernel32Local.NewProc("GetCurrentThreadId")

	const (
		whKeyboardLL    = 13
		wmKeyDown       = 0x0100
		wmKeyUp         = 0x0101
		wmSysKeyDown    = 0x0104
		wmSysKeyUp      = 0x0105
		wmQuit          = 0x0012
		vkTab           = 0x09
		vkShift         = 0x10
		vkControl       = 0x11
		vkEscape        = 0x1B
		vkD             = 0x44
		vkLWin          = 0x5B
		vkRWin          = 0x5C
		vkLMenu         = 0xA4
		vkRMenu         = 0xA5
		vkMenu          = 0x12
		vkDummyMask     = 0xE8 // Unassigned VK used to suppress Start Menu when swallowing Win+D
		keyeventfKeyUp  = 0x0002
		llkhfAltDown    = 0x20
		llkhfInjected   = 0x10
	)

	altTabActive := false
	lwinDown := false
	rwinDown := false
	var hookHandle uintptr

	cb := syscall.NewCallback(func(nCode int, wParam uintptr, lParam uintptr) uintptr {
		if nCode >= 0 && lParam != 0 {
			info := (*kbdLLHookStruct)(unsafe.Pointer(lParam))
			isDown := wParam == wmKeyDown || wParam == wmSysKeyDown
			isUp := wParam == wmKeyUp || wParam == wmSysKeyUp
			injected := (info.Flags & llkhfInjected) != 0

			// Track Win key state reliably
			if !injected {
				if info.VkCode == vkLWin {
					lwinDown = isDown
				} else if info.VkCode == vkRWin {
					rwinDown = isDown
				}
			}

			// 1. Replace Win+D with instant return to Luma OS Home Desktop!
			if !injected && isDown && info.VkCode == vkD && isWinDToLumaEnabled() {
				winHeld := lwinDown || rwinDown
				if !winHeld {
					lw, _, _ := procGetAsyncKeyState.Call(vkLWin)
					rw, _, _ := procGetAsyncKeyState.Call(vkRWin)
					winHeld = (lw&0x8000) != 0 || (rw&0x8000) != 0
				}
				if winHeld && (info.Flags&llkhfAltDown) == 0 {
					ctrlState, _, _ := procGetAsyncKeyState.Call(vkControl)
					shiftState, _, _ := procGetAsyncKeyState.Call(vkShift)
					if (ctrlState&0x8000) == 0 && (shiftState&0x8000) == 0 {
						// Suppress Start Menu popup on Win key release using standard dummy VK pulse
						go func() {
							defer func() { _ = recover() }()
							_, _, _ = procKeybdEvent.Call(vkDummyMask, 0, 0, 0)
							_, _, _ = procKeybdEvent.Call(vkDummyMask, 0, keyeventfKeyUp, 0)
							if lumaHwnd != 0 {
								forceBringLumaToFront(lumaHwnd, false)
							}
							safeWebViewEval(wv, stopCh, `window.dispatchEvent(new CustomEvent('luma-win-d-home'));`)
						}()
						return 1 // Swallow native Windows Win+D!
					}
				}
			}

			// 2. Replace Alt+Tab with Luma OS Glassmorphic Switcher ABOVE ALL WINDOWS (Chrome, Telegram, Games)
			if !injected && isCustomAltTabEnabled() {
				if info.VkCode == vkTab && isDown && (info.Flags&llkhfAltDown) != 0 {
					ctrlState, _, _ := procGetAsyncKeyState.Call(vkControl)
					if (ctrlState & 0x8000) == 0 {
						shiftState, _, _ := procGetAsyncKeyState.Call(vkShift)
						reverse := (shiftState & 0x8000) != 0
						fgHwnd, _, _ := procGetFg.Call()
						fromExternal := lumaHwnd != 0 && fgHwnd != lumaHwnd
						altTabActive = true
						go func(rev, ext bool) {
							defer func() { _ = recover() }()
							if lumaHwnd != 0 {
								forceBringLumaToFront(lumaHwnd, true)
							}
							js := fmt.Sprintf(`window.dispatchEvent(new CustomEvent('luma-alt-tab',{detail:{reverse:%v,fromExternal:%v}}));`, rev, ext)
							safeWebViewEval(wv, stopCh, js)
						}(reverse, fromExternal)
						return 1 // Swallow native Windows Alt+Tab cleanly!
					}
				}

				// Cancel Alt+Tab cleanly on Escape while Alt is held
				if altTabActive && isDown && info.VkCode == vkEscape {
					altTabActive = false
					go func() {
						defer func() { _ = recover() }()
						releaseAltTabTopmost()
						safeWebViewEval(wv, stopCh, `window.dispatchEvent(new CustomEvent('luma-alt-tab-cancel'));`)
					}()
					return 1
				}

				// Commit selected window when Alt key is released
				if isUp && altTabActive && (info.VkCode == vkLMenu || info.VkCode == vkRMenu || info.VkCode == vkMenu) {
					altTabActive = false
					go func() {
						defer func() { _ = recover() }()
						safeWebViewEval(wv, stopCh, `window.dispatchEvent(new CustomEvent('luma-alt-tab-commit'));`)
					}()
				}
			}
		}
		ret, _, _ := procCallNextHookEx.Call(hookHandle, uintptr(nCode), wParam, lParam)
		return ret
	})

	tid, _, _ := procGetCurrentThreadId.Call()
	h, _, _ := procSetWindowsHookExW.Call(whKeyboardLL, cb, 0, 0)
	if h == 0 {
		return
	}
	hookHandle = h
	defer procUnhookWindowsHookEx.Call(hookHandle)

	go func() {
		<-stopCh
		if tid != 0 {
			_, _, _ = procPostThreadMessageW.Call(tid, wmQuit, 0, 0)
		}
	}()

	var msg winMsgStruct
	for {
		ret, _, _ := procGetMessageW.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
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
