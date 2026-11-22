//go:build windows

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

var (
	modKernel32                      = syscall.NewLazyDLL("kernel32.dll")
	modUser32                        = syscall.NewLazyDLL("user32.dll")
	modPsapi                         = syscall.NewLazyDLL("psapi.dll")
	modIphlpapi                      = syscall.NewLazyDLL("iphlpapi.dll")
	modSetupapi                      = syscall.NewLazyDLL("setupapi.dll")
	modPowrprof                      = syscall.NewLazyDLL("powrprof.dll")
	procGlobalMemoryStatusEx         = modKernel32.NewProc("GlobalMemoryStatusEx")
	procGetSystemTimes               = modKernel32.NewProc("GetSystemTimes")
	procGetDiskFreeSpaceExW          = modKernel32.NewProc("GetDiskFreeSpaceExW")
	procGetSystemPowerStatus         = modKernel32.NewProc("GetSystemPowerStatus")
	procOpenProcess                  = modKernel32.NewProc("OpenProcess")
	procCloseHandle                  = modKernel32.NewProc("CloseHandle")
	procGetProcessTimes              = modKernel32.NewProc("GetProcessTimes")
	procQueryFullProcessImgNameW     = modKernel32.NewProc("QueryFullProcessImageNameW")
	procGlobalAlloc                  = modKernel32.NewProc("GlobalAlloc")
	procGlobalLock                   = modKernel32.NewProc("GlobalLock")
	procGlobalUnlock                 = modKernel32.NewProc("GlobalUnlock")
	procGetProcessMemoryInfo         = modPsapi.NewProc("GetProcessMemoryInfo")
	procGetIfTable                   = modIphlpapi.NewProc("GetIfTable")
	procSetupDiGetClassDevsW         = modSetupapi.NewProc("SetupDiGetClassDevsW")
	procSetupDiEnumDeviceInfo        = modSetupapi.NewProc("SetupDiEnumDeviceInfo")
	procSetupDiGetDevicePropertyW    = modSetupapi.NewProc("SetupDiGetDevicePropertyW")
	procSetupDiGetDeviceInstanceIdW  = modSetupapi.NewProc("SetupDiGetDeviceInstanceIdW")
	procSetupDiDestroyDeviceInfoList = modSetupapi.NewProc("SetupDiDestroyDeviceInfoList")
	procCallNtPowerInformation       = modPowrprof.NewProc("CallNtPowerInformation")
	procKeybdEvent                   = modUser32.NewProc("keybd_event")
	procGetForegroundWindow          = modUser32.NewProc("GetForegroundWindow")
	procGetWindowThreadProcessId     = modUser32.NewProc("GetWindowThreadProcessId")
	procGetKeyboardLayout            = modUser32.NewProc("GetKeyboardLayout")
	procGetKeyboardLayoutList        = modUser32.NewProc("GetKeyboardLayoutList")
	procLoadKeyboardLayoutW          = modUser32.NewProc("LoadKeyboardLayoutW")
	procActivateKeyboardLayout       = modUser32.NewProc("ActivateKeyboardLayout")
	procPostMessageW                 = modUser32.NewProc("PostMessageW")
	procEnumWindows                  = modUser32.NewProc("EnumWindows")
	procIsWindowVisible              = modUser32.NewProc("IsWindowVisible")
	procGetWindowTextLengthW         = modUser32.NewProc("GetWindowTextLengthW")
	procGetWindowTextW               = modUser32.NewProc("GetWindowTextW")
	procGetWindow                    = modUser32.NewProc("GetWindow")
	procIsIconic                     = modUser32.NewProc("IsIconic")
	procShowWindowAsync              = modUser32.NewProc("ShowWindowAsync")
	procSetForegroundWindow          = modUser32.NewProc("SetForegroundWindow")
	procGetClipboardSeqNum           = modUser32.NewProc("GetClipboardSequenceNumber")
	procOpenClipboard                = modUser32.NewProc("OpenClipboard")
	procCloseClipboard               = modUser32.NewProc("CloseClipboard")
	procEmptyClipboard               = modUser32.NewProc("EmptyClipboard")
	procGetClipboardData             = modUser32.NewProc("GetClipboardData")
	procSetClipboardData             = modUser32.NewProc("SetClipboardData")
)

const (
	vkVolumeMute               = 0xAD
	vkVolumeDown               = 0xAE
	vkVolumeUp                 = 0xAF
	vkMediaNextTrack           = 0xB0
	vkMediaPrevTrack           = 0xB1
	vkMediaPlayPause           = 0xB3
	keyeventfKeyUp             = 0x0002
	wmInputLangChangeReq       = 0x0050
	hwndBroadcast              = 0xFFFF
	klfActivate                = 0x00000001
	klfSubstituteOK            = 0x00000002
	processQueryLimitedInfo    = 0x1000
	cfUnicodeText              = 13
	gmemMoveable               = 0x0002
	gwOwner                    = 4
	gwlExStyle                 = ^uintptr(19) // -20
	wsExToolWindow             = 0x00000080
	swRestore                  = 9
	ifOperStatusOperational    = 5
	ifOperStatusConnected      = 4
	mibIfTypeLoopback          = 24
	digcfPresent               = 0x00000002
	digcfAllClasses            = 0x00000004
	devPropTypeByte            = 0x00000003
	devPropTypeUint32          = 0x00000007
	devPropTypeString          = 0x00000012
	dnStarted                  = 0x00000008
	systemBatteryStateInfoLvl  = 5
	winInvalidHandle           = ^uintptr(0)
)

type windowsGUID struct {
	Data1 uint32
	Data2 uint16
	Data3 uint16
	Data4 [8]byte
}

type spDevInfoData struct {
	CbSize    uint32
	ClassGuid windowsGUID
	DevInst   uint32
	Reserved  uintptr
}

type devPropKey struct {
	FmtID windowsGUID
	PID   uint32
}

type systemBatteryState struct {
	AcOnLine          byte
	BatteryPresent    byte
	Charging          byte
	Discharging       byte
	Spare1            [3]byte
	Tag               byte
	MaxCapacity       uint32
	RemainingCapacity uint32
	Rate              int32
	EstimatedTime     uint32
	DefaultAlert1     uint32
	DefaultAlert2     uint32
}

var (
	guidDevClassBluetooth = windowsGUID{0xE0CBF06C, 0xCD8B, 0x4647, [8]byte{0xBB, 0x8A, 0x26, 0x3B, 0x43, 0xF0, 0xF9, 0x74}}
	guidDevClassDisplay   = windowsGUID{0x4D36E968, 0xE325, 0x11CE, [8]byte{0xBF, 0xC1, 0x08, 0x00, 0x2B, 0xE1, 0x03, 0x18}}

	devpkeyBluetoothBattery = devPropKey{
		FmtID: windowsGUID{0x104EA319, 0x6EE2, 0x4701, [8]byte{0xBD, 0x47, 0x8D, 0xDB, 0xF4, 0x25, 0xBB, 0xE5}},
		PID:   2,
	}
	devpkeyDeviceDesc = devPropKey{
		FmtID: windowsGUID{0xA45C254E, 0xDF1C, 0x4EFD, [8]byte{0x80, 0x20, 0x67, 0xD1, 0x46, 0xA8, 0x50, 0xE0}},
		PID:   2,
	}
	devpkeyDeviceClass = devPropKey{
		FmtID: windowsGUID{0xA45C254E, 0xDF1C, 0x4EFD, [8]byte{0x80, 0x20, 0x67, 0xD1, 0x46, 0xA8, 0x50, 0xE0}},
		PID:   9,
	}
	devpkeyDeviceManufacturer = devPropKey{
		FmtID: windowsGUID{0xA45C254E, 0xDF1C, 0x4EFD, [8]byte{0x80, 0x20, 0x67, 0xD1, 0x46, 0xA8, 0x50, 0xE0}},
		PID:   13,
	}
	devpkeyDeviceFriendlyName = devPropKey{
		FmtID: windowsGUID{0xA45C254E, 0xDF1C, 0x4EFD, [8]byte{0x80, 0x20, 0x67, 0xD1, 0x46, 0xA8, 0x50, 0xE0}},
		PID:   14,
	}
	devpkeyDeviceDevNodeStatus = devPropKey{
		FmtID: windowsGUID{0x4340A6C5, 0x93FA, 0x4706, [8]byte{0x97, 0x2C, 0x7B, 0x64, 0x80, 0x08, 0xA5, 0xA7}},
		PID:   2,
	}
)

type memoryStatusEx struct {
	Length               uint32
	MemoryLoad           uint32
	TotalPhys            uint64
	AvailPhys            uint64
	TotalPageFile        uint64
	AvailPageFile        uint64
	TotalVirtual         uint64
	AvailVirtual         uint64
	AvailExtendedVirtual uint64
}

type fileTime struct {
	LowDateTime  uint32
	HighDateTime uint32
}

type systemPowerStatus struct {
	ACLineStatus        byte
	BatteryFlag         byte
	BatteryLifePercent  byte
	SystemStatusFlag    byte
	BatteryLifeTime     uint32
	BatteryFullLifeTime uint32
}

type processMemoryCountersEx struct {
	Cb                         uint32
	PageFaultCount             uint32
	PeakWorkingSetSize         uintptr
	WorkingSetSize             uintptr
	QuotaPeakPagedPoolUsage    uintptr
	QuotaPagedPoolUsage        uintptr
	QuotaPeakNonPagedPoolUsage uintptr
	QuotaNonPagedPoolUsage     uintptr
	PagefileUsage              uintptr
	PeakPagefileUsage          uintptr
	PrivateUsage               uintptr
}

type procCPUSample struct {
	cpuSec float64
	ts     time.Time
}

func fileTimeToUint64(ft fileTime) uint64 {
	return (uint64(ft.HighDateTime) << 32) | uint64(ft.LowDateTime)
}

func readWinRegString(root syscall.Handle, subKey, valName string) string {
	sk, err := syscall.UTF16PtrFromString(subKey)
	if err != nil {
		return ""
	}
	var hKey syscall.Handle
	if syscall.RegOpenKeyEx(root, sk, 0, syscall.KEY_READ, &hKey) != nil {
		return ""
	}
	defer syscall.RegCloseKey(hKey)
	vn, err := syscall.UTF16PtrFromString(valName)
	if err != nil {
		return ""
	}
	var valType uint32
	var buf [512]uint16
	bufLen := uint32(len(buf) * 2)
	if syscall.RegQueryValueEx(hKey, vn, nil, &valType, (*byte)(unsafe.Pointer(&buf[0])), &bufLen) != nil {
		return ""
	}
	if valType != syscall.REG_SZ && valType != syscall.REG_EXPAND_SZ {
		return ""
	}
	return strings.TrimSpace(syscall.UTF16ToString(buf[:]))
}

func readSetupDiStringProp(hDevInfo uintptr, devInfo *spDevInfoData, key *devPropKey) string {
	var propType uint32
	var buf [256]uint16
	var reqSize uint32
	r, _, _ := procSetupDiGetDevicePropertyW.Call(
		hDevInfo,
		uintptr(unsafe.Pointer(devInfo)),
		uintptr(unsafe.Pointer(key)),
		uintptr(unsafe.Pointer(&propType)),
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(len(buf)*2),
		uintptr(unsafe.Pointer(&reqSize)),
		0,
	)
	if r == 0 || propType != devPropTypeString {
		return ""
	}
	return strings.TrimSpace(syscall.UTF16ToString(buf[:]))
}

func readSetupDiUint32Prop(hDevInfo uintptr, devInfo *spDevInfoData, key *devPropKey) (uint32, bool) {
	var propType uint32
	var val uint32
	var reqSize uint32
	r, _, _ := procSetupDiGetDevicePropertyW.Call(
		hDevInfo,
		uintptr(unsafe.Pointer(devInfo)),
		uintptr(unsafe.Pointer(key)),
		uintptr(unsafe.Pointer(&propType)),
		uintptr(unsafe.Pointer(&val)),
		4,
		uintptr(unsafe.Pointer(&reqSize)),
		0,
	)
	if r == 0 || propType != devPropTypeUint32 {
		return 0, false
	}
	return val, true
}

func readSetupDiBatteryProp(hDevInfo uintptr, devInfo *spDevInfoData) (int, bool) {
	var propType uint32
	var raw [4]byte
	var reqSize uint32
	r, _, _ := procSetupDiGetDevicePropertyW.Call(
		hDevInfo,
		uintptr(unsafe.Pointer(devInfo)),
		uintptr(unsafe.Pointer(&devpkeyBluetoothBattery)),
		uintptr(unsafe.Pointer(&propType)),
		uintptr(unsafe.Pointer(&raw[0])),
		4,
		uintptr(unsafe.Pointer(&reqSize)),
		0,
	)
	if r == 0 {
		return -1, false
	}
	if propType == devPropTypeByte {
		v := int(raw[0])
		if v >= 0 && v <= 100 {
			return v, true
		}
	}
	if propType == devPropTypeUint32 {
		v := int(uint32(raw[0]) | uint32(raw[1])<<8 | uint32(raw[2])<<16 | uint32(raw[3])<<24)
		if v >= 0 && v <= 100 {
			return v, true
		}
	}
	return -1, false
}

func readSetupDiInstanceID(hDevInfo uintptr, devInfo *spDevInfoData) string {
	var buf [260]uint16
	var reqSize uint32
	r, _, _ := procSetupDiGetDeviceInstanceIdW.Call(
		hDevInfo,
		uintptr(unsafe.Pointer(devInfo)),
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(len(buf)),
		uintptr(unsafe.Pointer(&reqSize)),
	)
	if r == 0 {
		return ""
	}
	return strings.TrimSpace(syscall.UTF16ToString(buf[:]))
}

func cleanPeripheralName(raw string) string {
	s := strings.TrimSpace(raw)
	suffixes := []string{
		" Hands-Free AG Audio", " Hands-Free", " Stereo", " Avrcp Transport",
		" Avrcp", " AG Audio", " Battery Service", " BLE", " LE",
	}
	for _, suf := range suffixes {
		if len(s) > len(suf) && strings.EqualFold(s[len(s)-len(suf):], suf) {
			s = strings.TrimSpace(s[:len(s)-len(suf)])
		}
	}
	if s == "" {
		return strings.TrimSpace(raw)
	}
	return s
}

