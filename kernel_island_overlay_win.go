//go:build windows

package main

import (
	"fmt"
	"math"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
	"unsafe"
)

// ==================== LUMA OS 1.6.6: NATIVE WIN32 ALWAYS-ON-TOP DYNAMIC ISLAND OVERLAY ====================
// Renders a true per-pixel alpha anti-aliased glassmorphic Dynamic Island capsule pinned via
// HWND_TOPMOST + WS_EX_LAYERED + WS_EX_TOOLWINDOW + WS_EX_NOACTIVATE directly above Google Chrome,
// Telegram, VS Code, Explorer, Games, and every Windows application — ZERO focus theft, ZERO extra WebView2 RAM.
// Uses strictly ONE permanent package-level syscall.NewCallback singleton (ZERO callbacks in functions/loops).

var (
	islUser32DLL = syscall.NewLazyDLL("user32.dll")
	islGdi32DLL  = syscall.NewLazyDLL("gdi32.dll")
	islKernel32  = syscall.NewLazyDLL("kernel32.dll")

	procIslRegisterClassExW     = islUser32DLL.NewProc("RegisterClassExW")
	procIslCreateWindowExW      = islUser32DLL.NewProc("CreateWindowExW")
	procIslDestroyWindow        = islUser32DLL.NewProc("DestroyWindow")
	procIslDefWindowProcW       = islUser32DLL.NewProc("DefWindowProcW")
	procIslGetMessageW          = islUser32DLL.NewProc("GetMessageW")
	procIslTranslateMessage     = islUser32DLL.NewProc("TranslateMessage")
	procIslDispatchMessageW     = islUser32DLL.NewProc("DispatchMessageW")
	procIslPostMessageW         = islUser32DLL.NewProc("PostMessageW")
	procIslPostQuitMessage      = islUser32DLL.NewProc("PostQuitMessage")
	procIslSetTimer             = islUser32DLL.NewProc("SetTimer")
	procIslKillTimer            = islUser32DLL.NewProc("KillTimer")
	procIslShowWindow           = islUser32DLL.NewProc("ShowWindow")
	procIslSetWindowPos         = islUser32DLL.NewProc("SetWindowPos")
	procIslGetWindowLongPtrW    = islUser32DLL.NewProc("GetWindowLongPtrW")
	procIslSetWindowLongPtrW    = islUser32DLL.NewProc("SetWindowLongPtrW")
	procIslUpdateLayeredWindow  = islUser32DLL.NewProc("UpdateLayeredWindow")
	procIslGetDC                = islUser32DLL.NewProc("GetDC")
	procIslReleaseDC            = islUser32DLL.NewProc("ReleaseDC")
	procIslGetSystemMetrics     = islUser32DLL.NewProc("GetSystemMetrics")
	procIslGetForegroundWindow  = islUser32DLL.NewProc("GetForegroundWindow")
	procIslGetWindowRect        = islUser32DLL.NewProc("GetWindowRect")
	procIslGetCursorPos         = islUser32DLL.NewProc("GetCursorPos")
	procIslDrawTextW            = islUser32DLL.NewProc("DrawTextW")
	procIslKeybdEvent           = islUser32DLL.NewProc("keybd_event")
	procIslSetCapture           = islUser32DLL.NewProc("SetCapture")
	procIslReleaseCapture       = islUser32DLL.NewProc("ReleaseCapture")
	procIslLoadCursorW          = islUser32DLL.NewProc("LoadCursorW")
	procIslSetCursor            = islUser32DLL.NewProc("SetCursor")
	procIslGetModuleHandleW     = islKernel32.NewProc("GetModuleHandleW")

	procIslCreateCompatibleDC   = islGdi32DLL.NewProc("CreateCompatibleDC")
	procIslDeleteDC             = islGdi32DLL.NewProc("DeleteDC")
	procIslCreateDIBSection     = islGdi32DLL.NewProc("CreateDIBSection")
	procIslSelectObject         = islGdi32DLL.NewProc("SelectObject")
	procIslDeleteObject         = islGdi32DLL.NewProc("DeleteObject")
	procIslCreateFontW          = islGdi32DLL.NewProc("CreateFontW")
	procIslSetBkMode            = islGdi32DLL.NewProc("SetBkMode")
	procIslSetTextColor         = islGdi32DLL.NewProc("SetTextColor")

	// Strictly ONE permanent package-level callback singleton (NEVER inside functions/loops!)
	islandOverlayWndProcCb = syscall.NewCallback(islandOverlayWndProc)
)

const (
	islWsPopup          = 0x80000000
	islWsExTopmost      = 0x00000008
	islWsExTransparent  = 0x00000020
	islWsExToolWindow   = 0x00000080
	islWsExLayered      = 0x00080000
	islWsExNoActivate   = 0x08000000
	islGwlExStyle       = ^uintptr(19) // -20
	islHwndTopmost      = ^uintptr(0)  // -1
	islSwpNoSize        = 0x0001
	islSwpNoMove        = 0x0002
	islSwpNoActivate    = 0x0010
	islSwpShowWindow    = 0x0040
	islSwHide           = 0
	islSwShowNA         = 8
	islUlwAlpha         = 0x00000002
	islAcSrcOver        = 0x00
	islAcSrcAlpha       = 0x01
	islBiRGB            = 0
	islDibRGBColors     = 0
	islDtLeft           = 0x00000000
	islDtCenter         = 0x00000001
	islDtRight          = 0x00000002
	islDtVCenter        = 0x00000004
	islDtSingleLine     = 0x00000020
	islDtEndEllipsis    = 0x00008000
	islDtNoPrefix       = 0x00000800
	islWmDestroy        = 0x0002
	islWmSetCursor      = 0x0020
	islWmMouseActivate  = 0x0021
	islWmNcHitTest      = 0x0084
	islWmTimer          = 0x0113
	islWmMouseMove      = 0x0200
	islWmLButtonDown    = 0x0201
	islWmLButtonUp      = 0x0202
	islWmRButtonUp      = 0x0205
	islWmCaptureChanged = 0x0215
	islHtClient         = 1
	islIdcArrow         = 32512
	islIdcHand          = 32649
	islMaNoActivate     = 3
	islWmAppSync        = 0x8000 + 42
	islWmAppStop        = 0x8000 + 43
	islTimerTickID      = 771
	islVkMediaNext      = 0xB0
	islVkMediaPrev      = 0xB1
	islVkMediaPlayPause = 0xB3
	islKeyEventKeyUp    = 0x0002
)

