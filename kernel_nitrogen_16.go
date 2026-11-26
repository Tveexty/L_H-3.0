package main

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// ==================== LUMA OS 1.6 NITROGEN: DEV HUD METRICS, SMART DOCK (STEAM/BROWSER/LUMA), QUICK LOOK & ROUTES ====================

// ---- 1. Developer Mode Live IPC/HTTP Telemetry Ring Buffer ----

type DevRequestLog struct {
	ID         uint64 `json:"id"`
	Time       string `json:"time"`
	Method     string `json:"method"`
	Path       string `json:"path"`
	Status     int    `json:"status"`
	DurationMs int64  `json:"duration_ms"`
}

var (
	devReqSeq       uint64
	devReqLogMu     sync.Mutex
	devReqLogs      = make([]DevRequestLog, 0, 48)
	devActiveRoutes = 110
)

type devStatusWriter struct {
	http.ResponseWriter
	status int
}

func (d *devStatusWriter) WriteHeader(code int) {
	d.status = code
	d.ResponseWriter.WriteHeader(code)
}

// Flush forwards http.Flusher so real-time SSE streams (HarmonyOS Transfer Wave,
// Circle to Search Vision, Luma Ai Nitrogen, Precision Touchpad HID) flush immediately!
func (d *devStatusWriter) Flush() {
	if f, ok := d.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// Unwrap supports http.ResponseController (Go 1.20+) for streaming endpoints.
func (d *devStatusWriter) Unwrap() http.ResponseWriter {
	return d.ResponseWriter
}

func wrapWithDevMetrics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/api/") {
			next.ServeHTTP(w, r)
			return
		}
		// Skip recording self-polling dev metrics to avoid noise in the inspector
		skipLog := r.URL.Path == "/api/kernel/dev/metrics"
		t0 := time.Now()
		sw := &devStatusWriter{ResponseWriter: w, status: 200}
		next.ServeHTTP(sw, r)
		seq := atomic.AddUint64(&devReqSeq, 1)
		if !skipLog {
			entry := DevRequestLog{
				ID:         seq,
				Time:       time.Now().Format("15:04:05.000"),
				Method:     r.Method,
				Path:       r.URL.Path,
				Status:     sw.status,
				DurationMs: time.Since(t0).Milliseconds(),
			}
			devReqLogMu.Lock()
			devReqLogs = append([]DevRequestLog{entry}, devReqLogs...)
			if len(devReqLogs) > 45 {
				devReqLogs = devReqLogs[:45]
			}
			devReqLogMu.Unlock()
		}
	})
}

func getDevMetricsSnapshot(kernel *LumaKernel) map[string]interface{} {
	var ms runtime.MemStats
	runtime.ReadMemStats(&ms)
	devReqLogMu.Lock()
	logs := append([]DevRequestLog{}, devReqLogs...)
	devReqLogMu.Unlock()

	var rpcReqs uint64
	uptimeSec := int64(0)
	if kernel != nil {
		kernel.mu.RLock()
		rpcReqs = kernel.rpcRequests
		uptimeSec = int64(time.Since(kernel.bootTime).Seconds())
		kernel.mu.RUnlock()
	}
	admin := getAdminStatus()
	return map[string]interface{}{
		"ok":                    true,
		"kernel_version":        KernelVersion,
		"kernel_codename":       KernelCodename,
		"kernel_engine_version": KernelEngineVersion,
		"security_core_version": SecurityCoreVersion,
		"goroutines":            runtime.NumGoroutine(),
		"heap_alloc_mb":         math.Round(float64(ms.HeapAlloc)/(1024*1024)*100) / 100,
		"heap_sys_mb":           math.Round(float64(ms.HeapSys)/(1024*1024)*100) / 100,
		"sys_mb":                math.Round(float64(ms.Sys)/(1024*1024)*100) / 100,
		"gc_cycles":             ms.NumGC,
		"last_gc_pause_us":      ms.PauseNs[(ms.NumGC+255)%256] / 1000,
		"ipc_requests_total":    rpcReqs,
		"http_requests_total":   atomic.LoadUint64(&devReqSeq),
		"uptime_sec":            uptimeSec,
		"active_routes_count":   devActiveRoutes,
		"is_admin":              admin.IsAdmin,
		"integrity_level":       admin.IntegrityLevel,
		"pid":                   os.Getpid(),
		"platform":              runtime.GOOS + "/" + runtime.GOARCH,
		"recent_ipc_logs":       logs,
	}
}

// ---- 2. Smart Dock: Steam libraryfolders.vdf + appmanifest_*.acf, Browser Downloads, Internal Luma Tasks, Folder Stacks & Messenger Badges ----

type DockProgressTask struct {
	ID         string  `json:"id"`
	AppKey     string  `json:"app_key"`    // steam | chrome | edge | firefox | opera | luma_updater | luma_security | luma_uninstaller | cut_studio | explorer
	AppName    string  `json:"app_name"`
	Title      string  `json:"title"`
	Source     string  `json:"source"`     // steam | browser | luma
	State      string  `json:"state"`      // active | extracting | paused | error | done
	Percent    float64 `json:"percent"`    // 0..100
	BytesDone  int64   `json:"bytes_done"`
	BytesTotal int64   `json:"bytes_total"`
	SpeedMBs   float64 `json:"speed_mb_s"`
	Detail     string  `json:"detail,omitempty"`
	UpdatedAt  int64   `json:"updated_at"`
}