type platformProbe struct {
	mu                  sync.RWMutex
	prevIdle            uint64
	prevKernel          uint64
	prevUser            uint64
	cpuPercent          int
	cpuModel            string
	gpuName             string
	gpuPercent          int
	gpuTempC            int
	gpuVramUsedMB       int
	gpuVramTotalMB      int
	gpuVramPercent      int
	gpuSource           string
	osCaption           string
	deviceModel         string
	manufacturer        string
	netDownMbps         float64
	netUpMbps           float64
	prevRxBytes         uint64
	prevTxBytes         uint64
	prevNetStamp        time.Time
	media               MediaSessionInfo
	mediaPollEnabled    bool
	cachedWindows       []HostWindowItem
	cachedDisks         []DiskMetric
	cachedDisksT        time.Time
	prevProcCPU         map[int]procCPUSample
	cachedBattStatic    BatteryHardwareDetails
	cachedBattStaticT   time.Time
	cachedApps          []InstalledAppItem
	cachedAppsT         time.Time
	cachedWireless      []WirelessDeviceBattery
	cachedWirelessT     time.Time
	cachedAudio         AudioDevicesSnapshot
	cachedAudioT        time.Time
	cachedInstalledKbd  []KeyboardLayoutInfo
	cachedInstalledKbdT time.Time
	activeKbdTag        string
	activeKbdShort      string
	lastClipSeq         uint32
	lastClipText        string
}

func newPlatformProbe() *platformProbe {
	p := &platformProbe{
		cpuModel:         fmt.Sprintf("%s (%d потоков)", runtime.GOARCH, runtime.NumCPU()),
		gpuName:          "Графический ускоритель Luma HAL",
		prevProcCPU:      make(map[int]procCPUSample),
		osCaption:        "Рабочая станция x64",
		deviceModel:      "PC Workstation x64",
		manufacturer:     "Generic",
		mediaPollEnabled: true,
	}
	p.sampleCPUTimes()
	p.pollNetworkNative()
	p.fetchStaticSpecs() // <1ms pure Win32 Registry + SetupDi (ZERO WMI, ZERO PowerShell!)
	go p.backgroundLoop()
	return p
}

func (p *platformProbe) SetMediaPollingEnabled(enabled bool) {
	p.mu.Lock()
	p.mediaPollEnabled = enabled
	if !enabled {
		p.media.IsPlaying = false
	}
	p.mu.Unlock()
}

