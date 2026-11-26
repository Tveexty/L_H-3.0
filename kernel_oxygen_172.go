package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

// ==================== LUMA OS 1.7.2 (OXYGEN · O-8) — BASE & PRO EDITIONS, PHOTO STUDIO, ====================
// ==================== SYSTEM-WIDE FILE HANDLERS, MARKET RATES & SUPERDEVICE ECOSYSTEM ====================

// KernelEdition is injected at build time via:
//   -ldflags="-X main.KernelEdition=base"  -> LumaOS_1.7.2_Base.exe
//   -ldflags="-X main.KernelEdition=pro"   -> LumaOS_1.7.2_Pro.exe
var KernelEdition = "pro"

func isProEdition() bool {
	return strings.EqualFold(strings.TrimSpace(KernelEdition), "pro")
}

func getEditionNormalized() string {
	if isProEdition() {
		return "pro"
	}
	return "base"
}

func getEditionDisplayName() string {
	if isProEdition() {
		return "Luma OS 1.7.2 Pro"
	}
	return "Luma OS 1.7.2 Base"
}

func getLumaWindowTitle() string {
	if isProEdition() {
		return "Luma OS 1.7.2 Pro (Oxygen)"
	}
	return "Luma OS 1.7.2 Base (Oxygen)"
}

type EditionSnapshot struct {
	OK           bool            `json:"ok"`
	Version      string          `json:"version"`
	Edition      string          `json:"edition"` // "base" | "pro"
	EditionLabel string          `json:"edition_label"`
	IsPro        bool            `json:"is_pro"`
	IsAdmin      bool            `json:"is_admin"`
	FullRights   bool            `json:"full_rights"`
	CanElevate   bool            `json:"can_elevate"`
	BaseExe      string          `json:"base_exe"`
	ProExe       string          `json:"pro_exe"`
	Features     map[string]bool `json:"features"`
}

func getEditionSnapshot() EditionSnapshot {
	pro := isProEdition()
	adm := getAdminStatus()
	return EditionSnapshot{
		OK:           true,
		Version:      KernelVersion,
		Edition:      getEditionNormalized(),
		EditionLabel: getEditionDisplayName(),
		IsPro:        pro,
		IsAdmin:      adm.IsAdmin,
		FullRights:   pro && adm.IsAdmin,
		CanElevate:   runtime.GOOS == "windows" && !adm.IsAdmin,
		BaseExe:      "LumaOS_1.7.2_Base.exe",
		ProExe:       "LumaOS_1.7.2_Pro.exe",
		Features: map[string]bool{
			"photo_editor":             true,
			"photo_editor_pro_export":  pro,
			"system_explorer_routing":  true,
			"os_default_associations":  pro,
			"modular_panel_widgets":    true,
			"modular_panel_unlimited":  pro,
			"scroll_actions":           true,
			"harmony_control_center":   true,
			"superdevice_basic":        true,
			"superdevice_pro_routing":  pro,
			"kwin_window_rules":        true,
			"kwin_game_compositor_pro": pro,
			"lumashield_basic":         true,
			"lumashield_hardcore_pro":  pro,
			"swapboost_pro":            pro,
			"battery_charge_limit_pro": pro,
			"admin_elevation_control":  pro,
			"developer_sdk_studio":     pro,
			"circle_to_search":         true,
		},
	}
}

// ==================== EXTERNAL FILE / FOLDER HANDOFF QUEUE (OPEN EVERYTHING INSIDE LUMA OS!) ====================

type ExternalOpenRequest struct {
	ID        string `json:"id"`
	Path      string `json:"path"`
	Mode      string `json:"mode"` // "auto" | "photo" | "explorer" | "code" | "office" | "media"
	Name      string `json:"name"`
	Ext       string `json:"ext"`
	IsDir     bool   `json:"is_dir"`
	Timestamp int64  `json:"timestamp"`
}

var (
	extOpenMu      sync.Mutex
	extOpenQueue   = make([]ExternalOpenRequest, 0, 16)
	extOpenSubsMu  sync.Mutex
	extOpenSubs    = make(map[int]chan ExternalOpenRequest)
	extOpenNextSub = 1
)

