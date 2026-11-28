//go:build windows

package main

import (
	"fmt"
	"image"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"unicode/utf16"
	"unsafe"
)

var (
	ssUser32DLL            = syscall.NewLazyDLL("user32.dll")
	ssGdi32DLL             = syscall.NewLazyDLL("gdi32.dll")
	ssWinmmDLL             = syscall.NewLazyDLL("winmm.dll")
	procSSGetDC            = ssUser32DLL.NewProc("GetDC")
	procSSReleaseDC        = ssUser32DLL.NewProc("ReleaseDC")
	procSSSetCursorPos     = ssUser32DLL.NewProc("SetCursorPos")
	procSSSendInput        = ssUser32DLL.NewProc("SendInput")
	procSSGetCursorInfo    = ssUser32DLL.NewProc("GetCursorInfo")
	procSSDrawIcon         = ssUser32DLL.NewProc("DrawIcon")
	procSSCreateCompDC     = ssGdi32DLL.NewProc("CreateCompatibleDC")
	procSSDeleteDC         = ssGdi32DLL.NewProc("DeleteDC")
	procSSCreateDIBSection = ssGdi32DLL.NewProc("CreateDIBSection")
	procSSDeleteObj        = ssGdi32DLL.NewProc("DeleteObject")
	procSSSelectObj        = ssGdi32DLL.NewProc("SelectObject")
	procSSBitBlt           = ssGdi32DLL.NewProc("BitBlt")
	procSSStretchBlt       = ssGdi32DLL.NewProc("StretchBlt")
	procSSSetStretchMode   = ssGdi32DLL.NewProc("SetStretchBltMode")
	procSSTimeBeginPeriod  = ssWinmmDLL.NewProc("timeBeginPeriod")
	procSSTimeEndPeriod    = ssWinmmDLL.NewProc("timeEndPeriod")

	ssFirewallOnce sync.Once
	ssTimerMu      sync.Mutex
	ssTimerActive  bool
)

type ssCursorInfo struct {
	CbSize      uint32
	Flags       uint32
	HCursor     uintptr
	PtScreenPos struct {
		X int32
		Y int32
	}
}

const (
	// Plain SRCCOPY (NO CAPTUREBLT!) — skips the ~100ms Windows DWM compositor stall and unlocks 60 FPS!
	ssSrcCopyOnly     = 0x00CC0020
	ssColorOnColor    = 3
	ssMouseMove       = 0x0001
	ssMouseLeftDown   = 0x0002
	ssMouseLeftUp     = 0x0004
	ssMouseRightDown  = 0x0008
	ssMouseRightUp    = 0x0010
	ssMouseWheel      = 0x0800
	ssKeyEventUnicode = 0x0004
	ssKeyEventKeyUp   = 0x0002
)

type ssMouseInput struct {
	Type  uint32
	_     uint32
	Dx    int32
	Dy    int32
	Data  uint32
	Flags uint32
	Time  uint32
	_     uint32
	Extra uintptr
}

type ssKeyInput struct {
	Type  uint32
	_     uint32
	Vk    uint16
	Scan  uint16
	Flags uint32
	Time  uint32
	_     uint32
	Extra uintptr
	_     uint64
}

// setSecondScreenHighResTimer switches Windows scheduler timer granularity to 1ms while
// streaming so 60 FPS frame pacing never gets quantized to Windows' default 15.6ms ticks.
func setSecondScreenHighResTimer(enable bool) {
	ssTimerMu.Lock()
	defer ssTimerMu.Unlock()
	if enable && !ssTimerActive {
		_, _, _ = procSSTimeBeginPeriod.Call(1)
		ssTimerActive = true
	} else if !enable && ssTimerActive {
		_, _, _ = procSSTimeEndPeriod.Call(1)
		ssTimerActive = false
	}
}

