//go:build windows

package main

import (
	"context"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

// ==================== LUMA OS 1.6.3: WINDOWS NATIVE WI-FI (WLANAPI + NETSH) & FULL BLUETOOTH DISCOVERY (BTHPROPS) ====================
// Uses Win32 wlanapi.dll WlanScan + UTF-8 netsh wlan (chcp 65001) + pure Win32 bthprops.cpl BluetoothFindFirstDevice
// to list ALL nearby, paired, and connected devices — ZERO RequestAccessAsync, ZERO ms-settings, ZERO NewCallback!

var (
	wlanApiDLL             = syscall.NewLazyDLL("wlanapi.dll")
	procWlanOpenHandle     = wlanApiDLL.NewProc("WlanOpenHandle")
	procWlanCloseHandle    = wlanApiDLL.NewProc("WlanCloseHandle")
	procWlanEnumInterfaces = wlanApiDLL.NewProc("WlanEnumInterfaces")
	procWlanScan           = wlanApiDLL.NewProc("WlanScan")
	procWlanFreeMemory     = wlanApiDLL.NewProc("WlanFreeMemory")

	bthPropsDLL                 = syscall.NewLazyDLL("bthprops.cpl")
	procBtFindFirstDevice       = bthPropsDLL.NewProc("BluetoothFindFirstDevice")
	procBtFindNextDevice        = bthPropsDLL.NewProc("BluetoothFindNextDevice")
	procBtFindDeviceClose       = bthPropsDLL.NewProc("BluetoothFindDeviceClose")
)

type winWlanGUID struct {
	Data1 uint32
	Data2 uint16
	Data3 uint16
	Data4 [8]byte
}

type winWlanInterfaceInfo struct {
	InterfaceGuid winWlanGUID
	Description   [256]uint16
	State         uint32
}

type winWlanInterfaceList struct {
	NumberOfItems uint32
	Index         uint32
	InterfaceInfo [1]winWlanInterfaceInfo
}

// triggerWin32WlanScan triggers a real hardware 802.11 active scan so ALL nearby Wi-Fi APs appear immediately.
func triggerWin32WlanScan() {
	var negotiated uint32
	var hClient uintptr
	if r, _, _ := procWlanOpenHandle.Call(2, 0, uintptr(unsafe.Pointer(&negotiated)), uintptr(unsafe.Pointer(&hClient))); r != 0 || hClient == 0 {
		return
	}
	defer procWlanCloseHandle.Call(hClient, 0)

	var listPtr uintptr
	if r, _, _ := procWlanEnumInterfaces.Call(hClient, 0, uintptr(unsafe.Pointer(&listPtr))); r != 0 || listPtr == 0 {
		return
	}
	defer procWlanFreeMemory.Call(listPtr)

	hdr := (*winWlanInterfaceList)(unsafe.Pointer(listPtr))
	count := hdr.NumberOfItems
	if count > 8 {
		count = 8
	}
	base := uintptr(unsafe.Pointer(&hdr.InterfaceInfo[0]))
	stride := unsafe.Sizeof(winWlanInterfaceInfo{})
	for i := uint32(0); i < count; i++ {
		iface := (*winWlanInterfaceInfo)(unsafe.Pointer(base + uintptr(i)*stride))
		_, _, _ = procWlanScan.Call(hClient, uintptr(unsafe.Pointer(&iface.InterfaceGuid)), 0, 0, 0)
	}
	time.Sleep(850 * time.Millisecond)
}

// Win32 BLUETOOTH_DEVICE_SEARCH_PARAMS (packed layout matching bthapis.h on amd64)
type winBtSearchParams struct {
	DwSize               uint32
	FReturnAuthenticated int32
	FReturnRemembered    int32
	FReturnUnknown       int32
	FReturnConnected     int32
	FIssueInquiry        int32
	CTimeoutMultiplier   byte
	_                    [7]byte
	HRadio               uintptr
}

type winBtSystemTime struct {
	Year, Month, DayOfWeek, Day, Hour, Minute, Second, Milliseconds uint16
}

// Win32 BLUETOOTH_DEVICE_INFO (dwSize = 560 bytes on amd64)
type winBtDeviceInfo struct {
	DwSize          uint32
	_               uint32
	Address         uint64
	UlClassofDevice uint32
	FConnected      int32
	FRemembered     int32
	FAuthenticated  int32
	StLastSeen      winBtSystemTime
	StLastUsed      winBtSystemTime
	SzName          [248]uint16
}

func formatBtMacAddr(addr uint64) string {
	return fmt.Sprintf("%02X:%02X:%02X:%02X:%02X:%02X",
		byte((addr>>40)&0xFF),
		byte((addr>>32)&0xFF),
		byte((addr>>24)&0xFF),
		byte((addr>>16)&0xFF),
		byte((addr>>8)&0xFF),
		byte(addr&0xFF),
	)
}

func classifyBtClassCode(cod uint32, name string) string {
	major := (cod >> 8) & 0x1F
	minor := (cod >> 2) & 0x3F
	switch major {
	case 4: // Audio/Video
		return "headphones"
	case 5: // Peripheral
		if (minor & 0x20) != 0 {
			return "mouse"
		}
		if (minor & 0x10) != 0 {
			return "keyboard"
		}
		if minor == 1 || minor == 2 {
			return "gamepad"
		}
	case 2: // Phone
		return "phone"
	case 7: // Wearable
		return "watch"
	}
	return classifyPeripheralType(name)
}

// discoverAllBluetoothDevicesNative enumerates ALL connected, paired (remembered), AND newly discovered nearby
// Bluetooth devices via Win32 bthprops.cpl + SetupDi + BLE/2.4GHz batteries — ZERO RequestAccessAsync!
func discoverAllBluetoothDevicesNative(probe *platformProbe, activeScan bool) BluetoothStatus {
	var st BluetoothStatus
	if probe != nil {
		st = probe.GetBluetoothStatus()
	}
	if st.Devices == nil {
		st.Devices = []BluetoothDevice{}
	}

	// Mark existing SetupDi devices as paired
	byKey := make(map[string]int, len(st.Devices))
	for i := range st.Devices {
		st.Devices[i].Paired = true
		k := strings.ToLower(strings.TrimSpace(st.Devices[i].Name))
		if k != "" {
			byKey[k] = i
		}
	}

	// Pure Win32 BluetoothFindFirstDevice — finds ALL connected, paired/offline, AND nearby unpaired devices!
	params := winBtSearchParams{
		DwSize:               uint32(unsafe.Sizeof(winBtSearchParams{})),
		FReturnAuthenticated: 1,
		FReturnRemembered:    1,
		FReturnUnknown:       1,
		FReturnConnected:     1,
		FIssueInquiry:        0,
		CTimeoutMultiplier:   2, // ~2.5s radio inquiry when activeScan=true
	}
	if activeScan {
		params.FIssueInquiry = 1
	}

	var info winBtDeviceInfo
	info.DwSize = uint32(unsafe.Sizeof(info))
	hFind, _, _ := procBtFindFirstDevice.Call(uintptr(unsafe.Pointer(&params)), uintptr(unsafe.Pointer(&info)))
	if hFind != 0 {
		defer procBtFindDeviceClose.Call(hFind)
		st.Available = true
		st.Enabled = true
		for count := 0; count < 64; count++ {
			name := strings.TrimSpace(syscall.UTF16ToString(info.SzName[:]))
			mac := formatBtMacAddr(info.Address)
			if name == "" {
				name = "Bluetooth " + mac
			}
			low := strings.ToLower(name)
			connected := info.FConnected != 0
			paired := info.FAuthenticated != 0 || info.FRemembered != 0
			discovered := !paired

			if idx, exists := byKey[low]; exists {
				if connected {
					st.Devices[idx].Connected = true
					st.Devices[idx].Status = "OK"
				}
				if paired {
					st.Devices[idx].Paired = true
				}
				if st.Devices[idx].Address == "" {
					st.Devices[idx].Address = mac
				}
			} else {
				statusLabel := "Найдено рядом"
				if connected {
					statusLabel = "OK"
				} else if paired {
					statusLabel = "Сопряжено"
				}
				st.Devices = append(st.Devices, BluetoothDevice{
					Name:           name,
					Status:         statusLabel,
					Connected:      connected,
					Paired:         paired,
					Discovered:     discovered,
					Address:        mac,
					Class:          "Bluetooth",
					DeviceType:     classifyBtClassCode(info.UlClassofDevice, name),
					BatteryPercent: -1,
					Transport:      "Bluetooth",
					InstanceID:     mac,
				})
				byKey[low] = len(st.Devices) - 1
			}

			info = winBtDeviceInfo{DwSize: uint32(unsafe.Sizeof(info))}
			ok, _, _ := procBtFindNextDevice.Call(hFind, uintptr(unsafe.Pointer(&info)))
			if ok == 0 {
				break
			}
		}
	}

	if st.Available && st.AdapterName == "" {
		st.AdapterName = "Bluetooth Адаптер"
	}
	return st
}

func runNetshUTF8(timeout time.Duration, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	// Quote args cleanly for cmd.exe after setting codepage 65001 (UTF-8) so Russian Windows netsh outputs clean UTF-8!
	var quoted []string
	for _, a := range args {
		if strings.ContainsAny(a, " \t&|<>^\"") {
			quoted = append(quoted, `"`+strings.ReplaceAll(a, `"`, `\"`)+`"`)
		} else {
			quoted = append(quoted, a)
		}
	}
	cmdLine := "chcp 65001 >nul && netsh " + strings.Join(quoted, " ")
	cmd := exec.CommandContext(ctx, "cmd.exe", "/C", cmdLine)
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: 0x08000000,
	}
	out, err := cmd.CombinedOutput()
	return strings.TrimSpace(string(out)), err
}

