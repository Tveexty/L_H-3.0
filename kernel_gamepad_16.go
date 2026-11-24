package main

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// ==================== LUMA OS 1.6 NITROGEN: LUMA GAMEPAD STUDIO (DS4WINDOWS ALTERNATIVE) ====================
// Full native support for DualShock 4, DualSense, Xbox (XInput), and generic HID controllers:
//   - Persistent profiles with stick deadzones, anti-deadzones, response curves, trigger thresholds
//   - RGB Lightbar control (static, battery-sync, rainbow pulse)
//   - Dual-motor vibration / rumble testing (heavy left + light right)
//   - Configurable polling rate (125 / 250 / 500 / 1000 Hz)
//   - Mouse & Keyboard Emulation engine (0% CPU when disabled; active SendInput on Windows when enabled)

type GamepadProfile struct {
	ID                 string            `json:"id"`
	Name               string            `json:"name"`
	Description        string            `json:"description"`
	LeftDeadzone       float64           `json:"left_deadzone"`       // 0.0..0.45
	RightDeadzone      float64           `json:"right_deadzone"`      // 0.0..0.45
	AntiDeadzone       float64           `json:"anti_deadzone"`       // 0.0..0.30
	StickCurve         string            `json:"stick_curve"`         // linear | precision | aggressive | s_curve | quadratic
	TriggerDeadzone    float64           `json:"trigger_deadzone"`    // 0.0..0.40
	TriggerCurve       string            `json:"trigger_curve"`       // linear | hair_trigger | smooth
	LightbarHex        string            `json:"lightbar_hex"`        // #38bdf8
	LightbarMode       string            `json:"lightbar_mode"`       // static | battery | rainbow | off
	LightbarBrightness int               `json:"lightbar_brightness"` // 0..100
	RumbleStrength     int               `json:"rumble_strength"`     // 0..100
	PollingRateHz      int               `json:"polling_rate_hz"`     // 125 | 250 | 500 | 1000
	MouseEmulation     bool              `json:"mouse_emulation"`
	MouseSensitivity   float64           `json:"mouse_sensitivity"`   // 0.2..3.0
	InvertY            bool              `json:"invert_y"`
	Bindings           map[string]string `json:"bindings"` // e.g. "A":"LMB", "B":"RMB", "X":"KEY_SPACE"
	BuiltIn            bool              `json:"built_in,omitempty"`
}

type GamepadControllerState struct {
	Index         int      `json:"index"`
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Kind          string   `json:"kind"`      // ds4 | dualsense | xbox | hid
	Transport     string   `json:"transport"` // XInput | USB HID | Bluetooth HID
	Connected     bool     `json:"connected"`
	BatteryPct    int      `json:"battery_pct"` // -1 if unknown
	VendorID      string   `json:"vendor_id,omitempty"`
	ProductID     string   `json:"product_id,omitempty"`
	HIDPath       string   `json:"hid_path,omitempty"`
	SupportsRGB   bool     `json:"supports_rgb"`
	SupportsRumble bool    `json:"supports_rumble"`
	LX            float64  `json:"lx"` // -1..1
	LY            float64  `json:"ly"` // -1..1
	RX            float64  `json:"rx"` // -1..1
	RY            float64  `json:"ry"` // -1..1
	LT            float64  `json:"lt"` // 0..1
	RT            float64  `json:"rt"` // 0..1
	Buttons       uint32   `json:"buttons"`
	PressedNames  []string `json:"pressed_names"`
}

type GamepadStore struct {
	ActiveProfileID string           `json:"active_profile_id"`
	EmulationActive bool             `json:"emulation_active"`
	Profiles        []GamepadProfile `json:"profiles"`
}

var (
	gamepadMu      sync.RWMutex
	gamepadStore   GamepadStore
	gamepadLoaded  bool
	gamepadLastR   uint8 = 56
	gamepadLastG   uint8 = 189
	gamepadLastB   uint8 = 248
	gamepadEmuStop chan struct{}
)