func ensureSecondScreenFirewallAllowed(port int) {
	ssFirewallOnce.Do(func() {
		check := exec.Command("netsh", "advfirewall", "firewall", "show", "rule", "name=Luma OS AirDisplay Second Screen")
		check.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		if err := check.Run(); err != nil {
			cmd := exec.Command(
				"netsh", "advfirewall", "firewall", "add", "rule",
				"name=Luma OS AirDisplay Second Screen",
				"dir=in", "action=allow", "protocol=TCP",
				fmt.Sprintf("localport=%d", port),
			)
			cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
			_ = cmd.Run()
		}
		checkUDP := exec.Command("netsh", "advfirewall", "firewall", "show", "rule", "name=Luma OS AirDisplay Discovery")
		checkUDP.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		if err := checkUDP.Run(); err != nil {
			cmdUDP := exec.Command(
				"netsh", "advfirewall", "firewall", "add", "rule",
				"name=Luma OS AirDisplay Discovery",
				"dir=in", "action=allow", "protocol=UDP",
				fmt.Sprintf("localport=%d", SecondScreenBeaconUDP),
			)
			cmdUDP.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
			_ = cmdUDP.Run()
		}
	})
}

// ssCaptureSession keeps a persistent GDI DC + CreateDIBSection target surface alive across frames:
//   - Zero per-frame CreateCompatibleBitmap / DeleteObject / GetDIBits overhead
//   - Hardware-accelerated StretchBlt / BitBlt with plain SRCCOPY (no DWM CAPTUREBLT stall!)
//   - Direct zero-copy pointer access to 32-bit BGRA DIB pixels -> parallel multi-core YCbCr(4:2:0)
type ssCaptureSession struct {
	mu        sync.Mutex
	hdcScreen uintptr
	hdcMem    uintptr
	hDIB      uintptr
	oldObj    uintptr
	bitsPtr   unsafe.Pointer
	dibW      int
	dibH      int
}

var globalSSCapture ssCaptureSession

func (s *ssCaptureSession) releaseLocked() {
	if s.hdcMem != 0 && s.oldObj != 0 {
		_, _, _ = procSSSelectObj.Call(s.hdcMem, s.oldObj)
		s.oldObj = 0
	}
	if s.hDIB != 0 {
		_, _, _ = procSSDeleteObj.Call(s.hDIB)
		s.hDIB = 0
	}
	if s.hdcMem != 0 {
		_, _, _ = procSSDeleteDC.Call(s.hdcMem)
		s.hdcMem = 0
	}
	if s.hdcScreen != 0 {
		_, _, _ = procSSReleaseDC.Call(0, s.hdcScreen)
		s.hdcScreen = 0
	}
	s.bitsPtr = nil
	s.dibW = 0
	s.dibH = 0
}

func (s *ssCaptureSession) ensureLocked(outW, outH int) error {
	if s.hdcScreen != 0 && s.hdcMem != 0 && s.hDIB != 0 && s.bitsPtr != nil && s.dibW == outW && s.dibH == outH {
		return nil
	}
	s.releaseLocked()

	hdcScreen, _, _ := procSSGetDC.Call(0)
	if hdcScreen == 0 {
		return fmt.Errorf("GetDC failed")
	}
	hdcMem, _, _ := procSSCreateCompDC.Call(hdcScreen)
	if hdcMem == 0 {
		_, _, _ = procSSReleaseDC.Call(0, hdcScreen)
		return fmt.Errorf("CreateCompatibleDC failed")
	}

	var bih bitmapInfoHeader
	bih.BiSize = uint32(unsafe.Sizeof(bih))
	bih.BiWidth = int32(outW)
	bih.BiHeight = -int32(outH) // Top-down DIB
	bih.BiPlanes = 1
	bih.BiBitCount = 32
	bih.BiCompression = biRGB

	var ppvBits unsafe.Pointer
	hDIB, _, _ := procSSCreateDIBSection.Call(
		hdcMem,
		uintptr(unsafe.Pointer(&bih)),
		dibRGBColors,
		uintptr(unsafe.Pointer(&ppvBits)),
		0,
		0,
	)
	if hDIB == 0 || ppvBits == nil {
		_, _, _ = procSSDeleteDC.Call(hdcMem)
		_, _, _ = procSSReleaseDC.Call(0, hdcScreen)
		return fmt.Errorf("CreateDIBSection failed")
	}

	oldObj, _, _ := procSSSelectObj.Call(hdcMem, hDIB)
	_, _, _ = procSSSetStretchMode.Call(hdcMem, ssColorOnColor)

	s.hdcScreen = hdcScreen
	s.hdcMem = hdcMem
	s.hDIB = hDIB
	s.oldObj = oldObj
	s.bitsPtr = ppvBits
	s.dibW = outW
	s.dibH = outH
	return nil
}

