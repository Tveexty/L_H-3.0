package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"
)

// ==================== LUMA OS 1.6.3: LUMA AI NITROGEN BRIDGE + CALENDAR STORE + AI DOWNLOAD/UNINSTALL MANAGER ====================

// ---- 1. Persistent Luma OS Calendar Store (Shared by React UI, Go Luma Ai Nitrogen & Python luma_ai_nitrogen!) ----

type KernelCalendarEvent struct {
	ID       string `json:"id"`
	Date     string `json:"date"`     // YYYY-MM-DD
	Time     string `json:"time"`     // HH:MM
	Title    string `json:"title"`
	Note     string `json:"note,omitempty"`
	Color    string `json:"color"`
	Category string `json:"category"` // work | personal | meeting | deadline | health
	Done     bool   `json:"done"`
	Repeat   string `json:"repeat"`   // none | daily | weekly | monthly
	Priority string `json:"priority"` // normal | important | urgent
}

var calendarStoreMu sync.Mutex

func calendarStorePath() string {
	cfgDir, err := os.UserConfigDir()
	if err != nil || cfgDir == "" {
		cfgDir = os.TempDir()
	}
	dir := filepath.Join(cfgDir, "LumaOS")
	_ = os.MkdirAll(dir, 0o700)
	return filepath.Join(dir, "calendar_events.json")
}

func loadCalendarEventsLocked() []KernelCalendarEvent {
	raw, err := os.ReadFile(calendarStorePath())
	if err != nil {
		return []KernelCalendarEvent{}
	}
	var list []KernelCalendarEvent
	if json.Unmarshal(raw, &list) != nil {
		return []KernelCalendarEvent{}
	}
	if list == nil {
		list = []KernelCalendarEvent{}
	}
	return list
}

func saveCalendarEventsLocked(list []KernelCalendarEvent) {
	if list == nil {
		list = []KernelCalendarEvent{}
	}
	if raw, err := json.MarshalIndent(list, "", "  "); err == nil {
		_ = os.WriteFile(calendarStorePath(), raw, 0o600)
	}
}

func ListKernelCalendarEvents(dateFilter string) []KernelCalendarEvent {
	calendarStoreMu.Lock()
	defer calendarStoreMu.Unlock()
	all := loadCalendarEventsLocked()
	dateFilter = strings.TrimSpace(dateFilter)
	if dateFilter == "" {
		return all
	}
	var out []KernelCalendarEvent
	for _, ev := range all {
		if ev.Date == dateFilter {
			out = append(out, ev)
		}
	}
	if out == nil {
		out = []KernelCalendarEvent{}
	}
	return out
}

func UpsertKernelCalendarEvent(ev KernelCalendarEvent) KernelCalendarEvent {
	calendarStoreMu.Lock()
	defer calendarStoreMu.Unlock()
	all := loadCalendarEventsLocked()
	if strings.TrimSpace(ev.ID) == "" {
		ev.ID = fmt.Sprintf("ev_%d", time.Now().UnixNano())
	}
	if strings.TrimSpace(ev.Date) == "" {
		ev.Date = time.Now().Format("2006-01-02")
	}
	if strings.TrimSpace(ev.Time) == "" {
		ev.Time = "12:00"
	}
	if strings.TrimSpace(ev.Category) == "" {
		ev.Category = "work"
	}
	if strings.TrimSpace(ev.Color) == "" {
		switch ev.Category {
		case "meeting":
			ev.Color = "#6366f1"
		case "personal":
			ev.Color = "#10b981"
		case "deadline":
			ev.Color = "#f43f5e"
		case "health":
			ev.Color = "#f59e0b"
		default:
			ev.Color = "#06b6d4"
		}
	}
	if strings.TrimSpace(ev.Repeat) == "" {
		ev.Repeat = "none"
	}
	if strings.TrimSpace(ev.Priority) == "" {
		ev.Priority = "normal"
	}
	updated := false
	for i := range all {
		if all[i].ID == ev.ID {
			all[i] = ev
			updated = true
			break
		}
	}
	if !updated {
		all = append(all, ev)
	}
	sort.SliceStable(all, func(i, j int) bool {
		if all[i].Date != all[j].Date {
			return all[i].Date < all[j].Date
		}
		return all[i].Time < all[j].Time
	})
	saveCalendarEventsLocked(all)
	return ev
}

func DeleteKernelCalendarEvent(id string) bool {
	calendarStoreMu.Lock()
	defer calendarStoreMu.Unlock()
	all := loadCalendarEventsLocked()
	var next []KernelCalendarEvent
	removed := false
	for _, ev := range all {
		if ev.ID == id {
			removed = true
			continue
		}
		next = append(next, ev)
	}
	if removed {
		saveCalendarEventsLocked(next)
	}
	return removed
}

func ReplaceAllKernelCalendarEvents(list []KernelCalendarEvent) []KernelCalendarEvent {
	calendarStoreMu.Lock()
	defer calendarStoreMu.Unlock()
	saveCalendarEventsLocked(list)
	return list
}

