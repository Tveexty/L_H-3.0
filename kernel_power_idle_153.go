package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

// ==================== LUMA OS 1.6.3 (NITROGEN) IDLE SLEEP + HARDWARE BATTERY CHARGE BLOCK / BATTERY CARE ====================

type IdleSleepConfig struct {
	DisplayOffACMin     int  `json:"display_off_ac_min"`     // 0 = Never
	SleepACMin          int  `json:"sleep_ac_min"`           // 0 = Never
	DisplayOffDCMin     int  `json:"display_off_dc_min"`     // 0 = Never
	SleepDCMin          int  `json:"sleep_dc_min"`           // 0 = Never
	HibernateAfterMin   int  `json:"hibernate_after_min"`    // 0 = Never
	LockBeforeSleep     bool `json:"lock_before_sleep"`      // Lock Luma OS before system sleep
	KeepAwake           bool `json:"keep_awake"`             // Caffeine mode (prevent idle sleep)
	PreventSleepOnMedia bool `json:"prevent_sleep_on_media"` // Keep display/PC awake while playing video/recording
}

type IdleSleepResponse struct {
	OK              bool            `json:"ok"`
	Config          IdleSleepConfig `json:"config"`
	IdleSeconds     int64           `json:"idle_seconds"`
	ACOnline        bool            `json:"ac_online"`
	PlatformApplied bool            `json:"platform_applied"`
	Message         string          `json:"message,omitempty"`
}

// ChargeLimitConfig controls real laptop Battery Care & Stop-Charging (AC-only Conservation Mode)
type ChargeLimitConfig struct {
	Enabled         bool `json:"enabled"`
	StopChargingNow bool `json:"stop_charging_now"` // Hard stop charging on AC power (laptop stays plugged in without charging battery!)
	LimitPercent    int  `json:"limit_percent"`     // 50..100
	NotifyAtLimit   bool `json:"notify_at_limit"`
	AutoEcoAtLimit  bool `json:"auto_eco_at_limit"`
}

type ChargeLimitResponse struct {
	OK              bool              `json:"ok"`
	Config          ChargeLimitConfig `json:"config"`
	BatteryPresent  bool              `json:"battery_present"`
	BatteryPercent  int               `json:"battery_percent"`
	BatteryCharging bool              `json:"battery_charging"`
	LimitReached    bool              `json:"limit_reached"`
	HardwareApplied bool              `json:"hardware_applied"`
	HardwareVendor  string            `json:"hardware_vendor,omitempty"`
	HardwareMethod  string            `json:"hardware_method,omitempty"`
	HardwareNote    string            `json:"hardware_note"`
	Message         string            `json:"message,omitempty"`
}

type IdleSleepManager struct {
	mu             sync.Mutex
	cfgPath        string
	chargeCfgPath  string
	cfg            IdleSleepConfig
	chargeCfg      ChargeLimitConfig
	lastHwApplied  bool
	lastHwVendor   string
	lastHwMethod   string
	lastHwNote     string
}

func defaultIdleSleepConfig() IdleSleepConfig {
	return IdleSleepConfig{
		DisplayOffACMin:     15,
		SleepACMin:          30,
		DisplayOffDCMin:     5,
		SleepDCMin:          15,
		HibernateAfterMin:   0,
		LockBeforeSleep:     true,
		KeepAwake:           false,
		PreventSleepOnMedia: true,
	}
}

func defaultChargeLimitConfig() ChargeLimitConfig {
	return ChargeLimitConfig{
		Enabled:         false,
		StopChargingNow: false,
		LimitPercent:    80,
		NotifyAtLimit:   true,
		AutoEcoAtLimit:  true,
	}
}

func NewIdleSleepManager(vfsRoot string) *IdleSleepManager {
	m := &IdleSleepManager{
		cfgPath:       filepath.Join(vfsRoot, "power_idle_sleep.json"),
		chargeCfgPath: filepath.Join(vfsRoot, "power_charge_limit.json"),
		cfg:           defaultIdleSleepConfig(),
		chargeCfg:     defaultChargeLimitConfig(),
	}
	if osCfg, ok := platformReadIdleSleepConfig(); ok {
		m.cfg.DisplayOffACMin = osCfg.DisplayOffACMin
		m.cfg.SleepACMin = osCfg.SleepACMin
		m.cfg.DisplayOffDCMin = osCfg.DisplayOffDCMin
		m.cfg.SleepDCMin = osCfg.SleepDCMin
		m.cfg.HibernateAfterMin = osCfg.HibernateAfterMin
	}
	if raw, err := os.ReadFile(m.cfgPath); err == nil {
		var saved IdleSleepConfig
		if json.Unmarshal(raw, &saved) == nil {
			m.cfg = clampIdleSleepConfig(saved)
		}
	}
	if raw, err := os.ReadFile(m.chargeCfgPath); err == nil {
		var saved ChargeLimitConfig
		if json.Unmarshal(raw, &saved) == nil {
			m.chargeCfg = clampChargeLimitConfig(saved)
		}
	}
	if m.cfg.KeepAwake {
		platformSetKeepAwake(true)
	}
	if m.chargeCfg.Enabled || m.chargeCfg.StopChargingNow {
		go func(c ChargeLimitConfig) {
			applied, vendor, method, note := platformApplyChargeLimit(c, 80)
			m.mu.Lock()
			m.lastHwApplied = applied
			m.lastHwVendor = vendor
			m.lastHwMethod = method
			m.lastHwNote = note
			m.mu.Unlock()
		}(m.chargeCfg)
	}
	return m
}