// bgraToYCbCr420Parallel converts top-down 32-bit BGRA pixels directly into a pooled *image.YCbCr (4:2:0)
// in parallel across CPU cores using exact BT.601 fixed-point math (matches Go stdlib color.RGBToYCbCr).
func bgraToYCbCr420Parallel(bgra []byte, dst *image.YCbCr, w, h int) {
	yPlane := dst.Y
	cbPlane := dst.Cb
	crPlane := dst.Cr
	yStride := dst.YStride
	cStride := dst.CStride
	srcStride := w * 4

	workers := runtime.NumCPU()
	if workers > 8 {
		workers = 8
	}
	if workers < 1 || h < 128 {
		workers = 1
	}

	convertBand := func(yStart, yEnd int) {
		for y := yStart; y < yEnd; y += 2 {
			srcRow0 := y * srcStride
			srcRow1 := (y + 1) * srcStride
			yRow0 := y * yStride
			yRow1 := (y + 1) * yStride
			cRow := (y >> 1) * cStride

			for x := 0; x < w; x += 2 {
				si0 := srcRow0 + x*4
				si1 := srcRow1 + x*4

				b00 := int(bgra[si0])
				g00 := int(bgra[si0+1])
				r00 := int(bgra[si0+2])

				b01 := int(bgra[si0+4])
				g01 := int(bgra[si0+5])
				r01 := int(bgra[si0+6])

				b10 := int(bgra[si1])
				g10 := int(bgra[si1+1])
				r10 := int(bgra[si1+2])

				b11 := int(bgra[si1+4])
				g11 := int(bgra[si1+5])
				r11 := int(bgra[si1+6])

				yPlane[yRow0+x] = uint8((19595*r00 + 38470*g00 + 7471*b00 + 32768) >> 16)
				yPlane[yRow0+x+1] = uint8((19595*r01 + 38470*g01 + 7471*b01 + 32768) >> 16)
				yPlane[yRow1+x] = uint8((19595*r10 + 38470*g10 + 7471*b10 + 32768) >> 16)
				yPlane[yRow1+x+1] = uint8((19595*r11 + 38470*g11 + 7471*b11 + 32768) >> 16)

				ra := (r00 + r01 + r10 + r11) >> 2
				ga := (g00 + g01 + g10 + g11) >> 2
				ba := (b00 + b01 + b10 + b11) >> 2

				cb := (-11056*ra - 21712*ga + 32768*ba + 8421376) >> 16
				if cb < 0 {
					cb = 0
				} else if cb > 255 {
					cb = 255
				}
				cr := (32768*ra - 27440*ga - 5328*ba + 8421376) >> 16
				if cr < 0 {
					cr = 0
				} else if cr > 255 {
					cr = 255
				}
				ci := cRow + (x >> 1)
				cbPlane[ci] = uint8(cb)
				crPlane[ci] = uint8(cr)
			}
		}
	}

	if workers == 1 {
		convertBand(0, h)
		return
	}

	var wg sync.WaitGroup
	// Align band height to even rows for 4:2:0 chroma blocks
	bandH := ((h / workers) + 1) &^ 1
	if bandH < 2 {
		bandH = 2
	}
	for start := 0; start < h; start += bandH {
		end := start + bandH
		if end > h {
			end = h
		}
		wg.Add(1)
		go func(ys, ye int) {
			defer wg.Done()
			convertBand(ys, ye)
		}(start, end)
	}
	wg.Wait()
}

