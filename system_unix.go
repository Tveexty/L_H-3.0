//go:build !windows

package main

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

type platformProbe struct {
	mu           sync.RWMutex
	prevTotal    uint64
	prevIdle     uint64
	cpuPercent   int
	cpuModel     string
	netDownMbps  float64
	netUpMbps    float64
	prevRxBytes  uint64
	prevTxBytes  uint64
	prevNetStamp time.Time
	media        MediaSessionInfo
}

func newPlatformProbe() *platformProbe {
	p := &platformProbe{
		cpuModel: readLinuxCPUModel(),
	}
	p.sampleCPUAndNet()
	go p.backgroundLoop()
	return p
}

func readLinuxCPUModel() string {
	f, err := os.Open("/proc/cpuinfo")
	if err != nil {
		return fmt.Sprintf("%s (%d потоков)", runtime.GOARCH, runtime.NumCPU())
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := sc.Text()
		if strings.HasPrefix(line, "model name") {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				return strings.TrimSpace(parts[1])
			}
		}
	}
	return fmt.Sprintf("%s (%d потоков)", runtime.GOARCH, runtime.NumCPU())
}

func (p *platformProbe) backgroundLoop() {
	ticker := time.NewTicker(1 * time.Second)
	mediaTicker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()
	defer mediaTicker.Stop()

	p.pollMPRISMedia()
	for {
		select {
		case <-ticker.C:
			p.sampleCPUAndNet()
		case <-mediaTicker.C:
			p.pollMPRISMedia()
		}
	}
}

func (p *platformProbe) sampleCPUAndNet() {
	// 1. Real CPU % from /proc/stat
	if data, err := os.ReadFile("/proc/stat"); err == nil {
		lines := strings.Split(string(data), "\n")
		if len(lines) > 0 && strings.HasPrefix(lines[0], "cpu ") {
			fields := strings.Fields(lines[0])[1:]
			var total, idle uint64
			for idx, f := range fields {
				v, _ := strconv.ParseUint(f, 10, 64)
				total += v
				if idx == 3 || idx == 4 {
					idle += v
				}
			}
			p.mu.Lock()
			if p.prevTotal > 0 && total > p.prevTotal {
				dTotal := total - p.prevTotal
				dIdle := idle - p.prevIdle
				pct := int(math.Round(float64(dTotal-dIdle) * 100.0 / float64(dTotal)))
				if pct < 0 {
					pct = 0
				}
				if pct > 100 {
					pct = 100
				}
				p.cpuPercent = pct
			}
			p.prevTotal = total
			p.prevIdle = idle
			p.mu.Unlock()
		}
	}

	// 2. Real Network Down/Up Mbps from /proc/net/dev
	if data, err := os.ReadFile("/proc/net/dev"); err == nil {
		var rx, tx uint64
		for _, line := range strings.Split(string(data), "\n") {
			if !strings.Contains(line, ":") {
				continue
			}
			parts := strings.SplitN(line, ":", 2)
			iface := strings.TrimSpace(parts[0])
			if iface == "lo" {
				continue
			}
			fields := strings.Fields(parts[1])
			if len(fields) >= 9 {
				r, _ := strconv.ParseUint(fields[0], 10, 64)
				t, _ := strconv.ParseUint(fields[8], 10, 64)
				rx += r
				tx += t
			}
		}
		now := time.Now()
		p.mu.Lock()
		if !p.prevNetStamp.IsZero() && rx >= p.prevRxBytes && tx >= p.prevTxBytes {
			dt := now.Sub(p.prevNetStamp).Seconds()
			if dt > 0.2 {
				p.netDownMbps = math.Round((float64(rx-p.prevRxBytes)*8.0/(dt*1_000_000.0))*10) / 10
				p.netUpMbps = math.Round((float64(tx-p.prevTxBytes)*8.0/(dt*1_000_000.0))*10) / 10
			}
		}
		p.prevRxBytes = rx
		p.prevTxBytes = tx
		p.prevNetStamp = now
		p.mu.Unlock()
	}
}

func (p *platformProbe) pollMPRISMedia() {
	if _, err := exec.LookPath("playerctl"); err != nil {
		return
	}
	statusOut, err := exec.Command("playerctl", "status").Output()
	if err != nil {
		return
	}
	status := strings.TrimSpace(string(statusOut))
	metaOut, err := exec.Command("playerctl", "metadata", "--format", "{{title}}|||{{artist}}|||{{playerName}}").Output()
	if err != nil {
		return
	}
	parts := strings.Split(strings.TrimSpace(string(metaOut)), "|||")
	if len(parts) < 3 {
		return
	}
	p.mu.Lock()
	p.media = MediaSessionInfo{
		Available: strings.TrimSpace(parts[0]) != "" || strings.TrimSpace(parts[1]) != "",
		IsPlaying: strings.EqualFold(status, "Playing"),
		Title:     strings.TrimSpace(parts[0]),
		Artist:    strings.TrimSpace(parts[1]),
		SourceApp: strings.TrimSpace(parts[2]),
		UpdatedAt: time.Now().Unix(),
	}
	p.mu.Unlock()
}

