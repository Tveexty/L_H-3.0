//go:build windows

package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"image"
	"image/jpeg"
	"image/png"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

// ==================== WINDOWS LIVE SCREENSHOT (BitBlt + CAPTUREBLT + Fallback) + NATIVE WinRT OFFLINE OCR ====================
// Zero syscall.NewCallback calls — pure synchronous GDI BitBlt (SRCCOPY|CAPTUREBLT) + CopyFromScreen fallback + Windows.Media.Ocr!

var (
	lensUser32            = syscall.NewLazyDLL("user32.dll")
	lensGdi32             = syscall.NewLazyDLL("gdi32.dll")
	lensProcGetDC         = lensUser32.NewProc("GetDC")
	lensProcReleaseDC     = lensUser32.NewProc("ReleaseDC")
	lensProcGetSystemMet  = lensUser32.NewProc("GetSystemMetrics")
	lensProcGetDeviceCaps = lensGdi32.NewProc("GetDeviceCaps")
	lensProcCreateCompDC  = lensGdi32.NewProc("CreateCompatibleDC")
	lensProcDeleteDC      = lensGdi32.NewProc("DeleteDC")
	lensProcCreateCompBmp = lensGdi32.NewProc("CreateCompatibleBitmap")
	lensProcSelectObj     = lensGdi32.NewProc("SelectObject")
	lensProcDeleteObj     = lensGdi32.NewProc("DeleteObject")
	lensProcBitBlt        = lensGdi32.NewProc("BitBlt")
	lensProcGetDIBits     = lensGdi32.NewProc("GetDIBits")
)

type lensBitmapInfoHeader struct {
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

// isCapturedImageAllBlack detects rare DWM/GPU BitBlt failures where the entire frame is solid black.
func isCapturedImageAllBlack(img *image.RGBA) bool {
	if img == nil {
		return true
	}
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= 0 || h <= 0 {
		return true
	}
	stepX := w / 24
	if stepX < 1 {
		stepX = 1
	}
	stepY := h / 24
	if stepY < 1 {
		stepY = 1
	}
	for y := 0; y < h; y += stepY {
		rowOff := y * img.Stride
		for x := 0; x < w; x += stepX {
			off := rowOff + x*4
			if off+2 < len(img.Pix) {
				if img.Pix[off] > 4 || img.Pix[off+1] > 4 || img.Pix[off+2] > 4 {
					return false
				}
			}
		}
	}
	return true
}

func captureFullScreenViaDotNetFallback() (*image.RGBA, int, int, error) {
	tmp := filepath.Join(os.TempDir(), "luma_c2s_fallback.png")
	defer os.Remove(tmp)
	esc := strings.ReplaceAll(tmp, "'", "''")
	ps := `Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bmp=New-Object System.Drawing.Bitmap($b.Width,$b.Height); $g=[System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size); $bmp.Save('` + esc + `',[System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose()`
	ctx, cancel := context.WithTimeout(context.Background(), 3500*time.Millisecond)
	defer cancel()
	cmd := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", ps)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	if err := cmd.Run(); err != nil {
		return nil, 0, 0, err
	}
	raw, err := os.ReadFile(tmp)
	if err != nil || len(raw) == 0 {
		return nil, 0, 0, syscall.EINVAL
	}
	decoded, _, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		return nil, 0, 0, err
	}
	b := decoded.Bounds()
	w, h := b.Dx(), b.Dy()
	rgba := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			rgba.Set(x, y, decoded.At(b.Min.X+x, b.Min.Y+y))
		}
	}
	return rgba, w, h, nil
}

