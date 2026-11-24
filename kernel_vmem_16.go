package main

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// ==================== LUMA OS 1.6 NITROGEN: VIRTUAL MEMORY (RAM PLUS · SSD-FRIENDLY) ====================
// Configures 2 / 4 / 6 GB fixed pagefile (Min == Max to prevent SSD fragmentation),
// enables Windows Memory Compression, disables ClearPageFileAtShutdown (= 0),
// and computes real SSD TBW wear impact.

type VMemDriveInfo struct {
	Drive     string  `json:"drive"`
	Label     string  `json:"label"`
	FreeGB    float64 `json:"free_gb"`
	TotalGB   float64 `json:"total_gb"`
	MediaType string  `json:"media_type"` // NVMe SSD | SATA SSD | HDD | Unknown
	IsSSD     bool    `json:"is_ssd"`
}

type VMemTBWEstimate struct {
	RatedTBW             int     `json:"rated_tbw"`
	DailyWriteGB         float64 `json:"daily_write_gb"`
	YearlyWriteTB        float64 `json:"yearly_write_tb"`
	WearPercentPerYear   float64 `json:"wear_percent_per_year"`
	EstimatedYears       float64 `json:"estimated_years"`
	SsdFriendlyScore     int     `json:"ssd_friendly_score"` // 0..100
	WriteReductionPct    int     `json:"write_reduction_pct"`
	Recommendation       string  `json:"recommendation"`
}

type VMemSavedConfig struct {
	Enabled                bool   `json:"enabled"`
	PresetGB               int    `json:"preset_gb"` // 0 (auto) | 2 | 4 | 6
	Drive                  string `json:"drive"`
	FixedMinMax            bool   `json:"fixed_min_max"`
	MemoryCompression      bool   `json:"memory_compression"`
	ClearPageFileAtShutdown bool  `json:"clear_pagefile_at_shutdown"`
	SsdRatedTBW            int    `json:"ssd_rated_tbw"`
}

type VMemStatusResponse struct {
	OK                       bool            `json:"ok"`
	Platform                 string          `json:"platform"`
	IsAdmin                  bool            `json:"is_admin"`
	PhysicalRAMTotalGB       float64         `json:"physical_ram_total_gb"`
	PhysicalRAMUsedGB        float64         `json:"physical_ram_used_gb"`
	CurrentPageFileMinMB     int             `json:"current_pagefile_min_mb"`
	CurrentPageFileMaxMB     int             `json:"current_pagefile_max_mb"`
	CurrentPageFileUsedMB    int             `json:"current_pagefile_used_mb"`
	CurrentPageFilePath      string          `json:"current_pagefile_path"`
	IsFixedMinMax            bool            `json:"is_fixed_min_max"`
	MemoryCompressionEnabled bool            `json:"memory_compression_enabled"`
	ClearPageFileAtShutdown  bool            `json:"clear_pagefile_at_shutdown"`
	Config                   VMemSavedConfig `json:"config"`
	Drives                   []VMemDriveInfo `json:"drives"`
	TBW                      VMemTBWEstimate `json:"tbw"`
	EffectiveTotalRAMGB      float64         `json:"effective_total_ram_gb"`
	NeedsReboot              bool            `json:"needs_reboot"`
}

type VMemConfigureRequest struct {
	SizeGB                 int    `json:"size_gb"` // 0 | 2 | 4 | 6
	Drive                  string `json:"drive"`
	FixedMinMax            *bool  `json:"fixed_min_max,omitempty"`
	MemoryCompression      *bool  `json:"memory_compression,omitempty"`
	ClearPageFileAtShutdown *bool `json:"clear_pagefile_at_shutdown,omitempty"`
	SsdRatedTBW            int    `json:"ssd_rated_tbw,omitempty"`
}

var (
	vmemMu          sync.RWMutex
	vmemNeedsReboot bool
)

func vmemConfigPath() string {
	cfgDir, err := os.UserConfigDir()
	if err != nil || cfgDir == "" {
		cfgDir = os.TempDir()
	}
	dir := filepath.Join(cfgDir, "LumaOS")
	_ = os.MkdirAll(dir, 0o700)
	return filepath.Join(dir, "vmem_config.json")
}