type DockFolderStackConfig struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Path     string `json:"path"`
	ViewMode string `json:"view_mode"` // fan | grid
	Color    string `json:"color"`
}

type DockStackFileItem struct {
	Name     string `json:"name"`
	Path     string `json:"path"`
	IsDir    bool   `json:"is_dir"`
	Size     int64  `json:"size"`
	Ext      string `json:"ext"`
	ModTime  string `json:"mod_time"`
	ThumbURL string `json:"thumb_url,omitempty"`
}

var (
	dockTasksMu       sync.RWMutex
	dockInternalTasks = map[string]DockProgressTask{}

	browserPrevMu    sync.Mutex
	browserPrevBytes = map[string]struct {
		bytes int64
		at    time.Time
		stuck int
	}{}

	vdfPathRe = regexp.MustCompile(`(?i)"path"\s+"([^"]+)"`)
	acfKVRe   = regexp.MustCompile(`"([A-Za-z0-9_]+)"\s+"([^"]*)"`)
)

func UpsertLumaDockTask(task DockProgressTask) {
	if strings.TrimSpace(task.ID) == "" {
		task.ID = fmt.Sprintf("luma_task_%d", time.Now().UnixNano())
	}
	if task.Source == "" {
		task.Source = "luma"
	}
	if task.State == "" {
		task.State = "active"
	}
	if task.Percent < 0 {
		task.Percent = 0
	}
	if task.Percent > 100 {
		task.Percent = 100
	}
	task.UpdatedAt = time.Now().UnixMilli()
	dockTasksMu.Lock()
	if task.State == "done" || task.State == "remove" {
		delete(dockInternalTasks, task.ID)
	} else {
		dockInternalTasks[task.ID] = task
	}
	dockTasksMu.Unlock()
}

