//go:build windows

package main

import (
	"bytes"
	"encoding/base64"
	"image"
	"image/jpeg"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

// ==================== LUMA OS 1.5.4 LIVE WINDOW THUMBNAIL PREVIEWS & REAL FOREGROUND MRU ====================
// Captures real hardware-accelerated window contents via PrintWindow(PW_RENDERFULLCONTENT)
// (Chrome, Telegram, Explorer, VS Code, Games!) scaled down to crisp 320x180 JPEG previews for Alt+Tab!

var (
	prevUser32             = syscall.NewLazyDLL("user32.dll")
	prevGdi32              = syscall.NewLazyDLL("gdi32.dll")
	procPrevEnumWin        = prevUser32.NewProc("EnumWindows")
	procPrevIsVis          = prevUser32.NewProc("IsWindowVisible")
	procPrevIsIconic       = prevUser32.NewProc("IsIconic")
	procPrevGetWinPID      = prevUser32.NewProc("GetWindowThreadProcessId")
	procPrevGetFg          = prevUser32.NewProc("GetForegroundWindow")
	procPrevGetRect        = prevUser32.NewProc("GetWindowRect")
	procPrevGetDC          = prevUser32.NewProc("GetDC")
	procPrevReleaseDC      = prevUser32.NewProc("ReleaseDC")
	procPrevPrintWindow    = prevUser32.NewProc("PrintWindow")
	procPrevCreateCompDC   = prevGdi32.NewProc("CreateCompatibleDC")
	procPrevCreateCompBmp  = prevGdi32.NewProc("CreateCompatibleBitmap")
	procPrevSelectObject   = prevGdi32.NewProc("SelectObject")
	procPrevDeleteObject   = prevGdi32.NewProc("DeleteObject")
	procPrevDeleteDC       = prevGdi32.NewProc("DeleteDC")
	procPrevSetStretchMode = prevGdi32.NewProc("SetStretchBltMode")
	procPrevStretchBlt     = prevGdi32.NewProc("StretchBlt")
	procPrevGetDIBits      = prevGdi32.NewProc("GetDIBits")
)

type prevBitmapInfoHeader struct {
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

type cachedWinThumb struct {
	dataURI string
	at      time.Time
}

var (
	winPreviewMu   sync.Mutex
	winThumbCache  = map[int]cachedWinThumb{}
	winMruLastMs   = map[int]int64{}
	mruStartedOnce sync.Once

	prevEnumMu        sync.Mutex
	prevEnumTargetPID int
	prevEnumBestHwnd  uintptr
	prevEnumBestArea  int64
	prevEnumBestW     int32
	prevEnumBestH     int32
	prevEnumWinCb     = syscall.NewCallback(func(hwnd uintptr, _ uintptr) uintptr {
		vis, _, _ := procPrevIsVis.Call(hwnd)
		if vis == 0 {
			return 1
		}
		var pid uint32
		_, _, _ = procPrevGetWinPID.Call(hwnd, uintptr(unsafe.Pointer(&pid)))
		if int(pid) != prevEnumTargetPID {
			return 1
		}
		var r winRect
		_, _, _ = procPrevGetRect.Call(hwnd, uintptr(unsafe.Pointer(&r)))
		w := r.Right - r.Left
		h := r.Bottom - r.Top
		if w < 120 || h < 80 {
			return 1
		}
		area := int64(w) * int64(h)
		if area > prevEnumBestArea {
			prevEnumBestArea = area
			prevEnumBestHwnd = hwnd
			prevEnumBestW = w
			prevEnumBestH = h
		}
		return 1
	})
)

func startForegroundMRUTracker() {
	mruStartedOnce.Do(func() {
		go func() {
			defer func() { _ = recover() }()
			ticker := time.NewTicker(250 * time.Millisecond)
			defer ticker.Stop()
			tickNum := 0
			for range ticker.C {
				func() {
					defer func() { _ = recover() }()
					fg, _, _ := procPrevGetFg.Call()
					if fg != 0 {
						var pid uint32
						_, _, _ = procPrevGetWinPID.Call(fg, uintptr(unsafe.Pointer(&pid)))
						if pid != 0 {
							winPreviewMu.Lock()
							winMruLastMs[int(pid)] = time.Now().UnixMilli()
							winPreviewMu.Unlock()
						}
					}
					tickNum++
					// Every ~2 minutes prune stale entries so maps stay tiny forever
					if tickNum%480 == 0 {
						cutoffMs := time.Now().Add(-30 * time.Minute).UnixMilli()
						cutoffThumb := time.Now().Add(-5 * time.Minute)
						winPreviewMu.Lock()
						for k, ts := range winMruLastMs {
							if ts < cutoffMs {
								delete(winMruLastMs, k)
							}
						}
						for k, c := range winThumbCache {
							if c.at.Before(cutoffThumb) {
								delete(winThumbCache, k)
							}
						}
						winPreviewMu.Unlock()
					}
				}()
			}
		}()
	})
}

func recordWindowMRU(pid int) {
	if pid <= 0 {
		return
	}
	winPreviewMu.Lock()
	winMruLastMs[pid] = time.Now().UnixMilli()
	winPreviewMu.Unlock()
}

func getWindowMRUSnapshot() map[int]int64 {
	winPreviewMu.Lock()
	defer winPreviewMu.Unlock()
	out := make(map[int]int64, len(winMruLastMs))
	for k, v := range winMruLastMs {
		out[k] = v
	}
	return out
}

func findMainHWNDForPID(targetPID int) (uintptr, int32, int32) {
	prevEnumMu.Lock()
	defer prevEnumMu.Unlock()
	prevEnumTargetPID = targetPID
	prevEnumBestHwnd = 0
	prevEnumBestArea = 0
	prevEnumBestW = 0
	prevEnumBestH = 0
	_, _, _ = procPrevEnumWin.Call(prevEnumWinCb, 0)
	return prevEnumBestHwnd, prevEnumBestW, prevEnumBestH
}

func captureHostWindowPreview(pid int) (res string) {
	defer func() {
		if r := recover(); r != nil {
			res = ""
		}
	}()
	if pid <= 0 {
		return ""
	}
	winPreviewMu.Lock()
	if c, ok := winThumbCache[pid]; ok && time.Since(c.at) < 1400*time.Millisecond {
		winPreviewMu.Unlock()
		return c.dataURI
	}
	winPreviewMu.Unlock()

	hwnd, srcW, srcH := findMainHWNDForPID(pid)
	if hwnd == 0 || srcW <= 0 || srcH <= 0 {
		return ""
	}
	if srcW > 3840 {
		srcW = 3840
	}
	if srcH > 2160 {
		srcH = 2160
	}
	iconic, _, _ := procPrevIsIconic.Call(hwnd)
	if iconic != 0 {
		// Return last known cached preview if minimized!
		winPreviewMu.Lock()
		c := winThumbCache[pid].dataURI
		winPreviewMu.Unlock()
		return c
	}

	const (
		thumbW              = 320
		thumbH              = 180
		pwRenderFullContent = 0x00000002
		halftoneMode        = 4
		srccopy             = 0x00CC0020
		biRGB               = 0
		dibRGBColors        = 0
	)

	screenDC, _, _ := procPrevGetDC.Call(0)
	if screenDC == 0 {
		return ""
	}
	defer procPrevReleaseDC.Call(0, screenDC)

	srcDC, _, _ := procPrevCreateCompDC.Call(screenDC)
	if srcDC == 0 {
		return ""
	}
	defer procPrevDeleteDC.Call(srcDC)

	srcBmp, _, _ := procPrevCreateCompBmp.Call(screenDC, uintptr(srcW), uintptr(srcH))
	if srcBmp == 0 {
		return ""
	}
	defer procPrevDeleteObject.Call(srcBmp)

	oldSrc, _, _ := procPrevSelectObject.Call(srcDC, srcBmp)
	defer procPrevSelectObject.Call(srcDC, oldSrc)

	// PW_RENDERFULLCONTENT captures DirectComposition / Chrome / Electron / Telegram cleanly!
	ok, _, _ := procPrevPrintWindow.Call(hwnd, srcDC, pwRenderFullContent)
	if ok == 0 {
		ok, _, _ = procPrevPrintWindow.Call(hwnd, srcDC, 0)
		if ok == 0 {
			return ""
		}
	}

	dstDC, _, _ := procPrevCreateCompDC.Call(screenDC)
	if dstDC == 0 {
		return ""
	}
	defer procPrevDeleteDC.Call(dstDC)

	dstBmp, _, _ := procPrevCreateCompBmp.Call(screenDC, thumbW, thumbH)
	if dstBmp == 0 {
		return ""
	}
	defer procPrevDeleteObject.Call(dstBmp)

	oldDst, _, _ := procPrevSelectObject.Call(dstDC, dstBmp)
	defer procPrevSelectObject.Call(dstDC, oldDst)

	_, _, _ = procPrevSetStretchMode.Call(dstDC, halftoneMode)
	_, _, _ = procPrevStretchBlt.Call(
		dstDC, 0, 0, thumbW, thumbH,
		srcDC, 0, 0, uintptr(srcW), uintptr(srcH),
		srccopy,
	)

	var bi prevBitmapInfoHeader
	bi.BiSize = uint32(unsafe.Sizeof(bi))
	bi.BiWidth = thumbW
	bi.BiHeight = -thumbH // top-down DIB
	bi.BiPlanes = 1
	bi.BiBitCount = 32
	bi.BiCompression = biRGB

	rawPixels := make([]byte, thumbW*thumbH*4)
	lines, _, _ := procPrevGetDIBits.Call(
		dstDC,
		dstBmp,
		0,
		thumbH,
		uintptr(unsafe.Pointer(&rawPixels[0])),
		uintptr(unsafe.Pointer(&bi)),
		dibRGBColors,
	)
	if lines == 0 {
		return ""
	}

	// Convert BGRA -> RGBA for JPEG encoding
	img := image.NewRGBA(image.Rect(0, 0, thumbW, thumbH))
	for i := 0; i < len(rawPixels); i += 4 {
		img.Pix[i] = rawPixels[i+2]   // R
		img.Pix[i+1] = rawPixels[i+1] // G
		img.Pix[i+2] = rawPixels[i]   // B
		img.Pix[i+3] = 255            // A
	}

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 68}); err != nil {
		return ""
	}
	dataURI := "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(buf.Bytes())

	winPreviewMu.Lock()
	winThumbCache[pid] = cachedWinThumb{dataURI: dataURI, at: time.Now()}
	winPreviewMu.Unlock()
	return dataURI
}