type islWndClassExW struct {
	CbSize        uint32
	Style         uint32
	LpfnWndProc   uintptr
	CbClsExtra    int32
	CbWndExtra    int32
	HInstance     uintptr
	HIcon         uintptr
	HCursor       uintptr
	HbrBackground uintptr
	LpszMenuName  *uint16
	LpszClassName *uint16
	HIconSm       uintptr
}

type islPoint struct {
	X, Y int32
}

type islSize struct {
	CX, CY int32
}

type islRect struct {
	Left, Top, Right, Bottom int32
}

type islMsg struct {
	Hwnd    uintptr
	Message uint32
	WParam  uintptr
	LParam  uintptr
	Time    uint32
	Pt      islPoint
}

type islBitmapInfoHeader struct {
	BiSize          uint32
	BiWidth         int32
	BiHeight        int32
	BiPlanes        uint16
	BiBitCount      uint16
	BiCompression   uint32
	BiSizeImage     uint32
	BiXPelsPerMeter int32
	BiYPelsPerMeter int32
	BiClrUsed       uint32
	BiClrImportant  uint32
}

type islBitmapInfo struct {
	BmiHeader islBitmapInfoHeader
	BmiColors [1]uint32
}

type islBlendFunction struct {
	BlendOp             byte
	BlendFlags          byte
	SourceConstantAlpha byte
	AlphaFormat         byte
}

var (
	islEngineMu        sync.Mutex
	islEngineStarted   bool
	islHwnd            uintptr
	islActiveVisible   atomic.Bool
	islLastFrameTick   uint64
	islHovered         bool
	islDragging        bool
	islDragMoved       bool
	islDragStartScreen islPoint
	islDragStartOffX   int
	islDragStartOffY   int
	islCurWinX         int32
	islCurWinY         int32
	islCurWinW         int32
	islCurWinH         int32
	islCurBtnPrevX1    int32
	islCurBtnPrevX2    int32
	islCurBtnPlayX1    int32
	islCurBtnPlayX2    int32
	islCurBtnNextX1    int32
	islCurBtnNextX2    int32
	islFontBold        uintptr
	islFontMono        uintptr
	islFontSmall       uintptr
	islCursorArrow     uintptr
	islCursorHand      uintptr
)

func startNativeIslandOverlayEngine() {
	islEngineMu.Lock()
	if islEngineStarted {
		islEngineMu.Unlock()
		return
	}
	islEngineStarted = true
	islEngineMu.Unlock()

	go runNativeIslandOverlayLoop()
}

func stopNativeIslandOverlayEngine() {
	islEngineMu.Lock()
	h := islHwnd
	islEngineMu.Unlock()
	if h != 0 {
		_, _, _ = procIslPostMessageW.Call(h, islWmAppStop, 0, 0)
	}
}

func applyNativeIslandOverlayConfig(_ IslandOverlayConfig) {
	startNativeIslandOverlayEngine()
	notifyNativeIslandOverlayRedraw()
}

func notifyNativeIslandOverlayRedraw() {
	islEngineMu.Lock()
	h := islHwnd
	islEngineMu.Unlock()
	if h != 0 {
		_, _, _ = procIslPostMessageW.Call(h, islWmAppSync, 0, 0)
	}
}

func isNativeIslandOverlayActive() bool {
	return islActiveVisible.Load()
}