// discoverSteamLibraries parses real Steam libraryfolders.vdf files to locate ALL Steam game library directories.
func discoverSteamLibraries(extraDirs ...string) []string {
	candidates := []string{}
	for _, ed := range extraDirs {
		if strings.TrimSpace(ed) != "" {
			candidates = append(candidates, strings.TrimSpace(ed))
		}
	}
	// Also check custom override path if set via env (useful for testing & portable Steam)
	if custom := strings.TrimSpace(os.Getenv("LUMA_STEAM_DIR")); custom != "" {
		candidates = append(candidates, custom)
	}
	home, _ := os.UserHomeDir()
	if runtime.GOOS == "windows" {
		for _, pf := range []string{os.Getenv("ProgramFiles(x86)"), os.Getenv("ProgramFiles"), `C:\Program Files (x86)`, `C:\Program Files`, `D:\Steam`, `E:\Steam`} {
			if pf != "" {
				candidates = append(candidates, filepath.Join(pf, "Steam"), pf)
			}
		}
	} else if home != "" {
		candidates = append(candidates,
			filepath.Join(home, ".steam", "steam"),
			filepath.Join(home, ".local", "share", "Steam"),
			filepath.Join(home, "Steam"),
		)
	}

	libs := make([]string, 0, 6)
	seen := map[string]bool{}
	addLib := func(dir string) {
		clean := filepath.Clean(strings.TrimSpace(dir))
		if clean == "" {
			return
		}
		sa := clean
		if strings.ToLower(filepath.Base(sa)) != "steamapps" {
			sa = filepath.Join(clean, "steamapps")
		}
		key := strings.ToLower(sa)
		if seen[key] {
			return
		}
		if st, err := os.Stat(sa); err == nil && st.IsDir() {
			seen[key] = true
			libs = append(libs, sa)
		}
	}

	for _, base := range candidates {
		addLib(base)
		vdfPaths := []string{
			filepath.Join(base, "steamapps", "libraryfolders.vdf"),
			filepath.Join(base, "config", "libraryfolders.vdf"),
			filepath.Join(base, "libraryfolders.vdf"),
		}
		for _, vp := range vdfPaths {
			raw, err := os.ReadFile(vp)
			if err != nil {
				continue
			}
			for _, m := range vdfPathRe.FindAllStringSubmatch(string(raw), -1) {
				if len(m) >= 2 {
					p := strings.ReplaceAll(m[1], `\\`, `\`)
					addLib(p)
				}
			}
		}
	}
	return libs
}

// parseSteamACFManifests parses all real appmanifest_*.acf files in Steam libraries to detect active downloads,
// unpacking/staging, paused updates, or errors directly on the Steam Dock icon!
func parseSteamACFManifests(extraDirs ...string) []DockProgressTask {
	libs := discoverSteamLibraries(extraDirs...)
	tasks := make([]DockProgressTask, 0, 4)
	seenApp := map[string]bool{}

	for _, saDir := range libs {
		matches, err := filepath.Glob(filepath.Join(saDir, "appmanifest_*.acf"))
		if err != nil {
			continue
		}
		for _, mf := range matches {
			raw, err2 := os.ReadFile(mf)
			if err2 != nil {
				continue
			}
			kv := map[string]string{}
			for _, m := range acfKVRe.FindAllStringSubmatch(string(raw), -1) {
				if len(m) >= 3 {
					kv[strings.ToLower(m[1])] = m[2]
				}
			}
			appID := kv["appid"]
			if appID == "" || seenApp[appID] {
				continue
			}
			stateFlags, _ := strconv.Atoi(kv["stateflags"])
			bytesToDL, _ := strconv.ParseInt(kv["bytestodownload"], 10, 64)
			bytesDL, _ := strconv.ParseInt(kv["bytesdownloaded"], 10, 64)
			bytesToStage, _ := strconv.ParseInt(kv["bytestostage"], 10, 64)
			bytesStaged, _ := strconv.ParseInt(kv["bytesstaged"], 10, 64)

			// StateFlags == 4 alone means Fully Installed & idle — skip!
			// Also skip idle update-queued (StateFlags=2) manifests with 0 bytes scheduled so ghost "0%" pills never appear!
			isDownloading := (stateFlags&1024) != 0 && (bytesToDL > 0 && bytesDL < bytesToDL)
			if !isDownloading && bytesToDL > 0 && bytesDL < bytesToDL && (stateFlags&4) == 0 {
				isDownloading = true
			}
			isStaging := ((stateFlags&2048) != 0 || (stateFlags&65536) != 0 || (stateFlags&16) != 0) && (bytesToStage > 0 || bytesToDL > 0)
			if !isStaging && bytesToStage > 0 && bytesStaged < bytesToStage {
				isStaging = true
			}
			isPaused := (stateFlags&512) != 0 && (bytesToDL > 0 || bytesToStage > 0)
			isErr := (stateFlags & 32768) != 0

			if !isDownloading && !isStaging && !isPaused && !isErr {
				continue
			}
			seenApp[appID] = true
			name := kv["name"]
			if name == "" {
				name = "Steam App #" + appID
			}

			state := "active"
			detail := "Загрузка Steam"
			var pct float64
			var done, total int64

			if bytesToDL > 0 {
				done, total = bytesDL, bytesToDL
				pct = (float64(bytesDL) / float64(bytesToDL)) * 100.0
			}
			if isStaging && (bytesToDL == 0 || bytesDL >= bytesToDL) {
				state = "extracting"
				detail = "Распаковка / установка файлов"
				if bytesToStage > 0 {
					done, total = bytesStaged, bytesToStage
					pct = (float64(bytesStaged) / float64(bytesToStage)) * 100.0
				}
			}
			if isPaused {
				state = "paused"
				detail = "Загрузка приостановлена"
			}
			if (stateFlags & 32768) != 0 {
				state = "error"
				detail = "Ошибка проверки / диска Steam"
			}
			if pct < 0 {
				pct = 0
			}
			if pct > 100 {
				pct = 100
			}

			tasks = append(tasks, DockProgressTask{
				ID:         "steam_" + appID,
				AppKey:     "steam",
				AppName:    "Steam",
				Title:      name,
				Source:     "steam",
				State:      state,
				Percent:    math.Round(pct*10) / 10,
				BytesDone:  done,
				BytesTotal: total,
				Detail:     detail,
				UpdatedAt:  time.Now().UnixMilli(),
			})
		}
	}
	return tasks
}

// scanBrowserPartialDownloads detects active browser, torrent, Telegram, and direct downloads in real time.
func scanBrowserPartialDownloads(extraDirs ...string) []DockProgressTask {
	dirs := []string{}
	seenDirs := map[string]bool{}
	addDir := func(d string) {
		clean := filepath.Clean(strings.TrimSpace(d))
		if clean == "" || clean == "." {
			return
		}
		key := strings.ToLower(clean)
		if seenDirs[key] {
			return
		}
		if st, err := os.Stat(clean); err == nil && st.IsDir() {
			seenDirs[key] = true
			dirs = append(dirs, clean)
		}
	}
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		addDir(filepath.Join(home, "Downloads"))
		addDir(filepath.Join(home, "Downloads", "Telegram Desktop"))
		addDir(filepath.Join(home, "Desktop"))
	}
	if up := strings.TrimSpace(os.Getenv("USERPROFILE")); up != "" {
		addDir(filepath.Join(up, "Downloads"))
		addDir(filepath.Join(up, "Downloads", "Telegram Desktop"))
	}
	for _, d := range extraDirs {
		addDir(d)
	}

	now := time.Now()
	tasks := make([]DockProgressTask, 0, 6)
	seenFile := map[string]bool{}

	browserPrevMu.Lock()
	defer browserPrevMu.Unlock()

	for _, dir := range dirs {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		isDesktop := strings.EqualFold(filepath.Base(dir), "desktop")
		isTelegramDir := strings.Contains(strings.ToLower(dir), "telegram")
		for _, e := range entries {
			if e.IsDir() || strings.HasPrefix(e.Name(), ".") || strings.HasPrefix(e.Name(), "~$") {
				continue
			}
			fullPath := filepath.Join(dir, e.Name())
			lowFull := strings.ToLower(fullPath)
			if seenFile[lowFull] {
				continue
			}
			seenFile[lowFull] = true

			info, err2 := e.Info()
			if err2 != nil || info == nil {
				continue
			}
			lower := strings.ToLower(e.Name())
			appKey, appName, ext, detail := "", "", "", "Загрузка файла"
			isKnownPartial := false

			switch {
			case strings.HasSuffix(lower, ".crdownload"):
				appKey, appName, ext, detail, isKnownPartial = "chrome", "Chrome / Edge", ".crdownload", "Загрузка в браузере", true
			case strings.HasSuffix(lower, ".part"):
				appKey, appName, ext, detail, isKnownPartial = "firefox", "Firefox", ".part", "Загрузка в Firefox", true
			case strings.HasSuffix(lower, ".opdownload"):
				appKey, appName, ext, detail, isKnownPartial = "opera", "Opera", ".opdownload", "Загрузка в Opera", true
			case strings.HasSuffix(lower, ".!qb"):
				appKey, appName, ext, detail, isKnownPartial = "torrent", "qBittorrent", ".!qb", "Торрент-загрузка", true
			case strings.HasSuffix(lower, ".!ut"):
				appKey, appName, ext, detail, isKnownPartial = "torrent", "Torrent", ".!ut", "Торрент-загрузка", true
			case strings.HasSuffix(lower, ".aria2"):
				appKey, appName, ext, detail, isKnownPartial = "browser", "Загрузчик", ".aria2", "Многопоточная загрузка", true
			case strings.HasSuffix(lower, ".download"):
				appKey, appName, ext, detail, isKnownPartial = "browser", "Браузер", ".download", "Загрузка файла", true
			case strings.HasSuffix(lower, ".td") || strings.HasSuffix(lower, ".tdownload"):
				appKey, appName, ext, detail, isKnownPartial = "telegram", "Telegram", filepath.Ext(e.Name()), "Загрузка в Telegram", true
			}

			age := now.Sub(info.ModTime())
			sz := info.Size()

			if isKnownPartial {
				// Ignore abandoned stale partial files older than 2 hours or empty 0-byte placeholders
				if age > 2*time.Hour {
					continue
				}
				if sz == 0 && age > 10*time.Second {
					continue
				}
			} else {
				// Also detect ANY actively growing regular file in Downloads / Telegram Desktop (e.g. direct writes, wget, curl, Telegram, installers)
				if isDesktop || age > 12*time.Second || sz < 16*1024 {
					continue
				}
				prev, seen := browserPrevBytes[fullPath]
				if !seen {
					// Record baseline so on next poll (2s later) we know if it is genuinely growing
					browserPrevBytes[fullPath] = struct {
						bytes int64
						at    time.Time
						stuck int
					}{bytes: sz, at: now, stuck: 0}
					continue
				}
				if sz <= prev.bytes {
					// Not growing anymore — update timestamp and skip
					browserPrevBytes[fullPath] = struct {
						bytes int64
						at    time.Time
						stuck int
					}{bytes: sz, at: now, stuck: prev.stuck + 1}
					continue
				}
				appKey = "browser"
				appName = "Загрузки"
				detail = "Активное скачивание"
				if isTelegramDir {
					appKey = "telegram"
					appName = "Telegram"
					detail = "Скачивание из Telegram"
				}
			}

			prev, seen := browserPrevBytes[fullPath]
			speedMBs := 0.0
			state := "active"
			stuck := 0
			if seen {
				dt := now.Sub(prev.at).Seconds()
				if dt > 0.15 && sz > prev.bytes {
					speedMBs = (float64(sz-prev.bytes) / (1024 * 1024)) / dt
					stuck = 0
				} else if sz == prev.bytes {
					stuck = prev.stuck + 1
					if stuck >= 5 || age > 20*time.Second {
						state = "paused"
						detail = "Пауза / ожидание сети"
					}
				}
			}
			browserPrevBytes[fullPath] = struct {
				bytes int64
				at    time.Time
				stuck int
			}{bytes: sz, at: now, stuck: stuck}

			cleanName := e.Name()
			if ext != "" {
				cleanName = strings.TrimSuffix(e.Name(), ext)
				if cleanName == "" {
					cleanName = e.Name()
				}
			}
			// Since browser/direct partial files don't expose final Content-Length on disk, animate smooth logarithmic %
			pct := math.Min(96, 12+math.Log10(math.Max(1, float64(sz)/(1024*1024)+1))*38)
			tasks = append(tasks, DockProgressTask{
				ID:        "dl_" + lower,
				AppKey:    appKey,
				AppName:   appName,
				Title:     cleanName,
				Source:    "browser",
				State:     state,
				Percent:   math.Round(pct*10) / 10,
				BytesDone: sz,
				SpeedMBs:  math.Round(speedMBs*100) / 100,
				Detail:    detail,
				UpdatedAt: now.UnixMilli(),
			})
		}
	}
	return tasks
}

func dockStacksFilePath() string {
	cfgDir, err := os.UserConfigDir()
	if err != nil || cfgDir == "" {
		cfgDir = os.TempDir()
	}
	dir := filepath.Join(cfgDir, "LumaOS")
	_ = os.MkdirAll(dir, 0o700)
	return filepath.Join(dir, "dock_stacks.json")
}

func defaultDockStacks() []DockFolderStackConfig {
	home, _ := os.UserHomeDir()
	if home == "" {
		home = os.TempDir()
	}
	return []DockFolderStackConfig{
		{ID: "stack_downloads", Name: "Загрузки", Path: filepath.Join(home, "Downloads"), ViewMode: "fan", Color: "#38bdf8"},
		{ID: "stack_documents", Name: "Документы", Path: filepath.Join(home, "Documents"), ViewMode: "grid", Color: "#a855f7"},
		{ID: "stack_desktop", Name: "Рабочий стол", Path: filepath.Join(home, "Desktop"), ViewMode: "fan", Color: "#10b981"},
	}
}

func loadDockStacks() []DockFolderStackConfig {
	raw, err := os.ReadFile(dockStacksFilePath())
	if err == nil {
		var list []DockFolderStackConfig
		if json.Unmarshal(raw, &list) == nil && len(list) > 0 {
			return list
		}
	}
	return defaultDockStacks()
}

func saveDockStacks(list []DockFolderStackConfig) []DockFolderStackConfig {
	if raw, err := json.MarshalIndent(list, "", "  "); err == nil {
		_ = os.WriteFile(dockStacksFilePath(), raw, 0o600)
	}
	return list
}

func listDockStackItems(rawPath string) map[string]interface{} {
	dir := resolvePath(rawPath)
	entries, err := os.ReadDir(dir)
	if err != nil {
		return map[string]interface{}{"ok": false, "path": dir, "error": err.Error(), "items": []DockStackFileItem{}}
	}
	type itemWithTime struct {
		it DockStackFileItem
		mt int64
	}
	tmp := make([]itemWithTime, 0, len(entries))
	imgExts := map[string]bool{".png": true, ".jpg": true, ".jpeg": true, ".webp": true, ".gif": true, ".bmp": true, ".svg": true}
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), ".") {
			continue
		}
		info, err2 := e.Info()
		if err2 != nil || info == nil {
			continue
		}
		full := filepath.Join(dir, e.Name())
		ext := strings.ToLower(filepath.Ext(e.Name()))
		thumb := ""
		if !e.IsDir() && imgExts[ext] && info.Size() <= 20*1024*1024 {
			thumb = "/api/kernel/fs/raw?path=" + full
		}
		tmp = append(tmp, itemWithTime{
			it: DockStackFileItem{
				Name:     e.Name(),
				Path:     full,
				IsDir:    e.IsDir(),
				Size:     info.Size(),
				Ext:      ext,
				ModTime:  info.ModTime().Format("02.01 15:04"),
				ThumbURL: thumb,
			},
			mt: info.ModTime().Unix(),
		})
	}
	sort.Slice(tmp, func(i, j int) bool { return tmp[i].mt > tmp[j].mt })
	out := make([]DockStackFileItem, 0, minInt(len(tmp), 32))
	for i := 0; i < len(tmp) && i < 32; i++ {
		out = append(out, tmp[i].it)
	}
	return map[string]interface{}{
		"ok":    true,
		"path":  dir,
		"count": len(out),
		"items": out,
	}
}

func getSmartDockStatus(extraSteamDir, extraDownloadDir string, notifBridge *OSNotificationBridge) map[string]interface{} {
	tasks := make([]DockProgressTask, 0, 8)
	// 1. Real Steam VDF + ACF downloads/installations
	tasks = append(tasks, parseSteamACFManifests(extraSteamDir)...)
	// 2. Real Browser partial downloads (.crdownload / .part / .opdownload)
	tasks = append(tasks, scanBrowserPartialDownloads(extraDownloadDir)...)
	// 3. Automatic OTA updater progress if active
	up := GetUpdateProgress()
	if up.Running || up.Stage == "error" {
		st := "active"
		if up.Stage == "verifying" || up.Stage == "installing" {
			st = "extracting"
		} else if up.Stage == "error" {
			st = "error"
		}
		tasks = append(tasks, DockProgressTask{
			ID:         "luma_ota_update",
			AppKey:     "settings",
			AppName:    "Luma Update",
			Title:      "Обновление Luma OS " + up.TargetVersion,
			Source:     "luma",
			State:      st,
			Percent:    float64(up.Percent),
			BytesDone:  up.DownloadedBytes,
			BytesTotal: up.TotalBytes,
			SpeedMBs:   up.SpeedMbps,
			Detail:     up.Message,
			UpdatedAt:  time.Now().UnixMilli(),
		})
	}
	// 4. Registered internal Luma tasks
	dockTasksMu.RLock()
	for _, t := range dockInternalTasks {
		tasks = append(tasks, t)
	}
	dockTasksMu.RUnlock()

	// 5. Live messenger unread badges from real OS notification bridge
	badges := map[string]int{}
	if notifBridge != nil {
		for _, n := range notifBridge.List(0) {
			key := strings.ToLower(strings.TrimSpace(n.AppKey))
			if key == "" {
				key = strings.ToLower(strings.TrimSpace(n.App))
			}
			if key != "" {
				badges[key]++
			}
		}
	}

	return map[string]interface{}{
		"ok":         true,
		"tasks":      tasks,
		"badges":     badges,
		"stacks":     loadDockStacks(),
		"checked_at": time.Now().Format("15:04:05"),
	}
}

// ---- 3. Quick Look Rich Metadata & Preview Endpoint ----

func inspectQuickLookFile(rawPath string) map[string]interface{} {
	p := resolvePath(rawPath)
	st, err := os.Stat(p)
	if err != nil {
		return map[string]interface{}{"ok": false, "error": "Файл не найден: " + err.Error()}
	}
	name := st.Name()
	ext := strings.ToLower(filepath.Ext(name))
	sizeHuman := formatHumanBytesQuickLook(st.Size())

	if st.IsDir() {
		entries, _ := os.ReadDir(p)
		children := make([]map[string]interface{}, 0, minInt(len(entries), 30))
		for i, e := range entries {
			if i >= 30 {
				break
			}
			var sz int64
			if inf, e2 := e.Info(); e2 == nil && inf != nil {
				sz = inf.Size()
			}
			children = append(children, map[string]interface{}{
				"name":   e.Name(),
				"path":   filepath.Join(p, e.Name()),
				"is_dir": e.IsDir(),
				"size":   sz,
			})
		}
		return map[string]interface{}{
			"ok":           true,
			"kind":         "folder",
			"name":         name,
			"path":         p,
			"ext":          "",
			"is_dir":       true,
			"size":         st.Size(),
			"size_human":   fmt.Sprintf("%d объектов", len(entries)),
			"mod_time":     st.ModTime().Format("02.01.2006 15:04"),
			"dir_children": children,
		}
	}

	kind := "binary"
	lang := "plaintext"
	switch ext {
	case ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif":
		kind = "image"
	case ".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v", ".ogv":
		kind = "video"
	case ".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".opus":
		kind = "audio"
	case ".pdf":
		kind = "pdf"
	case ".md", ".markdown":
		kind = "markdown"
		lang = "markdown"
	case ".go", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".py", ".rs", ".c", ".cpp", ".h", ".cs", ".java", ".html", ".htm", ".css", ".scss", ".json", ".yaml", ".yml", ".toml", ".sql", ".sh", ".bash", ".ps1", ".bat", ".cmd", ".xml", ".php", ".rb":
		kind = "code"
		lang = strings.TrimPrefix(ext, ".")
	case ".txt", ".log", ".ini", ".cfg", ".conf", ".env", ".csv", ".tsv", ".gitignore":
		kind = "text"
		lang = "plaintext"
	}

	res := map[string]interface{}{
		"ok":         true,
		"kind":       kind,
		"language":   lang,
		"name":       name,
		"path":       p,
		"ext":        ext,
		"is_dir":     false,
		"size":       st.Size(),
		"size_human": sizeHuman,
		"mod_time":   st.ModTime().Format("02.01.2006 15:04"),
		"stream_url": "/api/kernel/fs/raw?path=" + p,
	}

	if kind == "code" || kind == "text" || kind == "markdown" {
		f, err2 := os.Open(p)
		if err2 == nil {
			defer f.Close()
			limit := int64(180 * 1024)
			data, _ := io.ReadAll(io.LimitReader(f, limit))
			txt := string(data)
			res["text_preview"] = txt
			res["lines_count"] = strings.Count(txt, "\n") + 1
			res["truncated"] = st.Size() > limit
		}
	}
	return res
}

func formatHumanBytesQuickLook(b int64) string {
	switch {
	case b >= 1024*1024*1024:
		return fmt.Sprintf("%.2f ГБ", float64(b)/(1024*1024*1024))
	case b >= 1024*1024:
		return fmt.Sprintf("%.2f МБ", float64(b)/(1024*1024))
	case b >= 1024:
		return fmt.Sprintf("%.1f КБ", float64(b)/1024)
	default:
		return fmt.Sprintf("%d Б", b)
	}
}

// ---- 4. Register ALL Luma OS 1.6 Nitrogen HTTP Routes ----

func registerNitrogen16Routes(mux *http.ServeMux, kernel *LumaKernel, notifBridge *OSNotificationBridge) {
	// Item 2: Developer Mode Live Metrics & Administrator UAC Elevation
	mux.HandleFunc("/api/kernel/dev/metrics", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_ = json.NewEncoder(w).Encode(getDevMetricsSnapshot(kernel))
	})
	mux.HandleFunc("/api/kernel/admin/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_ = json.NewEncoder(w).Encode(getAdminStatus())
	})
	mux.HandleFunc("/api/kernel/admin/elevate", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		_ = json.NewEncoder(w).Encode(restartAsAdministrator())
	})

	// Item 4: Virtual Memory (RAM Plus · 2/4/6 GB SSD-Friendly)
	mux.HandleFunc("/api/kernel/vmem/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		force := r.URL.Query().Get("refresh") == "1"
		_ = json.NewEncoder(w).Encode(getVirtualMemoryStatus(kernel, force))
	})
	mux.HandleFunc("/api/kernel/vmem/configure", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req VMemConfigureRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		_ = json.NewEncoder(w).Encode(configureVirtualMemory(req, kernel))
	})

	// Item 5: LumaShield 2.5 Scheduled Tasks & Startup Unified Audit
	mux.HandleFunc("/api/kernel/security/tasks-audit", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		tasks := kernel.security.AuditScheduledTasks()
		startup := kernel.security.AuditStartupEntries(kernel.probe.ListStartupItems())
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":              true,
			"security_core":   SecurityCoreVersion,
			"scheduled_tasks": tasks,
			"startup_entries": startup,
			"total_tasks":     len(tasks),
			"total_startup":   len(startup),
		})
	})

	// Item 6: Luma AI 4.0 Autonomous Agent & Contextual Assist APIs
	mux.HandleFunc("/api/kernel/ai/agent", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req AIChatRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		_ = json.NewEncoder(w).Encode(HandleAIChatRequest(req, kernel))
	})
	mux.HandleFunc("/api/kernel/ai/assist", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			App      string `json:"app"`
			Action   string `json:"action"`
			Content  string `json:"content"`
			Prompt   string `json:"prompt"`
			Filename string `json:"filename"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		_ = json.NewEncoder(w).Encode(HandleAI38ContextualAssist(req.App, req.Action, req.Content, req.Prompt, req.Filename, kernel))
	})

	// Item 7: Always on Top (HWND_TOPMOST / HWND_NOTOPMOST) for any external Windows window
	mux.HandleFunc("/api/kernel/windows/topmost", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method == http.MethodGet {
			_ = json.NewEncoder(w).Encode(listTopmostWindows())
			return
		}
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			PID     int    `json:"pid"`
			HWND    uint64 `json:"hwnd"`
			Topmost *bool  `json:"topmost"`
			Toggle  bool   `json:"toggle"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		_ = json.NewEncoder(w).Encode(setExternalWindowTopmost(req.PID, req.HWND, req.Topmost, req.Toggle))
	})

	// Item 8: Luma Gamepad Studio (DS4Windows Alternative)
	mux.HandleFunc("/api/kernel/gamepad/state", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_ = json.NewEncoder(w).Encode(getGamepadStudioSnapshot())
	})
	mux.HandleFunc("/api/kernel/gamepad/profiles", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		switch r.Method {
		case http.MethodGet:
			_ = json.NewEncoder(w).Encode(getGamepadStudioSnapshot())
		case http.MethodPost:
			var req struct {
				Action   string         `json:"action"` // save | select | delete
				ID       string         `json:"id"`
				Activate bool           `json:"activate"`
				Profile  GamepadProfile `json:"profile"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
				return
			}
			switch strings.ToLower(req.Action) {
			case "select":
				_ = json.NewEncoder(w).Encode(selectGamepadProfile(req.ID))
			case "delete":
				_ = json.NewEncoder(w).Encode(deleteGamepadProfile(req.ID))
			default:
				_ = json.NewEncoder(w).Encode(upsertGamepadProfile(req.Profile, req.Activate))
			}
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/api/kernel/gamepad/lightbar", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Index      int    `json:"index"`
			Hex        string `json:"hex"`
			R          uint8  `json:"r"`
			G          uint8  `json:"g"`
			B          uint8  `json:"b"`
			Brightness int    `json:"brightness"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		if req.Hex != "" {
			req.R, req.G, req.B = parseHexRGB(req.Hex)
		}
		if req.Brightness <= 0 {
			req.Brightness = 85
		}
		_ = json.NewEncoder(w).Encode(applyNativeGamepadLightbar(req.Index, req.R, req.G, req.B, req.Brightness))
	})
	mux.HandleFunc("/api/kernel/gamepad/rumble", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Index      int   `json:"index"`
			Left       uint8 `json:"left"`
			Right      uint8 `json:"right"`
			DurationMs int   `json:"duration_ms"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		_ = json.NewEncoder(w).Encode(applyNativeGamepadRumble(req.Index, req.Left, req.Right, req.DurationMs))
	})
	mux.HandleFunc("/api/kernel/gamepad/emulation", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Enabled bool `json:"enabled"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		_ = json.NewEncoder(w).Encode(setGamepadEmulationMode(req.Enabled))
	})

	// Item 9: Built-in Leftover Cleaner / Uninstaller (Revo / BCUninstaller Analog)
	mux.HandleFunc("/api/kernel/uninstaller/programs", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		progs := listInstalledUninstallPrograms()
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":       true,
			"count":    len(progs),
			"programs": progs,
		})
	})
	mux.HandleFunc("/api/kernel/uninstaller/run", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			UninstallString      string `json:"uninstall_string"`
			QuietUninstallString string `json:"quiet_uninstall_string"`
			Quiet                bool   `json:"quiet"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		_ = json.NewEncoder(w).Encode(launchProgramUninstaller(req.UninstallString, req.QuietUninstallString, req.Quiet))
	})
	mux.HandleFunc("/api/kernel/uninstaller/scan", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Name            string `json:"name"`
			Publisher       string `json:"publisher"`
			InstallLocation string `json:"install_location"`
			Mode            string `json:"mode"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		UpsertLumaDockTask(DockProgressTask{
			ID: "luma_uninstaller_scan", AppKey: "uninstaller", AppName: "Uninstaller",
			Title: "Сканирование хвостов: " + req.Name, State: "active", Percent: 50,
		})
		report := runFourStageLeftoverScan(req.Name, req.Publisher, req.InstallLocation, req.Mode)
		UpsertLumaDockTask(DockProgressTask{ID: "luma_uninstaller_scan", State: "done"})
		_ = json.NewEncoder(w).Encode(report)
	})
	mux.HandleFunc("/api/kernel/uninstaller/clean", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			ProgramName string         `json:"program_name"`
			AutoBackup  bool           `json:"auto_backup"`
			Items       []LeftoverItem `json:"items"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		_ = json.NewEncoder(w).Encode(cleanSelectedLeftovers(req.ProgramName, req.Items, req.AutoBackup))
	})
	mux.HandleFunc("/api/kernel/uninstaller/backups", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		list := listUninstallerBackups()
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "backups": list})
	})
	mux.HandleFunc("/api/kernel/uninstaller/restore", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			BackupID string `json:"backup_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		_ = json.NewEncoder(w).Encode(restoreUninstallerBackup(req.BackupID))
	})

	// Item 10: Quick Look Metadata & Code/Text Preview API
	mux.HandleFunc("/api/kernel/fs/quicklook", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		p := r.URL.Query().Get("path")
		if strings.TrimSpace(p) == "" {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "missing path"})
			return
		}
		_ = json.NewEncoder(w).Encode(inspectQuickLookFile(p))
	})

	// Item 11: Win Key Interceptor Toggle API
	mux.HandleFunc("/api/kernel/win-key/toggle", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method == http.MethodPost {
			var req struct {
				Enabled bool `json:"enabled"`
			}
			if json.NewDecoder(r.Body).Decode(&req) == nil {
				setWinKeyToLumaEnabled(req.Enabled)
			}
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":      true,
			"enabled": isWinKeyToLumaEnabled(),
		})
	})

	// Item 13: Smart Dock (Stacks, Live Messenger Badges, Steam VDF/ACF & Browser/Luma Progress Bars)
	mux.HandleFunc("/api/kernel/dock/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		extraSteam := r.URL.Query().Get("steam_dir")
		extraDL := r.URL.Query().Get("download_dir")
		_ = json.NewEncoder(w).Encode(getSmartDockStatus(extraSteam, extraDL, notifBridge))
	})
	mux.HandleFunc("/api/kernel/dock/stack", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_ = json.NewEncoder(w).Encode(listDockStackItems(r.URL.Query().Get("path")))
	})
	mux.HandleFunc("/api/kernel/dock/stacks", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method == http.MethodPost {
			var req struct {
				Stacks []DockFolderStackConfig `json:"stacks"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err == nil && len(req.Stacks) > 0 {
				saved := saveDockStacks(req.Stacks)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "stacks": saved})
				return
			}
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "stacks": loadDockStacks()})
	})
	mux.HandleFunc("/api/kernel/dock/task", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var task DockProgressTask
		if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		UpsertLumaDockTask(task)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "task": task})
	})

	// Luma OS 1.6.2: Instant Live Screen Capture for Luma Обвести для поиска (Lens) & Gesture Screenshots
	mux.HandleFunc("/api/kernel/capture/screen-now", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		b64, width, height, err := captureFullScreenPNG()
		if err != nil {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"ok":    false,
				"error": err.Error(),
			})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":           true,
			"image_base64": "data:image/png;base64," + b64,
			"width":        width,
			"height":       height,
		})
	})

	// Luma OS 1.6.2: Luma Обвести для поиска (Lens OCR + Dominant Colors + Translation + Live Web Search)
	mux.HandleFunc("/api/kernel/lens/search", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req LumaLensSearchRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		var trashRef *LumaTrashStore
		if kernel != nil {
			trashRef = kernel.trash
		}
		_ = json.NewEncoder(w).Encode(handleLumaLensSearch(req, kernel, trashRef))
	})

	// Luma OS 1.6.2: Luma AI 5.0 Nexus Persistent Memory Manager API
	mux.HandleFunc("/api/kernel/ai/memory", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		switch r.Method {
		case http.MethodPost:
			var req struct {
				Action string `json:"action"` // add | delete | clear
				ID     string `json:"id"`
				Key    string `json:"key"`
				Value  string `json:"value"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
				return
			}
			var snap AIMemoryStore
			switch strings.ToLower(strings.TrimSpace(req.Action)) {
			case "delete", "remove":
				snap = DeleteAIMemoryFact(req.ID)
			case "clear":
				snap = DeleteAIMemoryFact("all")
			default:
				snap = AddAIMemoryFact(req.Key, req.Value)
			}
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "memory": snap})
		case http.MethodDelete:
			id := strings.TrimSpace(r.URL.Query().Get("id"))
			if id == "" {
				id = "all"
			}
			snap := DeleteAIMemoryFact(id)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "memory": snap})
		default:
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "memory": GetAIMemorySnapshot()})
		}
	})

	// Luma OS 1.6.2b: 100% Native Wi-Fi & Bluetooth Picker/Connect Routes (ZERO Windows Settings!)
	registerConnectivity162bRoutes(mux, kernel)

	// Luma OS 1.6.3: Luma Ai Nitrogen SSE Streaming + Calendar Store + AI Install/Uninstall + Real Pin-Above-Chrome!
	registerNitrogen163Routes(mux, kernel)
}