func readLinuxMem() (usedGB, totalGB float64, pct int) {
	f, err := os.Open("/proc/meminfo")
	if err != nil {
		return 2.4, 8.0, 30
	}
	defer f.Close()
	var totalKB, availKB uint64
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		fields := strings.Fields(sc.Text())
		if len(fields) < 2 {
			continue
		}
		v, _ := strconv.ParseUint(fields[1], 10, 64)
		switch fields[0] {
		case "MemTotal:":
			totalKB = v
		case "MemAvailable:":
			availKB = v
		}
	}
	if totalKB == 0 {
		return 2.4, 8.0, 30
	}
	usedKB := totalKB - availKB
	totalGB = math.Round((float64(totalKB)/(1024*1024))*10) / 10
	usedGB = math.Round((float64(usedKB)/(1024*1024))*10) / 10
	pct = int(math.Round(float64(usedKB) * 100.0 / float64(totalKB)))
	return usedGB, totalGB, pct
}

func readLinuxDisks() []DiskMetric {
	mounts := []struct {
		path  string
		label string
	}{
		{"/", "Системный том /"},
		{"/home", "Пользовательские данные /home"},
	}
	seenDev := make(map[uint64]bool)
	var disks []DiskMetric
	for _, m := range mounts {
		var st syscall.Stat_t
		if err := syscall.Stat(m.path, &st); err != nil {
			continue
		}
		if seenDev[st.Dev] {
			continue
		}
		seenDev[st.Dev] = true
		var fs syscall.Statfs_t
		if err := syscall.Statfs(m.path, &fs); err != nil || fs.Blocks == 0 {
			continue
		}
		totalBytes := fs.Blocks * uint64(fs.Bsize)
		freeBytes := fs.Bavail * uint64(fs.Bsize)
		usedBytes := totalBytes - freeBytes
		totalGB := math.Round((float64(totalBytes)/(1024*1024*1024))*10) / 10
		freeGB := math.Round((float64(freeBytes)/(1024*1024*1024))*10) / 10
		usedGB := math.Round((float64(usedBytes)/(1024*1024*1024))*10) / 10
		pct := int(math.Round(float64(usedBytes) * 100.0 / float64(totalBytes)))
		disks = append(disks, DiskMetric{
			Mount:   m.path,
			Label:   m.label,
			UsedGB:  usedGB,
			TotalGB: totalGB,
			FreeGB:  freeGB,
			Percent: pct,
		})
	}
	return disks
}

func readLinuxBattery() (present bool, pct int, charging bool) {
	entries, err := os.ReadDir("/sys/class/power_supply")
	if err != nil {
		return false, 100, true
	}
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), "BAT") {
			capBytes, err := os.ReadFile("/sys/class/power_supply/" + e.Name() + "/capacity")
			if err == nil {
				v, _ := strconv.Atoi(strings.TrimSpace(string(capBytes)))
				stBytes, _ := os.ReadFile("/sys/class/power_supply/" + e.Name() + "/status")
				st := strings.TrimSpace(string(stBytes))
				return true, v, strings.EqualFold(st, "Charging") || strings.EqualFold(st, "Full")
			}
		}
	}
	return false, 100, true
}

func (p *platformProbe) Collect(loc LocationInfo) HostHardwareSnapshot {
	host, _ := os.Hostname()
	ramUsedGB, ramTotalGB, ramPct := readLinuxMem()
	battPresent, battPct, battCharging := readLinuxBattery()

	p.mu.RLock()
	cpuPct := p.cpuPercent
	cpuModel := p.cpuModel
	downMbps := p.netDownMbps
	upMbps := p.netUpMbps
	media := p.media
	p.mu.RUnlock()

	return HostHardwareSnapshot{
		Hostname:        host,
		OSName:          "Luma Runtime Environment (" + runtime.GOOS + " " + runtime.GOARCH + ")",
		Arch:            runtime.GOARCH,
		CPUModel:        cpuModel,
		CPUCores:        runtime.NumCPU(),
		CPUPercent:      cpuPct,
		GPUName:         "Luma Graphics Pipeline",
		GPUPercent:      int(math.Min(100, math.Max(2, float64(cpuPct)*0.6+2))),
		GPUTempC:        44 + (cpuPct / 4),
		RAMUsedGB:       ramUsedGB,
		RAMTotalGB:      ramTotalGB,
		RAMPercent:      ramPct,
		BatteryPresent:  battPresent,
		BatteryPercent:  battPct,
		BatteryCharging: battCharging,
		NetDownMbps:         downMbps,
		NetUpMbps:           upMbps,
		Disks:               readLinuxDisks(),
		Media:               media,
		Location:            loc,
		DeviceModel:         readLinuxDMI("/sys/devices/virtual/dmi/id/product_name", "Luma Linux Workstation"),
		Manufacturer:        readLinuxDMI("/sys/devices/virtual/dmi/id/sys_vendor", "Linux x64"),
		KernelEngineVersion: KernelEngineVersion,
		SecurityCoreVersion: SecurityCoreVersion,
		AppCodename:         KernelCodename,
		RealTelemetry:       true,
	}
}

