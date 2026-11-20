//go:build windows

package main

import (
	"log"
	"os"
	"path/filepath"
	"sync"
	"syscall"
	"unsafe"

	"github.com/jchv/go-webview2"
)

var (
	dwmapiDLL            = syscall.NewLazyDLL("dwmapi.dll")
	procDwmSetWindowAttr = dwmapiDLL.NewProc("DwmSetWindowAttribute")

	user32WinDLL            = syscall.NewLazyDLL("user32.dll")
	procGetWindowLongW      = user32WinDLL.NewProc("GetWindowLongW")
	procSetWindowLongW      = user32WinDLL.NewProc("SetWindowLongW")
	procGetWindowRect       = user32WinDLL.NewProc("GetWindowRect")
	procMonitorFromWindow   = user32WinDLL.NewProc("MonitorFromWindow")
	procGetMonitorInfoW     = user32WinDLL.NewProc("GetMonitorInfoW")
	procSetWindowPos        = user32WinDLL.NewProc("SetWindowPos")
	procShowWindow          = user32WinDLL.NewProc("ShowWindow")
)

const (
	gwlStyle            = ^uintptr(15) // -16
	wsOverlappedWindow  = 0x00CF0000
	wsPopup             = 0x80000000
	swpFrameChanged     = 0x0020
	swpNoOwnerZOrder    = 0x0200
	monitorDefaultToNear = 2
	dwmwaUseDarkMode    = 20
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
	nativeWinMu     sync.Mutex
	nativeWebView   webview2.WebView
	nativeFull      bool
	savedWinStyle   uintptr
	savedWinRect    winRect
)

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
	nativeWinMu.Unlock()

	wv.Dispatch(func() {
		hwnd := uintptr(wv.Window())
		if hwnd == 0 {
			return
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
				0,
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
				0,
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

// runNativeDesktopWindow hosts Luma OS inside its own standalone Win32 WebView2 GUI window
// with custom embedded Luma icon (IconId: 1) and dark titlebar — never opens Microsoft Edge browser!
func runNativeDesktopWindow(url string) bool {
	cfgDir, err := os.UserConfigDir()
	if err != nil {
		cfgDir = os.TempDir()
	}
	dataPath := filepath.Join(cfgDir, "LumaOS_1.0.4", "WebView2")
	_ = os.MkdirAll(dataPath, 0o700)

	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     false,
		AutoFocus: true,
		DataPath:  dataPath,
		WindowOptions: webview2.WindowOptions{
			Title:  "Luma OS 1.0.4",
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
	defer w.Destroy()

	nativeWinMu.Lock()
	nativeWebView = w
	nativeWinMu.Unlock()

	hwnd := uintptr(w.Window())
	enableDarkTitlebar(hwnd)

	w.SetSize(1440, 900, webview2.HintNone)
	w.Navigate(url)
	w.Run()

	nativeWinMu.Lock()
	nativeWebView = nil
	nativeWinMu.Unlock()
	return true
}