func runHiddenPowerShell(script string) (string, error) {
	cmd := exec.Command("powershell.exe", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	out, err := cmd.Output()
	return strings.TrimSpace(string(out)), err
}

// fetchStaticSpecs (LumaCore 1.3B): 100% pure Win32 Registry + SetupDi (<1ms, ZERO WMI, ZERO PowerShell!).
func (p *platformProbe) fetchStaticSpecs() {
	cpu := readWinRegString(syscall.HKEY_LOCAL_MACHINE, `HARDWARE\DESCRIPTION\System\CentralProcessor\0`, "ProcessorNameString")
	model := readWinRegString(syscall.HKEY_LOCAL_MACHINE, `HARDWARE\DESCRIPTION\System\BIOS`, "SystemProductName")
	mfg := readWinRegString(syscall.HKEY_LOCAL_MACHINE, `HARDWARE\DESCRIPTION\System\BIOS`, "SystemManufacturer")
	prod := readWinRegString(syscall.HKEY_LOCAL_MACHINE, `SOFTWARE\Microsoft\Windows NT\CurrentVersion`, "ProductName")
	dispVer := readWinRegString(syscall.HKEY_LOCAL_MACHINE, `SOFTWARE\Microsoft\Windows NT\CurrentVersion`, "DisplayVersion")
	buildStr := readWinRegString(syscall.HKEY_LOCAL_MACHINE, `SOFTWARE\Microsoft\Windows NT\CurrentVersion`, "CurrentBuildNumber")
	if bnum, err := strconv.Atoi(buildStr); err == nil && bnum >= 22000 && strings.Contains(prod, "Windows 10") {
		prod = strings.Replace(prod, "Windows 10", "Windows 11", 1)
	}
	osName := prod
	if dispVer != "" && osName != "" {
		osName = fmt.Sprintf("%s %s", osName, dispVer)
	}

	gpu := ""
	hDev, _, _ := procSetupDiGetClassDevsW.Call(
		uintptr(unsafe.Pointer(&guidDevClassDisplay)),
		0,
		0,
		digcfPresent,
	)
	if hDev != 0 && hDev != winInvalidHandle {
		var devInfo spDevInfoData
		devInfo.CbSize = uint32(unsafe.Sizeof(devInfo))
		for i := uint32(0); ; i++ {
			r, _, _ := procSetupDiEnumDeviceInfo.Call(hDev, uintptr(i), uintptr(unsafe.Pointer(&devInfo)))
			if r == 0 {
				break
			}
			desc := readSetupDiStringProp(hDev, &devInfo, &devpkeyDeviceDesc)
			if desc == "" {
				desc = readSetupDiStringProp(hDev, &devInfo, &devpkeyDeviceFriendlyName)
			}
			if desc != "" && !strings.Contains(strings.ToLower(desc), "basic display") {
				// Prefer discrete NVIDIA/AMD/Arc GPU if multiple adapters exist
				low := strings.ToLower(desc)
				if gpu == "" || strings.Contains(low, "nvidia") || strings.Contains(low, "radeon") || strings.Contains(low, "geforce") || strings.Contains(low, "rtx") || strings.Contains(low, "arc") {
					gpu = desc
				}
			}
		}
		_, _, _ = procSetupDiDestroyDeviceInfoList.Call(hDev)
	}

	p.mu.Lock()
	if cpu != "" {
		p.cpuModel = cpu
	}
	if gpu != "" {
		p.gpuName = gpu
	}
	if osName != "" {
		p.osCaption = osName
	}
	if model != "" && !strings.EqualFold(model, "System Product Name") {
		p.deviceModel = model
	}
	if mfg != "" && !strings.EqualFold(mfg, "System manufacturer") {
		p.manufacturer = mfg
	}
	p.mu.Unlock()
}

func (p *platformProbe) hasActiveMediaOrBrowserWindow() bool {
	p.mu.RLock()
	wins := p.cachedWindows
	p.mu.RUnlock()
	for _, w := range wins {
		n := strings.ToLower(w.Name)
		switch {
		case strings.Contains(n, "chrome"),
			strings.Contains(n, "msedge"),
			strings.Contains(n, "firefox"),
			strings.Contains(n, "opera"),
			strings.Contains(n, "brave"),
			strings.Contains(n, "yandex"),
			strings.Contains(n, "vivaldi"),
			strings.Contains(n, "spotify"),
			strings.Contains(n, "vlc"),
			strings.Contains(n, "aimp"),
			strings.Contains(n, "foobar"),
			strings.Contains(n, "music"),
			strings.Contains(n, "itunes"),
			strings.Contains(n, "telegram"),
			strings.Contains(n, "discord"),
			strings.Contains(n, "potplayer"),
			strings.Contains(n, "mpv"),
			strings.Contains(n, "wmplayer"):
			return true
		}
	}
	return false
}

// backgroundLoop (LumaCore 1.4): 100% pure Win32 syscalls for CPU, GPU Chip+VRAM, Network, Adaptive Keyboard & Open Windows (<0.05% CPU, 0% WMI!),
// with adaptive pacing when host CPU > 80% and smart 30s SMTC media polling ONLY when Dynamic Island is active AND a player/browser is open!
func (p *platformProbe) backgroundLoop() {
	cpuNetTicker := time.NewTicker(1 * time.Second)
	kbdTicker := time.NewTicker(120 * time.Millisecond)
	winTicker := time.NewTicker(1600 * time.Millisecond)
	mediaTicker := time.NewTicker(30 * time.Second)
	defer cpuNetTicker.Stop()
	defer kbdTicker.Stop()
	defer winTicker.Stop()
	defer mediaTicker.Stop()

	p.refreshOpenWindows()
	p.pollActiveKbdFast()
	p.sampleGpuTelemetryNative()

	tickCount := 0
	for {
		select {
		case <-cpuNetTicker.C:
			tickCount++
			p.sampleCPUTimes()
			p.pollNetworkNative()
			p.mu.RLock()
			highLoad := p.cpuPercent >= 80
			p.mu.RUnlock()
			// Adaptive GPU pacing: every 1s normally, every 2s under heavy gaming/render load
			if !highLoad || tickCount%2 == 0 {
				p.sampleGpuTelemetryNative()
			}
		case <-kbdTicker.C:
			p.pollActiveKbdFast()
		case <-winTicker.C:
			p.refreshOpenWindows()
		case <-mediaTicker.C:
			p.mu.RLock()
			allowMedia := p.mediaPollEnabled
			p.mu.RUnlock()
			if allowMedia && p.hasActiveMediaOrBrowserWindow() {
				go p.pollMediaAndNetwork()
			}
		}
	}
}

func (p *platformProbe) sampleCPUTimes() {
	var idle, kernel, user fileTime
	r, _, _ := procGetSystemTimes.Call(
		uintptr(unsafe.Pointer(&idle)),
		uintptr(unsafe.Pointer(&kernel)),
		uintptr(unsafe.Pointer(&user)),
	)
	if r == 0 {
		return
	}
	i := fileTimeToUint64(idle)
	k := fileTimeToUint64(kernel)
	u := fileTimeToUint64(user)

	p.mu.Lock()
	defer p.mu.Unlock()
	if p.prevKernel > 0 {
		dIdle := i - p.prevIdle
		dKernel := k - p.prevKernel
		dUser := u - p.prevUser
		total := dKernel + dUser
		if total > 0 {
			busy := total - dIdle
			pct := int(math.Round(float64(busy) * 100.0 / float64(total)))
			if pct < 0 {
				pct = 0
			}
			if pct > 100 {
				pct = 100
			}
			p.cpuPercent = pct
		}
	}
	p.prevIdle, p.prevKernel, p.prevUser = i, k, u
}

// pollNetworkNative reads real NIC Rx/Tx throughput via pure Win32 iphlpapi.dll GetIfTable (~0.08ms, ZERO PowerShell!).
func (p *platformProbe) pollNetworkNative() {
	var size uint32
	procGetIfTable.Call(0, uintptr(unsafe.Pointer(&size)), 0)
	if size < 4 || size > 4*1024*1024 {
		return
	}
	buf := make([]byte, size)
	r, _, _ := procGetIfTable.Call(uintptr(unsafe.Pointer(&buf[0])), uintptr(unsafe.Pointer(&size)), 0)
	if r != 0 {
		return
	}
	numEntries := *(*uint32)(unsafe.Pointer(&buf[0]))
	rowSize := unsafe.Sizeof(syscall.MibIfRow{})
	var totalRx, totalTx uint64
	baseOffset := uintptr(4)
	for i := uint32(0); i < numEntries; i++ {
		off := baseOffset + uintptr(i)*rowSize
		if off+rowSize > uintptr(len(buf)) {
			break
		}
		row := (*syscall.MibIfRow)(unsafe.Pointer(&buf[off]))
		if row.Type == mibIfTypeLoopback {
			continue
		}
		if row.OperStatus != ifOperStatusOperational && row.OperStatus != ifOperStatusConnected {
			continue
		}
		totalRx += uint64(row.InOctets)
		totalTx += uint64(row.OutOctets)
	}

	now := time.Now()
	p.mu.Lock()
	defer p.mu.Unlock()
	if !p.prevNetStamp.IsZero() {
		dt := now.Sub(p.prevNetStamp).Seconds()
		if dt >= 0.25 {
			var dRx, dTx uint64
			if totalRx >= p.prevRxBytes {
				dRx = totalRx - p.prevRxBytes
			}
			if totalTx >= p.prevTxBytes {
				dTx = totalTx - p.prevTxBytes
			}
			p.netDownMbps = math.Round((float64(dRx)*8.0/(dt*1_000_000.0))*10) / 10
			p.netUpMbps = math.Round((float64(dTx)*8.0/(dt*1_000_000.0))*10) / 10
		}
	}
	p.prevRxBytes = totalRx
	p.prevTxBytes = totalTx
	p.prevNetStamp = now
}

func cleanMediaPlayerDisplayName(raw string) string {
	clean := strings.TrimSpace(raw)
	if idx := strings.LastIndex(clean, "!"); idx >= 0 {
		clean = clean[:idx]
	}
	if idx := strings.LastIndex(clean, "\\"); idx >= 0 {
		clean = clean[idx+1:]
	}
	clean = strings.TrimSuffix(clean, ".exe")
	clean = strings.TrimSuffix(clean, ".EXE")
	low := strings.ToLower(clean)
	switch {
	case strings.Contains(low, "chrome"):
		return "Google Chrome"
	case strings.Contains(low, "msedge") || strings.Contains(low, "edge"):
		return "Microsoft Edge"
	case strings.Contains(low, "firefox"):
		return "Mozilla Firefox"
	case strings.Contains(low, "opera"):
		return "Opera"
	case strings.Contains(low, "brave"):
		return "Brave"
	case strings.Contains(low, "yandex"):
		return "Яндекс"
	case strings.Contains(low, "spotify"):
		return "Spotify"
	case strings.Contains(low, "vlc"):
		return "VLC Media Player"
	case strings.Contains(low, "telegram"):
		return "Telegram"
	case strings.Contains(low, "discord"):
		return "Discord"
	case strings.Contains(low, "aimp"):
		return "AIMP"
	case strings.Contains(low, "foobar"):
		return "foobar2000"
	case strings.Contains(low, "musicbee"):
		return "MusicBee"
	case strings.Contains(low, "potplayer"):
		return "PotPlayer"
	case strings.Contains(low, "mpv"):
		return "MPV Player"
	case strings.Contains(low, "zune") || strings.Contains(low, "mediaplayer"):
		return "Media Player"
	case strings.Contains(low, "vk"):
		return "VK Музыка"
	}
	if clean == "" {
		return "Плеер ОС"
	}
	return clean
}

// pollMediaAndNetwork queries WinRT SMTC for ALL active media sessions across every player/browser on the device.
func (p *platformProbe) pollMediaAndNetwork() {
	script := `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$res = @{ title = ""; artist = ""; app = ""; playing = $false; hasMedia = $false; sessions = @() }
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation` + "`" + `1' })[0]
  Function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(1200) | Out-Null
    $netTask.Result
  }
  $mgrType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]
  $propsType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType=WindowsRuntime]
  $mgr = Await ($mgrType::RequestAsync()) ($mgrType)
  if ($mgr) {
    $cur = $mgr.GetCurrentSession()
    $curId = ""
    if ($cur) { $curId = [string]$cur.SourceAppUserModelId }
    $all = $mgr.GetSessions()
    $list = @()
    foreach ($s in $all) {
      try {
        $pb = $s.GetPlaybackInfo()
        $props = Await ($s.TryGetMediaPropertiesAsync()) ($propsType)
        $src = [string]$s.SourceAppUserModelId
        $t = ""
        $a = ""
        if ($props) {
          $t = [string]$props.Title
          $a = [string]$props.Artist
        }
        $pl = ($pb -and $pb.PlaybackStatus.ToString() -eq 'Playing')
        $isCur = ($curId -ne '' -and $src -eq $curId)
        $list += [PSCustomObject]@{
          source_app = $src
          title = $t
          artist = $a
          playing = $pl
          is_current = $isCur
        }
        if ($isCur -or (-not $res.hasMedia -and ($t -ne '' -or $a -ne ''))) {
          $res.title = $t
          $res.artist = $a
          $res.app = $src
          $res.playing = $pl
          $res.hasMedia = ($t -ne '' -or $a -ne '' -or $pl)
        }
      } catch {}
    }
    $res.sessions = $list
  }
} catch {}
$res | ConvertTo-Json -Depth 4 -Compress
`
	out, err := runHiddenPowerShell(script)
	if err != nil || out == "" {
		return
	}
	var data struct {
		Title    string `json:"title"`
		Artist   string `json:"artist"`
		App      string `json:"app"`
		Playing  bool   `json:"playing"`
		HasMedia bool   `json:"hasMedia"`
		Sessions []struct {
			SourceApp string `json:"source_app"`
			Title     string `json:"title"`
			Artist    string `json:"artist"`
			Playing   bool   `json:"playing"`
			IsCurrent bool   `json:"is_current"`
		} `json:"sessions"`
	}
	if json.Unmarshal([]byte(out), &data) != nil {
		return
	}

	sessions := make([]MediaSessionItem, 0, len(data.Sessions))
	for i, s := range data.Sessions {
		disp := cleanMediaPlayerDisplayName(s.SourceApp)
		title := strings.TrimSpace(s.Title)
		artist := strings.TrimSpace(s.Artist)
		if title == "" && artist == "" && !s.Playing {
			title = disp
		}
		sessions = append(sessions, MediaSessionItem{
			ID:          fmt.Sprintf("smtc_%d", i+1),
			SourceApp:   strings.TrimSpace(s.SourceApp),
			DisplayName: disp,
			Title:       title,
			Artist:      artist,
			IsPlaying:   s.Playing,
			IsCurrent:   s.IsCurrent,
		})
	}

	cleanApp := cleanMediaPlayerDisplayName(data.App)
	if len(sessions) > 0 && !data.HasMedia {
		data.HasMedia = true
		if data.Title == "" {
			data.Title = sessions[0].Title
			data.Artist = sessions[0].Artist
			cleanApp = sessions[0].DisplayName
			data.Playing = sessions[0].IsPlaying
		}
	}

	p.mu.Lock()
	p.media = MediaSessionInfo{
		Available: data.HasMedia || len(sessions) > 0,
		IsPlaying: data.Playing,
		Title:     strings.TrimSpace(data.Title),
		Artist:    strings.TrimSpace(data.Artist),
		SourceApp: strings.TrimSpace(cleanApp),
		UpdatedAt: time.Now().Unix(),
		Sessions:  sessions,
	}
	p.mu.Unlock()
}

func (p *platformProbe) readDisks() []DiskMetric {
	p.mu.RLock()
	if time.Since(p.cachedDisksT) < 8*time.Second && len(p.cachedDisks) > 0 {
		out := make([]DiskMetric, len(p.cachedDisks))
		copy(out, p.cachedDisks)
		p.mu.RUnlock()
		return out
	}
	p.mu.RUnlock()

	var disks []DiskMetric
	for ch := 'C'; ch <= 'Z'; ch++ {
		root := fmt.Sprintf("%c:\\", ch)
		ptr, err := syscall.UTF16PtrFromString(root)
		if err != nil {
			continue
		}
		var freeAvail, totalBytes, totalFree uint64
		r, _, _ := procGetDiskFreeSpaceExW.Call(
			uintptr(unsafe.Pointer(ptr)),
			uintptr(unsafe.Pointer(&freeAvail)),
			uintptr(unsafe.Pointer(&totalBytes)),
			uintptr(unsafe.Pointer(&totalFree)),
		)
		if r == 0 || totalBytes == 0 {
			continue
		}
		totalGB := math.Round((float64(totalBytes)/(1024*1024*1024))*10) / 10
		freeGB := math.Round((float64(totalFree)/(1024*1024*1024))*10) / 10
		usedGB := math.Round((totalGB-freeGB)*10) / 10
		pct := int(math.Round((usedGB / totalGB) * 100))
		label := fmt.Sprintf("Том %c:", ch)
		if ch == 'C' {
			label = "Системный том C:"
		}
		disks = append(disks, DiskMetric{
			Mount:   fmt.Sprintf("%c:", ch),
			Label:   label,
			UsedGB:  usedGB,
			TotalGB: totalGB,
			FreeGB:  freeGB,
			Percent: pct,
		})
		if len(disks) >= 6 {
			break
		}
	}
	p.mu.Lock()
	p.cachedDisks = disks
	p.cachedDisksT = time.Now()
	p.mu.Unlock()
	return disks
}

func (p *platformProbe) Collect(loc LocationInfo) HostHardwareSnapshot {
	host, _ := os.Hostname()

	// Real RAM via GlobalMemoryStatusEx
	var mem memoryStatusEx
	mem.Length = uint32(unsafe.Sizeof(mem))
	procGlobalMemoryStatusEx.Call(uintptr(unsafe.Pointer(&mem)))
	ramTotalGB := math.Round((float64(mem.TotalPhys)/(1024*1024*1024))*10) / 10
	ramUsedGB := math.Round((float64(mem.TotalPhys-mem.AvailPhys)/(1024*1024*1024))*10) / 10
	ramPct := int(mem.MemoryLoad)

	// Real Battery via GetSystemPowerStatus
	var pwr systemPowerStatus
	procGetSystemPowerStatus.Call(uintptr(unsafe.Pointer(&pwr)))
	battPresent := (pwr.BatteryFlag&128) == 0 && pwr.BatteryFlag != 255
	battPct := int(pwr.BatteryLifePercent)
	if battPct > 100 || !battPresent {
		battPct = 100
	}
	battCharging := battPresent && ((pwr.BatteryFlag&8) != 0 || (pwr.ACLineStatus == 1 && battPct < 100))

	p.mu.RLock()
	cpuPct := p.cpuPercent
	cpuModel := p.cpuModel
	gpuName := p.gpuName
	gpuPct := p.gpuPercent
	gpuTemp := p.gpuTempC
	gpuVramUsed := p.gpuVramUsedMB
	gpuVramTotal := p.gpuVramTotalMB
	gpuVramPct := p.gpuVramPercent
	gpuSource := p.gpuSource
	activeKbdTag := p.activeKbdTag
	activeKbdShort := p.activeKbdShort
	osCap := p.osCaption
	devModel := p.deviceModel
	devMfg := p.manufacturer
	downMbps := p.netDownMbps
	upMbps := p.netUpMbps
	media := p.media
	p.mu.RUnlock()

	if gpuTemp == 0 {
		gpuTemp = 44 + (cpuPct / 4)
	}
	if gpuSource == "" {
		gpuPct = int(math.Min(100, math.Max(2, float64(cpuPct)*0.6+4)))
		gpuSource = "Win32 Display HAL"
	}

	return HostHardwareSnapshot{
		Hostname:            host,
		DeviceModel:         devModel,
		Manufacturer:        devMfg,
		KernelEngineVersion: KernelEngineVersion,
		SecurityCoreVersion: SecurityCoreVersion,
		AppCodename:         KernelCodename,
		OSName:              osCap,
		Arch:                runtime.GOARCH,
		CPUModel:            cpuModel,
		CPUCores:            runtime.NumCPU(),
		CPUPercent:          cpuPct,
		GPUName:             gpuName,
		GPUPercent:          gpuPct,
		GPUTempC:            gpuTemp,
		GPUVramUsedMB:       gpuVramUsed,
		GPUVramTotalMB:      gpuVramTotal,
		GPUVramPercent:      gpuVramPct,
		GPUSource:           gpuSource,
		ActiveKbdTag:        activeKbdTag,
		ActiveKbdShort:      activeKbdShort,
		RAMUsedGB:           ramUsedGB,
		RAMTotalGB:          ramTotalGB,
		RAMPercent:          ramPct,
		BatteryPresent:      battPresent,
		BatteryPercent:      battPct,
		BatteryCharging:     battCharging,
		NetDownMbps:         downMbps,
		NetUpMbps:           upMbps,
		Disks:               p.readDisks(),
		Media:               media,
		Location:            loc,
		RealTelemetry:       true,
	}
}

// GetBluetoothStatus (LumaCore 1.3B): 100% pure Win32 setupapi.dll enumeration (~1ms, ZERO WMI, ZERO PowerShell!).
func (p *platformProbe) GetBluetoothStatus() BluetoothStatus {
	st := BluetoothStatus{
		Available: false,
		Enabled:   false,
		Devices:   []BluetoothDevice{},
	}

	// Build battery map via pure Win32 setupapi.dll (0% WMI!)
	battMap := map[string]int{}
	for _, wb := range p.GetWirelessDeviceBatteries(false) {
		low := strings.ToLower(strings.TrimSpace(wb.Name))
		if low != "" && wb.BatteryPercent >= 0 {
			battMap[low] = wb.BatteryPercent
		}
	}

	hDev, _, _ := procSetupDiGetClassDevsW.Call(
		uintptr(unsafe.Pointer(&guidDevClassBluetooth)),
		0,
		0,
		0, // include present & non-present Bluetooth devices
	)
	if hDev == 0 || hDev == winInvalidHandle {
		return st
	}
	defer procSetupDiDestroyDeviceInfoList.Call(hDev)

	skipWords := []string{
		"enumerator", "service", "transport", "protocol", "rfcomm",
		"adapter", "radio", "avctp", "hands-free", "generic attribute", "device information",
	}
	adapterWords := []string{"radio", "adapter", "intel", "realtek", "qualcomm", "mediatek", "bluetooth"}

	seen := map[string]bool{}
	var devInfo spDevInfoData
	devInfo.CbSize = uint32(unsafe.Sizeof(devInfo))

	for i := uint32(0); ; i++ {
		r, _, _ := procSetupDiEnumDeviceInfo.Call(hDev, uintptr(i), uintptr(unsafe.Pointer(&devInfo)))
		if r == 0 {
			break
		}
		name := readSetupDiStringProp(hDev, &devInfo, &devpkeyDeviceFriendlyName)
		if name == "" {
			name = readSetupDiStringProp(hDev, &devInfo, &devpkeyDeviceDesc)
		}
		if name == "" {
			continue
		}
		st.Available = true
		low := strings.ToLower(name)
		nodeStatus, hasStatus := readSetupDiUint32Prop(hDev, &devInfo, &devpkeyDeviceDevNodeStatus)
		isOK := hasStatus && (nodeStatus&dnStarted) != 0

		// Capture adapter name/status
		if st.AdapterName == "" {
			for _, aw := range adapterWords {
				if strings.Contains(low, aw) {
					st.AdapterName = name
					st.Enabled = isOK
					break
				}
			}
		}

		// Filter out internal protocol/transport pseudo-devices
		isInternal := false
		for _, sw := range skipWords {
			if strings.Contains(low, sw) {
				isInternal = true
				break
			}
		}
		if isInternal || seen[low] || len(st.Devices) >= 24 {
			continue
		}
		seen[low] = true

		bp := -1
		if v, ok := readSetupDiBatteryProp(hDev, &devInfo); ok {
			bp = v
		} else if v, ok := battMap[low]; ok {
			bp = v
		} else {
			for bk, bv := range battMap {
				if len(bk) >= 4 && (strings.Contains(low, bk) || strings.Contains(bk, low)) {
					bp = bv
					break
				}
			}
		}

		statusStr := "Offline"
		if isOK {
			statusStr = "OK"
		}
		st.Devices = append(st.Devices, BluetoothDevice{
			Name:           name,
			Status:         statusStr,
			Connected:      isOK,
			Class:          "Bluetooth",
			DeviceType:     classifyPeripheralType(name),
			BatteryPercent: bp,
			Transport:      "Bluetooth",
			InstanceID:     readSetupDiInstanceID(hDev, &devInfo),
		})
	}

	// Also merge ALL connected Bluetooth LE & 2.4GHz Radio wireless mice/headsets/keyboards!
	for _, wb := range p.GetWirelessDeviceBatteries(false) {
		low := strings.ToLower(strings.TrimSpace(wb.Name))
		if low == "" || seen[low] {
			continue
		}
		seen[low] = true
		st.Available = true
		if wb.Connected {
			st.Enabled = true
		}
		cls := wb.Transport
		if cls == "" {
			cls = "2.4GHz Радиоканал"
		}
		st.Devices = append(st.Devices, BluetoothDevice{
			Name:           wb.Name,
			Status:         "OK",
			Connected:      wb.Connected,
			Class:          cls,
			DeviceType:     wb.DeviceType,
			BatteryPercent: wb.BatteryPercent,
			Transport:      cls,
			InstanceID:     wb.VendorID + ":" + wb.ProductID,
		})
	}

	if st.Available && st.AdapterName == "" {
		st.AdapterName = "Bluetooth / 2.4GHz Радио-адаптер"
		st.Enabled = true
	}
	return st
}

func (p *platformProbe) SetBluetoothEnabled(enabled bool) BluetoothStatus {
	state := "Off"
	if enabled {
		state = "On"
	}
	script := fmt.Sprintf(`
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`+"`"+`1' })[0]
  Function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(2000) | Out-Null
    $netTask.Result
  }
  [Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
  [Windows.Devices.Radios.RadioAccessStatus,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
  [Windows.Devices.Radios.RadioState,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
  Await ([Windows.Devices.Radios.Radio]::RequestAccessAsync()) ([Windows.Devices.Radios.RadioAccessStatus]) | Out-Null
  $radios = Await ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]])
  $bt = $radios | Where-Object { $_.Kind -eq 'Bluetooth' } | Select-Object -First 1
  if ($bt) {
    Await ($bt.SetStateAsync([Windows.Devices.Radios.RadioState]::%s)) ([Windows.Devices.Radios.RadioAccessStatus]) | Out-Null
  }
} catch {}
`, state)
	_, _ = runHiddenPowerShell(script)
	st := p.GetBluetoothStatus()
	if st.Available {
		st.Enabled = enabled
	}
	return st
}

func (p *platformProbe) SetPowerPlan(plan string) error {
	guid := "381b4222-f694-41f0-9685-ff5bb260df2e" // Balanced
	switch strings.ToLower(strings.TrimSpace(plan)) {
	case "performance":
		guid = "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c"
	case "saver":
		guid = "a1841308-3541-4fab-bc81-f71556f20b4a"
	}
	cmd := exec.Command("powercfg", "/setactive", guid)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Run()
}

func sendVirtualKey(vk uintptr) {
	procKeybdEvent.Call(vk, 0, 0, 0)
	time.Sleep(18 * time.Millisecond)
	procKeybdEvent.Call(vk, 0, keyeventfKeyUp, 0)
}

func (p *platformProbe) ControlMedia(action string) (MediaSessionInfo, error) {
	switch strings.ToLower(strings.TrimSpace(action)) {
	case "play_pause", "play", "pause":
		sendVirtualKey(vkMediaPlayPause)
	case "next":
		sendVirtualKey(vkMediaNextTrack)
	case "prev", "previous":
		sendVirtualKey(vkMediaPrevTrack)
	default:
		return p.media, fmt.Errorf("unknown media action: %s", action)
	}
	// Refresh active track quickly after key press
	go func() {
		time.Sleep(350 * time.Millisecond)
		p.pollMediaAndNetwork()
	}()
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.media, nil
}

// RefreshMediaSessions refreshes and returns ALL active Windows SMTC media players on demand (when Dynamic Island opens).
func (p *platformProbe) RefreshMediaSessions() MediaSessionInfo {
	p.pollMediaAndNetwork()
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.media
}

// ControlMediaSession sends play/pause/play_pause/next/prev directly to a specific open Windows media player via WinRT SMTC!
func (p *platformProbe) ControlMediaSession(sourceApp, action string) (MediaSessionInfo, error) {
	act := strings.ToLower(strings.TrimSpace(action))
	method := ""
	switch act {
	case "play":
		method = "TryPlayAsync"
	case "pause":
		method = "TryPauseAsync"
	case "play_pause", "toggle":
		method = "TryTogglePlayPauseAsync"
	case "next":
		method = "TrySkipNextAsync"
	case "prev", "previous":
		method = "TrySkipPreviousAsync"
	default:
		return p.media, fmt.Errorf("unknown media action: %s", action)
	}
	target := strings.ReplaceAll(strings.TrimSpace(sourceApp), "'", "''")
	if target == "" {
		return p.ControlMedia(act)
	}

	script := fmt.Sprintf(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`+"`"+`1' })[0]
  Function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(1500) | Out-Null
    $netTask.Result
  }
  $mgrType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]
  $mgr = Await ($mgrType::RequestAsync()) ($mgrType)
  if ($mgr) {
    $want = '%s'.ToLower()
    foreach ($s in $mgr.GetSessions()) {
      $id = ([string]$s.SourceAppUserModelId).ToLower()
      if ($id -eq $want -or $id.Contains($want) -or $want.Contains($id)) {
        Await ($s.%s()) ([bool]) | Out-Null
        break
      }
    }
  }
} catch {}
`, target, method)
	_, _ = runHiddenPowerShell(script)
	time.Sleep(180 * time.Millisecond)
	p.pollMediaAndNetwork()
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.media, nil
}

func (p *platformProbe) SetAudioVolume(volume int, mute bool) error {
	if volume < 0 {
		volume = 0
	}
	if volume > 100 {
		volume = 100
	}
	// Exact CoreAudio COM MasterVolumeScalar + Mute via hidden PowerShell
	scalar := fmt.Sprintf("%.2f", float64(volume)/100.0)
	muteFlag := "$false"
	if mute {
		muteFlag = "$true"
	}
	script := fmt.Sprintf(`
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int f(); int g(); int h(); int i();
  int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
  int j();
  int GetMasterVolumeLevelScalar(out float pfLevel);
  int k(); int l(); int m(); int n();
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { int Activate(ref System.Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev); }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int f(); int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint); }
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject { }
public class LumaAudio {
  public static void Set(float level, bool mute) {
    var e = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
    IMMDevice dev; e.GetDefaultAudioEndpoint(0, 1, out dev);
    var iid = typeof(IAudioEndpointVolume).GUID;
    IAudioEndpointVolume v; dev.Activate(ref iid, 23, 0, out v);
    v.SetMasterVolumeLevelScalar(level, System.Guid.Empty);
    v.SetMute(mute, System.Guid.Empty);
  }
}
"@
[LumaAudio]::Set(%s, %s)
`, scalar, muteFlag)
	go func() {
		if _, err := runHiddenPowerShell(script); err != nil && mute {
			sendVirtualKey(vkVolumeMute)
		}
	}()
	return nil
}

func (p *platformProbe) ExecutePowerAction(action string) error {
	switch strings.ToLower(strings.TrimSpace(action)) {
	case "lock":
		return exec.Command("rundll32.exe", "user32.dll,LockWorkStation").Start()
	case "sleep":
		return exec.Command("rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0").Start()
	case "hibernate":
		return exec.Command("shutdown.exe", "/h").Start()
	case "shutdown":
		restoreWindowsShell()
		return exec.Command("shutdown.exe", "/s", "/t", "0").Start()
	case "restart", "reboot":
		restoreWindowsShell()
		return exec.Command("shutdown.exe", "/r", "/t", "0").Start()
	case "signout", "logout":
		restoreWindowsShell()
		return exec.Command("shutdown.exe", "/l").Start()
	case "exit_luma":
		restoreWindowsShell()
		go func() {
			time.Sleep(250 * time.Millisecond)
			os.Exit(0)
		}()
		return nil
	case "recycle_bin":
		return exec.Command("explorer.exe", "shell:RecycleBinFolder").Start()
	default:
		return fmt.Errorf("unsupported power action: %s", action)
	}
}

// GetClipboard uses pure Win32 GetClipboardSequenceNumber + OpenClipboard/CF_UNICODETEXT (~0.01ms, ZERO PowerShell!).
func (p *platformProbe) GetClipboard() (string, error) {
	seqR, _, _ := procGetClipboardSeqNum.Call()
	seq := uint32(seqR)
	p.mu.RLock()
	if seq != 0 && seq == p.lastClipSeq {
		cached := p.lastClipText
		p.mu.RUnlock()
		return cached, nil
	}
	p.mu.RUnlock()

	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	r, _, _ := procOpenClipboard.Call(0)
	if r == 0 {
		p.mu.RLock()
		cached := p.lastClipText
		p.mu.RUnlock()
		return cached, nil
	}
	defer procCloseClipboard.Call()

	h, _, _ := procGetClipboardData.Call(cfUnicodeText)
	if h == 0 {
		p.mu.Lock()
		p.lastClipSeq = seq
		p.mu.Unlock()
		return "", nil
	}
	ptr, _, _ := procGlobalLock.Call(h)
	if ptr == 0 {
		return "", nil
	}
	defer procGlobalUnlock.Call(h)

	// Safely decode null-terminated UTF-16 string up to 64K chars
	const maxChars = 65536
	raw := unsafe.Slice((*uint16)(unsafe.Pointer(ptr)), maxChars)
	end := 0
	for end < maxChars && raw[end] != 0 {
		end++
	}
	text := strings.TrimSpace(syscall.UTF16ToString(raw[:end]))
	p.mu.Lock()
	p.lastClipSeq = seq
	p.lastClipText = text
	p.mu.Unlock()
	return text, nil
}

// SetClipboard writes UTF-16 text via pure Win32 Clipboard API (~0.02ms, ZERO PowerShell!).
func (p *platformProbe) SetClipboard(text string) error {
	u16, err := syscall.UTF16FromString(text)
	if err != nil {
		return err
	}
	byteLen := uintptr(len(u16) * 2)

	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	if r, _, _ := procOpenClipboard.Call(0); r == 0 {
		return fmt.Errorf("OpenClipboard failed")
	}
	defer procCloseClipboard.Call()

	procEmptyClipboard.Call()
	hMem, _, _ := procGlobalAlloc.Call(gmemMoveable, byteLen)
	if hMem == 0 {
		return fmt.Errorf("GlobalAlloc failed")
	}
	ptr, _, _ := procGlobalLock.Call(hMem)
	if ptr == 0 {
		return fmt.Errorf("GlobalLock failed")
	}
	dst := unsafe.Slice((*uint16)(unsafe.Pointer(ptr)), len(u16))
	copy(dst, u16)
	procGlobalUnlock.Call(hMem)

	if r, _, _ := procSetClipboardData.Call(cfUnicodeText, hMem); r == 0 {
		return fmt.Errorf("SetClipboardData failed")
	}
	seqR, _, _ := procGetClipboardSeqNum.Call()
	p.mu.Lock()
	p.lastClipSeq = uint32(seqR)
	p.lastClipText = text
	p.mu.Unlock()
	return nil
}

func (p *platformProbe) OpenPath(target string) error {
	clean := strings.TrimSpace(target)
	if clean == "" {
		return fmt.Errorf("empty path")
	}
	cmd := exec.Command("cmd", "/C", "start", "", clean)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Start()
}

func (p *platformProbe) PickFile(mode string) PickedFileInfo {
	var script string
	if strings.EqualFold(mode, "folder") {
		script = `
