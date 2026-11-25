//go:build windows

package main

import (
	"fmt"
	"math"
	"runtime"
	"sync"
	"syscall"
	"time"
	"unsafe"

	"github.com/jchv/go-webview2"
)

// ==================== LUMA OS 1.6.4: NATIVE WINDOWS PRECISION TOUCHPAD RAW INPUT HID GESTURE ENGINE ====================
// Captures real 3-finger & 4-finger Precision Touchpad contacts directly via Win32 RegisterRawInputDevices
// (UsagePage=0x0D Digitizer, Usage=0x05 Touch Pad, RIDEV_INPUTSINK) + hid.dll HidP_GetUsageValue!
// Works reliably EVEN WHEN native Windows 3/4-finger gestures are disabled in Registry, and fires directly into WebView2 + SSE!
// Uses strictly ONE permanent package-level syscall.NewCallback singleton (ZERO callbacks inside functions/loops!).

type NativeTouchpadGestureEvent struct {
	Type    string  `json:"type"`
	Gesture string  `json:"gesture"` // three_fingers_down | three_fingers_up | three_fingers_left | three_fingers_right | four_fingers_down | three_fingers_tap
	Fingers int     `json:"fingers"`
	Vx      float64 `json:"vx"`
	Vy      float64 `json:"vy"`
	Source  string  `json:"source"`
	AtMs    int64   `json:"at_ms"`
}

type tpRawInputDevice struct {
	UsagePage uint16
	Usage     uint16
	Flags     uint32
	Target    uintptr
}

type tpRawInputHeader struct {
	Type   uint32
	Size   uint32
	Device uintptr
	WParam uintptr
}

type tpRawHid struct {
	SizeHid uint32
	Count   uint32
}

type tpWndClassExW struct {
	Size       uint32
	Style      uint32
	WndProc    uintptr
	ClsExtra   int32
	WndExtra   int32
	Instance   uintptr
	Icon       uintptr
	Cursor     uintptr
	Background uintptr
	MenuName   *uint16
	ClassName  *uint16
	IconSm     uintptr
}

type tpHidpCaps struct {
	Usage                     uint16
	UsagePage                 uint16
	InputReportByteLength     uint16
	OutputReportByteLength    uint16
	FeatureReportByteLength   uint16
	Reserved                  [17]uint16
	NumberLinkCollectionNodes uint16
	NumberInputButtonCaps     uint16
	NumberInputValueCaps      uint16
	NumberInputDataIndices    uint16
	NumberOutputButtonCaps    uint16
	NumberOutputValueCaps     uint16
	NumberOutputDataIndices   uint16
	NumberFeatureButtonCaps   uint16
	NumberFeatureValueCaps    uint16
	NumberFeatureDataIndices  uint16
}

type tpHidpValueCaps struct {
	UsagePage         uint16
	ReportID          byte
	IsAlias           byte
	BitField          uint16
	LinkCollection    uint16
	LinkUsage         uint16
	LinkUsagePage     uint16
	IsRange           byte
	IsStringRange     byte
	IsDesignatorRange byte
	IsAbsolute        byte
	HasNull           byte
	Reserved          byte
	BitSize           uint16
	ReportCount       uint16
	Reserved2         [5]uint16
	UnitsExp          uint32
	Units             uint32
	LogicalMin        int32
	LogicalMax        int32
	PhysicalMin       int32
	PhysicalMax       int32
	UsageMin          uint16
	UsageMax          uint16
	StringMin         uint16
	StringMax         uint16
	DesignatorMin     uint16
	DesignatorMax     uint16
	DataIndexMin      uint16
	DataIndexMax      uint16
}

type tpDeviceMeta struct {
	preparsed     []byte
	contactLink   uint16
	xLink         uint16
	yLink         uint16
	xRange        float64
	yRange        float64
	hasContactCnt bool
	hasXY         bool
}

const (
	tpWmInput             = 0x00FF
	tpRimTypeHid          = 2
	tpRidInput            = 0x10000003
	tpRidiPreparsedData   = 0x20000005
	tpRidevInputSink      = 0x00000100
	tpHwndMessage         = ^uintptr(2) // (HWND)-3
	tpHidpInput           = 0
	tpUsagePageDigitizer  = 0x000D
	tpUsageTouchPad       = 0x0005
	tpUsageContactCount   = 0x0054
	tpUsagePageGeneric    = 0x0001
	tpUsageX              = 0x0030
	tpUsageY              = 0x0031
	tpHidpStatusSuccess   = 0x00110000
)