func runNativeIslandOverlayLoop() {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	hInst, _, _ := procIslGetModuleHandleW.Call(0)
	className, err := syscall.UTF16PtrFromString("LumaOS_DynamicIsland_Overlay_167")
	if err != nil {
		return
	}
	winTitle, _ := syscall.UTF16PtrFromString("Luma Dynamic Island")

	// Load standard Win32 cursors so Windows NEVER shows a stuck spinning/busy cursor over Dynamic Island!
	islCursorArrow, _, _ = procIslLoadCursorW.Call(0, uintptr(islIdcArrow))
	islCursorHand, _, _ = procIslLoadCursorW.Call(0, uintptr(islIdcHand))

	wc := islWndClassExW{
		CbSize:        uint32(unsafe.Sizeof(islWndClassExW{})),
		LpfnWndProc:   islandOverlayWndProcCb,
		HInstance:     hInst,
		HCursor:       islCursorArrow,
		LpszClassName: className,
	}
	_, _, _ = procIslRegisterClassExW.Call(uintptr(unsafe.Pointer(&wc)))

	exStyle := uintptr(islWsExTopmost | islWsExLayered | islWsExToolWindow | islWsExNoActivate)
	hwnd, _, _ := procIslCreateWindowExW.Call(
		exStyle,
		uintptr(unsafe.Pointer(className)),
		uintptr(unsafe.Pointer(winTitle)),
		uintptr(islWsPopup),
		0, 0, 320, 44,
		0, 0, hInst, 0,
	)
	if hwnd == 0 {
		islEngineMu.Lock()
		islEngineStarted = false
		islEngineMu.Unlock()
		return
	}

	// Pre-create reusable crisp GDI fonts once on the UI thread
	faceSegoe, _ := syscall.UTF16PtrFromString("Segoe UI Semibold")
	faceMono, _ := syscall.UTF16PtrFromString("Consolas")
	islFontBold, _, _ = procIslCreateFontW.Call(
		^uintptr(13), 0, 0, 0, 600, 0, 0, 0, 1, 0, 0, 5, 0, uintptr(unsafe.Pointer(faceSegoe)),
	)
	islFontSmall, _, _ = procIslCreateFontW.Call(
		^uintptr(11), 0, 0, 0, 500, 0, 0, 0, 1, 0, 0, 5, 0, uintptr(unsafe.Pointer(faceSegoe)),
	)
	islFontMono, _, _ = procIslCreateFontW.Call(
		^uintptr(12), 0, 0, 0, 700, 0, 0, 0, 1, 0, 0, 5, 0, uintptr(unsafe.Pointer(faceMono)),
	)

	islEngineMu.Lock()
	islHwnd = hwnd
	islEngineMu.Unlock()

	_, _, _ = procIslSetTimer.Call(hwnd, islTimerTickID, 120, 0)
	syncAndRenderIslandOverlay(hwnd)

	var msg islMsg
	for {
		ret, _, _ := procIslGetMessageW.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
		if int32(ret) <= 0 {
			break
		}
		_, _, _ = procIslTranslateMessage.Call(uintptr(unsafe.Pointer(&msg)))
		_, _, _ = procIslDispatchMessageW.Call(uintptr(unsafe.Pointer(&msg)))
	}

	_, _, _ = procIslKillTimer.Call(hwnd, islTimerTickID)
	if islFontBold != 0 {
		_, _, _ = procIslDeleteObject.Call(islFontBold)
		islFontBold = 0
	}
	if islFontSmall != 0 {
		_, _, _ = procIslDeleteObject.Call(islFontSmall)
		islFontSmall = 0
	}
	if islFontMono != 0 {
		_, _, _ = procIslDeleteObject.Call(islFontMono)
		islFontMono = 0
	}
	islActiveVisible.Store(false)
	islEngineMu.Lock()
	islHwnd = 0
	islEngineStarted = false
	islEngineMu.Unlock()
}

func islandOverlayWndProc(hwnd uintptr, msg uint32, wParam uintptr, lParam uintptr) uintptr {
	switch msg {
	case islWmNcHitTest:
		// Guarantee mouse hover & clicks hit the capsule cleanly over Chrome & all Windows apps
		if !getIslandOverlayConfigSnapshot().ClickThrough {
			return islHtClient
		}
	case islWmSetCursor:
		// Always show a crisp Hand/Arrow cursor — fixes stuck spinning loading wheel over Chrome!
		cur := islCursorHand
		if islDragging || cur == 0 {
			cur = islCursorArrow
		}
		if cur != 0 {
			_, _, _ = procIslSetCursor.Call(cur)
			return 1
		}
	case islWmMouseActivate:
		// NEVER steal keyboard focus from Chrome or any foreground Windows app!
		return islMaNoActivate
	case islWmCaptureChanged:
		islDragging = false
		islDragMoved = false
		return 0
	case islWmTimer:
		if wParam == islTimerTickID {
			islLastFrameTick++
			syncAndRenderIslandOverlay(hwnd)
		}
		return 0
	case islWmAppSync:
		syncAndRenderIslandOverlay(hwnd)
		return 0
	case islWmAppStop:
		_, _, _ = procIslDestroyWindow.Call(hwnd)
		return 0
	case islWmDestroy:
		_, _, _ = procIslPostQuitMessage.Call(0)
		return 0
	case islWmLButtonDown:
		cfg := getIslandOverlayConfigSnapshot()
		if cfg.ClickThrough {
			return 0
		}
		var pt islPoint
		_, _, _ = procIslGetCursorPos.Call(uintptr(unsafe.Pointer(&pt)))
		if !cfg.Locked {
			islDragging = true
			islDragMoved = false
			islDragStartScreen = pt
			islDragStartOffX = cfg.OffsetX
			islDragStartOffY = cfg.OffsetY
			_, _, _ = procIslSetCapture.Call(hwnd)
		} else {
			islDragging = false
			islDragMoved = false
		}
		return 0
	case islWmMouseMove:
		if islDragging {
			var pt islPoint
			_, _, _ = procIslGetCursorPos.Call(uintptr(unsafe.Pointer(&pt)))
			dx := int(pt.X - islDragStartScreen.X)
			dy := int(pt.Y - islDragStartScreen.Y)
			if dx*dx+dy*dy > 25 {
				islDragMoved = true
				cfg := getIslandOverlayConfigSnapshot()
				cfg.OffsetX = clampInt(islDragStartOffX+dx, -600, 600)
				if strings.HasPrefix(cfg.Position, "bottom") {
					cfg.OffsetY = clampInt(islDragStartOffY-dy, 0, 96)
				} else {
					cfg.OffsetY = clampInt(islDragStartOffY+dy, 0, 96)
				}
				islandOverlayMu.Lock()
				islandOverlayCfg.OffsetX = cfg.OffsetX
				islandOverlayCfg.OffsetY = cfg.OffsetY
				islandOverlayMu.Unlock()
				syncAndRenderIslandOverlay(hwnd)
			}
		}
		return 0
	case islWmLButtonUp:
		wasDrag := islDragMoved
		if islDragging {
			islDragging = false
			islDragMoved = false
			_, _, _ = procIslReleaseCapture.Call()
		}
		if wasDrag {
			return 0
		}
		// Hit test inline media buttons (Prev / Play-Pause / Next) vs main pill body
		lx := int32(int16(lParam & 0xFFFF))
		if islCurBtnPrevX2 > islCurBtnPrevX1 && lx >= islCurBtnPrevX1 && lx <= islCurBtnPrevX2 {
			sendWin32MediaKey(islVkMediaPrev)
			return 0
		}
		if islCurBtnPlayX2 > islCurBtnPlayX1 && lx >= islCurBtnPlayX1 && lx <= islCurBtnPlayX2 {
			sendWin32MediaKey(islVkMediaPlayPause)
			return 0
		}
		if islCurBtnNextX2 > islCurBtnNextX1 && lx >= islCurBtnNextX1 && lx <= islCurBtnNextX2 {
			sendWin32MediaKey(islVkMediaNext)
			return 0
		}
		// Clicking capsule body brings Luma OS main window to front smoothly
		bringMainLumaFromOverlay()
		return 0
	case islWmRButtonUp:
		// Right-click opens Luma OS directly
		bringMainLumaFromOverlay()
		return 0
	}
	ret, _, _ := procIslDefWindowProcW.Call(hwnd, uintptr(msg), wParam, lParam)
	return ret
}

