package main

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"
)

// ==================== LUMA OS 1.7.4 — MIRACAST WIRELESS SECOND SCREEN ====================

type MiracastStatusInfo struct {
	OK                       bool   `json:"ok"`
	WifiAvailable            bool   `json:"wifi_available"`
	MiracastSupported        bool   `json:"miracast_supported"`
	WirelessDisplayInstalled bool   `json:"wireless_display_installed"`
	AdapterName              string `json:"adapter_name"`
	ActiveDisplayMode        string `json:"active_display_mode"`
	Message                  string `json:"message"`
	Error                    string `json:"error,omitempty"`
}

type MiracastActionResult struct {
	OK                 bool   `json:"ok"`
	Action             string `json:"action"`
	Message            string `json:"message"`
	MissingComponent   bool   `json:"missing_component,omitempty"`
	NoWifiMiracast     bool   `json:"no_wifi_miracast,omitempty"`
	InstallSettingsURI string `json:"install_settings_uri,omitempty"`
	ActiveDisplayMode  string `json:"active_display_mode,omitempty"`
	Error              string `json:"error,omitempty"`
}

var (
	miracastMu         sync.Mutex
	miracastLastMode   = "extend"
	miracastStatusCache MiracastStatusInfo
	miracastStatusTime  time.Time
)

func registerMiracast174Routes(mux *http.ServeMux) {
	// 1. Check Wi-Fi Miracast capability & Wireless Display optional feature installation
	mux.HandleFunc("/api/kernel/miracast/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		forceRefresh := r.URL.Query().Get("refresh") == "1"

		miracastMu.Lock()
		if !forceRefresh && time.Since(miracastStatusTime) < 20*time.Second && miracastStatusCache.OK {
			cached := miracastStatusCache
			cached.ActiveDisplayMode = miracastLastMode
			miracastMu.Unlock()
			_ = json.NewEncoder(w).Encode(cached)
			return
		}
		modeNow := miracastLastMode
		miracastMu.Unlock()

		st := probeMiracastStatusNative(modeNow)
		miracastMu.Lock()
		miracastStatusCache = st
		miracastStatusTime = time.Now()
		miracastMu.Unlock()
		_ = json.NewEncoder(w).Encode(st)
	})

	// 2. Source Mode («Транслировать на другой экран»): Windows Cast (ms-settings-connectabledevices:devicediscovery / Win+K)
	mux.HandleFunc("/api/kernel/miracast/cast", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		res := openWindowsCastNative()
		_ = json.NewEncoder(w).Encode(res)
	})

	// 3. Receiver Mode («Сделать этот ПК экраном»): Microsoft.PPIProjection Wireless Display app + install check
	mux.HandleFunc("/api/kernel/miracast/receive", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		res := startWirelessDisplayReceiverNative()
		_ = json.NewEncoder(w).Encode(res)
	})

	// 4. Open Windows Projection Settings (ms-settings:project) when Wireless Display optional feature needs installation
	mux.HandleFunc("/api/kernel/miracast/open-project-settings", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		res := openProjectionSettingsNative()
		_ = json.NewEncoder(w).Encode(res)
	})

	// 5. Display Projection Mode Switcher (DisplaySwitch.exe /clone | /extend | /internal | /external)
	mux.HandleFunc("/api/kernel/miracast/display-mode", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Mode string `json:"mode"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(MiracastActionResult{
				OK:      false,
				Action:  "display_mode",
				Message: "Неверный формат запроса режима экрана.",
				Error:   err.Error(),
			})
			return
		}
		mode := strings.ToLower(strings.TrimSpace(req.Mode))
		res := switchDisplayProjectionModeNative(mode)
		if res.OK && res.ActiveDisplayMode != "" {
			miracastMu.Lock()
			miracastLastMode = res.ActiveDisplayMode
			miracastMu.Unlock()
		}
		_ = json.NewEncoder(w).Encode(res)
	})
}
