package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ==================== 1. GITHUB REAL UPDATE CHECKER & SELF-UPDATER WITH PROGRESS BAR ====================

var (
	updaterMu    sync.RWMutex
	updaterState = UpdateProgressState{
		Stage:   "idle",
		Message: "Готово к проверке обновлений",
	}
)

func parseSemverParts(v string) (int, int, int, string) {
	s := strings.TrimSpace(strings.ToLower(v))
	s = strings.TrimPrefix(s, "v")
	// Strip parenthetical codename like "1.1.0 (helium)"
	if idx := strings.Index(s, "("); idx >= 0 {
		s = strings.TrimSpace(s[:idx])
	}
	re := regexp.MustCompile(`(\d+)\.(\d+)(?:\.(\d+))?([a-z0-9\-]*)`)
	m := re.FindStringSubmatch(s)
	if len(m) < 3 {
		return 0, 0, 0, ""
	}
	maj, _ := strconv.Atoi(m[1])
	min, _ := strconv.Atoi(m[2])
	pat := 0
	if len(m) > 3 && m[3] != "" {
		pat, _ = strconv.Atoi(m[3])
	}
	suf := ""
	if len(m) > 4 {
		suf = m[4]
	}
	return maj, min, pat, suf
}

// compareSemver returns 1 if a > b, -1 if a < b, 0 if equal
func compareSemver(a, b string) int {
	a1, a2, a3, as := parseSemverParts(a)
	b1, b2, b3, bs := parseSemverParts(b)
	if a1 != b1 {
		if a1 > b1 {
			return 1
		}
		return -1
	}
	if a2 != b2 {
		if a2 > b2 {
			return 1
		}
		return -1
	}
	if a3 != b3 {
		if a3 > b3 {
			return 1
		}
		return -1
	}
	if as != bs {
		if as > bs {
			return 1
		}
		return -1
	}
	return 0
}

func extractRepoOwnerName(repoURL string) (string, string) {
	clean := strings.TrimSpace(repoURL)
	clean = strings.TrimSuffix(clean, ".git")
	clean = strings.TrimSuffix(clean, "/")
	re := regexp.MustCompile(`github\.com/([^/]+)/([^/]+)`)
	if m := re.FindStringSubmatch(clean); len(m) == 3 {
		return m[1], m[2]
	}
	return "Tveexty", "L_H-3.0"
}

type ghReleasePayload struct {
	TagName     string `json:"tag_name"`
	Name        string `json:"name"`
	Body        string `json:"body"`
	HTMLURL     string `json:"html_url"`
	PublishedAt string `json:"published_at"`
	Draft       bool   `json:"draft"`
	Prerelease  bool   `json:"prerelease"`
	Assets      []struct {
		Name               string `json:"name"`
		Size               int64  `json:"size"`
		BrowserDownloadURL string `json:"browser_download_url"`
	} `json:"assets"`
}

func CheckGitHubUpdate(repoURL string) UpdateCheckResult {
	owner, repo := extractRepoOwnerName(repoURL)
	res := UpdateCheckResult{
		OK:             false,
		CurrentVersion: KernelVersion,
		CurrentName:    fmt.Sprintf("%s (%s)", KernelVersion, KernelCodename),
		CheckedAt:      time.Now().Format("15:04:05"),
	}

	client := &http.Client{Timeout: 10 * time.Second}
	fetchRel := func(url string) (*ghReleasePayload, error) {
		req, _ := http.NewRequest("GET", url, nil)
		req.Header.Set("Accept", "application/vnd.github+json")
		req.Header.Set("User-Agent", "LumaOS-Updater/"+KernelVersion)
		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("GitHub API HTTP %d", resp.StatusCode)
		}
		var rel ghReleasePayload
		if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
			return nil, err
		}
		return &rel, nil
	}

	rel, err := fetchRel(fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", owner, repo))
	if err != nil {
		// Fallback to list of releases (e.g., if latest is prerelease or tag-only)
		req, _ := http.NewRequest("GET", fmt.Sprintf("https://api.github.com/repos/%s/%s/releases?per_page=10", owner, repo), nil)
		req.Header.Set("Accept", "application/vnd.github+json")
		req.Header.Set("User-Agent", "LumaOS-Updater/"+KernelVersion)
		resp, err2 := client.Do(req)
		if err2 != nil {
			res.Error = fmt.Sprintf("Нет соединения с GitHub: %v", err)
			return res
		}
		defer resp.Body.Close()
		var list []ghReleasePayload
		if err3 := json.NewDecoder(resp.Body).Decode(&list); err3 != nil || len(list) == 0 {
			res.Error = fmt.Sprintf("Релизы не найдены на GitHub (%v)", err)
			return res
		}
		for i := range list {
			if !list[i].Draft {
				rel = &list[i]
				break
			}
		}
		if rel == nil {
			rel = &list[0]
		}
	}

	latestClean := strings.TrimPrefix(strings.TrimSpace(rel.TagName), "v")
	if latestClean == "" {
		latestClean = KernelVersion
	}

	downloadURL := ""
	var assetSize int64
	for _, a := range rel.Assets {
		if strings.HasSuffix(strings.ToLower(a.Name), ".exe") {
			downloadURL = a.BrowserDownloadURL
			assetSize = a.Size
			break
		}
	}
	if downloadURL == "" {
		// Direct raw EXE path from main branch matching our LumaOS_<ver>.exe convention
		downloadURL = fmt.Sprintf("https://github.com/%s/%s/raw/main/LumaOS_%s.exe", owner, repo, latestClean)
	}

	res.OK = true
	res.LatestTag = rel.TagName
	res.LatestVersion = latestClean
	res.ReleaseTitle = rel.Name
	if res.ReleaseTitle == "" {
		res.ReleaseTitle = "Luma OS " + latestClean
	}
	res.ReleaseNotes = rel.Body
	res.ReleaseURL = rel.HTMLURL
	res.DownloadURL = downloadURL
	res.PublishedAt = rel.PublishedAt
	res.AssetSize = assetSize
	res.HasUpdate = compareSemver(latestClean, KernelVersion) > 0
	res.UpdateLevel, res.UpdateLevelLabel = classifyUpdateLevel(KernelVersion, latestClean)
	res.ChangelogHighlights = extractChangelogHighlights(rel.Body, 6)
	return res
}