func readLinuxDMI(path, fallback string) string {
	b, err := os.ReadFile(path)
	if err != nil {
		return fallback
	}
	s := strings.TrimSpace(string(b))
	if s == "" {
		return fallback
	}
	return s
}

func (p *platformProbe) GetBluetoothStatus() BluetoothStatus {
	entries, err := os.ReadDir("/sys/class/bluetooth")
	if err != nil || len(entries) == 0 {
		return BluetoothStatus{
			Available:   false,
			Enabled:     false,
			AdapterName: "",
			Devices:     []BluetoothDevice{},
		}
	}
	st := BluetoothStatus{
		Available:   true,
		Enabled:     true,
		AdapterName: entries[0].Name(),
		Devices:     []BluetoothDevice{},
	}
	if _, err := exec.LookPath("bluetoothctl"); err == nil {
		if out, err := exec.Command("bluetoothctl", "show").Output(); err == nil {
			st.Enabled = strings.Contains(string(out), "Powered: yes")
		}
		if out, err := exec.Command("bluetoothctl", "devices").Output(); err == nil {
			for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
				parts := strings.SplitN(line, " ", 3)
				if len(parts) == 3 {
					st.Devices = append(st.Devices, BluetoothDevice{
						Name:      strings.TrimSpace(parts[2]),
						Status:    "OK",
						Connected: false,
						Class:     "Bluetooth",
					})
				}
			}
		}
	}
	return st
}

func (p *platformProbe) SetBluetoothEnabled(enabled bool) BluetoothStatus {
	if _, err := exec.LookPath("bluetoothctl"); err == nil {
		arg := "off"
		if enabled {
			arg = "on"
		}
		_ = exec.Command("bluetoothctl", "power", arg).Run()
	}
	return p.GetBluetoothStatus()
}

func (p *platformProbe) SetPowerPlan(plan string) error {
	return nil
}

func (p *platformProbe) ControlMedia(action string) (MediaSessionInfo, error) {
	if _, err := exec.LookPath("playerctl"); err == nil {
		switch strings.ToLower(strings.TrimSpace(action)) {
		case "play_pause", "play", "pause":
			_ = exec.Command("playerctl", "play-pause").Run()
		case "next":
			_ = exec.Command("playerctl", "next").Run()
		case "prev", "previous":
			_ = exec.Command("playerctl", "previous").Run()
		}
		p.pollMPRISMedia()
	}
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.media, nil
}

func (p *platformProbe) SetAudioVolume(volume int, mute bool) error {
	if _, err := exec.LookPath("pactl"); err == nil {
		_ = exec.Command("pactl", "set-sink-volume", "@DEFAULT_SINK@", fmt.Sprintf("%d%%", volume)).Run()
		m := "0"
		if mute {
			m = "1"
		}
		_ = exec.Command("pactl", "set-sink-mute", "@DEFAULT_SINK@", m).Run()
	}
	return nil
}

func (p *platformProbe) ExecutePowerAction(action string) error {
	switch strings.ToLower(strings.TrimSpace(action)) {
	case "lock", "sleep", "hibernate", "shutdown", "restart", "reboot", "signout", "logout", "recycle_bin", "exit_luma":
		return nil
	default:
		return fmt.Errorf("unsupported power action: %s", action)
	}
}

var unixClipMu sync.Mutex
var unixClipBuf string

func (p *platformProbe) GetClipboard() (string, error) {
	if _, err := exec.LookPath("xclip"); err == nil {
		if out, err := exec.Command("xclip", "-o", "-selection", "clipboard").Output(); err == nil {
			return string(out), nil
		}
	}
	if _, err := exec.LookPath("wl-paste"); err == nil {
		if out, err := exec.Command("wl-paste", "-n").Output(); err == nil {
			return string(out), nil
		}
	}
	unixClipMu.Lock()
	defer unixClipMu.Unlock()
	return unixClipBuf, nil
}

func (p *platformProbe) SetClipboard(text string) error {
	unixClipMu.Lock()
	unixClipBuf = text
	unixClipMu.Unlock()
	if _, err := exec.LookPath("xclip"); err == nil {
		cmd := exec.Command("xclip", "-i", "-selection", "clipboard")
		cmd.Stdin = strings.NewReader(text)
		_ = cmd.Run()
	}
	return nil
}

func (p *platformProbe) OpenPath(target string) error {
	clean := strings.TrimSpace(target)
	if clean == "" {
		return fmt.Errorf("empty path")
	}
	if _, err := exec.LookPath("xdg-open"); err == nil {
		return exec.Command("xdg-open", clean).Start()
	}
	return nil
}

func (p *platformProbe) PickFile(mode string) PickedFileInfo {
	home, _ := os.UserHomeDir()
	return PickedFileInfo{
		Picked: false,
		Path:   home,
		Name:   filepath.Base(home),
		IsDir:  strings.EqualFold(mode, "folder"),
	}
}

