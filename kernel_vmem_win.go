//go:build windows

package main

import (
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"sync"
	"time"
)

var (
	vmemWinCacheMu sync.Mutex
	vmemWinCached  VMemStatusResponse
	vmemWinCacheAt time.Time
)

func getVirtualMemoryStatus(kernel *LumaKernel, force bool) VMemStatusResponse {
	vmemWinCacheMu.Lock()
	if !force && !vmemWinCacheAt.IsZero() && time.Since(vmemWinCacheAt) < 12*time.Second && vmemWinCached.OK {
		c := vmemWinCached
		vmemWinCacheMu.Unlock()
		return c
	}
	vmemWinCacheMu.Unlock()

	cfg := loadVMemConfig()
	snap := HostHardwareSnapshot{}
	if kernel != nil {
		snap = kernel.SystemSnapshot()
	}

	drives := make([]VMemDriveInfo, 0, len(snap.Disks))
	// Fast detect SSD vs HDD once via PowerShell Get-PhysicalDisk / Win32_PageFileSetting
	ps := `
$res = @{
  pf_min = 0; pf_max = 0; pf_used = 0; pf_path = '';
  mem_comp = $true; clear_shutdown = 0;
  media = @{}
}
try {
  $pf = Get-CimInstance Win32_PageFileSetting -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($pf) {
    $res.pf_min = [int]$pf.InitialSize
    $res.pf_max = [int]$pf.MaximumSize
    $res.pf_path = [string]$pf.Name
  }
  $pfu = Get-CimInstance Win32_PageFileUsage -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($pfu) {
    $res.pf_used = [int]$pfu.CurrentUsage
    if ($res.pf_min -eq 0) { $res.pf_min = [int]$pfu.AllocatedBaseSize; $res.pf_max = [int]$pfu.AllocatedBaseSize }
    if (-not $res.pf_path) { $res.pf_path = [string]$pfu.Name }
  }
} catch {}
try {
  $mm = Get-MMAgent -ErrorAction SilentlyContinue
  if ($mm) { $res.mem_comp = [bool]$mm.MemoryCompression }
} catch {}
try {
  $cp = (Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'ClearPageFileAtShutdown' -ErrorAction SilentlyContinue).ClearPageFileAtShutdown
  if ($null -ne $cp) { $res.clear_shutdown = [int]$cp }
} catch {}
try {
  $parts = Get-Partition -ErrorAction SilentlyContinue | Where-Object { $_.DriveLetter }
  $disks = Get-PhysicalDisk -ErrorAction SilentlyContinue
  foreach ($pt in $parts) {
    $d = $disks | Where-Object { $_.DeviceId -eq [string]$pt.DiskNumber } | Select-Object -First 1
    if ($d) {
      $mt = [string]$d.MediaType
      if ($d.BusType -eq 'NVMe') { $mt = 'NVMe SSD' }
      elseif ($mt -eq 'SSD') { $mt = 'SATA SSD' }
      $res.media["$($pt.DriveLetter):"] = $mt
    }
  }
} catch {}
$res | ConvertTo-Json -Compress -Depth 3
`
	var parsed struct {
		PFMin         int               `json:"pf_min"`
		PFMax         int               `json:"pf_max"`
		PFUsed        int               `json:"pf_used"`
		PFPath        string            `json:"pf_path"`
		MemComp       bool              `json:"mem_comp"`
		ClearShutdown int               `json:"clear_shutdown"`
		Media         map[string]string `json:"media"`
	}
	parsed.MemComp = true
	if out, err := runHiddenPowerShell(ps); err == nil && strings.TrimSpace(out) != "" {
		_ = json.Unmarshal([]byte(strings.TrimSpace(out)), &parsed)
	}

	for _, d := range snap.Disks {
		drv := strings.TrimRight(strings.TrimSpace(d.Mount), `\`)
		mt := "SSD"
		if v, ok := parsed.Media[drv]; ok && v != "" {
			mt = v
		}
		isSSD := !strings.EqualFold(mt, "HDD")
		drives = append(drives, VMemDriveInfo{
			Drive:     drv,
			Label:     d.Label,
			FreeGB:    math.Round(d.FreeGB*10) / 10,
			TotalGB:   math.Round(d.TotalGB*10) / 10,
			MediaType: mt,
			IsSSD:     isSSD,
		})
	}
	if len(drives) == 0 {
		drives = append(drives, VMemDriveInfo{Drive: "C:", Label: "System", FreeGB: 64, TotalGB: 256, MediaType: "NVMe SSD", IsSSD: true})
	}

	cfg.Drive = normalizeVMemDrive(cfg.Drive, drives)
	selectedSSD := true
	for _, dr := range drives {
		if strings.EqualFold(dr.Drive, cfg.Drive) {
			selectedSSD = dr.IsSSD
			break
		}
	}

	isFixed := parsed.PFMin > 0 && parsed.PFMin == parsed.PFMax
	sizeForCalc := cfg.PresetGB
	if sizeForCalc == 0 && parsed.PFMax > 0 {
		sizeForCalc = int(math.Round(float64(parsed.PFMax) / 1024.0))
	}
	tbw := calculateSsdTBWWear(sizeForCalc, cfg.SsdRatedTBW, cfg.FixedMinMax || isFixed, parsed.MemComp, parsed.ClearShutdown != 0, selectedSSD)

	vmemMu.RLock()
	needReboot := vmemNeedsReboot
	vmemMu.RUnlock()

	addedGB := float64(parsed.PFMax) / 1024.0
	if cfg.Enabled && cfg.PresetGB > 0 {
		addedGB = float64(cfg.PresetGB)
	}

	resp := VMemStatusResponse{
		OK:                       true,
		Platform:                 "windows",
		IsAdmin:                  isProcessElevatedWin(),
		PhysicalRAMTotalGB:       math.Round(snap.RAMTotalGB*10) / 10,
		PhysicalRAMUsedGB:        math.Round(snap.RAMUsedGB*10) / 10,
		CurrentPageFileMinMB:     parsed.PFMin,
		CurrentPageFileMaxMB:     parsed.PFMax,
		CurrentPageFileUsedMB:    parsed.PFUsed,
		CurrentPageFilePath:      parsed.PFPath,
		IsFixedMinMax:            isFixed,
		MemoryCompressionEnabled: parsed.MemComp,
		ClearPageFileAtShutdown:  parsed.ClearShutdown != 0,
		Config:                   cfg,
		Drives:                   drives,
		TBW:                      tbw,
		EffectiveTotalRAMGB:      math.Round((snap.RAMTotalGB+addedGB)*10) / 10,
		NeedsReboot:              needReboot,
	}

	vmemWinCacheMu.Lock()
	vmemWinCached = resp
	vmemWinCacheAt = time.Now()
	vmemWinCacheMu.Unlock()
	return resp
}

func configureVirtualMemory(req VMemConfigureRequest, kernel *LumaKernel) map[string]interface{} {
	if req.SizeGB != 0 && req.SizeGB != 2 && req.SizeGB != 4 && req.SizeGB != 6 {
		return map[string]interface{}{"ok": false, "error": "Поддерживаются режимы: 0 (Авто), 2, 4 или 6 ГБ"}
	}
	status := getVirtualMemoryStatus(kernel, false)
	cfg := loadVMemConfig()
	cfg.PresetGB = req.SizeGB
	cfg.Enabled = req.SizeGB > 0
	if strings.TrimSpace(req.Drive) != "" {
		cfg.Drive = strings.TrimRight(strings.TrimSpace(req.Drive), `\`)
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

	// Verify free disk space safety margin (require at least size + 4 GB free)
	if req.SizeGB > 0 {
		for _, dr := range status.Drives {
			if strings.EqualFold(dr.Drive, cfg.Drive) && dr.FreeGB < float64(req.SizeGB)+4.0 {
				return map[string]interface{}{
					"ok":    false,
					"error": fmt.Sprintf("На диске %s недостаточно свободного места (%.1f ГБ). Нужно минимум %d ГБ.", dr.Drive, dr.FreeGB, req.SizeGB+4),
				}
			}
		}
	}

	saveVMemConfig(cfg)

	if !isProcessElevatedWin() {
		return map[string]interface{}{
			"ok":             true,
			"applied":        false,
			"requires_admin": true,
			"message":        "Профиль Luma SwapBoost сохранён. Для изменения pagefile.sys, Memory Compression и реестра Windows перезапустите Luma OS от имени Администратора (UAC).",
			"status":         getVirtualMemoryStatus(kernel, true),
		}
	}

	// Apply real SSD-friendly Windows Virtual Memory configuration!
	mb := req.SizeGB * 1024
	clearVal := 0
	if cfg.ClearPageFileAtShutdown {
		clearVal = 1
	}
	compCmd := "Enable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue"
	if !cfg.MemoryCompression {
		compCmd = "Disable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue"
	}

	var pfCmd string
	if req.SizeGB == 0 {
		pfCmd = `
$cs = Get-CimInstance Win32_ComputerSystem
$cs | Set-CimInstance -Property @{ AutomaticManagedPagefile = $true } -ErrorAction SilentlyContinue
`
	} else {
		pfPath := fmt.Sprintf(`%s\pagefile.sys`, cfg.Drive)
		pfCmd = fmt.Sprintf(`
$cs = Get-CimInstance Win32_ComputerSystem
$cs | Set-CimInstance -Property @{ AutomaticManagedPagefile = $false } -ErrorAction SilentlyContinue
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'PagingFiles' -Value @('%s %d %d') -Type MultiString
`, pfPath, mb, mb)
	}

	script := fmt.Sprintf(`
%s
%s
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'ClearPageFileAtShutdown' -Value %d -Type DWord
Write-Output 'OK'
`, pfCmd, compCmd, clearVal)

	out, err := runHiddenPowerShell(script)
	if err != nil {
		return map[string]interface{}{
			"ok":     false,
			"error":  fmt.Sprintf("Не удалось применить настройки виртуальной памяти: %v (%s)", err, strings.TrimSpace(out)),
			"status": getVirtualMemoryStatus(kernel, true),
		}
	}

	vmemMu.Lock()
	vmemNeedsReboot = true
	vmemMu.Unlock()

	return map[string]interface{}{
		"ok":           true,
		"applied":      true,
		"needs_reboot": true,
		"message":      fmt.Sprintf("Виртуальная память настроена: фиксированный %d ГБ (Min==Max=%d МБ) на %s, Сжатие памяти=%v, ClearPageFileAtShutdown=%d. Вступит в силу после перезагрузки.", req.SizeGB, mb, cfg.Drive, cfg.MemoryCompression, clearVal),
		"status":       getVirtualMemoryStatus(kernel, true),
	}
}
