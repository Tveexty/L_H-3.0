package main

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"
)

// ==================== LUMA OS 1.6.6: NATIVE ALWAYS-ON-TOP DYNAMIC ISLAND OVERLAY ====================
// Platform-independent configuration, live state sync, and REST API endpoints for the pinned
// Win32 HWND_TOPMOST Dynamic Island capsule floating above Chrome and all Windows applications.

type IslandOverlayConfig struct {
	Enabled               bool   `json:"enabled"`
	PinOverAllWindows     bool   `json:"pin_over_all_windows"`
	AlwaysShowOverLuma    bool   `json:"always_show_over_luma"`
	ShowInFullscreenApps  bool   `json:"show_in_fullscreen_apps"`
	ClickThrough          bool   `json:"click_through"`
	Locked                bool   `json:"locked"`
	Position              string `json:"position"` // top-center, top-left, top-right, bottom-center, bottom-left, bottom-right
	OffsetX               int    `json:"offset_x"`
	OffsetY               int    `json:"offset_y"`
	Size                  string `json:"size"`       // compact, standard, expanded
	Style                 string `json:"style"`      // obsidian, cryo, frosted, oled
	Opacity               int    `json:"opacity"`    // 55..100
	AccentHex             string `json:"accent_hex"` // e.g. "#38bdf8"
	GlowEnabled           bool   `json:"glow_enabled"`
	HoverExpand           bool   `json:"hover_expand"`
	ShowClock             bool   `json:"show_clock"`
	ShowTelemetry         bool   `json:"show_telemetry"`
	ShowBattery           bool   `json:"show_battery"`
	ShowWeather           bool   `json:"show_weather"`
	ShowMedia             bool   `json:"show_media"`
	ShowNotifications     bool   `json:"show_notifications"`
	ShowDownloads         bool   `json:"show_downloads"`
	DndEnabled            bool   `json:"dnd_enabled"`
}

type IslandOverlayLiveState struct {
	TrackTitle      string  `json:"track_title"`
	TrackArtist     string  `json:"track_artist"`
	MediaPlaying    bool    `json:"media_playing"`
	TimerText       string  `json:"timer_text"`
	WeatherText     string  `json:"weather_text"`
	CpuPercent      int     `json:"cpu_percent"`
	RamPercent      int     `json:"ram_percent"`
	BatteryPercent  int     `json:"battery_percent"`
	BatteryCharging bool    `json:"battery_charging"`
	DownloadLabel   string  `json:"download_label"`
	DownloadPercent int     `json:"download_percent"`
	UnreadCount     int     `json:"unread_count"`
	PulseTitle      string  `json:"pulse_title"`
	PulseDetail     string  `json:"pulse_detail"`
	PulseKind       string  `json:"pulse_kind"`
	PulseBarPct     int     `json:"pulse_bar_pct"` // -1 when hidden
	PulseUntilUnix  int64   `json:"pulse_until_unix"`
	AccentHex       string  `json:"accent_hex"`
	UpdatedAt       int64   `json:"updated_at"`
}

var (
	islandOverlayMu    sync.RWMutex
	islandOverlayCfg   = defaultIslandOverlayConfig()
	islandOverlayState = IslandOverlayLiveState{
		PulseBarPct: -1,
		AccentHex:   "#38bdf8",
	}
)

func defaultIslandOverlayConfig() IslandOverlayConfig {
	return IslandOverlayConfig{
		Enabled:              false,
		PinOverAllWindows:    true,
		AlwaysShowOverLuma:   false,
		ShowInFullscreenApps: false,
		ClickThrough:         false,
		Locked:               true,
		Position:             "top-center",
		OffsetX:              0,
		OffsetY:              10,
		Size:                 "standard",
		Style:                "obsidian",
		Opacity:              94,
		AccentHex:            "#38bdf8",
		GlowEnabled:          true,
		HoverExpand:          true,
		ShowClock:            true,
		ShowTelemetry:        true,
		ShowBattery:          true,
		ShowWeather:          false,
		ShowMedia:            true,
		ShowNotifications:    true,
		ShowDownloads:        true,
		DndEnabled:           false,
	}
}

func normalizeIslandPosition(pos string) string {
	switch strings.ToLower(strings.TrimSpace(pos)) {
	case "top", "top-center":
		return "top-center"
	case "top-left":
		return "top-left"
	case "top-right":
		return "top-right"
	case "bottom", "bottom-center":
		return "bottom-center"
	case "bottom-left":
		return "bottom-left"
	case "bottom-right":
		return "bottom-right"
	default:
		return "top-center"
	}
}

func normalizeIslandSize(sz string) string {
	switch strings.ToLower(strings.TrimSpace(sz)) {
	case "compact", "standard", "expanded":
		return strings.ToLower(strings.TrimSpace(sz))
	default:
		return "standard"
	}
}

