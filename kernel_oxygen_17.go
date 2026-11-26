package main

import (
	"archive/zip"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

// ==================== LUMA OS 1.7 (OXYGEN · O-8) — LUMACORE 1.6.0 SUBSYSTEMS ====================
// 1. 100% Fallback Brand/Monogram SVG Icon Engine (eliminates ALL 404/missing icons)
// 2. KWin-Style Window Rules Engine (Multi-Monitor Zones, Borderless, TopMost, Opacity, Auto-DND, Compositor Off)
// 3. Yoink / Dropzone Persistent Drag & Drop Shelf (Batch Copy / Move / ZIP)
// 4. KDE Plasma / PipeWire-Style Per-App Audio & Media Hub
// 5. Smart Clipboard Auto-OCR & Plain-Text Paste (Ctrl+Shift+V)
// 6. Next-Gen Oxygen OSD Telemetry (Caps/Num/Scroll Lock, Mic Mute, Bluetooth Battery, Volume/Brightness, Recording)

// --- 1. CRISP OXYGEN 2.5D FALLBACK SVG ICON ENGINE (ZERO 404 ICONS!) ---

func renderFallbackAppIconSVG(raw string) string {
	clean := strings.TrimSpace(strings.Trim(raw, `"`))
	base := strings.TrimSuffix(filepath.Base(clean), filepath.Ext(clean))
	low := strings.ToLower(base)
	if low == "" || low == "." || low == "/" || low == `\` {
		low = "app"
		base = "App"
	}

	type brandSpec struct {
		bg1, bg2, glyph string
	}
	brands := map[string]brandSpec{
		"steam":      {"#171a21", "#1b2838", "ST"},
		"chrome":     {"#0ea5e9", "#2563eb", "Cr"},
		"telegram":   {"#229ED9", "#0284c7", "TG"},
		"discord":    {"#5865F2", "#4338ca", "DC"},
		"vlc":        {"#f97316", "#ea580c", "VLC"},
		"firefox":    {"#f97316", "#7c3aed", "FF"},
		"msedge":     {"#06b6d4", "#2563eb", "Ed"},
		"edge":       {"#06b6d4", "#2563eb", "Ed"},
		"code":       {"#0284c7", "#0369a1", "VS"},
		"vscode":     {"#0284c7", "#0369a1", "VS"},
		"github":     {"#1f2937", "#0f172a", "GH"},
		"notion":     {"#1e293b", "#0f172a", "N"},
		"spotify":    {"#22c55e", "#15803d", "SP"},
		"winword":    {"#2563eb", "#1d4ed8", "W"},
		"excel":      {"#16a34a", "#15803d", "X"},
		"powerpnt":   {"#ea580c", "#c2410c", "P"},
		"calc":       {"#0ea5e9", "#0369a1", "±"},
		"explorer":   {"#f59e0b", "#d97706", "📁"},
		"taskmgr":    {"#10b981", "#047857", "⚡"},
		"cmd":        {"#18181b", "#09090b", ">_"},
		"powershell": {"#0284c7", "#1e3a8a", "PS"},
		"wt":         {"#1e293b", "#0f172a", ">_"},
		"notepad":    {"#38bdf8", "#0284c7", "Aa"},
		"mspaint":    {"#ec4899", "#8b5cf6", "🎨"},
		"obs":        {"#18181b", "#3f3f46", "REC"},
		"obs64":      {"#18181b", "#3f3f46", "REC"},
		"opera":      {"#ef4444", "#b91c1c", "O"},
		"brave":      {"#f97316", "#dc2626", "Br"},
		"yandex":     {"#ef4444", "#f59e0b", "Я"},
	}

	bg1, bg2 := "#0ea5e9", "#0f172a"
	glyph := ""
	if spec, ok := brands[low]; ok {
		bg1, bg2, glyph = spec.bg1, spec.bg2, spec.glyph
	} else {
		for k, spec := range brands {
			if strings.Contains(low, k) {
				bg1, bg2, glyph = spec.bg1, spec.bg2, spec.glyph
				break
			}
		}
	}
	if glyph == "" {
		// Deterministic Oxygen palette + clean 1-2 char monogram
		palettes := [][2]string{
			{"#06b6d4", "#0284c7"},
			{"#3b82f6", "#4f46e5"},
			{"#10b981", "#0d9488"},
			{"#8b5cf6", "#6366f1"},
			{"#ec4899", "#db2777"},
			{"#f59e0b", "#d97706"},
		}
		var hash int
		for _, r := range low {
			hash = hash*31 + int(r)
		}
		if hash < 0 {
			hash = -hash
		}
		pal := palettes[hash%len(palettes)]
		bg1, bg2 = pal[0], pal[1]
		runes := []rune(strings.ToUpper(base))
		if len(runes) >= 2 {
			glyph = string(runes[:2])
		} else if len(runes) == 1 {
			glyph = string(runes[:1])
		} else {
			glyph = "O₂"
		}
	}
	fontSize := 24
	if len([]rune(glyph)) >= 3 {
		fontSize = 18
	}
	safeGlyph := html.EscapeString(glyph)
	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%%" stop-color="%s"/>
      <stop offset="100%%" stop-color="%s"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%%" stop-color="#ffffff" stop-opacity="0.34"/>
      <stop offset="55%%" stop-color="#ffffff" stop-opacity="0.04"/>
      <stop offset="100%%" stop-color="#000000" stop-opacity="0.18"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#g)"/>
  <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#shine)" stroke="#ffffff" stroke-opacity="0.22" stroke-width="1.5"/>
  <text x="32" y="39" text-anchor="middle" fill="#ffffff" font-family="Segoe UI,Inter,system-ui,sans-serif" font-weight="800" font-size="%d">%s</text>
</svg>`, bg1, bg2, fontSize, safeGlyph)
}

