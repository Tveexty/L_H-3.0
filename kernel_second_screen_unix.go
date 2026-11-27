//go:build !windows

package main

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"time"
)

func ensureSecondScreenFirewallAllowed(port int) {}

// captureSecondScreenRectJPEG renders a smooth synthetic preview frame on headless Linux/dev hosts
// so MJPEG streaming & E2E tests verify real binary JPEG delivery end-to-end.
func captureSecondScreenRectJPEG(x, y, w, h, maxWidth, quality int) ([]byte, int, int, error) {
	outW, outH := 640, 360
	if maxWidth >= 960 {
		outW, outH = 800, 450
	}
	img := image.NewRGBA(image.Rect(0, 0, outW, outH))
	phase := int(time.Now().UnixMilli()/40) % outW
	for py := 0; py < outH; py++ {
		for px := 0; px < outW; px++ {
			r := uint8(10 + (px*24)/outW)
			g := uint8(18 + (py*42)/outH)
			b := uint8(34 + ((px+py)*48)/(outW+outH))
			if px >= phase && px < phase+14 {
				g = 195
				b = 155
			}
			img.SetRGBA(px, py, color.RGBA{R: r, G: g, B: b, A: 255})
		}
	}
	var buf bytes.Buffer
	if quality < 40 || quality > 95 {
		quality = 72
	}
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: quality}); err != nil {
		return nil, 0, 0, err
	}
	return buf.Bytes(), outW, outH, nil
}

func injectSecondScreenInput(action string, absX, absY, dx, dy, delta int, text, key string) {}
