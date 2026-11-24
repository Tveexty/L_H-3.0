//go:build !windows

package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func pollNativeGamepads() []GamepadControllerState {
	controllers := make([]GamepadControllerState, 0)
	matches, _ := filepath.Glob("/sys/class/input/js*")
	for idx, m := range matches {
		nameBytes, err := os.ReadFile(filepath.Join(m, "device", "name"))
		if err != nil {
			continue
		}
		name := strings.TrimSpace(string(nameBytes))
		low := strings.ToLower(name)
		kind := "hid"
		supportsRGB := false
		switch {
		case strings.Contains(low, "dualsense") || strings.Contains(low, "ps5"):
			kind = "dualsense"
			supportsRGB = true
		case strings.Contains(low, "dualshock") || strings.Contains(low, "ps4") || strings.Contains(low, "sony"):
			kind = "ds4"
			supportsRGB = true
		case strings.Contains(low, "xbox") || strings.Contains(low, "x-box"):
			kind = "xbox"
		}
		bat := -1
		if batFiles, _ := filepath.Glob("/sys/class/power_supply/sony_controller_battery_*/capacity"); len(batFiles) > 0 {
			if bRaw, err2 := os.ReadFile(batFiles[0]); err2 == nil {
				if v, err3 := strconv.Atoi(strings.TrimSpace(string(bRaw))); err3 == nil {
					bat = v
				}
			}
		}
		controllers = append(controllers, GamepadControllerState{
			Index:          idx,
			ID:             fmt.Sprintf("linux_js_%d", idx),
			Name:           name,
			Kind:           kind,
			Transport:      "Linux Joystick / HID",
			Connected:      true,
			BatteryPct:     bat,
			SupportsRGB:    supportsRGB,
			SupportsRumble: true,
			PressedNames:   []string{},
		})
	}
	return controllers
}

func applyNativeGamepadRumble(_ int, left, right uint8, durationMs int) map[string]interface{} {
	if durationMs < 80 {
		durationMs = 80
	}
	if durationMs > 4000 {
		durationMs = 4000
	}
	return map[string]interface{}{
		"ok":          true,
		"applied_hw":  false,
		"left":        left,
		"right":       right,
		"duration_ms": durationMs,
	}
}

func applyNativeGamepadLightbar(_ int, r, g, b uint8, brightness int) map[string]interface{} {
	scale := float64(brightness) / 100.0
	if scale < 0 {
		scale = 0
	}
	if scale > 1 {
		scale = 1
	}
	sr := uint8(float64(r) * scale)
	sg := uint8(float64(g) * scale)
	sb := uint8(float64(b) * scale)
	gamepadMu.Lock()
	gamepadLastR, gamepadLastG, gamepadLastB = sr, sg, sb
	gamepadMu.Unlock()
	return map[string]interface{}{
		"ok":         true,
		"applied_hw": false,
		"rgb":        []uint8{sr, sg, sb},
	}
}

func setGamepadEmulationMode(enabled bool) map[string]interface{} {
	ensureGamepadStoreLoaded()
	gamepadMu.Lock()
	gamepadStore.EmulationActive = enabled
	saveGamepadStoreLocked()
	gamepadMu.Unlock()
	return getGamepadStudioSnapshot()
}
