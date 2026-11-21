package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// ==================== 1. ETERNAL VERSION-INDEPENDENT STATE STORE ====================
// Persists desktop widgets, shortcuts, universal folders, apps, themes, wallpapers,
// language, and settings in %APPDATA%/LumaOS/luma_permanent_state.json (+ .bak backup)
// so upgrading to any future Luma OS version or clearing WebView2 cache NEVER loses data!

type EternalStateStore struct {
	mu       sync.RWMutex
	dir      string
	filePath string
	bakPath  string
	data     map[string]json.RawMessage
}

func resolveEternalLumaDir() string {
	cfg, err := os.UserConfigDir()
	if err != nil || cfg == "" {
		cfg = os.TempDir()
	}
	dir := filepath.Join(cfg, "LumaOS")
	_ = os.MkdirAll(dir, 0o700)
	return dir
}

func NewEternalStateStore() *EternalStateStore {
	dir := resolveEternalLumaDir()
	s := &EternalStateStore{
		dir:      dir,
		filePath: filepath.Join(dir, "luma_permanent_state.json"),
		bakPath:  filepath.Join(dir, "luma_permanent_state.bak.json"),
		data:     make(map[string]json.RawMessage),
	}
	s.loadFromDisk()
	return s
}

func (s *EternalStateStore) loadFromDisk() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, p := range []string{s.filePath, s.bakPath} {
		raw, err := os.ReadFile(p)
		if err != nil || len(raw) < 2 {
			continue
		}
		var parsed map[string]json.RawMessage
		if json.Unmarshal(raw, &parsed) == nil && parsed != nil {
			s.data = parsed
			return
		}
	}
}

func (s *EternalStateStore) GetAll() map[string]json.RawMessage {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make(map[string]json.RawMessage, len(s.data))
	for k, v := range s.data {
		out[k] = v
	}
	return out
}

func (s *EternalStateStore) MergeAndSave(patch map[string]json.RawMessage) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for k, v := range patch {
		if len(v) > 0 && string(v) != "null" {
			s.data[k] = v
		}
	}
	raw, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return err
	}
	// Preserve previous good file as rolling .bak before atomic swap
	if existing, err := os.ReadFile(s.filePath); err == nil && len(existing) > 2 {
		_ = os.WriteFile(s.bakPath, existing, 0o600)
	}
	tmp := s.filePath + ".tmp"
	if err := os.WriteFile(tmp, raw, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, s.filePath)
}

// ==================== 2. BATTERY ANALYTICS & SCREEN-ON TIME TRACKER ====================

type BatteryHistoryPoint struct {
	Timestamp int64  `json:"ts"`
	Label     string `json:"label"`
	Percent   int    `json:"percent"`
	Charging  bool   `json:"charging"`
}

type ScreenTimeDay struct {
	Date    string `json:"date"`    // YYYY-MM-DD
	Weekday string `json:"weekday"` // Mon/Tue/...
	Minutes int    `json:"minutes"`
}

type BatteryAnalyticsDisk struct {
	History     []BatteryHistoryPoint `json:"history"`
	ScreenDays  []ScreenTimeDay       `json:"screen_days"`
	LastUpdated int64                 `json:"last_updated"`
}

type BatteryTracker struct {
	mu       sync.RWMutex
	filePath string
	disk     BatteryAnalyticsDisk
	probe    *platformProbe
}

func NewBatteryTracker(probe *platformProbe) *BatteryTracker {
	dir := resolveEternalLumaDir()
	bt := &BatteryTracker{
		filePath: filepath.Join(dir, "battery_history.json"),
		probe:    probe,
	}
	bt.load()
	bt.recordSample()
	go bt.loop()
	return bt
}

func (b *BatteryTracker) load() {
	b.mu.Lock()
	defer b.mu.Unlock()
	raw, err := os.ReadFile(b.filePath)
	if err == nil {
		_ = json.Unmarshal(raw, &b.disk)
	}
	if b.disk.History == nil {
		b.disk.History = []BatteryHistoryPoint{}
	}
	if b.disk.ScreenDays == nil {
		b.disk.ScreenDays = []ScreenTimeDay{}
	}
}

func (b *BatteryTracker) saveLocked() {
	raw, err := json.Marshal(b.disk)
	if err == nil {
		_ = os.WriteFile(b.filePath, raw, 0o600)
	}
}

func (b *BatteryTracker) loop() {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		b.recordSample()
	}
}

func (b *BatteryTracker) recordSample() {
	if b.probe == nil {
		return
	}
	snap := b.probe.Collect(LocationInfo{})
	now := time.Now()
	today := now.Format("2006-01-02")
	wd := now.Format("Mon")

	b.mu.Lock()
	defer b.mu.Unlock()

	pt := BatteryHistoryPoint{
		Timestamp: now.Unix(),
		Label:     now.Format("15:04"),
		Percent:   snap.BatteryPercent,
		Charging:  snap.BatteryCharging,
	}
	// Append if last point is > 2 min old or changed
	n := len(b.disk.History)
	if n == 0 || now.Unix()-b.disk.History[n-1].Timestamp >= 120 || b.disk.History[n-1].Percent != pt.Percent || b.disk.History[n-1].Charging != pt.Charging {
		b.disk.History = append(b.disk.History, pt)
		// Keep last 288 samples (~24 hours at 5-min / 1-min granularity)
		if len(b.disk.History) > 288 {
			b.disk.History = b.disk.History[len(b.disk.History)-288:]
		}
	}

	// Track real screen-on minutes for today
	found := false
	for i := range b.disk.ScreenDays {
		if b.disk.ScreenDays[i].Date == today {
			if now.Unix()-b.disk.LastUpdated >= 50 {
				b.disk.ScreenDays[i].Minutes++
			}
			found = true
			break
		}
	}
	if !found {
		b.disk.ScreenDays = append(b.disk.ScreenDays, ScreenTimeDay{
			Date:    today,
			Weekday: wd,
			Minutes: 1,
		})
		if len(b.disk.ScreenDays) > 7 {
			b.disk.ScreenDays = b.disk.ScreenDays[len(b.disk.ScreenDays)-7:]
		}
	}
	b.disk.LastUpdated = now.Unix()
	b.saveLocked()
}

func (b *BatteryTracker) Report() map[string]interface{} {
	details := BatteryHardwareDetails{
		Present:               false,
		Percent:               100,
		Charging:              true,
		HealthPercent:         100,
		DesignCapacityMWh:     0,
		FullChargeCapacityMWh: 0,
		CycleCount:            0,
		PowerWatts:            0,
		VoltageMV:             0,
		EstimatedMinutes:      0,
		StatusText:            "Питание от сети",
		Chemistry:             "Li-Ion",
	}
	if b.probe != nil {
		details = b.probe.GetBatteryDetails()
	}

	b.mu.RLock()
	hist := make([]BatteryHistoryPoint, len(b.disk.History))
	copy(hist, b.disk.History)
	days := make([]ScreenTimeDay, len(b.disk.ScreenDays))
	copy(days, b.disk.ScreenDays)
	b.mu.RUnlock()

	today := time.Now().Format("2006-01-02")
	todayMin := 0
	for _, d := range days {
		if d.Date == today {
			todayMin = d.Minutes
		}
	}

	return map[string]interface{}{
		"ok":                   true,
		"details":              details,
		"history":              hist,
		"screen_time_today_min": todayMin,
		"screen_time_7d":       days,
	}
}
