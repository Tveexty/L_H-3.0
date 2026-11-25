//go:build windows

package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"image"
	"image/png"
	"os/exec"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

// ==================== WINDOWS LIVE SCREENSHOT (BitBlt) + NATIVE WinRT OFFLINE OCR ====================
// Zero syscall.NewCallback calls — pure synchronous GDI BitBlt + Windows.Media.Ocr!

var (
	lensUser32             = syscall.NewLazyDLL("user32.dll")
	lensGdi32              = syscall.NewLazyDLL("gdi32.dll")
	lensProcGetDC          = lensUser32.NewProc("GetDC")
	lensProcReleaseDC      = lensUser32.NewProc("ReleaseDC")
	lensProcGetSystemMet   = lensUser32.NewProc("GetSystemMetrics")
	lensProcCreateCompDC   = lensGdi32.NewProc("CreateCompatibleDC")
	lensProcDeleteDC       = lensGdi32.NewProc("DeleteDC")
	lensProcCreateCompBmp  = lensGdi32.NewProc("CreateCompatibleBitmap")
	lensProcSelectObj      = lensGdi32.NewProc("SelectObject")
	lensProcDeleteObj      = lensGdi32.NewProc("DeleteObject")
	lensProcBitBlt         = lensGdi32.NewProc("BitBlt")
	lensProcGetDIBits      = lensGdi32.NewProc("GetDIBits")
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

// captureFullScreenPNG captures the live Windows desktop into a crisp base64 PNG data URI (~40ms).
func captureFullScreenPNG() (string, int, int, error) {
	wRaw, _, _ := lensProcGetSystemMet.Call(0) // SM_CXSCREEN
	hRaw, _, _ := lensProcGetSystemMet.Call(1) // SM_CYSCREEN
	w, h := int(wRaw), int(hRaw)
	if w <= 0 || h <= 0 {
		w, h = 1920, 1080
	}

	hdcScreen, _, _ := lensProcGetDC.Call(0)
	if hdcScreen == 0 {
		return "", 0, 0, syscall.EINVAL
	}
	defer lensProcReleaseDC.Call(0, hdcScreen)

	hdcMem, _, _ := lensProcCreateCompDC.Call(hdcScreen)
	if hdcMem == 0 {
		return "", 0, 0, syscall.EINVAL
	}
	defer lensProcDeleteDC.Call(hdcMem)

	hBmp, _, _ := lensProcCreateCompBmp.Call(hdcScreen, uintptr(w), uintptr(h))
	if hBmp == 0 {
		return "", 0, 0, syscall.EINVAL
	}
	defer lensProcDeleteObj.Call(hBmp)

	oldObj, _, _ := lensProcSelectObj.Call(hdcMem, hBmp)
	defer lensProcSelectObj.Call(hdcMem, oldObj)

	const srccopy = 0x00CC0020
	_, _, _ = lensProcBitBlt.Call(hdcMem, 0, 0, uintptr(w), uintptr(h), hdcScreen, 0, 0, srccopy)

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
	var buf bytes.Buffer
	enc := png.Encoder{CompressionLevel: png.BestSpeed}
	if err := enc.Encode(&buf, img); err != nil {
		return "", 0, 0, err
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(buf.Bytes()), w, h, nil
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
