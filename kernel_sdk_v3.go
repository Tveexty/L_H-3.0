package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// DeveloperSDKStore (Luma OS 1.4 Boron · API v3.0) manages developer-installed custom themes and plugins
// persisted safely on disk across updates & rollbacks.
type DeveloperSDKStore struct {
	mu      sync.RWMutex
	dir     string
	themes  []DeveloperThemeItem
	plugins []DeveloperPluginItem
}

func NewDeveloperSDKStore() *DeveloperSDKStore {
	cfgDir, err := os.UserConfigDir()
	if err != nil || cfgDir == "" {
		cfgDir = os.TempDir()
	}
	dir := filepath.Join(cfgDir, "LumaOS", "sdk_v3")
	_ = os.MkdirAll(dir, 0o700)
	s := &DeveloperSDKStore{
		dir:     dir,
		themes:  []DeveloperThemeItem{},
		plugins: []DeveloperPluginItem{},
	}
	s.load()
	return s
}

func (s *DeveloperSDKStore) themesPath() string  { return filepath.Join(s.dir, "themes.json") }
func (s *DeveloperSDKStore) pluginsPath() string { return filepath.Join(s.dir, "plugins.json") }

func (s *DeveloperSDKStore) load() {
	if raw, err := os.ReadFile(s.themesPath()); err == nil {
		var list []DeveloperThemeItem
		if json.Unmarshal(raw, &list) == nil {
			s.themes = list
		}
	}
	if raw, err := os.ReadFile(s.pluginsPath()); err == nil {
		var list []DeveloperPluginItem
		if json.Unmarshal(raw, &list) == nil {
			s.plugins = list
		}
	}
}

func (s *DeveloperSDKStore) saveThemesLocked() {
	if raw, err := json.MarshalIndent(s.themes, "", "  "); err == nil {
		_ = os.WriteFile(s.themesPath(), raw, 0o600)
	}
}

func (s *DeveloperSDKStore) savePluginsLocked() {
	if raw, err := json.MarshalIndent(s.plugins, "", "  "); err == nil {
		_ = os.WriteFile(s.pluginsPath(), raw, 0o600)
	}
}

func (s *DeveloperSDKStore) ListThemes() []DeveloperThemeItem {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]DeveloperThemeItem, len(s.themes))
	copy(out, s.themes)
	return out
}

func (s *DeveloperSDKStore) UpsertTheme(t DeveloperThemeItem) (DeveloperThemeItem, error) {
	t.Name = strings.TrimSpace(t.Name)
	if t.Name == "" {
		return t, fmt.Errorf("поле 'name' обязательно для темы SDK v3.0")
	}
	if strings.TrimSpace(t.ID) == "" {
		slug := strings.ToLower(strings.ReplaceAll(t.Name, " ", "_"))
		t.ID = fmt.Sprintf("dev_theme_%s_%d", slug, time.Now().Unix()%10000)
	}
	if t.AccentHex == "" {
		t.AccentHex = "#6366f1"
	}
	if t.Accent == "" {
		t.Accent = "indigo"
	}
	if t.CardHex == "" {
		if t.IsDark {
			t.CardHex = "#141824"
		} else {
			t.CardHex = "#e8ecf2"
		}
	}
	if t.SurfaceRgba == "" {
		if t.IsDark {
			t.SurfaceRgba = "rgba(18, 22, 34, 0.90)"
		} else {
			t.SurfaceRgba = "rgba(235, 239, 246, 0.92)"
		}
	}
	if t.BgGradient == "" {
		if t.IsDark {
			t.BgGradient = fmt.Sprintf("radial-gradient(circle at 18%% 14%%, %s33, transparent 48%%), linear-gradient(155deg, #070a14 0%%, #0f1526 55%%, #090d1a 100%%)", t.AccentHex)
		} else {
			t.BgGradient = fmt.Sprintf("radial-gradient(circle at 18%% 14%%, %s22, transparent 48%%), linear-gradient(155deg, #dce3ef 0%%, #cfd8e8 55%%, #c5d0e3 100%%)", t.AccentHex)
		}
	}
	if t.Author == "" {
		t.Author = "Luma Developer"
	}
	if t.Version == "" {
		t.Version = "1.0.0"
	}
	t.Custom = true
	if t.CreatedAt == "" {
		t.CreatedAt = time.Now().Format("02.01.2006 15:04")
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	replaced := false
	for i := range s.themes {
		if s.themes[i].ID == t.ID {
			s.themes[i] = t
			replaced = true
			break
		}
	}
	if !replaced {
		s.themes = append([]DeveloperThemeItem{t}, s.themes...)
	}
	s.saveThemesLocked()
	return t, nil
}

func (s *DeveloperSDKStore) DeleteTheme(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	clean := strings.TrimSpace(id)
	for i, t := range s.themes {
		if t.ID == clean {
			s.themes = append(s.themes[:i], s.themes[i+1:]...)
			s.saveThemesLocked()
			return true
		}
	}
	return false
}

func (s *DeveloperSDKStore) ListPlugins() []DeveloperPluginItem {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]DeveloperPluginItem, len(s.plugins))
	copy(out, s.plugins)
	return out
}