// Natural-language Russian/English calendar intent handler for Luma Ai Nitrogen!
var (
	calTimeRe = regexp.MustCompile(`(?i)(?:в\s*)?(\d{1,2})[:.](\d{2})`)
	calDateRe = regexp.MustCompile(`(\d{4}-\d{2}-\d{2})`)
)

func tryHandleCalendarIntent(userText string) (handled bool, reply string, createdEv *KernelCalendarEvent, uiAction map[string]interface{}) {
	low := strings.ToLower(strings.TrimSpace(userText))
	isCalQuery := strings.Contains(low, "календар") || strings.Contains(low, "запланируй") ||
		strings.Contains(low, "добавь встречу") || strings.Contains(low, "поставь встречу") ||
		strings.Contains(low, "напомни") || strings.Contains(low, "какие планы") ||
		strings.Contains(low, "расписан") || strings.Contains(low, "событи") ||
		strings.Contains(low, "calendar") || strings.Contains(low, "schedule")
	if !isCalQuery {
		return false, "", nil, nil
	}

	now := time.Now()
	targetDate := now.Format("2006-01-02")
	if strings.Contains(low, "послезавтра") {
		targetDate = now.AddDate(0, 0, 2).Format("2006-01-02")
	} else if strings.Contains(low, "завтра") || strings.Contains(low, "tomorrow") {
		targetDate = now.AddDate(0, 0, 1).Format("2006-01-02")
	} else if m := calDateRe.FindStringSubmatch(low); len(m) == 2 {
		targetDate = m[1]
	}

	// Delete intent
	if strings.Contains(low, "удал") || strings.Contains(low, "убери") || strings.Contains(low, "отмени") || strings.Contains(low, "delete") {
		all := ListKernelCalendarEvents("")
		for _, ev := range all {
			if strings.Contains(low, strings.ToLower(ev.Title)) || (ev.Date == targetDate && len(all) == 1) {
				DeleteKernelCalendarEvent(ev.ID)
				return true,
					fmt.Sprintf("Событие **«%s»** (%s в %s) удалено из Календаря Luma OS.", ev.Title, ev.Date, ev.Time),
					nil,
					map[string]interface{}{"type": "refresh_calendar", "label": "Календарь обновлён"}
			}
		}
		return true, "Уточните точное название события, которое нужно удалить из Календаря Luma OS.", nil, nil
	}

	// List / Show intent
	if strings.Contains(low, "какие") || strings.Contains(low, "покажи") || strings.Contains(low, "список") || strings.Contains(low, "что у меня") || strings.Contains(low, "расписан") || strings.Contains(low, "list") {
		filterDate := ""
		if strings.Contains(low, "сегодня") || strings.Contains(low, "завтра") || strings.Contains(low, "послезавтра") || calDateRe.MatchString(low) {
			filterDate = targetDate
		}
		evs := ListKernelCalendarEvents(filterDate)
		if len(evs) == 0 {
			scope := "в Календаре Luma OS"
			if filterDate != "" {
				scope = "на " + filterDate
			}
			return true, fmt.Sprintf("У вас пока нет запланированных событий %s. Скажите, например: *«Запланируй созвон завтра в 15:00»*.", scope), nil, map[string]interface{}{"type": "open_window", "target": "calendar", "label": "Календарь"}
		}
		var b strings.Builder
		b.WriteString(fmt.Sprintf("### 📅 Ваши события (%d)\n", len(evs)))
		for _, ev := range evs {
			mark := "⬜"
			if ev.Done {
				mark = "✅"
			}
			b.WriteString(fmt.Sprintf("- %s **%s %s** — %s", mark, ev.Date, ev.Time, ev.Title))
			if ev.Note != "" {
				b.WriteString(" _(" + ev.Note + ")_")
			}
			b.WriteString("\n")
		}
		return true, b.String(), nil, map[string]interface{}{"type": "refresh_calendar", "label": "Календарь"}
	}

	// Create event intent
	if strings.Contains(low, "добав") || strings.Contains(low, "созда") || strings.Contains(low, "запланир") || strings.Contains(low, "постав") || strings.Contains(low, "напомн") || strings.Contains(low, "schedule") || strings.Contains(low, "add") {
		evTime := "12:00"
		if m := calTimeRe.FindStringSubmatch(userText); len(m) == 3 {
			evTime = fmt.Sprintf("%02s:%s", m[1], m[2])
		}
		title := userText
		stripWords := []string{
			"добавь в календарь", "добавить в календарь", "создай в календаре", "запланируй в календаре",
			"запланируй", "поставь в календарь", "поставь", "напомни мне", "напомни",
			"добавь событие", "добавь встречу", "послезавтра", "завтра", "сегодня",
		}
		cleanTitle := title
		for _, sw := range stripWords {
			re := regexp.MustCompile(`(?i)` + regexp.QuoteMeta(sw))
			cleanTitle = re.ReplaceAllString(cleanTitle, " ")
		}
		cleanTitle = calTimeRe.ReplaceAllString(cleanTitle, " ")
		cleanTitle = calDateRe.ReplaceAllString(cleanTitle, " ")
		cleanTitle = strings.TrimSpace(regexp.MustCompile(`\s+`).ReplaceAllString(cleanTitle, " "))
		cleanTitle = strings.Trim(cleanTitle, " ,.:;-\"'«»")
		if len(cleanTitle) < 2 {
			cleanTitle = "Новое событие (Luma Ai Nitrogen)"
		}
		cat := "work"
		if strings.Contains(low, "встреч") || strings.Contains(low, "созвон") {
			cat = "meeting"
		} else if strings.Contains(low, "тренир") || strings.Contains(low, "врач") || strings.Contains(low, "спорт") {
			cat = "health"
		} else if strings.Contains(low, "дедлайн") || strings.Contains(low, "сдать") {
			cat = "deadline"
		} else if strings.Contains(low, "др") || strings.Contains(low, "день рожд") || strings.Contains(low, "личн") {
			cat = "personal"
		}
		ev := UpsertKernelCalendarEvent(KernelCalendarEvent{
			Date:     targetDate,
			Time:     evTime,
			Title:    cleanTitle,
			Note:     "Создано Luma Ai Nitrogen",
			Category: cat,
			Priority: "important",
		})
		return true,
			fmt.Sprintf("✅ Добавлено в **Календарь Luma OS**:\n- **Событие:** %s\n- **Дата и время:** %s в %s\n- **Категория:** %s", ev.Title, ev.Date, ev.Time, ev.Category),
			&ev,
			map[string]interface{}{"type": "refresh_calendar", "label": "Добавлено в Календарь"}
	}

	return false, "", nil, nil
}