// --- 2. KWIN-STYLE WINDOW RULES ENGINE ---

type MonitorInfo struct {
	Index      int    `json:"index"`
	Name       string `json:"name"`
	Primary    bool   `json:"primary"`
	X          int    `json:"x"`
	Y          int    `json:"y"`
	Width      int    `json:"width"`
	Height     int    `json:"height"`
	WorkX      int    `json:"work_x"`
	WorkY      int    `json:"work_y"`
	WorkWidth  int    `json:"work_width"`
	WorkHeight int    `json:"work_height"`
}

type WindowRule struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	Enabled           bool   `json:"enabled"`
	MatchProcess      string `json:"match_process"` // substring or regex (e.g. "telegram", "calc", "cs2|dota2|valorant")
	MatchTitle        string `json:"match_title"`   // optional title substring/regex
	MonitorIndex      int    `json:"monitor_index"` // 0 = any/current, 1 = monitor #1, 2 = monitor #2...
	Zone              string `json:"zone"`          // none | left | right | top-left | top-right | center | maximized | fullscreen | custom
	CustomX           int    `json:"custom_x,omitempty"`
	CustomY           int    `json:"custom_y,omitempty"`
	CustomW           int    `json:"custom_w,omitempty"`
	CustomH           int    `json:"custom_h,omitempty"`
	AlwaysOnTop       bool   `json:"always_on_top"`
	Borderless        bool   `json:"borderless"`
	Opacity           int    `json:"opacity"` // 30..100 (100 = opaque)
	AutoDND           bool   `json:"auto_dnd"`
	DisableCompositor bool   `json:"disable_compositor"`
	Hits              int    `json:"hits"`
	LastAppliedAt     string `json:"last_applied_at,omitempty"`
}

type WindowRulesRuntimeState struct {
	ActiveDND               bool     `json:"active_dnd"`
	ActiveDisableCompositor bool     `json:"active_disable_compositor"`
	MatchedRuleNames        []string `json:"matched_rule_names"`
}

var (
	winRulesMu      sync.RWMutex
	winRulesList    []WindowRule
	winRulesRuntime = WindowRulesRuntimeState{MatchedRuleNames: []string{}}
	winRulesLoaded  bool
)