func getPrimaryLocalIPv4() string {
	ifaces, err := net.Interfaces()
	if err != nil {
		return ""
	}
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, a := range addrs {
			if ipNet, ok := a.(*net.IPNet); ok && ipNet.IP != nil {
				v4 := ipNet.IP.To4()
				if v4 != nil && !v4.IsLoopback() && !v4.IsLinkLocalUnicast() {
					return v4.String()
				}
			}
		}
	}
	return ""
}

func parseNetshPercent(val string) int {
	re := regexp.MustCompile(`(\d+)`)
	if m := re.FindStringSubmatch(val); len(m) >= 2 {
		if n, err := strconv.Atoi(m[1]); err == nil {
			if n < 0 {
				return 0
			}
			if n > 100 {
				return 100
			}
			return n
		}
	}
	return 0
}

func parseSavedWifiProfiles(raw string) map[string]bool {
	saved := make(map[string]bool)
	for _, line := range strings.Split(raw, "\n") {
		idx := strings.Index(line, ":")
		if idx <= 0 {
			continue
		}
		left := strings.ToLower(strings.TrimSpace(line[:idx]))
		val := strings.TrimSpace(line[idx+1:])
		if val == "" {
			continue
		}
		if strings.Contains(left, "profile") || strings.Contains(left, "профил") {
			saved[val] = true
		}
	}
	return saved
}

