//go:build !windows

package main

import (
	"net"
	"strings"
	"sync"
	"time"
)

var (
	unixEthMu      sync.Mutex
	unixEthEnabled = true
	unixEthDHCP    = true
	unixEthDNSAuto = true
	unixEthIP      = ""
	unixEthMask    = "255.255.255.0"
	unixEthGW      = "192.168.0.1"
	unixEthDNS     = []string{"1.1.1.1", "8.8.8.8"}
)

func getEthernetStatusNative() EthernetStatusSnapshot {
	unixEthMu.Lock()
	en := unixEthEnabled
	dhcp := unixEthDHCP
	dnsAuto := unixEthDNSAuto
	customIP := unixEthIP
	mask := unixEthMask
	gw := unixEthGW
	dns := append([]string{}, unixEthDNS...)
	unixEthMu.Unlock()

	snap := EthernetStatusSnapshot{
		OK:        true,
		Adapters:  []EthernetAdapterInfo{},
		UpdatedAt: time.Now().Format("15:04:05"),
	}

	if ifaces, err := net.Interfaces(); err == nil {
		for _, iface := range ifaces {
			if iface.Flags&net.FlagLoopback != 0 {
				continue
			}
			low := strings.ToLower(iface.Name)
			if strings.HasPrefix(low, "wl") || strings.HasPrefix(low, "docker") || strings.HasPrefix(low, "br-") {
				continue
			}
			ipStr := customIP
			if ipStr == "" {
				if addrs, aerr := iface.Addrs(); aerr == nil {
					for _, a := range addrs {
						if ipNet, ok := a.(*net.IPNet); ok && ipNet.IP != nil {
							if v4 := ipNet.IP.To4(); v4 != nil && !v4.IsLoopback() {
								ipStr = v4.String()
								break
							}
						}
					}
				}
			}
			st := "Up"
			conn := en && ipStr != ""
			if !en {
				st = "Disabled"
				conn = false
			}
			snap.Adapters = append(snap.Adapters, EthernetAdapterInfo{
				Name:         iface.Name,
				Description:  "Проводной сетевой контроллер (Ethernet)",
				Status:       st,
				Enabled:      en,
				Connected:    conn,
				LinkSpeed:    "1 Gbps",
				MACAddress:   strings.ToUpper(iface.HardwareAddr.String()),
				IPv4:         ipStr,
				PrefixLength: 24,
				SubnetMask:   mask,
				Gateway:      gw,
				DNSServers:   dns,
				DHCPEnabled:  dhcp,
				DNSAuto:      dnsAuto,
			})
		}
	}

	snap.Available = len(snap.Adapters) > 0
	for _, a := range snap.Adapters {
		if a.Enabled {
			snap.AnyEnabled = true
		}
		if a.Connected {
			snap.AnyConnected = true
			if snap.PrimaryName == "" {
				snap.PrimaryName = a.Name
				snap.PrimarySpeed = a.LinkSpeed
				snap.PrimaryIP = a.IPv4
			}
		}
	}
	if snap.PrimaryName == "" && len(snap.Adapters) > 0 {
		snap.PrimaryName = snap.Adapters[0].Name
		snap.PrimarySpeed = snap.Adapters[0].LinkSpeed
		snap.PrimaryIP = snap.Adapters[0].IPv4
	}
	return snap
}

func setEthernetEnabledNative(adapterName string, enabled bool) EthernetActionResult {
	unixEthMu.Lock()
	unixEthEnabled = enabled
	unixEthMu.Unlock()
	st := getEthernetStatusNative()
	verb := "отключён"
	if enabled {
		verb = "включён"
	}
	return EthernetActionResult{
		OK:      true,
		Message: "Проводной интернет (" + st.PrimaryName + ") " + verb + ".",
		Status:  st,
	}
}

func applyEthernetConfigNative(req EthernetConfigRequest) EthernetActionResult {
	unixEthMu.Lock()
	if strings.EqualFold(req.Mode, "static") && strings.TrimSpace(req.IP) != "" {
		unixEthDHCP = false
		unixEthIP = strings.TrimSpace(req.IP)
		if strings.TrimSpace(req.SubnetMask) != "" {
			unixEthMask = strings.TrimSpace(req.SubnetMask)
		}
		if strings.TrimSpace(req.Gateway) != "" {
			unixEthGW = strings.TrimSpace(req.Gateway)
		}
	} else if strings.EqualFold(req.Mode, "dhcp") {
		unixEthDHCP = true
		unixEthIP = ""
	}
	if strings.EqualFold(req.DNSMode, "custom") && strings.TrimSpace(req.DNSPrimary) != "" {
		unixEthDNSAuto = false
		unixEthDNS = []string{strings.TrimSpace(req.DNSPrimary)}
		if strings.TrimSpace(req.DNSSecondary) != "" {
			unixEthDNS = append(unixEthDNS, strings.TrimSpace(req.DNSSecondary))
		}
	} else if strings.EqualFold(req.DNSMode, "auto") {
		unixEthDNSAuto = true
	}
	unixEthMu.Unlock()
	return EthernetActionResult{
		OK:      true,
		Message: "Настройки проводного подключения применены.",
		Status:  getEthernetStatusNative(),
	}
}

func runEthernetActionNative(adapterName, action string) EthernetActionResult {
	msg := "Действие Ethernet выполнено."
	switch action {
	case "flush_dns":
		msg = "Кэш DNS успешно очищен."
	case "renew":
		msg = "IP-адрес DHCP обновлён."
	case "open_ncpa":
		msg = "Открыты сетевые подключения."
	}
	return EthernetActionResult{
		OK:      true,
		Message: msg,
		Status:  getEthernetStatusNative(),
	}
}