// captureSecondScreenRectYCbCr captures ANY monitor or screen region at up to 60+ FPS using
// persistent CreateDIBSection + SRCCOPY BitBlt/StretchBlt + parallel BGRA->YCbCr(4:2:0).
func captureSecondScreenRectYCbCr(x, y, w, h, maxWidth int, reuse *image.YCbCr) (*image.YCbCr, int, int, error) {
	if w <= 0 || h <= 0 || w > 15360 || h > 8640 {
		return nil, 0, 0, fmt.Errorf("invalid rect %dx%d", w, h)
	}

	outW, outH := w, h
	if maxWidth > 0 && w > maxWidth {
		outW = maxWidth
		outH = int(float64(h) * float64(maxWidth) / float64(w))
	}
	outW = (outW / 2) * 2
	outH = (outH / 2) * 2
	if outW < 320 {
		outW = 320
	}
	if outH < 180 {
		outH = 180
	}

	globalSSCapture.mu.Lock()
	defer globalSSCapture.mu.Unlock()

	if err := globalSSCapture.ensureLocked(outW, outH); err != nil {
		return nil, 0, 0, err
	}

	blit := func() bool {
		if outW == w && outH == h {
			ok, _, _ := procSSBitBlt.Call(
				globalSSCapture.hdcMem, 0, 0, uintptr(outW), uintptr(outH),
				globalSSCapture.hdcScreen, uintptr(int32(x)), uintptr(int32(y)), ssSrcCopyOnly,
			)
			return ok != 0
		}
		ok, _, _ := procSSStretchBlt.Call(
			globalSSCapture.hdcMem, 0, 0, uintptr(outW), uintptr(outH),
			globalSSCapture.hdcScreen, uintptr(int32(x)), uintptr(int32(y)), uintptr(w), uintptr(h),
			ssSrcCopyOnly,
		)
		return ok != 0
	}

	if !blit() {
		// Auto-recover if Windows changed display mode or woke from sleep/UAC
		globalSSCapture.releaseLocked()
		if err := globalSSCapture.ensureLocked(outW, outH); err != nil {
			return nil, 0, 0, err
		}
		if !blit() {
			return nil, 0, 0, fmt.Errorf("BitBlt/StretchBlt failed")
		}
	}

	// Overlay live Windows cursor directly onto the captured DIB surface
	var ci ssCursorInfo
	ci.CbSize = uint32(unsafe.Sizeof(ci))
	if okCur, _, _ := procSSGetCursorInfo.Call(uintptr(unsafe.Pointer(&ci))); okCur != 0 && (ci.Flags&1) != 0 && ci.HCursor != 0 {
		cx := int(ci.PtScreenPos.X) - x
		cy := int(ci.PtScreenPos.Y) - y
		if cx >= -32 && cy >= -32 && cx <= w+32 && cy <= h+32 {
			dx := cx
			dy := cy
			if outW != w {
				dx = cx * outW / w
				dy = cy * outH / h
			}
			_, _, _ = procSSDrawIcon.Call(globalSSCapture.hdcMem, uintptr(int32(dx)), uintptr(int32(dy)), ci.HCursor)
		}
	}

	dst := reuse
	if dst == nil || dst.Rect.Dx() != outW || dst.Rect.Dy() != outH || dst.SubsampleRatio != image.YCbCrSubsampleRatio420 {
		dst = image.NewYCbCr(image.Rect(0, 0, outW, outH), image.YCbCrSubsampleRatio420)
	}

	bgra := unsafe.Slice((*byte)(globalSSCapture.bitsPtr), outW*outH*4)
	bgraToYCbCr420Parallel(bgra, dst, outW, outH)
	return dst, outW, outH, nil
}

func ssSendMouse(flags uint32, dx, dy int32, data uint32) {
	inp := ssMouseInput{Type: 0, Dx: dx, Dy: dy, Data: data, Flags: flags}
	_, _, _ = procSSSendInput.Call(1, uintptr(unsafe.Pointer(&inp)), unsafe.Sizeof(inp))
}