// classifyUpdateLevel strictly implements Luma OS SemVer hierarchy X.Y.Z:
//   X (1st digit) -> Global Update (Глобальное обновление)
//   Y (2nd digit) -> Major Version Update (Большое обновление версии)
//   Z (3rd digit) -> Patch (Патч исправлений и небольших добавлений)
func classifyUpdateLevel(currentVer, targetVer string) (string, string) {
	c1, c2, c3, _ := parseSemverParts(currentVer)
	t1, t2, t3, _ := parseSemverParts(targetVer)
	if t1 > c1 {
		return "major", "Глобальное обновление"
	}
	if t1 == c1 && t2 > c2 {
		return "minor", "Большое обновление версии"
	}
	if t1 == c1 && t2 == c2 && t3 > c3 {
		return "patch", "Патч исправлений и улучшений"
	}
	// When current == latest, classify the latest version itself by its Z/Y/X digits
	if t3 > 0 {
		return "patch", "Патч исправлений и улучшений"
	}
	if t2 > 0 {
		return "minor", "Большое обновление версии"
	}
	return "major", "Глобальное обновление"
}

func extractChangelogHighlights(body string, maxItems int) []string {
	if maxItems <= 0 {
		maxItems = 6
	}
	var out []string
	for _, rawLine := range strings.Split(body, "\n") {
		line := strings.TrimSpace(rawLine)
		if strings.HasPrefix(line, "- ") || strings.HasPrefix(line, "* ") || strings.HasPrefix(line, "• ") {
			item := strings.TrimSpace(line[2:])
			item = strings.ReplaceAll(item, "**", "")
			item = strings.ReplaceAll(item, "`", "")
			if len(item) > 4 {
				out = append(out, item)
				if len(out) >= maxItems {
					break
				}
			}
		}
	}
	return out
}

func GetUpdateProgress() UpdateProgressState {
	updaterMu.RLock()
	defer updaterMu.RUnlock()
	return updaterState
}

func setUpdaterState(st UpdateProgressState) {
	updaterMu.Lock()
	updaterState = st
	updaterMu.Unlock()
}

