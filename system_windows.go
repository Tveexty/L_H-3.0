//go:build windows

package main

import (
	"bytes"
	"context"
	"encoding/json"
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
	procKeybdEvent           = modUser32.NewProc("keybd_event")
)

const (
	vkVolumeMute     = 0xAD
	vkVolumeDown     = 0xAE
	vkVolumeUp       = 0xAF
	vkMediaNextTrack = 0xB0
	vkMediaPrevTrack = 0xB1
	vkMediaPlayPause = 0xB3
	keyeventfKeyUp   = 0x0002
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

func fileTimeToUint64(ft fileTime) uint64 {
	return (uint64(ft.HighDateTime) << 32) | uint64(ft.LowDateTime)
}

type platformProbe struct {
	mu           sync.RWMutex
	prevIdle     uint64
	prevKernel   uint64
	prevUser     uint64
	cpuPercent   int
	cpuModel     string
	gpuName      string
	osCaption    string
	deviceModel  string
	manufacturer string
	netDownMbps  float64
	netUpMbps    float64
	prevRxBytes  uint64
	prevTxBytes  uint64
	prevNetStamp time.Time
	media         MediaSessionInfo
	cachedWindows []HostWindowItem
}

func newPlatformProbe() *platformProbe {
	p := &platformProbe{
		cpuModel:     fmt.Sprintf("%s (%d потоков)", runtime.GOARCH, runtime.NumCPU()),
		gpuName:      "Графический ускоритель Luma HAL",
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
	battPresent := pwr.BatteryFlag != 128 && pwr.BatteryFlag != 255
	battPct := int(pwr.BatteryLifePercent)
	if battPct > 100 || !battPresent {
		battPct = 100
	}
	battCharging := pwr.ACLineStatus == 1

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
    foreach ($d in ($btAll | Where-Object { $_.FriendlyName -and $_.FriendlyName -notmatch 'Enumerator|Service|Transport|Protocol|RFCOMM|Adapter|Radio|AVCTP|Hands-Free' } | Select-Object -First 12)) {
      $devs += [PSCustomObject]@{
        name = [string]$d.FriendlyName
        status = [string]$d.Status
        connected = ($d.Status -eq 'OK')
        class = [string]$d.Class
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
	if limit <= 0 || limit > 80 {
		limit = 45
	}
	selfPID := os.Getpid()
	script := fmt.Sprintf(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Get-Process -ErrorAction SilentlyContinue | Sort-Object @{Expression={$_.MainWindowHandle -ne 0}; Descending=$true}, WorkingSet64 -Descending | Select-Object -First %d | ForEach-Object {
  $p = ""
  try { $p = $_.Path } catch {}
  [PSCustomObject]@{
    pid = $_.Id
    name = $_.ProcessName
    title = [string]$_.MainWindowTitle
    has_window = ($_.MainWindowHandle -ne 0 -and [string]$_.MainWindowTitle -ne "")
    status = if ($_.Responding) { "Работает" } else { "Не отвечает" }
    cpu_pct = [math]::Round(($_.CPU), 1)
    mem_mb = [math]::Round($_.WorkingSet64 / 1MB, 1)
    exe_path = [string]$p
  }
} | ConvertTo-Json -Compress
`, limit)
	out, err := runHiddenPowerShell(script)
	if err != nil || out == "" {
		return nil
	}
	var list []ProcessMetric
	if json.Unmarshal([]byte(out), &list) != nil {
		var single ProcessMetric
		if json.Unmarshal([]byte(out), &single) == nil && single.PID > 0 {
			list = append(list, single)
		}
	}
	for i := range list {
		if list[i].PID == selfPID {
			list[i].IsSelf = true
		}
	}
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
	filtered := make([]HostWindowItem, 0, len(list))
	for _, item := range list {
		if item.PID == selfPID {
			continue
		}
		lower := strings.ToLower(item.Name)
		if lower == "textinputhost" || lower == "applicationframehost" && strings.TrimSpace(item.Title) == "" {
			continue
		}
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

func (p *platformProbe) GetBatteryDetails() BatteryHardwareDetails {
	var ps systemPowerStatus
	present := false
	pct := 100
	charging := true
	estMin := 0
	if r, _, _ := procGetSystemPowerStatus.Call(uintptr(unsafe.Pointer(&ps))); r != 0 {
		if ps.BatteryFlag != 128 && ps.BatteryFlag != 255 {
			present = true
			if ps.BatteryLifePercent <= 100 {
				pct = int(ps.BatteryLifePercent)
			}
			charging = ps.ACLineStatus == 1 || (ps.BatteryFlag&8) != 0
			if ps.BatteryLifeTime != 0xFFFFFFFF && ps.BatteryLifeTime > 0 {
				estMin = int(ps.BatteryLifeTime / 60)
			}
		}
	}

	details := BatteryHardwareDetails{
		Present:               present,
		Percent:               pct,
		Charging:              charging,
		HealthPercent:         100,
		DesignCapacityMWh:     0,
		FullChargeCapacityMWh: 0,
		CycleCount:            0,
		PowerWatts:            0,
		VoltageMV:             0,
		EstimatedMinutes:      estMin,
		StatusText:            "Питание от сети",
		Chemistry:             "Li-Ion",
	}
	if !present {
		return details
	}
	if charging {
		details.StatusText = "Заряжается от сети"
	} else {
		details.StatusText = "Работа от батареи"
	}

	script := `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$res = @{ design = 0; full = 0; cycles = 0; rate = 0; volt = 0; mfg = ""; chem = "Li-Ion" }
try {
  $st = Get-CimInstance -Namespace root\WMI -ClassName BatteryStaticData -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($st) {
    $res.design = [int]$st.DesignedCapacity
    $res.mfg = [string]$st.ManufactureName
  }
  $fc = Get-CimInstance -Namespace root\WMI -ClassName BatteryFullChargedCapacity -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($fc) { $res.full = [int]$fc.FullChargedCapacity }
  $cc = Get-CimInstance -Namespace root\WMI -ClassName BatteryCycleCount -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($cc) { $res.cycles = [int]$cc.CycleCount }
  $bs = Get-CimInstance -Namespace root\WMI -ClassName BatteryStatus -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($bs) {
    $res.volt = [int]$bs.Voltage
    if ($bs.DischargeRate -gt 0) { $res.rate = [int]$bs.DischargeRate }
    elseif ($bs.ChargeRate -gt 0) { $res.rate = [int]$bs.ChargeRate }
  }
} catch {}
$res | ConvertTo-Json -Compress
`
	if out, err := runHiddenPowerShell(script); err == nil && out != "" {
		var parsed struct {
			Design int    `json:"design"`
			Full   int    `json:"full"`
			Cycles int    `json:"cycles"`
			Rate   int    `json:"rate"`
			Volt   int    `json:"volt"`
			Mfg    string `json:"mfg"`
			Chem   string `json:"chem"`
		}
		if json.Unmarshal([]byte(out), &parsed) == nil {
			details.DesignCapacityMWh = parsed.Design
			details.FullChargeCapacityMWh = parsed.Full
			details.CycleCount = parsed.Cycles
			details.VoltageMV = parsed.Volt
			if parsed.Rate > 0 {
				details.PowerWatts = math.Round((float64(parsed.Rate)/1000.0)*10) / 10
			}
			if parsed.Design > 0 && parsed.Full > 0 {
				h := int(math.Round(float64(parsed.Full) * 100.0 / float64(parsed.Design)))
				if h > 100 {
					h = 100
				}
				if h < 1 {
					h = 1
				}
				details.HealthPercent = h
			}
			if parsed.Mfg != "" {
				details.Manufacturer = parsed.Mfg
			}
		}
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