func clampIdleSleepConfig(c IdleSleepConfig) IdleSleepConfig {
	clamp := func(v, max int) int {
		if v < 0 {
			return 0
		}
		if v > max {
			return max
		}
		return v
	}
	c.DisplayOffACMin = clamp(c.DisplayOffACMin, 720)
	c.SleepACMin = clamp(c.SleepACMin, 720)
	c.DisplayOffDCMin = clamp(c.DisplayOffDCMin, 720)
	c.SleepDCMin = clamp(c.SleepDCMin, 720)
	c.HibernateAfterMin = clamp(c.HibernateAfterMin, 1440)
	return c
}

func clampChargeLimitConfig(c ChargeLimitConfig) ChargeLimitConfig {
	if c.LimitPercent < 50 {
		c.LimitPercent = 50
	}
	if c.LimitPercent > 100 {
		c.LimitPercent = 100
	}
	if c.StopChargingNow {
		c.Enabled = true
	}
	return c
}

func (m *IdleSleepManager) Status(acOnline bool) IdleSleepResponse {
	m.mu.Lock()
	cfg := m.cfg
	m.mu.Unlock()
	return IdleSleepResponse{
		OK:              true,
		Config:          cfg,
		IdleSeconds:     platformGetIdleSeconds(),
		ACOnline:        acOnline,
		PlatformApplied: true,
	}
}

func (m *IdleSleepManager) Update(next IdleSleepConfig, acOnline bool) IdleSleepResponse {
	next = clampIdleSleepConfig(next)
	applied, msg := platformApplyIdleSleepConfig(next)
	platformSetKeepAwake(next.KeepAwake)

	m.mu.Lock()
	m.cfg = next
	if raw, err := json.MarshalIndent(next, "", "  "); err == nil {
		_ = os.MkdirAll(filepath.Dir(m.cfgPath), 0o700)
		_ = os.WriteFile(m.cfgPath, raw, 0o600)
	}
	m.mu.Unlock()

	return IdleSleepResponse{
		OK:              true,
		Config:          next,
		IdleSeconds:     platformGetIdleSeconds(),
		ACOnline:        acOnline,
		PlatformApplied: applied,
		Message:         msg,
	}
}

func (m *IdleSleepManager) ChargeStatus(hw HostHardwareSnapshot) ChargeLimitResponse {
	m.mu.Lock()
	cfg := m.chargeCfg
	hwApplied := m.lastHwApplied
	hwVendor := m.lastHwVendor
	hwMethod := m.lastHwMethod
	hwNote := m.lastHwNote
	m.mu.Unlock()

	reached := (cfg.Enabled || cfg.StopChargingNow) && hw.BatteryPresent && (cfg.StopChargingNow || hw.BatteryPercent >= cfg.LimitPercent)
	note := hwNote
	if note == "" {
		if cfg.StopChargingNow {
			note = "Режим «Не заряжать батарею» активен — ноутбук работает от сети без подзарядки АКБ"
		} else if hw.BatteryPresent {
			note = fmt.Sprintf("Защита АКБ до %d%% — продлевает ресурс аккумулятора до 2.5×", cfg.LimitPercent)
		} else {
			note = "Умный контроль заряда LumaCore 1.5.3 готов к работе"
		}
	}
	return ChargeLimitResponse{
		OK:              true,
		Config:          cfg,
		BatteryPresent:  hw.BatteryPresent,
		BatteryPercent:  hw.BatteryPercent,
		BatteryCharging: hw.BatteryCharging,
		LimitReached:    reached,
		HardwareApplied: hwApplied,
		HardwareVendor:  hwVendor,
		HardwareMethod:  hwMethod,
		HardwareNote:    note,
	}
}

func (m *IdleSleepManager) UpdateChargeLimit(next ChargeLimitConfig, hw HostHardwareSnapshot) ChargeLimitResponse {
	next = clampChargeLimitConfig(next)
	applied, vendor, method, note := platformApplyChargeLimit(next, hw.BatteryPercent)

	m.mu.Lock()
	m.chargeCfg = next
	m.lastHwApplied = applied
	m.lastHwVendor = vendor
	m.lastHwMethod = method
	m.lastHwNote = note
	if raw, err := json.MarshalIndent(next, "", "  "); err == nil {
		_ = os.MkdirAll(filepath.Dir(m.chargeCfgPath), 0o700)
		_ = os.WriteFile(m.chargeCfgPath, raw, 0o600)
	}
	m.mu.Unlock()

	resp := m.ChargeStatus(hw)
	if next.StopChargingNow {
		if applied {
			resp.Message = fmt.Sprintf("Зарядка ноутбука остановлена аппаратно (%s · %s)", vendor, method)
		} else {
			resp.Message = "Активирован режим «Не заряжать батарею» (контроль AC + защита от перегрева АКБ)"
		}
	} else if next.Enabled {
		if applied {
			resp.Message = fmt.Sprintf("Аппаратный лимит заряда %d%% применён (%s)", next.LimitPercent, vendor)
		} else {
			resp.Message = fmt.Sprintf("Режим сбережения батареи включён: лимит %d%%", next.LimitPercent)
		}
	} else {
		resp.Message = "Ограничение заряда снято — стандартная зарядка до 100%"
	}
	return resp
}