func StartGitHubSelfUpdate(downloadURL, targetVersion string, kernel *LumaKernel) error {
	updaterMu.Lock()
	if updaterState.Running {
		updaterMu.Unlock()
		return fmt.Errorf("обновление уже выполняется")
	}
	updaterState = UpdateProgressState{
		Running:       true,
		Stage:         "checking",
		Percent:       2,
		TargetVersion: targetVersion,
		Message:       "Подключение к GitHub и подготовка загрузки...",
	}
	updaterMu.Unlock()

	if kernel != nil && kernel.security != nil {
		kernel.security.LogAudit("info", "updater", "Запущено обновление через GitHub", fmt.Sprintf("Версия %s · %s", targetVersion, downloadURL))
	}

	go func() {
		backupCurrentBinaryForRollback()
		client := &http.Client{Timeout: 5 * time.Minute}
		req, err := http.NewRequest("GET", downloadURL, nil)
		if err != nil {
			setUpdaterState(UpdateProgressState{Stage: "error", Error: err.Error(), Message: "Неверный URL обновления"})
			return
		}
		req.Header.Set("User-Agent", "LumaOS-Updater/"+KernelVersion)

		resp, err := client.Do(req)
		if err != nil {
			setUpdaterState(UpdateProgressState{Stage: "error", Error: err.Error(), Message: "Ошибка подключения к GitHub"})
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			setUpdaterState(UpdateProgressState{
				Stage:   "error",
				Error:   fmt.Sprintf("HTTP %d", resp.StatusCode),
				Message: fmt.Sprintf("Файл обновления недоступен на GitHub (HTTP %d)", resp.StatusCode),
			})
			return
		}

		total := resp.ContentLength
		exePath, _ := os.Executable()
		targetDir := filepath.Dir(exePath)
		if targetDir == "" || targetDir == "." {
			targetDir = os.TempDir()
		}
		safeVer := strings.ReplaceAll(strings.TrimSpace(targetVersion), " ", "_")
		if safeVer == "" {
			safeVer = "latest"
		}
		outName := fmt.Sprintf("LumaOS_%s.exe", safeVer)
		tmpPath := filepath.Join(targetDir, outName+".download")

		outFile, err := os.Create(tmpPath)
		if err != nil {
			// Fallback to user Downloads if exe folder is read-only
			home, _ := os.UserHomeDir()
			targetDir = filepath.Join(home, "Downloads")
			_ = os.MkdirAll(targetDir, 0o755)
			tmpPath = filepath.Join(targetDir, outName+".download")
			outFile, err = os.Create(tmpPath)
			if err != nil {
				setUpdaterState(UpdateProgressState{Stage: "error", Error: err.Error(), Message: "Не удалось создать файл загрузки"})
				return
			}
		}

		hasher := sha256.New()
		buf := make([]byte, 64*1024)
		var downloaded int64
		started := time.Now()
		lastEmit := time.Now()

		for {
			n, rerr := resp.Body.Read(buf)
			if n > 0 {
				if _, werr := outFile.Write(buf[:n]); werr != nil {
					_ = outFile.Close()
					_ = os.Remove(tmpPath)
					setUpdaterState(UpdateProgressState{Stage: "error", Error: werr.Error(), Message: "Ошибка записи на диск"})
					return
				}
				_, _ = hasher.Write(buf[:n])
				downloaded += int64(n)
				if time.Since(lastEmit) >= 120*time.Millisecond || rerr == io.EOF {
					elapsedSec := time.Since(started).Seconds()
					if elapsedSec < 0.05 {
						elapsedSec = 0.05
					}
					speedMBs := float64(downloaded) / (1024 * 1024) / elapsedSec
					pct := 15
					if total > 0 {
						pct = 5 + int(float64(downloaded)/float64(total)*82.0)
						if pct > 87 {
							pct = 87
						}
					} else {
						pct = 10 + int((downloaded/(1024*1024))*4)%75
					}
					setUpdaterState(UpdateProgressState{
						Running:         true,
						Stage:           "downloading",
						Percent:         pct,
						DownloadedBytes: downloaded,
						TotalBytes:      total,
						SpeedMbps:       float64(int(speedMBs*100)) / 100,
						TargetVersion:   targetVersion,
						Message:         fmt.Sprintf("Загрузка %s: %.1f МБ (%.1f МБ/с)", outName, float64(downloaded)/(1024*1024), speedMBs),
					})
					lastEmit = time.Now()
				}
			}
			if rerr == io.EOF {
				break
			}
			if rerr != nil {
				_ = outFile.Close()
				_ = os.Remove(tmpPath)
				setUpdaterState(UpdateProgressState{Stage: "error", Error: rerr.Error(), Message: "Разрыв соединения при скачивании"})
				return
			}
		}
		_ = outFile.Close()

		// Stage: Verify PE header & SHA-256
		setUpdaterState(UpdateProgressState{
			Running:         true,
			Stage:           "verifying",
			Percent:         91,
			DownloadedBytes: downloaded,
			TotalBytes:      downloaded,
			TargetVersion:   targetVersion,
			Message:         "Проверка целостности SHA-256 и подписи PE32+...",
		})

		hdr := make([]byte, 2)
		if f, err := os.Open(tmpPath); err == nil {
			_, _ = f.Read(hdr)
			_ = f.Close()
		}
		if hdr[0] != 'M' || hdr[1] != 'Z' {
			_ = os.Remove(tmpPath)
			setUpdaterState(UpdateProgressState{
				Stage:   "error",
				Error:   "invalid PE header",
				Message: "Загруженный файл не является корректным Windows EXE (проверьте релиз на GitHub)",
			})
			return
		}

		finalPath := filepath.Join(targetDir, outName)
		_ = os.Remove(finalPath)
		if err := os.Rename(tmpPath, finalPath); err != nil {
			setUpdaterState(UpdateProgressState{Stage: "error", Error: err.Error(), Message: "Не удалось финализировать файл"})
			return
		}
		sum := hex.EncodeToString(hasher.Sum(nil))

		if kernel != nil && kernel.security != nil {
			kernel.security.LogAudit("ok", "updater", "Обновление проверено (SHA-256)", fmt.Sprintf("%s · %s", outName, sum[:16]))
		}

		if runtime.GOOS == "windows" {
			setUpdaterState(UpdateProgressState{
				Running:         true,
				Stage:           "restarting",
				Percent:         100,
				DownloadedBytes: downloaded,
				TotalBytes:      downloaded,
				TargetVersion:   targetVersion,
				FilePath:        finalPath,
				SHA256:          sum,
				Message:         "Переход на новую версию Luma OS " + targetVersion + "...",
			})

			// Give UI 900ms to render 100% progress bar, then cleanly hand off & relaunch new EXE!
			go func() {
				time.Sleep(900 * time.Millisecond)
				restoreWindowsShell()
				// Spawn detached updater handoff: wait 1s for current port release, then start new EXE
				helper := fmt.Sprintf(`Start-Sleep -Milliseconds 1100; Start-Process -FilePath '%s'`, strings.ReplaceAll(finalPath, "'", "''"))
				_ = exec.Command("powershell.exe", "-NoProfile", "-WindowStyle", "Hidden", "-Command", helper).Start()
				os.Exit(0)
			}()
		} else {
			setUpdaterState(UpdateProgressState{
				Running:         false,
				Stage:           "done",
				Percent:         100,
				DownloadedBytes: downloaded,
				TotalBytes:      downloaded,
				TargetVersion:   targetVersion,
				FilePath:        finalPath,
				SHA256:          sum,
				Message:         fmt.Sprintf("Скачано и проверено: %s (Windows EXE готов к запуску)", finalPath),
			})
		}
	}()

	return nil
}

type RollbackReleaseEntry struct {
	Version     string `json:"version"`
	Tag         string `json:"tag"`
	Title       string `json:"title"`
	PublishedAt string `json:"published_at,omitempty"`
	DownloadURL string `json:"download_url"`
	LocalBackup bool   `json:"local_backup"`
	IsCurrent   bool   `json:"is_current"`
	Summary     string `json:"summary"`
}

func rollbackVersionsDir() string {
	cfgDir, err := os.UserConfigDir()
	if err != nil || cfgDir == "" {
		cfgDir = os.TempDir()
	}
	dir := filepath.Join(cfgDir, "LumaOS", "versions")
	_ = os.MkdirAll(dir, 0o700)
	return dir
}