func sendWin32MediaKey(vk uintptr) {
	_, _, _ = procIslKeybdEvent.Call(vk, 0, 0, 0)
	_, _, _ = procIslKeybdEvent.Call(vk, 0, islKeyEventKeyUp, 0)
}

func bringMainLumaFromOverlay() {
	nativeWinMu.Lock()
	wv := nativeWebView
	nativeWinMu.Unlock()
	if wv == nil {
		return
	}
	lumaHwnd := uintptr(wv.Window())
	if lumaHwnd != 0 {
		go forceBringLumaToFront(lumaHwnd, false)
	}
}

func isLumaMainForegroundNow() bool {
	nativeWinMu.Lock()
	wv := nativeWebView
	nativeWinMu.Unlock()
	if wv == nil {
		return false
	}
	lumaHwnd := uintptr(wv.Window())
	if lumaHwnd == 0 {
		return false
	}
	fg, _, _ := procIslGetForegroundWindow.Call()
	return fg != 0 && fg == lumaHwnd
}

func isOtherAppFullscreenNow(screenW, screenH int32) bool {
	fg, _, _ := procIslGetForegroundWindow.Call()
	if fg == 0 || fg == islHwnd {
		return false
	}
	nativeWinMu.Lock()
	wv := nativeWebView
	nativeWinMu.Unlock()
	if wv != nil && fg == uintptr(wv.Window()) {
		return false
	}
	var rc islRect
	ok, _, _ := procIslGetWindowRect.Call(fg, uintptr(unsafe.Pointer(&rc)))
	if ok == 0 {
		return false
	}
	// Ignore desktop Progman/WorkerW (Wait: WorkerW covers whole screen, so only treat as fullscreen
	// if window covers full monitor AND is not desktop shell class — check window style WS_CAPTION absent & exact bounds)
	if rc.Left <= 0 && rc.Top <= 0 && rc.Right >= screenW && rc.Bottom >= screenH {
		// Check if foreground is a real fullscreen app/video vs Windows Desktop by checking title length > 0
		var titleBuf [64]uint16
		procGetText := islUser32DLL.NewProc("GetWindowTextW")
		n, _, _ := procGetText.Call(fg, uintptr(unsafe.Pointer(&titleBuf[0])), uintptr(len(titleBuf)))
		if n > 0 {
			title := syscall.UTF16ToString(titleBuf[:n])
			if title != "Program Manager" && title != "" {
				return true
			}
		}
	}
	return false
}

