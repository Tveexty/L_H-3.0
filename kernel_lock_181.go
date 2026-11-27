package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"os"
	"runtime"
	"strings"
	"sync"
)

// ==================== LUMA OS 1.8.1: SYSTEM LOCK SCREEN (WIN + L REPLACEMENT & REAL WINDOWS PASSWORD AUTH) ====================

type LockScreenConfig struct {
	ReplaceWinL      bool   `json:"replace_win_l"`
	HasCustomPin     bool   `json:"has_custom_pin"`
	CustomPinHash    string `json:"-"`
	LockWallpaperDim int    `json:"lock_wallpaper_dim"`
}

var (
	lockStateMu sync.RWMutex
	lockConfig  = LockScreenConfig{
		ReplaceWinL:      true,
		LockWallpaperDim: 38,
	}
	lockScreenActive bool
)

func isWinLToLumaEnabled() bool {
	lockStateMu.RLock()
	defer lockStateMu.RUnlock()
	return lockConfig.ReplaceWinL
}

func hashLockPin(pin string) string {
	sum := sha256.Sum256([]byte("luma_os_lock_pin_v181::" + strings.TrimSpace(pin)))
	return hex.EncodeToString(sum[:])
}

func getSystemLockUserInfo() map[string]interface{} {
	username, displayName, domain := getNativeOSUserIdentity()
	lockStateMu.RLock()
	cfg := lockConfig
	active := lockScreenActive
	lockStateMu.RUnlock()

	return map[string]interface{}{
		"ok":                   true,
		"username":             username,
		"display_name":         displayName,
		"domain":               domain,
		"os":                   runtime.GOOS,
		"windows_auth_ready":   runtime.GOOS == "windows",
		"replace_win_l":        cfg.ReplaceWinL,
		"has_custom_pin":       cfg.HasCustomPin,
		"lock_wallpaper_dim":   cfg.LockWallpaperDim,
		"locked":               active,
		"policy_active":        isWinLockPolicyActive(),
	}
}

func registerLock181Routes(mux *http.ServeMux) {
	// Sync initial Win+L replacement policy on Windows cleanly (restored on exit via defer cleanupWinLockPolicy!)
	if runtime.GOOS == "windows" && isWinLToLumaEnabled() {
		_ = setWinLockPolicyDisabled(true)
	}

	mux.HandleFunc("/api/kernel/lock/info", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_ = json.NewEncoder(w).Encode(getSystemLockUserInfo())
	})

	mux.HandleFunc("/api/kernel/lock/config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			_ = json.NewEncoder(w).Encode(getSystemLockUserInfo())
			return
		}
		var req struct {
			ReplaceWinL      *bool   `json:"replace_win_l"`
			CustomPin        *string `json:"custom_pin"`
			ClearCustomPin   bool    `json:"clear_custom_pin"`
			LockWallpaperDim *int    `json:"lock_wallpaper_dim"`
			Locked           *bool   `json:"locked"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		lockStateMu.Lock()
		if req.ReplaceWinL != nil {
			lockConfig.ReplaceWinL = *req.ReplaceWinL
		}
		if req.ClearCustomPin {
			lockConfig.CustomPinHash = ""
			lockConfig.HasCustomPin = false
		} else if req.CustomPin != nil && strings.TrimSpace(*req.CustomPin) != "" {
			lockConfig.CustomPinHash = hashLockPin(*req.CustomPin)
			lockConfig.HasCustomPin = true
		}
		if req.LockWallpaperDim != nil {
			d := *req.LockWallpaperDim
			if d < 0 {
				d = 0
			}
			if d > 85 {
				d = 85
			}
			lockConfig.LockWallpaperDim = d
		}
		if req.Locked != nil {
			lockScreenActive = *req.Locked
		}
		wantPolicy := lockConfig.ReplaceWinL
		lockStateMu.Unlock()

		if runtime.GOOS == "windows" {
			_ = setWinLockPolicyDisabled(wantPolicy)
		}
		_ = json.NewEncoder(w).Encode(getSystemLockUserInfo())
	})

	mux.HandleFunc("/api/kernel/lock/verify", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "POST required"})
			return
		}
		var req struct {
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}

		// 1. Check custom Luma PIN if configured
		lockStateMu.RLock()
		hasPin := lockConfig.HasCustomPin
		pinHash := lockConfig.CustomPinHash
		lockStateMu.RUnlock()

		if hasPin && pinHash != "" && hashLockPin(req.Password) == pinHash {
			lockStateMu.Lock()
			lockScreenActive = false
			lockStateMu.Unlock()
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"ok":     true,
				"method": "luma_pin",
				"detail": "Разблокировано по PIN-коду Luma OS",
			})
			return
		}

		// 2. Verify REAL Windows account password via Win32 LogonUserW (never stored or logged!)
		verified, method, msg := verifyNativeOSPassword(req.Password)
		if verified {
			lockStateMu.Lock()
			lockScreenActive = false
			lockStateMu.Unlock()
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"ok":     true,
				"method": method,
				"detail": msg,
			})
			return
		}

		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":     false,
			"method": method,
			"error":  msg,
		})
	})

	mux.HandleFunc("/api/kernel/lock/native-windows-lock", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "POST required"})
			return
		}
		triggerNativeWindowsLockTemporarily()
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true})
	})
}

func fallbackEnvUsername() string {
	for _, k := range []string{"USERNAME", "USER", "LOGNAME"} {
		if v := strings.TrimSpace(os.Getenv(k)); v != "" {
			return v
		}
	}
	return "Пользователь"
}