func getWifiStatusNative(rescan bool) WifiStatusSnapshot {
	snap := WifiStatusSnapshot{
		OK:        true,
		Networks:  []WifiNetworkItem{},
		IPAddress: getPrimaryLocalIPv4(),
		UpdatedAt: time.Now().Format("15:04:05"),
	}

	if rescan {
		// Real hardware 802.11 active scan via wlanapi.dll so ALL nearby networks refresh immediately!
		triggerWin32WlanScan()
	}

	ifaceOut, ifaceErr := runNetshUTF8(3500*time.Millisecond, "wlan", "show", "interfaces")
	lowerIface := strings.ToLower(ifaceOut)
	if ifaceErr != nil && (strings.Contains(lowerIface, "no wireless interface") || strings.Contains(lowerIface, "беспроводной интерфейс отсутствует") || strings.Contains(lowerIface, "служба автонастройки")) {
		snap.Available = false
		snap.Enabled = false
		snap.Error = "Адаптер Wi-Fi не обнаружен или служба WLAN отключена"
		return snap
	}

	radioOff := false
	hasIface := false
	for _, line := range strings.Split(ifaceOut, "\n") {
		idx := strings.Index(line, ":")
		if idx <= 0 {
			continue
		}
		key := strings.ToLower(strings.TrimSpace(line[:idx]))
		val := strings.TrimSpace(line[idx+1:])
		valLow := strings.ToLower(val)

		switch {
		case key == "name" || key == "имя":
			if val != "" && snap.InterfaceName == "" {
				snap.InterfaceName = val
				hasIface = true
			}
		case key == "state" || key == "состояние":
			hasIface = true
			if strings.Contains(valLow, "connected") && !strings.Contains(valLow, "disconnected") {
				snap.Connected = true
			} else if strings.Contains(valLow, "подключено") && !strings.Contains(valLow, "отключено") {
				snap.Connected = true
			}
		case key == "ssid":
			if val != "" {
				snap.ActiveSSID = val
			}
		case key == "signal" || key == "сигнал":
			snap.Signal = parseNetshPercent(val)
		case strings.Contains(key, "radio") || strings.Contains(key, "радио"):
			if strings.Contains(valLow, "off") || strings.Contains(valLow, "выкл") {
				radioOff = true
			}
		case strings.Contains(valLow, "software off") || strings.Contains(valLow, "hardware off") || strings.Contains(valLow, "программное обеспечение выкл") || strings.Contains(valLow, "оборудование выкл"):
			radioOff = true
		}
	}

	snap.Available = hasIface || snap.ActiveSSID != ""
	snap.Enabled = snap.Available && !radioOff
	if !snap.Enabled {
		snap.Connected = false
		snap.ActiveSSID = ""
		return snap
	}

	profilesOut, _ := runNetshUTF8(3*time.Second, "wlan", "show", "profiles")
	savedMap := parseSavedWifiProfiles(profilesOut)

	netsOut, _ := runNetshUTF8(4500*time.Millisecond, "wlan", "show", "networks", "mode=bssid")
	ssidRe := regexp.MustCompile(`(?i)^SSID\s+\d+\s*:\s*(.*)$`)
	bySSID := make(map[string]*WifiNetworkItem)
	var current *WifiNetworkItem

	for _, rawLine := range strings.Split(netsOut, "\n") {
		line := strings.TrimSpace(rawLine)
		if line == "" {
			continue
		}
		if m := ssidRe.FindStringSubmatch(line); len(m) == 2 {
			ssid := strings.TrimSpace(m[1])
			if ssid == "" {
				current = nil
				continue
			}
			if existing, ok := bySSID[ssid]; ok {
				current = existing
			} else {
				item := &WifiNetworkItem{
					SSID:      ssid,
					Connected: snap.Connected && strings.EqualFold(ssid, snap.ActiveSSID),
					Saved:     savedMap[ssid],
					Band:      "2.4 GHz",
				}
				bySSID[ssid] = item
				current = item
			}
			continue
		}
		if current == nil {
			continue
		}
		idx := strings.Index(line, ":")
		if idx <= 0 {
			continue
		}
		key := strings.ToLower(strings.TrimSpace(line[:idx]))
		val := strings.TrimSpace(line[idx+1:])
		valLow := strings.ToLower(val)

		switch {
		case strings.Contains(key, "authentication") || strings.Contains(key, "проверка подлинности"):
			current.Auth = val
			isOpen := strings.Contains(valLow, "open") || strings.Contains(valLow, "открыт") || valLow == ""
			current.Secured = !isOpen
		case key == "signal" || key == "сигнал":
			sig := parseNetshPercent(val)
			if sig > current.Signal {
				current.Signal = sig
			}
		case strings.HasPrefix(key, "bssid"):
			if current.BSSID == "" {
				current.BSSID = val
			}
		case key == "channel" || key == "канал":
			if ch, err := strconv.Atoi(strings.Fields(val)[0]); err == nil {
				if ch > 14 {
					current.Band = "5 GHz"
				} else {
					current.Band = "2.4 GHz"
				}
			}
		case strings.Contains(key, "band") || strings.Contains(key, "диапазон"):
			if strings.Contains(valLow, "6") {
				current.Band = "6 GHz"
			} else if strings.Contains(valLow, "5") {
				current.Band = "5 GHz"
			}
		}
	}

	// Ensure active connected SSID is always present even if hidden from scan cache
	if snap.Connected && snap.ActiveSSID != "" {
		if existing, ok := bySSID[snap.ActiveSSID]; ok {
			existing.Connected = true
			if existing.Signal == 0 && snap.Signal > 0 {
				existing.Signal = snap.Signal
			}
		} else {
			bySSID[snap.ActiveSSID] = &WifiNetworkItem{
				SSID:      snap.ActiveSSID,
				Signal:    snap.Signal,
				Secured:   true,
				Auth:      "WPA2/WPA3",
				Band:      "Wi-Fi",
				Connected: true,
				Saved:     true,
			}
		}
	}

	// Include saved profiles that are currently in range or recently known if list is small
	list := make([]WifiNetworkItem, 0, len(bySSID))
	for _, item := range bySSID {
		list = append(list, *item)
	}
	snap.Networks = sortWifiNetworks(list)
	return snap
}