func classifyExternalOpenMode(targetPath, forcedMode string) (string, bool) {
	info, err := os.Stat(targetPath)
	isDir := err == nil && info.IsDir()
	if forcedMode != "" && forcedMode != "auto" {
		return forcedMode, isDir
	}
	if isDir {
		return "explorer", true
	}
	ext := strings.ToLower(filepath.Ext(targetPath))
	switch ext {
	case ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".ico", ".svg", ".avif", ".tiff", ".tif":
		return "photo", false
	case ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt", ".csv", ".rtf", ".odt":
		return "office", false
	case ".mp4", ".mkv", ".avi", ".mov", ".webm", ".mp3", ".wav", ".flac", ".ogg", ".m4a":
		return "media", false
	case ".txt", ".md", ".json", ".js", ".jsx", ".ts", ".tsx", ".go", ".py", ".css", ".html", ".htm", ".xml", ".yaml", ".yml", ".ini", ".cfg", ".log", ".sh", ".ps1", ".rs", ".c", ".cpp", ".h", ".cs", ".java", ".sql":
		return "code", false
	default:
		return "explorer", false
	}
}

func enqueueExternalOpen(targetPath, forcedMode string) ExternalOpenRequest {
	cleanPath := strings.TrimSpace(targetPath)
	if abs, err := filepath.Abs(cleanPath); err == nil {
		cleanPath = abs
	}
	mode, isDir := classifyExternalOpenMode(cleanPath, forcedMode)
	req := ExternalOpenRequest{
		ID:        fmt.Sprintf("open_%d", time.Now().UnixNano()),
		Path:      cleanPath,
		Mode:      mode,
		Name:      filepath.Base(cleanPath),
		Ext:       strings.ToLower(filepath.Ext(cleanPath)),
		IsDir:     isDir,
		Timestamp: time.Now().UnixMilli(),
	}
	extOpenMu.Lock()
	extOpenQueue = append(extOpenQueue, req)
	if len(extOpenQueue) > 20 {
		extOpenQueue = extOpenQueue[len(extOpenQueue)-20:]
	}
	extOpenMu.Unlock()

	extOpenSubsMu.Lock()
	for _, ch := range extOpenSubs {
		select {
		case ch <- req:
		default:
		}
	}
	extOpenSubsMu.Unlock()
	return req
}

func popExternalOpenQueue() []ExternalOpenRequest {
	extOpenMu.Lock()
	defer extOpenMu.Unlock()
	if len(extOpenQueue) == 0 {
		return []ExternalOpenRequest{}
	}
	out := make([]ExternalOpenRequest, len(extOpenQueue))
	copy(out, extOpenQueue)
	extOpenQueue = extOpenQueue[:0]
	return out
}

// parseStartupExternalOpenArg handles launching LumaOS_1.7.2_*.exe with a photo/folder/file path.
// If another Luma OS instance is already running on port 49216, forwards the open request and returns true so this process exits cleanly.
func handleStartupExternalOpenArgs(args []string, httpPort int) bool {
	forcedMode := "auto"
	target := ""
	for i := 0; i < len(args); i++ {
		a := strings.TrimSpace(args[i])
		if a == "" {
			continue
		}
		if a == "--open-photo" && i+1 < len(args) {
			forcedMode = "photo"
			target = args[i+1]
			i++
			continue
		}
		if a == "--open-folder" && i+1 < len(args) {
			forcedMode = "explorer"
			target = args[i+1]
			i++
			continue
		}
		if a == "--open-code" && i+1 < len(args) {
			forcedMode = "code"
			target = args[i+1]
			i++
			continue
		}
		if strings.HasPrefix(a, "-") {
			continue
		}
		if target == "" {
			if _, err := os.Stat(a); err == nil {
				target = a
			}
		}
	}
	if target == "" {
		return false
	}
	// Check if an existing Luma OS instance is already listening on httpPort
	client := &http.Client{Timeout: 900 * time.Millisecond}
	body, _ := json.Marshal(map[string]string{"path": target, "mode": forcedMode})
	resp, err := client.Post(fmt.Sprintf("http://127.0.0.1:%d/api/kernel/external-open", httpPort), "application/json", bytes.NewReader(body))
	if err == nil {
		_ = resp.Body.Close()
		if resp.StatusCode == http.StatusOK {
			log.Printf("[LumaCore 1.6.2] Forwarded external open target %q (%s) to active Luma OS instance", target, forcedMode)
			return true
		}
	}
	// Otherwise queue for our own boot!
	enqueueExternalOpen(target, forcedMode)
	return false
}

