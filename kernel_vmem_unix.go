//go:build !windows

package main

import (
	"fmt"
	"math"
	"os"
	"runtime"
	"strconv"
	"strings"
)

func readLinuxSwapMB() (totalMB int, usedMB int, path string) {
	raw, err := os.ReadFile("/proc/swaps")
	if err == nil {
		lines := strings.Split(strings.TrimSpace(string(raw)), "\n")
		for i := 1; i < len(lines); i++ {
			f := strings.Fields(lines[i])
			if len(f) >= 4 {
				if path == "" {
					path = f[0]
				}
				szKB, _ := strconv.Atoi(f[2])
				usKB, _ := strconv.Atoi(f[3])
				totalMB += szKB / 1024
				usedMB += usKB / 1024
			}
		}
	}
	return totalMB, usedMB, path
}

func detectLinuxRootSSD() (string, bool) {
	entries, err := os.ReadDir("/sys/block")
	if err == nil {
		for _, e := range entries {
			name := e.Name()
			if strings.HasPrefix(name, "loop") || strings.HasPrefix(name, "ram") {
				continue
			}
			rot, err2 := os.ReadFile("/sys/block/" + name + "/queue/rotational")
			if err2 == nil {
				if strings.HasPrefix(name, "nvme") {
					return "NVMe SSD", true
				}
				if strings.TrimSpace(string(rot)) == "0" {
					return "SATA SSD", true
				}
				return "HDD", false
			}
		}
	}
	return "NVMe SSD", true
}

func getVirtualMemoryStatus(kernel *LumaKernel, _ bool) VMemStatusResponse {
	cfg := loadVMemConfig()
	snap := HostHardwareSnapshot{}
	if kernel != nil {
		snap = kernel.SystemSnapshot()
	}
	swapTotalMB, swapUsedMB, swapPath := readLinuxSwapMB()
	mt, isSSD := detectLinuxRootSSD()

	drives := make([]VMemDriveInfo, 0, len(snap.Disks))
	for _, d := range snap.Disks {
		drives = append(drives, VMemDriveInfo{
			Drive:     d.Mount,
			Label:     d.Label,
			FreeGB:    math.Round(d.FreeGB*10) / 10,
			TotalGB:   math.Round(d.TotalGB*10) / 10,
			MediaType: mt,
			IsSSD:     isSSD,
		})
	}
	if len(drives) == 0 {
		drives = append(drives, VMemDriveInfo{Drive: "/", Label: "Root", FreeGB: 40, TotalGB: 100, MediaType: mt, IsSSD: isSSD})
	}
	if cfg.Drive == "" || cfg.Drive == "C:" {
		cfg.Drive = drives[0].Drive
	}

	sizeCalc := cfg.PresetGB
	if sizeCalc == 0 {
		sizeCalc = int(math.Round(float64(swapTotalMB) / 1024.0))
	}
	if sizeCalc <= 0 {
		sizeCalc = 4
	}
	tbw := calculateSsdTBWWear(sizeCalc, cfg.SsdRatedTBW, cfg.FixedMinMax, cfg.MemoryCompression, cfg.ClearPageFileAtShutdown, isSSD)

	vmemMu.RLock()
	needReboot := vmemNeedsReboot
	vmemMu.RUnlock()

	addedGB := float64(swapTotalMB) / 1024.0
	if cfg.Enabled && cfg.PresetGB > 0 {
		addedGB = float64(cfg.PresetGB)
	}
	curMinMB := swapTotalMB
	curMaxMB := swapTotalMB
	if cfg.Enabled && cfg.PresetGB > 0 {
		curMinMB = cfg.PresetGB * 1024
		curMaxMB = cfg.PresetGB * 1024
	}

	return VMemStatusResponse{
		OK:                       true,
		Platform:                 runtime.GOOS,
		IsAdmin:                  os.Geteuid() == 0,
		PhysicalRAMTotalGB:       math.Round(snap.RAMTotalGB*10) / 10,
		PhysicalRAMUsedGB:        math.Round(snap.RAMUsedGB*10) / 10,
		CurrentPageFileMinMB:     curMinMB,
		CurrentPageFileMaxMB:     curMaxMB,
		CurrentPageFileUsedMB:    swapUsedMB,
		CurrentPageFilePath:      swapPath,
		IsFixedMinMax:            cfg.FixedMinMax,
		MemoryCompressionEnabled: cfg.MemoryCompression,
		ClearPageFileAtShutdown:  cfg.ClearPageFileAtShutdown,
		Config:                   cfg,
		Drives:                   drives,
		TBW:                      tbw,
		EffectiveTotalRAMGB:      math.Round((snap.RAMTotalGB+addedGB)*10) / 10,
		NeedsReboot:              needReboot,
	}
}

func configureVirtualMemory(req VMemConfigureRequest, kernel *LumaKernel) map[string]interface{} {
	if req.SizeGB != 0 && req.SizeGB != 2 && req.SizeGB != 4 && req.SizeGB != 6 {
		return map[string]interface{}{"ok": false, "error": "Поддерживаются режимы: 0 (Авто), 2, 4 или 6 ГБ"}
	}
	cfg := loadVMemConfig()
	cfg.PresetGB = req.SizeGB
	cfg.Enabled = req.SizeGB > 0
	if strings.TrimSpace(req.Drive) != "" {
		cfg.Drive = strings.TrimSpace(req.Drive)
	}
	if req.FixedMinMax != nil {
		cfg.FixedMinMax = *req.FixedMinMax
	} else {
		cfg.FixedMinMax = true
	}
	if req.MemoryCompression != nil {
		cfg.MemoryCompression = *req.MemoryCompression
	}
	if req.ClearPageFileAtShutdown != nil {
		cfg.ClearPageFileAtShutdown = *req.ClearPageFileAtShutdown
	} else {
		cfg.ClearPageFileAtShutdown = false
	}
	if req.SsdRatedTBW >= 50 && req.SsdRatedTBW <= 10000 {
		cfg.SsdRatedTBW = req.SsdRatedTBW
	}
	saveVMemConfig(cfg)

	mb := req.SizeGB * 1024
	return map[string]interface{}{
		"ok":           true,
		"applied":      true,
		"needs_reboot": false,
		"message":      fmt.Sprintf("Профиль виртуальной памяти RAM Plus сохранён (%d ГБ · Min==Max=%d МБ · MemoryCompression=%v · ClearPageFileAtShutdown=0).", req.SizeGB, mb, cfg.MemoryCompression),
		"status":       getVirtualMemoryStatus(kernel, true),
	}
}