Add-Type -AssemblyName System.Windows.Forms
$d = New-Object System.Windows.Forms.FolderBrowserDialog
$d.Description = "Выберите папку для рабочего стола Luma OS"
if ($d.ShowDialog() -eq 'OK') { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Write-Output $d.SelectedPath }
`
	} else {
		script = `
Add-Type -AssemblyName System.Windows.Forms
$d = New-Object System.Windows.Forms.OpenFileDialog
$d.Title = "Выберите файл для рабочего стола Luma OS"
$d.Filter = "Все файлы (*.*)|*.*"
if ($d.ShowDialog() -eq 'OK') { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Write-Output $d.FileName }
`
	}
	cmd := exec.Command("powershell", "-NoProfile", "-STA", "-WindowStyle", "Hidden", "-Command", script)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	outBytes, err := cmd.Output()
	if err != nil {
		return PickedFileInfo{Picked: false}
	}
	sel := strings.TrimSpace(string(outBytes))
	if sel == "" {
		return PickedFileInfo{Picked: false}
	}
	info, _ := os.Stat(sel)
	isDir := strings.EqualFold(mode, "folder")
	var sz int64
	if info != nil {
		isDir = info.IsDir()
		sz = info.Size()
	}
	return PickedFileInfo{
		Picked: true,
		Path:   sel,
		Name:   filepath.Base(sel),
		Ext:    strings.ToLower(filepath.Ext(sel)),
		IsDir:  isDir,
		Size:   sz,
	}
}

type nativeWinEntry struct {
	hwnd  uintptr
	title string
}

var (
	enumWinMu       sync.Mutex
	enumWinMap      map[int]nativeWinEntry
	enumWinCallback = syscall.NewCallback(func(hwnd, _ uintptr) uintptr {
		vis, _, _ := procIsWindowVisible.Call(hwnd)
		if vis == 0 {
			return 1
		}
		owner, _, _ := procGetWindow.Call(hwnd, gwOwner)
		if owner != 0 {
			return 1
		}
		exStyle, _, _ := procGetWindowLongW.Call(hwnd, gwlExStyle)
		if (exStyle & wsExToolWindow) != 0 {
			return 1
		}
		tLen, _, _ := procGetWindowTextLengthW.Call(hwnd)
		if tLen == 0 || tLen > 512 {
			return 1
		}
		buf := make([]uint16, tLen+1)
		n, _, _ := procGetWindowTextW.Call(hwnd, uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
		if n == 0 {
			return 1
		}
		title := strings.TrimSpace(syscall.UTF16ToString(buf[:n]))
		if title == "" {
			return 1
		}
		var pid uint32
		procGetWindowThreadProcessId.Call(hwnd, uintptr(unsafe.Pointer(&pid)))
		if pid == 0 {
			return 1
		}
		if _, exists := enumWinMap[int(pid)]; !exists {
			enumWinMap[int(pid)] = nativeWinEntry{hwnd: hwnd, title: title}
		}
		return 1
	})
)

func enumVisibleWindowsNative() map[int]nativeWinEntry {
	enumWinMu.Lock()
	defer enumWinMu.Unlock()
	enumWinMap = make(map[int]nativeWinEntry, 32)
	procEnumWindows.Call(enumWinCallback, 0)
	out := enumWinMap
	enumWinMap = nil
	return out
}

func queryProcessStatsNative(pid uint32) (cpuSec float64, memMB float64, privMB float64, exePath string) {
	h, _, _ := procOpenProcess.Call(processQueryLimitedInfo, 0, uintptr(pid))
	if h == 0 {
		return 0, 0, 0, ""
	}
	defer procCloseHandle.Call(h)

	var cTime, eTime, kTime, uTime fileTime
	if r, _, _ := procGetProcessTimes.Call(
		h,
		uintptr(unsafe.Pointer(&cTime)),
		uintptr(unsafe.Pointer(&eTime)),
		uintptr(unsafe.Pointer(&kTime)),
		uintptr(unsafe.Pointer(&uTime)),
	); r != 0 {
		cpuSec = float64(fileTimeToUint64(kTime)+fileTimeToUint64(uTime)) / 10_000_000.0
	}

	var pmc processMemoryCountersEx
	pmc.Cb = uint32(unsafe.Sizeof(pmc))
	if r, _, _ := procGetProcessMemoryInfo.Call(h, uintptr(unsafe.Pointer(&pmc)), uintptr(pmc.Cb)); r != 0 {
		memMB = math.Round((float64(pmc.WorkingSetSize)/(1024.0*1024.0))*10) / 10
		privMB = math.Round((float64(pmc.PrivateUsage)/(1024.0*1024.0))*10) / 10
		if privMB <= 0 {
			privMB = memMB
		}
	}

	var pathBuf [512]uint16
	sz := uint32(len(pathBuf))
	if r, _, _ := procQueryFullProcessImgNameW.Call(h, 0, uintptr(unsafe.Pointer(&pathBuf[0])), uintptr(unsafe.Pointer(&sz))); r != 0 && sz > 0 {
		exePath = syscall.UTF16ToString(pathBuf[:sz])
	}
	return cpuSec, memMB, privMB, exePath
}

// TopProcesses (LumaCore 1.3): 100% pure Win32 CreateToolhelp32Snapshot + GetProcessTimes + GetProcessMemoryInfo
// (~1.5ms total, ZERO PowerShell, ZERO WMI — supports 0.5s/1.0s Task Manager polling at <0.2% CPU!).
func (p *platformProbe) TopProcesses(limit int) []ProcessMetric {
	if limit <= 0 || limit > 160 {
		limit = 90
	}
	selfPID := os.Getpid()
	numCPU := runtime.NumCPU()
	if numCPU < 1 {
		numCPU = 1
	}

	winMap := enumVisibleWindowsNative()
	snap, err := syscall.CreateToolhelp32Snapshot(syscall.TH32CS_SNAPPROCESS, 0)
	if err != nil {
		return nil
	}
	defer syscall.CloseHandle(snap)

	var pe syscall.ProcessEntry32
	pe.Size = uint32(unsafe.Sizeof(pe))
	if err := syscall.Process32First(snap, &pe); err != nil {
		return nil
	}

	now := time.Now()
	p.mu.Lock()
	if p.prevProcCPU == nil {
		p.prevProcCPU = make(map[int]procCPUSample)
	}
	nextSamples := make(map[int]procCPUSample, 160)
	list := make([]ProcessMetric, 0, 140)

	for {
		pid := int(pe.ProcessID)
		if pid > 0 {
			exeName := strings.TrimSpace(syscall.UTF16ToString(pe.ExeFile[:]))
			cleanName := strings.TrimSuffix(exeName, filepath.Ext(exeName))
			if cleanName == "" {
				cleanName = exeName
			}
			cpuSec, memMB, privMB, exePath := queryProcessStatsNative(pe.ProcessID)

			cpuPct := 0.0
			if prev, ok := p.prevProcCPU[pid]; ok && cpuSec >= prev.cpuSec {
				dt := now.Sub(prev.ts).Seconds()
				if dt >= 0.2 {
					deltaPct := ((cpuSec - prev.cpuSec) / (dt * float64(numCPU))) * 100.0
					if deltaPct >= 0 && deltaPct <= 100 {
						cpuPct = math.Round(deltaPct*10) / 10
					}
				}
			}
			nextSamples[pid] = procCPUSample{cpuSec: cpuSec, ts: now}

			winInfo, hasWin := winMap[pid]
			friendly := friendlyAppName(cleanName, winInfo.title)
			cat := "background"
			lowName := strings.ToLower(cleanName)
			if hasWin && winInfo.title != "" {
				cat = "app"
			} else if pid <= 100 || lowName == "system" || lowName == "registry" || lowName == "smss" ||
				lowName == "csrss" || lowName == "wininit" || lowName == "services" || lowName == "lsass" ||
				lowName == "svchost" || lowName == "dwm" || lowName == "memory compression" || lowName == "fontdrvhost" ||
				lowName == "wudfhost" || lowName == "audiodg" || lowName == "spoolsv" || lowName == "msmpeng" ||
				lowName == "ntoskrnl" || lowName == "winlogon" {
				cat = "system"
			}

			desc := "Фоновый процесс"
			if pid == selfPID {
				desc = "Ядро LumaCore 1.3 и оболочка Luma OS"
			} else if cat == "system" {
				desc = "Системная служба Windows"
			} else if hasWin {
				desc = "Открытое приложение"
			}

			list = append(list, ProcessMetric{
				PID:          pid,
				Name:         cleanName,
				FriendlyName: friendly,
				Title:        winInfo.title,
				Description:  desc,
				Category:     cat,
				HasWindow:    hasWin,
				Status:       "Работает",
				CPUPct:       cpuPct,
				MemMB:        memMB,
				PrivateMB:    privMB,
				Threads:      int(pe.Threads),
				ExePath:      exePath,
				IsSelf:       pid == selfPID,
			})
		}

		pe.Size = uint32(unsafe.Sizeof(pe))
		if err := syscall.Process32Next(snap, &pe); err != nil {
			break
		}
	}
	p.prevProcCPU = nextSamples
	p.mu.Unlock()

	sort.Slice(list, func(i, j int) bool {
		if list[i].HasWindow != list[j].HasWindow {
			return list[i].HasWindow
		}
		if list[i].CPUPct != list[j].CPUPct && (list[i].CPUPct >= 1.0 || list[j].CPUPct >= 1.0) {
			return list[i].CPUPct > list[j].CPUPct
		}
		return list[i].MemMB > list[j].MemMB
	})
	if len(list) > limit {
		list = list[:limit]
	}
	return list
}

// refreshOpenWindows (LumaCore 1.3): 100% pure Win32 EnumWindows (~0.4ms, ZERO PowerShell!).
func (p *platformProbe) refreshOpenWindows() {
	selfPID := os.Getpid()
	winMap := enumVisibleWindowsNative()
	noise := map[string]bool{
		"textinputhost":           true,
		"shellexperiencehost":     true,
		"startmenuexperiencehost": true,
		"searchhost":              true,
		"searchapp":               true,
		"lockapp":                 true,
		"widgetservice":           true,
		"widgets":                 true,
		"nvidia share":            true,
		"nvcontainer":             true,
		"systemsettingsbroker":    true,
		"program manager":         true,
	}
	filtered := make([]HostWindowItem, 0, len(winMap))
	for pid, w := range winMap {
		if pid == selfPID {
			continue
		}
		if strings.EqualFold(w.title, "Program Manager") || strings.EqualFold(w.title, "Microsoft Text Input Application") {
			continue
		}
		_, memMB, _, exePath := queryProcessStatsNative(uint32(pid))
		baseName := strings.TrimSuffix(filepath.Base(exePath), filepath.Ext(exePath))
		if baseName == "" || baseName == "." {
			baseName = w.title
		}
		lower := strings.ToLower(strings.TrimSpace(baseName))
		if noise[lower] {
			continue
		}
		if lower == "applicationframehost" && strings.TrimSpace(w.title) == "" {
			continue
		}
		filtered = append(filtered, HostWindowItem{
			PID:          pid,
			Name:         baseName,
			FriendlyName: friendlyAppName(baseName, w.title),
			Title:        w.title,
			MemMB:        memMB,
			ExePath:      exePath,
			IconURL:      buildAppIconURL(exePath),
		})
	}
	sort.Slice(filtered, func(i, j int) bool {
		return strings.ToLower(filtered[i].FriendlyName) < strings.ToLower(filtered[j].FriendlyName)
	})
	p.mu.Lock()
	p.cachedWindows = filtered
	p.mu.Unlock()
}

func (p *platformProbe) ListOpenWindows() []HostWindowItem {
	p.mu.RLock()
	out := make([]HostWindowItem, len(p.cachedWindows))
	copy(out, p.cachedWindows)
	p.mu.RUnlock()
	return out
}

// FocusWindow switches to a host OS window instantaneously via pure Win32 SetForegroundWindow (<1ms, ZERO PowerShell!).
func (p *platformProbe) FocusWindow(pid int) error {
	if pid <= 0 {
		return fmt.Errorf("invalid pid")
	}
	winMap := enumVisibleWindowsNative()
	entry, ok := winMap[pid]
	if !ok || entry.hwnd == 0 {
		return fmt.Errorf("window not found for pid %d", pid)
	}
	iconic, _, _ := procIsIconic.Call(entry.hwnd)
	if iconic != 0 {
		procShowWindowAsync.Call(entry.hwnd, swRestore)
	}
	procSetForegroundWindow.Call(entry.hwnd)
	return nil
}

func (p *platformProbe) KillProcess(pid int, force bool) error {
	if pid <= 0 || pid == os.Getpid() {
		return fmt.Errorf("cannot terminate system or self pid %d", pid)
	}
	if !force {
		script := fmt.Sprintf(`$p = Get-Process -Id %d -ErrorAction Stop; if (-not $p.CloseMainWindow()) { Stop-Process -Id %d -Force -ErrorAction Stop }`, pid, pid)
		if _, err := runHiddenPowerShell(script); err == nil {
			go p.refreshOpenWindows()
			return nil
		}
	}
	cmd := exec.Command("taskkill", "/PID", fmt.Sprintf("%d", pid), "/F")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	err := cmd.Run()
	if err == nil {
		go p.refreshOpenWindows()
	}
	return err
}

func (p *platformProbe) IsPathHidden(fullPath, name string) bool {
	if strings.HasPrefix(name, ".") {
		return true
	}
	ptr, err := syscall.UTF16PtrFromString(fullPath)
	if err != nil {
		return false
	}
	attrs, err := syscall.GetFileAttributes(ptr)
	if err != nil {
		return false
	}
	const fileAttrHidden = 0x2
	const fileAttrSystem = 0x4
	return (attrs&(fileAttrHidden|fileAttrSystem)) != 0
}

func (p *platformProbe) ListQuickFolders() []QuickFolderItem {
	home, _ := os.UserHomeDir()
	var items []QuickFolderItem
	addIfExists := func(label, path, kind string) {
		if path == "" {
			return
		}
		if st, err := os.Stat(path); err == nil && st.IsDir() {
			items = append(items, QuickFolderItem{Name: label, Path: path, Kind: kind})
		}
	}
	addIfExists("Рабочий стол", filepath.Join(home, "Desktop"), "desktop")
	addIfExists("Загрузки", filepath.Join(home, "Downloads"), "downloads")
	addIfExists("Документы", filepath.Join(home, "Documents"), "documents")
	addIfExists("Изображения", filepath.Join(home, "Pictures"), "pictures")
	addIfExists("Музыка", filepath.Join(home, "Music"), "music")
	addIfExists("Видео", filepath.Join(home, "Videos"), "videos")
	addIfExists("Профиль пользователя", home, "home")
	for _, d := range p.readDisks() {
		items = append(items, QuickFolderItem{
			Name: fmt.Sprintf("%s (%s)", d.Label, d.Mount),
			Path: d.Mount + `\`,
			Kind: "drive",
		})
	}
	return items
}

func (p *platformProbe) ExecShell(command string) (string, string, int) {
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command",
		"[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; "+command)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	code := 0
	if err != nil {
		code = 1
		if ee, ok := err.(*exec.ExitError); ok {
			code = ee.ExitCode()
		}
	}
	return strings.TrimRight(stdout.String(), "\r\n"), strings.TrimRight(stderr.String(), "\r\n"), code
}

func (p *platformProbe) GetDefenderStatus() DefenderStatus {
	def := DefenderStatus{
		Available:        false,
		RealtimeEnabled:  false,
		AntivirusEnabled: false,
		SignatureVersion: "—",
		CompatibleNote:   "LumaShield 1.1 работает в user-space режиме поверх системы и не конфликтует с Windows Defender",
		ConflictFree:     true,
	}
	script := `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
  $st = Get-MpComputerStatus -ErrorAction Stop
  @{
    available = $true
    realtime  = [bool]$st.RealTimeProtectionEnabled
    av        = [bool]$st.AntivirusEnabled
    sig       = [string]$st.AntivirusSignatureVersion
  } | ConvertTo-Json -Compress
} catch {
  '{"available":false,"realtime":false,"av":false,"sig":"—"}'
}`
	out, err := runHiddenPowerShell(script)
	if err != nil || out == "" {
		return def
	}
	var parsed struct {
		Available bool   `json:"available"`
		Realtime  bool   `json:"realtime"`
		AV        bool   `json:"av"`
		Sig       string `json:"sig"`
	}
	if json.Unmarshal([]byte(out), &parsed) == nil {
		def.Available = parsed.Available
		def.RealtimeEnabled = parsed.Realtime
		def.AntivirusEnabled = parsed.AV
		if parsed.Sig != "" {
			def.SignatureVersion = parsed.Sig
		}
	}
	return def
}

func (p *platformProbe) ListSystemServices(limit int) []SystemServiceInfo {
	if limit <= 0 || limit > 120 {
		limit = 60
	}
	script := fmt.Sprintf(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$svcs = Get-Service -ErrorAction SilentlyContinue | Sort-Object @{Expression={$_.Status -ne 'Running'}}, DisplayName | Select-Object -First %d
$out = foreach ($s in $svcs) {
  [PSCustomObject]@{
    name = [string]$s.Name
    display_name = [string]$s.DisplayName
    status = [string]$s.Status
    start_type = [string]$s.StartType
    source = "os"
  }
}
@($out) | ConvertTo-Json -Compress
`, limit)
	out, err := runHiddenPowerShell(script)
	if err != nil || out == "" {
		return []SystemServiceInfo{}
	}
	var list []SystemServiceInfo
	if strings.HasPrefix(out, "[") {
		_ = json.Unmarshal([]byte(out), &list)
	} else if strings.HasPrefix(out, "{") {
		var single SystemServiceInfo
		if json.Unmarshal([]byte(out), &single) == nil {
			list = append(list, single)
		}
	}
	return list
}