// ==================== LIVE MARKET & CURRENCY RATES FOR MODULAR PANEL ====================

type MarketRateItem struct {
	Code   string  `json:"code"`
	Pair   string  `json:"pair"`
	Symbol string  `json:"symbol"`
	Value  float64 `json:"value"`
	Change float64 `json:"change"` // % delta hint
	Unit   string  `json:"unit"`
}

var (
	marketMu         sync.RWMutex
	marketRatesCache []MarketRateItem
	marketRatesAt    time.Time
)

func getLiveMarketRates() ([]MarketRateItem, string) {
	marketMu.RLock()
	if len(marketRatesCache) > 0 && time.Since(marketRatesAt) < 5*time.Minute {
		out := make([]MarketRateItem, len(marketRatesCache))
		copy(out, marketRatesCache)
		ts := marketRatesAt.Format("15:04")
		marketMu.RUnlock()
		return out, ts
	}
	marketMu.RUnlock()

	// Graceful defaults if offline
	usdRub := 91.45
	eurRub := 98.80
	cnyRub := 12.62
	btcUsd := 92450.0
	source := "offline"

	client := &http.Client{Timeout: 2500 * time.Millisecond}

	// 1. Live fiat rates (open.er-api.com free no-key JSON)
	if resp, err := client.Get("https://open.er-api.com/v6/latest/USD"); err == nil {
		func() {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				var parsed struct {
					Result string             `json:"result"`
					Rates  map[string]float64 `json:"rates"`
				}
				if json.NewDecoder(io.LimitReader(resp.Body, 128*1024)).Decode(&parsed) == nil && parsed.Rates != nil {
					if r := parsed.Rates["RUB"]; r > 20 && r < 500 {
						usdRub = r
						source = "live"
						if e := parsed.Rates["EUR"]; e > 0.2 {
							eurRub = usdRub / e
						}
						if c := parsed.Rates["CNY"]; c > 1 {
							cnyRub = usdRub / c
						}
					}
				}
			}
		}()
	}

	// 2. Live BTC/USD rate (Coinbase public spot endpoint)
	if resp, err := client.Get("https://api.coinbase.com/v2/prices/BTC-USD/spot"); err == nil {
		func() {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				var parsed struct {
					Data struct {
						Amount string `json:"amount"`
					} `json:"data"`
				}
				if json.NewDecoder(io.LimitReader(resp.Body, 16*1024)).Decode(&parsed) == nil {
					var v float64
					if _, serr := fmt.Sscanf(parsed.Data.Amount, "%f", &v); serr == nil && v > 1000 {
						btcUsd = v
						source = "live"
					}
				}
			}
		}()
	}

	items := []MarketRateItem{
		{Code: "USD", Pair: "USD/RUB", Symbol: "$", Value: usdRub, Change: 0.34, Unit: "₽"},
		{Code: "EUR", Pair: "EUR/RUB", Symbol: "€", Value: eurRub, Change: -0.18, Unit: "₽"},
		{Code: "CNY", Pair: "CNY/RUB", Symbol: "¥", Value: cnyRub, Change: 0.12, Unit: "₽"},
		{Code: "BTC", Pair: "BTC/USD", Symbol: "₿", Value: btcUsd, Change: 1.85, Unit: "$"},
	}

	marketMu.Lock()
	marketRatesCache = items
	marketRatesAt = time.Now()
	marketMu.Unlock()
	return items, fmt.Sprintf("%s · %s", source, time.Now().Format("15:04"))
}

// ==================== HARMONYOS SUPERDEVICE ECOSYSTEM GRAPH ====================

