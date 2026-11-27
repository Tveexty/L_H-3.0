//go:build windows

package main

import (
	"bytes"
	"fmt"
	"image"
	"image/jpeg"
	"os/exec"
	"strings"
	"sync"
	"syscall"
	"unicode/utf16"
	"unsafe"
)

var (
	ssUser32DLL         = syscall.NewLazyDLL("user32.dll")
	ssGdi32DLL          = syscall.NewLazyDLL("gdi32.dll")
	procSSGetDC         = ssUser32DLL.NewProc("GetDC")
	procSSReleaseDC     = ssUser32DLL.NewProc("ReleaseDC")
	procSSSetCursorPos  = ssUser32DLL.NewProc("SetCursorPos")
	procSSSendInput     = ssUser32DLL.NewProc("SendInput")
	procSSGetCursorInfo = ssUser32DLL.NewProc("GetCursorInfo")
	procSSDrawIcon      = ssUser32DLL.NewProc("DrawIcon")
	procSSCreateCompDC  = ssGdi32DLL.NewProc("CreateCompatibleDC")
	procSSDeleteDC      = ssGdi32DLL.NewProc("DeleteDC")
	procSSCreateCompBmp = ssGdi32DLL.NewProc("CreateCompatibleBitmap")
	procSSDeleteObj     = ssGdi32DLL.NewProc("DeleteObject")
	procSSSelectObj     = ssGdi32DLL.NewProc("SelectObject")
	procSSBitBlt        = ssGdi32DLL.NewProc("BitBlt")
	procSSGetDIBits     = ssGdi32DLL.NewProc("GetDIBits")

	ssFirewallOnce sync.Once
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
	ssSrcCopyCaptureBlt = 0x40CC0020
	ssSrcCopyOnly       = 0x00CC0020
	ssMouseMove         = 0x0001
	ssMouseLeftDown     = 0x0002
	ssMouseLeftUp       = 0x0004
	ssMouseRightDown    = 0x0008
	ssMouseRightUp      = 0x0010
	ssMouseWheel        = 0x0800
	ssKeyEventUnicode   = 0x0004
	ssKeyEventKeyUp     = 0x0002
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

func ensureSecondScreenFirewallAllowed(port int) {
	ssFirewallOnce.Do(func() {
		// Check if rule already exists before adding (prevents duplicate Windows Firewall entries)
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

// captureSecondScreenRectJPEG captures ANY monitor or screen region (x, y, w, h) via native Win32 GDI BitBlt,
// composites the real hardware mouse cursor, and encodes a fast, sharp JPEG scaled to maxWidth.
// Zero external dependencies — works on ALL Windows PCs!
func captureSecondScreenRectJPEG(x, y, w, h, maxWidth, quality int) ([]byte, int, int, error) {
	if w <= 0 || h <= 0 || w > 15360 || h > 8640 {
		return nil, 0, 0, fmt.Errorf("invalid rect %dx%d", w, h)
	}
	if quality < 35 || quality > 95 {
		quality = 74
	}

	hdcScreen, _, _ := procSSGetDC.Call(0)
	if hdcScreen == 0 {
		return nil, 0, 0, fmt.Errorf("GetDC failed")
	}
	defer procSSReleaseDC.Call(0, hdcScreen)

	hdcMem, _, _ := procSSCreateCompDC.Call(hdcScreen)
	if hdcMem == 0 {
		return nil, 0, 0, fmt.Errorf("CreateCompatibleDC failed")
	}
	defer procSSDeleteDC.Call(hdcMem)

	hBmp, _, _ := procSSCreateCompBmp.Call(hdcScreen, uintptr(w), uintptr(h))
	if hBmp == 0 {
		return nil, 0, 0, fmt.Errorf("CreateCompatibleBitmap failed")
	}
	defer procSSDeleteObj.Call(hBmp)

	oldObj, _, _ := procSSSelectObj.Call(hdcMem, hBmp)
	defer procSSSelectObj.Call(hdcMem, oldObj)

	okBlt, _, _ := procSSBitBlt.Call(
		hdcMem, 0, 0, uintptr(w), uintptr(h),
		hdcScreen, uintptr(int32(x)), uintptr(int32(y)), ssSrcCopyCaptureBlt,
	)
	if okBlt == 0 {
		okBlt, _, _ = procSSBitBlt.Call(
			hdcMem, 0, 0, uintptr(w), uintptr(h),
			hdcScreen, uintptr(int32(x)), uintptr(int32(y)), ssSrcCopyOnly,
		)
		if okBlt == 0 {
			return nil, 0, 0, fmt.Errorf("BitBlt failed")
		}
	}

	// Overlay real Windows mouse cursor so remote 2nd screen users always see the live pointer!
	var ci ssCursorInfo
	ci.CbSize = uint32(unsafe.Sizeof(ci))
	if okCur, _, _ := procSSGetCursorInfo.Call(uintptr(unsafe.Pointer(&ci))); okCur != 0 && (ci.Flags&1) != 0 && ci.HCursor != 0 {
		cx := int(ci.PtScreenPos.X) - x
		cy := int(ci.PtScreenPos.Y) - y
		if cx >= -32 && cy >= -32 && cx <= w+32 && cy <= h+32 {
			_, _, _ = procSSDrawIcon.Call(hdcMem, uintptr(int32(cx)), uintptr(int32(cy)), ci.HCursor)
		}
	}

	var bih bitmapInfoHeader
	bih.BiSize = uint32(unsafe.Sizeof(bih))
	bih.BiWidth = int32(w)
	bih.BiHeight = -int32(h)
	bih.BiPlanes = 1
	bih.BiBitCount = 32
	bih.BiCompression = biRGB

	pixels := make([]byte, w*h*4)
	lines, _, _ := procSSGetDIBits.Call(
		hdcMem,
		hBmp,
		0,
		uintptr(h),
		uintptr(unsafe.Pointer(&pixels[0])),
		uintptr(unsafe.Pointer(&bih)),
		dibRGBColors,
	)
	if lines == 0 {
		return nil, 0, 0, fmt.Errorf("GetDIBits failed")
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

	img := image.NewRGBA(image.Rect(0, 0, outW, outH))
	dst := img.Pix
	for dy := 0; dy < outH; dy++ {
		sy := dy * h / outH
		srcRow := sy * w * 4
		dstRow := dy * outW * 4
		for dx := 0; dx < outW; dx++ {
			sx := dx * w / outW
			si := srcRow + sx*4
			di := dstRow + dx*4
			dst[di] = pixels[si+2]   // R
			dst[di+1] = pixels[si+1] // G
			dst[di+2] = pixels[si]   // B
			dst[di+3] = 255
		}
	}

	var buf bytes.Buffer
	buf.Grow(outW * outH / 6)
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: quality}); err != nil {
		return nil, 0, 0, err
	}
	return buf.Bytes(), outW, outH, nil
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