func defaultGamepadProfiles() []GamepadProfile {
	return []GamepadProfile{
		{
			ID:                 "default_balanced",
			Name:               "Стандарт (Баланс)",
			Description:        "Универсальный профиль для DualSense, DualShock 4 и Xbox с чистой мёртвой зоной 8%",
			LeftDeadzone:       0.08,
			RightDeadzone:      0.08,
			AntiDeadzone:       0.02,
			StickCurve:         "linear",
			TriggerDeadzone:    0.05,
			TriggerCurve:       "linear",
			LightbarHex:        "#38bdf8",
			LightbarMode:       "static",
			LightbarBrightness: 85,
			RumbleStrength:     100,
			PollingRateHz:      500,
			MouseEmulation:     false,
			MouseSensitivity:   1.2,
			Bindings: map[string]string{
				"A": "LMB", "B": "RMB", "X": "KEY_SPACE", "Y": "KEY_ENTER",
				"LB": "BROWSER_BACK", "RB": "MMB", "START": "ALT_TAB", "BACK": "KEY_ESC",
			},
			BuiltIn: true,
		},
		{
			ID:                 "fps_precision",
			Name:               "FPS Киберспорт (1000 Гц)",
			Description:        "Минимальная мёртвая зона 4%, плавная кривая прицеливания и мгновенные hair-триггеры",
			LeftDeadzone:       0.05,
			RightDeadzone:      0.04,
			AntiDeadzone:       0.04,
			StickCurve:         "precision",
			TriggerDeadzone:    0.02,
			TriggerCurve:       "hair_trigger",
			LightbarHex:        "#ef4444",
			LightbarMode:       "static",
			LightbarBrightness: 90,
			RumbleStrength:     35,
			PollingRateHz:      1000,
			MouseEmulation:     false,
			MouseSensitivity:   1.4,
			Bindings: map[string]string{
				"A": "LMB", "B": "RMB", "X": "KEY_R", "Y": "KEY_SPACE",
				"LB": "KEY_Q", "RB": "KEY_E", "START": "KEY_ESC", "BACK": "KEY_TAB",
			},
			BuiltIn: true,
		},
		{
			ID:                 "racing_smooth",
			Name:               "Гонки & Симуляторы",
			Description:        "Плавный S-отклик руления и прогрессивная чувствительность курков газа/тормоза",
			LeftDeadzone:       0.03,
			RightDeadzone:      0.10,
			AntiDeadzone:       0.0,
			StickCurve:         "s_curve",
			TriggerDeadzone:    0.02,
			TriggerCurve:       "smooth",
			LightbarHex:        "#10b981",
			LightbarMode:       "battery",
			LightbarBrightness: 80,
			RumbleStrength:     100,
			PollingRateHz:      500,
			MouseEmulation:     false,
			MouseSensitivity:   1.0,
			Bindings: map[string]string{
				"A": "KEY_SPACE", "B": "KEY_C", "X": "KEY_SHIFT", "Y": "KEY_CTRL",
			},
			BuiltIn: true,
		},
		{
			ID:                 "desktop_couch",
			Name:               "Управление ПК (Мышь + Клавиатура)",
			Description:        "Эмуляция курсора правым стиком, прокрутка левым, ЛКМ/ПКМ и Alt+Tab с дивана",
			LeftDeadzone:       0.12,
			RightDeadzone:      0.08,
			AntiDeadzone:       0.03,
			StickCurve:         "precision",
			TriggerDeadzone:    0.10,
			TriggerCurve:       "linear",
			LightbarHex:        "#a855f7",
			LightbarMode:       "rainbow",
			LightbarBrightness: 75,
			RumbleStrength:     60,
			PollingRateHz:      250,
			MouseEmulation:     true,
			MouseSensitivity:   1.5,
			Bindings: map[string]string{
				"A": "LMB", "B": "RMB", "X": "KEY_SPACE", "Y": "KEY_ENTER",
				"LB": "VOLUME_DOWN", "RB": "VOLUME_UP", "START": "ALT_TAB", "BACK": "KEY_ESC",
			},
			BuiltIn: true,
		},
	}
}

