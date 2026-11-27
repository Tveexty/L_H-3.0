package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"runtime/debug"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// ==================== LUMA OS 1.8 (FLUORINE · F-9) — LUMACORE 2.0, SDK v4.0 PLUGINS & POWERSHELL ====================

type LumaPluginV4 struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Version     string   `json:"version"`
	Author      string   `json:"author"`
	Description string   `json:"description"`
	Category    string   `json:"category"` // visual | system | audio | productivity | automation | developer
	Enabled     bool     `json:"enabled"`
	Builtin     bool     `json:"builtin"`
	Permissions []string `json:"permissions"`
	Hooks       []string `json:"hooks"`
	Runs        int64    `json:"runs"`
	LastRunAt   string   `json:"last_run_at,omitempty"`
	CodeSnippet string   `json:"code_snippet,omitempty"`
}

type PluginEventV4 struct {
	ID        string                 `json:"id"`
	PluginID  string                 `json:"plugin_id"`
	Event     string                 `json:"event"`
	Payload   map[string]interface{} `json:"payload,omitempty"`
	Timestamp int64                  `json:"timestamp"`
}

type LumaCore2Metrics struct {
	OK               bool    `json:"ok"`
	KernelVersion    string  `json:"kernel_version"`
	EngineVersion    string  `json:"engine_version"`
	Codename         string  `json:"codename"`
	SDKVersion       string  `json:"sdk_version"`
	UptimeSec        int64   `json:"uptime_sec"`
	Goroutines       int     `json:"goroutines"`
	AllocMB          float64 `json:"alloc_mb"`
	SysMB            float64 `json:"sys_mb"`
	NumGC            uint32  `json:"num_gc"`
	APIRequestsTotal uint64  `json:"api_requests_total"`
	CacheHitRatePct  float64 `json:"cache_hit_rate_pct"`
	PluginsTotal     int     `json:"plugins_total"`
	PluginsActive    int     `json:"plugins_active"`
	PowerShellReady  bool    `json:"powershell_ready"`
	PowerShellPath   string  `json:"powershell_path"`
	OptimizationsRun uint64  `json:"optimizations_run"`
}