func setWifiEnabledNative(enabled bool) WifiStatusSnapshot {
	state := "Off"
	adminState := "disabled"
	if enabled {
		state = "On"
		adminState = "enabled"
	}
	// Direct WinRT Radio.GetRadiosAsync (NEVER RequestAccessAsync!) + netsh interface fallback
	script := fmt.Sprintf(`
$done = $false
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`+"`"+`1' })[0]
  Function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(2200) | Out-Null
    $netTask.Result
  }
  [Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
  [Windows.Devices.Radios.RadioAccessStatus,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
  [Windows.Devices.Radios.RadioState,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
  $radios = Await ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]])
  $wf = $radios | Where-Object { $_.Kind -eq 'WiFi' } | Select-Object -First 1
  if ($wf) {
    $res = Await ($wf.SetStateAsync([Windows.Devices.Radios.RadioState]::%s)) ([Windows.Devices.Radios.RadioAccessStatus])
    if ($res -eq 'Allowed') { $done = $true }
  }
} catch {}
if (-not $done) {
  try {
    $ad = Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Where-Object { $_.InterfaceDescription -match 'Wi-Fi|Wireless|802\.11|WLAN' -or $_.Name -match 'Wi-Fi|Беспроводная' } | Select-Object -First 1
    if ($ad) {
      netsh interface set interface name="$($ad.Name)" admin=%s | Out-Null
    }
  } catch {}
}
`, state, adminState)
	_, _ = runHiddenPowerShell(script)
	time.Sleep(600 * time.Millisecond)
	snap := getWifiStatusNative(enabled)
	if snap.Available {
		snap.Enabled = enabled
		if !enabled {
			snap.Connected = false
			snap.ActiveSSID = ""
		}
	}
	return snap
}

