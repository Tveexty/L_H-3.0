//go:build !windows

package main

import (
	"context"
	"encoding/base64"
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
					return "data:image/png;base64," + base64.StdEncoding.EncodeToString(raw), 1920, 1080, nil
				}
			}
		}
	}
	return "", 0, 0, os.ErrNotExist
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