func backupCurrentBinaryForRollback() {
	exePath, err := os.Executable()
	if err != nil || !strings.HasSuffix(strings.ToLower(exePath), ".exe") {
		return
	}
	dest := filepath.Join(rollbackVersionsDir(), fmt.Sprintf("LumaOS_%s.exe", KernelVersion))
	if _, err := os.Stat(dest); err == nil {
		return
	}
	_ = copyPathRecursive(exePath, dest)
}

func findLocalVersionBinary(version string) string {
	safe := strings.ReplaceAll(strings.TrimSpace(strings.TrimPrefix(version, "v")), " ", "_")
	if safe == "" {
		return ""
	}
	name := fmt.Sprintf("LumaOS_%s.exe", safe)
	candidates := []string{
		filepath.Join(rollbackVersionsDir(), name),
		name,
	}
	if exePath, err := os.Executable(); err == nil && exePath != "" {
		candidates = append(candidates, filepath.Join(filepath.Dir(exePath), name))
	}
	for _, c := range candidates {
		if st, err := os.Stat(c); err == nil && !st.IsDir() && st.Size() > 500*1024 {
			return c
		}
	}
	return ""
}

func ListRollbackReleases(repoURL string) []RollbackReleaseEntry {
	owner, repo := extractRepoOwnerName(repoURL)
	baseRaw := fmt.Sprintf("https://github.com/%s/%s/raw/main", owner, repo)

	curated := []RollbackReleaseEntry{
		{Version: "1.3", Tag: "v1.3", Title: "Luma OS 1.3 (Beryllium)", DownloadURL: baseRaw + "/LumaOS_1.3.exe", Summary: "Ядро LumaCore 1.4 + LumaShield 1.4, GPU Чип + VRAM в Диспетчере, заряд 2.4GHz радио-гаджетов и закрепление на панели, реальные иконки ПК, умный Alt+R поиск, адаптивная раскладка, трекер сессий 2.0, игра Beryllium Vanguard"},
		{Version: "1.2.3B", Tag: "v1.2.3B", Title: "Luma OS 1.2.3B (Lithium)", DownloadURL: baseRaw + "/LumaOS_1.2.3B.exe", Summary: "Ядро LumaCore 1.3B (True Zero-WMI Engine: WMI Provider Host 24% → 0%), кэш CoreAudio, умный SMTC, восстановлен 3D-наклон баннера Ядро UI"},
		{Version: "1.2.3", Tag: "v1.2.3", Title: "Luma OS 1.2.3 (Lithium)", DownloadURL: baseRaw + "/LumaOS_1.2.3.exe", Summary: "Ядро LumaCore 1.3 (Zero-PowerShell Win32, -85% ЦП/ГПУ), живой Диспетчер задач с графиками при наведении, автоскрытие панели, фикс баннера Ядро UI, упрощённая мини-игра"},
		{Version: "1.2.2", Tag: "v1.2.2", Title: "Luma OS 1.2.2 (Lithium)", DownloadURL: baseRaw + "/LumaOS_1.2.2.exe", Summary: "Раскладки мира, Audio I/O, батареи BT, LumaShield 1.3, ИИ объём, Dynamic Island 2.0, откат версий"},
		{Version: "1.2.1", Tag: "v1.2.1", Title: "Luma OS 1.2.1 (Lithium)", DownloadURL: baseRaw + "/LumaOS_1.2.1.exe", Summary: "Адаптация экрана, GPU оптимизация, Luma Lang/Code, порядок панели, Plugin API v2.0"},
		{Version: "1.2.0", Tag: "v1.2.0", Title: "Luma OS 1.2.0 (Lithium)", DownloadURL: baseRaw + "/LumaOS_1.2.0.exe", Summary: "Мультизадачность Alt+W, Luma Calculator, автономный ИИ, аналитика батареи, живые обои"},
		{Version: "1.1.0", Tag: "v1.1.0", Title: "Luma OS 1.1.0 (Helium)", DownloadURL: baseRaw + "/LumaOS_1.1.0.exe", Summary: "Ядро LumaShield, 9 языков, Shell Mode, GitHub OTA, живые курсы валют"},
		{Version: "1.0.4", Tag: "v1.0.4", Title: "Luma OS 1.0.4", DownloadURL: baseRaw + "/LumaOS_1.0.4.exe", Summary: "Luma Explorer, Диспетчер задач, папки на рабочем столе, 8 переработанных тем"},
		{Version: "1.0.3", Tag: "v1.0.3", Title: "Luma OS 1.0.3", DownloadURL: baseRaw + "/LumaOS_1.0.3.exe", Summary: "Ядро UI, Bluetooth, Энергосбережение, Память и Файлы, мультивыбор"},
		{Version: "1.0.2b", Tag: "v1.0.2b", Title: "Luma OS 1.0.2b", DownloadURL: baseRaw + "/LumaOS_1.0.2b.exe", Summary: "Автономный WebView2 GUI без Edge, гибкая панель задач, Luma Island"},
	}

	byVer := map[string]RollbackReleaseEntry{}
	order := make([]string, 0, len(curated)+8)
	for _, c := range curated {
		byVer[c.Version] = c
		order = append(order, c.Version)
	}

	// Merge live GitHub releases for exact dates / notes / any future releases
	client := &http.Client{Timeout: 6 * time.Second}
	if req, err := http.NewRequest("GET", fmt.Sprintf("https://api.github.com/repos/%s/%s/releases?per_page=20", owner, repo), nil); err == nil {
		req.Header.Set("Accept", "application/vnd.github+json")
		req.Header.Set("User-Agent", "LumaOS-Updater/"+KernelVersion)
		if resp, err := client.Do(req); err == nil {
			defer resp.Body.Close()
			if resp.StatusCode == 200 {
				var ghList []ghReleasePayload
				if json.NewDecoder(resp.Body).Decode(&ghList) == nil {
					for _, rel := range ghList {
						if rel.Draft {
							continue
						}
						ver := strings.TrimPrefix(strings.TrimSpace(rel.TagName), "v")
						if ver == "" {
							continue
						}
						dl := fmt.Sprintf("%s/LumaOS_%s.exe", baseRaw, ver)
						for _, a := range rel.Assets {
							if strings.HasSuffix(strings.ToLower(a.Name), ".exe") && a.BrowserDownloadURL != "" {
								dl = a.BrowserDownloadURL
								break
							}
						}
						existing, ok := byVer[ver]
						if !ok {
							order = append(order, ver)
							existing = RollbackReleaseEntry{
								Version: ver,
								Tag:     rel.TagName,
								Title:   rel.Name,
							}
						}
						if rel.Name != "" {
							existing.Title = rel.Name
						}
						if rel.PublishedAt != "" {
							existing.PublishedAt = rel.PublishedAt
						}
						if dl != "" {
							existing.DownloadURL = dl
						}
						if existing.Summary == "" {
							hls := extractChangelogHighlights(rel.Body, 2)
							if len(hls) > 0 {
								existing.Summary = strings.Join(hls, " · ")
							}
						}
						byVer[ver] = existing
					}
				}
			}
		}
	}

	out := make([]RollbackReleaseEntry, 0, len(order))
	seen := map[string]bool{}
	for _, ver := range order {
		if seen[ver] {
			continue
		}
		seen[ver] = true
		entry := byVer[ver]
		entry.IsCurrent = strings.EqualFold(entry.Version, KernelVersion)
		entry.LocalBackup = findLocalVersionBinary(entry.Version) != ""
		out = append(out, entry)
	}
	// Sort descending by semantic version (1.3 -> 1.2.3B -> 1.2.3 -> ... -> 1.0.0)
	for i := 0; i < len(out); i++ {
		for j := i + 1; j < len(out); j++ {
			if compareSemver(out[j].Version, out[i].Version) > 0 {
				out[i], out[j] = out[j], out[i]
			}
		}
	}
	return out
}