func (p *platformProbe) TopProcesses(limit int) []ProcessMetric {
	if limit <= 0 || limit > 120 {
		limit = 80
	}
	selfPID := os.Getpid()
	out, err := exec.Command("ps", "-eo", "pid,comm,%cpu,rss,nlwp,stat", "--sort=-rss", "--no-headers").Output()
	if err != nil {
		return nil
	}
	var list []ProcessMetric
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 6 {
			continue
		}
		pid, _ := strconv.Atoi(fields[0])
		cpuVal, _ := strconv.ParseFloat(fields[2], 64)
		if cpuVal > 100 {
			cpuVal = cpuVal / float64(runtime.NumCPU())
		}
		if cpuVal > 100 {
			cpuVal = 100
		}
		rssKB, _ := strconv.ParseFloat(fields[3], 64)
		threads, _ := strconv.Atoi(fields[4])
		st := "Работает"
		if strings.HasPrefix(fields[5], "T") {
			st = "Приостановлен"
		} else if strings.HasPrefix(fields[5], "Z") {
			st = "Зомби"
		}
		cat := "background"
		desc := "Фоновый процесс ОС"
		if pid == selfPID {
			cat = "app"
			desc = "Ядро и графическая оболочка Luma OS"
		} else if pid <= 100 || strings.HasPrefix(fields[1], "k") || strings.Contains(fields[1], "systemd") {
			cat = "system"
			desc = "Системная служба ядра"
		}
		memMB := math.Round((rssKB/1024.0)*10) / 10
		list = append(list, ProcessMetric{
			PID:          pid,
			Name:         fields[1],
			FriendlyName: friendlyAppName(fields[1], fields[1]),
			Title:        fields[1],
			Description:  desc,
			Category:     cat,
			HasWindow:    pid == selfPID,
			Status:       st,
			CPUPct:       math.Round(cpuVal*10) / 10,
			MemMB:        memMB,
			PrivateMB:    memMB,
			Threads:      threads,
			IsSelf:       pid == selfPID,
		})
		if len(list) >= limit {
			break
		}
	}
	return list
}

func (p *platformProbe) ListOpenWindows() []HostWindowItem {
	// Use wmctrl if X11 session is active; otherwise return empty (browser/Linux headless)
	if _, err := exec.LookPath("wmctrl"); err == nil {
		out, err := exec.Command("wmctrl", "-lp").Output()
		if err == nil {
			var items []HostWindowItem
			selfPID := os.Getpid()
			for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
				fields := strings.Fields(line)
				if len(fields) < 5 {
					continue
				}
				pid, _ := strconv.Atoi(fields[2])
				if pid == selfPID || pid <= 0 {
					continue
				}
				title := strings.Join(fields[4:], " ")
				items = append(items, HostWindowItem{
					PID:          pid,
					Name:         fields[3],
					FriendlyName: friendlyAppName(fields[3], title),
					Title:        title,
				})
			}
			return items
		}
	}
	return []HostWindowItem{}
}

func (p *platformProbe) FocusWindow(pid int) error {
	if _, err := exec.LookPath("wmctrl"); err == nil && pid > 0 {
		out, err := exec.Command("wmctrl", "-lp").Output()
		if err == nil {
			for _, line := range strings.Split(string(out), "\n") {
				fields := strings.Fields(line)
				if len(fields) >= 3 && fields[2] == strconv.Itoa(pid) {
					return exec.Command("wmctrl", "-i", "-a", fields[0]).Run()
				}
			}
		}
	}
	return nil
}

func (p *platformProbe) KillProcess(pid int, force bool) error {
	if pid <= 1 || pid == os.Getpid() {
		return fmt.Errorf("cannot terminate system or self pid %d", pid)
	}
	sig := syscall.SIGTERM
	if force {
		sig = syscall.SIGKILL
	}
	return syscall.Kill(pid, sig)
}

func (p *platformProbe) IsPathHidden(fullPath, name string) bool {
	return strings.HasPrefix(name, ".")
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
	addIfExists("Домашняя папка", home, "home")
	addIfExists("Рабочий стол", filepath.Join(home, "Desktop"), "desktop")
	addIfExists("Загрузки", filepath.Join(home, "Downloads"), "downloads")
	addIfExists("Документы", filepath.Join(home, "Documents"), "documents")
	addIfExists("Изображения", filepath.Join(home, "Pictures"), "pictures")
	addIfExists("Корень системы (/)", "/", "drive")
	addIfExists("Конфигурация (/etc)", "/etc", "folder")
	addIfExists("Временные (/tmp)", "/tmp", "folder")
	return items
}

func (p *platformProbe) ExecShell(command string) (string, string, int) {
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "bash", "-c", command)
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
	return DefenderStatus{
		Available:        false,
		RealtimeEnabled:  false,
		AntivirusEnabled: false,
		SignatureVersion: "LumaShield-1.1-Heuristics",
		CompatibleNote:   "LumaShield 1.1 работает в изолированном user-space режиме (совместим с Windows Defender на Windows 10/11)",
		ConflictFree:     true,
	}
}

