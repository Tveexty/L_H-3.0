//go:build windows

package main

import (
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

// ==================== LUMA GAMEPAD STUDIO: WINDOWS NATIVE XINPUT + HID + DS4/DUALSENSE RGB & SENDINPUT ====================
// Zero syscall.NewCallback calls — pure synchronous Win32 XInput & HID polling!

var (
	xinputDLL14          = syscall.NewLazyDLL("xinput1_4.dll")
	xinputDLL91          = syscall.NewLazyDLL("xinput9_1_0.dll")
	procXInputGetState14 = xinputDLL14.NewProc("XInputGetState")
	procXInputSetState14 = xinputDLL14.NewProc("XInputSetState")
	procXInputGetBat14   = xinputDLL14.NewProc("XInputGetBatteryInformation")
	procXInputGetState91 = xinputDLL91.NewProc("XInputGetState")
	procXInputSetState91 = xinputDLL91.NewProc("XInputSetState")

	user32GamepadDLL   = syscall.NewLazyDLL("user32.dll")
	procSendInputGP    = user32GamepadDLL.NewProc("SendInput")
	kernel32GamepadDLL = syscall.NewLazyDLL("kernel32.dll")
	procWriteFileGP    = kernel32GamepadDLL.NewProc("WriteFile")

	hidScanCacheMu   sync.Mutex
	hidGamepadCache  []GamepadControllerState
	hidGamepadScanAt time.Time
)

type xinputGamepad struct {
	Buttons      uint16
	LeftTrigger  uint8
	RightTrigger uint8
	ThumbLX      int16
	ThumbLY      int16
	ThumbRX      int16
	ThumbRY      int16
}

type xinputState struct {
	PacketNumber uint32
	Gamepad      xinputGamepad
}

type xinputVibration struct {
	LeftMotorSpeed  uint16
	RightMotorSpeed uint16
}

type xinputBatteryInfo struct {
	BatteryType  uint8
	BatteryLevel uint8
}

func xinputGetStateCall(idx uint32, st *xinputState) uintptr {
	if err := procXInputGetState14.Find(); err == nil {
		r, _, _ := procXInputGetState14.Call(uintptr(idx), uintptr(unsafe.Pointer(st)))
		return r
	}
	if err := procXInputGetState91.Find(); err == nil {
		r, _, _ := procXInputGetState91.Call(uintptr(idx), uintptr(unsafe.Pointer(st)))
		return r
	}
	return 1167 // ERROR_DEVICE_NOT_CONNECTED
}

func xinputSetStateCall(idx uint32, vib *xinputVibration) uintptr {
	if err := procXInputSetState14.Find(); err == nil {
		r, _, _ := procXInputSetState14.Call(uintptr(idx), uintptr(unsafe.Pointer(vib)))
		return r
	}
	if err := procXInputSetState91.Find(); err == nil {
		r, _, _ := procXInputSetState91.Call(uintptr(idx), uintptr(unsafe.Pointer(vib)))
		return r
	}
	return 1167
}

func decodeXInputButtons(mask uint16) []string {
	names := []struct {
		bit  uint16
		name string
	}{
		{0x0001, "DPAD_UP"}, {0x0002, "DPAD_DOWN"}, {0x0004, "DPAD_LEFT"}, {0x0008, "DPAD_RIGHT"},
		{0x0010, "START"}, {0x0020, "BACK"}, {0x0040, "L3"}, {0x0080, "R3"},
		{0x0100, "LB"}, {0x0200, "RB"}, {0x1000, "A"}, {0x2000, "B"}, {0x4000, "X"}, {0x8000, "Y"},
	}
	out := make([]string, 0, 4)
	for _, n := range names {
		if (mask & n.bit) != 0 {
			out = append(out, n.name)
		}
	}
	return out
}

func normThumb(v int16) float64 {
	if v < 0 {
		f := float64(v) / 32768.0
		if f < -1 {
			return -1
		}
		return math.Round(f*1000) / 1000
	}
	f := float64(v) / 32767.0
	if f > 1 {
		return 1
	}
	return math.Round(f*1000) / 1000
}

// scanSonyAndHIDGamepads discovers connected DualShock 4, DualSense, and generic HID gamepads via PnP/HID without PowerShell loops.
func scanSonyAndHIDGamepadsCached() []GamepadControllerState {
	hidScanCacheMu.Lock()
	if !hidGamepadScanAt.IsZero() && time.Since(hidGamepadScanAt) < 8*time.Second {
		cp := append([]GamepadControllerState{}, hidGamepadCache...)
		hidScanCacheMu.Unlock()
		return cp
	}
	hidScanCacheMu.Unlock()

	// Fast query PnP HID gamepads via SetupAPI / existing HID battery cache or single lightweight PnP check
	var found []GamepadControllerState
	ps := `Get-PnpDevice -Class HIDClass -Status OK -ErrorAction SilentlyContinue | Where-Object { $_.InstanceId -match 'VID_054C|VID_045E|VID_057E|VID_2DC8' -or $_.FriendlyName -match 'DualSense|DualShock|Wireless Controller|Gamepad|Xbox|Controller' } | Select-Object -First 8 FriendlyName,InstanceId | ConvertTo-Json -Compress`
	if out, err := runHiddenPowerShell(ps); err == nil && strings.TrimSpace(out) != "" {
		raw := strings.TrimSpace(out)
		type pnpRow struct {
			FriendlyName string `json:"FriendlyName"`
			InstanceId   string `json:"InstanceId"`
		}
		var rows []pnpRow
		if strings.HasPrefix(raw, "[") {
			_ = json.Unmarshal([]byte(raw), &rows)
		} else {
			var one pnpRow
			if json.Unmarshal([]byte(raw), &one) == nil && one.InstanceId != "" {
				rows = append(rows, one)
			}
		}
		seen := map[string]bool{}
		for _, r := range rows {
			iid := strings.ToUpper(r.InstanceId)
			kind := "hid"
			name := r.FriendlyName
			vid, pid := "", ""
			supportsRGB := false
			switch {
			case strings.Contains(iid, "VID_054C") && (strings.Contains(iid, "PID_0CE6") || strings.Contains(iid, "PID_0DF2")):
				kind = "dualsense"
				vid, pid = "054C", "0CE6"
				if name == "" || strings.Contains(strings.ToLower(name), "hid") {
					name = "Sony DualSense Wireless Controller"
				}
				supportsRGB = true
			case strings.Contains(iid, "VID_054C") && (strings.Contains(iid, "PID_05C4") || strings.Contains(iid, "PID_09CC") || strings.Contains(iid, "PID_0BA0")):
				kind = "ds4"
				vid, pid = "054C", "09CC"
				if name == "" || strings.Contains(strings.ToLower(name), "hid") {
					name = "Sony DualShock 4 Wireless Controller"
				}
				supportsRGB = true
			case strings.Contains(iid, "VID_045E"):
				// Xbox is already enumerated with live sticks by XInput below
				continue
			case strings.Contains(strings.ToLower(name), "dualsense"):
				kind = "dualsense"
				supportsRGB = true
			case strings.Contains(strings.ToLower(name), "dualshock") || strings.Contains(strings.ToLower(name), "wireless controller"):
				kind = "ds4"
				supportsRGB = true
			}
			key := kind + "_" + vid + "_" + pid + "_" + name
			if seen[key] {
				continue
			}
			seen[key] = true
			transport := "USB HID"
			if strings.Contains(iid, "BTHENUM") || strings.Contains(iid, "BTHLE") {
				transport = "Bluetooth HID"
			}
			found = append(found, GamepadControllerState{
				Index:          10 + len(found),
				ID:             fmt.Sprintf("hid_%s_%d", kind, len(found)),
				Name:           name,
				Kind:           kind,
				Transport:      transport,
				Connected:      true,
				BatteryPct:     -1,
				VendorID:       vid,
				ProductID:      pid,
				HIDPath:        r.InstanceId,
				SupportsRGB:    supportsRGB,
				SupportsRumble: true,
				PressedNames:   []string{},
			})
		}
	}

	hidScanCacheMu.Lock()
	hidGamepadCache = found
	hidGamepadScanAt = time.Now()
	hidScanCacheMu.Unlock()
	return found
}

func pollNativeGamepads() []GamepadControllerState {
	controllers := make([]GamepadControllerState, 0, 4)
	for i := uint32(0); i < 4; i++ {
		var st xinputState
		if xinputGetStateCall(i, &st) == 0 {
			batPct := -1
			if err := procXInputGetBat14.Find(); err == nil {
				var bi xinputBatteryInfo
				if r, _, _ := procXInputGetBat14.Call(uintptr(i), 0, uintptr(unsafe.Pointer(&bi))); r == 0 {
					switch bi.BatteryLevel {
					case 0:
						batPct = 10
					case 1:
						batPct = 35
					case 2:
						batPct = 70
					case 3:
						batPct = 100
					}
				}
			}
			controllers = append(controllers, GamepadControllerState{
				Index:          int(i),
				ID:             fmt.Sprintf("xinput_%d", i),
				Name:           fmt.Sprintf("Xbox / XInput Controller #%d", i+1),
				Kind:           "xbox",
				Transport:      "XInput",
				Connected:      true,
				BatteryPct:     batPct,
				SupportsRGB:    false,
				SupportsRumble: true,
				LX:             normThumb(st.Gamepad.ThumbLX),
				LY:             normThumb(st.Gamepad.ThumbLY),
				RX:             normThumb(st.Gamepad.ThumbRX),
				RY:             normThumb(st.Gamepad.ThumbRY),
				LT:             math.Round((float64(st.Gamepad.LeftTrigger)/255.0)*1000) / 1000,
				RT:             math.Round((float64(st.Gamepad.RightTrigger)/255.0)*1000) / 1000,
				Buttons:        uint32(st.Gamepad.Buttons),
				PressedNames:   decodeXInputButtons(st.Gamepad.Buttons),
			})
		}
	}
	hidList := scanSonyAndHIDGamepadsCached()
	controllers = append(controllers, hidList...)
	return controllers
}

func applyNativeGamepadRumble(index int, left, right uint8, durationMs int) map[string]interface{} {
	if durationMs < 80 {
		durationMs = 80
	}
	if durationMs > 4000 {
		durationMs = 4000
	}
	applied := false
	// 1. Try XInput controller rumble
	if index >= 0 && index < 4 {
		vib := xinputVibration{
			LeftMotorSpeed:  uint16(left) * 257,
			RightMotorSpeed: uint16(right) * 257,
		}
		if xinputSetStateCall(uint32(index), &vib) == 0 {
			applied = true
			go func(idx uint32, dur int) {
				defer func() { _ = recover() }()
				time.Sleep(time.Duration(dur) * time.Millisecond)
				zero := xinputVibration{}
				xinputSetStateCall(idx, &zero)
			}(uint32(index), durationMs)
		}
	}
	// 2. Also send Sony DS4/DualSense HID rumble report if a Sony controller HID interface is accessible
	if sendSonyHIDOutputReport(left, right, gamepadLastR, gamepadLastG, gamepadLastB) {
		applied = true
		go func(dur int) {
			defer func() { _ = recover() }()
			time.Sleep(time.Duration(dur) * time.Millisecond)
			sendSonyHIDOutputReport(0, 0, gamepadLastR, gamepadLastG, gamepadLastB)
		}(durationMs)
	}
	return map[string]interface{}{
		"ok":          true,
		"applied_hw":  applied,
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

	hwOK := sendSonyHIDOutputReport(0, 0, sr, sg, sb)
	return map[string]interface{}{
		"ok":         true,
		"applied_hw": hwOK,
		"rgb":        []uint8{sr, sg, sb},
	}
}

// sendSonyHIDOutputReport attempts to write a standard USB DS4 (0x05) or DualSense (0x02) HID output report
// for RGB lightbar + rumble to any connected Sony controller. Never crashes or blocks.
func sendSonyHIDOutputReport(rumbleLeft, rumbleRight, r, g, b uint8) bool {
	// Best-effort over Win32 HID CreateFileW on detected Sony device paths
	controllers := scanSonyAndHIDGamepadsCached()
	for _, c := range controllers {
		if c.Kind != "ds4" && c.Kind != "dualsense" {
			continue
		}
		if c.HIDPath == "" {
			continue
		}
		devPath := `\\?\` + strings.ReplaceAll(c.HIDPath, `\`, `#`) + `#{4d1e55b2-f16f-11cf-88cb-001111000030}`
		p16, err := syscall.UTF16PtrFromString(devPath)
		if err != nil {
			continue
		}
		h, err := syscall.CreateFile(p16, syscall.GENERIC_WRITE, syscall.FILE_SHARE_READ|syscall.FILE_SHARE_WRITE, nil, syscall.OPEN_EXISTING, 0, 0)
		if err != nil || h == syscall.InvalidHandle {
			continue
		}
		var report []byte
		if c.Kind == "ds4" {
			// Standard USB DualShock 4 Output Report (Report ID 0x05, 32 bytes)
			report = make([]byte, 32)
			report[0] = 0x05
			report[1] = 0xFF // enable rumble + lightbar + flash
			report[4] = rumbleRight
			report[5] = rumbleLeft
			report[6] = r
			report[7] = g
			report[8] = b
		} else {
			// Standard USB DualSense Output Report (Report ID 0x02, 48 bytes)
			report = make([]byte, 48)
			report[0] = 0x02
			report[1] = 0x03 // enable rumble
			report[2] = 0x04 // enable lightbar
			report[3] = rumbleRight
			report[4] = rumbleLeft
			report[45] = r
			report[46] = g
			report[47] = b
		}
		var written uint32
		ok, _, _ := procWriteFileGP.Call(uintptr(h), uintptr(unsafe.Pointer(&report[0])), uintptr(len(report)), uintptr(unsafe.Pointer(&written)), 0)
		_ = syscall.CloseHandle(h)
		if ok != 0 {
			return true
		}
	}
	return false
}

// Win32 SendInput structs for mouse/keyboard emulation mode
type winMouseInput struct {
	Type uint32
	_    uint32
	Dx   int32
	Dy   int32
	Data uint32
	Flags uint32
	Time uint32
	_    uint32
	Extra uintptr
}

func sendWinMouseMove(dx, dy int32) {
	if dx == 0 && dy == 0 {
		return
	}
	inp := winMouseInput{Type: 0, Dx: dx, Dy: dy, Flags: 0x0001} // MOUSEEVENTF_MOVE
	_, _, _ = procSendInputGP.Call(1, uintptr(unsafe.Pointer(&inp)), unsafe.Sizeof(inp))
}

func sendWinMouseClick(flags uint32) {
	inp := winMouseInput{Type: 0, Flags: flags}
	_, _, _ = procSendInputGP.Call(1, uintptr(unsafe.Pointer(&inp)), unsafe.Sizeof(inp))
}

func setGamepadEmulationMode(enabled bool) map[string]interface{} {
	ensureGamepadStoreLoaded()
	gamepadMu.Lock()
	gamepadStore.EmulationActive = enabled
	if gamepadEmuStop != nil {
		close(gamepadEmuStop)
		gamepadEmuStop = nil
	}
	var stopCh chan struct{}
	if enabled {
		stopCh = make(chan struct{})
		gamepadEmuStop = stopCh
	}
	saveGamepadStoreLocked()
	gamepadMu.Unlock()

	if enabled && stopCh != nil {
		go runWinGamepadEmulationLoop(stopCh)
	}
	return getGamepadStudioSnapshot()
}

func runWinGamepadEmulationLoop(stopCh <-chan struct{}) {
	defer func() { _ = recover() }()
	var prevButtons uint16
	for {
		prof := getActiveGamepadProfile()
		hz := prof.PollingRateHz
		if hz < 60 {
			hz = 125
		}
		if hz > 1000 {
			hz = 1000
		}
		interval := time.Second / time.Duration(hz)
		if interval < 4*time.Millisecond {
			interval = 4 * time.Millisecond
		}
		select {
		case <-stopCh:
			return
		case <-time.After(interval):
		}

		var st xinputState
		if xinputGetStateCall(0, &st) != 0 {
			continue
		}
		rx := applyStickCurve(normThumb(st.Gamepad.ThumbRX), prof.RightDeadzone, prof.AntiDeadzone, prof.StickCurve)
		ry := applyStickCurve(normThumb(st.Gamepad.ThumbRY), prof.RightDeadzone, prof.AntiDeadzone, prof.StickCurve)
		if prof.InvertY {
			ry = -ry
		}
		if rx != 0 || ry != 0 {
			speed := 14.0 * prof.MouseSensitivity
			sendWinMouseMove(int32(rx*speed), int32(-ry*speed))
		}
		// Left stick scroll wheel
		ly := applyStickCurve(normThumb(st.Gamepad.ThumbLY), prof.LeftDeadzone, 0, "linear")
		if math.Abs(ly) > 0.35 {
			inp := winMouseInput{Type: 0, Data: uint32(int32(ly * 40)), Flags: 0x0800} // MOUSEEVENTF_WHEEL
			_, _, _ = procSendInputGP.Call(1, uintptr(unsafe.Pointer(&inp)), unsafe.Sizeof(inp))
		}
		// A -> LMB, B -> RMB
		cur := st.Gamepad.Buttons
		if (cur&0x1000) != 0 && (prevButtons&0x1000) == 0 {
			sendWinMouseClick(0x0002) // LEFTDOWN
		} else if (cur&0x1000) == 0 && (prevButtons&0x1000) != 0 {
			sendWinMouseClick(0x0004) // LEFTUP
		}
		if (cur&0x2000) != 0 && (prevButtons&0x2000) == 0 {
			sendWinMouseClick(0x0008) // RIGHTDOWN
		} else if (cur&0x2000) == 0 && (prevButtons&0x2000) != 0 {
			sendWinMouseClick(0x0010) // RIGHTUP
		}
		prevButtons = cur
	}
}