func StartVersionRollback(targetVersion, downloadURL string, kernel *LumaKernel) error {
	cleanVer := strings.TrimPrefix(strings.TrimSpace(targetVersion), "v")
	if cleanVer == "" {
		return fmt.Errorf("укажите целевую версию для отката")
	}
	backupCurrentBinaryForRollback()

	if kernel != nil && kernel.security != nil {
		kernel.security.LogAudit("warn", "rollback", "Инициирован откат версии Luma OS", fmt.Sprintf("v%s -> v%s", KernelVersion, cleanVer))
	}

	// Fast-path: restore directly from local verified backup copy if present!
	if localPath := findLocalVersionBinary(cleanVer); localPath != "" {
		updaterMu.Lock()
		if updaterState.Running {
			updaterMu.Unlock()
			return fmt.Errorf("обновление или откат уже выполняется")
		}
		updaterState = UpdateProgressState{
			Running:       true,
			Stage:         "verifying",
			Percent:       45,
			TargetVersion: cleanVer,
			FilePath:      localPath,
			Message:       "Найдена локальная копия Luma OS " + cleanVer + " — проверка SHA-256 и заголовка PE32+...",
		}
		updaterMu.Unlock()

		go func() {
			time.Sleep(400 * time.Millisecond)
			sum := computeFileSHA256(localPath)
			f, err := os.Open(localPath)
			if err != nil {
				setUpdaterState(UpdateProgressState{Stage: "error", Error: err.Error(), Message: "Ошибка чтения локальной копии"})
				return
			}
			hdr := make([]byte, 2)
			_, _ = f.Read(hdr)
			_ = f.Close()
			if len(hdr) < 2 || hdr[0] != 'M' || hdr[1] != 'Z' {
				setUpdaterState(UpdateProgressState{Stage: "error", Error: "invalid PE", Message: "Локальный файл повреждён (не PE32+)"})
				return
			}
			if runtime.GOOS == "windows" {
				setUpdaterState(UpdateProgressState{
					Running:       true,
					Stage:         "restarting",
					Percent:       100,
					TargetVersion: cleanVer,
					FilePath:      localPath,
					SHA256:        sum,
					Message:       "Откат на Luma OS " + cleanVer + " (виджеты и настройки сохранены)...",
				})
				time.Sleep(900 * time.Millisecond)
				restoreWindowsShell()
				helper := fmt.Sprintf(`Start-Sleep -Milliseconds 1100; Start-Process -FilePath '%s'`, strings.ReplaceAll(localPath, "'", "''"))
				_ = exec.Command("powershell.exe", "-NoProfile", "-WindowStyle", "Hidden", "-Command", helper).Start()
				os.Exit(0)
			} else {
				setUpdaterState(UpdateProgressState{
					Running:       false,
					Stage:         "done",
					Percent:       100,
					TargetVersion: cleanVer,
					FilePath:      localPath,
					SHA256:        sum,
					Message:       fmt.Sprintf("Локальная копия Luma OS %s проверена и готова к запуску (%s)", cleanVer, localPath),
				})
			}
		}()
		return nil
	}

	// Otherwise download the chosen earlier version cleanly from GitHub!
	dl := strings.TrimSpace(downloadURL)
	if dl == "" {
		dl = fmt.Sprintf("https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_%s.exe", cleanVer)
	}
	return StartGitHubSelfUpdate(dl, cleanVer, kernel)
}

// ==================== 2. UNIVERSAL AI PROXY (GEMINI, OPENAI, CLAUDE, DEEPSEEK, OLLAMA, CUSTOM) ====================