// ---- 2. Luma Ai Nitrogen Config & AI Install / Download / Uninstall Manager ----

type NitrogenBrainConfig struct {
	BaseURL          string  `json:"base_url"`
	APIKey           string  `json:"api_key"`
	ModelName        string  `json:"model_name"`
	PythonServerURL  string  `json:"python_server_url"`
	Temperature      float64 `json:"temperature"`
	AutoExtractFacts bool    `json:"auto_extract_facts"`
	Enabled          bool    `json:"enabled"`
}

type AIDownloadProgress struct {
	Running bool   `json:"running"`
	Stage   string `json:"stage"` // idle | checking | installing_ollama | pulling_model | done | error | uninstalled
	Model   string `json:"model"`
	Percent int    `json:"percent"`
	Message string `json:"message"`
}

var (
	nitrogenCfgMu sync.Mutex
	nitrogenCfg   = NitrogenBrainConfig{
		BaseURL:          "http://127.0.0.1:11434/v1",
		APIKey:           "ollama",
		ModelName:        "qwen2.5:3b",
		PythonServerURL:  "http://127.0.0.1:49225",
		Temperature:      0.55,
		AutoExtractFacts: true,
		Enabled:          true,
	}
	aiMgrMu       sync.Mutex
	aiDlProgress  = AIDownloadProgress{Stage: "idle", Message: "Готово"}
)

func nitrogenCfgPath() string {
	cfgDir, err := os.UserConfigDir()
	if err != nil || cfgDir == "" {
		cfgDir = os.TempDir()
	}
	dir := filepath.Join(cfgDir, "LumaOS", "LumaAiNitrogen")
	_ = os.MkdirAll(dir, 0o700)
	return filepath.Join(dir, "brain_config.json")
}

func loadNitrogenBrainConfig() NitrogenBrainConfig {
	nitrogenCfgMu.Lock()
	defer nitrogenCfgMu.Unlock()
	if raw, err := os.ReadFile(nitrogenCfgPath()); err == nil {
		_ = json.Unmarshal(raw, &nitrogenCfg)
	}
	if strings.TrimSpace(nitrogenCfg.BaseURL) == "" {
		nitrogenCfg.BaseURL = "http://127.0.0.1:11434/v1"
	}
	if strings.TrimSpace(nitrogenCfg.ModelName) == "" {
		nitrogenCfg.ModelName = "qwen2.5:3b"
	}
	if strings.TrimSpace(nitrogenCfg.PythonServerURL) == "" {
		nitrogenCfg.PythonServerURL = "http://127.0.0.1:49225"
	}
	return nitrogenCfg
}