// captureFullScreenRGBA captures the primary Windows display using GDI BitBlt (SRCCOPY|CAPTUREBLT)
// with physical DPI dimensions and automatic CopyFromScreen fallback if GDI ever returns an all-black frame.
func captureFullScreenRGBA() (*image.RGBA, int, int, error) {
	hdcScreen, _, _ := lensProcGetDC.Call(0)
	if hdcScreen == 0 {
		return captureFullScreenViaDotNetFallback()
	}
	defer lensProcReleaseDC.Call(0, hdcScreen)

	wRaw, _, _ := lensProcGetSystemMet.Call(0) // SM_CXSCREEN
	hRaw, _, _ := lensProcGetSystemMet.Call(1) // SM_CYSCREEN
	w, h := int(wRaw), int(hRaw)

	// On High-DPI displays (125%–200%), DESKTOPHORZRES/DESKTOPVERTRES give true physical pixels
	const desktopHorzRes = 118
	const desktopVertRes = 117
	if dw, _, _ := lensProcGetDeviceCaps.Call(hdcScreen, desktopHorzRes); int(dw) > w {
		w = int(dw)
	}
	if dh, _, _ := lensProcGetDeviceCaps.Call(hdcScreen, desktopVertRes); int(dh) > h {
		h = int(dh)
	}
	if w <= 0 || h <= 0 {
		w, h = 1920, 1080
	}

	hdcMem, _, _ := lensProcCreateCompDC.Call(hdcScreen)
	if hdcMem == 0 {
		return captureFullScreenViaDotNetFallback()
	}
	defer lensProcDeleteDC.Call(hdcMem)

	hBmp, _, _ := lensProcCreateCompBmp.Call(hdcScreen, uintptr(w), uintptr(h))
	if hBmp == 0 {
		return captureFullScreenViaDotNetFallback()
	}
	defer lensProcDeleteObj.Call(hBmp)

	oldObj, _, _ := lensProcSelectObj.Call(hdcMem, hBmp)
	defer lensProcSelectObj.Call(hdcMem, oldObj)

	// SRCCOPY | CAPTUREBLT ensures layered, transparent, WebView2 & Chrome hardware windows are captured cleanly!
	const srccopyCaptureBlt = 0x00CC0020 | 0x40000000
	okBlt, _, _ := lensProcBitBlt.Call(hdcMem, 0, 0, uintptr(w), uintptr(h), hdcScreen, 0, 0, srccopyCaptureBlt)
	if okBlt == 0 {
		// Retry plain SRCCOPY if CAPTUREBLT wasn't supported by driver
		const srccopy = 0x00CC0020
		_, _, _ = lensProcBitBlt.Call(hdcMem, 0, 0, uintptr(w), uintptr(h), hdcScreen, 0, 0, srccopy)
	}

	bi := lensBitmapInfoHeader{
		BiSize:        uint32(unsafe.Sizeof(lensBitmapInfoHeader{})),
		BiWidth:       int32(w),
		BiHeight:      -int32(h), // top-down DIB
		BiPlanes:      1,
		BiBitCount:    32,
		BiCompression: 0, // BI_RGB
	}
	pix := make([]byte, w*h*4)
	_, _, _ = lensProcGetDIBits.Call(hdcMem, hBmp, 0, uintptr(h), uintptr(unsafe.Pointer(&pix[0])), uintptr(unsafe.Pointer(&bi)), 0)

	// Convert BGRA -> RGBA
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for i := 0; i < len(pix); i += 4 {
		img.Pix[i] = pix[i+2]
		img.Pix[i+1] = pix[i+1]
		img.Pix[i+2] = pix[i]
		img.Pix[i+3] = 255
	}

	if isCapturedImageAllBlack(img) {
		if fbImg, fw, fh, err := captureFullScreenViaDotNetFallback(); err == nil && fbImg != nil {
			return fbImg, fw, fh, nil
		}
	}
	return img, w, h, nil
}

// captureFullScreenPNG captures the live Windows desktop into a single-prefixed base64 PNG data URI (~40ms).
func captureFullScreenPNG() (string, int, int, error) {
	img, w, h, err := captureFullScreenRGBA()
	if err != nil {
		return "", 0, 0, err
	}
	var buf bytes.Buffer
	enc := png.Encoder{CompressionLevel: png.BestSpeed}
	if err := enc.Encode(&buf, img); err != nil {
		return "", 0, 0, err
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(buf.Bytes()), w, h, nil
}

// captureFullScreenJPEG captures the live Windows desktop into a fast compact JPEG data URI for Phone LAN Circle to Search (~100ms over Wi-Fi!).
func captureFullScreenJPEG(maxWidth, quality int) (string, int, int, error) {
	img, w, h, err := captureFullScreenRGBA()
	if err != nil {
		return "", 0, 0, err
	}
	target := img
	outW, outH := w, h
	if maxWidth > 0 && w > maxWidth {
		scale := float64(maxWidth) / float64(w)
		outW = maxWidth
		outH = int(math.Max(1, math.Round(float64(h)*scale)))
		dst := image.NewRGBA(image.Rect(0, 0, outW, outH))
		for y := 0; y < outH; y++ {
			sy := y * h / outH
			srcRow := sy * img.Stride
			dstRow := y * dst.Stride
			for x := 0; x < outW; x++ {
				sx := x * w / outW
				so := srcRow + sx*4
				do := dstRow + x*4
				dst.Pix[do] = img.Pix[so]
				dst.Pix[do+1] = img.Pix[so+1]
				dst.Pix[do+2] = img.Pix[so+2]
				dst.Pix[do+3] = 255
			}
		}
		target = dst
	}
	if quality <= 0 || quality > 100 {
		quality = 86
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, target, &jpeg.Options{Quality: quality}); err != nil {
		return "", 0, 0, err
	}
	return "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(buf.Bytes()), outW, outH, nil
}

// runNativeImageOCR uses Windows 10/11 built-in WinRT Windows.Media.Ocr.OcrEngine (offline Russian + English!).
func runNativeImageOCR(pngPath string) string {
	esc := strings.ReplaceAll(pngPath, "'", "''")
	psScript := `
$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
  [void][Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]
  [void][Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType=WindowsRuntime]
  [void][Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime]
  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation` + "`1" + `' })[0]
  function AwaitOp($op, $t) {
    $m = $asTaskGeneric.MakeGenericMethod($t)
    $task = $m.Invoke($null, @($op))
    $task.Wait(3000) | Out-Null
    return $task.Result
  }
  $file = AwaitOp ([Windows.Storage.StorageFile]::GetFileFromPathAsync('` + esc + `')) ([Windows.Storage.StorageFile])
  $stream = AwaitOp ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decoder = AwaitOp ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bmp = AwaitOp ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  if (-not $engine) {
    $lang = New-Object Windows.Globalization.Language('en-US')
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
  }
  if ($engine) {
    $res = AwaitOp ($engine.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])
    if ($res -and $res.Text) { Write-Output $res.Text }
  }
} catch {}
`
	ctx, cancel := context.WithTimeout(context.Background(), 4200*time.Millisecond)
	defer cancel()
	cmd := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", psScript)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}