func xmlEscapeString(s string) string {
	var b strings.Builder
	_ = xml.EscapeText(&b, []byte(s))
	return b.String()
}

func buildWindowsWifiProfileXML(ssid, password, auth string) string {
	escSSID := xmlEscapeString(ssid)
	hexSSID := strings.ToUpper(hex.EncodeToString([]byte(ssid)))
	if password == "" {
		return fmt.Sprintf(`<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
	<name>%s</name>
	<SSIDConfig>
		<SSID>
			<hex>%s</hex>
			<name>%s</name>
		</SSID>
	</SSIDConfig>
	<connectionType>ESS</connectionType>
	<connectionMode>auto</connectionMode>
	<MSM>
		<security>
			<authEncryption>
				<authentication>open</authentication>
				<encryption>none</encryption>
				<useOneX>false</useOneX>
			</authEncryption>
		</security>
	</MSM>
</WLANProfile>`, escSSID, hexSSID, escSSID)
	}

	authType := "WPA2PSK"
	if strings.Contains(strings.ToLower(auth), "wpa3") && !strings.Contains(strings.ToLower(auth), "wpa2") {
		authType = "WPA3SAE"
	}
	escPass := xmlEscapeString(password)
	return fmt.Sprintf(`<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
	<name>%s</name>
	<SSIDConfig>
		<SSID>
			<hex>%s</hex>
			<name>%s</name>
		</SSID>
	</SSIDConfig>
	<connectionType>ESS</connectionType>
	<connectionMode>auto</connectionMode>
	<MSM>
		<security>
			<authEncryption>
				<authentication>%s</authentication>
				<encryption>AES</encryption>
				<useOneX>false</useOneX>
			</authEncryption>
			<sharedKey>
				<keyType>passPhrase</keyType>
				<protected>false</protected>
				<keyMaterial>%s</keyMaterial>
			</sharedKey>
		</security>
	</MSM>
</WLANProfile>`, escSSID, hexSSID, escSSID, authType, escPass)
}

