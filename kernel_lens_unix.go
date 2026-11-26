//go:build !windows

package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"image"
	"image/jpeg"
	_ "image/png"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

func captureFullScreenPNG() (string, int, int, error) {
	tmp := filepath.Join(os.TempDir(), "luma_screen_cap.png")
	defer os.Remove(tmp)
	ctx, cancel := context.WithTimeout(context.Background(), 2500*time.Millisecond)
	defer cancel()
	for _, args := range [][]string{
		{"grim", tmp},
		{"scrot", "-o", tmp},
		{"import", "-window", "root", tmp},
	} {
		if p, err := exec.LookPath(args[0]); err == nil {
			if exec.CommandContext(ctx, p, args[1:]...).Run() == nil {
				if raw, err2 := os.ReadFile(tmp); err2 == nil && len(raw) > 0 {
					w, h := 1920, 1080
					if cfg, _, derr := image.DecodeConfig(bytes.NewReader(raw)); derr == nil && cfg.Width > 0 && cfg.Height > 0 {
						w, h = cfg.Width, cfg.Height
					}
					return "data:image/png;base64," + base64.StdEncoding.EncodeToString(raw), w, h, nil
				}
			}
		}
	}
	return "", 0, 0, os.ErrNotExist
}

func captureFullScreenJPEG(maxWidth, quality int) (string, int, int, error) {
	pngURI, w, h, err := captureFullScreenPNG()
	if err != nil {
		return "", 0, 0, err
	}
	b64 := pngURI
	if idx := strings.Index(b64, ","); idx >= 0 {
		b64 = b64[idx+1:]
	}
	raw, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return pngURI, w, h, nil
	}
	img, _, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		return pngURI, w, h, nil
	}
	b := img.Bounds()
	w, h = b.Dx(), b.Dy()
	target := img
	outW, outH := w, h
	if maxWidth > 0 && w > maxWidth {
		scale := float64(maxWidth) / float64(w)
		outW = maxWidth
		outH = int(math.Max(1, math.Round(float64(h)*scale)))
		dst := image.NewRGBA(image.Rect(0, 0, outW, outH))
		for y := 0; y < outH; y++ {
			sy := b.Min.Y + y*h/outH
			for x := 0; x < outW; x++ {
				sx := b.Min.X + x*w/outW
				dst.Set(x, y, img.At(sx, sy))
			}
		}
		target = dst
	}
	if quality <= 0 || quality > 100 {
		quality = 86
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, target, &jpeg.Options{Quality: quality}); err != nil {
		return pngURI, w, h, nil
	}
	return "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(buf.Bytes()), outW, outH, nil
}

func runNativeImageOCR(pngPath string) string {
	p, err := exec.LookPath("tesseract")
	if err != nil {
		return ""
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3500*time.Millisecond)
	defer cancel()
	cmd := exec.CommandContext(ctx, p, pngPath, "stdout", "-l", "rus+eng")
	out, err := cmd.Output()
	if err != nil {
		cmd2 := exec.CommandContext(ctx, p, pngPath, "stdout")
		out, err = cmd2.Output()
		if err != nil {
			return ""
		}
	}
	return strings.TrimSpace(string(out))
}