func (s *DeveloperSDKStore) UpsertPlugin(p DeveloperPluginItem) (DeveloperPluginItem, error) {
	p.Name = strings.TrimSpace(p.Name)
	if p.Name == "" {
		return p, fmt.Errorf("поле 'name' обязательно для плагина SDK v3.0")
	}
	if strings.TrimSpace(p.ID) == "" {
		slug := strings.ToLower(strings.ReplaceAll(p.Name, " ", "_"))
		p.ID = fmt.Sprintf("dev_plug_%s_%d", slug, time.Now().Unix()%10000)
	}
	if p.Version == "" {
		p.Version = "1.0.0"
	}
	p.APIVersion = "3.0"
	if p.Author == "" {
		p.Author = "Luma Developer"
	}
	if p.Category == "" {
		p.Category = "Developer"
	}
	if p.Icon == "" {
		p.Icon = "Puzzle"
	}
	if p.File == "" {
		p.File = p.ID + ".luma.json"
	}
	if len(p.Hooks) == 0 {
		p.Hooks = []string{"onBoot", "onAction"}
	}
	if p.CreatedAt == "" {
		p.CreatedAt = time.Now().Format("02.01.2006 15:04")
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	replaced := false
	for i := range s.plugins {
		if s.plugins[i].ID == p.ID {
			s.plugins[i] = p
			replaced = true
			break
		}
	}
	if !replaced {
		s.plugins = append([]DeveloperPluginItem{p}, s.plugins...)
	}
	s.savePluginsLocked()
	return p, nil
}

func (s *DeveloperSDKStore) DeletePlugin(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	clean := strings.TrimSpace(id)
	for i, p := range s.plugins {
		if p.ID == clean {
			s.plugins = append(s.plugins[:i], s.plugins[i+1:]...)
			s.savePluginsLocked()
			return true
		}
	}
	return false
}

func (s *DeveloperSDKStore) SDKManifest() map[string]interface{} {
	return map[string]interface{}{
		"ok":          true,
		"sdk_version": "3.0",
		"os_version":  KernelVersion,
		"codename":    KernelCodename,
		"kernel":      "LumaCore " + KernelEngineVersion,
		"security":    "LumaShield " + SecurityCoreVersion,
		"storage_dir": s.dir,
		"endpoints": map[string]string{
			"themes_list_register":  "GET/POST/DELETE /api/v3/themes",
			"plugins_list_register": "GET/POST/DELETE /api/v3/plugins",
			"plugin_execute":        "POST /api/kernel/plugins/exec",
			"mouse_dpi_service":     "GET/POST /api/kernel/mouse/dpi",
			"wireless_devices":      "GET /api/kernel/wireless/batteries?refresh=1",
			"kernel_diagnostics":    "GET /api/kernel/diagnostics",
			"security_hosts_audit":  "GET /api/kernel/security/hosts-audit",
		},
		"browser_sdk": "window.LumaSDK (registerTheme, registerPlugin, themes, plugins, notify, system)",
		"hooks":       []string{"onBoot", "onAction", "onLaunchApp", "onThemeChange", "onTelemetryTick"},
	}
}