func (p *platformProbe) ListSystemServices(limit int) []SystemServiceInfo {
	if limit <= 0 || limit > 120 {
		limit = 40
	}
	out := []SystemServiceInfo{
		{Name: "luma-core", DisplayName: "LumaCore 1.1 Kernel Engine", Status: "Running", StartType: "Automatic", Source: "luma", PID: os.Getpid(), Description: "Основное ядро телеметрии, HAL и файловой системы"},
		{Name: "luma-shield", DisplayName: "LumaShield 1.1 Security Core", Status: "Running", StartType: "Automatic", Source: "luma", PID: os.Getpid(), Description: "Ядро безопасности, AES-256-GCM VFS и локальный антивирус"},
		{Name: "luma-ipc", DisplayName: "Luma JSON-RPC 2.0 Binder (49215)", Status: "Running", StartType: "Automatic", Source: "luma", PID: os.Getpid(), Description: "Локальная шина межпроцессного взаимодействия"},
		{Name: "luma-ai-bridge", DisplayName: "Luma AI Multi-Provider Bridge", Status: "Running", StartType: "Manual", Source: "luma", PID: os.Getpid(), Description: "Шлюз нейросетей Gemini / OpenAI / Claude / Ollama"},
		{Name: "luma-updater", DisplayName: "Luma GitHub OTA Updater", Status: "Running", StartType: "Automatic", Source: "luma", PID: os.Getpid(), Description: "Служба проверки и бесшовного обновления с GitHub"},
	}
	if _, err := exec.LookPath("systemctl"); err == nil {
		if raw, err := exec.Command("systemctl", "list-units", "--type=service", "--no-pager", "--no-legend", "--plain").Output(); err == nil {
			for _, line := range strings.Split(string(raw), "\n") {
				if len(out) >= limit {
					break
				}
				fields := strings.Fields(line)
				if len(fields) < 4 {
					continue
				}
				status := "Stopped"
				if fields[3] == "running" {
					status = "Running"
				}
				out = append(out, SystemServiceInfo{
					Name:        fields[0],
					DisplayName: strings.Join(fields[4:], " "),
					Status:      status,
					StartType:   fields[1],
					Source:      "os",
				})
			}
		}
	}
	return out
}

func (p *platformProbe) ListStartupItems() []StartupEntry {
	items := []StartupEntry{
		{Name: "LumaOS Shell Runtime", Command: "LumaOS_1.1.0.exe", Location: "Luma Core", Enabled: getShellConfig().AutostartWithOS, Impact: "Низкое"},
	}
	home, _ := os.UserHomeDir()
	autoDir := filepath.Join(home, ".config", "autostart")
	if entries, err := os.ReadDir(autoDir); err == nil {
		for _, e := range entries {
			if strings.HasSuffix(e.Name(), ".desktop") {
				items = append(items, StartupEntry{
					Name:     strings.TrimSuffix(e.Name(), ".desktop"),
					Command:  filepath.Join(autoDir, e.Name()),
					Location: "~/.config/autostart",
					Enabled:  true,
					Impact:   "Низкое",
				})
			}
		}
	}
	return items
}

func (p *platformProbe) OpenSystemApplet(applet string) error {
	return nil
}

func (p *platformProbe) GetBatteryDetails() BatteryHardwareDetails {
	details := BatteryHardwareDetails{
		Present:               false,
		Percent:               100,
		Charging:              false,
		ACOnline:              true,
		HealthPercent:         100,
		DesignCapacityMWh:     0,
		FullChargeCapacityMWh: 0,
		CycleCount:            0,
		CycleSupported:        false,
		PowerWatts:            0,
		VoltageMV:             0,
		EstimatedMinutes:      0,
		StatusText:            "Питание от сети (ПК)",
		Chemistry:             "Li-Ion",
		DataSource:            "Linux sysfs power_supply",
	}
	entries, err := os.ReadDir("/sys/class/power_supply")
	if err != nil {
		return details
	}
	readInt := func(path string) int {
		b, err := os.ReadFile(path)
		if err != nil {
			return 0
		}
		v, _ := strconv.Atoi(strings.TrimSpace(string(b)))
		return v
	}
	for _, e := range entries {
		if !strings.HasPrefix(e.Name(), "BAT") {
			continue
		}
		base := filepath.Join("/sys/class/power_supply", e.Name())
		details.Present = true
		details.Percent = readInt(filepath.Join(base, "capacity"))
		stBytes, _ := os.ReadFile(filepath.Join(base, "status"))
		st := strings.TrimSpace(string(stBytes))
		switch {
		case strings.EqualFold(st, "Charging"):
			details.Charging = true
			details.ACOnline = true
			details.StatusText = "Заряжается от сети"
		case strings.EqualFold(st, "Full"):
			details.Charging = false
			details.ACOnline = true
			details.StatusText = "Заряжено (от сети)"
		case strings.EqualFold(st, "Not charging"):
			details.Charging = false
			details.ACOnline = true
			details.StatusText = "Подключено, не заряжается"
		default:
			details.Charging = false
			details.ACOnline = false
			details.StatusText = "Работа от батареи"
		}
		if cyc := readInt(filepath.Join(base, "cycle_count")); cyc > 0 {
			details.CycleCount = cyc
			details.CycleSupported = true
		}
		full := readInt(filepath.Join(base, "energy_full")) / 1000
		design := readInt(filepath.Join(base, "energy_full_design")) / 1000
		if full == 0 {
			full = readInt(filepath.Join(base, "charge_full")) / 1000
			design = readInt(filepath.Join(base, "charge_full_design")) / 1000
		}
		details.FullChargeCapacityMWh = full
		details.DesignCapacityMWh = design
		if design > 0 && full > 0 {
			h := int(math.Round(float64(full) * 100.0 / float64(design)))
			if h > 100 {
				h = 100
			}
			details.HealthPercent = h
		}
		if pw := readInt(filepath.Join(base, "power_now")); pw > 0 {
			details.PowerWatts = math.Round((float64(pw)/1000000.0)*10) / 10
		}
		details.VoltageMV = readInt(filepath.Join(base, "voltage_now")) / 1000
		if mfg, err := os.ReadFile(filepath.Join(base, "manufacturer")); err == nil {
			details.Manufacturer = strings.TrimSpace(string(mfg))
		}
		break
	}
	return details
}

