package main

import (
	"encoding/json"
	"net/http"
	"strings"
)

// ==================== LUMA OS 1.8.1: WINDOWS MICROSOFT OFFICE SUITE DISCOVERY & SAFE LAUNCHER ====================

type WindowsOfficeAppInfo struct {
	ID         string `json:"id"`         // ms_word | ms_excel | ms_powerpoint
	Kind       string `json:"kind"`       // word | excel | powerpoint
	Name       string `json:"name"`       // Microsoft Word | Microsoft Excel | Microsoft PowerPoint
	ShortName  string `json:"short_name"` // Word | Excel | PowerPoint
	ExecPath   string `json:"exec_path"`
	LaunchURI  string `json:"launch_uri"` // ms-word: | ms-excel: | ms-powerpoint:
	Installed  bool   `json:"installed"`
	IconURL    string `json:"icon_url"`
	BrandColor string `json:"brand_color"`
	Publisher  string `json:"publisher"`
	Detail     string `json:"detail"`
}

func isBrokenWindowsOfficeStubPath(raw string) bool {
	low := strings.ToLower(strings.TrimSpace(strings.Trim(raw, `"`)))
	if low == "" {
		return false
	}
	if strings.Contains(low, `\windows\installer\`) || strings.Contains(low, `/windows/installer/`) {
		return true
	}
	for _, bad := range []string{
		"wordicon.exe",
		"xlicons.exe",
		"pptico.exe",
		"outlookicon.exe",
		"accicons.exe",
		"pubicons.exe",
		"visicon.exe",
		"misc.exe",
		"oisicon.exe",
		"groovico.exe",
	} {
		if strings.HasSuffix(low, bad) {
			return true
		}
	}
	return false
}

func detectOfficeKindFromTarget(target, name string) string {
	low := strings.ToLower(strings.TrimSpace(target + " " + name))
	switch {
	case strings.Contains(low, "winword") ||
		strings.Contains(low, "wordicon") ||
		strings.Contains(low, "ms-word") ||
		strings.Contains(low, "ms_word") ||
		low == "word" ||
		strings.Contains(low, "microsoft word"):
		return "word"
	case strings.Contains(low, "excel") ||
		strings.Contains(low, "xlicons") ||
		strings.Contains(low, "ms-excel") ||
		strings.Contains(low, "ms_excel"):
		return "excel"
	case strings.Contains(low, "powerpnt") ||
		strings.Contains(low, "powerpoint") ||
		strings.Contains(low, "pptico") ||
		strings.Contains(low, "ms-powerpoint") ||
		strings.Contains(low, "ms_powerpoint"):
		return "powerpoint"
	}
	return ""
}

func registerOfficeApps181Routes(mux *http.ServeMux) {
	mux.HandleFunc("/api/kernel/office-apps", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		apps := listWindowsMicrosoftOfficeApps()
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":   true,
			"apps": apps,
		})
	})

	mux.HandleFunc("/api/kernel/office-apps/launch", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "POST required"})
			return
		}
		var req struct {
			Kind   string `json:"kind"`   // word | excel | powerpoint
			Target string `json:"target"` // optional path
			Args   string `json:"args"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		kind := strings.ToLower(strings.TrimSpace(req.Kind))
		if kind == "" {
			kind = detectOfficeKindFromTarget(req.Target, "")
		}
		resolved, usedFallback, err := launchWindowsMicrosoftOfficeApp(kind, req.Target, req.Args)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"ok":    false,
				"kind":  kind,
				"error": err.Error(),
			})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":            true,
			"kind":          kind,
			"launched_path": resolved,
			"used_fallback": usedFallback,
		})
	})
}