func saveNitrogenBrainConfig(cfg NitrogenBrainConfig) NitrogenBrainConfig {
	nitrogenCfgMu.Lock()
	if strings.TrimSpace(cfg.BaseURL) == "" {
		cfg.BaseURL = "http://127.0.0.1:11434/v1"
	}
	if strings.TrimSpace(cfg.ModelName) == "" {
		cfg.ModelName = "qwen2.5:3b"
	}
	if strings.TrimSpace(cfg.PythonServerURL) == "" {
		cfg.PythonServerURL = "http://127.0.0.1:49225"
	}
	nitrogenCfg = cfg
	if raw, err := json.MarshalIndent(cfg, "", "  "); err == nil {
		_ = os.WriteFile(nitrogenCfgPath(), raw, 0o600)
	}
	out := nitrogenCfg
	nitrogenCfgMu.Unlock()
	return out
}

func probeOllamaStatus() (binaryInstalled bool, running bool, models []string) {
	if _, err := exec.LookPath("ollama"); err == nil {
		binaryInstalled = true
	} else if runtime.GOOS == "windows" {
		localApp := os.Getenv("LOCALAPPDATA")
		if localApp != "" {
			if _, err2 := os.Stat(filepath.Join(localApp, "Programs", "Ollama", "ollama.exe")); err2 == nil {
				binaryInstalled = true
			}
		}
	}

	client := &http.Client{Timeout: 1200 * time.Millisecond}
	resp, err := client.Get("http://127.0.0.1:11434/api/tags")
	if err != nil {
		return binaryInstalled, false, []string{}
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		running = true
		binaryInstalled = true
		var parsed struct {
			Models []struct {
				Name string `json:"name"`
			} `json:"models"`
		}
		if json.NewDecoder(resp.Body).Decode(&parsed) == nil {
			for _, m := range parsed.Models {
				if m.Name != "" {
					models = append(models, m.Name)
				}
			}
		}
	}
	if models == nil {
		models = []string{}
	}
	return binaryInstalled, running, models
}