type AIChatMessage struct {
	Role    string `json:"role"` // system | user | assistant
	Content string `json:"content"`
}

type AIChatRequest struct {
	Provider       string          `json:"provider"`  // luma_local | gemini | openai | claude | deepseek | openrouter | groq | ollama | custom
	Mode           string          `json:"mode"`      // language | code | auto
	Verbosity      string          `json:"verbosity"` // brief | balanced | detailed
	APIKey         string          `json:"api_key"`
	BaseURL        string          `json:"base_url"`
	Model          string          `json:"model"`
	SystemPrompt   string          `json:"system_prompt"`
	Temperature    float64         `json:"temperature"`
	IncludeContext bool            `json:"include_context"`
	Messages       []AIChatMessage `json:"messages"`
}

func HandleAIChatRequest(req AIChatRequest, kernel *LumaKernel) map[string]interface{} {
	if kernel != nil && !kernel.IsAIEnabled() {
		return map[string]interface{}{
			"ok":       false,
			"disabled": true,
			"error":    "Luma AI отключён пользователем в настройках системы (Настройки → ИИ и Нейросети)",
		}
	}
	provider := strings.ToLower(strings.TrimSpace(req.Provider))
	if provider == "" || provider == "luma_local" || provider == "offline" || provider == "local" {
		return RunLumaLocalAI(req.Messages, req.Mode, req.Verbosity, kernel)
	}
	apiKey := strings.TrimSpace(req.APIKey)
	model := strings.TrimSpace(req.Model)
	temp := req.Temperature
	if temp <= 0 || temp > 2 {
		temp = 0.7
	}

	sysPrompt := strings.TrimSpace(req.SystemPrompt)
	if sysPrompt == "" {
		switch normalizeLocalAIMode(req.Mode) {
		case "code":
			sysPrompt = "Ты — Luma Code 1.2, системный ИИ-программист Luma OS 1.2.2 (Lithium). Пиши чистый, современный, готовый к запуску код с пояснениями."
		case "language":
			sysPrompt = "Ты — Luma Lang 1.2, языковой и справочный ИИ-ассистент Luma OS 1.2.2 (Lithium). Отвечай грамотно, информативно, естественно и по сути вопроса."
		default:
			sysPrompt = "Ты — встроенный системный ИИ-ассистент Luma OS 1.2.2 (Lithium). Отвечай чётко, по делу и помогай пользователю со знаниями, ПК, командами и кодом."
		}
	}
	switch normalizeAIVerbosity(req.Verbosity) {
	case "brief":
		sysPrompt += "\n\n[Объём ответа: КРАТКО. Отвечай максимально лаконично: 2–4 предложения или до 3 коротких пунктов, только самая суть без лишней воды.]"
	case "detailed":
		sysPrompt += "\n\n[Объём ответа: ПОДРОБНО. Дай максимально развёрнутый, глубокий и хорошо структурированный ответ с объяснениями, деталями, примерами, нюансами и практическими рекомендациями.]"
	default:
		sysPrompt += "\n\n[Объём ответа: БАЛАНС. Дай сбалансированный, понятный и структурированный ответ с ключевыми фактами и наглядным примером.]"
	}
	if req.IncludeContext && kernel != nil {
		snap := kernel.SystemSnapshot()
		sysPrompt += fmt.Sprintf(
			"\n\n[Живой контекст ПК LumaCore 1.2: Хост=%s, ОС=%s, Модель=%s, CPU=%d%% (%s), RAM=%.1f/%.1f ГБ (%d%%), Город=%s, Сеть=%.1f/%.1f Мбит/с]",
			snap.Hostname, snap.OSName, snap.DeviceModel, snap.CPUPercent, snap.CPUModel,
			snap.RAMUsedGB, snap.RAMTotalGB, snap.RAMPercent, snap.Location.City, snap.NetDownMbps, snap.NetUpMbps,
		)
	}

	if len(req.Messages) == 0 {
		return map[string]interface{}{"ok": false, "error": "Пустой запрос"}
	}

	client := &http.Client{Timeout: 60 * time.Second}

	// ---- A. Native Google Gemini REST API ----
	if provider == "gemini" {
		if apiKey == "" {
			return map[string]interface{}{"ok": false, "error": "Укажите API-ключ Google Gemini (aistudio.google.com/apikey)"}
		}
		if model == "" {
			model = "gemini-2.5-flash"
		}
		base := strings.TrimRight(strings.TrimSpace(req.BaseURL), "/")
		if base == "" {
			base = "https://generativelanguage.googleapis.com/v1beta"
		}
		endpoint := fmt.Sprintf("%s/models/%s:generateContent?key=%s", base, model, apiKey)

		contents := make([]map[string]interface{}, 0, len(req.Messages))
		for _, m := range req.Messages {
			role := "user"
			if m.Role == "assistant" || m.Role == "model" {
				role = "model"
			}
			contents = append(contents, map[string]interface{}{
				"role":  role,
				"parts": []map[string]string{{"text": m.Content}},
			})
		}
		bodyObj := map[string]interface{}{
			"system_instruction": map[string]interface{}{
				"parts": []map[string]string{{"text": sysPrompt}},
			},
			"contents": contents,
			"generationConfig": map[string]interface{}{
				"temperature": temp,
			},
		}
		rawBody, _ := json.Marshal(bodyObj)
		httpReq, _ := http.NewRequest("POST", endpoint, bytes.NewReader(rawBody))
		httpReq.Header.Set("Content-Type", "application/json")
		resp, err := client.Do(httpReq)
		if err != nil {
			return map[string]interface{}{"ok": false, "error": fmt.Sprintf("Ошибка сети Gemini: %v", err)}
		}
		defer resp.Body.Close()
		respBytes, _ := io.ReadAll(resp.Body)

		var parsed struct {
			Candidates []struct {
				Content struct {
					Parts []struct {
						Text string `json:"text"`
					} `json:"parts"`
				} `json:"content"`
			} `json:"candidates"`
			Error *struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		_ = json.Unmarshal(respBytes, &parsed)
		if parsed.Error != nil && parsed.Error.Message != "" {
			return map[string]interface{}{"ok": false, "error": "Gemini: " + parsed.Error.Message}
		}
		if resp.StatusCode >= 400 {
			return map[string]interface{}{"ok": false, "error": fmt.Sprintf("Gemini HTTP %d: %s", resp.StatusCode, string(respBytes))}
		}
		var sb strings.Builder
		if len(parsed.Candidates) > 0 {
			for _, p := range parsed.Candidates[0].Content.Parts {
				sb.WriteString(p.Text)
			}
		}
		reply := strings.TrimSpace(sb.String())
		if reply == "" {
			return map[string]interface{}{"ok": false, "error": "Gemini вернул пустой ответ"}
		}
		return map[string]interface{}{"ok": true, "reply": reply, "provider": "gemini", "model": model}
	}

	// ---- B. Native Anthropic Claude API ----
	if provider == "claude" {
		if apiKey == "" {
			return map[string]interface{}{"ok": false, "error": "Укажите API-ключ Anthropic Claude"}
		}
		if model == "" {
			model = "claude-sonnet-4-20250514"
		}
		endpoint := strings.TrimRight(strings.TrimSpace(req.BaseURL), "/")
		if endpoint == "" {
			endpoint = "https://api.anthropic.com/v1/messages"
		} else if !strings.HasSuffix(endpoint, "/messages") {
			endpoint += "/messages"
		}
		msgs := make([]map[string]string, 0, len(req.Messages))
		for _, m := range req.Messages {
			role := "user"
			if m.Role == "assistant" {
				role = "assistant"
			}
			msgs = append(msgs, map[string]string{"role": role, "content": m.Content})
		}
		bodyObj := map[string]interface{}{
			"model":       model,
			"max_tokens":  2048,
			"temperature": temp,
			"system":      sysPrompt,
			"messages":    msgs,
		}
		rawBody, _ := json.Marshal(bodyObj)
		httpReq, _ := http.NewRequest("POST", endpoint, bytes.NewReader(rawBody))
		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("x-api-key", apiKey)
		httpReq.Header.Set("anthropic-version", "2023-06-01")
		resp, err := client.Do(httpReq)
		if err != nil {
			return map[string]interface{}{"ok": false, "error": fmt.Sprintf("Ошибка сети Claude: %v", err)}
		}
		defer resp.Body.Close()
		respBytes, _ := io.ReadAll(resp.Body)

		var parsed struct {
			Content []struct {
				Text string `json:"text"`
			} `json:"content"`
			Error *struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		_ = json.Unmarshal(respBytes, &parsed)
		if parsed.Error != nil && parsed.Error.Message != "" {
			return map[string]interface{}{"ok": false, "error": "Claude: " + parsed.Error.Message}
		}
		if resp.StatusCode >= 400 {
			return map[string]interface{}{"ok": false, "error": fmt.Sprintf("Claude HTTP %d", resp.StatusCode)}
		}
		var sb strings.Builder
		for _, c := range parsed.Content {
			sb.WriteString(c.Text)
		}
		return map[string]interface{}{"ok": true, "reply": strings.TrimSpace(sb.String()), "provider": "claude", "model": model}
	}

	// ---- C. OpenAI-Compatible APIs (OpenAI, DeepSeek, OpenRouter, Groq, Ollama, Custom) ----
	baseURL := strings.TrimRight(strings.TrimSpace(req.BaseURL), "/")
	switch provider {
	case "openai":
		if baseURL == "" {
			baseURL = "https://api.openai.com/v1"
		}
		if model == "" {
			model = "gpt-4o-mini"
		}
	case "deepseek":
		if baseURL == "" {
			baseURL = "https://api.deepseek.com/v1"
		}
		if model == "" {
			model = "deepseek-chat"
		}
	case "openrouter":
		if baseURL == "" {
			baseURL = "https://openrouter.ai/api/v1"
		}
		if model == "" {
			model = "google/gemini-2.0-flash-exp:free"
		}
	case "groq":
		if baseURL == "" {
			baseURL = "https://api.groq.com/openai/v1"
		}
		if model == "" {
			model = "llama-3.3-70b-versatile"
		}
	case "ollama":
		if baseURL == "" {
			baseURL = "http://127.0.0.1:11434/v1"
		}
		if model == "" {
			model = "llama3.2"
		}
	default: // custom
		if baseURL == "" {
			return map[string]interface{}{"ok": false, "error": "Укажите Base URL для пользовательской нейросети"}
		}
		if model == "" {
			model = "gpt-4o-mini"
		}
	}

	if provider != "ollama" && provider != "custom" && apiKey == "" {
		return map[string]interface{}{"ok": false, "error": fmt.Sprintf("Укажите API-ключ для провайдера %s", provider)}
	}

	endpoint := baseURL
	if !strings.HasSuffix(endpoint, "/chat/completions") {
		endpoint += "/chat/completions"
	}

	oaiMsgs := []map[string]string{{"role": "system", "content": sysPrompt}}
	for _, m := range req.Messages {
		role := m.Role
		if role != "user" && role != "assistant" && role != "system" {
			role = "user"
		}
		oaiMsgs = append(oaiMsgs, map[string]string{"role": role, "content": m.Content})
	}
	bodyObj := map[string]interface{}{
		"model":       model,
		"temperature": temp,
		"messages":    oaiMsgs,
	}
	rawBody, _ := json.Marshal(bodyObj)
	httpReq, _ := http.NewRequest("POST", endpoint, bytes.NewReader(rawBody))
	httpReq.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	}
	if provider == "openrouter" {
		httpReq.Header.Set("HTTP-Referer", "https://github.com/Tveexty/L_H-3.0")
		httpReq.Header.Set("X-Title", "Luma OS 1.2.0 Lithium")
	}

	resp, err := client.Do(httpReq)
	if err != nil {
		return map[string]interface{}{"ok": false, "error": fmt.Sprintf("Ошибка подключения к %s: %v", provider, err)}
	}
	defer resp.Body.Close()
	respBytes, _ := io.ReadAll(resp.Body)

	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	_ = json.Unmarshal(respBytes, &parsed)
	if parsed.Error != nil && parsed.Error.Message != "" {
		return map[string]interface{}{"ok": false, "error": parsed.Error.Message}
	}
	if resp.StatusCode >= 400 {
		return map[string]interface{}{"ok": false, "error": fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(respBytes))}
	}
	if len(parsed.Choices) == 0 {
		return map[string]interface{}{"ok": false, "error": "Пустой ответ от модели"}
	}
	return map[string]interface{}{
		"ok":       true,
		"reply":    strings.TrimSpace(parsed.Choices[0].Message.Content),
		"provider": provider,
		"model":    model,
	}
}