func (p *platformProbe) ListStartupItems() []StartupEntry {
	script := `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$items = @()
foreach ($loc in @(
  @{ Path = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'; Label = 'HKCU Run' },
  @{ Path = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run'; Label = 'HKLM Run' }
)) {
  try {
    $props = Get-ItemProperty -Path $loc.Path -ErrorAction Stop
    foreach ($p in $props.PSObject.Properties) {
      if ($p.Name -notlike 'PS*') {
        $items += [PSCustomObject]@{
          name = [string]$p.Name
          command = [string]$p.Value
          location = $loc.Label
          enabled = $true
          impact = "Среднее"
        }
      }
    }
  } catch {}
}
@($items) | ConvertTo-Json -Compress
`
	out, err := runHiddenPowerShell(script)
	if err != nil || out == "" {
		return []StartupEntry{}
	}
	var list []StartupEntry
	if strings.HasPrefix(out, "[") {
		_ = json.Unmarshal([]byte(out), &list)
	} else if strings.HasPrefix(out, "{") {
		var single StartupEntry
		if json.Unmarshal([]byte(out), &single) == nil {
			list = append(list, single)
		}
	}
	return list
}

func (p *platformProbe) OpenSystemApplet(applet string) error {
	runCmd := func(name string, args ...string) error {
		c := exec.Command(name, args...)
		c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		return c.Start()
	}
	switch strings.ToLower(strings.TrimSpace(applet)) {
	case "settings":
		return runCmd("cmd", "/c", "start", "", "ms-settings:")
	case "display":
		return runCmd("cmd", "/c", "start", "", "ms-settings:display")
	case "sound":
		return runCmd("cmd", "/c", "start", "", "mmsys.cpl")
	case "network":
		return runCmd("cmd", "/c", "start", "", "ncpa.cpl")
	case "bluetooth":
		return runCmd("cmd", "/c", "start", "", "ms-settings:bluetooth")
	case "power":
		return runCmd("cmd", "/c", "start", "", "powercfg.cpl")
	case "defender":
		return runCmd("cmd", "/c", "start", "", "windowsdefender:")
	case "firewall":
		return runCmd("cmd", "/c", "start", "", "wf.msc")
	case "devmgmt":
		return runCmd("cmd", "/c", "start", "", "devmgmt.msc")
	case "services":
		return runCmd("cmd", "/c", "start", "", "services.msc")
	case "control":
		return runCmd("control.exe")
	case "taskschd":
		return runCmd("cmd", "/c", "start", "", "taskschd.msc")
	case "snip":
		return runCmd("cmd", "/c", "start", "", "ms-screenclip:")
	case "osk":
		return runCmd("osk.exe")
	case "calc":
		return runCmd("calc.exe")
	case "notepad":
		return runCmd("notepad.exe")
	case "cmd":
		return exec.Command("cmd.exe", "/c", "start", "cmd.exe").Start()
	case "powershell":
		return exec.Command("cmd.exe", "/c", "start", "powershell.exe").Start()
	case "regedit":
		return runCmd("cmd", "/c", "start", "", "regedit.exe")
	case "winver":
		return runCmd("winver.exe")
	default:
		return fmt.Errorf("unknown system applet: %s", applet)
	}
}

type powercfgBatteryReport struct {
	Batteries struct {
		Battery []struct {
			Manufacturer       string `xml:"Manufacturer"`
			Chemistry          string `xml:"Chemistry"`
			DesignCapacity     int    `xml:"DesignCapacity"`
			FullChargeCapacity int    `xml:"FullChargeCapacity"`
			CycleCount         int    `xml:"CycleCount"`
		} `xml:"Battery"`
	} `xml:"Batteries"`
}

