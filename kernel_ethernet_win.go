//go:build windows

package main

import (
	"encoding/json"
	"fmt"
	"net"
	"os/exec"
	"strings"
	"syscall"
	"time"
)

// ==================== LUMA OS 1.8.3: WINDOWS WIRED ETHERNET CONTROL & SETTINGS ====================

type psEthernetRow struct {
	Name        string   `json:"Name"`
	Description string   `json:"Description"`
	Status      string   `json:"Status"`
	AdminStatus string   `json:"AdminStatus"`
	LinkSpeed   string   `json:"LinkSpeed"`
	MAC         string   `json:"MAC"`
	IPv4        string   `json:"IPv4"`
	PrefixLen   int      `json:"PrefixLen"`
	Gateway     string   `json:"Gateway"`
	DNS         []string `json:"DNS"`
	DHCP        bool     `json:"DHCP"`
	DNSAuto     bool     `json:"DNSAuto"`
}

func isLikelyWiredAdapterName(name, desc string) bool {
	combined := strings.ToLower(name + " " + desc)
	exclude := []string{
		"wi-fi", "wifi", "wireless", "802.11", "wlan",
		"bluetooth", "loopback", "isatap", "teredo",
		"hyper-v", "vethernet", "wsl", "vmware", "virtualbox",
		"docker", "tailscale", "wireguard", "zerotier", "radmin", "hamachi",
		"tap-windows", "wintun", "wan miniport", "npcap", "nordlynx",
	}
	for _, bad := range exclude {
		if strings.Contains(combined, bad) {
			return false
		}
	}
	return true
}

