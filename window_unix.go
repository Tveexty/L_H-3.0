//go:build !windows

package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

var (
	unixShellMu  sync.Mutex
	unixShellCfg = ShellModeConfig{
		StartFullscreen:    false,
		AutostartWithOS:    false,
		HideWindowsTaskbar: false,
		ReserveWorkArea:    true,
		AlwaysOnTop:        false,
		TaskbarPosition:    "bottom",
		TaskbarSizePx:      54,
	}
)

func unixShellCfgPath() string {
	cfgDir, err := os.UserConfigDir()
	if err != nil || cfgDir == "" {
		cfgDir = os.TempDir()
	}
	dir := filepath.Join(cfgDir, "LumaOS")
	_ = os.MkdirAll(dir, 0o700)
	return filepath.Join(dir, "shell_config.json")
}

func loadShellConfig() ShellModeConfig {
	unixShellMu.Lock()
	defer unixShellMu.Unlock()
	if raw, err := os.ReadFile(unixShellCfgPath()); err == nil {
		_ = json.Unmarshal(raw, &unixShellCfg)
	}
	if unixShellCfg.TaskbarSizePx < 38 || unixShellCfg.TaskbarSizePx > 96 {
		unixShellCfg.TaskbarSizePx = 54
	}
	return unixShellCfg
}

func getShellConfig() ShellModeConfig {
	unixShellMu.Lock()
	defer unixShellMu.Unlock()
	return unixShellCfg
}

func applyShellModeConfig(cfg ShellModeConfig) ShellModeConfig {
	unixShellMu.Lock()
	if cfg.TaskbarSizePx < 38 {
		cfg.TaskbarSizePx = 38
	}
	if cfg.TaskbarSizePx > 96 {
		cfg.TaskbarSizePx = 96
	}
	unixShellCfg = cfg
	if raw, err := json.MarshalIndent(cfg, "", "  "); err == nil {
		_ = os.WriteFile(unixShellCfgPath(), raw, 0o600)
	}
	out := unixShellCfg
	unixShellMu.Unlock()
	return out
}

func restoreWindowsShell() {}

func runNativeDesktopWindow(url string, forceFullscreen bool) bool {
	return false
}

func toggleNativeFullscreen(force *bool) bool {
	return false
}

func isNativeFullscreen() bool {
	return false
}

func suspendWindowTopmost(suspend bool) {}

var (
	unixAltTabEnabled = true
	unixWinDEnabled   = true
)

func setCustomAltTabEnabled(enabled bool) {
	unixShellMu.Lock()
	unixAltTabEnabled = enabled
	unixShellMu.Unlock()
}

func isCustomAltTabEnabled() bool {
	unixShellMu.Lock()
	defer unixShellMu.Unlock()
	return unixAltTabEnabled
}

func setWinDToLumaEnabled(enabled bool) {
	unixShellMu.Lock()
	unixWinDEnabled = enabled
	unixShellMu.Unlock()
}

func isWinDToLumaEnabled() bool {
	unixShellMu.Lock()
	defer unixShellMu.Unlock()
	return unixWinDEnabled
}

func releaseAltTabTopmost() {}

func bringLumaHomeNow() {}