type SuperDeviceNode struct {
	ID          string `json:"id"`
	Kind        string `json:"kind"` // "phone" | "audio" | "bluetooth" | "display" | "gamepad" | "ai"
	Name        string `json:"name"`
	Subtitle    string `json:"subtitle"`
	Connected   bool   `json:"connected"`
	Battery     int    `json:"battery"` // -1 if N/A
	Address     string `json:"address,omitempty"`
	ActionHint  string `json:"action_hint"`
	AccentColor string `json:"accent_color"`
}

func buildSuperDeviceSnapshot(kernel *LumaKernel) map[string]interface{} {
	nodes := make([]SuperDeviceNode, 0, 12)

	// 1. Android Phone via Oxygen Connect
	oxy := getOxygenConnectStatusSnapshot()
	phoneConnected := false
	phoneName := "Смартфон Android"
	phoneSub := fmt.Sprintf("PIN %s · Нажмите для подключения", oxy["pin"])
	if devs, ok := oxy["devices"].([]OxygenConnectedDevice); ok && len(devs) > 0 {
		phoneConnected = true
		phoneName = devs[0].Name
		if strings.TrimSpace(phoneName) == "" {
			phoneName = "Android · Oxygen Connect"
		}
		phoneSub = fmt.Sprintf("Подключено (%s) · Файлы, Тачпад, Камера", devs[0].IP)
	}
	nodes = append(nodes, SuperDeviceNode{
		ID:          "phone_oxygen",
		Kind:        "phone",
		Name:        phoneName,
		Subtitle:    phoneSub,
		Connected:   phoneConnected,
		Battery:     -1,
		ActionHint:  "SuperHub · Файлы, Камера и Тачпад",
		AccentColor: "#38bdf8",
	})

	// 2. Real Audio Outputs (Headphones / Speakers / Monitors)
	audioDevs := kernel.probe.ListAudioDevices(false)
	for idx, out := range audioDevs.Outputs {
		if idx >= 3 {
			break
		}
		nodes = append(nodes, SuperDeviceNode{
			ID:          "audio_" + out.ID,
			Kind:        "audio",
			Name:        out.Name,
			Subtitle:    map[bool]string{true: "Активный вывод звука ПК", false: "Перетащите на ПК для вывода звука"}[out.IsDefault],
			Connected:   out.IsDefault,
			Battery:     -1,
			Address:     out.ID,
			ActionHint:  "Переключить вывод звука",
			AccentColor: "#3b82f6",
		})
	}

	// 3. Real Multi-Monitor / Wireless Display Nodes
	monitors := listMonitorsOS()
	if len(monitors) > 1 {
		for _, m := range monitors {
			if m.Primary {
				continue
			}
			nodes = append(nodes, SuperDeviceNode{
				ID:          fmt.Sprintf("display_%d", m.Index),
				Kind:        "display",
				Name:        fmt.Sprintf("Экран %d (%dx%d)", m.Index+1, m.Width, m.Height),
				Subtitle:    "Расширенный рабочий стол · KWin Rules",
				Connected:   true,
				Battery:     -1,
				ActionHint:  "Настроить правила окон (KWin)",
				AccentColor: "#8b5cf6",
			})
		}
	} else {
		nodes = append(nodes, SuperDeviceNode{
			ID:          "display_wireless",
			Kind:        "display",
			Name:        "Второй экран / ТВ",
			Subtitle:    "Беспроводной дисплей или второй монитор",
			Connected:   false,
			Battery:     -1,
			ActionHint:  "Подключить проекцию / мониторы",
			AccentColor: "#8b5cf6",
		})
	}

	// 4. Real Bluetooth Wireless Peripherals (cached battery scan)
	if bats := kernel.probe.GetWirelessDeviceBatteries(false); len(bats) > 0 {
		for idx, wb := range bats {
			if idx >= 3 {
				break
			}
			nodes = append(nodes, SuperDeviceNode{
				ID:          fmt.Sprintf("bt_%d_%s", idx, wb.Name),
				Kind:        "bluetooth",
				Name:        wb.Name,
				Subtitle:    fmt.Sprintf("%s · %s", wb.Transport, map[bool]string{true: "Подключено", false: "Готово"}[wb.Connected]),
				Connected:   wb.Connected,
				Battery:     wb.BatteryPercent,
				ActionHint:  "Управление Bluetooth-устройством",
				AccentColor: "#06b6d4",
			})
		}
	}

	// 5. Luma Ai Nitrogen Local/Cloud Node
	aiCfg := loadNitrogenBrainConfig()
	aiModel := strings.TrimSpace(aiCfg.ModelName)
	if aiModel == "" {
		aiModel = "Luma Nitrogen Flash"
	}
	nodes = append(nodes, SuperDeviceNode{
		ID:          "ai_nitrogen_node",
		Kind:        "ai",
		Name:        "Luma Ai Nitrogen",
		Subtitle:    fmt.Sprintf("AI-узел · %s", aiModel),
		Connected:   kernel.IsAIEnabled() && aiCfg.Enabled,
		Battery:     -1,
		ActionHint:  "Чат, Код и Circle to Search Vision",
		AccentColor: "#10b981",
	})

	hostName, _ := os.Hostname()
	if strings.TrimSpace(hostName) == "" {
		hostName = "Luma PC"
	}
	return map[string]interface{}{
		"ok":          true,
		"host_name":   hostName,
		"edition":     getEditionDisplayName(),
		"is_pro":      isProEdition(),
		"pair_url":    oxy["pair_url"],
		"pin":         oxy["pin"],
		"nodes":       nodes,
		"connected":   len(nodes),
		"updated_at":  time.Now().Format("15:04:05"),
	}
}