var (
	tpRawUser32DLL                  = syscall.NewLazyDLL("user32.dll")
	tpProcRegisterClassExW          = tpRawUser32DLL.NewProc("RegisterClassExW")
	tpProcCreateWindowExW           = tpRawUser32DLL.NewProc("CreateWindowExW")
	tpProcDestroyWindow             = tpRawUser32DLL.NewProc("DestroyWindow")
	tpProcDefWindowProcW            = tpRawUser32DLL.NewProc("DefWindowProcW")
	tpProcRegisterRawInputDevices   = tpRawUser32DLL.NewProc("RegisterRawInputDevices")
	tpProcGetRawInputData           = tpRawUser32DLL.NewProc("GetRawInputData")
	tpProcGetRawInputDeviceInfoW    = tpRawUser32DLL.NewProc("GetRawInputDeviceInfoW")
	tpProcTranslateMessage          = tpRawUser32DLL.NewProc("TranslateMessage")
	tpProcDispatchMessageW          = tpRawUser32DLL.NewProc("DispatchMessageW")
	tpKernel32DLL                   = syscall.NewLazyDLL("kernel32.dll")
	tpProcGetModuleHandleW          = tpKernel32DLL.NewProc("GetModuleHandleW")
	tpHidDLL                        = syscall.NewLazyDLL("hid.dll")
	tpProcHidPGetCaps               = tpHidDLL.NewProc("HidP_GetCaps")
	tpProcHidPGetValueCaps          = tpHidDLL.NewProc("HidP_GetValueCaps")
	tpProcHidPGetUsageValue         = tpHidDLL.NewProc("HidP_GetUsageValue")

	// Permanent single package-level WndProc callback for Precision Touchpad WM_INPUT (ZERO leaks!)
	tpRawWndProcCallback = syscall.NewCallback(tpRawInputWndProc)

	tpRawMu           sync.Mutex
	tpRawActive       bool
	tpRawWebView      webview2.WebView
	tpRawStopCh       <-chan struct{}
	tpDeviceCache     = map[uintptr]*tpDeviceMeta{}
	tpEventsCount     int64
	tpLastGestureName string
	tpLastGestureAt   int64

	// Active multi-finger touchpad gesture state machine
	tpTracking      bool
	tpPeakFingers   int
	tpStartX        float64
	tpStartY        float64
	tpLastX         float64
	tpLastY         float64
	tpStartTimeMs   int64
	tpLastFrameMs   int64
	tpCooldownUntil int64

	// SSE subscriber registry
	tpSubMu   sync.Mutex
	tpNextSub int
	tpSubs    = map[int]chan NativeTouchpadGestureEvent{}
)

func subscribeNativeTouchpadGestures() (int, <-chan NativeTouchpadGestureEvent) {
	tpSubMu.Lock()
	defer tpSubMu.Unlock()
	tpNextSub++
	id := tpNextSub
	ch := make(chan NativeTouchpadGestureEvent, 16)
	tpSubs[id] = ch
	return id, ch
}

func unsubscribeNativeTouchpadGestures(id int) {
	tpSubMu.Lock()
	if ch, ok := tpSubs[id]; ok {
		delete(tpSubs, id)
		close(ch)
	}
	tpSubMu.Unlock()
}

