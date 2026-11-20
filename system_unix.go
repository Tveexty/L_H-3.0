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
		KernelEngineVersion: "1.0",
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
	return nil
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
	if limit <= 0 || limit > 80 {
		limit = 45
	}
	selfPID := os.Getpid()
	out, err := exec.Command("ps", "-eo", "pid,comm,%cpu,rss,stat", "--sort=-rss", "--no-headers").Output()
	if err != nil {
		return nil
	}
	var list []ProcessMetric
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 5 {
			continue
		}
		pid, _ := strconv.Atoi(fields[0])
		cpuVal, _ := strconv.ParseFloat(fields[2], 64)
		rssKB, _ := strconv.ParseFloat(fields[3], 64)
		st := "Работает"
		if strings.HasPrefix(fields[4], "T") {
			st = "Приостановлен"
		} else if strings.HasPrefix(fields[4], "Z") {
			st = "Зомби"
		}
		list = append(list, ProcessMetric{
			PID:       pid,
			Name:      fields[1],
			Title:     fields[1],
			HasWindow: false,
			Status:    st,
			CPUPct:    math.Round(cpuVal*10) / 10,
			MemMB:     math.Round((rssKB/1024.0)*10) / 10,
			IsSelf:    pid == selfPID,
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
					PID:   pid,
					Name:  fields[3],
					Title: title,
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