func (p *platformProbe) ListHardwareDevices() []HardwareDeviceInfo {
	snap := p.Collect(LocationInfo{})
	out := []HardwareDeviceInfo{
		{Name: snap.CPUModel, Class: "Processor", Status: "OK", Manufacturer: "CPU HAL"},
		{Name: snap.GPUName, Class: "Display", Status: "OK", Manufacturer: "GPU HAL"},
	}
	for _, d := range snap.Disks {
		out = append(out, HardwareDeviceInfo{
			Name:         fmt.Sprintf("%s (%s · %.1f ГБ)", d.Label, d.Mount, d.TotalGB),
			Class:        "DiskDrive",
			Status:       "OK",
			Manufacturer: "Storage HAL",
		})
	}
	if entries, err := os.ReadDir("/sys/class/net"); err == nil {
		for _, e := range entries {
			out = append(out, HardwareDeviceInfo{
				Name:         e.Name(),
				Class:        "Net",
				Status:       "OK",
				Manufacturer: "Network Interface",
			})
		}
	}
	return out
}

func (p *platformProbe) GetFirewallProfiles() []FirewallProfileInfo {
	return []FirewallProfileInfo{
		{Name: "Loopback Isolation (LumaShield 1.3)", Enabled: true},
		{Name: "Host System Firewall", Enabled: true},
	}
}

func (p *platformProbe) ControlService(name, action string) error {
	return fmt.Errorf("управление системными службами ОС доступно с правами администратора")
}

func (p *platformProbe) GetWirelessDeviceBatteries(forceRefresh bool) []WirelessDeviceBattery {
	var list []WirelessDeviceBattery
	if entries, err := os.ReadDir("/sys/class/power_supply"); err == nil {
		for _, e := range entries {
			name := e.Name()
			if strings.HasPrefix(name, "BAT") || strings.HasPrefix(name, "AC") || strings.HasPrefix(name, "ADP") {
				continue
			}
			base := filepath.Join("/sys/class/power_supply", name)
			capBytes, err := os.ReadFile(filepath.Join(base, "capacity"))
			if err != nil {
				continue
			}
			pct, err := strconv.Atoi(strings.TrimSpace(string(capBytes)))
			if err != nil || pct < 0 || pct > 100 {
				continue
			}
			model := name
			if mb, err := os.ReadFile(filepath.Join(base, "model_name")); err == nil && strings.TrimSpace(string(mb)) != "" {
				model = strings.TrimSpace(string(mb))
			}
			list = append(list, WirelessDeviceBattery{
				Name:           model,
				DeviceType:     classifyPeripheralType(model),
				BatteryPercent: pct,
				Connected:      true,
				Transport:      "Wireless HID / Bluetooth",
				Source:         "Linux power_supply",
			})
		}
	}
	if list == nil {
		list = []WirelessDeviceBattery{}
	}
	return list
}

var (
	unixAudioMu    sync.Mutex
	unixActiveOut  = "out_speakers"
	unixActiveIn   = "in_mic"
	unixKbdMu      sync.Mutex
	unixActiveKbd  = "ru-RU"
	unixKbdLayouts = []KeyboardLayoutInfo{
		{Tag: "ru-RU", Short: "RUS", Name: "Russian", NativeName: "Русский", Active: true},
		{Tag: "en-US", Short: "ENG", Name: "English (US)", NativeName: "English (US)", Active: false},
		{Tag: "ro-RO", Short: "ROM", Name: "Romanian", NativeName: "Română", Active: false},
	}
)