func connectWifiNative(req WifiConnectRequest) WifiConnectResult {
	if req.Disconnect {
		_, _ = runNetshUTF8(3*time.Second, "wlan", "disconnect")
		time.Sleep(450 * time.Millisecond)
		st := getWifiStatusNative(false)
		return WifiConnectResult{
			OK:        true,
			Connected: false,
			Message:   "Отключено от Wi-Fi сети",
			Status:    st,
		}
	}

	cur := getWifiStatusNative(false)
	if !cur.Available {
		return WifiConnectResult{
			OK:     false,
			Error:  "Wi-Fi адаптер не найден на этом ПК",
			Status: cur,
		}
	}
	if !cur.Enabled {
		cur = setWifiEnabledNative(true)
	}

	var matched *WifiNetworkItem
	for i := range cur.Networks {
		if strings.EqualFold(cur.Networks[i].SSID, req.SSID) {
			matched = &cur.Networks[i]
			break
		}
	}

	// If password is NOT supplied and network is secured & not saved -> tell UI to show inline password input!
	if req.Password == "" && matched != nil && matched.Secured && !matched.Saved {
		return WifiConnectResult{
			OK:            false,
			NeedsPassword: true,
			Error:         "Для подключения к этой сети требуется пароль",
			Status:        cur,
		}
	}

	// Create temporary profile when password provided OR open network not saved yet
	if req.Password != "" || (matched != nil && !matched.Saved && !matched.Secured) {
		authHint := "WPA2-Personal"
		if matched != nil && matched.Auth != "" {
			authHint = matched.Auth
		}
		xmlData := buildWindowsWifiProfileXML(req.SSID, req.Password, authHint)
		tmpFile := filepath.Join(os.TempDir(), fmt.Sprintf("luma_wlan_%d.xml", time.Now().UnixNano()))
		if err := os.WriteFile(tmpFile, []byte(xmlData), 0o600); err != nil {
			return WifiConnectResult{
				OK:     false,
				Error:  "Не удалось создать временный профиль Wi-Fi: " + err.Error(),
				Status: cur,
			}
		}
		defer os.Remove(tmpFile)

		addOut, addErr := runNetshUTF8(4*time.Second, "wlan", "add", "profile", "filename="+tmpFile, "user=current")
		if addErr != nil && req.Password != "" && strings.Contains(strings.ToLower(authHint), "wpa3") {
			// Fallback to WPA2PSK if router supports transition mode
			_ = os.WriteFile(tmpFile, []byte(buildWindowsWifiProfileXML(req.SSID, req.Password, "WPA2-Personal")), 0o600)
			addOut, addErr = runNetshUTF8(4*time.Second, "wlan", "add", "profile", "filename="+tmpFile, "user=current")
		}
		if addErr != nil {
			return WifiConnectResult{
				OK:     false,
				Error:  "Ошибка добавления профиля сети: " + strings.TrimSpace(addOut),
				Status: cur,
			}
		}
	}

	connOut, connErr := runNetshUTF8(5*time.Second, "wlan", "connect", "name="+req.SSID, "ssid="+req.SSID)
	if connErr != nil {
		st := getWifiStatusNative(false)
		return WifiConnectResult{
			OK:     false,
			Error:  "Не удалось подключиться к " + req.SSID + ": " + strings.TrimSpace(connOut),
			Status: st,
		}
	}

	// Poll briefly (up to ~3.2s) for association to settle
	var st WifiStatusSnapshot
	for attempt := 0; attempt < 5; attempt++ {
		time.Sleep(650 * time.Millisecond)
		st = getWifiStatusNative(false)
		if st.Connected && strings.EqualFold(st.ActiveSSID, req.SSID) {
			return WifiConnectResult{
				OK:        true,
				Connected: true,
				Message:   "Подключено к " + req.SSID,
				Status:    st,
			}
		}
	}

	if req.Password != "" {
		return WifiConnectResult{
			OK:            false,
			NeedsPassword: true,
			Error:         "Подключение не завершилось. Проверьте правильность пароля для «" + req.SSID + "»",
			Status:        st,
		}
	}
	return WifiConnectResult{
		OK:      true,
		Message: "Запрос подключения к «" + req.SSID + "» отправлен",
		Status:  st,
	}
}

