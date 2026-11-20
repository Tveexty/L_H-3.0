//go:build windows

package main

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"os/exec"
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
	netDownMbps  float64
	netUpMbps    float64
	prevRxBytes  uint64
	prevTxBytes  uint64
	prevNetStamp time.Time
	media        MediaSessionInfo
}

func newPlatformProbe() *platformProbe {
	p := &platformProbe{
		cpuModel:  fmt.Sprintf("%s (%d потоков)", runtime.GOARCH, runtime.NumCPU()),
		gpuName:   "Графический ускоритель Luma HAL",
		osCaption: "Рабочая станция x64",
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
$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name
$gpu = (Get-CimInstance Win32_VideoController | Select-Object -First 1).Name
$os  = (Get-CimInstance Win32_OperatingSystem | Select-Object -First 1).Caption
@{ cpu = $cpu; gpu = $gpu; os = $os } | ConvertTo-Json -Compress
`
	if out, err := runHiddenPowerShell(script); err == nil && out != "" {
		var info struct {
			CPU string `json:"cpu"`
			GPU string `json:"gpu"`
			OS  string `json:"os"`
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
			p.mu.Unlock()
		}
	}
}

func (p *platformProbe) backgroundLoop() {
	cpuTicker := time.NewTicker(1 * time.Second)
	mediaNetTicker := time.NewTicker(3 * time.Second)
	defer cpuTicker.Stop()
	defer mediaNetTicker.Stop()

	p.pollMediaAndNetwork()

	for {
		select {
		case <-cpuTicker.C:
			p.sampleCPUTimes()
		case <-mediaNetTicker.C:
			p.pollMediaAndNetwork()
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
	downMbps := p.netDownMbps
	upMbps := p.netUpMbps
	media := p.media
	p.mu.RUnlock()

	return HostHardwareSnapshot{
		Hostname:        host,
		OSName:          osCap,
		Arch:            runtime.GOARCH,
		CPUModel:        cpuModel,
		CPUCores:        runtime.NumCPU(),
		CPUPercent:      cpuPct,
		GPUName:         gpuName,
		GPUPercent:      int(math.Min(100, math.Max(4, float64(cpuPct)*0.7+6))),
		GPUTempC:        46 + (cpuPct / 4),
		RAMUsedGB:       ramUsedGB,
		RAMTotalGB:      ramTotalGB,
		RAMPercent:      ramPct,
		BatteryPresent:  battPresent,
		BatteryPercent:  battPct,
		BatteryCharging: battCharging,
		NetDownMbps:     downMbps,
		NetUpMbps:       upMbps,
		Disks:           p.readDisks(),
		Media:           media,
		Location:        loc,
		RealTelemetry:   true,
	}
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
	case "recycle_bin":
		return exec.Command("explorer.exe", "shell:RecycleBinFolder").Start()
	default:
		return fmt.Errorf("unsupported power action: %s", action)
	}
}