func ssSendVK(vk uint16) {
	down := ssKeyInput{Type: 1, Vk: vk}
	up := ssKeyInput{Type: 1, Vk: vk, Flags: ssKeyEventKeyUp}
	_, _, _ = procSSSendInput.Call(1, uintptr(unsafe.Pointer(&down)), unsafe.Sizeof(down))
	_, _, _ = procSSSendInput.Call(1, uintptr(unsafe.Pointer(&up)), unsafe.Sizeof(up))
}

func ssSendUnicodeText(txt string) {
	u16 := utf16.Encode([]rune(txt))
	for _, code := range u16 {
		down := ssKeyInput{Type: 1, Scan: code, Flags: ssKeyEventUnicode}
		up := ssKeyInput{Type: 1, Scan: code, Flags: ssKeyEventUnicode | ssKeyEventKeyUp}
		_, _, _ = procSSSendInput.Call(1, uintptr(unsafe.Pointer(&down)), unsafe.Sizeof(down))
		_, _, _ = procSSSendInput.Call(1, uintptr(unsafe.Pointer(&up)), unsafe.Sizeof(up))
	}
}

func injectSecondScreenInput(action string, absX, absY, dx, dy, delta int, text, key string) {
	switch strings.ToLower(strings.TrimSpace(action)) {
	case "move":
		_, _, _ = procSSSetCursorPos.Call(uintptr(int32(absX)), uintptr(int32(absY)))
	case "move_rel":
		ssSendMouse(ssMouseMove, int32(dx), int32(dy), 0)
	case "down":
		_, _, _ = procSSSetCursorPos.Call(uintptr(int32(absX)), uintptr(int32(absY)))
		ssSendMouse(ssMouseLeftDown, 0, 0, 0)
	case "up":
		_, _, _ = procSSSetCursorPos.Call(uintptr(int32(absX)), uintptr(int32(absY)))
		ssSendMouse(ssMouseLeftUp, 0, 0, 0)
	case "click":
		_, _, _ = procSSSetCursorPos.Call(uintptr(int32(absX)), uintptr(int32(absY)))
		ssSendMouse(ssMouseLeftDown, 0, 0, 0)
		ssSendMouse(ssMouseLeftUp, 0, 0, 0)
	case "click_cur":
		ssSendMouse(ssMouseLeftDown, 0, 0, 0)
		ssSendMouse(ssMouseLeftUp, 0, 0, 0)
	case "dblclick":
		_, _, _ = procSSSetCursorPos.Call(uintptr(int32(absX)), uintptr(int32(absY)))
		ssSendMouse(ssMouseLeftDown, 0, 0, 0)
		ssSendMouse(ssMouseLeftUp, 0, 0, 0)
		ssSendMouse(ssMouseLeftDown, 0, 0, 0)
		ssSendMouse(ssMouseLeftUp, 0, 0, 0)
	case "rclick":
		_, _, _ = procSSSetCursorPos.Call(uintptr(int32(absX)), uintptr(int32(absY)))
		ssSendMouse(ssMouseRightDown, 0, 0, 0)
		ssSendMouse(ssMouseRightUp, 0, 0, 0)
	case "scroll":
		ssSendMouse(ssMouseWheel, 0, 0, uint32(int32(delta)))
	case "text":
		if text != "" {
			ssSendUnicodeText(text)
		}
	case "key":
		switch strings.ToLower(strings.TrimSpace(key)) {
		case "enter", "return":
			ssSendVK(0x0D)
		case "backspace":
			ssSendVK(0x08)
		case "escape", "esc":
			ssSendVK(0x1B)
		case "tab":
			ssSendVK(0x09)
		case "space":
			ssSendVK(0x20)
		case "arrowleft":
			ssSendVK(0x25)
		case "arrowup":
			ssSendVK(0x26)
		case "arrowright":
			ssSendVK(0x27)
		case "arrowdown":
			ssSendVK(0x28)
		}
	}
}