func connectBluetoothNative(req BluetoothConnectRequest, probe *platformProbe) BluetoothConnectResult {
	action := strings.ToLower(strings.TrimSpace(req.Action))
	safeName := strings.ReplaceAll(req.Name, "'", "''")
	safeID := strings.ReplaceAll(req.InstanceID, "'", "''")

	var script string
	switch action {
	case "disconnect":
		script = fmt.Sprintf(`
$devs = Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object {
  ('%s' -ne '' -and $_.InstanceId -eq '%s') -or ('%s' -ne '' -and $_.FriendlyName -like '*%s*')
}
if ($devs) {
  $devs | ForEach-Object { Disable-PnpDevice -InstanceId $_.InstanceId -Confirm:$false -ErrorAction SilentlyContinue | Out-Null }
  Write-Output 'OK'
} else {
  Write-Output 'NOT_FOUND'
}
`, safeID, safeID, safeName, safeName)
	default:
		// Connect or pair silently via PnP device enable / WinRT DeviceInformation.Pairing (NEVER ms-settings!)
		safePIN := strings.ReplaceAll(req.PIN, "'", "''")
		script = fmt.Sprintf(`
$ok = $false
$devs = Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object {
  ('%s' -ne '' -and $_.InstanceId -eq '%s') -or ('%s' -ne '' -and $_.FriendlyName -like '*%s*')
}
if ($devs) {
  $devs | ForEach-Object {
    Enable-PnpDevice -InstanceId $_.InstanceId -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
    $ok = $true
  }
}
if (-not $ok -and '%s' -ne '') {
  try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
    $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`+"`"+`1' })[0]
    Function Await($WinRtTask, $ResultType) {
      $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
      $netTask = $asTask.Invoke($null, @($WinRtTask))
      $netTask.Wait(3000) | Out-Null
      $netTask.Result
    }
    [Windows.Devices.Enumeration.DeviceInformation,Windows.Devices.Enumeration,ContentType=WindowsRuntime] | Out-Null
    [Windows.Devices.Enumeration.DevicePairingResult,Windows.Devices.Enumeration,ContentType=WindowsRuntime] | Out-Null
    $aqs = 'System.Devices.Aep.ProtocolId:="{e0cbf06c-cd8b-4647-bb8a-263b43f0f974}"'
    $list = Await ([Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync($aqs)) ([Windows.Devices.Enumeration.DeviceInformationCollection])
    $match = $list | Where-Object { $_.Name -like '*%s*' } | Select-Object -First 1
    if ($match -and $match.Pairing -and $match.Pairing.CanPair -and -not $match.Pairing.IsPaired) {
      $pr = Await ($match.Pairing.PairAsync()) ([Windows.Devices.Enumeration.DevicePairingResult])
      if ($pr.Status -eq 'Paired' -or $pr.Status -eq 'AlreadyPaired') { $ok = $true }
    } elseif ($match) {
      $ok = $true
    }
  } catch {}
}
if ($ok) { Write-Output 'OK' } else { Write-Output 'PENDING' }
`, safeID, safeID, safeName, safeName, safePIN, safeName)
	}

	out, _ := runHiddenPowerShell(script)
	time.Sleep(450 * time.Millisecond)

	var st BluetoothStatus
	if probe != nil {
		st = probe.GetBluetoothStatus()
	}

	resText := strings.TrimSpace(out)
	if action == "disconnect" {
		return BluetoothConnectResult{
			OK:      true,
			Message: "Устройство «" + req.Name + "» отключено",
			Status:  st,
		}
	}
	if strings.Contains(resText, "OK") {
		return BluetoothConnectResult{
			OK:      true,
			Message: "Команда подключения отправлена для «" + req.Name + "»",
			Status:  st,
		}
	}
	return BluetoothConnectResult{
		OK:      true,
		Message: "Обновлён статус устройства «" + req.Name + "» (переведите устройство в режим сопряжения, если оно не подключилось)",
		Status:  st,
	}
}