// ==================== REGISTER ALL 1.7.2 KERNEL HTTP ROUTES ====================

func registerOxygen172Routes(mux *http.ServeMux, kernel *LumaKernel) {
	// 1. Base / Pro Edition Status & Admin Elevation
	mux.HandleFunc("/api/kernel/edition", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_ = json.NewEncoder(w).Encode(getEditionSnapshot())
	})

	mux.HandleFunc("/api/kernel/edition/elevate", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		res := restartAsAdministrator()
		_ = json.NewEncoder(w).Encode(res)
	})

	// 2. Serve Local Raw Files (Photos / Images / Media / Text) Directly Inside Luma OS Apps!
	mux.HandleFunc("/api/kernel/fs/raw-file", func(w http.ResponseWriter, r *http.Request) {
		rawPath := strings.TrimSpace(r.URL.Query().Get("path"))
		if rawPath == "" {
			http.Error(w, "missing path", http.StatusBadRequest)
			return
		}
		if strings.HasPrefix(rawPath, "~") {
			if home, err := os.UserHomeDir(); err == nil {
				rawPath = filepath.Join(home, strings.TrimPrefix(rawPath, "~"))
			}
		}
		info, err := os.Stat(rawPath)
		if err != nil || info.IsDir() {
			http.Error(w, "file not found", http.StatusNotFound)
			return
		}
		ext := strings.ToLower(filepath.Ext(rawPath))
		ct := mime.TypeByExtension(ext)
		if ct == "" {
			switch ext {
			case ".webp":
				ct = "image/webp"
			case ".png":
				ct = "image/png"
			case ".jpg", ".jpeg":
				ct = "image/jpeg"
			case ".gif":
				ct = "image/gif"
			case ".bmp":
				ct = "image/bmp"
			case ".svg":
				ct = "image/svg+xml"
			case ".avif":
				ct = "image/avif"
			default:
				ct = "application/octet-stream"
			}
		}
		w.Header().Set("Content-Type", ct)
		w.Header().Set("Cache-Control", "no-store")
		http.ServeFile(w, r, rawPath)
	})

	// 3. Luma Photo Studio Save Endpoint (Overwrite or Save As PNG/JPG/WebP)
	mux.HandleFunc("/api/kernel/photo/save", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Path        string `json:"path"`
			FileName    string `json:"file_name"`
			ImageBase64 string `json:"image_base64"`
			Format      string `json:"format"` // png | jpeg | webp
			Overwrite   bool   `json:"overwrite"`
			SendToPhone bool   `json:"send_to_phone"`
		}
		if err := json.NewDecoder(io.LimitReader(r.Body, 45*1024*1024)).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		rawB64 := strings.TrimSpace(req.ImageBase64)
		if idx := strings.Index(rawB64, ","); idx >= 0 {
			rawB64 = rawB64[idx+1:]
		}
		data, err := base64.StdEncoding.DecodeString(rawB64)
		if err != nil || len(data) == 0 {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "invalid image base64"})
			return
		}

		ext := ".png"
		switch strings.ToLower(strings.TrimSpace(req.Format)) {
		case "jpg", "jpeg":
			ext = ".jpg"
		case "webp":
			ext = ".webp"
		}

		targetPath := strings.TrimSpace(req.Path)
		if targetPath == "" || !req.Overwrite {
			home, _ := os.UserHomeDir()
			saveDir := filepath.Join(home, "Pictures", "Luma Photo Studio")
			if targetPath != "" {
				if d := filepath.Dir(targetPath); d != "" && d != "." {
					saveDir = d
				}
			}
			_ = os.MkdirAll(saveDir, 0o755)
			baseName := strings.TrimSpace(req.FileName)
			if baseName == "" && targetPath != "" {
				orig := filepath.Base(targetPath)
				baseName = strings.TrimSuffix(orig, filepath.Ext(orig)) + "_luma_edit" + ext
			}
			if baseName == "" {
				baseName = fmt.Sprintf("LumaPhoto_%s%s", time.Now().Format("20060102_150405"), ext)
			}
			if filepath.Ext(baseName) == "" {
				baseName += ext
			}
			targetPath = filepath.Join(saveDir, filepath.Base(baseName))
		} else {
			_ = os.MkdirAll(filepath.Dir(targetPath), 0o755)
		}

		if err := os.WriteFile(targetPath, data, 0o644); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}

		// Optionally push straight to Oxygen Connect Phone with HarmonyOS Wave!
		if req.SendToPhone {
			addFileToOxygenOutbox(targetPath)
		}

		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":          true,
			"path":        targetPath,
			"name":        filepath.Base(targetPath),
			"size":        len(data),
			"preview_url": "/api/kernel/fs/raw-file?path=" + urlQueryEscapeSimple(targetPath) + fmt.Sprintf("&t=%d", time.Now().UnixMilli()),
		})
	})

	// 4. System-Wide Default File & Explorer Handler Associations (Photos / Explorer / Code -> Luma OS!)
	mux.HandleFunc("/api/kernel/system-handlers", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method == http.MethodPost {
			var req SystemHandlersConfig
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
				return
			}
			res := applySystemFileHandlers(req)
			_ = json.NewEncoder(w).Encode(res)
			return
		}
		_ = json.NewEncoder(w).Encode(getSystemFileHandlersStatus())
	})

	// 5. External Open Queue + Live SSE Stream (double-clicking a photo/folder in Windows opens right inside Luma OS!)
	mux.HandleFunc("/api/kernel/external-open", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method == http.MethodPost {
			var payload struct {
				Path string `json:"path"`
				Mode string `json:"mode"`
			}
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || strings.TrimSpace(payload.Path) == "" {
				w.WriteHeader(http.StatusBadRequest)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "path required"})
				return
			}
			item := enqueueExternalOpen(payload.Path, payload.Mode)
			bringLumaHomeNow()
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "item": item})
			return
		}
		items := popExternalOpenQueue()
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "items": items})
	})

	mux.HandleFunc("/api/kernel/external-open/events", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no")
		flusher, _ := w.(http.Flusher)

		ch := make(chan ExternalOpenRequest, 12)
		extOpenSubsMu.Lock()
		id := extOpenNextSub
		extOpenNextSub++
		extOpenSubs[id] = ch
		extOpenSubsMu.Unlock()
		defer func() {
			extOpenSubsMu.Lock()
			delete(extOpenSubs, id)
			extOpenSubsMu.Unlock()
		}()

		writeSSEEvent(w, flusher, map[string]interface{}{"type": "connected"})
		// Drain any queued startup items immediately
		for _, item := range popExternalOpenQueue() {
			writeSSEEvent(w, flusher, map[string]interface{}{"type": "open", "item": item})
		}

		keepalive := time.NewTicker(25 * time.Second)
		defer keepalive.Stop()
		for {
			select {
			case <-r.Context().Done():
				return
			case item := <-ch:
				writeSSEEvent(w, flusher, map[string]interface{}{"type": "open", "item": item})
			case <-keepalive.C:
				_, _ = fmt.Fprintf(w, ": ping\n\n")
				if flusher != nil {
					flusher.Flush()
				}
			}
		}
	})

	// 6. Live Currency / Market Rates for Modular Panel Bar
	mux.HandleFunc("/api/kernel/market/rates", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		rates, updated := getLiveMarketRates()
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":      true,
			"rates":   rates,
			"updated": updated,
		})
	})

	// 7. HarmonyOS SuperDevice Ecosystem Hub API
	mux.HandleFunc("/api/kernel/superdevice/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_ = json.NewEncoder(w).Encode(buildSuperDeviceSnapshot(kernel))
	})

	mux.HandleFunc("/api/kernel/superdevice/connect", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			NodeID  string `json:"node_id"`
			Kind    string `json:"kind"`
			Address string `json:"address"`
			Name    string `json:"name"`
			Action  string `json:"action"` // "connect" | "disconnect"
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		msg := fmt.Sprintf("Устройство «%s» синхронизировано с Суперустройством", req.Name)
		switch req.Kind {
		case "audio":
			if req.Address != "" {
				if err := kernel.probe.SetDefaultAudioDevice(req.Address, "output"); err != nil {
					_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
					return
				}
				msg = fmt.Sprintf("Звук ПК переключён на «%s»", req.Name)
			}
		case "bluetooth":
			if req.Address != "" || req.Name != "" {
				_ = kernel.probe.SetBluetoothEnabled(true)
				msg = fmt.Sprintf("Bluetooth-мост Суперустройства активирован для «%s»", req.Name)
			}
		case "phone":
			msg = "Мост Oxygen Connect (Android SuperHub) активен — готово к мгновенной передаче с волной HarmonyOS!"
		case "display":
			msg = "Открыты параметры экранов и KWin-правила окон"
		case "ai":
			msg = "Нейроузел Luma Ai Nitrogen подключён к Суперустройству"
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":      true,
			"message": msg,
			"status":  buildSuperDeviceSnapshot(kernel),
		})
	})
}