func syncAndRenderIslandOverlay(hwnd uintptr) {
	cfg := getIslandOverlayConfigSnapshot()
	st := getIslandOverlayStateSnapshot()

	if !cfg.Enabled || !cfg.PinOverAllWindows {
		if islActiveVisible.Load() {
			_, _, _ = procIslShowWindow.Call(hwnd, islSwHide)
			islActiveVisible.Store(false)
		}
		return
	}

	screenWPtr, _, _ := procIslGetSystemMetrics.Call(0) // SM_CXSCREEN
	screenHPtr, _, _ := procIslGetSystemMetrics.Call(1) // SM_CYSCREEN
	screenW := int32(screenWPtr)
	screenH := int32(screenHPtr)
	if screenW < 320 {
		screenW = 1920
	}
	if screenH < 240 {
		screenH = 1080
	}

	// Smart handoff: while Luma OS main window is in foreground and user didn't force native-over-Luma,
	// let the rich interactive React Dynamic Island pill render without double-pill overlap.
	// The instant user switches to Chrome, VS Code, Telegram, Explorer, or Windows desktop, native pill stays glued!
	if !cfg.AlwaysShowOverLuma && isLumaMainForegroundNow() {
		if islActiveVisible.Load() {
			_, _, _ = procIslShowWindow.Call(hwnd, islSwHide)
			islActiveVisible.Store(false)
		}
		return
	}

	// Optional auto-hide over fullscreen games/videos
	if !cfg.ShowInFullscreenApps && isOtherAppFullscreenNow(screenW, screenH) {
		if islActiveVisible.Load() {
			_, _, _ = procIslShowWindow.Call(hwnd, islSwHide)
			islActiveVisible.Store(false)
		}
		return
	}

	// Toggle WS_EX_TRANSPARENT (Click-Through) dynamically
	exStyle, _, _ := procIslGetWindowLongPtrW.Call(hwnd, islGwlExStyle)
	wantEx := (exStyle | islWsExTopmost | islWsExLayered | islWsExToolWindow | islWsExNoActivate)
	if cfg.ClickThrough {
		wantEx |= islWsExTransparent
	} else {
		wantEx &^= islWsExTransparent
	}
	if wantEx != exStyle {
		_, _, _ = procIslSetWindowLongPtrW.Call(hwnd, islGwlExStyle, wantEx)
	}

	// Check hover state via cursor position
	var cur islPoint
	_, _, _ = procIslGetCursorPos.Call(uintptr(unsafe.Pointer(&cur)))
	nowHover := !cfg.ClickThrough && islActiveVisible.Load() &&
		cur.X >= islCurWinX && cur.X <= islCurWinX+islCurWinW &&
		cur.Y >= islCurWinY && cur.Y <= islCurWinY+islCurWinH
	islHovered = nowHover

	nowMs := time.Now().UnixMilli()
	pulseActive := st.PulseTitle != "" && st.PulseUntilUnix > nowMs

	// Compute pill dimensions (including outer glow padding of 10px each side)
	const pad = int32(10)
	pillW := int32(340)
	pillH := int32(38)
	switch cfg.Size {
	case "compact":
		pillW = 264
		pillH = 32
	case "expanded":
		pillW = 446
		pillH = 44
	default:
		pillW = 356
		pillH = 38
	}
	if pulseActive {
		if pillW < 390 {
			pillW = 390
		}
		if pillH < 42 {
			pillH = 42
		}
	}
	if cfg.HoverExpand && nowHover {
		pillW += 36
		pillH += 4
	}

	totalW := pillW + pad*2
	totalH := pillH + pad*2

	// Compute anchored screen coordinates
	var winX, winY int32
	switch cfg.Position {
	case "top-left":
		winX = 16 + int32(cfg.OffsetX) - pad
		winY = int32(cfg.OffsetY) - pad
	case "top-right":
		winX = screenW - pillW - 16 + int32(cfg.OffsetX) - pad
		winY = int32(cfg.OffsetY) - pad
	case "bottom-left":
		winX = 16 + int32(cfg.OffsetX) - pad
		winY = screenH - pillH - int32(cfg.OffsetY) - pad
	case "bottom-right":
		winX = screenW - pillW - 16 + int32(cfg.OffsetX) - pad
		winY = screenH - pillH - int32(cfg.OffsetY) - pad
	case "bottom-center":
		winX = (screenW-pillW)/2 + int32(cfg.OffsetX) - pad
		winY = screenH - pillH - int32(cfg.OffsetY) - pad
	default: // top-center
		winX = (screenW-pillW)/2 + int32(cfg.OffsetX) - pad
		winY = int32(cfg.OffsetY) - pad
	}
	if winX < -pad {
		winX = -pad
	}
	if winX+totalW > screenW+pad {
		winX = screenW + pad - totalW
	}
	if winY < -pad {
		winY = -pad
	}
	if winY+totalH > screenH+pad {
		winY = screenH + pad - totalH
	}

	islCurWinX = winX
	islCurWinY = winY
	islCurWinW = totalW
	islCurWinH = totalH

	renderLayeredIslandFrame(hwnd, winX, winY, totalW, totalH, pad, pillW, pillH, cfg, st, pulseActive, nowHover)

	if !islActiveVisible.Load() {
		_, _, _ = procIslShowWindow.Call(hwnd, islSwShowNA)
		islActiveVisible.Store(true)
	}
	// Reinforce HWND_TOPMOST without SWP_SHOWWINDOW so hover/clicks are never interrupted
	if islLastFrameTick%10 == 0 && !islDragging {
		_, _, _ = procIslSetWindowPos.Call(hwnd, islHwndTopmost, 0, 0, 0, 0, islSwpNoMove|islSwpNoSize|islSwpNoActivate)
	}
}

func islParseHexRGB(hexStr string) (uint8, uint8, uint8) {
	s := strings.TrimPrefix(strings.TrimSpace(hexStr), "#")
	if len(s) == 3 {
		s = string([]byte{s[0], s[0], s[1], s[1], s[2], s[2]})
	}
	if len(s) != 6 {
		return 56, 189, 248 // Nitrogen sky cyan
	}
	r, err1 := strconv.ParseUint(s[0:2], 16, 8)
	g, err2 := strconv.ParseUint(s[2:4], 16, 8)
	b, err3 := strconv.ParseUint(s[4:6], 16, 8)
	if err1 != nil || err2 != nil || err3 != nil {
		return 56, 189, 248
	}
	return uint8(r), uint8(g), uint8(b)
}