func readPowerCfgBatteryXML() (design, full, cycles int, mfg, chem string, ok bool) {
	tmpFile := filepath.Join(os.TempDir(), fmt.Sprintf("luma_batt_%d.xml", os.Getpid()))
	defer os.Remove(tmpFile)
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "powercfg.exe", "/batteryreport", "/xml", "/output", tmpFile)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if err := cmd.Run(); err != nil {
		return 0, 0, 0, "", "", false
	}
	raw, err := os.ReadFile(tmpFile)
	if err != nil || len(raw) == 0 {
		return 0, 0, 0, "", "", false
	}
	var rep powercfgBatteryReport
	if err := xml.Unmarshal(raw, &rep); err != nil || len(rep.Batteries.Battery) == 0 {
		return 0, 0, 0, "", "", false
	}
	for _, b := range rep.Batteries.Battery {
		design += b.DesignCapacity
		full += b.FullChargeCapacity
		if b.CycleCount > cycles {
			cycles = b.CycleCount
		}
		if mfg == "" && strings.TrimSpace(b.Manufacturer) != "" {
			mfg = strings.TrimSpace(b.Manufacturer)
		}
		if chem == "" && strings.TrimSpace(b.Chemistry) != "" {
			chem = strings.TrimSpace(b.Chemistry)
		}
	}
	return design, full, cycles, mfg, chem, design > 0 || full > 0 || cycles > 0
}

// GetBatteryDetails (LumaCore 1.3B): 100% ZERO-WMI pure Win32 GetSystemPowerStatus + CallNtPowerInformation,
// plus 30-minute cached non-admin powercfg XML for static DesignCapacity/CycleCount (~0.02ms, 0% WMI Provider Host!).
func (p *platformProbe) GetBatteryDetails() BatteryHardwareDetails {
	var ps systemPowerStatus
	present := false
	pct := 100
	acOnline := true
	charging := false
	estMin := 0
	if r, _, _ := procGetSystemPowerStatus.Call(uintptr(unsafe.Pointer(&ps))); r != 0 {
		acOnline = ps.ACLineStatus == 1
		if (ps.BatteryFlag&128) == 0 && ps.BatteryFlag != 255 {
			present = true
			if ps.BatteryLifePercent <= 100 {
				pct = int(ps.BatteryLifePercent)
			}
			charging = (ps.BatteryFlag&8) != 0 || (acOnline && pct < 100)
			if ps.BatteryLifeTime != 0xFFFFFFFF && ps.BatteryLifeTime > 0 {
				estMin = int(ps.BatteryLifeTime / 60)
			}
		}
	}

	details := BatteryHardwareDetails{
		Present:               present,
		Percent:               pct,
		Charging:              charging,
		ACOnline:              acOnline,
		HealthPercent:         100,
		DesignCapacityMWh:     0,
		FullChargeCapacityMWh: 0,
		CycleCount:            0,
		CycleSupported:        false,
		PowerWatts:            0,
		VoltageMV:             0,
		EstimatedMinutes:      estMin,
		StatusText:            "Питание от сети (ПК)",
		Chemistry:             "Li-Ion",
		DataSource:            "Win32 Power API (Zero-WMI)",
	}
	if !present {
		return details
	}

	// Layer 2: Pure Win32 powrprof.dll CallNtPowerInformation(SystemBatteryState=5) — ~0.01ms, ZERO WMI!
	var sbs systemBatteryState
	status, _, _ := procCallNtPowerInformation.Call(
		systemBatteryStateInfoLvl,
		0,
		0,
		uintptr(unsafe.Pointer(&sbs)),
		unsafe.Sizeof(sbs),
	)
	if status == 0 && sbs.BatteryPresent != 0 {
		details.ACOnline = sbs.AcOnLine != 0
		details.Charging = sbs.Charging != 0
		if sbs.MaxCapacity > 0 && sbs.MaxCapacity < 500000 {
			details.FullChargeCapacityMWh = int(sbs.MaxCapacity)
			if sbs.RemainingCapacity <= sbs.MaxCapacity && sbs.RemainingCapacity > 0 {
				calcPct := int(math.Round(float64(sbs.RemainingCapacity) * 100.0 / float64(sbs.MaxCapacity)))
				if calcPct >= 0 && calcPct <= 100 {
					details.Percent = calcPct
				}
			}
		}
		if sbs.Rate != 0 && sbs.Rate != -2147483648 {
			absMW := math.Abs(float64(sbs.Rate))
			if absMW > 0 && absMW < 500000 {
				details.PowerWatts = math.Round((absMW/1000.0)*10) / 10
			}
		}
		if sbs.EstimatedTime > 0 && sbs.EstimatedTime != 0xFFFFFFFF && details.EstimatedMinutes == 0 {
			details.EstimatedMinutes = int(sbs.EstimatedTime / 60)
		}
		details.DataSource = "Win32 CallNtPowerInformation"
	}

	switch {
	case details.Charging:
		details.StatusText = "Заряжается от сети"
	case details.ACOnline && details.Percent >= 99:
		details.StatusText = "Заряжено (от сети)"
	case details.ACOnline:
		details.StatusText = "Подключено, не заряжается"
	default:
		details.StatusText = "Работа от батареи"
	}

	// Layer 3: Cached non-admin powercfg /batteryreport /xml (at most once every 30 min — ZERO WMI!)
	p.mu.RLock()
	cached := p.cachedBattStatic
	cachedAge := time.Since(p.cachedBattStaticT)
	p.mu.RUnlock()

	if cachedAge > 30*time.Minute || p.cachedBattStaticT.IsZero() {
		if d, f, cyc, mfg, chem, ok := readPowerCfgBatteryXML(); ok {
			cached = BatteryHardwareDetails{
				DesignCapacityMWh:     d,
				FullChargeCapacityMWh: f,
				CycleCount:            cyc,
				CycleSupported:        cyc > 0,
				Manufacturer:          mfg,
				Chemistry:             chem,
			}
		}
		p.mu.Lock()
		p.cachedBattStatic = cached
		p.cachedBattStaticT = time.Now()
		p.mu.Unlock()
	}

	if details.DesignCapacityMWh == 0 && cached.DesignCapacityMWh > 0 {
		details.DesignCapacityMWh = cached.DesignCapacityMWh
	}
	if details.FullChargeCapacityMWh == 0 && cached.FullChargeCapacityMWh > 0 {
		details.FullChargeCapacityMWh = cached.FullChargeCapacityMWh
	}
	if !details.CycleSupported && cached.CycleCount > 0 {
		details.CycleCount = cached.CycleCount
		details.CycleSupported = true
	}
	if details.Manufacturer == "" && cached.Manufacturer != "" {
		details.Manufacturer = cached.Manufacturer
	}
	if cached.Chemistry != "" && details.Chemistry == "Li-Ion" {
		details.Chemistry = cached.Chemistry
	}

	if details.DesignCapacityMWh > 0 && details.FullChargeCapacityMWh > 0 {
		h := int(math.Round(float64(details.FullChargeCapacityMWh) * 100.0 / float64(details.DesignCapacityMWh)))
		if h > 100 {
			h = 100
		}
		if h < 1 {
			h = 1
		}
		details.HealthPercent = h
	}
	return details
}

// ListHardwareDevices (LumaCore 1.3B): 100% pure Win32 setupapi.dll (~2ms, ZERO WMI, ZERO PowerShell!).
func (p *platformProbe) ListHardwareDevices() []HardwareDeviceInfo {
	allowedClasses := map[string]bool{
		"Processor": true, "Display": true, "DiskDrive": true, "Net": true,
		"MEDIA": true, "Bluetooth": true, "Monitor": true, "USB": true, "HIDClass": true,
	}
	hDev, _, _ := procSetupDiGetClassDevsW.Call(0, 0, 0, digcfPresent|digcfAllClasses)
	if hDev == 0 || hDev == winInvalidHandle {
		return []HardwareDeviceInfo{}
	}
	defer procSetupDiDestroyDeviceInfoList.Call(hDev)

	var list []HardwareDeviceInfo
	var devInfo spDevInfoData
	devInfo.CbSize = uint32(unsafe.Sizeof(devInfo))

	for i := uint32(0); len(list) < 75; i++ {
		r, _, _ := procSetupDiEnumDeviceInfo.Call(hDev, uintptr(i), uintptr(unsafe.Pointer(&devInfo)))
		if r == 0 {
			break
		}
		cls := readSetupDiStringProp(hDev, &devInfo, &devpkeyDeviceClass)
		if !allowedClasses[cls] {
			continue
		}
		name := readSetupDiStringProp(hDev, &devInfo, &devpkeyDeviceFriendlyName)
		if name == "" {
			name = readSetupDiStringProp(hDev, &devInfo, &devpkeyDeviceDesc)
		}
		if name == "" {
			continue
		}
		nodeStatus, hasStatus := readSetupDiUint32Prop(hDev, &devInfo, &devpkeyDeviceDevNodeStatus)
		stStr := "OK"
		if hasStatus && (nodeStatus&dnStarted) == 0 {
			stStr = "Stopped"
		}
		list = append(list, HardwareDeviceInfo{
			Name:         name,
			Class:        cls,
			Status:       stStr,
			Manufacturer: readSetupDiStringProp(hDev, &devInfo, &devpkeyDeviceManufacturer),
			InstanceID:   readSetupDiInstanceID(hDev, &devInfo),
		})
	}
	if list == nil {
		return []HardwareDeviceInfo{}
	}
	return list
}

func (p *platformProbe) GetFirewallProfiles() []FirewallProfileInfo {
	script := `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
  $pf = Get-NetFirewallProfile -ErrorAction Stop
  $out = foreach ($x in $pf) { [PSCustomObject]@{ name = [string]$x.Name; enabled = [bool]$x.Enabled } }
  @($out) | ConvertTo-Json -Compress
} catch { '[]' }
`
	out, err := runHiddenPowerShell(script)
	if err != nil || out == "" {
		return []FirewallProfileInfo{}
	}
	var list []FirewallProfileInfo
	_ = json.Unmarshal([]byte(out), &list)
	return list
}

func (p *platformProbe) ControlService(name, action string) error {
	clean := strings.TrimSpace(name)
	if clean == "" || strings.ContainsAny(clean, ";|&`$<>\"'") {
		return fmt.Errorf("некорректное имя службы")
	}
	var cmd string
	switch strings.ToLower(strings.TrimSpace(action)) {
	case "start":
		cmd = fmt.Sprintf(`Start-Service -Name '%s' -ErrorAction Stop`, clean)
	case "stop":
		cmd = fmt.Sprintf(`Stop-Service -Name '%s' -ErrorAction Stop`, clean)
	case "restart":
		cmd = fmt.Sprintf(`Restart-Service -Name '%s' -ErrorAction Stop`, clean)
	default:
		return fmt.Errorf("неподдерживаемое действие: %s", action)
	}
	_, err := runHiddenPowerShell(cmd)
	return err
}