func defaultWindowRules() []WindowRule {
	return []WindowRule{
		{
			ID:           "rule_telegram_mon2",
			Name:         "Telegram — 2-й монитор справа без рамки",
			Enabled:      false,
			MatchProcess: "telegram",
			MonitorIndex: 2,
			Zone:         "right",
			Borderless:   true,
			Opacity:      100,
		},
		{
			ID:           "rule_calc_topmost",
			Name:         "Калькулятор — всегда поверх всех окон",
			Enabled:      true,
			MatchProcess: "calc|calculator",
			MatchTitle:   "калькулятор|calculator",
			MonitorIndex: 0,
			Zone:         "none",
			AlwaysOnTop:  true,
			Opacity:      98,
		},
		{
			ID:                "rule_games_pro",
			Name:              "Игры — авто-DND и отключение композитора",
			Enabled:           true,
			MatchProcess:      "cs2|dota2|valorant|gta5|cyberpunk|witcher|eldenring|minecraft|javaw|fortnite|apex|rust|roblox",
			MonitorIndex:      0,
			Zone:              "none",
			Opacity:           100,
			AutoDND:           true,
			DisableCompositor: true,
		},
	}
}

func windowRulesFilePath() string {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		home = os.TempDir()
	}
	dir := filepath.Join(home, ".luma_state")
	_ = os.MkdirAll(dir, 0o700)
	return filepath.Join(dir, "window_rules.json")
}

func loadWindowRules() {
	winRulesMu.Lock()
	defer winRulesMu.Unlock()
	if winRulesLoaded {
		return
	}
	winRulesLoaded = true
	raw, err := os.ReadFile(windowRulesFilePath())
	if err == nil {
		var list []WindowRule
		if json.Unmarshal(raw, &list) == nil && len(list) > 0 {
			winRulesList = list
			return
		}
	}
	winRulesList = defaultWindowRules()
}

func saveWindowRulesLocked() {
	b, err := json.MarshalIndent(winRulesList, "", "  ")
	if err == nil {
		_ = os.WriteFile(windowRulesFilePath(), b, 0o600)
	}
}

func matchRulePattern(pattern, value string) bool {
	pat := strings.TrimSpace(pattern)
	if pat == "" {
		return true
	}
	valLow := strings.ToLower(value)
	patLow := strings.ToLower(pat)
	if strings.Contains(patLow, "|") || strings.Contains(patLow, ".*") {
		if re, err := regexp.Compile("(?i)" + pat); err == nil {
			return re.MatchString(value)
		}
	}
	return strings.Contains(valLow, patLow)
}

func startWindowRulesDaemon() {
	loadWindowRules()
	go func() {
		defer func() { _ = recover() }()
		time.Sleep(3 * time.Second)
		ticker := time.NewTicker(1800 * time.Millisecond)
		defer ticker.Stop()
		for range ticker.C {
			func() {
				defer func() { _ = recover() }()
				enforceWindowRulesTick()
			}()
		}
	}()
}

func enforceWindowRulesTick() (int, WindowRulesRuntimeState) {
	winRulesMu.RLock()
	rulesCopy := append([]WindowRule(nil), winRulesList...)
	winRulesMu.RUnlock()

	hasEnabled := false
	for _, r := range rulesCopy {
		if r.Enabled {
			hasEnabled = true
			break
		}
	}
	if !hasEnabled {
		st := WindowRulesRuntimeState{MatchedRuleNames: []string{}}
		winRulesMu.Lock()
		winRulesRuntime = st
		winRulesMu.Unlock()
		return 0, st
	}

	appliedCount, matchedNames, dnd, noComp, hitsByID := applyWindowRulesOS(rulesCopy)
	st := WindowRulesRuntimeState{
		ActiveDND:               dnd,
		ActiveDisableCompositor: noComp,
		MatchedRuleNames:        matchedNames,
	}
	if st.MatchedRuleNames == nil {
		st.MatchedRuleNames = []string{}
	}

	nowStr := time.Now().Format("15:04:05")
	winRulesMu.Lock()
	winRulesRuntime = st
	for i := range winRulesList {
		if h, ok := hitsByID[winRulesList[i].ID]; ok && h > 0 {
			winRulesList[i].Hits += h
			winRulesList[i].LastAppliedAt = nowStr
		}
	}
	winRulesMu.Unlock()
	return appliedCount, st
}