func probePythonNitrogenServer(url string) bool {
	client := &http.Client{Timeout: 800 * time.Millisecond}
	resp, err := client.Get(strings.TrimRight(url, "/") + "/api/health")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func getAIManagerStatus(kernel *LumaKernel) map[string]interface{} {
	cfg := loadNitrogenBrainConfig()
	ollamaBin, ollamaRun, models := probeOllamaStatus()
	pyRun := probePythonNitrogenServer(cfg.PythonServerURL)
	memSnap := GetAIMemorySnapshot()

	memSizeBytes := int64(0)
	if cfgDir, err := os.UserConfigDir(); err == nil && cfgDir != "" {
		for _, p := range []string{
			filepath.Join(cfgDir, "LumaOS", "ai_memory_v5.json"),
			filepath.Join(cfgDir, "LumaOS", "LumaAiNitrogen", "luma_ai_nitrogen_memory.db"),
			filepath.Join(cfgDir, "LumaOS", "LumaAiNitrogen", "luma_ai_nitrogen_memory.db-wal"),
		} {
			if st, e := os.Stat(p); e == nil {
				memSizeBytes += st.Size()
			}
		}
	}

	aiMgrMu.Lock()
	dl := aiDlProgress
	aiMgrMu.Unlock()

	enabled := cfg.Enabled
	if kernel != nil {
		enabled = enabled && kernel.IsAIEnabled()
	}

	return map[string]interface{}{
		"ok":                    true,
		"name":                  "Luma Ai Nitrogen",
		"enabled":               enabled,
		"installed":             enabled && (len(models) > 0 || pyRun || ollamaBin),
		"ollama_installed":      ollamaBin,
		"ollama_running":        ollamaRun,
		"python_server_running": pyRun,
		"models_installed":      models,
		"active_model":          cfg.ModelName,
		"recommended_models":    []string{"qwen2.5:3b", "llama3.2:3b", "qwen2.5:1.5b"},
		"base_url":              cfg.BaseURL,
		"facts_count":           len(memSnap.Facts),
		"memory_size_mb":        float64(int(float64(memSizeBytes)/(1024*1024)*1000)) / 1000,
		"download_progress":     dl,
	}
}

func setAIDownloadProgress(p AIDownloadProgress) {
	aiMgrMu.Lock()
	aiDlProgress = p
	aiMgrMu.Unlock()
}

func startAsyncAIInstall(model string, kernel *LumaKernel) {
	if strings.TrimSpace(model) == "" {
		model = "qwen2.5:3b"
	}
	aiMgrMu.Lock()
	if aiDlProgress.Running {
		aiMgrMu.Unlock()
		return
	}
	aiDlProgress = AIDownloadProgress{
		Running: true,
		Stage:   "checking",
		Model:   model,
		Percent: 5,
		Message: "Проверка локального движка Ollama и модели " + model + "…",
	}
	aiMgrMu.Unlock()

	go func() {
		defer func() { _ = recover() }()
		if kernel != nil {
			kernel.SetAIEnabled(true)
		}
		cfg := loadNitrogenBrainConfig()
		cfg.Enabled = true
		cfg.ModelName = model
		cfg.BaseURL = "http://127.0.0.1:11434/v1"
		saveNitrogenBrainConfig(cfg)

		ollamaBin, ollamaRun, _ := probeOllamaStatus()
		if !ollamaBin {
			setAIDownloadProgress(AIDownloadProgress{
				Running: true, Stage: "installing_ollama", Model: model, Percent: 18,
				Message: "Установка локального движка Ollama (winget / официальный пакет)…",
			})
			if runtime.GOOS == "windows" {
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
				cmd := exec.CommandContext(ctx, "winget", "install", "-e", "--id", "Ollama.Ollama", "--accept-package-agreements", "--accept-source-agreements", "--silent")
				_ = cmd.Run()
				cancel()
			}
			ollamaBin, ollamaRun, _ = probeOllamaStatus()
		}

		if ollamaBin && !ollamaRun {
			setAIDownloadProgress(AIDownloadProgress{
				Running: true, Stage: "installing_ollama", Model: model, Percent: 32,
				Message: "Запуск локального сервиса Ollama (127.0.0.1:11434)…",
			})
			ollamaExe := "ollama"
			if runtime.GOOS == "windows" {
				if localApp := os.Getenv("LOCALAPPDATA"); localApp != "" {
					cand := filepath.Join(localApp, "Programs", "Ollama", "ollama.exe")
					if _, err := os.Stat(cand); err == nil {
						ollamaExe = cand
					}
				}
			}
			_ = exec.Command(ollamaExe, "serve").Start()
			for i := 0; i < 12; i++ {
				time.Sleep(500 * time.Millisecond)
				_, ollamaRun, _ = probeOllamaStatus()
				if ollamaRun {
					break
				}
			}
		}

		if !ollamaRun {
			setAIDownloadProgress(AIDownloadProgress{
				Running: false, Stage: "done", Model: model, Percent: 100,
				Message: "Luma Ai Nitrogen активирован! (Встроенный режим активен; для офлайн-LLM установите Ollama с ollama.com и выполните: ollama pull " + model + ")",
			})
			return
		}

		// Pull chosen model via Ollama HTTP streaming API with real % progress!
		setAIDownloadProgress(AIDownloadProgress{
			Running: true, Stage: "pulling_model", Model: model, Percent: 40,
			Message: "Скачивание модели " + model + " (~1.9 ГБ)…",
		})
		bodyBytes, _ := json.Marshal(map[string]interface{}{"name": model, "stream": true})
		req, err := http.NewRequest(http.MethodPost, "http://127.0.0.1:11434/api/pull", bytes.NewReader(bodyBytes))
		if err != nil {
			setAIDownloadProgress(AIDownloadProgress{Running: false, Stage: "error", Model: model, Percent: 0, Message: err.Error()})
			return
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := (&http.Client{Timeout: 30 * time.Minute}).Do(req)
		if err != nil {
			setAIDownloadProgress(AIDownloadProgress{Running: false, Stage: "error", Model: model, Percent: 0, Message: "Ошибка загрузки модели: " + err.Error()})
			return
		}
		defer resp.Body.Close()

		scanner := bufio.NewScanner(resp.Body)
		scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
		for scanner.Scan() {
			var ev struct {
				Status    string `json:"status"`
				Total     int64  `json:"total"`
				Completed int64  `json:"completed"`
				Error     string `json:"error"`
			}
			if json.Unmarshal(scanner.Bytes(), &ev) == nil {
				if ev.Error != "" {
					setAIDownloadProgress(AIDownloadProgress{Running: false, Stage: "error", Model: model, Percent: 0, Message: ev.Error})
					return
				}
				pct := 45
				if ev.Total > 0 {
					pct = 40 + int(float64(ev.Completed)/float64(ev.Total)*58.0)
					if pct > 98 {
						pct = 98
					}
				}
				setAIDownloadProgress(AIDownloadProgress{
					Running: true, Stage: "pulling_model", Model: model, Percent: pct,
					Message: fmt.Sprintf("Загрузка %s: %s (%d%%)", model, ev.Status, pct),
				})
			}
		}

		setAIDownloadProgress(AIDownloadProgress{
			Running: false, Stage: "done", Model: model, Percent: 100,
			Message: fmt.Sprintf("Модель %s успешно установлена и готова к работе в Luma Ai Nitrogen!", model),
		})
	}()
}

func uninstallLumaAI(removeMemory bool, kernel *LumaKernel) map[string]interface{} {
	_, ollamaRun, models := probeOllamaStatus()
	deletedModels := 0
	if ollamaRun {
		client := &http.Client{Timeout: 10 * time.Second}
		for _, m := range models {
			payload, _ := json.Marshal(map[string]string{"name": m})
			req, err := http.NewRequest(http.MethodDelete, "http://127.0.0.1:11434/api/delete", bytes.NewReader(payload))
			if err == nil {
				req.Header.Set("Content-Type", "application/json")
				if resp, err2 := client.Do(req); err2 == nil {
					resp.Body.Close()
					deletedModels++
				}
			}
		}
	}
	if removeMemory {
		DeleteAIMemoryFact("all")
		if cfgDir, err := os.UserConfigDir(); err == nil && cfgDir != "" {
			_ = os.Remove(filepath.Join(cfgDir, "LumaOS", "LumaAiNitrogen", "luma_ai_nitrogen_memory.db"))
			_ = os.Remove(filepath.Join(cfgDir, "LumaOS", "LumaAiNitrogen", "luma_ai_nitrogen_memory.db-wal"))
			_ = os.Remove(filepath.Join(cfgDir, "LumaOS", "LumaAiNitrogen", "luma_ai_nitrogen_memory.db-shm"))
		}
	}
	cfg := loadNitrogenBrainConfig()
	cfg.Enabled = false
	saveNitrogenBrainConfig(cfg)
	if kernel != nil {
		kernel.SetAIEnabled(false)
	}
	setAIDownloadProgress(AIDownloadProgress{
		Running: false,
		Stage:   "uninstalled",
		Percent: 0,
		Message: fmt.Sprintf("Luma Ai Nitrogen отключён и удалён (удалено локальных моделей: %d). Можно скачать снова в 1 клик.", deletedModels),
	})
	return getAIManagerStatus(kernel)
}

// ---- 3. SSE Token Streaming Endpoint for Luma Ai Nitrogen ----

func writeSSEEvent(w http.ResponseWriter, flusher http.Flusher, payload interface{}) {
	b, err := json.Marshal(payload)
	if err != nil {
		return
	}
	_, _ = fmt.Fprintf(w, "data: %s\n\n", string(b))
	if flusher != nil {
		flusher.Flush()
	}
}

func proxyOpenAICompatStream(w http.ResponseWriter, flusher http.Flusher, cfg NitrogenBrainConfig, messages []map[string]string) (string, bool) {
	url := strings.TrimRight(cfg.BaseURL, "/") + "/chat/completions"
	reqBody, _ := json.Marshal(map[string]interface{}{
		"model":       cfg.ModelName,
		"messages":    messages,
		"temperature": cfg.Temperature,
		"stream":      true,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 75*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(reqBody))
	if err != nil {
		return "", false
	}
	req.Header.Set("Content-Type", "application/json")
	if cfg.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+cfg.APIKey)
	}

	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		return "", false
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return "", false
	}

	var full strings.Builder
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		dataStr := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if dataStr == "[DONE]" {
			break
		}
		var chunk struct {
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
			} `json:"choices"`
		}
		if json.Unmarshal([]byte(dataStr), &chunk) == nil && len(chunk.Choices) > 0 {
			tok := chunk.Choices[0].Delta.Content
			if tok != "" {
				full.WriteString(tok)
				writeSSEEvent(w, flusher, map[string]interface{}{"type": "token", "text": tok})
			}
		}
	}
	return full.String(), full.Len() > 0
}