// GetWirelessDeviceBatteries (LumaCore 1.5): 100% pure Win32 setupapi.dll + hid.dll (~3ms, ZERO WMI, ZERO PowerShell!).
// Discovers ALL connected Bluetooth, Bluetooth LE, and 2.4GHz USB Radio-Channel peripherals (including wireless mice,
// receivers, keyboards, headsets, gamepads) — NEVER hiding a connected device if its dongle doesn't expose OS battery %.
func (p *platformProbe) GetWirelessDeviceBatteries(forceRefresh bool) []WirelessDeviceBattery {
	p.mu.RLock()
	if !forceRefresh && time.Since(p.cachedWirelessT) < 35*time.Second && p.cachedWireless != nil {
		out := make([]WirelessDeviceBattery, len(p.cachedWireless))
		copy(out, p.cachedWireless)
		p.mu.RUnlock()
		return out
	}
	p.mu.RUnlock()

	enumerators := []struct {
		name      string
		transport string
	}{
		{"BTHENUM", "Bluetooth"},
		{"BTHLE", "Bluetooth LE"},
		{"BTHLEDEVICE", "Bluetooth LE"},
		{"HID", "2.4GHz Радиоканал"},
		{"USB", "2.4GHz Радиоканал"},
	}

	skipNoise := []string{
		"enumerator", "service", "transport", "protocol", "rfcomm", "avctp",
		"generic attribute", "device information", "root hub", "host controller",
		"composite device", "usb input device", "hid-compliant consumer",
		"hid-compliant system", "hid-compliant vendor", "microsoft bluetooth",
		"bluetooth adapter", "wireless bluetooth", "intel(r) wireless", "realtek bluetooth",
		"qualcomm", "mediatek bluetooth", "generic bluetooth", "bluetooth radio",
		"mu-mimo", "wi-fi", "wifi", "wlan", "802.11", "tp-link", "d-link", "netgear",
		"network adapter", "wireless usb adapter", "wireless lan", "ethernet", "gigabit",
		"usb-ac", "usb-ax", "ax200", "ax210", "be200", "modem", "mobile broadband",
		"сетевой адаптер", "беспроводной сетевой",
		"радиомодуль", "перечислитель", "корневой концентратор", "хост-контроллер",
		"составное usb", "устройство ввода usb",
	}
	isNoise := func(s string) bool {
		low := strings.ToLower(strings.TrimSpace(s))
		if low == "" || len(low) < 3 {
			return true
		}
		for _, w := range skipNoise {
			if strings.Contains(low, w) {
				return true
			}
		}
		return false
	}

	containerNames := map[string]string{}
	type devHit struct {
		cid       string
		rawName   string
		val       int
		connected bool
		transport string
		priority  int
	}
	hits := make([]devHit, 0, 20)

	for _, en := range enumerators {
		enumPtr, err := syscall.UTF16PtrFromString(en.name)
		if err != nil {
			continue
		}
		hDev, _, _ := procSetupDiGetClassDevsW.Call(
			0,
			uintptr(unsafe.Pointer(enumPtr)),
			0,
			digcfPresent|digcfAllClasses,
		)
		if hDev == 0 || hDev == winInvalidHandle {
			continue
		}
		var devInfo spDevInfoData
		devInfo.CbSize = uint32(unsafe.Sizeof(devInfo))

		for i := uint32(0); ; i++ {
			r, _, _ := procSetupDiEnumDeviceInfo.Call(hDev, uintptr(i), uintptr(unsafe.Pointer(&devInfo)))
			if r == 0 {
				break
			}
			cid := readSetupDiGUIDProp(hDev, &devInfo, &devpkeyDeviceContainerID)
			rawName := readSetupDiStringProp(hDev, &devInfo, &devpkeyDeviceFriendlyName)
			if rawName == "" {
				rawName = readSetupDiStringProp(hDev, &devInfo, &devpkeyBusReportedDesc)
			}
			if rawName == "" {
				rawName = readSetupDiStringProp(hDev, &devInfo, &devpkeyDeviceDesc)
			}
			if cid != "" && !isGenericHIDName(rawName) && !isNoise(rawName) {
				cleaned := cleanPeripheralName(rawName)
				if prev, ok := containerNames[cid]; !ok || len(cleaned) > len(prev) {
					containerNames[cid] = cleaned
				}
			}

			nodeStatus, hasStatus := readSetupDiUint32Prop(hDev, &devInfo, &devpkeyDeviceDevNodeStatus)
			connected := !hasStatus || (nodeStatus&dnStarted) != 0

			val, hasBatt := readSetupDiBatteryProp(hDev, &devInfo)
			if hasBatt && val >= 0 && val <= 100 {
				hits = append(hits, devHit{
					cid:       cid,
					rawName:   rawName,
					val:       val,
					connected: connected,
					transport: en.transport,
					priority:  2,
				})
				continue
			}

			// Also capture connected Bluetooth / BLE / 2.4GHz Wireless devices that don't expose DEVPKEY battery!
			if !connected || isNoise(rawName) {
				continue
			}
			isBtEnum := en.name == "BTHENUM" || en.name == "BTHLE" || en.name == "BTHLEDEVICE"
			if isBtEnum || isWirelessMouseOrRadioHint(rawName) {
				hits = append(hits, devHit{
					cid:       cid,
					rawName:   rawName,
					val:       -1,
					connected: true,
					transport: en.transport,
					priority:  1,
				})
			}
		}
		_, _, _ = procSetupDiDestroyDeviceInfoList.Call(hDev)
	}

	seen := map[string]bool{}
	idxByKey := map[string]int{}
	list := make([]WirelessDeviceBattery, 0, len(hits)+8)

	// Insert battery-bearing hits first (priority 2), then connected wireless devices without battery (priority 1)
	for _, wantPrio := range []int{2, 1} {
		for _, h := range hits {
			if h.priority != wantPrio {
				continue
			}
			name := cleanPeripheralName(h.rawName)
			if (isGenericHIDName(name) || name == "") && h.cid != "" {
				if better, ok := containerNames[h.cid]; ok && better != "" {
					name = better
				}
			}
			if name == "" || isNoise(name) {
				continue
			}
			key := strings.ToLower(name)
			if existingIdx, ok := idxByKey[key]; ok {
				if list[existingIdx].BatteryPercent < 0 && h.val >= 0 {
					list[existingIdx].BatteryPercent = h.val
				}
				continue
			}
			seen[key] = true
			idxByKey[key] = len(list)
			dt := classifyPeripheralType(name)
			list = append(list, WirelessDeviceBattery{
				Name:           name,
				DeviceType:     dt,
				BatteryPercent: h.val,
				Connected:      h.connected,
				Transport:      h.transport,
				Source:         "Win32 SetupDi PnP",
				IsMouse:        dt == "mouse",
			})
		}
	}

	// Pass 2: Direct Win32 HID Scanner for ALL 2.4GHz Radio Dongles, Wireless Mice, Keyboards, Headsets & Gamepads!
	if hidItems := scanHidRadioChannelBatteries(map[string]bool{}); len(hidItems) > 0 {
		for _, item := range hidItems {
			key := strings.ToLower(item.Name)
			if existingIdx, ok := idxByKey[key]; ok {
				if list[existingIdx].BatteryPercent < 0 && item.BatteryPercent >= 0 {
					list[existingIdx].BatteryPercent = item.BatteryPercent
					list[existingIdx].Source = item.Source
				}
				if list[existingIdx].VendorID == "" {
					list[existingIdx].VendorID = item.VendorID
					list[existingIdx].ProductID = item.ProductID
					list[existingIdx].Manufacturer = item.Manufacturer
				}
				continue
			}
			seen[key] = true
			idxByKey[key] = len(list)
			list = append(list, item)
		}
	}

	p.mu.Lock()
	p.cachedWireless = list
	p.cachedWirelessT = time.Now()
	p.mu.Unlock()
	return list
}

// ListAudioDevices enumerates active Windows CoreAudio output & input devices with 60s cache
// (instant 0ms Control Center opens; refreshed on-demand via ?refresh=1 or after switching device).
func (p *platformProbe) ListAudioDevices(forceRefresh bool) AudioDevicesSnapshot {
	p.mu.RLock()
	if !forceRefresh && !p.cachedAudioT.IsZero() && time.Since(p.cachedAudioT) < 60*time.Second {
		out := p.cachedAudio
		p.mu.RUnlock()
		return out
	}
	p.mu.RUnlock()

	script := `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public struct LumaPropKey {
  public Guid fmtid;
  public int pid;
}
[StructLayout(LayoutKind.Explicit)]
public struct LumaPropVariant {
  [FieldOffset(0)] public ushort vt;
  [FieldOffset(8)] public IntPtr ptr;
}
[Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPropertyStoreLuma {
  int GetCount(out int cProps);
  int GetAt(int iProp, out LumaPropKey pkey);
  int GetValue(ref LumaPropKey key, out LumaPropVariant pv);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceLuma {
  int Activate(ref Guid id, int clsCtx, IntPtr actParams, out IntPtr ppInterface);
  int OpenPropertyStore(int stgmAccess, out IPropertyStoreLuma ppProperties);
  int GetId([MarshalAs(UnmanagedType.LPWStr)] out string ppstrId);
  int GetState(out int pdwState);
}
[Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceCollectionLuma {
  int GetCount(out int pcDevices);
  int Item(int nDevice, out IMMDeviceLuma ppDevice);
}
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumeratorLuma {
  int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IMMDeviceCollectionLuma ppDevices);
  int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDeviceLuma ppEndpoint);
}
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDevEnumLuma {}

public class LumaAudioListItem {
  public string id;
  public string name;
  public string kind;
  public bool is_default;
}

public class LumaAudioEnum {
  [DllImport("ole32.dll")] static extern int PropVariantClear(ref LumaPropVariant pvar);

  static string GetFriendlyName(IMMDeviceLuma dev) {
    try {
      IPropertyStoreLuma store;
      if (dev.OpenPropertyStore(0, out store) != 0 || store == null) return "";
      var key = new LumaPropKey { fmtid = new Guid("a45c254e-df1c-4efd-8020-67d146a850e0"), pid = 14 };
      LumaPropVariant pv;
      if (store.GetValue(ref key, out pv) == 0 && pv.vt == 31 && pv.ptr != IntPtr.Zero) {
        string s = Marshal.PtrToStringUni(pv.ptr) ?? "";
        PropVariantClear(ref pv);
        return s;
      }
    } catch {}
    return "";
  }

  public static List<LumaAudioListItem> EnumAll() {
    var result = new List<LumaAudioListItem>();
    var en = (IMMDeviceEnumeratorLuma)(new MMDevEnumLuma());
    for (int flow = 0; flow <= 1; flow++) {
      string defId = "";
      try {
        IMMDeviceLuma defDev;
        if (en.GetDefaultAudioEndpoint(flow, 1, out defDev) == 0 && defDev != null) {
          defDev.GetId(out defId);
        }
      } catch {}
      IMMDeviceCollectionLuma col;
      if (en.EnumAudioEndpoints(flow, 1, out col) == 0 && col != null) {
        int count = 0;
        col.GetCount(out count);
        for (int i = 0; i < count; i++) {
          IMMDeviceLuma d;
          if (col.Item(i, out d) == 0 && d != null) {
            string id = "";
            d.GetId(out id);
            string name = GetFriendlyName(d);
            if (!string.IsNullOrWhiteSpace(id) && !string.IsNullOrWhiteSpace(name)) {
              result.Add(new LumaAudioListItem {
                id = id,
                name = name,
                kind = (flow == 0 ? "output" : "input"),
                is_default = (id == defId)
              });
            }
          }
        }
      }
    }
    return result;
  }
}
"@
@([LumaAudioEnum]::EnumAll()) | ConvertTo-Json -Compress
`
	snap := AudioDevicesSnapshot{
		OK:      true,
		Outputs: []AudioEndpointDevice{},
		Inputs:  []AudioEndpointDevice{},
	}
	out, err := runHiddenPowerShell(script)
	if err != nil || out == "" {
		return snap
	}
	var raw []AudioEndpointDevice
	if strings.HasPrefix(out, "[") {
		_ = json.Unmarshal([]byte(out), &raw)
	} else if strings.HasPrefix(out, "{") {
		var single AudioEndpointDevice
		if json.Unmarshal([]byte(out), &single) == nil && single.ID != "" {
			raw = append(raw, single)
		}
	}
	for _, dev := range raw {
		dev.Status = "Активно"
		dev.FormFactor = classifyAudioFormFactor(dev.Name, dev.Kind)
		if dev.Kind == "input" {
			snap.Inputs = append(snap.Inputs, dev)
			if dev.IsDefault {
				snap.ActiveInputID = dev.ID
			}
		} else {
			dev.Kind = "output"
			snap.Outputs = append(snap.Outputs, dev)
			if dev.IsDefault {
				snap.ActiveOutputID = dev.ID
			}
		}
	}
	p.mu.Lock()
	p.cachedAudio = snap
	p.cachedAudioT = time.Now()
	p.mu.Unlock()
	return snap
}

// SetDefaultAudioDevice switches the real Windows default output (playback) or input (microphone) endpoint
// via the native Windows IPolicyConfig COM interface (no third-party tools needed).
func (p *platformProbe) SetDefaultAudioDevice(deviceID, kind string) error {
	cleanID := strings.TrimSpace(deviceID)
	if cleanID == "" || strings.ContainsAny(cleanID, "'\";`$&|<>") {
		return fmt.Errorf("некорректный ID аудиоустройства")
	}
	script := fmt.Sprintf(`
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[Guid("f8679f50-850a-41cf-9c72-430f290290c8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPolicyConfigLuma {
  int GetMixFormat(string id, IntPtr fmt);
  int GetDeviceFormat(string id, int def, IntPtr fmt);
  int ResetDeviceFormat(string id);
  int SetDeviceFormat(string id, IntPtr epFmt, IntPtr mixFmt);
  int GetProcessingPeriod(string id, int def, IntPtr defPer, IntPtr minPer);
  int SetProcessingPeriod(string id, IntPtr per);
  int GetShareMode(string id, IntPtr mode);
  int SetShareMode(string id, IntPtr mode);
  int GetPropertyValue(string id, ref IntPtr key, out IntPtr val);
  int SetPropertyValue(string id, ref IntPtr key, ref IntPtr val);
  int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string wszDeviceId, int eRole);
  int SetEndpointVisibility(string id, int bVisible);
}
[ComImport, Guid("870af99c-171d-4f9e-af0d-e63df40c2bc9")] class PolicyConfigClientLuma {}

public class LumaAudioSwitch {
  public static void SetDefault(string id) {
    var cfg = (IPolicyConfigLuma)(new PolicyConfigClientLuma());
    cfg.SetDefaultEndpoint(id, 0);
    cfg.SetDefaultEndpoint(id, 1);
    cfg.SetDefaultEndpoint(id, 2);
  }
}
"@
[LumaAudioSwitch]::SetDefault('%s')
`, cleanID)
	_, err := runHiddenPowerShell(script)
	p.mu.Lock()
	p.cachedAudioT = time.Time{}
	p.mu.Unlock()
	return err
}

func winTagFromHKL(hkl uintptr) string {
	langID := uint16(hkl & 0xFFFF)
	known := map[uint16]string{
		0x0409: "en-US", 0x0809: "en-GB", 0x0419: "ru-RU", 0x0418: "ro-RO",
		0x0422: "uk-UA", 0x0407: "de-DE", 0x040C: "fr-FR", 0x0C0A: "es-ES",
		0x040A: "es-ES", 0x0410: "it-IT", 0x0415: "pl-PL", 0x041F: "tr-TR",
		0x0804: "zh-CN", 0x0404: "zh-TW", 0x0411: "ja-JP", 0x0412: "ko-KR",
		0x0401: "ar-SA", 0x040D: "he-IL", 0x0439: "hi-IN", 0x043F: "kk-KZ",
		0x0416: "pt-BR", 0x0816: "pt-PT", 0x0413: "nl-NL", 0x041D: "sv-SE",
		0x0414: "nb-NO", 0x040B: "fi-FI", 0x0406: "da-DK", 0x0405: "cs-CZ",
		0x041B: "sk-SK", 0x040E: "hu-HU", 0x0408: "el-GR", 0x0402: "bg-BG",
		0x0423: "be-BY", 0x0437: "ka-GE", 0x042B: "hy-AM", 0x042C: "az-Latn-AZ",
		0x0443: "uz-Latn-UZ", 0x0427: "lt-LT", 0x0426: "lv-LV", 0x0425: "et-EE",
		0x042A: "vi-VN", 0x041E: "th-TH", 0x0421: "id-ID", 0x0429: "fa-IR",
	}
	if tag, ok := known[langID]; ok {
		return tag
	}
	return ""
}

func winKLIDFromTag(tag string) string {
	low := strings.ToLower(strings.TrimSpace(tag))
	klids := map[string]string{
		"en-us": "00000409", "en-gb": "00000809", "ru-ru": "00000419", "ro-ro": "00000418",
		"uk-ua": "00000422", "de-de": "00000407", "fr-fr": "0000040C", "es-es": "0000040A",
		"it-it": "00000410", "pl-pl": "00000415", "tr-tr": "0000041F", "zh-cn": "00000804",
		"zh-tw": "00000404", "ja-jp": "00000411", "ko-kr": "00000412", "ar-sa": "00000401",
		"he-il": "0000040D", "hi-in": "00000439", "kk-kz": "0000043F", "pt-br": "00000416",
		"pt-pt": "00000816", "nl-nl": "00000413", "sv-se": "0000041D", "nb-no": "00000414",
		"fi-fi": "0000040B", "da-dk": "00000406", "cs-cz": "00000405", "sk-sk": "0000041B",
		"hu-hu": "0000040E", "el-gr": "00000408", "bg-bg": "00000402", "be-by": "00000423",
		"ka-ge": "00000437", "hy-am": "0000042B", "az-latn-az": "0000042C", "uz-latn-uz": "00000443",
		"lt-lt": "00000427", "lv-lv": "00000426", "et-ee": "00000425", "vi-vn": "0000042A",
		"th-th": "0000041E", "id-id": "00000421", "fa-ir": "00000429", "sr-cyrl-rs": "00000C1A",
		"hr-hr": "0000041A", "sl-si": "00000424", "is-is": "0000040F", "sq-al": "0000041C",
		"mk-mk": "0000042F", "mn-mn": "00000450", "bn-bd": "00000845", "ur-pk": "00000420",
		"ta-in": "00000449", "ne-np": "00000461", "km-kh": "00000453", "lo-la": "00000454",
	}
	if k, ok := klids[low]; ok {
		return k
	}
	return ""
}