func emitNativeTouchpadGesture(gesture string, fingers int, vx, vy float64) {
	ev := NativeTouchpadGestureEvent{
		Type:    "gesture",
		Gesture: gesture,
		Fingers: fingers,
		Vx:      vx,
		Vy:      vy,
		Source:  "windows_precision_touchpad_hid",
		AtMs:    time.Now().UnixMilli(),
	}

	tpRawMu.Lock()
	tpEventsCount++
	tpLastGestureName = gesture
	tpLastGestureAt = ev.AtMs
	wv := tpRawWebView
	stopCh := tpRawStopCh
	tpRawMu.Unlock()

	if wv != nil && stopCh != nil {
		go func(e NativeTouchpadGestureEvent) {
			defer func() { _ = recover() }()
			js := fmt.Sprintf(
				`window.dispatchEvent(new CustomEvent('luma-native-gesture',{detail:{gesture:%q,fingers:%d,vx:%.3f,vy:%.3f,source:%q}}));`,
				e.Gesture, e.Fingers, e.Vx, e.Vy, e.Source,
			)
			safeWebViewEval(wv, stopCh, js)
		}(ev)
	}

	tpSubMu.Lock()
	for _, ch := range tpSubs {
		select {
		case ch <- ev:
		default:
		}
	}
	tpSubMu.Unlock()
}

func getNativeTouchpadGestureStatus() map[string]interface{} {
	tpRawMu.Lock()
	defer tpRawMu.Unlock()
	return map[string]interface{}{
		"ok":                true,
		"platform":          "windows",
		"raw_input_active":  tpRawActive,
		"gestures_detected": tpEventsCount,
		"last_gesture":      tpLastGestureName,
		"last_gesture_at":   tpLastGestureAt,
	}
}

func tpGetOrLoadDeviceMeta(hDevice uintptr) *tpDeviceMeta {
	if meta, ok := tpDeviceCache[hDevice]; ok {
		return meta
	}
	var sz uint32
	r, _, _ := tpProcGetRawInputDeviceInfoW.Call(hDevice, tpRidiPreparsedData, 0, uintptr(unsafe.Pointer(&sz)))
	if int32(r) < 0 || sz == 0 || sz > 262144 {
		return nil
	}
	buf := make([]byte, sz)
	r, _, _ = tpProcGetRawInputDeviceInfoW.Call(hDevice, tpRidiPreparsedData, uintptr(unsafe.Pointer(&buf[0])), uintptr(unsafe.Pointer(&sz)))
	if int32(r) < 0 {
		return nil
	}

	var caps tpHidpCaps
	st, _, _ := tpProcHidPGetCaps.Call(uintptr(unsafe.Pointer(&buf[0])), uintptr(unsafe.Pointer(&caps)))
	if uint32(st) != tpHidpStatusSuccess || caps.NumberInputValueCaps == 0 {
		return nil
	}

	numCaps := caps.NumberInputValueCaps
	vcaps := make([]tpHidpValueCaps, numCaps)
	st, _, _ = tpProcHidPGetValueCaps.Call(
		tpHidpInput,
		uintptr(unsafe.Pointer(&vcaps[0])),
		uintptr(unsafe.Pointer(&numCaps)),
		uintptr(unsafe.Pointer(&buf[0])),
	)
	if uint32(st) != tpHidpStatusSuccess {
		return nil
	}

	meta := &tpDeviceMeta{
		preparsed: buf,
		xRange:    1000,
		yRange:    1000,
	}
	for i := 0; i < int(numCaps); i++ {
		vc := vcaps[i]
		if vc.UsagePage == tpUsagePageDigitizer && vc.UsageMin <= tpUsageContactCount && tpUsageContactCount <= vc.UsageMax {
			meta.contactLink = vc.LinkCollection
			meta.hasContactCnt = true
		}
		if vc.UsagePage == tpUsagePageGeneric && vc.UsageMin <= tpUsageX && tpUsageX <= vc.UsageMax && !meta.hasXY {
			meta.xLink = vc.LinkCollection
			if vc.LogicalMax > vc.LogicalMin {
				meta.xRange = float64(vc.LogicalMax - vc.LogicalMin)
			}
		}
		if vc.UsagePage == tpUsagePageGeneric && vc.UsageMin <= tpUsageY && tpUsageY <= vc.UsageMax && !meta.hasXY {
			meta.yLink = vc.LinkCollection
			if vc.LogicalMax > vc.LogicalMin {
				meta.yRange = float64(vc.LogicalMax - vc.LogicalMin)
			}
			if meta.xLink != 0 || meta.yLink != 0 {
				meta.hasXY = true
			}
		}
	}
	tpDeviceCache[hDevice] = meta
	return meta
}