func urlQueryEscapeSimple(p string) string {
	var b strings.Builder
	for i := 0; i < len(p); i++ {
		c := p[i]
		if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.' || c == '~' {
			b.WriteByte(c)
		} else {
			_, _ = fmt.Fprintf(&b, "%%%02X", c)
		}
	}
	return b.String()
}

// Helper invoked by /api/kernel/photo/save when user wants instant PC -> Phone send with HarmonyOS Wave.
func addFileToOxygenOutbox(targetPath string) {
	info, err := os.Stat(targetPath)
	if err != nil || info.IsDir() {
		return
	}
	name := filepath.Base(targetPath)
	id := fmt.Sprintf("out_%d", time.Now().UnixNano())
	item := OxygenReceivedFile{
		ID:         id,
		Name:       name,
		Path:       targetPath,
		Size:       info.Size(),
		IsImage:    strings.Contains(".png.jpg.jpeg.webp.bmp.gif", strings.ToLower(filepath.Ext(name))),
		FromDevice: "Luma Photo Studio",
		ReceivedAt: time.Now().Format("15:04:05"),
	}
	oxyConnMu.Lock()
	oxyConnOutbox = append([]OxygenReceivedFile{item}, oxyConnOutbox...)
	if len(oxyConnOutbox) > 30 {
		oxyConnOutbox = oxyConnOutbox[:30]
	}
	oxyConnMu.Unlock()
	publishOxygenTransferEvent(OxygenTransferEvent{
		ID:         id,
		Direction:  "send",
		FileName:   name,
		Path:       targetPath,
		Size:       info.Size(),
		IsImage:    item.IsImage,
		PreviewURL: "/api/kernel/fs/raw-file?path=" + urlQueryEscapeSimple(targetPath),
		Device:     "Android",
		Timestamp:  time.Now().UnixMilli(),
	})
}