func gamepadStorePath() string {
	cfgDir, err := os.UserConfigDir()
	if err != nil || cfgDir == "" {
		cfgDir = os.TempDir()
	}
	dir := filepath.Join(cfgDir, "LumaOS")
	_ = os.MkdirAll(dir, 0o700)
	return filepath.Join(dir, "gamepad_profiles.json")
}

func ensureGamepadStoreLoaded() {
	gamepadMu.Lock()
	defer gamepadMu.Unlock()
	if gamepadLoaded {
		return
	}
	gamepadStore = GamepadStore{
		ActiveProfileID: "default_balanced",
		EmulationActive: false,
		Profiles:        defaultGamepadProfiles(),
	}
	if raw, err := os.ReadFile(gamepadStorePath()); err == nil {
		var loaded GamepadStore
		if json.Unmarshal(raw, &loaded) == nil && len(loaded.Profiles) > 0 {
			gamepadStore = loaded
		}
	}
	if gamepadStore.ActiveProfileID == "" && len(gamepadStore.Profiles) > 0 {
		gamepadStore.ActiveProfileID = gamepadStore.Profiles[0].ID
	}
	gamepadLoaded = true
}

func saveGamepadStoreLocked() {
	if raw, err := json.MarshalIndent(gamepadStore, "", "  "); err == nil {
		_ = os.WriteFile(gamepadStorePath(), raw, 0o600)
	}
}

func getActiveGamepadProfile() GamepadProfile {
	ensureGamepadStoreLoaded()
	gamepadMu.RLock()
	defer gamepadMu.RUnlock()
	for _, p := range gamepadStore.Profiles {
		if p.ID == gamepadStore.ActiveProfileID {
			return p
		}
	}
	if len(gamepadStore.Profiles) > 0 {
		return gamepadStore.Profiles[0]
	}
	return defaultGamepadProfiles()[0]
}

// applyStickCurve transforms raw stick axis (-1..1) with deadzone, anti-deadzone, and response curve.
func applyStickCurve(raw, deadzone, antiDeadzone float64, curve string) float64 {
	mag := math.Abs(raw)
	if mag <= deadzone {
		return 0
	}
	sign := 1.0
	if raw < 0 {
		sign = -1.0
	}
	norm := (mag - deadzone) / math.Max(0.01, 1.0-deadzone)
	if norm > 1.0 {
		norm = 1.0
	}
	var shaped float64
	switch strings.ToLower(strings.TrimSpace(curve)) {
	case "precision", "quadratic":
		shaped = norm * norm
	case "aggressive":
		shaped = math.Pow(norm, 0.65)
	case "s_curve":
		shaped = norm * norm * (3.0 - 2.0*norm)
	default: // linear
		shaped = norm
	}
	if antiDeadzone > 0 && shaped > 0 {
		shaped = antiDeadzone + shaped*(1.0-antiDeadzone)
	}
	if shaped > 1.0 {
		shaped = 1.0
	}
	return sign * shaped
}

func parseHexRGB(hexStr string) (uint8, uint8, uint8) {
	s := strings.TrimPrefix(strings.TrimSpace(hexStr), "#")
	if len(s) == 3 {
		s = string([]byte{s[0], s[0], s[1], s[1], s[2], s[2]})
	}
	if len(s) != 6 {
		return 56, 189, 248
	}
	var r, g, b uint8
	hexByte := func(hi, lo byte) uint8 {
		val := func(c byte) uint8 {
			switch {
			case c >= '0' && c <= '9':
				return c - '0'
			case c >= 'a' && c <= 'f':
				return c - 'a' + 10
			case c >= 'A' && c <= 'F':
				return c - 'A' + 10
			default:
				return 0
			}
		}
		return (val(hi) << 4) | val(lo)
	}
	r = hexByte(s[0], s[1])
	g = hexByte(s[2], s[3])
	b = hexByte(s[4], s[5])
	return r, g, b
}

