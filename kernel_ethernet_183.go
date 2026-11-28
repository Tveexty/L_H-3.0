package main

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// ==================== LUMA OS 1.8.3: WIRED ETHERNET CONTROL & SETTINGS API ====================
// Enables / disables wired Ethernet adapters, configures DHCP / Static IPv4 & DNS presets,
// renews DHCP leases, flushes DNS cache, and monitors real link speed & IP configuration.

type EthernetAdapterInfo struct {
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Status       string   `json:"status"` // Up | Disabled | Disconnected
	Enabled      bool     `json:"enabled"`
	Connected    bool     `json:"connected"`
	LinkSpeed    string   `json:"link_speed"`
	MACAddress   string   `json:"mac_address"`
	IPv4         string   `json:"ipv4"`
	PrefixLength int      `json:"prefix_length"`
	SubnetMask   string   `json:"subnet_mask"`
	Gateway      string   `json:"gateway"`
	DNSServers   []string `json:"dns_servers"`
	DHCPEnabled  bool     `json:"dhcp_enabled"`
	DNSAuto      bool     `json:"dns_auto"`
	RxMbps       float64  `json:"rx_mbps"`
	TxMbps       float64  `json:"tx_mbps"`
}

type EthernetStatusSnapshot struct {
	OK           bool                  `json:"ok"`
	Available    bool                  `json:"available"`
	AnyEnabled   bool                  `json:"any_enabled"`
	AnyConnected bool                  `json:"any_connected"`
	PrimaryName  string                `json:"primary_name"`
	PrimarySpeed string                `json:"primary_speed"`
	PrimaryIP    string                `json:"primary_ip"`
	Adapters     []EthernetAdapterInfo `json:"adapters"`
	Error        string                `json:"error,omitempty"`
	UpdatedAt    string                `json:"updated_at"`
}

type EthernetToggleRequest struct {
	Name    string `json:"name"`
	Enabled bool   `json:"enabled"`
}

type EthernetConfigRequest struct {
	Name         string `json:"name"`
	Mode         string `json:"mode"`     // dhcp | static
	IP           string `json:"ip"`       // e.g. 192.168.1.50
	SubnetMask   string `json:"subnet_mask"` // e.g. 255.255.255.0
	Gateway      string `json:"gateway"`  // e.g. 192.168.1.1
	DNSMode      string `json:"dns_mode"` // auto | custom
	DNSPrimary   string `json:"dns_primary"`
	DNSSecondary string `json:"dns_secondary"`
}

type EthernetActionResult struct {
	OK      bool                   `json:"ok"`
	Message string                 `json:"message"`
	Error   string                 `json:"error,omitempty"`
	Status  EthernetStatusSnapshot `json:"status"`
}

func prefixLengthToSubnetMask(prefix int) string {
	if prefix <= 0 || prefix > 32 {
		return "255.255.255.0"
	}
	var mask uint32 = ^uint32(0) << uint(32-prefix)
	return strings.Join([]string{
		itoaQuick(int((mask >> 24) & 0xFF)),
		itoaQuick(int((mask >> 16) & 0xFF)),
		itoaQuick(int((mask >> 8) & 0xFF)),
		itoaQuick(int(mask & 0xFF)),
	}, ".")
}

func itoaQuick(n int) string {
	if n == 0 {
		return "0"
	}
	var buf [12]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}

func registerEthernet183Routes(mux *http.ServeMux) {
	// 1. Live Wired Ethernet adapters & full IP/DNS settings
	mux.HandleFunc("/api/kernel/ethernet/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		st := getEthernetStatusNative()
		if st.Adapters == nil {
			st.Adapters = []EthernetAdapterInfo{}
		}
		if st.UpdatedAt == "" {
			st.UpdatedAt = time.Now().Format("15:04:05")
		}
		_ = json.NewEncoder(w).Encode(st)
	})

	// 2. Enable / Disable wired Ethernet adapter
	mux.HandleFunc("/api/kernel/ethernet/toggle", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req EthernetToggleRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(EthernetActionResult{
				OK:    false,
				Error: "Некорректный JSON-запрос",
			})
			return
		}
		res := setEthernetEnabledNative(strings.TrimSpace(req.Name), req.Enabled)
		if res.Status.Adapters == nil {
			res.Status.Adapters = []EthernetAdapterInfo{}
		}
		_ = json.NewEncoder(w).Encode(res)
	})

	// 3. Configure Ethernet IPv4 (DHCP / Static) & DNS servers
	mux.HandleFunc("/api/kernel/ethernet/config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req EthernetConfigRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(EthernetActionResult{
				OK:    false,
				Error: "Некорректный JSON-запрос настроек Ethernet",
			})
			return
		}
		res := applyEthernetConfigNative(req)
		if res.Status.Adapters == nil {
			res.Status.Adapters = []EthernetAdapterInfo{}
		}
		_ = json.NewEncoder(w).Encode(res)
	})

	// 4. Quick Ethernet actions: renew DHCP, flush DNS, open ncpa.cpl
	mux.HandleFunc("/api/kernel/ethernet/action", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Name   string `json:"name"`
			Action string `json:"action"` // renew | flush_dns | open_ncpa
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(EthernetActionResult{OK: false, Error: err.Error()})
			return
		}
		res := runEthernetActionNative(strings.TrimSpace(req.Name), strings.ToLower(strings.TrimSpace(req.Action)))
		if res.Status.Adapters == nil {
			res.Status.Adapters = []EthernetAdapterInfo{}
		}
		_ = json.NewEncoder(w).Encode(res)
	})
}
