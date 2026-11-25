package main

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"time"
)

// ==================== LUMA OS 1.6.2b: 100% NATIVE WI-FI & BLUETOOTH CONNECTIVITY API ====================
// Pure Luma OS Wi-Fi network scanning, password-protected WPA2/WPA3/Open connection, radio toggle,
// and Bluetooth device listing / pairing / connection — ZERO Windows Settings (ms-settings:) popups!

type WifiNetworkItem struct {
	SSID      string `json:"ssid"`
	Signal    int    `json:"signal"`
	Secured   bool   `json:"secured"`
	Auth      string `json:"auth"`
	Band      string `json:"band"`
	Connected bool   `json:"connected"`
	Saved     bool   `json:"saved"`
	BSSID     string `json:"bssid,omitempty"`
}

type WifiStatusSnapshot struct {
	OK            bool              `json:"ok"`
	Available     bool              `json:"available"`
	Enabled       bool              `json:"enabled"`
	Connected     bool              `json:"connected"`
	ActiveSSID    string            `json:"active_ssid"`
	InterfaceName string            `json:"interface_name"`
	Signal        int               `json:"signal"`
	IPAddress     string            `json:"ip_address,omitempty"`
	Networks      []WifiNetworkItem `json:"networks"`
	Error         string            `json:"error,omitempty"`
	UpdatedAt     string            `json:"updated_at"`
}

type WifiConnectRequest struct {
	SSID       string `json:"ssid"`
	Password   string `json:"password"`
	Disconnect bool   `json:"disconnect"`
}

type WifiConnectResult struct {
	OK            bool               `json:"ok"`
	Connected     bool               `json:"connected"`
	NeedsPassword bool               `json:"needs_password,omitempty"`
	Message       string             `json:"message"`
	Error         string             `json:"error,omitempty"`
	Status        WifiStatusSnapshot `json:"status"`
}

type BluetoothConnectRequest struct {
	Name       string `json:"name"`
	InstanceID string `json:"instance_id"`
	Action     string `json:"action"` // connect | disconnect | pair
	PIN        string `json:"pin"`
}

type BluetoothConnectResult struct {
	OK        bool            `json:"ok"`
	NeedsPIN  bool            `json:"needs_pin,omitempty"`
	Message   string          `json:"message"`
	Error     string          `json:"error,omitempty"`
	Status    BluetoothStatus `json:"status"`
}

func sortWifiNetworks(nets []WifiNetworkItem) []WifiNetworkItem {
	if nets == nil {
		return []WifiNetworkItem{}
	}
	sort.SliceStable(nets, func(i, j int) bool {
		if nets[i].Connected != nets[j].Connected {
			return nets[i].Connected
		}
		if nets[i].Saved != nets[j].Saved {
			return nets[i].Saved
		}
		if nets[i].Signal != nets[j].Signal {
			return nets[i].Signal > nets[j].Signal
		}
		return strings.ToLower(nets[i].SSID) < strings.ToLower(nets[j].SSID)
	})
	return nets
}

func registerConnectivity162bRoutes(mux *http.ServeMux, kernel *LumaKernel) {
	// 1. Native Wi-Fi Status & Real Available Network Scanner
	mux.HandleFunc("/api/kernel/wifi/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		rescan := r.URL.Query().Get("rescan") == "1" || r.URL.Query().Get("rescan") == "true"
		snap := getWifiStatusNative(rescan)
		snap.Networks = sortWifiNetworks(snap.Networks)
		if snap.UpdatedAt == "" {
			snap.UpdatedAt = time.Now().Format("15:04:05")
		}
		_ = json.NewEncoder(w).Encode(snap)
	})

	// 2. Native Wi-Fi Radio Enable / Disable (ZERO RequestAccessAsync / ZERO ms-settings:)
	mux.HandleFunc("/api/kernel/wifi/toggle", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			snap := getWifiStatusNative(false)
			snap.Networks = sortWifiNetworks(snap.Networks)
			_ = json.NewEncoder(w).Encode(snap)
			return
		}
		var req struct {
			Enabled bool `json:"enabled"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "Некорректный JSON-запрос"})
			return
		}
		snap := setWifiEnabledNative(req.Enabled)
		snap.Networks = sortWifiNetworks(snap.Networks)
		if snap.UpdatedAt == "" {
			snap.UpdatedAt = time.Now().Format("15:04:05")
		}
		_ = json.NewEncoder(w).Encode(snap)
	})

	// 3. Native Wi-Fi Connect / Disconnect with Inline Password Profile Support
	mux.HandleFunc("/api/kernel/wifi/connect", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "method not allowed"})
			return
		}
		var req WifiConnectRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "Некорректный JSON-запрос"})
			return
		}
		req.SSID = strings.TrimSpace(req.SSID)
		if !req.Disconnect && req.SSID == "" {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(WifiConnectResult{
				OK:    false,
				Error: "Не указано имя сети Wi-Fi (SSID)",
			})
			return
		}
		res := connectWifiNative(req)
		res.Status.Networks = sortWifiNetworks(res.Status.Networks)
		if res.Status.UpdatedAt == "" {
			res.Status.UpdatedAt = time.Now().Format("15:04:05")
		}
		_ = json.NewEncoder(w).Encode(res)
	})

	// 4. Native Bluetooth Device List (Enriched, Pure Luma OS)
	mux.HandleFunc("/api/kernel/bluetooth/devices", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var st BluetoothStatus
		if kernel != nil && kernel.probe != nil {
			st = kernel.probe.GetBluetoothStatus()
		}
		if st.Devices == nil {
			st.Devices = []BluetoothDevice{}
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":           true,
			"available":    st.Available,
			"enabled":      st.Enabled,
			"adapter_name": st.AdapterName,
			"devices":      st.Devices,
			"updated_at":   time.Now().Format("15:04:05"),
		})
	})

	// 5. Native Bluetooth Device Connect / Disconnect / Pair (ZERO ms-settings:bluetooth!)
	mux.HandleFunc("/api/kernel/bluetooth/connect", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "method not allowed"})
			return
		}
		var req BluetoothConnectRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "Некорректный JSON-запрос"})
			return
		}
		req.Name = strings.TrimSpace(req.Name)
		req.InstanceID = strings.TrimSpace(req.InstanceID)
		if req.Action == "" {
			req.Action = "connect"
		}
		if req.Name == "" && req.InstanceID == "" {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(BluetoothConnectResult{
				OK:    false,
				Error: "Не указано устройство Bluetooth",
			})
			return
		}
		var probe *platformProbe
		if kernel != nil {
			probe = kernel.probe
		}
		res := connectBluetoothNative(req, probe)
		if res.Status.Devices == nil {
			res.Status.Devices = []BluetoothDevice{}
		}
		_ = json.NewEncoder(w).Encode(res)
	})
}