func getEthernetStatusNative() EthernetStatusSnapshot {
	snap := EthernetStatusSnapshot{
		OK:        true,
		Adapters:  []EthernetAdapterInfo{},
		UpdatedAt: time.Now().Format("15:04:05"),
	}

	ps := `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$all = Get-NetAdapter -ErrorAction SilentlyContinue
if (-not $all) { '[]'; exit }
$wired = @($all | Where-Object {
  $d = "$($_.Name) $($_.InterfaceDescription)"
  $_.HardwareInterface -eq $true -and
  $d -notmatch 'Wi-Fi|WiFi|Wireless|802\.11|WLAN|Bluetooth|Hyper-V|vEthernet|WSL|VMware|VirtualBox|WireGuard|Wintun|TAP-|Radmin|Hamachi|Tailscale|ZeroTier'
})
if ($wired.Count -eq 0) {
  $wired = @($all | Where-Object {
    $d = "$($_.Name) $($_.InterfaceDescription)"
    ($_.Name -match 'Ethernet|Локальная|Подключение по локальной|LAN' -or $_.InterfaceDescription -match 'Ethernet|GbE|Gigabit|Realtek PCIe|Intel\(R\) Ethernet|LAN|USB.*Ethernet') -and
    $d -notmatch 'Wi-Fi|WiFi|Wireless|802\.11|WLAN|Bluetooth|vEthernet|WSL'
  })
}
$rows = @()
foreach ($a in $wired) {
  $ip = ''
  $prefix = 24
  $gw = ''
  $dhcp = $true
  $dns = @()
  $dnsAuto = $true
  try {
    $ipObj = Get-NetIPAddress -InterfaceIndex $a.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -ne '127.0.0.1' } | Select-Object -First 1
    if ($ipObj) {
      $ip = [string]$ipObj.IPAddress
      $prefix = [int]$ipObj.PrefixLength
    }
    $ipIf = Get-NetIPInterface -InterfaceIndex $a.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($ipIf) {
      $dhcp = ($ipIf.Dhcp -eq 'Enabled')
    }
    $rt = Get-NetRoute -InterfaceIndex $a.ifIndex -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($rt) {
      $gw = [string]$rt.NextHop
    }
    $dnsObj = Get-DnsClientServerAddress -InterfaceIndex $a.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($dnsObj -and $dnsObj.ServerAddresses) {
      $dns = @($dnsObj.ServerAddresses | ForEach-Object { [string]$_ })
    }
    $regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\$($a.InterfaceGuid)"
    if (Test-Path $regPath) {
      $ns = (Get-ItemProperty -Path $regPath -Name NameServer -ErrorAction SilentlyContinue).NameServer
      if ($ns -and $ns.Trim().Length -gt 0) { $dnsAuto = $false }
    }
  } catch {}
  $rows += [PSCustomObject]@{
    Name        = [string]$a.Name
    Description = [string]$a.InterfaceDescription
    Status      = [string]$a.Status
    AdminStatus = [string]$a.AdminStatus
    LinkSpeed   = [string]$a.LinkSpeed
    MAC         = [string]$a.MacAddress
    IPv4        = $ip
    PrefixLen   = $prefix
    Gateway     = $gw
    DNS         = $dns
    DHCP        = $dhcp
    DNSAuto     = $dnsAuto
  }
}
if ($rows.Count -eq 0) { '[]' } else { ConvertTo-Json -InputObject @($rows) -Compress -Depth 4 }
`
	out, err := runHiddenPowerShell(ps)
	if err == nil && strings.TrimSpace(out) != "" {
		trimmed := strings.TrimSpace(out)
		// Strip any leading non-JSON noise
		if idx := strings.IndexAny(trimmed, "[{"); idx >= 0 {
			trimmed = trimmed[idx:]
		}
		var rows []psEthernetRow
		if strings.HasPrefix(trimmed, "[") {
			_ = json.Unmarshal([]byte(trimmed), &rows)
		} else if strings.HasPrefix(trimmed, "{") {
			var single psEthernetRow
			if json.Unmarshal([]byte(trimmed), &single) == nil && single.Name != "" {
				rows = append(rows, single)
			}
		}

		for _, r := range rows {
			if strings.TrimSpace(r.Name) == "" {
				continue
			}
			stLow := strings.ToLower(strings.TrimSpace(r.Status))
			admLow := strings.ToLower(strings.TrimSpace(r.AdminStatus))
			disabled := stLow == "disabled" || admLow == "down" || strings.Contains(stLow, "disabl")
			connected := stLow == "up" && !disabled
			enabled := !disabled

			normStatus := "Disconnected"
			if disabled {
				normStatus = "Disabled"
			} else if connected {
				normStatus = "Up"
			}

			dns := r.DNS
			if dns == nil {
				dns = []string{}
			}
			mask := prefixLengthToSubnetMask(r.PrefixLen)
			snap.Adapters = append(snap.Adapters, EthernetAdapterInfo{
				Name:         r.Name,
				Description:  r.Description,
				Status:       normStatus,
				Enabled:      enabled,
				Connected:    connected,
				LinkSpeed:    r.LinkSpeed,
				MACAddress:   r.MAC,
				IPv4:         r.IPv4,
				PrefixLength: r.PrefixLen,
				SubnetMask:   mask,
				Gateway:      r.Gateway,
				DNSServers:   dns,
				DHCPEnabled:  r.DHCP,
				DNSAuto:      r.DNSAuto,
			})
		}
	}

	// Fallback via Go stdlib net.Interfaces() if PowerShell returned empty
	if len(snap.Adapters) == 0 {
		if ifaces, err2 := net.Interfaces(); err2 == nil {
			for _, iface := range ifaces {
				if iface.Flags&net.FlagLoopback != 0 || !isLikelyWiredAdapterName(iface.Name, "") {
					continue
				}
				ipStr := ""
				if addrs, aerr := iface.Addrs(); aerr == nil {
					for _, a := range addrs {
						if ipNet, ok := a.(*net.IPNet); ok && ipNet.IP != nil {
							if v4 := ipNet.IP.To4(); v4 != nil && !v4.IsLoopback() && !v4.IsLinkLocalUnicast() {
								ipStr = v4.String()
								break
							}
						}
					}
				}
				up := iface.Flags&net.FlagUp != 0
				st := "Disconnected"
				if up {
					st = "Up"
				}
				snap.Adapters = append(snap.Adapters, EthernetAdapterInfo{
					Name:         iface.Name,
					Description:  "Проводной сетевой адаптер",
					Status:       st,
					Enabled:      up,
					Connected:    up && ipStr != "",
					MACAddress:   strings.ToUpper(iface.HardwareAddr.String()),
					IPv4:         ipStr,
					PrefixLength: 24,
					SubnetMask:   "255.255.255.0",
					DNSServers:   []string{},
					DHCPEnabled:  true,
					DNSAuto:      true,
				})
			}
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

func escapePSQuote(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

func runElevatedHiddenPS(psCommand string) error {
	args := fmt.Sprintf(`-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "%s"`, strings.ReplaceAll(psCommand, `"`, `\"`))
	return shellExecuteVerb("runas", "powershell.exe", args)
}

func setEthernetEnabledNative(adapterName string, enabled bool) EthernetActionResult {
	before := getEthernetStatusNative()
	if !before.Available || len(before.Adapters) == 0 {
		return EthernetActionResult{
			OK:      false,
			Error:   "Проводной сетевой адаптер (Ethernet) не найден на этом ПК.",
			Message: "Проводной сетевой адаптер (Ethernet) не найден.",
			Status:  before,
		}
	}

	targets := []string{}
	if adapterName != "" {
		targets = append(targets, adapterName)
	} else {
		for _, a := range before.Adapters {
			targets = append(targets, a.Name)
		}
	}

	psVerb := "Disable-NetAdapter"
	netshAdmin := "disabled"
	actionText := "отключён"
	if enabled {
		psVerb = "Enable-NetAdapter"
		netshAdmin = "enabled"
		actionText = "включён"
	}

	var cmds []string
	for _, t := range targets {
		esc := escapePSQuote(t)
		cmds = append(cmds, fmt.Sprintf(`%s -Name '%s' -Confirm:$false -ErrorAction SilentlyContinue; netsh interface set interface name='%s' admin=%s 2>&1 | Out-Null`, psVerb, esc, esc, netshAdmin))
	}
	script := strings.Join(cmds, "; ")
	_, _ = runHiddenPowerShell(script)
	time.Sleep(850 * time.Millisecond)

	after := getEthernetStatusNative()
	changedOK := false
	for _, a := range after.Adapters {
		if adapterName == "" || strings.EqualFold(a.Name, adapterName) {
			if a.Enabled == enabled {
				changedOK = true
			}
		}
	}

	// If running in Base edition (without Admin rights), auto-escalate once via UAC so it STILL works!
	if !changedOK {
		if err := runElevatedHiddenPS(script); err == nil {
			time.Sleep(1800 * time.Millisecond)
			after = getEthernetStatusNative()
			for _, a := range after.Adapters {
				if adapterName == "" || strings.EqualFold(a.Name, adapterName) {
					if a.Enabled == enabled {
						changedOK = true
					}
				}
			}
		}
	}

	if !changedOK {
		return EthernetActionResult{
			OK:      false,
			Error:   "Для переключения сетевого адаптера Windows требуются права Администратора (подтвердите UAC или используйте Luma OS Pro).",
			Message: "Не удалось изменить состояние Ethernet без прав администратора.",
			Status:  after,
		}
	}

	label := adapterName
	if label == "" {
		label = after.PrimaryName
		if label == "" {
			label = "Ethernet"
		}
	}
	return EthernetActionResult{
		OK:      true,
		Message: fmt.Sprintf("Проводной интернет (%s) %s.", label, actionText),
		Status:  after,
	}
}

func isValidIPv4String(s string) bool {
	ip := net.ParseIP(strings.TrimSpace(s))
	return ip != nil && ip.To4() != nil
}

func applyEthernetConfigNative(req EthernetConfigRequest) EthernetActionResult {
	before := getEthernetStatusNative()
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = before.PrimaryName
	}
	if name == "" {
		return EthernetActionResult{
			OK:     false,
			Error:  "Сетевой адаптер Ethernet не выбран или не обнаружен.",
			Status: before,
		}
	}

	var cmds []string
	escName := escapePSQuote(name)

	mode := strings.ToLower(strings.TrimSpace(req.Mode))
	if mode == "static" {
		if !isValidIPv4String(req.IP) {
			return EthernetActionResult{OK: false, Error: "Укажите корректный IPv4-адрес (например, 192.168.1.50).", Status: before}
		}
		mask := strings.TrimSpace(req.SubnetMask)
		if !isValidIPv4String(mask) {
			mask = "255.255.255.0"
		}
		gw := strings.TrimSpace(req.Gateway)
		if gw != "" && !isValidIPv4String(gw) {
			return EthernetActionResult{OK: false, Error: "Укажите корректный основной шлюз (например, 192.168.1.1).", Status: before}
		}
		if gw != "" {
			cmds = append(cmds, fmt.Sprintf(`netsh interface ip set address name='%s' static %s %s %s 1`, escName, strings.TrimSpace(req.IP), mask, gw))
		} else {
			cmds = append(cmds, fmt.Sprintf(`netsh interface ip set address name='%s' static %s %s`, escName, strings.TrimSpace(req.IP), mask))
		}
	} else if mode == "dhcp" {
		cmds = append(cmds, fmt.Sprintf(`netsh interface ip set address name='%s' dhcp`, escName))
	}

	dnsMode := strings.ToLower(strings.TrimSpace(req.DNSMode))
	if dnsMode == "custom" {
		p1 := strings.TrimSpace(req.DNSPrimary)
		p2 := strings.TrimSpace(req.DNSSecondary)
		if !isValidIPv4String(p1) {
			return EthernetActionResult{OK: false, Error: "Укажите корректный основной DNS (например, 1.1.1.1 или 8.8.8.8).", Status: before}
		}
		cmds = append(cmds, fmt.Sprintf(`netsh interface ip set dns name='%s' static %s primary validate=no`, escName, p1))
		if p2 != "" {
			if !isValidIPv4String(p2) {
				return EthernetActionResult{OK: false, Error: "Укажите корректный запасной DNS.", Status: before}
			}
			cmds = append(cmds, fmt.Sprintf(`netsh interface ip add dns name='%s' %s index=2 validate=no`, escName, p2))
		}
	} else if dnsMode == "auto" {
		cmds = append(cmds, fmt.Sprintf(`netsh interface ip set dns name='%s' dhcp`, escName))
	}

	if len(cmds) == 0 {
		return EthernetActionResult{OK: true, Message: "Изменений не требуется.", Status: before}
	}

	cmds = append(cmds, `ipconfig /flushdns | Out-Null`)
	script := strings.Join(cmds, "; ")
	out, err := runHiddenPowerShell(script)
	outLow := strings.ToLower(out)
	needElevation := err != nil || strings.Contains(outLow, "elevation") || strings.Contains(outLow, "повышение") || strings.Contains(outLow, "доступ запрещен") || strings.Contains(outLow, "access is denied")
	if needElevation {
		if e2 := runElevatedHiddenPS(script); e2 != nil {
			return EthernetActionResult{
				OK:     false,
				Error:  "Для изменения IP/DNS требуются права Администратора.",
				Status: getEthernetStatusNative(),
			}
		}
		time.Sleep(1600 * time.Millisecond)
	} else {
		time.Sleep(700 * time.Millisecond)
	}

	after := getEthernetStatusNative()
	return EthernetActionResult{
		OK:      true,
		Message: fmt.Sprintf("Настройки проводного подключения (%s) успешно применены!", name),
		Status:  after,
	}
}

func runEthernetActionNative(adapterName, action string) EthernetActionResult {
	switch action {
	case "flush_dns":
		cmd := exec.Command("ipconfig", "/flushdns")
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		_ = cmd.Run()
		return EthernetActionResult{
			OK:      true,
			Message: "Кэш DNS Windows успешно очищен!",
			Status:  getEthernetStatusNative(),
		}
	case "renew":
		esc := escapePSQuote(adapterName)
		ps := `ipconfig /release | Out-Null; Start-Sleep -Milliseconds 300; ipconfig /renew | Out-Null`
		if esc != "" {
			ps = fmt.Sprintf(`ipconfig /release '%s' | Out-Null; Start-Sleep -Milliseconds 300; ipconfig /renew '%s' | Out-Null`, esc, esc)
		}
		_, _ = runHiddenPowerShell(ps)
		time.Sleep(600 * time.Millisecond)
		return EthernetActionResult{
			OK:      true,
			Message: "IP-адрес по DHCP успешно обновлён!",
			Status:  getEthernetStatusNative(),
		}
	case "open_ncpa":
		_ = shellExecuteURI("ncpa.cpl", "")
		return EthernetActionResult{
			OK:      true,
			Message: "Открыто окно «Сетевые подключения» Windows.",
			Status:  getEthernetStatusNative(),
		}
	default:
		return EthernetActionResult{
			OK:     false,
			Error:  "Неизвестное действие Ethernet.",
			Status: getEthernetStatusNative(),
		}
	}
}