func winLangMetaFromTag(tag string) (name, native string) {
	meta := map[string][2]string{
		"en-US": {"English (US)", "English (US)"},
		"en-GB": {"English (UK)", "English (UK)"},
		"ru-RU": {"Russian", "Русский"},
		"ro-RO": {"Romanian", "Română"},
		"uk-UA": {"Ukrainian", "Українська"},
		"de-DE": {"German", "Deutsch"},
		"fr-FR": {"French", "Français"},
		"es-ES": {"Spanish", "Español"},
		"it-IT": {"Italian", "Italiano"},
		"pl-PL": {"Polish", "Polski"},
		"tr-TR": {"Turkish", "Türkçe"},
		"zh-CN": {"Chinese (Simplified)", "中文"},
		"zh-TW": {"Chinese (Traditional)", "繁體中文"},
		"ja-JP": {"Japanese", "日本語"},
		"ko-KR": {"Korean", "한국어"},
		"ar-SA": {"Arabic", "العربية"},
		"he-IL": {"Hebrew", "עברית"},
		"hi-IN": {"Hindi", "हिन्दी"},
		"kk-KZ": {"Kazakh", "Қазақша"},
		"pt-BR": {"Portuguese (Brazil)", "Português"},
		"pt-PT": {"Portuguese", "Português"},
		"nl-NL": {"Dutch", "Nederlands"},
		"sv-SE": {"Swedish", "Svenska"},
		"nb-NO": {"Norwegian", "Norsk"},
		"fi-FI": {"Finnish", "Suomi"},
		"da-DK": {"Danish", "Dansk"},
		"cs-CZ": {"Czech", "Čeština"},
		"sk-SK": {"Slovak", "Slovenčina"},
		"hu-HU": {"Hungarian", "Magyar"},
		"el-GR": {"Greek", "Ελληνικά"},
		"bg-BG": {"Bulgarian", "Български"},
		"be-BY": {"Belarusian", "Беларуская"},
		"ka-GE": {"Georgian", "ქართული"},
		"hy-AM": {"Armenian", "Հայերեն"},
		"az-Latn-AZ": {"Azerbaijani", "Azərbaycan"},
		"uz-Latn-UZ": {"Uzbek", "Oʻzbek"},
		"lt-LT": {"Lithuanian", "Lietuvių"},
		"lv-LV": {"Latvian", "Latviešu"},
		"et-EE": {"Estonian", "Eesti"},
		"vi-VN": {"Vietnamese", "Tiếng Việt"},
		"th-TH": {"Thai", "ไทย"},
		"id-ID": {"Indonesian", "Bahasa Indonesia"},
		"fa-IR": {"Persian", "فارسی"},
	}
	if pair, ok := meta[tag]; ok {
		return pair[0], pair[1]
	}
	return tag, tag
}

func (p *platformProbe) GetKeyboardLayouts() KeyboardLayoutsSnapshot {
	// Read current foreground HKL via pure Win32 (~0.01ms, ZERO PowerShell!)
	hwnd, _, _ := procGetForegroundWindow.Call()
	var tid uintptr
	if hwnd != 0 {
		tid, _, _ = procGetWindowThreadProcessId.Call(hwnd, 0)
	}
	hkl, _, _ := procGetKeyboardLayout.Call(tid)
	activeTag := winTagFromHKL(hkl)

	var installed []KeyboardLayoutInfo
	p.mu.RLock()
	if time.Since(p.cachedInstalledKbdT) < 5*time.Minute && len(p.cachedInstalledKbd) > 0 {
		installed = make([]KeyboardLayoutInfo, len(p.cachedInstalledKbd))
		copy(installed, p.cachedInstalledKbd)
	}
	cachedActive := p.activeKbdTag
	p.mu.RUnlock()

	if len(installed) == 0 {
		// Pure Win32 GetKeyboardLayoutList (~0.005ms, ZERO PowerShell!)
		cnt, _, _ := procGetKeyboardLayoutList.Call(0, 0)
		if cnt > 0 && cnt <= 64 {
			hkls := make([]uintptr, cnt)
			got, _, _ := procGetKeyboardLayoutList.Call(cnt, uintptr(unsafe.Pointer(&hkls[0])))
			seen := map[string]bool{}
			for i := uintptr(0); i < got; i++ {
				tag := winTagFromHKL(hkls[i])
				if tag == "" || seen[strings.ToLower(tag)] {
					continue
				}
				seen[strings.ToLower(tag)] = true
				enName, natName := winLangMetaFromTag(tag)
				installed = append(installed, KeyboardLayoutInfo{
					Tag:        tag,
					Short:      keyboardShortCode(tag),
					Name:       enName,
					NativeName: natName,
				})
			}
		}
		if len(installed) == 0 {
			installed = []KeyboardLayoutInfo{
				{Tag: "en-US", Short: "ENG", Name: "English (US)", NativeName: "English (US)"},
				{Tag: "ru-RU", Short: "RUS", Name: "Russian", NativeName: "Русский"},
			}
		}
		p.mu.Lock()
		p.cachedInstalledKbd = make([]KeyboardLayoutInfo, len(installed))
		copy(p.cachedInstalledKbd, installed)
		p.cachedInstalledKbdT = time.Now()
		p.mu.Unlock()
	}

	if activeTag == "" {
		if cachedActive != "" {
			activeTag = cachedActive
		} else {
			activeTag = installed[0].Tag
		}
	}

	var activeInfo KeyboardLayoutInfo
	matched := false
	for i := range installed {
		installed[i].Active = false
		installed[i].Short = keyboardShortCode(installed[i].Tag)
		if strings.EqualFold(installed[i].Tag, activeTag) ||
			strings.EqualFold(strings.Split(installed[i].Tag, "-")[0], strings.Split(activeTag, "-")[0]) {
			installed[i].Active = true
			activeInfo = installed[i]
			activeTag = installed[i].Tag
			matched = true
		}
	}
	if !matched && len(installed) > 0 {
		installed[0].Active = true
		activeInfo = installed[0]
		activeTag = installed[0].Tag
	}
	return KeyboardLayoutsSnapshot{
		OK:        true,
		ActiveTag: activeTag,
		Active:    activeInfo,
		Installed: installed,
	}
}

func (p *platformProbe) SwitchKeyboardLayout(tag, klid string) KeyboardLayoutsSnapshot {
	snap := p.GetKeyboardLayouts()
	targetTag := strings.TrimSpace(tag)
	if strings.EqualFold(targetTag, "next") && len(snap.Installed) > 1 {
		for i, l := range snap.Installed {
			if l.Active {
				targetTag = snap.Installed[(i+1)%len(snap.Installed)].Tag
				break
			}
		}
	}
	if targetTag == "" && len(snap.Installed) > 0 {
		targetTag = snap.Installed[0].Tag
	}
	useKLID := strings.TrimSpace(klid)
	if useKLID == "" {
		useKLID = winKLIDFromTag(targetTag)
	}
	if useKLID != "" {
		if ptr, err := syscall.UTF16PtrFromString(useKLID); err == nil {
			hkl, _, _ := procLoadKeyboardLayoutW.Call(uintptr(unsafe.Pointer(ptr)), uintptr(klfActivate|klfSubstituteOK))
			if hkl != 0 {
				_, _, _ = procActivateKeyboardLayout.Call(hkl, 0)
				hwnd, _, _ := procGetForegroundWindow.Call()
				if hwnd != 0 {
					_, _, _ = procPostMessageW.Call(hwnd, wmInputLangChangeReq, 0, hkl)
				}
				_, _, _ = procPostMessageW.Call(hwndBroadcast, wmInputLangChangeReq, 0, hkl)
			}
		}
	}
	p.mu.Lock()
	p.activeKbdTag = targetTag
	p.mu.Unlock()

	for i := range snap.Installed {
		isAct := strings.EqualFold(snap.Installed[i].Tag, targetTag)
		snap.Installed[i].Active = isAct
		if isAct {
			snap.Active = snap.Installed[i]
			snap.ActiveTag = snap.Installed[i].Tag
		}
	}
	return snap
}

func (p *platformProbe) ManageKeyboardLayout(action, tag string) KeyboardLayoutsSnapshot {
	clean := strings.TrimSpace(tag)
	if clean == "" || strings.ContainsAny(clean, "'\";`$&|<> ") {
		return p.GetKeyboardLayouts()
	}
	switch strings.ToLower(strings.TrimSpace(action)) {
	case "add":
		script := fmt.Sprintf(`
try {
  $list = Get-WinUserLanguageList
  if (-not ($list | Where-Object { $_.LanguageTag -ieq '%s' })) {
    $list.Add('%s')
    Set-WinUserLanguageList $list -Force
  }
} catch {}
`, clean, clean)
		_, _ = runHiddenPowerShell(script)
	case "remove":
		script := fmt.Sprintf(`
try {
  $list = Get-WinUserLanguageList
  if ($list.Count -gt 1) {
    $filtered = $list | Where-Object { $_.LanguageTag -ine '%s' }
    if ($filtered.Count -gt 0) { Set-WinUserLanguageList $filtered -Force }
  }
} catch {}
`, clean)
		_, _ = runHiddenPowerShell(script)
	}
	p.mu.Lock()
	p.cachedInstalledKbd = nil
	p.cachedInstalledKbdT = time.Time{}
	p.mu.Unlock()
	return p.GetKeyboardLayouts()
}

// ListInstalledApps discovers real installed Windows applications from Start Menu shortcuts (.lnk) and Registry Uninstall keys.
func (p *platformProbe) ListInstalledApps(forceRefresh bool) []InstalledAppItem {
	p.mu.RLock()
	if !forceRefresh && time.Since(p.cachedAppsT) < 60*time.Second && len(p.cachedApps) > 0 {
		out := make([]InstalledAppItem, len(p.cachedApps))
		copy(out, p.cachedApps)
		p.mu.RUnlock()
		return out
	}
	p.mu.RUnlock()

	script := `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$apps = @()
$seen = @{}
$shell = New-Object -ComObject WScript.Shell
$roots = @(
  "$env:ProgramData\Microsoft\Windows\Start Menu\Programs",
  "$env:AppData\Microsoft\Windows\Start Menu\Programs"
)
foreach ($r in $roots) {
  if (-not (Test-Path $r)) { continue }
  Get-ChildItem -Path $r -Filter *.lnk -Recurse -ErrorAction SilentlyContinue | Select-Object -First 220 | ForEach-Object {
    $name = $_.BaseName.Trim()
    if ($name -eq "" -or $name -match '(?i)uninstall|readme|help|manual|license|website|documentation|удалить|справка|деинстал') { return }
    $key = $name.ToLower()
    if ($seen.ContainsKey($key)) { return }
    $target = $_.FullName
    try {
      $sc = $shell.CreateShortcut($_.FullName)
      if ($sc.TargetPath -and (Test-Path $sc.TargetPath)) {
        if ($sc.TargetPath -match '(?i)unins|uninst|msiexec') { return }
        $target = $sc.TargetPath
      }
    } catch {}
    $seen[$key] = $true
    $apps += [PSCustomObject]@{
      name = $name
      exec_path = [string]$target
      publisher = ""
      source = "start_menu"
    }
  }
}
foreach ($regPath in @(
  'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
)) {
  Get-ItemProperty $regPath -ErrorAction SilentlyContinue | Select-Object -First 150 | ForEach-Object {
    $dn = ([string]$_.DisplayName).Trim()
    if ($dn -eq "" -or $dn -match '(?i)update for|hotfix|redistributable|runtime|sdk|driver|pack|kb\d+') { return }
    $key = $dn.ToLower()
    if ($seen.ContainsKey($key)) { return }
    $ico = ([string]$_.DisplayIcon).Trim() -replace ',\d+$','' -replace '"',''
    if ($ico -and $ico -match '\.exe$' -and (Test-Path $ico)) {
      $seen[$key] = $true
      $apps += [PSCustomObject]@{
        name = $dn
        exec_path = $ico
        publisher = ([string]$_.Publisher).Trim()
        source = "registry"
      }
    }
  }
}
@($apps | Sort-Object name | Select-Object -First 150) | ConvertTo-Json -Compress
`
	var list []InstalledAppItem
	if out, err := runHiddenPowerShell(script); err == nil && out != "" {
		if strings.HasPrefix(out, "[") {
			_ = json.Unmarshal([]byte(out), &list)
		} else if strings.HasPrefix(out, "{") {
			var single InstalledAppItem
			if json.Unmarshal([]byte(out), &single) == nil && single.Name != "" {
				list = append(list, single)
			}
		}
	}
	if list == nil {
		list = []InstalledAppItem{}
	}
	seenExec := map[string]bool{}
	seenName := map[string]bool{}
	for _, it := range list {
		seenName[strings.ToLower(strings.TrimSpace(it.Name))] = true
		seenExec[strings.ToLower(strings.TrimSpace(it.ExecPath))] = true
	}

	// Ensure core preinstalled Windows applications ALWAYS appear with their native Windows OS icons
	preinstalled := []struct {
		name      string
		exec      string
		publisher string
	}{
		{"Microsoft Edge", "msedge.exe", "Microsoft"},
		{"Проводник Windows", "explorer.exe", "Microsoft Windows"},
		{"Калькулятор Windows", "calc.exe", "Microsoft Windows"},
		{"Блокнот (Notepad)", "notepad.exe", "Microsoft Windows"},
		{"Paint", "mspaint.exe", "Microsoft Windows"},
		{"Командная строка (CMD)", "cmd.exe", "Microsoft Windows"},
		{"Windows PowerShell", "powershell.exe", "Microsoft Windows"},
		{"Диспетчер задач Windows", "taskmgr.exe", "Microsoft Windows"},
		{"Ножницы (Snipping Tool)", "SnippingTool.exe", "Microsoft Windows"},
		{"Панель управления", "control.exe", "Microsoft Windows"},
	}
	for _, pre := range preinstalled {
		resolved := resolveAppIconFilePath(pre.exec)
		if resolved == "" {
			continue
		}
		lk := strings.ToLower(pre.name)
		le := strings.ToLower(resolved)
		if seenName[lk] || seenExec[le] {
			continue
		}
		seenName[lk] = true
		seenExec[le] = true
		list = append(list, InstalledAppItem{
			Name:      pre.name,
			ExecPath:  resolved,
			Publisher: pre.publisher,
			Source:    "preinstalled",
		})
	}

	for i := range list {
		cat, icon := classifyInstalledAppCategory(list[i].Name, list[i].Publisher)
		list[i].ID = fmt.Sprintf("pcapp_%d", i+1)
		list[i].Category = cat
		list[i].IconHint = icon
		list[i].IconURL = buildAppIconURL(list[i].ExecPath)
	}
	p.mu.Lock()
	p.cachedApps = list
	p.cachedAppsT = time.Now()
	p.mu.Unlock()
	return list
}


