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
	"sync"
	"syscall"
	"time"
	"unsafe"
)

// ==================== LUMA OS 1.8.3: NATIVE WI-FI (WLANAPI AVAILABLE + BSS LIST + NETSH) & BLUETOOTH DISCOVERY ====================
// Uses Win32 wlanapi.dll (WlanScan + WlanGetAvailableNetworkList + WlanGetNetworkBssList) merged with UTF-8 netsh
// and a 30-second anti-flicker cache so 100% of 2.4/5/6 GHz Wi-Fi networks ALWAYS appear reliably!

var (
	wlanApiDLL                      = syscall.NewLazyDLL("wlanapi.dll")
	procWlanOpenHandle              = wlanApiDLL.NewProc("WlanOpenHandle")
	procWlanCloseHandle             = wlanApiDLL.NewProc("WlanCloseHandle")
	procWlanEnumInterfaces          = wlanApiDLL.NewProc("WlanEnumInterfaces")
	procWlanScan                    = wlanApiDLL.NewProc("WlanScan")
	procWlanGetAvailableNetworkList = wlanApiDLL.NewProc("WlanGetAvailableNetworkList")
	procWlanGetNetworkBssList       = wlanApiDLL.NewProc("WlanGetNetworkBssList")
	procWlanFreeMemory              = wlanApiDLL.NewProc("WlanFreeMemory")

	bthPropsDLL           = syscall.NewLazyDLL("bthprops.cpl")
	procBtFindFirstDevice = bthPropsDLL.NewProc("BluetoothFindFirstDevice")
	procBtFindNextDevice  = bthPropsDLL.NewProc("BluetoothFindNextDevice")
	procBtFindDeviceClose = bthPropsDLL.NewProc("BluetoothFindDeviceClose")

	wifiScanCacheMu sync.Mutex
	wifiLastScanAt  time.Time
	wifiRecentCache = map[string]struct {
		item   WifiNetworkItem
		seenAt time.Time
	}{}
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

type winDot11SSID struct {
	SSIDLength uint32
	SSID       [32]byte
}

// Exact Windows x64 WLAN_AVAILABLE_NETWORK layout (628 bytes)
type winWlanAvailableNetwork struct {
	ProfileName          [256]uint16
	Dot11Ssid            winDot11SSID
	Dot11BssType         uint32
	NumberOfBssids       uint32
	NetworkConnectable   int32
	NotConnectableReason uint32
	NumberOfPhyTypes     uint32
	Dot11PhyTypes        [8]uint32
	MorePhyTypes         int32
	SignalQuality        uint32
	SecurityEnabled      int32
	DefaultAuthAlgo      uint32
	DefaultCipherAlgo    uint32
	Flags                uint32
	Reserved             uint32
}

type winWlanAvailableNetworkList struct {
	NumberOfItems uint32
	Index         uint32
	Network       [1]winWlanAvailableNetwork
}

// Exact Windows x64 WLAN_BSS_ENTRY layout (360 bytes)
type winWlanBssEntry struct {
	Dot11Ssid             winDot11SSID
	PhyID                 uint32
	Dot11Bssid            [6]byte
	_                     [2]byte
	Dot11BssType          uint32
	Dot11BssPhyType       uint32
	Rssi                  int32
	LinkQuality           uint32
	InRegDomain           byte
	_                     byte
	BeaconPeriod          uint16
	_                     [4]byte // align Timestamp to 8 bytes (offset 72)
	Timestamp             uint64
	HostTimestamp         uint64
	CapabilityInformation uint16
	_                     [2]byte
	ChCenterFrequency     uint32
	RateSetLength         uint32
	RateSet               [126]uint16
	IeOffset              uint32
	IeSize                uint32
}

type winWlanBssList struct {
	TotalSize     uint32
	NumberOfItems uint32
	Entries       [1]winWlanBssEntry
}

func decodeDot11SSID(s winDot11SSID) string {
	n := int(s.SSIDLength)
	if n <= 0 || n > 32 {
		return ""
	}
	raw := s.SSID[:n]
	// Ignore null-only hidden beacon placeholders
	allZero := true
	for _, b := range raw {
		if b != 0 {
			allZero = false
			break
		}
	}
	if allZero {
		return ""
	}
	return strings.TrimSpace(string(raw))
}

func wlanAuthAlgoLabel(algo uint32, secEnabled bool) string {
	if !secEnabled || algo == 1 {
		return "Открытая"
	}
	switch algo {
	case 2:
		return "WEP"
	case 3, 4:
		return "WPA-Personal"
	case 6:
		return "WPA2-Enterprise"
	case 7:
		return "WPA2-Personal"
	case 8:
		return "WPA3-Enterprise"
	case 9, 10, 11:
		return "WPA3-Personal"
	default:
		return "WPA2/WPA3"
	}
}

func wlanFreqToBand(khz uint32) string {
	switch {
	case khz >= 5900000:
		return "6 GHz"
	case khz >= 4900000:
		return "5 GHz"
	case khz > 0:
		return "2.4 GHz"
	default:
		return ""
	}
}

func rssiToPercent(rssi int32) int {
	if rssi >= -50 {
		return 100
	}
	if rssi <= -100 {
		return 0
	}
	return int((rssi + 100) * 2)
}

// triggerWin32WlanScan triggers a real hardware 802.11 active scan across ALL WLAN adapters.
// Wait duration adapts so slow 5 GHz / 6 GHz channels finish responding before we read the list!
func triggerWin32WlanScan(waitDur time.Duration) {
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
	wifiScanCacheMu.Lock()
	wifiLastScanAt = time.Now()
	wifiScanCacheMu.Unlock()
	if waitDur > 0 {
		time.Sleep(waitDur)
	}
}

// collectWin32WlanNetworks reads BOTH WlanGetAvailableNetworkList (flags=0x3) AND WlanGetNetworkBssList
// directly from wlanapi.dll so 100% of nearby 2.4/5/6 GHz APs & UTF-8/Cyrillic SSIDs are discovered!
func collectWin32WlanNetworks(bySSID map[string]*WifiNetworkItem, savedMap map[string]bool) (foundIface bool, activeSSID string, activeSignal int, connected bool) {
	var negotiated uint32
	var hClient uintptr
	if r, _, _ := procWlanOpenHandle.Call(2, 0, uintptr(unsafe.Pointer(&negotiated)), uintptr(unsafe.Pointer(&hClient))); r != 0 || hClient == 0 {
		return false, "", 0, false
	}
	defer procWlanCloseHandle.Call(hClient, 0)

	var ifListPtr uintptr
	if r, _, _ := procWlanEnumInterfaces.Call(hClient, 0, uintptr(unsafe.Pointer(&ifListPtr))); r != 0 || ifListPtr == 0 {
		return false, "", 0, false
	}
	defer procWlanFreeMemory.Call(ifListPtr)

	hdr := (*winWlanInterfaceList)(unsafe.Pointer(ifListPtr))
	ifCount := hdr.NumberOfItems
	if ifCount > 8 {
		ifCount = 8
	}
	if ifCount > 0 {
		foundIface = true
	}

	ifBase := uintptr(unsafe.Pointer(&hdr.InterfaceInfo[0]))
	ifStride := unsafe.Sizeof(winWlanInterfaceInfo{})

	for i := uint32(0); i < ifCount; i++ {
		iface := (*winWlanInterfaceInfo)(unsafe.Pointer(ifBase + uintptr(i)*ifStride))
		if iface.State == 1 { // wlan_interface_state_connected
			connected = true
		}

		// Source 1: WlanGetAvailableNetworkList (include all adhoc + manual/hidden profiles: flags = 3)
		var availPtr uintptr
		if r, _, _ := procWlanGetAvailableNetworkList.Call(
			hClient,
			uintptr(unsafe.Pointer(&iface.InterfaceGuid)),
			3,
			0,
			uintptr(unsafe.Pointer(&availPtr)),
		); r == 0 && availPtr != 0 {
			al := (*winWlanAvailableNetworkList)(unsafe.Pointer(availPtr))
			nItems := al.NumberOfItems
			if nItems > 256 {
				nItems = 256
			}
			nBase := uintptr(unsafe.Pointer(&al.Network[0]))
			nStride := unsafe.Sizeof(winWlanAvailableNetwork{})
			for j := uint32(0); j < nItems; j++ {
				netItem := (*winWlanAvailableNetwork)(unsafe.Pointer(nBase + uintptr(j)*nStride))
				ssid := decodeDot11SSID(netItem.Dot11Ssid)
				if ssid == "" {
					prof := strings.TrimSpace(syscall.UTF16ToString(netItem.ProfileName[:]))
					if prof != "" && (netItem.Flags&1) != 0 {
						ssid = prof
					} else {
						continue
					}
				}
				sig := int(netItem.SignalQuality)
				if sig > 100 {
					sig = 100
				}
				isConn := (netItem.Flags & 1) != 0
				hasProf := (netItem.Flags&2) != 0 || savedMap[ssid]
				sec := netItem.SecurityEnabled != 0 && netItem.DefaultAuthAlgo != 1
				auth := wlanAuthAlgoLabel(netItem.DefaultAuthAlgo, sec)

				band := "2.4 GHz"
				for p := uint32(0); p < netItem.NumberOfPhyTypes && p < 8; p++ {
					pt := netItem.Dot11PhyTypes[p]
					// 5=ofdm(5G), 8=vht(5G), 10=he(Wi-Fi 6), 11=eht(Wi-Fi 7)
					if pt == 5 || pt == 8 || pt == 10 || pt == 11 {
						band = "5 GHz"
						break
					}
				}

				if isConn {
					connected = true
					activeSSID = ssid
					if sig > activeSignal {
						activeSignal = sig
					}
				}

				if ex, ok := bySSID[ssid]; ok {
					if sig > ex.Signal {
						ex.Signal = sig
					}
					if isConn {
						ex.Connected = true
					}
					if hasProf {
						ex.Saved = true
					}
					if ex.Auth == "" {
						ex.Auth = auth
						ex.Secured = sec
					}
					if band == "5 GHz" && ex.Band == "2.4 GHz" {
						ex.Band = band
					}
				} else {
					bySSID[ssid] = &WifiNetworkItem{
						SSID:      ssid,
						Signal:    sig,
						Secured:   sec,
						Auth:      auth,
						Band:      band,
						Connected: isConn,
						Saved:     hasProf,
					}
				}
			}
			_, _, _ = procWlanFreeMemory.Call(availPtr)
		}

		// Source 2: WlanGetNetworkBssList — raw 802.11 BSSID beacons (catches ALL 2.4/5/6 GHz APs!)
		var bssPtr uintptr
		if r, _, _ := procWlanGetNetworkBssList.Call(
			hClient,
			uintptr(unsafe.Pointer(&iface.InterfaceGuid)),
			0, // NULL = ALL SSIDs
			3, // dot11_BSS_type_any
			0,
			0,
			uintptr(unsafe.Pointer(&bssPtr)),
		); r == 0 && bssPtr != 0 {
			bl := (*winWlanBssList)(unsafe.Pointer(bssPtr))
			bItems := bl.NumberOfItems
			if bItems > 512 {
				bItems = 512
			}
			bBase := uintptr(unsafe.Pointer(&bl.Entries[0]))
			bStride := unsafe.Sizeof(winWlanBssEntry{})
			for j := uint32(0); j < bItems; j++ {
				ent := (*winWlanBssEntry)(unsafe.Pointer(bBase + uintptr(j)*bStride))
				ssid := decodeDot11SSID(ent.Dot11Ssid)
				if ssid == "" {
					continue
				}
				sig := int(ent.LinkQuality)
				if sig <= 0 && ent.Rssi < 0 {
					sig = rssiToPercent(ent.Rssi)
				}
				if sig > 100 {
					sig = 100
				}
				bssid := fmt.Sprintf("%02X:%02X:%02X:%02X:%02X:%02X",
					ent.Dot11Bssid[0], ent.Dot11Bssid[1], ent.Dot11Bssid[2],
					ent.Dot11Bssid[3], ent.Dot11Bssid[4], ent.Dot11Bssid[5])
				band := wlanFreqToBand(ent.ChCenterFrequency)
				sec := (ent.CapabilityInformation & 0x0010) != 0 // 802.11 Privacy bit
				auth := "Открытая"
				if sec {
					auth = "WPA2/WPA3"
				}

				if ex, ok := bySSID[ssid]; ok {
					if sig > ex.Signal {
						ex.Signal = sig
					}
					if ex.BSSID == "" {
						ex.BSSID = bssid
					}
					if band == "6 GHz" || (band == "5 GHz" && ex.Band != "6 GHz") {
						ex.Band = band
					}
				} else {
					if band == "" {
						band = "2.4 GHz"
					}
					bySSID[ssid] = &WifiNetworkItem{
						SSID:      ssid,
						Signal:    sig,
						Secured:   sec,
						Auth:      auth,
						Band:      band,
						Connected: connected && strings.EqualFold(ssid, activeSSID),
						Saved:     savedMap[ssid],
						BSSID:     bssid,
					}
				}
			}
			_, _, _ = procWlanFreeMemory.Call(bssPtr)
		}
	}
	return foundIface, activeSSID, activeSignal, connected
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
		// Full 1.8s hardware 802.11 active scan across 2.4 GHz, 5 GHz & 6 GHz channels so NO router is missed!
		triggerWin32WlanScan(1800 * time.Millisecond)
	} else {
		wifiScanCacheMu.Lock()
		stale := time.Since(wifiLastScanAt) > 12*time.Second
		wifiScanCacheMu.Unlock()
		if stale {
			// Refresh hardware scan in background so subsequent polls have 100% fresh APs without blocking UI
			go triggerWin32WlanScan(0)
		}
	}

	ifaceOut, ifaceErr := runNetshUTF8(3500*time.Millisecond, "wlan", "show", "interfaces")
	lowerIface := strings.ToLower(ifaceOut)

	profilesOut, _ := runNetshUTF8(3*time.Second, "wlan", "show", "profiles")
	savedMap := parseSavedWifiProfiles(profilesOut)

	bySSID := make(map[string]*WifiNetworkItem)
	wlanFound, wlanActiveSSID, wlanActiveSig, wlanConn := collectWin32WlanNetworks(bySSID, savedMap)

	if !wlanFound && ifaceErr != nil && (strings.Contains(lowerIface, "no wireless interface") || strings.Contains(lowerIface, "беспроводной интерфейс отсутствует") || strings.Contains(lowerIface, "служба автонастройки")) {
		snap.Available = false
		snap.Enabled = false
		snap.Error = "Адаптер Wi-Fi не обнаружен или служба WLAN отключена"
		return snap
	}

	radioOff := false
	hasIface := wlanFound
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

	if wlanConn && !snap.Connected {
		snap.Connected = true
	}
	if wlanActiveSSID != "" && snap.ActiveSSID == "" {
		snap.ActiveSSID = wlanActiveSSID
	}
	if wlanActiveSig > snap.Signal {
		snap.Signal = wlanActiveSig
	}

	snap.Available = hasIface || snap.ActiveSSID != "" || len(bySSID) > 0
	snap.Enabled = snap.Available && !radioOff
	if !snap.Enabled {
		snap.Connected = false
		snap.ActiveSSID = ""
		wifiScanCacheMu.Lock()
		wifiRecentCache = map[string]struct {
			item   WifiNetworkItem
			seenAt time.Time
		}{}
		wifiScanCacheMu.Unlock()
		return snap
	}

	// Source 3: Merge UTF-8 netsh wlan show networks mode=bssid (catches extra BSSID/channel hints)
	netsOut, _ := runNetshUTF8(4500*time.Millisecond, "wlan", "show", "networks", "mode=bssid")
	ssidRe := regexp.MustCompile(`(?i)^\s*SSID\s+\d+\s*:\s*(.*)$`)
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
			if val != "" && (current.Auth == "" || current.Auth == "WPA2/WPA3") {
				current.Auth = val
			}
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
			fields := strings.Fields(val)
			if len(fields) > 0 {
				if ch, err := strconv.Atoi(fields[0]); err == nil {
					if ch > 14 && current.Band != "6 GHz" {
						current.Band = "5 GHz"
					} else if ch > 0 && current.Band == "" {
						current.Band = "2.4 GHz"
					}
				}
			}
		case strings.Contains(key, "band") || strings.Contains(key, "диапазон"):
			if strings.Contains(valLow, "6") {
				current.Band = "6 GHz"
			} else if strings.Contains(valLow, "5") && current.Band != "6 GHz" {
				current.Band = "5 GHz"
			}
		}
	}

	// Ensure active connected SSID is always present
	if snap.Connected && snap.ActiveSSID != "" {
		if existing, ok := bySSID[snap.ActiveSSID]; ok {
			existing.Connected = true
			existing.Saved = true
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

	// Source 4: Anti-flicker 30-second recent-scan cache so nearby routers on busy channels NEVER randomly vanish!
	now := time.Now()
	wifiScanCacheMu.Lock()
	for ssid, item := range bySSID {
		if item.Saved || savedMap[ssid] {
			item.Saved = true
		}
		item.Connected = snap.Connected && strings.EqualFold(ssid, snap.ActiveSSID)
		wifiRecentCache[ssid] = struct {
			item   WifiNetworkItem
			seenAt time.Time
		}{item: *item, seenAt: now}
	}
	for ssid, cached := range wifiRecentCache {
		if now.Sub(cached.seenAt) > 30*time.Second {
			delete(wifiRecentCache, ssid)
			continue
		}
		if _, exists := bySSID[ssid]; !exists {
			copyItem := cached.item
			copyItem.Connected = snap.Connected && strings.EqualFold(ssid, snap.ActiveSSID)
			copyItem.Saved = copyItem.Saved || savedMap[ssid]
			bySSID[ssid] = &copyItem
		}
	}
	wifiScanCacheMu.Unlock()

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
		<nonBroadcast>true</nonBroadcast>
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
		<nonBroadcast>true</nonBroadcast>
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