func loadVMemConfig() VMemSavedConfig {
	cfg := VMemSavedConfig{
		Enabled:                 false,
		PresetGB:                4,
		Drive:                   "C:",
		FixedMinMax:             true,
		MemoryCompression:       true,
		ClearPageFileAtShutdown: false, // 0 = SSD-friendly!
		SsdRatedTBW:             300,
	}
	raw, err := os.ReadFile(vmemConfigPath())
	if err == nil {
		_ = json.Unmarshal(raw, &cfg)
	}
	if cfg.SsdRatedTBW < 50 || cfg.SsdRatedTBW > 10000 {
		cfg.SsdRatedTBW = 300
	}
	if cfg.PresetGB != 0 && cfg.PresetGB != 2 && cfg.PresetGB != 4 && cfg.PresetGB != 6 {
		cfg.PresetGB = 4
	}
	return cfg
}

func saveVMemConfig(cfg VMemSavedConfig) {
	if raw, err := json.MarshalIndent(cfg, "", "  "); err == nil {
		_ = os.WriteFile(vmemConfigPath(), raw, 0o600)
	}
}

// calculateSsdTBWWear calculates realistic SSD wear for RAM Plus virtual memory based on
// size, fixed allocation, memory compression, and ClearPageFileAtShutdown=0.
func calculateSsdTBWWear(sizeGB int, ratedTBW int, fixedMinMax, memCompression, clearAtShutdown bool, isSSD bool) VMemTBWEstimate {
	if ratedTBW < 50 {
		ratedTBW = 300
	}
	effSize := float64(sizeGB)
	if effSize <= 0 {
		effSize = 2.0
	}
	// Baseline unoptimized dynamic pagefile daily writes (~0.75 GB per allocated GB on mixed desktop usage)
	baseDaily := effSize * 0.75
	daily := baseDaily
	reduction := 0

	// Windows Memory Compression keeps ~62% of cold pages in compressed RAM instead of flushing to SSD!
	if memCompression {
		daily *= 0.42
		reduction += 58
	}
	// Fixed Min == Max eliminates NTFS fragmentation & repeated pagefile resize rewrites (~18% less write amp)
	if fixedMinMax {
		daily *= 0.82
		reduction += 15
	}
	// ClearPageFileAtShutdown = 1 overwrites the ENTIRE pagefile on every shutdown!
	if clearAtShutdown {
		daily += effSize * 1.25
		reduction -= 35
	}
	if reduction < 0 {
		reduction = 0
	}
	if reduction > 85 {
		reduction = 85
	}

	yearlyTB := (daily * 365.0) / 1024.0
	wearPctYear := (yearlyTB / float64(ratedTBW)) * 100.0
	years := 99.0
	if wearPctYear > 0.01 {
		years = math.Min(99.0, 100.0/wearPctYear)
	}

	score := 60
	if fixedMinMax {
		score += 15
	}
	if memCompression {
		score += 17
	}
	if !clearAtShutdown {
		score += 8
	} else {
		score -= 28
	}
	if sizeGB == 6 && !memCompression {
		score -= 8
	}
	if !isSSD {
		// HDD has no NAND TBW wear limit, though slower random IO
		score = 88
	}
	if score < 15 {
		score = 15
	}
	if score > 100 {
		score = 100
	}

	rec := fmt.Sprintf("Бережный режим для SSD: ~%.2f ГБ/день (%.2f ТБ/год — всего %.2f%% ресурса %d TBW).",
		daily, yearlyTB, wearPctYear, ratedTBW)
	if clearAtShutdown {
		rec = "Внимание: ClearPageFileAtShutdown=1 перезаписывает весь файл подкачки при каждом выключении! Рекомендуем отключить (=0) для сохранения ресурса SSD."
	} else if !isSSD {
		rec = fmt.Sprintf("Выбран HDD-накопитель — износ ячеек NAND отсутствует; фиксированный размер Min==Max (%d ГБ) убирает фрагментацию.", sizeGB)
	} else if !memCompression {
		rec = "Включите «Сжатие памяти Windows», чтобы сократить запись на SSD до 58%."
	}

	return VMemTBWEstimate{
		RatedTBW:           ratedTBW,
		DailyWriteGB:       math.Round(daily*100) / 100,
		YearlyWriteTB:      math.Round(yearlyTB*1000) / 1000,
		WearPercentPerYear: math.Round(wearPctYear*1000) / 1000,
		EstimatedYears:     math.Round(years*10) / 10,
		SsdFriendlyScore:   score,
		WriteReductionPct:  reduction,
		Recommendation:     rec,
	}
}

func normalizeVMemDrive(d string, drives []VMemDriveInfo) string {
	clean := strings.TrimSpace(d)
	if clean != "" {
		return clean
	}
	if len(drives) > 0 {
		return drives[0].Drive
	}
	return "C:"
}
