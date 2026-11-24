//go:build !windows

package main

import (
	"fmt"
	"os"
	"os/user"
	"runtime"
	"sync"
)

type AdminStatusInfo struct {
	OK             bool   `json:"ok"`
	IsAdmin        bool   `json:"is_admin"`
	Username       string `json:"username"`
	IntegrityLevel string `json:"integrity_level"`
	ElevationType  string `json:"elevation_type"`
	Platform       string `json:"platform"`
	ExePath        string `json:"exe_path"`
	CanElevate     bool   `json:"can_elevate"`
}

var (
	unixTopmostMu   sync.RWMutex
	unixTopmostPids = map[int]uint64{}
)

func getAdminStatus() AdminStatusInfo {
	elevated := os.Geteuid() == 0
	uname := os.Getenv("USER")
	if u, err := user.Current(); err == nil && u.Username != "" {
		uname = u.Username
	}
	exe, _ := os.Executable()
	level := "Medium"
	eType := fmt.Sprintf("POSIX UID %d", os.Geteuid())
	if elevated {
		level = "High"
		eType = "Root (UID 0)"
	}
	return AdminStatusInfo{
		OK:             true,
		IsAdmin:        elevated,
		Username:       uname,
		IntegrityLevel: level,
		ElevationType:  eType,
		Platform:       runtime.GOOS,
		ExePath:        exe,
		CanElevate:     !elevated,
	}
}

func restartAsAdministrator() map[string]interface{} {
	if os.Geteuid() == 0 {
		return map[string]interface{}{
			"ok":            true,
			"already_admin": true,
			"message":       "Процесс уже запущен с правами root (UID 0).",
		}
	}
	return map[string]interface{}{
		"ok":        false,
		"supported": false,
		"platform":  runtime.GOOS,
		"error":     "Нативный перезапуск через UAC (runas) доступен в Windows LumaOS_1.6.exe; в Linux запустите с sudo.",
	}
}

func setExternalWindowTopmost(pid int, hwndVal uint64, topmost *bool, toggle bool) map[string]interface{} {
	if pid <= 0 && hwndVal == 0 {
		return map[string]interface{}{"ok": false, "error": "Укажите PID или HWND окна"}
	}
	unixTopmostMu.Lock()
	defer unixTopmostMu.Unlock()
	_, exists := unixTopmostPids[pid]
	desired := exists
	if toggle {
		desired = !exists
	} else if topmost != nil {
		desired = *topmost
	}
	if desired {
		h := hwndVal
		if h == 0 {
			h = uint64(pid)
		}
		unixTopmostPids[pid] = h
	} else {
		delete(unixTopmostPids, pid)
	}
	return map[string]interface{}{
		"ok":      true,
		"pid":     pid,
		"hwnd":    unixTopmostPids[pid],
		"topmost": desired,
	}
}

func listTopmostWindows() map[string]interface{} {
	unixTopmostMu.RLock()
	defer unixTopmostMu.RUnlock()
	pids := make([]int, 0, len(unixTopmostPids))
	hwnds := make([]uint64, 0, len(unixTopmostPids))
	for pid, h := range unixTopmostPids {
		pids = append(pids, pid)
		hwnds = append(hwnds, h)
	}
	return map[string]interface{}{
		"ok":            true,
		"topmost_pids":  pids,
		"topmost_hwnds": hwnds,
	}
}
