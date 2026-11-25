//go:build !windows

package main

import (
	"context"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	unixWifiMu      sync.Mutex
	unixWifiEnabled = true
)

func runUnixCmd(timeout time.Duration, name string, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, name, args...)
	out, err := cmd.CombinedOutput()
	return strings.TrimSpace(string(out)), err
}

func getWifiStatusNative(rescan bool) WifiStatusSnapshot {
	unixWifiMu.Lock()
	fallbackEnabled := unixWifiEnabled
	unixWifiMu.Unlock()

	snap := WifiStatusSnapshot{
		OK:        true,
		Available: false,
		Enabled:   fallbackEnabled,
		Networks:  []WifiNetworkItem{},
		UpdatedAt: time.Now().Format("15:04:05"),
	}

	if _, err := exec.LookPath("nmcli"); err != nil {
		return snap
	}

	radioOut, err := runUnixCmd(2*time.Second, "nmcli", "radio", "wifi")
	if err == nil {
		snap.Available = true
		snap.Enabled = strings.EqualFold(strings.TrimSpace(radioOut), "enabled")
	}
	if !snap.Enabled {
		return snap
	}

	if rescan {
		_, _ = runUnixCmd(3*time.Second, "nmcli", "dev", "wifi", "rescan")
	}

	savedMap := map[string]bool{}
	if connOut, err := runUnixCmd(2*time.Second, "nmcli", "-t", "-f", "NAME,TYPE", "connection", "show"); err == nil {
		for _, line := range strings.Split(connOut, "\n") {
			parts := strings.Split(line, ":")
			if len(parts) >= 2 && strings.Contains(parts[1], "wireless") {
				savedMap[parts[0]] = true
			}
		}
	}

	out, err := runUnixCmd(4*time.Second, "nmcli", "-t", "-f", "IN-USE,SSID,SIGNAL,SECURITY,FREQ", "dev", "wifi", "list")
	if err != nil {
		return snap
	}

	seen := map[string]*WifiNetworkItem{}
	for _, line := range strings.Split(out, "\n") {
		if strings.TrimSpace(line) == "" {
			continue
		}
		parts := strings.Split(line, ":")
		if len(parts) < 4 {
			continue
		}
		inUse := strings.TrimSpace(parts[0]) == "*"
		ssid := strings.TrimSpace(parts[1])
		if ssid == "" {
			continue
		}
		sig, _ := strconv.Atoi(strings.TrimSpace(parts[2]))
		sec := strings.TrimSpace(parts[3])
		band := "2.4 GHz"
		if len(parts) >= 5 && strings.Contains(parts[4], "5") {
			band = "5 GHz"
		}
		secured := sec != "" && sec != "--"
		if existing, ok := seen[ssid]; ok {
			if sig > existing.Signal {
				existing.Signal = sig
			}
			if inUse {
				existing.Connected = true
			}
		} else {
			seen[ssid] = &WifiNetworkItem{
				SSID:      ssid,
				Signal:    sig,
				Secured:   secured,
				Auth:      sec,
				Band:      band,
				Connected: inUse,
				Saved:     savedMap[ssid],
			}
		}
		if inUse {
			snap.Connected = true
			snap.ActiveSSID = ssid
			snap.Signal = sig
		}
	}

	for _, item := range seen {
		snap.Networks = append(snap.Networks, *item)
	}
	snap.Networks = sortWifiNetworks(snap.Networks)
	return snap
}

func setWifiEnabledNative(enabled bool) WifiStatusSnapshot {
	unixWifiMu.Lock()
	unixWifiEnabled = enabled
	unixWifiMu.Unlock()

	if _, err := exec.LookPath("nmcli"); err == nil {
		arg := "off"
		if enabled {
			arg = "on"
		}
		_, _ = runUnixCmd(3*time.Second, "nmcli", "radio", "wifi", arg)
	}
	snap := getWifiStatusNative(false)
	snap.Enabled = enabled
	if !enabled {
		snap.Connected = false
		snap.ActiveSSID = ""
	}
	return snap
}

func connectWifiNative(req WifiConnectRequest) WifiConnectResult {
	if _, err := exec.LookPath("nmcli"); err != nil {
		st := getWifiStatusNative(false)
		return WifiConnectResult{
			OK:     false,
			Error:  "Wi-Fi адаптер (nmcli) недоступен в этой среде",
			Status: st,
		}
	}
	if req.Disconnect {
		_, _ = runUnixCmd(3*time.Second, "nmcli", "radio", "wifi", "off")
		_, _ = runUnixCmd(3*time.Second, "nmcli", "radio", "wifi", "on")
		st := getWifiStatusNative(false)
		return WifiConnectResult{OK: true, Connected: false, Message: "Отключено от Wi-Fi", Status: st}
	}
	args := []string{"dev", "wifi", "connect", req.SSID}
	if req.Password != "" {
		args = append(args, "password", req.Password)
	}
	out, err := runUnixCmd(8*time.Second, "nmcli", args...)
	st := getWifiStatusNative(false)
	if err != nil {
		needsPass := req.Password == "" && (strings.Contains(strings.ToLower(out), "secret") || strings.Contains(strings.ToLower(out), "password"))
		return WifiConnectResult{
			OK:            false,
			NeedsPassword: needsPass,
			Error:         "Не удалось подключиться: " + out,
			Status:        st,
		}
	}
	return WifiConnectResult{
		OK:        true,
		Connected: true,
		Message:   "Подключено к " + req.SSID,
		Status:    st,
	}
}

func connectBluetoothNative(req BluetoothConnectRequest, probe *platformProbe) BluetoothConnectResult {
	var st BluetoothStatus
	if probe != nil {
		st = probe.GetBluetoothStatus()
	}
	if _, err := exec.LookPath("bluetoothctl"); err != nil {
		return BluetoothConnectResult{
			OK:      false,
			Error:   "Адаптер Bluetooth недоступен в этой среде",
			Status:  st,
		}
	}
	target := req.InstanceID
	if target == "" {
		target = req.Name
	}
	cmdName := "connect"
	if strings.EqualFold(req.Action, "disconnect") {
		cmdName = "disconnect"
	} else if strings.EqualFold(req.Action, "pair") {
		cmdName = "pair"
	}
	out, err := runUnixCmd(5*time.Second, "bluetoothctl", cmdName, target)
	if probe != nil {
		st = probe.GetBluetoothStatus()
	}
	if err != nil {
		return BluetoothConnectResult{
			OK:     false,
			Error:  "Ошибка Bluetooth: " + out,
			Status: st,
		}
	}
	return BluetoothConnectResult{
		OK:      true,
		Message: "Операция Bluetooth (" + cmdName + ") выполнена для " + req.Name,
		Status:  st,
	}
}