// --- 3. YOINK / DROPZONE DRAG & DROP SHELF BACKEND ---

type ShelfItem struct {
	ID      string `json:"id"`
	Kind    string `json:"kind"` // file | image | text | url
	Name    string `json:"name"`
	Path    string `json:"path,omitempty"`
	Content string `json:"content,omitempty"` // text, URL, or base64 data URI preview
	Size    int64  `json:"size,omitempty"`
	Mime    string `json:"mime,omitempty"`
	AddedAt string `json:"added_at"`
}

var (
	shelfMu     sync.RWMutex
	shelfItems  []ShelfItem
	shelfLoaded bool
)

func shelfFilePath() string {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		home = os.TempDir()
	}
	dir := filepath.Join(home, ".luma_state")
	_ = os.MkdirAll(dir, 0o700)
	return filepath.Join(dir, "drop_shelf.json")
}

func loadShelfItems() {
	shelfMu.Lock()
	defer shelfMu.Unlock()
	if shelfLoaded {
		return
	}
	shelfLoaded = true
	raw, err := os.ReadFile(shelfFilePath())
	if err == nil {
		var items []ShelfItem
		if json.Unmarshal(raw, &items) == nil {
			shelfItems = items
			return
		}
	}
	shelfItems = []ShelfItem{}
}

func saveShelfItemsLocked() {
	b, err := json.MarshalIndent(shelfItems, "", "  ")
	if err == nil {
		_ = os.WriteFile(shelfFilePath(), b, 0o600)
	}
}

func addItemToDropShelf(item ShelfItem) ShelfItem {
	loadShelfItems()
	if item.ID == "" {
		item.ID = fmt.Sprintf("shelf_%d", time.Now().UnixNano())
	}
	if item.AddedAt == "" {
		item.AddedAt = time.Now().Format("15:04:05")
	}
	if item.Path != "" && item.Size == 0 {
		if st, err := os.Stat(item.Path); err == nil {
			item.Size = st.Size()
			if item.Name == "" {
				item.Name = filepath.Base(item.Path)
			}
		}
	}
	shelfMu.Lock()
	shelfItems = append([]ShelfItem{item}, shelfItems...)
	if len(shelfItems) > 64 {
		shelfItems = shelfItems[:64]
	}
	saveShelfItemsLocked()
	shelfMu.Unlock()
	return item
}

func getShelfItemsSnapshot() []ShelfItem {
	loadShelfItems()
	shelfMu.RLock()
	defer shelfMu.RUnlock()
	out := make([]ShelfItem, len(shelfItems))
	copy(out, shelfItems)
	return out
}

func bundleShelfToZip(targetZip string, items []ShelfItem) (int, error) {
	if err := os.MkdirAll(filepath.Dir(targetZip), 0o755); err != nil {
		return 0, err
	}
	f, err := os.Create(targetZip)
	if err != nil {
		return 0, err
	}
	defer f.Close()
	zw := zip.NewWriter(f)
	defer zw.Close()

	added := 0
	for i, it := range items {
		if it.Path != "" {
			st, err := os.Stat(it.Path)
			if err == nil && !st.IsDir() {
				src, err := os.Open(it.Path)
				if err == nil {
					w, wErr := zw.Create(filepath.Base(it.Path))
					if wErr == nil {
						_, _ = io.Copy(w, src)
						added++
					}
					_ = src.Close()
					continue
				}
			}
		}
		if it.Content != "" {
			name := it.Name
			if name == "" {
				name = fmt.Sprintf("snippet_%d.txt", i+1)
			}
			if strings.HasPrefix(it.Content, "data:image/") {
				if idx := strings.Index(it.Content, ","); idx > 0 {
					if raw, err := base64.StdEncoding.DecodeString(it.Content[idx+1:]); err == nil {
						if !strings.Contains(name, ".") {
							name += ".png"
						}
						if w, err := zw.Create(name); err == nil {
							_, _ = w.Write(raw)
							added++
						}
						continue
					}
				}
			}
			if !strings.Contains(name, ".") {
				name += ".txt"
			}
			if w, err := zw.Create(name); err == nil {
				_, _ = w.Write([]byte(it.Content))
				added++
			}
		}
	}
	return added, nil
}