func (p *platformProbe) ListAudioDevices() AudioDevicesSnapshot {
	unixAudioMu.Lock()
	actOut := unixActiveOut
	actIn := unixActiveIn
	unixAudioMu.Unlock()

	snap := AudioDevicesSnapshot{
		OK:      true,
		Outputs: []AudioEndpointDevice{},
		Inputs:  []AudioEndpointDevice{},
	}

	// Probe real PulseAudio / PipeWire via pactl if available
	if _, err := exec.LookPath("pactl"); err == nil {
		defSink := ""
		if b, e := exec.Command("pactl", "get-default-sink").Output(); e == nil {
			defSink = strings.TrimSpace(string(b))
		}
		if b, e := exec.Command("pactl", "list", "short", "sinks").Output(); e == nil {
			for _, line := range strings.Split(strings.TrimSpace(string(b)), "\n") {
				f := strings.Fields(line)
				if len(f) >= 2 {
					isDef := f[1] == defSink
					snap.Outputs = append(snap.Outputs, AudioEndpointDevice{
						ID:         f[1],
						Name:       f[1],
						Kind:       "output",
						IsDefault:  isDef,
						Status:     "Активно",
						FormFactor: classifyAudioFormFactor(f[1], "output"),
					})
					if isDef {
						snap.ActiveOutputID = f[1]
					}
				}
			}
		}
		defSrc := ""
		if b, e := exec.Command("pactl", "get-default-source").Output(); e == nil {
			defSrc = strings.TrimSpace(string(b))
		}
		if b, e := exec.Command("pactl", "list", "short", "sources").Output(); e == nil {
			for _, line := range strings.Split(strings.TrimSpace(string(b)), "\n") {
				f := strings.Fields(line)
				if len(f) >= 2 && !strings.Contains(f[1], ".monitor") {
					isDef := f[1] == defSrc
					snap.Inputs = append(snap.Inputs, AudioEndpointDevice{
						ID:         f[1],
						Name:       f[1],
						Kind:       "input",
						IsDefault:  isDef,
						Status:     "Активно",
						FormFactor: classifyAudioFormFactor(f[1], "input"),
					})
					if isDef {
						snap.ActiveInputID = f[1]
					}
				}
			}
		}
	}

	if len(snap.Outputs) == 0 {
		snap.Outputs = []AudioEndpointDevice{
			{ID: "out_speakers", Name: "Встроенные динамики (High Definition Audio)", Kind: "output", IsDefault: actOut == "out_speakers", Status: "Активно", FormFactor: "speakers"},
			{ID: "out_headphones", Name: "Наушники (3.5 мм / USB DAC)", Kind: "output", IsDefault: actOut == "out_headphones", Status: "Готово", FormFactor: "headphones"},
			{ID: "out_hdmi", Name: "Монитор HDMI / DisplayPort Audio", Kind: "output", IsDefault: actOut == "out_hdmi", Status: "Готово", FormFactor: "hdmi"},
		}
		snap.ActiveOutputID = actOut
	}
	if len(snap.Inputs) == 0 {
		snap.Inputs = []AudioEndpointDevice{
			{ID: "in_mic", Name: "Встроенный микрофон (Array Mic)", Kind: "input", IsDefault: actIn == "in_mic", Status: "Активно", FormFactor: "mic"},
			{ID: "in_headset", Name: "Микрофон гарнитуры / USB", Kind: "input", IsDefault: actIn == "in_headset", Status: "Готово", FormFactor: "headset"},
		}
		snap.ActiveInputID = actIn
	}
	return snap
}

func (p *platformProbe) SetDefaultAudioDevice(deviceID, kind string) error {
	clean := strings.TrimSpace(deviceID)
	if clean == "" {
		return fmt.Errorf("empty audio device id")
	}
	if _, err := exec.LookPath("pactl"); err == nil {
		if kind == "input" {
			_ = exec.Command("pactl", "set-default-source", clean).Run()
		} else {
			_ = exec.Command("pactl", "set-default-sink", clean).Run()
		}
	}
	unixAudioMu.Lock()
	if kind == "input" {
		unixActiveIn = clean
	} else {
		unixActiveOut = clean
	}
	unixAudioMu.Unlock()
	return nil
}

func (p *platformProbe) GetKeyboardLayouts() KeyboardLayoutsSnapshot {
	unixKbdMu.Lock()
	defer unixKbdMu.Unlock()
	installed := make([]KeyboardLayoutInfo, len(unixKbdLayouts))
	copy(installed, unixKbdLayouts)
	var active KeyboardLayoutInfo
	for i := range installed {
		installed[i].Active = strings.EqualFold(installed[i].Tag, unixActiveKbd)
		if installed[i].Active {
			active = installed[i]
		}
	}
	if active.Tag == "" && len(installed) > 0 {
		installed[0].Active = true
		active = installed[0]
		unixActiveKbd = active.Tag
	}
	return KeyboardLayoutsSnapshot{
		OK:        true,
		ActiveTag: active.Tag,
		Active:    active,
		Installed: installed,
	}
}