func registerNitrogen163Routes(mux *http.ServeMux, kernel *LumaKernel) {
	// 1. Real Win32 Pin-Above-Chrome (HWND_TOPMOST) for pinned Luma OS windows
	mux.HandleFunc("/api/kernel/window/luma-topmost", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method == http.MethodPost {
			var req struct {
				Enabled bool `json:"enabled"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err == nil {
				active := setLumaPinnedWindowTopmost(req.Enabled)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "topmost": active})
				return
			}
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "topmost": isLumaPinnedWindowTopmost()})
	})

	// 2. Persistent Calendar Events API (shared between LumaCalendarWindow, Go Luma Ai Nitrogen & Python luma_ai_nitrogen)
	mux.HandleFunc("/api/kernel/calendar/events", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		switch r.Method {
		case http.MethodGet:
			dateFilter := r.URL.Query().Get("date")
			evs := ListKernelCalendarEvents(dateFilter)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "events": evs})
		case http.MethodPost:
			raw, _ := io.ReadAll(io.LimitReader(r.Body, 2*1024*1024))
			var bulk struct {
				SyncAll bool                  `json:"sync_all"`
				Events  []KernelCalendarEvent `json:"events"`
			}
			if json.Unmarshal(raw, &bulk) == nil && bulk.SyncAll {
				saved := ReplaceAllKernelCalendarEvents(bulk.Events)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "events": saved})
				return
			}
			var single KernelCalendarEvent
			if err := json.Unmarshal(raw, &single); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
				return
			}
			created := UpsertKernelCalendarEvent(single)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "event": created, "events": ListKernelCalendarEvents("")})
		case http.MethodDelete:
			id := strings.TrimSpace(r.URL.Query().Get("id"))
			if id == "" {
				w.WriteHeader(http.StatusBadRequest)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "missing id"})
				return
			}
			removed := DeleteKernelCalendarEvent(id)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": removed, "events": ListKernelCalendarEvents("")})
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	})

	// 3. Luma Ai Nitrogen Configuration API
	mux.HandleFunc("/api/kernel/ai/nitrogen/config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method == http.MethodPost {
			cur := loadNitrogenBrainConfig()
			_ = json.NewDecoder(r.Body).Decode(&cur)
			saved := saveNitrogenBrainConfig(cur)
			if kernel != nil {
				kernel.SetAIEnabled(saved.Enabled)
			}
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "config": saved})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "config": loadNitrogenBrainConfig()})
	})

	// 4. AI Install / Download / Uninstall Manager API (Download Ollama + Qwen 2.5 3B / Llama 3.2 3B OR Delete AI!)
	mux.HandleFunc("/api/kernel/ai/manage", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method == http.MethodPost {
			var req struct {
				Action       string `json:"action"` // install | pull_model | uninstall | enable
				Model        string `json:"model"`
				RemoveMemory bool   `json:"remove_memory"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
				return
			}
			switch strings.ToLower(strings.TrimSpace(req.Action)) {
			case "install", "pull_model", "download":
				startAsyncAIInstall(req.Model, kernel)
				_ = json.NewEncoder(w).Encode(getAIManagerStatus(kernel))
				return
			case "uninstall", "delete", "remove":
				_ = json.NewEncoder(w).Encode(uninstallLumaAI(req.RemoveMemory, kernel))
				return
			case "enable":
				cfg := loadNitrogenBrainConfig()
				cfg.Enabled = true
				saveNitrogenBrainConfig(cfg)
				if kernel != nil {
					kernel.SetAIEnabled(true)
				}
				_ = json.NewEncoder(w).Encode(getAIManagerStatus(kernel))
				return
			}
		}
		_ = json.NewEncoder(w).Encode(getAIManagerStatus(kernel))
	})

	// 5. Luma Ai Nitrogen True SSE Token Streaming Endpoint (Python FastAPI -> Local Ollama/OpenAI -> Built-in Engine)
	mux.HandleFunc("/api/kernel/ai/nitrogen/stream", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Message      string `json:"message"`
			SessionID    string `json:"session_id"`
			ExtraContext string `json:"extra_context"`
			BaseURL      string `json:"base_url"`
			APIKey       string `json:"api_key"`
			ModelName    string `json:"model_name"`
			Messages     []struct {
				Role    string `json:"role"`
				Content string `json:"content"`
			} `json:"messages"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		userMsg := strings.TrimSpace(req.Message)
		if userMsg == "" && len(req.Messages) > 0 {
			userMsg = strings.TrimSpace(req.Messages[len(req.Messages)-1].Content)
		}

		w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		flusher, _ := w.(http.Flusher)

		cfg := loadNitrogenBrainConfig()
		if !cfg.Enabled || (kernel != nil && !kernel.IsAIEnabled()) {
			writeSSEEvent(w, flusher, map[string]interface{}{
				"type":  "token",
				"text":  "Модуль **Luma Ai Nitrogen** сейчас удалён или отключён. Нажмите **«Скачать / Включить Luma Ai Nitrogen»** в верхней панели или в Настройках.",
				"model": "disabled",
			})
			writeSSEEvent(w, flusher, map[string]interface{}{"type": "done", "model": "disabled"})
			return
		}
		if strings.TrimSpace(req.BaseURL) != "" {
			cfg.BaseURL = strings.TrimSpace(req.BaseURL)
		}
		if strings.TrimSpace(req.APIKey) != "" {
			cfg.APIKey = strings.TrimSpace(req.APIKey)
		}
		if strings.TrimSpace(req.ModelName) != "" {
			cfg.ModelName = strings.TrimSpace(req.ModelName)
		}

		// Step A: Direct Calendar Tool execution (instant, deterministic, syncs UI immediately!)
		if handled, calReply, _, uiAct := tryHandleCalendarIntent(userMsg); handled {
			writeSSEEvent(w, flusher, map[string]interface{}{"type": "meta", "model": "Luma Ai Nitrogen · Calendar Tool", "engine": "calendar"})
			words := strings.Split(calReply, " ")
			for i, wd := range words {
				tok := wd
				if i < len(words)-1 {
					tok += " "
				}
				writeSSEEvent(w, flusher, map[string]interface{}{"type": "token", "text": tok})
			}
			uiActs := []interface{}{}
			if uiAct != nil {
				uiActs = append(uiActs, uiAct)
			}
			writeSSEEvent(w, flusher, map[string]interface{}{"type": "done", "model": "Luma Ai Nitrogen", "ui_actions": uiActs})
			return
		}

		// Step B: If Python luma_ai_nitrogen FastAPI server is running on :49225 -> proxy its SSE stream transparently!
		if probePythonNitrogenServer(cfg.PythonServerURL) {
			pyPayload, _ := json.Marshal(map[string]interface{}{
				"message":       userMsg,
				"session_id":    req.SessionID,
				"extra_context": req.ExtraContext,
			})
			pyReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost, strings.TrimRight(cfg.PythonServerURL, "/")+"/api/chat/stream", bytes.NewReader(pyPayload))
			if err == nil {
				pyReq.Header.Set("Content-Type", "application/json")
				if pyResp, err2 := (&http.Client{Timeout: 90 * time.Second}).Do(pyReq); err2 == nil && pyResp.StatusCode == http.StatusOK {
					defer pyResp.Body.Close()
					writeSSEEvent(w, flusher, map[string]interface{}{"type": "meta", "model": cfg.ModelName + " (Python FastAPI)", "engine": "python_nitrogen"})
					sc := bufio.NewScanner(pyResp.Body)
					sc.Buffer(make([]byte, 0, 64*1024), 1024*1024)
					for sc.Scan() {
						line := sc.Text()
						if strings.HasPrefix(line, "data:") {
							_, _ = fmt.Fprintf(w, "%s\n\n", line)
							if flusher != nil {
								flusher.Flush()
							}
						}
					}
					return
				}
			}
		}

		// Step C: Build 3-tier memory + Calendar + Live Telemetry system context & try direct OpenAI-compat/Ollama SSE stream!
		memSnap := GetAIMemorySnapshot()
		var sysCtx strings.Builder
		sysCtx.WriteString("Ты — Luma Ai Nitrogen, встроенный универсальный ИИ-ассистент и программист в Luma OS 1.6.3. Отвечай чётко, умно, без воды, с чистым Markdown для кода. Текущее время: " + time.Now().Format("2006-01-02 15:04") + ".\n")
		if len(memSnap.Facts) > 0 {
			sysCtx.WriteString("Долговременная память о пользователе:\n")
			for i, f := range memSnap.Facts {
				if i >= 12 {
					break
				}
				sysCtx.WriteString(fmt.Sprintf("- %s: %s\n", f.Key, f.Value))
			}
		}
		if calEvents := ListKernelCalendarEvents(""); len(calEvents) > 0 {
			sysCtx.WriteString("События в Календаре пользователя:\n")
			for i, ev := range calEvents {
				if i >= 8 {
					break
				}
				sysCtx.WriteString(fmt.Sprintf("- %s %s: %s\n", ev.Date, ev.Time, ev.Title))
			}
		}
		if req.ExtraContext != "" {
			sysCtx.WriteString("Контекст активного окна:\n" + req.ExtraContext + "\n")
		}

		llmMsgs := []map[string]string{{"role": "system", "content": sysCtx.String()}}
		for _, m := range req.Messages {
			if m.Role != "" && m.Content != "" {
				llmMsgs = append(llmMsgs, map[string]string{"role": m.Role, "content": m.Content})
			}
		}
		if len(req.Messages) == 0 && userMsg != "" {
			llmMsgs = append(llmMsgs, map[string]string{"role": "user", "content": userMsg})
		}

		if reply, ok := proxyOpenAICompatStream(w, flusher, cfg, llmMsgs); ok {
			// Background fact extraction into Luma memory
			go func(u string) {
				if strings.Contains(strings.ToLower(u), "запомни") || strings.Contains(strings.ToLower(u), "меня зовут") {
					AddAIMemoryFact("user_note", u)
				}
			}(userMsg)
			writeSSEEvent(w, flusher, map[string]interface{}{
				"type":  "done",
				"model": cfg.ModelName + " (Live Stream)",
				"reply": reply,
			})
			return
		}

		// Step D: Built-in Luma Ai Nitrogen Offline + Web Autonomous Fallback (streamed smoothly word-by-word so UI NEVER fails!)
		writeSSEEvent(w, flusher, map[string]interface{}{"type": "meta", "model": "Luma Ai Nitrogen (Встроенное ядро)", "engine": "builtin_nitrogen"})
		var history []AIChatMessage
		for _, m := range req.Messages {
			history = append(history, AIChatMessage{Role: m.Role, Content: m.Content})
		}
		if len(history) == 0 {
			history = []AIChatMessage{{Role: "user", Content: userMsg}}
		}
		res := RunLumaLocalAI(history, "auto", "balanced", kernel)

		replyText, _ := res["reply"].(string)
		if strings.TrimSpace(replyText) == "" {
			replyText = "Luma Ai Nitrogen готов к работе."
		}
		runes := []rune(replyText)
		chunkSize := 10
		for i := 0; i < len(runes); i += chunkSize {
			end := i + chunkSize
			if end > len(runes) {
				end = len(runes)
			}
			writeSSEEvent(w, flusher, map[string]interface{}{"type": "token", "text": string(runes[i:end])})
		}
		writeSSEEvent(w, flusher, map[string]interface{}{
			"type":           "done",
			"model":          "Luma Ai Nitrogen (LumaCore 1.5.3)",
			"reply":          replyText,
			"sources":        res["sources"],
			"thinking_steps": res["thinking_steps"],
			"actions":        res["actions"],
			"ui_actions":     res["ui_actions"],
		})
	})
}
