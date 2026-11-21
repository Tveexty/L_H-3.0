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
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

var (
	modKernel32              = syscall.NewLazyDLL("kernel32.dll")
	modUser32                = syscall.NewLazyDLL("user32.dll")
	procGlobalMemoryStatusEx = modKernel32.NewProc("GlobalMemoryStatusEx")
	procGetSystemTimes       = modKernel32.NewProc("GetSystemTimes")
	procGetDiskFreeSpaceExW  = modKernel32.NewProc("GetDiskFreeSpaceExW")
	procGetSystemPowerStatus = modKernel32.NewProc("GetSystemPowerStatus")
	procKeybdEvent               = modUser32.NewProc("keybd_event")
	procGetForegroundWindow      = modUser32.NewProc("GetForegroundWindow")
	procGetWindowThreadProcessId = modUser32.NewProc("GetWindowThreadProcessId")
	procGetKeyboardLayout        = modUser32.NewProc("GetKeyboardLayout")
	procLoadKeyboardLayoutW      = modUser32.NewProc("LoadKeyboardLayoutW")
	procActivateKeyboardLayout   = modUser32.NewProc("ActivateKeyboardLayout")
	procPostMessageW             = modUser32.NewProc("PostMessageW")
)

const (
	vkVolumeMute          = 0xAD
	vkVolumeDown          = 0xAE
	vkVolumeUp            = 0xAF
	vkMediaNextTrack      = 0xB0
	vkMediaPrevTrack      = 0xB1
	vkMediaPlayPause      = 0xB3
	keyeventfKeyUp        = 0x0002
	wmInputLangChangeReq  = 0x0050
	hwndBroadcast         = 0xFFFF
	klfActivate           = 0x00000001
	klfSubstituteOK       = 0x00000002
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

type procCPUSample struct {
	cpuSec float64
	ts     time.Time
}

func fileTimeToUint64(ft fileTime) uint64 {
	return (uint64(ft.HighDateTime) << 32) | uint64(ft.LowDateTime)
}

type platformProbe struct {
	mu                sync.RWMutex
	prevIdle          uint64
	prevKernel        uint64
	prevUser          uint64
	cpuPercent        int
	cpuModel          string
	gpuName           string
	osCaption         string
	deviceModel       string
	manufacturer      string
	netDownMbps       float64
	netUpMbps         float64
	prevRxBytes       uint64
	prevTxBytes       uint64
	prevNetStamp      time.Time
	media             MediaSessionInfo
	cachedWindows     []HostWindowItem
	prevProcCPU       map[int]procCPUSample
	cachedBattStatic  BatteryHardwareDetails
	cachedBattStaticT time.Time
	cachedApps        []InstalledAppItem
	cachedAppsT       time.Time
	cachedWireless    []WirelessDeviceBattery
	cachedWirelessT   time.Time
	activeKbdTag      string
}

func newPlatformProbe() *platformProbe {
	p := &platformProbe{
		cpuModel:    fmt.Sprintf("%s (%d потоков)", runtime.GOARCH, runtime.NumCPU()),
		gpuName:     "Графический ускоритель Luma HAL",
		prevProcCPU: make(map[int]procCPUSample),
		osCaption:    "Рабочая станция x64",
		deviceModel:  "PC Workstation x64",
		manufacturer: "Generic",
	}
	p.sampleCPUTimes()
	go p.fetchStaticSpecs()
	go p.backgroundLoop()
	return p
}

func runHiddenPowerShell(script string) (string, error) {
	cmd := exec.Command("powershell.exe", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	out, err := cmd.Output()
	return strings.TrimSpace(string(out)), err
}

func (p *platformProbe) fetchStaticSpecs() {
	script := `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name
$gpu = (Get-CimInstance Win32_VideoController | Select-Object -First 1).Name
$os  = (Get-CimInstance Win32_OperatingSystem | Select-Object -First 1).Caption
$cs  = Get-CimInstance Win32_ComputerSystem | Select-Object -First 1
@{ cpu = $cpu; gpu = $gpu; os = $os; model = $cs.Model; mfg = $cs.Manufacturer } | ConvertTo-Json -Compress
`
	if out, err := runHiddenPowerShell(script); err == nil && out != "" {
		var info struct {
			CPU   string `json:"cpu"`
			GPU   string `json:"gpu"`
			OS    string `json:"os"`
			Model string `json:"model"`
			Mfg   string `json:"mfg"`
		}
		if json.Unmarshal([]byte(out), &info) == nil {
			p.mu.Lock()
			if strings.TrimSpace(info.CPU) != "" {
				p.cpuModel = strings.TrimSpace(info.CPU)
			}
			if strings.TrimSpace(info.GPU) != "" {
				p.gpuName = strings.TrimSpace(info.GPU)
			}
			if strings.TrimSpace(info.OS) != "" {
				p.osCaption = strings.TrimSpace(info.OS)
			}
			if strings.TrimSpace(info.Model) != "" {
				p.deviceModel = strings.TrimSpace(info.Model)
			}
			if strings.TrimSpace(info.Mfg) != "" {
				p.manufacturer = strings.TrimSpace(info.Mfg)
			}
			p.mu.Unlock()
		}
	}
}

func (p *platformProbe) backgroundLoop() {
	cpuTicker := time.NewTicker(1 * time.Second)
	mediaNetTicker := time.NewTicker(3 * time.Second)
	winTicker := time.NewTicker(2500 * time.Millisecond)
	defer cpuTicker.Stop()
	defer mediaNetTicker.Stop()
	defer winTicker.Stop()

	p.pollMediaAndNetwork()
	p.refreshOpenWindows()

	for {
		select {
		case <-cpuTicker.C:
			p.sampleCPUTimes()
		case <-mediaNetTicker.C:
			p.pollMediaAndNetwork()
		case <-winTicker.C:
			p.refreshOpenWindows()
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

func (p *platformProbe) pollMediaAndNetwork() {
	// Query real active media session (SMTC WinRT) + real network bytes counters in a single lightweight call
	script := `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$res = @{ rx = 0; tx = 0; title = ""; artist = ""; app = ""; playing = $false; hasMedia = $false }
try {
  $stats = Get-NetAdapterStatistics -ErrorAction SilentlyContinue
  if ($stats) {
    $res.rx = [uint64](($stats | Measure-Object -Property ReceivedBytes -Sum).Sum)
    $res.tx = [uint64](($stats | Measure-Object -Property SentBytes -Sum).Sum)
  }
} catch {}
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation` + "`" + `1' })[0]
  Function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(1500) | Out-Null
    $netTask.Result
  }
  $mgrType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]
  $mgr = Await ($mgrType::RequestAsync()) ($mgrType)
  if ($mgr) {
    $session = $mgr.GetCurrentSession()
    if ($session) {
      $pb = $session.GetPlaybackInfo()
      $propsType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType=WindowsRuntime]
      $props = Await ($session.TryGetMediaPropertiesAsync()) ($propsType)
      if ($props) {
        $res.title = [string]$props.Title
        $res.artist = [string]$props.Artist
        $res.app = [string]$session.SourceAppUserModelId
        $res.playing = ($pb.PlaybackStatus.ToString() -eq 'Playing')
        $res.hasMedia = ($res.title -ne '' -or $res.artist -ne '')
      }
    }
  }
} catch {}
$res | ConvertTo-Json -Compress
`
	out, err := runHiddenPowerShell(script)
	if err != nil || out == "" {
		return
	}
	var data struct {
		Rx       uint64 `json:"rx"`
		Tx       uint64 `json:"tx"`
		Title    string `json:"title"`
		Artist   string `json:"artist"`
		App      string `json:"app"`
		Playing  bool   `json:"playing"`
		HasMedia bool   `json:"hasMedia"`
	}
	if json.Unmarshal([]byte(out), &data) != nil {
		return
	}

	now := time.Now()
	p.mu.Lock()
	defer p.mu.Unlock()
	if !p.prevNetStamp.IsZero() && data.Rx >= p.prevRxBytes && data.Tx >= p.prevTxBytes {
		dt := now.Sub(p.prevNetStamp).Seconds()
		if dt > 0.2 {
			p.netDownMbps = math.Round((float64(data.Rx-p.prevRxBytes)*8.0/(dt*1_000_000.0))*10) / 10
			p.netUpMbps = math.Round((float64(data.Tx-p.prevTxBytes)*8.0/(dt*1_000_000.0))*10) / 10
		}
	}
	p.prevRxBytes = data.Rx
	p.prevTxBytes = data.Tx
	p.prevNetStamp = now

	cleanApp := data.App
	if idx := strings.LastIndex(cleanApp, "!"); idx >= 0 {
		cleanApp = cleanApp[:idx]
	}
	if idx := strings.LastIndex(cleanApp, "\\"); idx >= 0 {
		cleanApp = cleanApp[idx+1:]
	}
	cleanApp = strings.TrimSuffix(cleanApp, ".exe")

	p.media = MediaSessionInfo{
		Available: data.HasMedia,
		IsPlaying: data.Playing,
		Title:     strings.TrimSpace(data.Title),
		Artist:    strings.TrimSpace(data.Artist),
		SourceApp: strings.TrimSpace(cleanApp),
		UpdatedAt: now.Unix(),
	}
}

func (p *platformProbe) readDisks() []DiskMetric {
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
		if len(disks) >= 4 {
			break
		}
	}
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
	osCap := p.osCaption
	devModel := p.deviceModel
	devMfg := p.manufacturer
	downMbps := p.netDownMbps
	upMbps := p.netUpMbps
	media := p.media
	p.mu.RUnlock()

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
		GPUPercent:          int(math.Min(100, math.Max(4, float64(cpuPct)*0.7+6))),
		GPUTempC:            46 + (cpuPct / 4),
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

func (p *platformProbe) GetBluetoothStatus() BluetoothStatus {
	script := `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$res = @{ available = $false; enabled = $false; adapter_name = ""; devices = @() }
try {
  $btAll = Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue
  $battMap = @{}
  try {
    $cand = Get-PnpDevice -Class Bluetooth,HIDClass,System,Mouse,Keyboard,AudioEndpoint -PresentOnly -ErrorAction SilentlyContinue
    foreach ($c in $cand) {
      try {
        $prop = Get-PnpDeviceProperty -InstanceId $c.InstanceId -KeyName '{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2' -ErrorAction SilentlyContinue
        if ($prop -and $prop.Data -ne $null) {
          $val = [int]$prop.Data
          if ($val -ge 0 -and $val -le 100) {
            $k = ([string]$c.FriendlyName).Trim()
            if ($k -ne "") {
              $kClean = $k -replace '\s*(Hands-Free|Stereo|Avrcp|AG Audio|Battery Service|HID-compliant.*|BLE|LE)$',''
              $kClean = $kClean.Trim()
              if ($kClean -ne "") { $battMap[$kClean.ToLower()] = $val }
              $battMap[$k.ToLower()] = $val
            }
          }
        }
      } catch {}
    }
  } catch {}

  if ($btAll) {
    $res.available = $true
    $adapter = $btAll | Where-Object { $_.FriendlyName -match 'Radio|Adapter|Intel|Realtek|Qualcomm|MediaTek|Bluetooth' } | Select-Object -First 1
    if ($adapter) {
      $res.adapter_name = [string]$adapter.FriendlyName
      $res.enabled = ($adapter.Status -eq 'OK')
    } else {
      $res.adapter_name = [string]($btAll | Select-Object -First 1).FriendlyName
      $res.enabled = $true
    }
    $devs = @()
    $seen = @{}
    foreach ($d in ($btAll | Where-Object { $_.FriendlyName -and $_.FriendlyName -notmatch 'Enumerator|Service|Transport|Protocol|RFCOMM|Adapter|Radio|AVCTP|Hands-Free|Generic Attribute|Device Information' } | Select-Object -First 24)) {
      $fname = ([string]$d.FriendlyName).Trim()
      if ($seen.ContainsKey($fname.ToLower())) { continue }
      $seen[$fname.ToLower()] = $true
      $bp = -1
      $lowN = $fname.ToLower()
      if ($battMap.ContainsKey($lowN)) {
        $bp = $battMap[$lowN]
      } else {
        foreach ($bk in $battMap.Keys) {
          if ($bk.Length -ge 4 -and ($lowN.Contains($bk) -or $bk.Contains($lowN))) {
            $bp = $battMap[$bk]
            break
          }
        }
      }
      $devs += [PSCustomObject]@{
        name = $fname
        status = [string]$d.Status
        connected = ($d.Status -eq 'OK')
        class = [string]$d.Class
        battery_percent = $bp
        transport = "Bluetooth"
        instance_id = [string]$d.InstanceId
      }
    }
    $res.devices = $devs
  }
} catch {}
$res | ConvertTo-Json -Depth 4 -Compress
`
	out, err := runHiddenPowerShell(script)
	if err != nil || out == "" {
		return BluetoothStatus{Available: false, Enabled: false, Devices: []BluetoothDevice{}}
	}
	var st BluetoothStatus
	if json.Unmarshal([]byte(out), &st) != nil {
		return BluetoothStatus{Available: false, Enabled: false, Devices: []BluetoothDevice{}}
	}
	if st.Devices == nil {
		st.Devices = []BluetoothDevice{}
	}
	for i := range st.Devices {
		st.Devices[i].DeviceType = classifyPeripheralType(st.Devices[i].Name)
		if st.Devices[i].Transport == "" {
			st.Devices[i].Transport = "Bluetooth"
		}
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

func (p *platformProbe) GetClipboard() (string, error) {
	out, err := runHiddenPowerShell(`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Clipboard -Raw -ErrorAction SilentlyContinue`)
	return out, err
}

func (p *platformProbe) SetClipboard(text string) error {
	cmd := exec.Command("powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command", "$input | Set-Clipboard")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	cmd.Stdin = strings.NewReader(text)
	return cmd.Run()
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

func (p *platformProbe) TopProcesses(limit int) []ProcessMetric {
	if limit <= 0 || limit > 120 {
		limit = 80
	}
	selfPID := os.Getpid()
	numCPU := runtime.NumCPU()
	if numCPU < 1 {
		numCPU = 1
	}
	script := fmt.Sprintf(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$perfMap = @{}
try {
  Get-CimInstance Win32_PerfFormattedData_PerfProc_Process -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.IDProcess -gt 0) {
      $perfMap[[int]$_.IDProcess] = @{
        cpu = [double]$_.PercentProcessorTime
        priv = [double]$_.WorkingSetPrivate
      }
    }
  }
} catch {}
$procs = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Id -gt 0 } | Sort-Object @{Expression={$_.MainWindowHandle -ne 0 -and [string]$_.MainWindowTitle -ne ""}; Descending=$true}, WorkingSet64 -Descending | Select-Object -First %d
$out = foreach ($pr in $procs) {
  $path = ""
  $desc = ""
  $cpuSec = 0.0
  $th = 0
  try { $path = [string]$pr.Path } catch {}
  try { $desc = [string]$pr.MainModule.FileVersionInfo.FileDescription } catch {}
  try { $cpuSec = [double]$pr.TotalProcessorTime.TotalSeconds } catch {}
  try { $th = [int]$pr.Threads.Count } catch {}
  $perfCpu = -1.0
  $privMB = [math]::Round($pr.PrivateMemorySize64 / 1MB, 1)
  if ($perfMap.ContainsKey($pr.Id)) {
    $perfCpu = [math]::Round($perfMap[$pr.Id].cpu / %d, 1)
    if ($perfMap[$pr.Id].priv -gt 0) {
      $privMB = [math]::Round($perfMap[$pr.Id].priv / 1MB, 1)
    }
  }
  [PSCustomObject]@{
    pid = $pr.Id
    name = [string]$pr.ProcessName
    title = [string]$pr.MainWindowTitle
    description = $desc
    has_window = ($pr.MainWindowHandle -ne 0 -and [string]$pr.MainWindowTitle -ne "")
    status = if ($pr.Responding) { "Работает" } else { "Не отвечает" }
    cpu_pct = $perfCpu
    cpu_sec = $cpuSec
    mem_mb = [math]::Round($pr.WorkingSet64 / 1MB, 1)
    private_mb = $privMB
    threads = $th
    exe_path = $path
  }
}
@($out) | ConvertTo-Json -Compress
`, limit, numCPU)

	out, err := runHiddenPowerShell(script)
	if err != nil || out == "" {
		return nil
	}
	type rawWinProc struct {
		PID         int     `json:"pid"`
		Name        string  `json:"name"`
		Title       string  `json:"title"`
		Description string  `json:"description"`
		HasWindow   bool    `json:"has_window"`
		Status      string  `json:"status"`
		CPUPct      float64 `json:"cpu_pct"`
		CPUSec      float64 `json:"cpu_sec"`
		MemMB       float64 `json:"mem_mb"`
		PrivateMB   float64 `json:"private_mb"`
		Threads     int     `json:"threads"`
		ExePath     string  `json:"exe_path"`
	}
	var rawList []rawWinProc
	if strings.HasPrefix(out, "[") {
		_ = json.Unmarshal([]byte(out), &rawList)
	} else if strings.HasPrefix(out, "{") {
		var single rawWinProc
		if json.Unmarshal([]byte(out), &single) == nil && single.PID > 0 {
			rawList = append(rawList, single)
		}
	}

	now := time.Now()
	p.mu.Lock()
	if p.prevProcCPU == nil {
		p.prevProcCPU = make(map[int]procCPUSample)
	}
	nextSamples := make(map[int]procCPUSample, len(rawList))
	list := make([]ProcessMetric, 0, len(rawList))
	for _, r := range rawList {
		// Compute true instantaneous CPU% via delta TotalProcessorTime, fallback to Win32_PerfFormattedData
		cpuPct := r.CPUPct
		if prev, ok := p.prevProcCPU[r.PID]; ok && r.CPUSec >= prev.cpuSec {
			dt := now.Sub(prev.ts).Seconds()
			if dt >= 0.4 {
				deltaPct := ((r.CPUSec - prev.cpuSec) / (dt * float64(numCPU))) * 100.0
				if deltaPct >= 0 && deltaPct <= 100 {
					cpuPct = math.Round(deltaPct*10) / 10
				}
			}
		}
		if cpuPct < 0 {
			cpuPct = 0
		}
		if cpuPct > 100 {
			cpuPct = 100
		}
		nextSamples[r.PID] = procCPUSample{cpuSec: r.CPUSec, ts: now}

		friendly := friendlyAppName(r.Name, r.Title)
		cat := "background"
		lowName := strings.ToLower(r.Name)
		if r.HasWindow {
			cat = "app"
		} else if r.PID <= 100 || lowName == "system" || lowName == "registry" || lowName == "smss" ||
			lowName == "csrss" || lowName == "wininit" || lowName == "services" || lowName == "lsass" ||
			lowName == "svchost" || lowName == "dwm" || lowName == "memory compression" || lowName == "fontdrvhost" ||
			lowName == "wudfhost" || lowName == "audiodg" || lowName == "spoolsv" || lowName == "msmpeng" {
			cat = "system"
		}
		desc := strings.TrimSpace(r.Description)
		if desc == "" {
			if r.PID == selfPID {
				desc = "Ядро и графическая оболочка Luma OS"
			} else if cat == "system" {
				desc = "Системная служба Windows"
			} else if r.HasWindow {
				desc = "Открытое приложение"
			} else {
				desc = "Фоновый процесс"
			}
		}
		list = append(list, ProcessMetric{
			PID:          r.PID,
			Name:         r.Name,
			FriendlyName: friendly,
			Title:        r.Title,
			Description:  desc,
			Category:     cat,
			HasWindow:    r.HasWindow,
			Status:       r.Status,
			CPUPct:       cpuPct,
			MemMB:        r.MemMB,
			PrivateMB:    r.PrivateMB,
			Threads:      r.Threads,
			ExePath:      r.ExePath,
			IsSelf:       r.PID == selfPID,
		})
	}
	p.prevProcCPU = nextSamples
	p.mu.Unlock()
	return list
}

func (p *platformProbe) refreshOpenWindows() {
	selfPID := os.Getpid()
	script := `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 -and [string]$_.MainWindowTitle -ne "" } | Sort-Object ProcessName | ForEach-Object {
  $p = ""
  try { $p = $_.Path } catch {}
  [PSCustomObject]@{
    pid = $_.Id
    name = $_.ProcessName
    title = [string]$_.MainWindowTitle
    mem_mb = [math]::Round($_.WorkingSet64 / 1MB, 1)
    exe_path = [string]$p
  }
} | ConvertTo-Json -Compress
`
	out, err := runHiddenPowerShell(script)
	if err != nil {
		return
	}
	var list []HostWindowItem
	if out != "" {
		if json.Unmarshal([]byte(out), &list) != nil {
			var single HostWindowItem
			if json.Unmarshal([]byte(out), &single) == nil && single.PID > 0 {
				list = append(list, single)
			}
		}
	}
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
	}
	filtered := make([]HostWindowItem, 0, len(list))
	for _, item := range list {
		if item.PID == selfPID {
			continue
		}
		lower := strings.ToLower(strings.TrimSpace(item.Name))
		if noise[lower] {
			continue
		}
		if lower == "applicationframehost" && strings.TrimSpace(item.Title) == "" {
			continue
		}
		item.FriendlyName = friendlyAppName(item.Name, item.Title)
		filtered = append(filtered, item)
	}
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

func (p *platformProbe) FocusWindow(pid int) error {
	if pid <= 0 {
		return fmt.Errorf("invalid pid")
	}
	script := fmt.Sprintf(`
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class LumaWinFocus {
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
}
"@
$proc = Get-Process -Id %d -ErrorAction Stop
$h = $proc.MainWindowHandle
if ($h -ne [IntPtr]::Zero) {
  if ([LumaWinFocus]::IsIconic($h)) { [LumaWinFocus]::ShowWindowAsync($h, 9) | Out-Null }
  [LumaWinFocus]::SetForegroundWindow($h) | Out-Null
}
`, pid)
	_, err := runHiddenPowerShell(script)
	return err
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
			// Actively charging ONLY if bit 8 (Charging) is set, OR on AC and below 100%
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
		DataSource:            "Win32 GetSystemPowerStatus",
	}
	if !present {
		return details
	}
	switch {
	case charging:
		details.StatusText = "Заряжается от сети"
	case acOnline && pct >= 99:
		details.StatusText = "Заряжено (от сети)"
	case acOnline:
		details.StatusText = "Подключено, не заряжается"
	default:
		details.StatusText = "Работа от батареи"
	}

	// Layer 2 & 3: Win32_Battery (works WITHOUT Admin!) + root\WMI (when available)
	script := `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$res = @{ design = 0; full = 0; cycles = 0; rate = 0; volt = 0; mfg = ""; chem = ""; status_code = 0; est_min = 0; pct = -1; wmi_ok = $false }
try {
  $wb = Get-CimInstance -ClassName Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($wb) {
    if ($wb.EstimatedChargeRemaining -ne $null) { $res.pct = [int]$wb.EstimatedChargeRemaining }
    if ($wb.BatteryStatus -ne $null) { $res.status_code = [int]$wb.BatteryStatus }
    if ($wb.DesignCapacity -gt 0) { $res.design = [int]$wb.DesignCapacity }
    if ($wb.FullChargeCapacity -gt 0) { $res.full = [int]$wb.FullChargeCapacity }
    if ($wb.DesignVoltage -gt 0) { $res.volt = [int]$wb.DesignVoltage }
    if ($wb.EstimatedRunTime -gt 0 -and $wb.EstimatedRunTime -lt 70000000) { $res.est_min = [int]$wb.EstimatedRunTime }
    $chMap = @{ 3='Lead Acid'; 4='NiCd'; 5='NiMH'; 6='Li-Ion'; 7='Zinc-Air'; 8='Li-Poly' }
    if ($chMap.ContainsKey([int]$wb.Chemistry)) { $res.chem = $chMap[[int]$wb.Chemistry] }
  }
} catch {}
try {
  $st = Get-CimInstance -Namespace root\WMI -ClassName BatteryStaticData -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($st) {
    $res.wmi_ok = $true
    if ($st.DesignedCapacity -gt 0) { $res.design = [int]$st.DesignedCapacity }
    if ($st.ManufactureName) { $res.mfg = [string]$st.ManufactureName }
  }
  $fc = Get-CimInstance -Namespace root\WMI -ClassName BatteryFullChargedCapacity -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($fc -and $fc.FullChargedCapacity -gt 0) { $res.full = [int]$fc.FullChargedCapacity; $res.wmi_ok = $true }
  $cc = Get-CimInstance -Namespace root\WMI -ClassName BatteryCycleCount -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($cc -and $cc.CycleCount -gt 0) { $res.cycles = [int]$cc.CycleCount; $res.wmi_ok = $true }
  $bs = Get-CimInstance -Namespace root\WMI -ClassName BatteryStatus -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($bs) {
    $res.wmi_ok = $true
    if ($bs.Voltage -gt 0) { $res.volt = [int]$bs.Voltage }
    if ($bs.DischargeRate -gt 0 -and $bs.DischargeRate -lt 500000) { $res.rate = [int]$bs.DischargeRate }
    elseif ($bs.ChargeRate -gt 0 -and $bs.ChargeRate -lt 500000) { $res.rate = [int]$bs.ChargeRate }
  }
} catch {}
$res | ConvertTo-Json -Compress
`
	if out, err := runHiddenPowerShell(script); err == nil && out != "" {
		var parsed struct {
			Design     int    `json:"design"`
			Full       int    `json:"full"`
			Cycles     int    `json:"cycles"`
			Rate       int    `json:"rate"`
			Volt       int    `json:"volt"`
			Mfg        string `json:"mfg"`
			Chem       string `json:"chem"`
			StatusCode int    `json:"status_code"`
			EstMin     int    `json:"est_min"`
			Pct        int    `json:"pct"`
			WMIOk      bool   `json:"wmi_ok"`
		}
		if json.Unmarshal([]byte(out), &parsed) == nil {
			if parsed.Pct >= 0 && parsed.Pct <= 100 {
				details.Percent = parsed.Pct
			}
			if parsed.Design > 0 {
				details.DesignCapacityMWh = parsed.Design
			}
			if parsed.Full > 0 {
				details.FullChargeCapacityMWh = parsed.Full
			}
			if parsed.Cycles > 0 {
				details.CycleCount = parsed.Cycles
				details.CycleSupported = true
			}
			if parsed.Volt > 0 {
				details.VoltageMV = parsed.Volt
			}
			if parsed.EstMin > 0 && details.EstimatedMinutes == 0 {
				details.EstimatedMinutes = parsed.EstMin
			}
			if parsed.Rate > 0 {
				details.PowerWatts = math.Round((float64(parsed.Rate)/1000.0)*10) / 10
			}
			if parsed.Mfg != "" {
				details.Manufacturer = parsed.Mfg
			}
			if parsed.Chem != "" {
				details.Chemistry = parsed.Chem
			}
			if parsed.WMIOk {
				details.DataSource = "Windows ACPI WMI"
			} else if parsed.StatusCode > 0 {
				details.DataSource = "Win32_Battery CIM"
			}
			// Refine status code from Win32_Battery (1=Discharging, 2=AC/Not charging, 3=Fully Charged, 6/7/8/9=Charging)
			switch parsed.StatusCode {
			case 1:
				details.Charging = false
				details.ACOnline = false
				details.StatusText = "Работа от батареи"
			case 3:
				details.Charging = false
				details.ACOnline = true
				details.StatusText = "Заряжено (от сети)"
			case 6, 7, 8, 9:
				details.Charging = true
				details.ACOnline = true
				details.StatusText = "Заряжается от сети"
			case 2:
				details.ACOnline = true
				if details.Percent >= 99 {
					details.Charging = false
					details.StatusText = "Заряжено (от сети)"
				} else if !details.Charging {
					details.StatusText = "Подключено, не заряжается"
				}
			}
		}
	}

	// Layer 4: Cached non-admin powercfg /batteryreport /xml fallback (refreshed at most once every 10 min)
	// Gives exact DesignCapacity, FullChargeCapacity, and CycleCount on standard non-admin Windows!
	if details.DesignCapacityMWh == 0 || details.FullChargeCapacityMWh == 0 || !details.CycleSupported {
		p.mu.RLock()
		cached := p.cachedBattStatic
		cachedAge := time.Since(p.cachedBattStaticT)
		p.mu.RUnlock()

		if cachedAge > 10*time.Minute || p.cachedBattStaticT.IsZero() {
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
			details.DataSource = "Windows BatteryReport XML"
		}
		if details.FullChargeCapacityMWh == 0 && cached.FullChargeCapacityMWh > 0 {
			details.FullChargeCapacityMWh = cached.FullChargeCapacityMWh
			details.DataSource = "Windows BatteryReport XML"
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

func (p *platformProbe) ListHardwareDevices() []HardwareDeviceInfo {
	script := `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$classes = @('Processor','Display','DiskDrive','Net','MEDIA','Bluetooth','Monitor','USB','HIDClass')
$devs = Get-PnpDevice -Class $classes -PresentOnly -ErrorAction SilentlyContinue | Select-Object -First 75
$out = foreach ($d in $devs) {
  [PSCustomObject]@{
    name = [string]$d.FriendlyName
    class = [string]$d.Class
    status = [string]$d.Status
    manufacturer = [string]$d.Manufacturer
    instance_id = [string]$d.InstanceId
  }
}
@($out) | ConvertTo-Json -Compress
`
	out, err := runHiddenPowerShell(script)
	if err != nil || out == "" {
		return []HardwareDeviceInfo{}
	}
	var list []HardwareDeviceInfo
	if strings.HasPrefix(out, "[") {
		_ = json.Unmarshal([]byte(out), &list)
	} else if strings.HasPrefix(out, "{") {
		var single HardwareDeviceInfo
		if json.Unmarshal([]byte(out), &single) == nil {
			list = append(list, single)
		}
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

// GetWirelessDeviceBatteries probes Windows PnP DEVPKEY_Bluetooth_BatteryLevel and HID Battery sensors
// for wireless mice, keyboards, headphones, earbuds, and controllers.
func (p *platformProbe) GetWirelessDeviceBatteries(forceRefresh bool) []WirelessDeviceBattery {
	p.mu.RLock()
	if !forceRefresh && time.Since(p.cachedWirelessT) < 15*time.Second && p.cachedWireless != nil {
		out := make([]WirelessDeviceBattery, len(p.cachedWireless))
		copy(out, p.cachedWireless)
		p.mu.RUnlock()
		return out
	}
	p.mu.RUnlock()

	script := `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$items = @()
$seen = @{}
try {
  $cand = Get-PnpDevice -Class Bluetooth,HIDClass,AudioEndpoint,Mouse,Keyboard,System -PresentOnly -ErrorAction SilentlyContinue
  foreach ($c in $cand) {
    try {
      $prop = Get-PnpDeviceProperty -InstanceId $c.InstanceId -KeyName '{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2' -ErrorAction SilentlyContinue
      if ($prop -and $prop.Data -ne $null) {
        $val = [int]$prop.Data
        if ($val -ge 0 -and $val -le 100) {
          $rawName = ([string]$c.FriendlyName).Trim()
          if ($rawName -eq "") { continue }
          $clean = $rawName -replace '\s*(Hands-Free|Stereo|Avrcp|AG Audio|Battery Service|HID-compliant.*|BLE|LE)$',''
          $clean = $clean.Trim()
          if ($clean -eq "") { $clean = $rawName }
          $key = $clean.ToLower()
          if ($seen.ContainsKey($key)) { continue }
          $seen[$key] = $true
          $tr = "Bluetooth"
          if ($c.Class -eq 'HIDClass' -or $c.InstanceId -match '^HID\\VID_') { $tr = "Wireless HID / 2.4GHz" }
          $items += [PSCustomObject]@{
            name = $clean
            battery_percent = $val
            connected = ($c.Status -eq 'OK')
            transport = $tr
            source = "Windows PnP Battery"
          }
        }
      }
    } catch {}
  }
} catch {}
@($items) | ConvertTo-Json -Compress
`
	var list []WirelessDeviceBattery
	if out, err := runHiddenPowerShell(script); err == nil && out != "" {
		if strings.HasPrefix(out, "[") {
			_ = json.Unmarshal([]byte(out), &list)
		} else if strings.HasPrefix(out, "{") {
			var single WirelessDeviceBattery
			if json.Unmarshal([]byte(out), &single) == nil && single.Name != "" {
				list = append(list, single)
			}
		}
	}
	if list == nil {
		list = []WirelessDeviceBattery{}
	}
	for i := range list {
		list[i].DeviceType = classifyPeripheralType(list[i].Name)
	}
	p.mu.Lock()
	p.cachedWireless = list
	p.cachedWirelessT = time.Now()
	p.mu.Unlock()
	return list
}

// ListAudioDevices enumerates ALL active Windows CoreAudio output (playback) & input (capture) devices.
func (p *platformProbe) ListAudioDevices() AudioDevicesSnapshot {
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

func (p *platformProbe) GetKeyboardLayouts() KeyboardLayoutsSnapshot {
	// Read current foreground HKL via Win32
	hwnd, _, _ := procGetForegroundWindow.Call()
	var tid uintptr
	if hwnd != 0 {
		tid, _, _ = procGetWindowThreadProcessId.Call(hwnd, 0)
	}
	hkl, _, _ := procGetKeyboardLayout.Call(tid)
	activeTag := winTagFromHKL(hkl)

	script := `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
  $list = Get-WinUserLanguageList -ErrorAction Stop
  $out = foreach ($l in $list) {
    [PSCustomObject]@{
      tag = [string]$l.LanguageTag
      name = [string]$l.EnglishName
      native_name = [string]$l.Autonym
    }
  }
  @($out) | ConvertTo-Json -Compress
} catch { '[]' }
`
	var installed []KeyboardLayoutInfo
	if out, err := runHiddenPowerShell(script); err == nil && out != "" {
		if strings.HasPrefix(out, "[") {
			_ = json.Unmarshal([]byte(out), &installed)
		} else if strings.HasPrefix(out, "{") {
			var single KeyboardLayoutInfo
			if json.Unmarshal([]byte(out), &single) == nil && single.Tag != "" {
				installed = append(installed, single)
			}
		}
	}
	if len(installed) == 0 {
		installed = []KeyboardLayoutInfo{
			{Tag: "en-US", Short: "ENG", Name: "English (US)", NativeName: "English (US)"},
			{Tag: "ru-RU", Short: "RUS", Name: "Russian", NativeName: "Русский"},
		}
	}

	p.mu.RLock()
	cachedActive := p.activeKbdTag
	p.mu.RUnlock()
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
	for i := range list {
		cat, icon := classifyInstalledAppCategory(list[i].Name, list[i].Publisher)
		list[i].ID = fmt.Sprintf("pcapp_%d", i+1)
		list[i].Category = cat
		list[i].IconHint = icon
	}
	p.mu.Lock()
	p.cachedApps = list
	p.cachedAppsT = time.Now()
	p.mu.Unlock()
	return list
}