func clampInt(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func blendPremulPixel(buf []byte, w, h, x, y int, r, g, b uint8, a float64) {
	if x < 0 || y < 0 || x >= w || y >= h || a <= 0.001 {
		return
	}
	if a > 1 {
		a = 1
	}
	idx := (y*w + x) * 4
	dstB := float64(buf[idx])
	dstG := float64(buf[idx+1])
	dstR := float64(buf[idx+2])
	dstA := float64(buf[idx+3]) / 255.0

	srcB := float64(b) * a
	srcG := float64(g) * a
	srcR := float64(r) * a

	inv := 1.0 - a
	outB := srcB + dstB*inv
	outG := srcG + dstG*inv
	outR := srcR + dstR*inv
	outA := a + dstA*inv
	if outA > 1 {
		outA = 1
	}
	if outB > 255 {
		outB = 255
	}
	if outG > 255 {
		outG = 255
	}
	if outR > 255 {
		outR = 255
	}
	buf[idx] = uint8(outB + 0.5)
	buf[idx+1] = uint8(outG + 0.5)
	buf[idx+2] = uint8(outR + 0.5)
	buf[idx+3] = uint8(outA*255.0 + 0.5)
}

func drawRoundedBoxSDF(buf []byte, w, h int, x0, y0, bw, bh, radius float64, r, g, b uint8, alpha float64) {
	cx := x0 + bw*0.5
	cy := y0 + bh*0.5
	hx := bw*0.5 - radius
	hy := bh*0.5 - radius
	minX := clampInt(int(math.Floor(x0-2)), 0, w-1)
	maxX := clampInt(int(math.Ceil(x0+bw+2)), 0, w-1)
	minY := clampInt(int(math.Floor(y0-2)), 0, h-1)
	maxY := clampInt(int(math.Ceil(y0+bh+2)), 0, h-1)

	for py := minY; py <= maxY; py++ {
		dy := math.Abs(float64(py)+0.5-cy) - hy
		if dy < 0 {
			dy = 0
		}
		for px := minX; px <= maxX; px++ {
			dx := math.Abs(float64(px)+0.5-cx) - hx
			if dx < 0 {
				dx = 0
			}
			dist := math.Hypot(dx, dy) - radius
			if dist < 0.75 {
				cov := 1.0
				if dist > -0.75 {
					cov = (0.75 - dist) / 1.5
				}
				blendPremulPixel(buf, w, h, px, py, r, g, b, alpha*cov)
			}
		}
	}
}

func compositeTextMask(dstBuf []byte, w, h int, font uintptr, text string, rx, ry, rw, rh int32, alignFlags uintptr, r, g, b uint8, alpha float64) {
	if text == "" || rw <= 4 || rh <= 4 {
		return
	}
	screenDC, _, _ := procIslGetDC.Call(0)
	if screenDC == 0 {
		return
	}
	defer procIslReleaseDC.Call(0, screenDC)

	memDC, _, _ := procIslCreateCompatibleDC.Call(screenDC)
	if memDC == 0 {
		return
	}
	defer procIslDeleteDC.Call(memDC)

	var bi islBitmapInfo
	bi.BmiHeader = islBitmapInfoHeader{
		BiSize:        uint32(unsafe.Sizeof(islBitmapInfoHeader{})),
		BiWidth:       rw,
		BiHeight:      -rh, // top-down
		BiPlanes:      1,
		BiBitCount:    32,
		BiCompression: islBiRGB,
	}
	var bitsPtr unsafe.Pointer
	hBmp, _, _ := procIslCreateDIBSection.Call(memDC, uintptr(unsafe.Pointer(&bi)), islDibRGBColors, uintptr(unsafe.Pointer(&bitsPtr)), 0, 0)
	if hBmp == 0 || bitsPtr == nil {
		return
	}
	defer procIslDeleteObject.Call(hBmp)

	oldBmp, _, _ := procIslSelectObject.Call(memDC, hBmp)
	defer procIslSelectObject.Call(memDC, oldBmp)

	var oldFont uintptr
	if font != 0 {
		oldFont, _, _ = procIslSelectObject.Call(memDC, font)
		defer procIslSelectObject.Call(memDC, oldFont)
	}

	_, _, _ = procIslSetBkMode.Call(memDC, 1)            // TRANSPARENT
	_, _, _ = procIslSetTextColor.Call(memDC, 0x00FFFFFF) // pure white on black mask

	u16, err := syscall.UTF16FromString(text)
	if err != nil || len(u16) == 0 {
		return
	}
	rc := islRect{Left: 0, Top: 0, Right: rw, Bottom: rh}
	_, _, _ = procIslDrawTextW.Call(
		memDC,
		uintptr(unsafe.Pointer(&u16[0])),
		uintptr(len(u16)-1),
		uintptr(unsafe.Pointer(&rc)),
		alignFlags|islDtVCenter|islDtSingleLine|islDtEndEllipsis|islDtNoPrefix,
	)

	mask := unsafe.Slice((*byte)(bitsPtr), int(rw*rh*4))
	for ty := int32(0); ty < rh; ty++ {
		dy := int(ry + ty)
		if dy < 0 || dy >= h {
			continue
		}
		rowOff := int(ty*rw) * 4
		for tx := int32(0); tx < rw; tx++ {
			dx := int(rx + tx)
			if dx < 0 || dx >= w {
				continue
			}
			mIdx := rowOff + int(tx)*4
			// Max of BGR gives crisp antialiased text coverage on black background
			lum := mask[mIdx]
			if mask[mIdx+1] > lum {
				lum = mask[mIdx+1]
			}
			if mask[mIdx+2] > lum {
				lum = mask[mIdx+2]
			}
			if lum > 4 {
				cov := (float64(lum) / 255.0) * alpha
				blendPremulPixel(dstBuf, w, h, dx, dy, r, g, b, cov)
			}
		}
	}
}

func renderLayeredIslandFrame(
	hwnd uintptr,
	winX, winY, totalW, totalH, pad, pillW, pillH int32,
	cfg IslandOverlayConfig,
	st IslandOverlayLiveState,
	pulseActive bool,
	hovered bool,
) {
	screenDC, _, _ := procIslGetDC.Call(0)
	if screenDC == 0 {
		return
	}
	defer procIslReleaseDC.Call(0, screenDC)

	memDC, _, _ := procIslCreateCompatibleDC.Call(screenDC)
	if memDC == 0 {
		return
	}
	defer procIslDeleteDC.Call(memDC)

	var bi islBitmapInfo
	bi.BmiHeader = islBitmapInfoHeader{
		BiSize:        uint32(unsafe.Sizeof(islBitmapInfoHeader{})),
		BiWidth:       totalW,
		BiHeight:      -totalH, // top-down
		BiPlanes:      1,
		BiBitCount:    32,
		BiCompression: islBiRGB,
	}
	var bitsPtr unsafe.Pointer
	hBmp, _, _ := procIslCreateDIBSection.Call(memDC, uintptr(unsafe.Pointer(&bi)), islDibRGBColors, uintptr(unsafe.Pointer(&bitsPtr)), 0, 0)
	if hBmp == 0 || bitsPtr == nil {
		return
	}
	defer procIslDeleteObject.Call(hBmp)

	oldBmp, _, _ := procIslSelectObject.Call(memDC, hBmp)
	defer procIslSelectObject.Call(memDC, oldBmp)

	w := int(totalW)
	h := int(totalH)
	buf := unsafe.Slice((*byte)(bitsPtr), w*h*4)

	accR, accG, accB := islParseHexRGB(cfg.AccentHex)
	if st.AccentHex != "" {
		accR, accG, accB = islParseHexRGB(st.AccentHex)
	}

	// Base capsule theme colors
	var bgR, bgG, bgB uint8 = 10, 12, 16
	var brdR, brdG, brdB uint8 = 255, 255, 255
	var txtR, txtG, txtB uint8 = 246, 248, 252
	var subR, subG, subB uint8 = 174, 184, 200
	brdAlpha := 0.20

	switch cfg.Style {
	case "cryo":
		bgR, bgG, bgB = 10, 22, 42
		brdR, brdG, brdB = 125, 211, 252
		brdAlpha = 0.36
	case "frosted":
		bgR, bgG, bgB = 240, 244, 250
		brdR, brdG, brdB = 255, 255, 255
		txtR, txtG, txtB = 15, 23, 42
		subR, subG, subB = 71, 85, 105
		brdAlpha = 0.55
	case "oled":
		bgR, bgG, bgB = 0, 0, 0
		brdR, brdG, brdB = accR, accG, accB
		brdAlpha = 0.65
	}

	opacityFrac := float64(cfg.Opacity) / 100.0
	if opacityFrac < 0.55 {
		opacityFrac = 0.55
	}
	if opacityFrac > 1.0 {
		opacityFrac = 1.0
	}

	px0 := float64(pad)
	py0 := float64(pad)
	pw := float64(pillW)
	ph := float64(pillH)
	rad := ph * 0.5

	// 1. Soft drop shadow + optional accent glow halo
	if cfg.GlowEnabled || st.MediaPlaying || pulseActive {
		glowAlpha := 0.24
		if pulseActive {
			glowAlpha = 0.34
		}
		drawRoundedBoxSDF(buf, w, h, px0-3.5, py0-2.5, pw+7, ph+7, rad+3.5, accR, accG, accB, glowAlpha)
	}
	drawRoundedBoxSDF(buf, w, h, px0-1, py0+2.5, pw+2, ph+1.5, rad+1, 0, 0, 0, 0.38)

	// 2. Main capsule fill + 1px luminous border
	drawRoundedBoxSDF(buf, w, h, px0, py0, pw, ph, rad, brdR, brdG, brdB, brdAlpha)
	drawRoundedBoxSDF(buf, w, h, px0+1.1, py0+1.1, pw-2.2, ph-2.2, rad-1.1, bgR, bgG, bgB, opacityFrac)

	// Reset clickable media button zones each frame
	islCurBtnPrevX1, islCurBtnPrevX2 = 0, 0
	islCurBtnPlayX1, islCurBtnPlayX2 = 0, 0
	islCurBtnNextX1, islCurBtnNextX2 = 0, 0

	cursorX := pad + 13
	rightX := pad + pillW - 13

	// 3. Left live status indicator / 7-bar harmonic audio wave
	if cfg.ShowMedia && st.MediaPlaying && !pulseActive {
		tick := float64(islLastFrameTick) * 0.45
		barBaseY := float64(pad+pillH) - 10
		maxBarH := float64(pillH) - 18
		if maxBarH < 8 {
			maxBarH = 8
		}
		for i := 0; i < 6; i++ {
			wave := 0.28 + 0.72*math.Abs(math.Sin(tick+float64(i)*0.75))
			bh := maxBarH * wave
			bx := float64(cursorX) + float64(i)*4.0
			br, bg, bb := accR, accG, accB
			if i%2 == 1 {
				br, bg, bb = txtR, txtG, txtB
			}
			drawRoundedBoxSDF(buf, w, h, bx, barBaseY-bh, 2.3, bh, 1.1, br, bg, bb, 0.95)
		}
		cursorX += 30
	} else {
		dotR, dotG, dotB := accR, accG, accB
		if cfg.DndEnabled {
			dotR, dotG, dotB = 161, 161, 170
		}
		drawRoundedBoxSDF(buf, w, h, float64(cursorX), float64(pad)+ph*0.5-4.0, 8, 8, 4, dotR, dotG, dotB, 0.98)
		cursorX += 15
	}

	// 4. Right side compact badges (Clock, Battery, Telemetry, Media Controls on hover/playing)
	if cfg.ShowMedia && (st.MediaPlaying || hovered) && !pulseActive {
		btnW := int32(20)
		// Next button
		islCurBtnNextX2 = rightX
		islCurBtnNextX1 = rightX - btnW
		compositeTextMask(buf, w, h, islFontSmall, "»", islCurBtnNextX1, pad, btnW, pillH, islDtCenter, subR, subG, subB, 0.95)
		rightX -= btnW + 2
		// Play/Pause button
		islCurBtnPlayX2 = rightX
		islCurBtnPlayX1 = rightX - btnW
		drawRoundedBoxSDF(buf, w, h, float64(islCurBtnPlayX1), float64(pad)+ph*0.5-10, float64(btnW), 20, 10, accR, accG, accB, 0.24)
		playGlyph := "▶"
		if st.MediaPlaying {
			playGlyph = "❚❚"
		}
		compositeTextMask(buf, w, h, islFontSmall, playGlyph, islCurBtnPlayX1, pad, btnW, pillH, islDtCenter, accR, accG, accB, 0.98)
		rightX -= btnW + 2
		// Prev button
		islCurBtnPrevX2 = rightX
		islCurBtnPrevX1 = rightX - btnW
		compositeTextMask(buf, w, h, islFontSmall, "«", islCurBtnPrevX1, pad, btnW, pillH, islDtCenter, subR, subG, subB, 0.95)
		rightX -= btnW + 6
	}

	if cfg.ShowClock && !pulseActive {
		clockStr := time.Now().Format("15:04")
		cw := int32(42)
		compositeTextMask(buf, w, h, islFontMono, clockStr, rightX-cw, pad, cw, pillH, islDtRight, txtR, txtG, txtB, 0.96)
		rightX -= cw + 6
	}

	if cfg.ShowBattery && st.BatteryPercent > 0 && !pulseActive && (rightX-cursorX) > 120 {
		batTxt := fmt.Sprintf("%d%%", st.BatteryPercent)
		if st.BatteryCharging {
			batTxt = "⚡" + batTxt
		}
		bw := int32(42)
		bR, bG, bB := uint8(52), uint8(211), uint8(153)
		if st.BatteryPercent <= 20 && !st.BatteryCharging {
			bR, bG, bB = 248, 113, 113
		}
		compositeTextMask(buf, w, h, islFontSmall, batTxt, rightX-bw, pad, bw, pillH, islDtRight, bR, bG, bB, 0.95)
		rightX -= bw + 6
	}

	if cfg.ShowTelemetry && !pulseActive && (rightX-cursorX) > 155 {
		telTxt := fmt.Sprintf("CPU %d%%", st.CpuPercent)
		tw := int32(54)
		compositeTextMask(buf, w, h, islFontSmall, telTxt, rightX-tw, pad, tw, pillH, islDtRight, subR, subG, subB, 0.90)
		rightX -= tw + 6
	}

	// 5. Center main text (Pulse notification > Active Download > Timer > Media Track > Weather/Clock Status)
	centerW := rightX - cursorX
	if centerW < 40 {
		centerW = 40
	}

	var mainLine string
	if pulseActive {
		mainLine = st.PulseTitle
		if st.PulseDetail != "" {
			mainLine = st.PulseTitle + " · " + st.PulseDetail
		}
		if st.PulseBarPct >= 0 && st.PulseBarPct <= 100 {
			barW := float64(centerW)
			if barW > 120 {
				barW = 120
			}
			drawRoundedBoxSDF(buf, w, h, float64(cursorX), float64(pad+pillH)-6.5, barW, 3.0, 1.5, 255, 255, 255, 0.18)
			fillW := barW * (float64(st.PulseBarPct) / 100.0)
			if fillW > 2 {
				drawRoundedBoxSDF(buf, w, h, float64(cursorX), float64(pad+pillH)-6.5, fillW, 3.0, 1.5, accR, accG, accB, 0.98)
			}
		}
	} else if cfg.ShowDownloads && st.DownloadPercent > 0 && st.DownloadPercent < 100 {
		lbl := st.DownloadLabel
		if lbl == "" {
			lbl = "Загрузка"
		}
		mainLine = fmt.Sprintf("%s · %d%%", lbl, st.DownloadPercent)
		barW := float64(centerW)
		drawRoundedBoxSDF(buf, w, h, float64(cursorX), float64(pad+pillH)-6.0, barW, 2.8, 1.4, 255, 255, 255, 0.16)
		drawRoundedBoxSDF(buf, w, h, float64(cursorX), float64(pad+pillH)-6.0, barW*float64(st.DownloadPercent)/100.0, 2.8, 1.4, accR, accG, accB, 0.98)
	} else if st.TimerText != "" {
		mainLine = "⏱ " + st.TimerText
	} else if cfg.ShowMedia && st.TrackTitle != "" {
		mainLine = st.TrackTitle
		if st.TrackArtist != "" && centerW > 170 {
			mainLine = st.TrackTitle + " — " + st.TrackArtist
		}
	} else if cfg.ShowWeather && st.WeatherText != "" {
		mainLine = st.WeatherText
	} else if cfg.ShowTelemetry {
		mainLine = fmt.Sprintf("Luma Island · RAM %d%%", st.RamPercent)
	} else {
		mainLine = "Luma Island"
	}

	compositeTextMask(buf, w, h, islFontBold, mainLine, cursorX, pad, centerW, pillH, islDtLeft, txtR, txtG, txtB, 0.98)

	// 6. Push premultiplied ARGB frame atomically to DWM via UpdateLayeredWindow
	ptDst := islPoint{X: winX, Y: winY}
	sz := islSize{CX: totalW, CY: totalH}
	ptSrc := islPoint{X: 0, Y: 0}
	bf := islBlendFunction{
		BlendOp:             islAcSrcOver,
		BlendFlags:          0,
		SourceConstantAlpha: 255,
		AlphaFormat:         islAcSrcAlpha,
	}
	_, _, _ = procIslUpdateLayeredWindow.Call(
		hwnd,
		screenDC,
		uintptr(unsafe.Pointer(&ptDst)),
		uintptr(unsafe.Pointer(&sz)),
		memDC,
		uintptr(unsafe.Pointer(&ptSrc)),
		0,
		uintptr(unsafe.Pointer(&bf)),
		islUlwAlpha,
	)
}
