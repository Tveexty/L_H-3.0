//go:build !windows

package main

import (
	"image"
	"time"
)

func ensureSecondScreenFirewallAllowed(port int) {}
func setSecondScreenHighResTimer(enable bool)    {}

// captureSecondScreenRectYCbCr renders a fast animated YCbCr(4:2:0) test frame on headless Linux/dev
// hosts so the full multi-core encoder pool, MJPEG broadcast & 60 FPS pacing are exercised live.
func captureSecondScreenRectYCbCr(x, y, w, h, maxWidth int, reuse *image.YCbCr) (*image.YCbCr, int, int, error) {
	outW, outH := 1280, 720
	if maxWidth > 0 && maxWidth < outW {
		outW = (maxWidth / 2) * 2
		outH = ((outW * 9 / 16) / 2) * 2
	} else if maxWidth >= 1600 || maxWidth == 0 {
		outW, outH = 1280, 720
	}
	if outW < 320 {
		outW = 320
	}
	if outH < 180 {
		outH = 180
	}

	dst := reuse
	if dst == nil || dst.Rect.Dx() != outW || dst.Rect.Dy() != outH || dst.SubsampleRatio != image.YCbCrSubsampleRatio420 {
		dst = image.NewYCbCr(image.Rect(0, 0, outW, outH), image.YCbCrSubsampleRatio420)
		// Initialize rich gradient background once per buffer allocation
		for py := 0; py < outH; py++ {
			yRow := py * dst.YStride
			yv := uint8(24 + (py*110)/outH)
			for px := 0; px < outW; px++ {
				dst.Y[yRow+px] = uint8((int(yv) + (px*70)/outW) & 0xFF)
			}
		}
		cw := outW / 2
		ch := outH / 2
		for cy := 0; cy < ch; cy++ {
			cRow := cy * dst.CStride
			for cx := 0; cx < cw; cx++ {
				dst.Cb[cRow+cx] = uint8(110 + (cx*60)/cw)
				dst.Cr[cRow+cx] = uint8(95 + (cy*55)/ch)
			}
		}
	}

	// Draw moving luminous scan bar so every frame changes visibly (verifies real 60 FPS motion & bitrate)
	phase := int(time.Now().UnixMilli()/16) % (outW - 24)
	for py := 0; py < outH; py += 2 {
		yRow := py * dst.YStride
		for px := phase; px < phase+20; px++ {
			dst.Y[yRow+px] = 235
		}
	}
	return dst, outW, outH, nil
}

func injectSecondScreenInput(action string, absX, absY, dx, dy, delta int, text, key string) {}