func normalizeIslandStyle(st string) string {
	switch strings.ToLower(strings.TrimSpace(st)) {
	case "obsidian", "cryo", "frosted", "oled":
		return strings.ToLower(strings.TrimSpace(st))
	default:
		return "obsidian"
	}
}

func getIslandOverlayConfigSnapshot() IslandOverlayConfig {
	islandOverlayMu.RLock()
	defer islandOverlayMu.RUnlock()
	return islandOverlayCfg
}

func getIslandOverlayStateSnapshot() IslandOverlayLiveState {
	islandOverlayMu.RLock()
	defer islandOverlayMu.RUnlock()
	return islandOverlayState
}

func updateIslandOverlayConfig(next IslandOverlayConfig) IslandOverlayConfig {
	next.Position = normalizeIslandPosition(next.Position)
	next.Size = normalizeIslandSize(next.Size)
	next.Style = normalizeIslandStyle(next.Style)
	if next.Opacity < 55 {
		next.Opacity = 55
	}
	if next.Opacity > 100 {
		next.Opacity = 100
	}
	if next.OffsetY < 0 {
		next.OffsetY = 0
	}
	if next.OffsetY > 96 {
		next.OffsetY = 96
	}
	if next.OffsetX < -600 {
		next.OffsetX = -600
	}
	if next.OffsetX > 600 {
		next.OffsetX = 600
	}
	if !strings.HasPrefix(next.AccentHex, "#") || (len(next.AccentHex) != 7 && len(next.AccentHex) != 4) {
		next.AccentHex = "#38bdf8"
	}

	islandOverlayMu.Lock()
	islandOverlayCfg = next
	islandOverlayMu.Unlock()

	applyNativeIslandOverlayConfig(next)
	return next
}

func updateIslandOverlayLiveState(st IslandOverlayLiveState) {
	islandOverlayMu.Lock()
	prevPulseTitle := islandOverlayState.PulseTitle
	prevPulseDetail := islandOverlayState.PulseDetail
	prevPulseKind := islandOverlayState.PulseKind
	prevPulseBar := islandOverlayState.PulseBarPct
	prevPulseUntil := islandOverlayState.PulseUntilUnix
	if st.PulseTitle == "" && prevPulseUntil > time.Now().UnixMilli() {
		st.PulseTitle = prevPulseTitle
		st.PulseDetail = prevPulseDetail
		st.PulseKind = prevPulseKind
		st.PulseBarPct = prevPulseBar
		st.PulseUntilUnix = prevPulseUntil
	}
	if st.AccentHex == "" {
		st.AccentHex = islandOverlayCfg.AccentHex
	}
	st.UpdatedAt = time.Now().UnixMilli()
	islandOverlayState = st
	islandOverlayMu.Unlock()

	notifyNativeIslandOverlayRedraw()
}

func triggerNativeIslandPulse(title, detail, kind string, barPct int, durationMs int) {
	if durationMs <= 0 {
		durationMs = 3600
	}
	islandOverlayMu.Lock()
	islandOverlayState.PulseTitle = title
	islandOverlayState.PulseDetail = detail
	islandOverlayState.PulseKind = kind
	islandOverlayState.PulseBarPct = barPct
	islandOverlayState.PulseUntilUnix = time.Now().Add(time.Duration(durationMs) * time.Millisecond).UnixMilli()
	islandOverlayMu.Unlock()

	notifyNativeIslandOverlayRedraw()
}

func registerIslandOverlayRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/kernel/island/overlay/config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method == http.MethodPost {
			cfg := getIslandOverlayConfigSnapshot()
			if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
				return
			}
			saved := updateIslandOverlayConfig(cfg)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"ok":            true,
				"native_active": isNativeIslandOverlayActive(),
				"config":        saved,
			})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":            true,
			"native_active": isNativeIslandOverlayActive(),
			"config":        getIslandOverlayConfigSnapshot(),
		})
	})

	mux.HandleFunc("/api/kernel/island/overlay/state", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method == http.MethodPost {
			var st IslandOverlayLiveState
			st.PulseBarPct = -1
			if err := json.NewDecoder(r.Body).Decode(&st); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
				return
			}
			updateIslandOverlayLiveState(st)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"ok":            true,
				"native_active": isNativeIslandOverlayActive(),
			})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":            true,
			"native_active": isNativeIslandOverlayActive(),
			"state":         getIslandOverlayStateSnapshot(),
		})
	})

	mux.HandleFunc("/api/kernel/island/overlay/pulse", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var req struct {
			Title      string `json:"title"`
			Detail     string `json:"detail"`
			Kind       string `json:"kind"`
			BarPct     *int   `json:"bar_pct"`
			DurationMs int    `json:"duration_ms"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		bar := -1
		if req.BarPct != nil {
			bar = *req.BarPct
		}
		if req.Title == "" {
			req.Title = "Luma Island"
		}
		triggerNativeIslandPulse(req.Title, req.Detail, req.Kind, bar, req.DurationMs)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":            true,
			"native_active": isNativeIslandOverlayActive(),
		})
	})
}