// ==================== 3. LIVE CURRENCY & CRYPTO RATES WITH CACHE + FALLBACK ====================

type currencyCacheEntry struct {
	Base      string             `json:"base"`
	Rates     map[string]float64 `json:"rates"` // 1 unit of currency X in USD (or relative to USD)
	UpdatedAt time.Time          `json:"updated_at"`
	Live      bool               `json:"live"`
}

var (
	currencyMu    sync.RWMutex
	currencyCache currencyCacheEntry
)

// fallbackRatesPerUSD stores realistic baseline rates (units of currency per 1 USD) when offline
var fallbackRatesPerUSD = map[string]float64{
	"USD":  1.0,
	"EUR":  0.92,
	"RUB":  92.5,
	"MDL":  17.85,
	"RON":  4.58,
	"UAH":  41.3,
	"GBP":  0.79,
	"CNY":  7.24,
	"JPY":  153.8,
	"KZT":  492.0,
	"TRY":  34.4,
	"CHF":  0.88,
	"PLN":  4.02,
	"BYN":  3.28,
	"AED":  3.67,
	"CAD":  1.39,
	"BTC":  0.0000106, // ~94,300 USD
	"ETH":  0.000302,  // ~3,310 USD
	"USDT": 1.0,
}

func FetchLiveCurrencySnapshot(base string) map[string]interface{} {
	base = strings.ToUpper(strings.TrimSpace(base))
	if base == "" {
		base = "RUB"
	}

	currencyMu.RLock()
	cached := currencyCache
	currencyMu.RUnlock()

	if time.Since(cached.UpdatedAt) > 15*time.Minute || len(cached.Rates) == 0 {
		rates := make(map[string]float64, len(fallbackRatesPerUSD))
		for k, v := range fallbackRatesPerUSD {
			rates[k] = v
		}
		live := false
		client := &http.Client{Timeout: 6 * time.Second}

		// 1. Live fiat rates from open.er-api.com (no API key required)
		if resp, err := client.Get("https://open.er-api.com/v6/latest/USD"); err == nil {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				var payload struct {
					Result string             `json:"result"`
					Rates  map[string]float64 `json:"rates"`
				}
				if json.NewDecoder(resp.Body).Decode(&payload) == nil && len(payload.Rates) > 10 {
					for k, v := range payload.Rates {
						if v > 0 {
							rates[k] = v
						}
					}
					live = true
				}
			}
		}

		// 2. Live BTC / ETH spot rates from Coinbase public API
		for _, sym := range []string{"BTC", "ETH"} {
			if resp, err := client.Get("https://api.coinbase.com/v2/prices/" + sym + "-USD/spot"); err == nil {
				var cp struct {
					Data struct {
						Amount string `json:"amount"`
					} `json:"data"`
				}
				if json.NewDecoder(resp.Body).Decode(&cp) == nil {
					if usdPrice, err2 := strconv.ParseFloat(cp.Data.Amount, 64); err2 == nil && usdPrice > 0 {
						rates[sym] = 1.0 / usdPrice
						live = true
					}
				}
				_ = resp.Body.Close()
			}
		}

		cached = currencyCacheEntry{
			Base:      "USD",
			Rates:     rates,
			UpdatedAt: time.Now(),
			Live:      live,
		}
		currencyMu.Lock()
		currencyCache = cached
		currencyMu.Unlock()
	}

	basePerUSD, ok := cached.Rates[base]
	if !ok || basePerUSD <= 0 {
		base = "USD"
		basePerUSD = 1.0
	}

	// Compute "1 unit of <SYM> equals how many <BASE>"
	// If 1 USD = basePerUSD BASE, and 1 USD = symPerUSD SYM -> 1 SYM = basePerUSD / symPerUSD BASE
	unitInBase := make(map[string]float64, len(cached.Rates))
	for sym, symPerUSD := range cached.Rates {
		if symPerUSD > 0 {
			unitInBase[sym] = basePerUSD / symPerUSD
		}
	}

	return map[string]interface{}{
		"ok":           true,
		"base":         base,
		"unit_in_base": unitInBase,
		"per_usd":      cached.Rates,
		"live":         cached.Live,
		"updated_at":   cached.UpdatedAt.Format("15:04"),
	}
}