func tpFinalizeTrackedGesture(nowMs int64) {
	if !tpTracking {
		return
	}
	fingers := tpPeakFingers
	dx := tpLastX - tpStartX
	dy := tpLastY - tpStartY
	dt := float64(nowMs - tpStartTimeMs)
	if dt < 16 {
		dt = 16
	}
	tpTracking = false
	tpPeakFingers = 0

	if fingers < 3 || nowMs < tpCooldownUntil {
		return
	}
	dist := math.Hypot(dx, dy)
	vx := dx / dt * 1000.0
	vy := dy / dt * 1000.0

	// Normalized touchpad coordinates (0.0 .. 1.0 across touchpad width/height)
	if dist < 0.045 && dt < 340 && fingers == 3 {
		tpCooldownUntil = nowMs + 360
		emitNativeTouchpadGesture("three_fingers_tap", fingers, vx, vy)
		return
	}
	if dist < 0.095 {
		return
	}

	tpCooldownUntil = nowMs + 380
	if fingers >= 4 && dy > 0.10 && math.Abs(dy) > math.Abs(dx)*1.15 {
		emitNativeTouchpadGesture("four_fingers_down", fingers, vx, vy)
		return
	}
	if math.Abs(dy) >= math.Abs(dx) {
		if dy > 0 {
			emitNativeTouchpadGesture("three_fingers_down", fingers, vx, vy)
		} else {
			emitNativeTouchpadGesture("three_fingers_up", fingers, vx, vy)
		}
	} else {
		if dx < 0 {
			emitNativeTouchpadGesture("three_fingers_left", fingers, vx, vy)
		} else {
			emitNativeTouchpadGesture("three_fingers_right", fingers, vx, vy)
		}
	}
}

func tpProcessRawInput(lParam uintptr) {
	var sz uint32
	hdrSize := uint32(unsafe.Sizeof(tpRawInputHeader{}))
	_, _, _ = tpProcGetRawInputData.Call(lParam, tpRidInput, 0, uintptr(unsafe.Pointer(&sz)), uintptr(hdrSize))
	if sz < hdrSize+8 || sz > 65536 {
		return
	}
	buf := make([]byte, sz)
	readBytes, _, _ := tpProcGetRawInputData.Call(lParam, tpRidInput, uintptr(unsafe.Pointer(&buf[0])), uintptr(unsafe.Pointer(&sz)), uintptr(hdrSize))
	if int32(readBytes) <= 0 {
		return
	}

	hdr := (*tpRawInputHeader)(unsafe.Pointer(&buf[0]))
	if hdr.Type != tpRimTypeHid {
		return
	}
	hidOffset := int(unsafe.Sizeof(tpRawInputHeader{}))
	if len(buf) < hidOffset+int(unsafe.Sizeof(tpRawHid{})) {
		return
	}
	rawHid := (*tpRawHid)(unsafe.Pointer(&buf[hidOffset]))
	if rawHid.SizeHid == 0 || rawHid.Count == 0 {
		return
	}
	meta := tpGetOrLoadDeviceMeta(hdr.Device)
	if meta == nil || !meta.hasContactCnt || !meta.hasXY {
		return
	}

	reportStart := hidOffset + int(unsafe.Sizeof(tpRawHid{}))
	nowMs := time.Now().UnixMilli()

	// If previous gesture stalled for >280ms without lift packet, flush cleanly
	if tpTracking && nowMs-tpLastFrameMs > 280 {
		tpFinalizeTrackedGesture(tpLastFrameMs)
	}

	for idx := uint32(0); idx < rawHid.Count; idx++ {
		off := reportStart + int(idx*rawHid.SizeHid)
		if off+int(rawHid.SizeHid) > len(buf) {
			break
		}
		repPtr := uintptr(unsafe.Pointer(&buf[off]))
		repLen := uintptr(rawHid.SizeHid)
		ppPtr := uintptr(unsafe.Pointer(&meta.preparsed[0]))

		var contactCnt uint32
		st, _, _ := tpProcHidPGetUsageValue.Call(
			tpHidpInput, tpUsagePageDigitizer, uintptr(meta.contactLink), tpUsageContactCount,
			uintptr(unsafe.Pointer(&contactCnt)), ppPtr, repPtr, repLen,
		)
		if uint32(st) != tpHidpStatusSuccess {
			continue
		}

		var rawX, rawY uint32
		stX, _, _ := tpProcHidPGetUsageValue.Call(
			tpHidpInput, tpUsagePageGeneric, uintptr(meta.xLink), tpUsageX,
			uintptr(unsafe.Pointer(&rawX)), ppPtr, repPtr, repLen,
		)
		stY, _, _ := tpProcHidPGetUsageValue.Call(
			tpHidpInput, tpUsagePageGeneric, uintptr(meta.yLink), tpUsageY,
			uintptr(unsafe.Pointer(&rawY)), ppPtr, repPtr, repLen,
		)
		if uint32(stX) != tpHidpStatusSuccess || uint32(stY) != tpHidpStatusSuccess {
			continue
		}

		nx := float64(rawX) / meta.xRange
		ny := float64(rawY) / meta.yRange
		cnt := int(contactCnt)

		if cnt >= 3 {
			if !tpTracking {
				tpTracking = true
				tpPeakFingers = cnt
				tpStartX = nx
				tpStartY = ny
				tpLastX = nx
				tpLastY = ny
				tpStartTimeMs = nowMs
			} else {
				if cnt > tpPeakFingers {
					tpPeakFingers = cnt
				}
				tpLastX = nx
				tpLastY = ny
			}
			tpLastFrameMs = nowMs
		} else if tpTracking {
			// Fingers lifted below 3 -> evaluate swipe/tap immediately!
			tpFinalizeTrackedGesture(nowMs)
		}
	}
}