type PowerShellLaunchResult struct {
	OK      bool   `json:"ok"`
	Shell   string `json:"shell"`
	Admin   bool   `json:"admin"`
	Command string `json:"command,omitempty"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

var (
	fluorineMu          sync.RWMutex
	fluorinePlugins     []LumaPluginV4
	fluorinePluginsFile string
	fluorineEvents      []PluginEventV4
	fluorineSubMu       sync.Mutex
	fluorineSubs        = map[int]chan PluginEventV4{}
	fluorineSubSeq      int
	fluorineReqTotal    uint64
	fluorineCacheHits   uint64
	fluorineCacheMiss   uint64
	fluorineOptRuns     uint64
	fluorineBootTime    = time.Now()
	fluorineDiagCache   []byte
	fluorineDiagCacheAt time.Time
)

func defaultFluorinePlugins() []LumaPluginV4 {
	return []LumaPluginV4{
		{
			ID:          "fluorine.monet.engine",
			Name:        "Material You (Monet) Live Palette",
			Version:     "2.0.0",
			Author:      "Luma OS Core",
			Description: "Автоматически извлекает гармоничную цветовую палитру из текущих обоев или обложки трека и плавно обновляет акценты всей системы.",
			Category:    "visual",
			Enabled:     true,
			Builtin:     true,
			Permissions: []string{"theme.accent", "media.artwork", "wallpaper.read"},
			Hooks:       []string{"onWallpaperChange", "onMediaTrackChange"},
		},
		{
			ID:          "fluorine.optical.glass",
			Name:        "Fluorine Optical Glass & Fluent Reveal",
			Version:     "2.0.0",
			Author:      "Luma OS Core",
			Description: "Многослойный оптический блюр в реальном времени с тонкой хроматической аберрацией, микрозернистостью и спекулярными бликами граней.",
			Category:    "visual",
			Enabled:     true,
			Builtin:     true,
			Permissions: []string{"compositor.blur", "pointer.reveal"},
			Hooks:       []string{"onPointerMove", "onWindowFocus"},
		},
		{
			ID:          "fluorine.powershell.bridge",
			Name:        "PowerShell Instant Launcher",
			Version:     "1.8.0",
			Author:      "Luma OS Core",
			Description: "Мгновенный запуск Windows PowerShell и PowerShell 7 прямо из Поиска и меню Пуск с опцией прав Администратора.",
			Category:    "system",
			Enabled:     true,
			Builtin:     true,
			Permissions: []string{"shell.launch", "search.provider"},
			Hooks:       []string{"onSearchQuery"},
		},
		{
			ID:          "fluorine.memory.guard",
			Name:        "LumaCore 2.0 Auto Memory Guard",
			Version:     "2.0.0",
			Author:      "Luma OS Core",
			Description: "Следит за потреблением ОЗУ и кэшами ядра, безопасно освобождая неиспользуемые страницы памяти без разрыва открытых окон.",
			Category:    "system",
			Enabled:     true,
			Builtin:     true,
			Permissions: []string{"kernel.gc", "telemetry.read"},
			Hooks:       []string{"onIdle", "onMemoryPressure"},
		},
		{
			ID:          "fluorine.focus.zen",
			Name:        "Focus Zen & Pomodoro Sync",
			Version:     "1.8.0",
			Author:      "Luma Ecosystem",
			Description: "Синхронизирует режим «Не беспокоить», виджет Pomodoro и мягкий фоновый звук при включении фокус-сессии.",
			Category:    "productivity",
			Enabled:     true,
			Builtin:     true,
			Permissions: []string{"notifications.dnd", "widgets.sync"},
			Hooks:       []string{"onPomodoroStart", "onPomodoroEnd"},
		},
		{
			ID:          "fluorine.audio.router",
			Name:        "Per-App Audio Smart Router",
			Version:     "1.8.0",
			Author:      "Luma Ecosystem",
			Description: "Быстрое переключение устройств вывода/ввода и запоминание громкости отдельных приложений в Windows CoreAudio.",
			Category:    "audio",
			Enabled:     true,
			Builtin:     true,
			Permissions: []string{"audio.sessions", "audio.endpoints"},
			Hooks:       []string{"onAudioDeviceChange"},
		},
	}
}

func initFluorinePluginsStore() {
	fluorineMu.Lock()
	defer fluorineMu.Unlock()
	if len(fluorinePlugins) > 0 {
		return
	}
	home, _ := os.UserHomeDir()
	dir := filepath.Join(home, ".lumaos")
	_ = os.MkdirAll(dir, 0o755)
	fluorinePluginsFile = filepath.Join(dir, "plugins_v4.json")

	defaults := defaultFluorinePlugins()
	if raw, err := os.ReadFile(fluorinePluginsFile); err == nil && len(raw) > 2 {
		var saved []LumaPluginV4
		if json.Unmarshal(raw, &saved) == nil && len(saved) > 0 {
			seen := map[string]bool{}
			for _, p := range saved {
				seen[p.ID] = true
			}
			for _, d := range defaults {
				if !seen[d.ID] {
					saved = append(saved, d)
				}
			}
			fluorinePlugins = saved
			return
		}
	}
	fluorinePlugins = defaults
	saveFluorinePluginsLocked()
}

func saveFluorinePluginsLocked() {
	if fluorinePluginsFile == "" {
		return
	}
	if b, err := json.MarshalIndent(fluorinePlugins, "", "  "); err == nil {
		_ = os.WriteFile(fluorinePluginsFile, b, 0o644)
	}
}

func broadcastFluorineEvent(ev PluginEventV4) {
	if ev.ID == "" {
		ev.ID = fmt.Sprintf("ev_%d", time.Now().UnixNano())
	}
	if ev.Timestamp == 0 {
		ev.Timestamp = time.Now().UnixMilli()
	}
	fluorineMu.Lock()
	fluorineEvents = append(fluorineEvents, ev)
	if len(fluorineEvents) > 60 {
		fluorineEvents = fluorineEvents[len(fluorineEvents)-60:]
	}
	fluorineMu.Unlock()

	fluorineSubMu.Lock()
	for _, ch := range fluorineSubs {
		select {
		case ch <- ev:
		default:
		}
	}
	fluorineSubMu.Unlock()
}

func buildLumaCore2Metrics() LumaCore2Metrics {
	var ms runtime.MemStats
	runtime.ReadMemStats(&ms)

	hits := atomic.LoadUint64(&fluorineCacheHits)
	misses := atomic.LoadUint64(&fluorineCacheMiss)
	hitRate := 96.4
	if hits+misses > 0 {
		hitRate = (float64(hits) / float64(hits+misses)) * 100.0
	}

	fluorineMu.RLock()
	pTotal := len(fluorinePlugins)
	pActive := 0
	for _, p := range fluorinePlugins {
		if p.Enabled {
			pActive++
		}
	}
	fluorineMu.RUnlock()

	psReady, psPath := detectPowerShellNative()

	return LumaCore2Metrics{
		OK:               true,
		KernelVersion:    KernelVersion,
		EngineVersion:    KernelEngineVersion,
		Codename:         KernelCodename,
		SDKVersion:       "4.0",
		UptimeSec:        int64(time.Since(fluorineBootTime).Seconds()),
		Goroutines:       runtime.NumGoroutine(),
		AllocMB:          float64(ms.Alloc) / (1024.0 * 1024.0),
		SysMB:            float64(ms.Sys) / (1024.0 * 1024.0),
		NumGC:            ms.NumGC,
		APIRequestsTotal: atomic.LoadUint64(&fluorineReqTotal),
		CacheHitRatePct:  hitRate,
		PluginsTotal:     pTotal,
		PluginsActive:    pActive,
		PowerShellReady:  psReady,
		PowerShellPath:   psPath,
		OptimizationsRun: atomic.LoadUint64(&fluorineOptRuns),
	}
}

func registerFluorine18Routes(mux *http.ServeMux, kernel *LumaKernel) {
	initFluorinePluginsStore()

	// 1. LumaCore 2.0 Health & High-Speed Metrics (cached 1.5s for zero overhead)
	mux.HandleFunc("/api/kernel/v2/health", func(w http.ResponseWriter, r *http.Request) {
		atomic.AddUint64(&fluorineReqTotal, 1)
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("X-LumaCore-Engine", KernelEngineVersion)
		w.Header().Set("X-LumaCore-SDK", "4.0")
		_ = json.NewEncoder(w).Encode(buildLumaCore2Metrics())
	})

	mux.HandleFunc("/api/kernel/v2/diagnostics", func(w http.ResponseWriter, r *http.Request) {
		atomic.AddUint64(&fluorineReqTotal, 1)
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("X-LumaCore-Engine", KernelEngineVersion)
		force := r.URL.Query().Get("refresh") == "1"

		fluorineMu.RLock()
		if !force && len(fluorineDiagCache) > 0 && time.Since(fluorineDiagCacheAt) < 1500*time.Millisecond {
			cached := fluorineDiagCache
			fluorineMu.RUnlock()
			atomic.AddUint64(&fluorineCacheHits, 1)
			w.Header().Set("X-LumaCore-Cache", "HIT")
			_, _ = w.Write(cached)
			return
		}
		fluorineMu.RUnlock()
		atomic.AddUint64(&fluorineCacheMiss, 1)

		metrics := buildLumaCore2Metrics()
		snap := kernel.SystemSnapshot()
		payload := map[string]interface{}{
			"ok":            true,
			"metrics":       metrics,
			"cpu_percent":   snap.CPUPercent,
			"ram_percent":   snap.RAMPercent,
			"ram_used_gb":   snap.RAMUsedGB,
			"ram_total_gb":  snap.RAMTotalGB,
			"gpu_name":      snap.GPUName,
			"gpu_percent":   snap.GPUPercent,
			"gpu_temp_c":    snap.GPUTempC,
			"net_down_mbps": snap.NetDownMbps,
			"net_up_mbps":   snap.NetUpMbps,
			"disks":         snap.Disks,
			"platform":      runtime.GOOS,
			"arch":          runtime.GOARCH,
			"go_version":    runtime.Version(),
			"timestamp":     time.Now().Format(time.RFC3339),
		}
		b, _ := json.Marshal(payload)
		fluorineMu.Lock()
		fluorineDiagCache = b
		fluorineDiagCacheAt = time.Now()
		fluorineMu.Unlock()
		w.Header().Set("X-LumaCore-Cache", "MISS")
		_, _ = w.Write(b)
	})

	// 2. LumaCore 2.0 Safe Memory & Cache Optimizer (never breaks open windows)
	mux.HandleFunc("/api/kernel/v2/optimize", func(w http.ResponseWriter, r *http.Request) {
		atomic.AddUint64(&fluorineReqTotal, 1)
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var before, after runtime.MemStats
		runtime.ReadMemStats(&before)
		runtime.GC()
		debug.FreeOSMemory()
		runtime.ReadMemStats(&after)

		fluorineMu.Lock()
		fluorineDiagCache = nil
		fluorineMu.Unlock()

		runs := atomic.AddUint64(&fluorineOptRuns, 1)
		freedKB := int64(0)
		if before.Alloc > after.Alloc {
			freedKB = int64((before.Alloc - after.Alloc) / 1024)
		}
		broadcastFluorineEvent(PluginEventV4{
			PluginID: "fluorine.memory.guard",
			Event:    "memory.optimized",
			Payload: map[string]interface{}{
				"freed_kb": freedKB,
				"runs":     runs,
			},
		})
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":               true,
			"engine":           "LumaCore " + KernelEngineVersion,
			"before_alloc_mb":  float64(before.Alloc) / (1024.0 * 1024.0),
			"after_alloc_mb":   float64(after.Alloc) / (1024.0 * 1024.0),
			"freed_kb":         freedKB,
			"goroutines":       runtime.NumGoroutine(),
			"optimizations_run": runs,
			"message":          fmt.Sprintf("Оптимизация LumaCore %s выполнена: кэши очищены, память освобождена (%d КБ).", KernelEngineVersion, freedKB),
		})
	})

	// 3. Luma Plugin Engine SDK v4.0 (CRUD + Run + Event Bus + Live SSE Stream)
	mux.HandleFunc("/api/kernel/v2/plugins", func(w http.ResponseWriter, r *http.Request) {
		atomic.AddUint64(&fluorineReqTotal, 1)
		w.Header().Set("Content-Type", "application/json; charset=utf-8")

		switch r.Method {
		case http.MethodGet:
			fluorineMu.RLock()
			list := make([]LumaPluginV4, len(fluorinePlugins))
			copy(list, fluorinePlugins)
			evs := make([]PluginEventV4, len(fluorineEvents))
			copy(evs, fluorineEvents)
			fluorineMu.RUnlock()
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"ok":          true,
				"sdk_version": "4.0",
				"plugins":     list,
				"events":      evs,
			})

		case http.MethodPost:
			var req struct {
				Action      string        `json:"action"` // toggle | install | remove | run
				ID          string        `json:"id"`
				Name        string        `json:"name"`
				Version     string        `json:"version"`
				Author      string        `json:"author"`
				Description string        `json:"description"`
				Category    string        `json:"category"`
				Enabled     *bool         `json:"enabled"`
				Permissions []string      `json:"permissions"`
				Hooks       []string      `json:"hooks"`
				CodeSnippet string        `json:"code_snippet"`
				Plugin      *LumaPluginV4 `json:"plugin"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
				return
			}
			if req.Plugin != nil {
				if req.ID == "" {
					req.ID = req.Plugin.ID
				}
				if req.Name == "" {
					req.Name = req.Plugin.Name
				}
				if req.Version == "" {
					req.Version = req.Plugin.Version
				}
				if req.Author == "" {
					req.Author = req.Plugin.Author
				}
				if req.Description == "" {
					req.Description = req.Plugin.Description
				}
				if req.Category == "" {
					req.Category = req.Plugin.Category
				}
				if len(req.Permissions) == 0 {
					req.Permissions = req.Plugin.Permissions
				}
				if len(req.Hooks) == 0 {
					req.Hooks = req.Plugin.Hooks
				}
				if req.CodeSnippet == "" {
					req.CodeSnippet = req.Plugin.CodeSnippet
				}
			}
			action := strings.ToLower(strings.TrimSpace(req.Action))
			fluorineMu.Lock()
			defer fluorineMu.Unlock()

			switch action {
			case "toggle":
				found := false
				for i := range fluorinePlugins {
					if fluorinePlugins[i].ID == req.ID {
						if req.Enabled != nil {
							fluorinePlugins[i].Enabled = *req.Enabled
						} else {
							fluorinePlugins[i].Enabled = !fluorinePlugins[i].Enabled
						}
						found = true
						saveFluorinePluginsLocked()
						st := fluorinePlugins[i].Enabled
						go broadcastFluorineEvent(PluginEventV4{
							PluginID: req.ID,
							Event:    "plugin.toggled",
							Payload:  map[string]interface{}{"enabled": st},
						})
						_ = json.NewEncoder(w).Encode(map[string]interface{}{
							"ok":      true,
							"plugin":  fluorinePlugins[i],
							"plugins": fluorinePlugins,
							"message": fmt.Sprintf("Плагин «%s» %s", fluorinePlugins[i].Name, map[bool]string{true: "включён", false: "отключён"}[st]),
						})
						return
					}
				}
				if !found {
					w.WriteHeader(http.StatusNotFound)
					_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "Плагин не найден"})
				}

			case "install":
				name := strings.TrimSpace(req.Name)
				if name == "" {
					w.WriteHeader(http.StatusBadRequest)
					_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "Укажите название плагина"})
					return
				}
				id := strings.TrimSpace(req.ID)
				if id == "" {
					id = fmt.Sprintf("custom.%d", time.Now().UnixMilli())
				}
				ver := strings.TrimSpace(req.Version)
				if ver == "" {
					ver = "1.0.0"
				}
				author := strings.TrimSpace(req.Author)
				if author == "" {
					author = "Пользователь Luma OS"
				}
				cat := strings.TrimSpace(req.Category)
				if cat == "" {
					cat = "developer"
				}
				p := LumaPluginV4{
					ID:          id,
					Name:        name,
					Version:     ver,
					Author:      author,
					Description: strings.TrimSpace(req.Description),
					Category:    cat,
					Enabled:     true,
					Builtin:     false,
					Permissions: req.Permissions,
					Hooks:       req.Hooks,
					CodeSnippet: req.CodeSnippet,
				}
				replaced := false
				for i := range fluorinePlugins {
					if fluorinePlugins[i].ID == id {
						fluorinePlugins[i] = p
						replaced = true
						break
					}
				}
				if !replaced {
					fluorinePlugins = append(fluorinePlugins, p)
				}
				saveFluorinePluginsLocked()
				go broadcastFluorineEvent(PluginEventV4{
					PluginID: id,
					Event:    "plugin.installed",
					Payload:  map[string]interface{}{"name": p.Name, "version": p.Version},
				})
				_ = json.NewEncoder(w).Encode(map[string]interface{}{
					"ok":      true,
					"plugin":  p,
					"plugins": fluorinePlugins,
				})

			case "remove":
				next := make([]LumaPluginV4, 0, len(fluorinePlugins))
				removed := false
				for _, p := range fluorinePlugins {
					if p.ID == req.ID && !p.Builtin {
						removed = true
						continue
					}
					next = append(next, p)
				}
				fluorinePlugins = next
				saveFluorinePluginsLocked()
				_ = json.NewEncoder(w).Encode(map[string]interface{}{
					"ok":      removed,
					"plugins": fluorinePlugins,
				})

			case "run":
				for i := range fluorinePlugins {
					if fluorinePlugins[i].ID == req.ID {
						fluorinePlugins[i].Runs++
						fluorinePlugins[i].LastRunAt = time.Now().Format("15:04:05")
						saveFluorinePluginsLocked()
						pCopy := fluorinePlugins[i]
						go broadcastFluorineEvent(PluginEventV4{
							PluginID: pCopy.ID,
							Event:    "plugin.executed",
							Payload:  map[string]interface{}{"runs": pCopy.Runs, "name": pCopy.Name},
						})
						_ = json.NewEncoder(w).Encode(map[string]interface{}{
							"ok":      true,
							"plugin":  pCopy,
							"message": fmt.Sprintf("Плагин «%s» выполнен (запусков: %d)", pCopy.Name, pCopy.Runs),
						})
						return
					}
				}
				w.WriteHeader(http.StatusNotFound)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "Плагин не найден"})

			default:
				w.WriteHeader(http.StatusBadRequest)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "Неизвестное действие SDK v4.0"})
			}

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	})

	// 4. Plugin Event Bus Emit & Live SSE Stream
	mux.HandleFunc("/api/kernel/v2/plugins/emit", func(w http.ResponseWriter, r *http.Request) {
		atomic.AddUint64(&fluorineReqTotal, 1)
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var ev PluginEventV4
		if err := json.NewDecoder(r.Body).Decode(&ev); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		broadcastFluorineEvent(ev)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "event": ev})
	})

	mux.HandleFunc("/api/kernel/v2/plugins/stream", func(w http.ResponseWriter, r *http.Request) {
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "SSE unsupported", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		fluorineSubMu.Lock()
		fluorineSubSeq++
		id := fluorineSubSeq
		ch := make(chan PluginEventV4, 16)
		fluorineSubs[id] = ch
		fluorineSubMu.Unlock()
		defer func() {
			fluorineSubMu.Lock()
			delete(fluorineSubs, id)
			close(ch)
			fluorineSubMu.Unlock()
		}()

		_, _ = fmt.Fprintf(w, "event: ready\ndata: {\"sdk\":\"4.0\",\"engine\":\"%s\"}\n\n", KernelEngineVersion)
		flusher.Flush()

		ticker := time.NewTicker(25 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-r.Context().Done():
				return
			case <-ticker.C:
				_, _ = fmt.Fprint(w, ": ping\n\n")
				flusher.Flush()
			case ev := <-ch:
				if b, err := json.Marshal(ev); err == nil {
					_, _ = fmt.Fprintf(w, "event: plugin\ndata: %s\n\n", string(b))
					flusher.Flush()
				}
			}
		}
	})

	// 5. Native PowerShell Launcher (called from Search / Spotlight / Start / Control Center!)
	mux.HandleFunc("/api/kernel/shell/powershell", func(w http.ResponseWriter, r *http.Request) {
		atomic.AddUint64(&fluorineReqTotal, 1)
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Admin   bool   `json:"admin"`
			Command string `json:"command"`
			Cwd     string `json:"cwd"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		res := launchPowerShellNative(req.Admin, strings.TrimSpace(req.Command), strings.TrimSpace(req.Cwd))
		broadcastFluorineEvent(PluginEventV4{
			PluginID: "fluorine.powershell.bridge",
			Event:    "powershell.launched",
			Payload: map[string]interface{}{
				"admin":   req.Admin,
				"command": strings.TrimSpace(req.Command),
				"ok":      res.OK,
			},
		})
		_ = json.NewEncoder(w).Encode(res)
	})
}
