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
		ReplaceHotkeys:     true,
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
	if raw, err := os.ReadFile(unixShellCfgPath()); err == nil {
		_ = json.Unmarshal(raw, &unixShellCfg)
	}
	if unixShellCfg.TaskbarSizePx < 38 || unixShellCfg.TaskbarSizePx > 96 {
		unixShellCfg.TaskbarSizePx = 54
	}
	unixAltTabEnabled = unixShellCfg.ReplaceHotkeys
	unixWinDEnabled = unixShellCfg.ReplaceHotkeys
	unixWinKeyEnabled = unixShellCfg.ReplaceHotkeys
	out := unixShellCfg
	unixShellMu.Unlock()
	setWindowsTouchpadGesturesDisabled(out.ReplaceHotkeys)
	return out
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
	unixAltTabEnabled = cfg.ReplaceHotkeys
	unixWinDEnabled = cfg.ReplaceHotkeys
	unixWinKeyEnabled = cfg.ReplaceHotkeys
	if raw, err := json.MarshalIndent(cfg, "", "  "); err == nil {
		_ = os.WriteFile(unixShellCfgPath(), raw, 0o600)
	}
	out := unixShellCfg
	unixShellMu.Unlock()
	setWindowsTouchpadGesturesDisabled(out.ReplaceHotkeys)
	return out
}

func restoreWindowsShell() {
	restoreWindowsTouchpadGestures()
}

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
	unixWinKeyEnabled = true
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

func setWinKeyToLumaEnabled(enabled bool) {
	unixShellMu.Lock()
	unixWinKeyEnabled = enabled
	unixShellMu.Unlock()
}

func isWinKeyToLumaEnabled() bool {
	unixShellMu.Lock()
	defer unixShellMu.Unlock()
	return unixWinKeyEnabled
}

func releaseAltTabTopmost() {}

func bringLumaHomeNow() {}

var unixPinnedTopmost bool

func setLumaPinnedWindowTopmost(enabled bool) bool {
	unixShellMu.Lock()
	unixPinnedTopmost = enabled
	unixShellMu.Unlock()
	return enabled
}

func isLumaPinnedWindowTopmost() bool {
	unixShellMu.Lock()
	defer unixShellMu.Unlock()
	return unixPinnedTopmost
}


