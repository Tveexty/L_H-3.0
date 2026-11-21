//go:build windows

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
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
			Title:  "Luma OS 1.2.0 (Lithium)",
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

	nativeWinMu.Lock()
	nativeWebView = nil
	nativeWinMu.Unlock()
	return true
}