// --- 4. PER-APP AUDIO & MEDIA HUB TYPES ---

type AudioAppSession struct {
	PID     int    `json:"pid"`
	Name    string `json:"name"`
	Title   string `json:"title"`
	Volume  int    `json:"volume"` // 0..100
	Muted   bool   `json:"muted"`
	Playing bool   `json:"playing"`
	IconURL string `json:"icon_url"`
	Device  string `json:"device,omitempty"`
}

type OxygenOSDState struct {
	OK             bool   `json:"ok"`
	CapsLock       bool   `json:"caps_lock"`
	NumLock        bool   `json:"num_lock"`
	ScrollLock     bool   `json:"scroll_lock"`
	MicMuted       bool   `json:"mic_muted"`
	Recording      bool   `json:"recording"`
	RecordingSec   int    `json:"recording_sec"`
	ActiveDND      bool   `json:"active_dnd"`
	NoCompositor   bool   `json:"disable_compositor"`
	MatchedRules   int    `json:"matched_rules"`
}

var (
	oxygenMicMu    sync.Mutex
	oxygenMicMuted bool
)

// --- 5. REGISTER ALL LUMA OS 1.7 (OXYGEN) KERNEL ROUTES ---

func registerOxygen17Routes(mux *http.ServeMux, kernel *LumaKernel, nativeRec *NativeScreenRecorder) {
	startWindowRulesDaemon()
	loadShelfItems()

	// 1. Multi-Monitor Enumeration
	mux.HandleFunc("/api/kernel/monitors", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		mons := listMonitorsOS()
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":       true,
			"monitors": mons,
			"count":    len(mons),
		})
	})

	// 2. KWin Window Rules CRUD & Live Runtime Status
	mux.HandleFunc("/api/kernel/window-rules", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		loadWindowRules()
		if r.Method == http.MethodPost {
			var req struct {
				Action string       `json:"action"` // save_all | upsert | delete | toggle
				Rule   *WindowRule  `json:"rule"`
				Rules  []WindowRule `json:"rules"`
				ID     string       `json:"id"`
			}
			if err := json.NewDecoder(io.LimitReader(r.Body, 2*1024*1024)).Decode(&req); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
				return
			}
			winRulesMu.Lock()
			switch req.Action {
			case "save_all":
				if req.Rules != nil {
					winRulesList = req.Rules
				}
			case "delete":
				filtered := make([]WindowRule, 0, len(winRulesList))
				for _, rItem := range winRulesList {
					if rItem.ID != req.ID {
						filtered = append(filtered, rItem)
					}
				}
				winRulesList = filtered
			case "toggle":
				for i := range winRulesList {
					if winRulesList[i].ID == req.ID {
						winRulesList[i].Enabled = !winRulesList[i].Enabled
					}
				}
			default: // upsert
				if req.Rule != nil {
					if req.Rule.ID == "" {
						req.Rule.ID = fmt.Sprintf("rule_%d", time.Now().UnixNano())
					}
					if req.Rule.Opacity < 30 || req.Rule.Opacity > 100 {
						req.Rule.Opacity = 100
					}
					found := false
					for i := range winRulesList {
						if winRulesList[i].ID == req.Rule.ID {
							req.Rule.Hits = winRulesList[i].Hits
							req.Rule.LastAppliedAt = winRulesList[i].LastAppliedAt
							winRulesList[i] = *req.Rule
							found = true
							break
						}
					}
					if !found {
						winRulesList = append([]WindowRule{*req.Rule}, winRulesList...)
					}
				}
			}
			saveWindowRulesLocked()
			winRulesMu.Unlock()
			go enforceWindowRulesTick()
		}
		winRulesMu.RLock()
		listCopy := append([]WindowRule(nil), winRulesList...)
		rtCopy := winRulesRuntime
		winRulesMu.RUnlock()
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":       true,
			"rules":    listCopy,
			"runtime":  rtCopy,
			"monitors": listMonitorsOS(),
		})
	})

	mux.HandleFunc("/api/kernel/window-rules/apply", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		applied, rt := enforceWindowRulesTick()
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":      true,
			"applied": applied,
			"runtime": rt,
		})
	})

	// 3. Yoink / Dropzone Drag & Drop Shelf API
	mux.HandleFunc("/api/kernel/shelf", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		loadShelfItems()
		if r.Method == http.MethodPost {
			var req struct {
				Action     string     `json:"action"` // add | remove | clear | copy_all | move_all | zip_all
				Item       *ShelfItem `json:"item"`
				ID         string     `json:"id"`
				TargetDir  string     `json:"target_dir"`
			}
			if err := json.NewDecoder(io.LimitReader(r.Body, 16*1024*1024)).Decode(&req); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
				return
			}
			switch req.Action {
			case "add":
				if req.Item != nil {
					it := addItemToDropShelf(*req.Item)
					_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "item": it, "items": getShelfItemsSnapshot()})
					return
				}
			case "remove":
				shelfMu.Lock()
				next := make([]ShelfItem, 0, len(shelfItems))
				for _, it := range shelfItems {
					if it.ID != req.ID {
						next = append(next, it)
					}
				}
				shelfItems = next
				saveShelfItemsLocked()
				shelfMu.Unlock()
			case "clear":
				shelfMu.Lock()
				shelfItems = []ShelfItem{}
				saveShelfItemsLocked()
				shelfMu.Unlock()
			case "copy_all", "move_all":
				destDir := strings.TrimSpace(req.TargetDir)
				if destDir == "" {
					home, _ := os.UserHomeDir()
					destDir = filepath.Join(home, "Desktop")
				} else {
					destDir = expandUserPath(destDir)
				}
				_ = os.MkdirAll(destDir, 0o755)
				items := getShelfItemsSnapshot()
				done := 0
				for i, it := range items {
					if it.Path != "" {
						dst := filepath.Join(destDir, filepath.Base(it.Path))
						if req.Action == "move_all" {
							if err := os.Rename(it.Path, dst); err == nil {
								done++
								continue
							}
						}
						if err := copyPathRecursive(it.Path, dst); err == nil {
							done++
							if req.Action == "move_all" {
								_ = os.RemoveAll(it.Path)
							}
						}
					} else if it.Content != "" {
						name := it.Name
						if name == "" {
							name = fmt.Sprintf("shelf_item_%d.txt", i+1)
						}
						if strings.HasPrefix(it.Content, "data:image/") {
							if idx := strings.Index(it.Content, ","); idx > 0 {
								if raw, err := base64.StdEncoding.DecodeString(it.Content[idx+1:]); err == nil {
									if !strings.Contains(name, ".") {
										name += ".png"
									}
									if os.WriteFile(filepath.Join(destDir, name), raw, 0o644) == nil {
										done++
									}
									continue
								}
							}
						}
						if !strings.Contains(name, ".") {
							name += ".txt"
						}
						if os.WriteFile(filepath.Join(destDir, name), []byte(it.Content), 0o644) == nil {
							done++
						}
					}
				}
				if req.Action == "move_all" && done > 0 {
					shelfMu.Lock()
					shelfItems = []ShelfItem{}
					saveShelfItemsLocked()
					shelfMu.Unlock()
				}
				_ = json.NewEncoder(w).Encode(map[string]interface{}{
					"ok":         true,
					"count":      done,
					"target_dir": destDir,
					"items":      getShelfItemsSnapshot(),
				})
				return
			case "zip_all":
				home, _ := os.UserHomeDir()
				destZip := filepath.Join(home, "Desktop", fmt.Sprintf("LumaShelf_%s.zip", time.Now().Format("20060102_150405")))
				n, err := bundleShelfToZip(destZip, getShelfItemsSnapshot())
				if err != nil {
					_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
					return
				}
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "zip_path": destZip, "count": n})
				return
			}
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":    true,
			"items": getShelfItemsSnapshot(),
		})
	})

	// 4. Per-App Audio & Media Hub (KDE Plasma / PipeWire style)
	mux.HandleFunc("/api/kernel/audio/apps", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		sessions := listAudioAppSessionsOS(kernel.probe)
		devices := kernel.probe.ListAudioDevices(false)
		oxygenMicMu.Lock()
		micM := oxygenMicMuted
		oxygenMicMu.Unlock()
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":        true,
			"apps":      sessions,
			"devices":   devices,
			"mic_muted": micM,
		})
	})

	mux.HandleFunc("/api/kernel/audio/app-volume", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var req struct {
			PID    int   `json:"pid"`
			Volume *int  `json:"volume"`
			Muted  *bool `json:"muted"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		err := setAudioAppVolumeOS(req.PID, req.Volume, req.Muted)
		if err != nil {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "pid": req.PID})
	})

	mux.HandleFunc("/api/kernel/audio/mic-mute", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var req struct {
			Muted *bool `json:"muted"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		oxygenMicMu.Lock()
		next := !oxygenMicMuted
		if req.Muted != nil {
			next = *req.Muted
		}
		oxygenMicMuted = next
		oxygenMicMu.Unlock()
		_ = toggleMicMuteOS(next)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "mic_muted": next})
	})

	// 5. Smart Clipboard Auto-OCR & Plain-Text Paste (Ctrl+Shift+V)
	mux.HandleFunc("/api/kernel/clipboard/ocr", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var req struct {
			ImageData string `json:"image_data"`
		}
		if err := json.NewDecoder(io.LimitReader(r.Body, 12*1024*1024)).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		b64 := req.ImageData
		if idx := strings.Index(b64, ","); idx > 0 {
			b64 = b64[idx+1:]
		}
		raw, err := base64.StdEncoding.DecodeString(b64)
		if err != nil || len(raw) == 0 {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "Некорректное изображение"})
			return
		}
		txt, engine, oErr := runImageOCROS(raw)
		if oErr != nil {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "text": "", "engine": engine, "note": oErr.Error()})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "text": txt, "engine": engine})
	})

	mux.HandleFunc("/api/kernel/clipboard/paste-plain", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var req struct {
			Text     string `json:"text"`
			Simulate bool   `json:"simulate"`
		}
		if err := json.NewDecoder(io.LimitReader(r.Body, 4*1024*1024)).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		plain := strings.ReplaceAll(req.Text, "\r\n", "\n")
		_ = kernel.probe.SetClipboard(plain)
		if req.Simulate {
			go pastePlainTextOS()
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "plain_len": len(plain)})
	})

	// 6. Next-Gen Oxygen OSD Telemetry (Caps/Num/Scroll Lock + Mic + Recording + KWin DND/Compositor)
	mux.HandleFunc("/api/kernel/osd/state", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		caps, num, scroll := readLockKeysOS()
		oxygenMicMu.Lock()
		micM := oxygenMicMuted
		oxygenMicMu.Unlock()
		winRulesMu.RLock()
		rt := winRulesRuntime
		winRulesMu.RUnlock()
		recRunning, recSec := false, 0
		if nativeRec != nil {
			st := nativeRec.Status()
			recRunning, _ = st["running"].(bool)
			recSec, _ = st["elapsed_sec"].(int)
		}
		_ = json.NewEncoder(w).Encode(OxygenOSDState{
			OK:           true,
			CapsLock:     caps,
			NumLock:      num,
			ScrollLock:   scroll,
			MicMuted:     micM,
			Recording:    recRunning,
			RecordingSec: recSec,
			ActiveDND:    rt.ActiveDND,
			NoCompositor: rt.ActiveDisableCompositor,
			MatchedRules: len(rt.MatchedRuleNames),
		})
	})
}