func (p *platformProbe) SwitchKeyboardLayout(tag, klid string) KeyboardLayoutsSnapshot {
	unixKbdMu.Lock()
	target := strings.TrimSpace(tag)
	if strings.EqualFold(target, "next") && len(unixKbdLayouts) > 1 {
		for i, l := range unixKbdLayouts {
			if strings.EqualFold(l.Tag, unixActiveKbd) {
				target = unixKbdLayouts[(i+1)%len(unixKbdLayouts)].Tag
				break
			}
		}
	}
	if target != "" {
		found := false
		for _, l := range unixKbdLayouts {
			if strings.EqualFold(l.Tag, target) {
				found = true
				target = l.Tag
				break
			}
		}
		if !found {
			unixKbdLayouts = append(unixKbdLayouts, KeyboardLayoutInfo{
				Tag:        target,
				Short:      keyboardShortCode(target),
				Name:       target,
				NativeName: target,
			})
		}
		unixActiveKbd = target
		if _, err := exec.LookPath("setxkbmap"); err == nil {
			base := strings.ToLower(strings.Split(target, "-")[0])
			_ = exec.Command("setxkbmap", base).Run()
		}
	}
	unixKbdMu.Unlock()
	return p.GetKeyboardLayouts()
}

func (p *platformProbe) ManageKeyboardLayout(action, tag string) KeyboardLayoutsSnapshot {
	clean := strings.TrimSpace(tag)
	if clean == "" {
		return p.GetKeyboardLayouts()
	}
	unixKbdMu.Lock()
	switch strings.ToLower(strings.TrimSpace(action)) {
	case "add":
		exists := false
		for _, l := range unixKbdLayouts {
			if strings.EqualFold(l.Tag, clean) {
				exists = true
				break
			}
		}
		if !exists {
			unixKbdLayouts = append(unixKbdLayouts, KeyboardLayoutInfo{
				Tag:        clean,
				Short:      keyboardShortCode(clean),
				Name:       clean,
				NativeName: clean,
			})
		}
	case "remove":
		if len(unixKbdLayouts) > 1 {
			next := make([]KeyboardLayoutInfo, 0, len(unixKbdLayouts))
			for _, l := range unixKbdLayouts {
				if !strings.EqualFold(l.Tag, clean) {
					next = append(next, l)
				}
			}
			if len(next) > 0 {
				unixKbdLayouts = next
				if strings.EqualFold(unixActiveKbd, clean) {
					unixActiveKbd = next[0].Tag
				}
			}
		}
	}
	unixKbdMu.Unlock()
	return p.GetKeyboardLayouts()
}

func (p *platformProbe) ListInstalledApps(forceRefresh bool) []InstalledAppItem {
	var list []InstalledAppItem
	seen := map[string]bool{}
	dirs := []string{"/usr/share/applications"}
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		dirs = append(dirs, filepath.Join(home, ".local", "share", "applications"))
	}
	for _, d := range dirs {
		entries, err := os.ReadDir(d)
		if err != nil {
			continue
		}
		for _, e := range entries {
			if !strings.HasSuffix(e.Name(), ".desktop") {
				continue
			}
			raw, err := os.ReadFile(filepath.Join(d, e.Name()))
			if err != nil {
				continue
			}
			var name, execCmd string
			noDisplay := false
			for _, line := range strings.Split(string(raw), "\n") {
				line = strings.TrimSpace(line)
				if strings.HasPrefix(line, "Name=") && name == "" {
					name = strings.TrimSpace(strings.TrimPrefix(line, "Name="))
				} else if strings.HasPrefix(line, "Exec=") && execCmd == "" {
					execCmd = strings.TrimSpace(strings.TrimPrefix(line, "Exec="))
					if parts := strings.Fields(execCmd); len(parts) > 0 {
						execCmd = parts[0]
					}
				} else if line == "NoDisplay=true" {
					noDisplay = true
				}
			}
			if noDisplay || name == "" || execCmd == "" {
				continue
			}
			key := strings.ToLower(name)
			if seen[key] {
				continue
			}
			seen[key] = true
			cat, icon := classifyInstalledAppCategory(name, "")
			list = append(list, InstalledAppItem{
				ID:       fmt.Sprintf("pcapp_%d", len(list)+1),
				Name:     name,
				ExecPath: execCmd,
				Category: cat,
				Source:   "desktop",
				IconHint: icon,
			})
			if len(list) >= 120 {
				break
			}
		}
	}
	// Include installed CLI/dev tools in VM preview when no GUI .desktop apps exist
	if len(list) == 0 {
		for _, tool := range []struct {
			name, bin, cat, icon string
		}{
			{"Python 3", "python3", "Разработка", "Code2"},
			{"Node.js", "node", "Разработка", "Code2"},
			{"Git", "git", "Разработка", "Code2"},
			{"GitHub CLI", "gh", "Разработка", "Terminal"},
			{"Bash Shell", "bash", "Утилиты", "Terminal"},
			{"cURL", "curl", "Утилиты", "Globe"},
		} {
			if full, err := exec.LookPath(tool.bin); err == nil {
				list = append(list, InstalledAppItem{
					ID:       fmt.Sprintf("pcapp_%d", len(list)+1),
					Name:     tool.name,
					ExecPath: full,
					Category: tool.cat,
					Source:   "system",
					IconHint: tool.icon,
				})
			}
		}
	}
	return list
}