func tpRawInputWndProc(hwnd uintptr, msg uint32, wParam uintptr, lParam uintptr) uintptr {
	if msg == tpWmInput {
		tpProcessRawInput(lParam)
		return 0
	}
	ret, _, _ := tpProcDefWindowProcW.Call(hwnd, uintptr(msg), wParam, lParam)
	return ret
}

// startNativeTouchpadRawInputListener creates a message-only Win32 Raw Input sink on a dedicated OS thread
// to capture Precision Touchpad 3/4-finger gestures globally with ~0% idle CPU.
func startNativeTouchpadRawInputListener(wv webview2.WebView, _ uintptr, stopCh <-chan struct{}) {
	defer func() { _ = recover() }()
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	tpRawMu.Lock()
	tpRawWebView = wv
	tpRawStopCh = stopCh
	tpRawMu.Unlock()

	hInst, _, _ := tpProcGetModuleHandleW.Call(0)
	clsName, err := syscall.UTF16PtrFromString("LumaTouchpadRawInputSink164")
	if err != nil {
		return
	}
	wc := tpWndClassExW{
		Size:      uint32(unsafe.Sizeof(tpWndClassExW{})),
		WndProc:   tpRawWndProcCallback,
		Instance:  hInst,
		ClassName: clsName,
	}
	_, _, _ = tpProcRegisterClassExW.Call(uintptr(unsafe.Pointer(&wc)))

	hwndMsg, _, _ := tpProcCreateWindowExW.Call(
		0,
		uintptr(unsafe.Pointer(clsName)),
		0,
		0,
		0, 0, 0, 0,
		tpHwndMessage,
		0,
		hInst,
		0,
	)
	if hwndMsg == 0 {
		return
	}
	defer tpProcDestroyWindow.Call(hwndMsg)

	rid := tpRawInputDevice{
		UsagePage: tpUsagePageDigitizer,
		Usage:     tpUsageTouchPad,
		Flags:     tpRidevInputSink,
		Target:    hwndMsg,
	}
	okReg, _, _ := tpProcRegisterRawInputDevices.Call(
		uintptr(unsafe.Pointer(&rid)),
		1,
		unsafe.Sizeof(rid),
	)

	tpRawMu.Lock()
	tpRawActive = okReg != 0
	tpRawMu.Unlock()
	defer func() {
		tpRawMu.Lock()
		tpRawActive = false
		tpRawWebView = nil
		tpRawMu.Unlock()
	}()

	tid, _, _ := procHookGetCurrentThreadId.Call()
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
		_, _, _ = tpProcTranslateMessage.Call(uintptr(unsafe.Pointer(&msg)))
		_, _, _ = tpProcDispatchMessageW.Call(uintptr(unsafe.Pointer(&msg)))
	}
}