func getGamepadStudioSnapshot() map[string]interface{} {
	ensureGamepadStoreLoaded()
	controllers := pollNativeGamepads()
	gamepadMu.RLock()
	activeID := gamepadStore.ActiveProfileID
	emu := gamepadStore.EmulationActive
	profiles := append([]GamepadProfile{}, gamepadStore.Profiles...)
	lr, lg, lb := gamepadLastR, gamepadLastG, gamepadLastB
	gamepadMu.RUnlock()

	activeProf := getActiveGamepadProfile()
	pollHz := activeProf.PollingRateHz
	if pollHz <= 0 {
		pollHz = 500
	}
	latencyMs := math.Round((1000.0/float64(pollHz))*100) / 100

	return map[string]interface{}{
		"ok":                true,
		"controllers":       controllers,
		"connected_count":   len(controllers),
		"active_profile_id": activeID,
		"active_profile":    activeProf,
		"profiles":          profiles,
		"emulation_active":  emu,
		"polling_rate_hz":   pollHz,
		"latency_ms":        latencyMs,
		"lightbar_rgb":      []uint8{lr, lg, lb},
		"timestamp_ms":      time.Now().UnixMilli(),
	}
}

func upsertGamepadProfile(p GamepadProfile, activate bool) map[string]interface{} {
	ensureGamepadStoreLoaded()
	if strings.TrimSpace(p.Name) == "" {
		p.Name = "Мой профиль"
	}
	if strings.TrimSpace(p.ID) == "" {
		p.ID = "prof_" + time.Now().Format("20060102150405")
	}
	if p.PollingRateHz != 125 && p.PollingRateHz != 250 && p.PollingRateHz != 500 && p.PollingRateHz != 1000 {
		p.PollingRateHz = 500
	}
	if p.LeftDeadzone < 0 || p.LeftDeadzone > 0.5 {
		p.LeftDeadzone = 0.08
	}
	if p.RightDeadzone < 0 || p.RightDeadzone > 0.5 {
		p.RightDeadzone = 0.08
	}
	if p.MouseSensitivity <= 0 || p.MouseSensitivity > 5 {
		p.MouseSensitivity = 1.2
	}
	if p.LightbarHex == "" {
		p.LightbarHex = "#38bdf8"
	}
	if p.Bindings == nil {
		p.Bindings = map[string]string{}
	}

	gamepadMu.Lock()
	found := false
	for i := range gamepadStore.Profiles {
		if gamepadStore.Profiles[i].ID == p.ID {
			p.BuiltIn = gamepadStore.Profiles[i].BuiltIn
			gamepadStore.Profiles[i] = p
			found = true
			break
		}
	}
	if !found {
		gamepadStore.Profiles = append(gamepadStore.Profiles, p)
	}
	if activate {
		gamepadStore.ActiveProfileID = p.ID
	}
	saveGamepadStoreLocked()
	gamepadMu.Unlock()

	if activate {
		r, g, b := parseHexRGB(p.LightbarHex)
		_ = applyNativeGamepadLightbar(0, r, g, b, p.LightbarBrightness)
	}
	return getGamepadStudioSnapshot()
}

func deleteGamepadProfile(id string) map[string]interface{} {
	ensureGamepadStoreLoaded()
	gamepadMu.Lock()
	next := make([]GamepadProfile, 0, len(gamepadStore.Profiles))
	for _, p := range gamepadStore.Profiles {
		if p.ID == id && !p.BuiltIn {
			continue
		}
		next = append(next, p)
	}
	gamepadStore.Profiles = next
	if gamepadStore.ActiveProfileID == id && len(next) > 0 {
		gamepadStore.ActiveProfileID = next[0].ID
	}
	saveGamepadStoreLocked()
	gamepadMu.Unlock()
	return getGamepadStudioSnapshot()
}

func selectGamepadProfile(id string) map[string]interface{} {
	ensureGamepadStoreLoaded()
	gamepadMu.Lock()
	for _, p := range gamepadStore.Profiles {
		if p.ID == id {
			gamepadStore.ActiveProfileID = id
			saveGamepadStoreLocked()
			break
		}
	}
	gamepadMu.Unlock()
	prof := getActiveGamepadProfile()
	r, g, b := parseHexRGB(prof.LightbarHex)
	_ = applyNativeGamepadLightbar(0, r, g, b, prof.LightbarBrightness)
	return getGamepadStudioSnapshot()
}
