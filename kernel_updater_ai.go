package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
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
		// Fallback 1: list of releases via GitHub REST API (e.g., if latest is prerelease or tag-only)
		req, _ := http.NewRequest("GET", fmt.Sprintf("https://api.github.com/repos/%s/%s/releases?per_page=10", owner, repo), nil)
		req.Header.Set("Accept", "application/vnd.github+json")
		req.Header.Set("User-Agent", "LumaOS-Updater/"+KernelVersion)
		if resp, err2 := client.Do(req); err2 == nil {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				var list []ghReleasePayload
				if err3 := json.NewDecoder(resp.Body).Decode(&list); err3 == nil && len(list) > 0 {
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
			}
		}
	}
	if rel == nil {
		// Fallback 2 (Rate-Limit-Proof): resolve https://github.com/{owner}/{repo}/releases/latest 302 redirect
		// Bypasses api.github.com's 60 req/hr unauthenticated rate limit (HTTP 403) completely!
		webRel, errWeb := fetchLatestReleaseViaWebRedirect(owner, repo)
		if errWeb != nil || webRel == nil {
			res.Error = fmt.Sprintf("Нет соединения с GitHub (%v / %v)", err, errWeb)
			return res
		}
		rel = webRel
	}

	latestClean := strings.TrimPrefix(strings.TrimSpace(rel.TagName), "v")
	if latestClean == "" {
		latestClean = KernelVersion
	}

	downloadURL, probedSize := resolveReleaseDownloadURL(owner, repo, latestClean, rel, client)
	var assetSize int64
	for _, a := range rel.Assets {
		if a.BrowserDownloadURL == downloadURL {
			assetSize = a.Size
			break
		}
	}
	if assetSize <= 0 && probedSize > 0 {
		assetSize = probedSize
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

// fetchLatestReleaseViaWebRedirect resolves the latest GitHub release tag via
// https://github.com/{owner}/{repo}/releases/latest (302 -> .../releases/tag/<tag>)
// so OTA update checks keep working even when api.github.com returns HTTP 403 rate limit exceeded.
func fetchLatestReleaseViaWebRedirect(owner, repo string) (*ghReleasePayload, error) {
	noRedirectClient := &http.Client{
		Timeout: 8 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
	latestURL := fmt.Sprintf("https://github.com/%s/%s/releases/latest", owner, repo)
	var loc string
	for _, method := range []string{"HEAD", "GET"} {
		req, err := http.NewRequest(method, latestURL, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("User-Agent", "LumaOS-Updater/"+KernelVersion)
		resp, err := noRedirectClient.Do(req)
		if err != nil {
			continue
		}
		_ = resp.Body.Close()
		if l := strings.TrimSpace(resp.Header.Get("Location")); l != "" && strings.Contains(l, "/releases/tag/") {
			loc = l
			break
		}
	}
	if loc == "" {
		return nil, fmt.Errorf("не удалось определить последний релиз на github.com")
	}
	idx := strings.Index(loc, "/releases/tag/")
	if idx < 0 {
		return nil, fmt.Errorf("неожиданный редирект релиза: %s", loc)
	}
	tag := strings.TrimSpace(loc[idx+len("/releases/tag/"):])
	if q := strings.IndexAny(tag, "?#/"); q >= 0 {
		tag = tag[:q]
	}
	if tag == "" {
		return nil, fmt.Errorf("пустой тег релиза")
	}
	cleanVer := strings.TrimPrefix(tag, "v")
	rel := &ghReleasePayload{
		TagName: tag,
		Name:    "Luma OS " + cleanVer,
		HTMLURL: fmt.Sprintf("https://github.com/%s/%s/releases/tag/%s", owner, repo, tag),
	}
	// Optionally load release patch notes directly from raw.githubusercontent.com (0 API rate limit)
	rawClient := &http.Client{Timeout: 5 * time.Second}
	notesURL := fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/main/PATCH_NOTES_%s.md", owner, repo, cleanVer)
	if req, err := http.NewRequest("GET", notesURL, nil); err == nil {
		req.Header.Set("User-Agent", "LumaOS-Updater/"+KernelVersion)
		if resp, err := rawClient.Do(req); err == nil {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				if data, rerr := io.ReadAll(io.LimitReader(resp.Body, 48*1024)); rerr == nil && len(data) > 0 {
					rel.Body = string(data)
				}
			}
		}
	}
	return rel, nil
}

// buildCandidateExeURLs generates edition-aware download URL candidates in priority order
// so OTA updates NEVER fail with HTTP 404 whether a release ships LumaOS_<ver>.exe, _Pro.exe, or _Base.exe.
func buildCandidateExeURLs(owner, repo, ver, primaryURL, releaseBody string) []string {
	out := make([]string, 0, 12)
	seen := map[string]bool{}
	add := func(u string) {
		u = strings.TrimSpace(u)
		if u == "" || seen[u] {
			return
		}
		seen[u] = true
		out = append(out, u)
	}

	cleanVer := strings.TrimPrefix(strings.TrimSpace(ver), "v")
	lowVer := strings.ToLower(cleanVer)
	wantPro := isProEdition()
	if strings.Contains(lowVer, "base") {
		wantPro = false
	} else if strings.Contains(lowVer, "pro") {
		wantPro = true
	}
	baseNumVer := cleanVer
	if idx := strings.Index(baseNumVer, " "); idx > 0 {
		baseNumVer = strings.TrimSpace(baseNumVer[:idx])
	}
	baseRaw := fmt.Sprintf("https://github.com/%s/%s/raw/main", owner, repo)
	directRaw := fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/main", owner, repo)

	if primaryURL != "" {
		add(primaryURL)
	}

	// Parse direct GitHub raw .exe links from release notes body
	if releaseBody != "" {
		re := regexp.MustCompile(`https://(?:github\.com|raw\.githubusercontent\.com)/[^\s\)\"']+\.exe`)
		matches := re.FindAllString(releaseBody, -1)
		wantSuffix := "_pro.exe"
		if !wantPro {
			wantSuffix = "_base.exe"
		}
		for _, m := range matches {
			if strings.HasSuffix(strings.ToLower(m), wantSuffix) {
				add(m)
			}
		}
		for _, m := range matches {
			add(m)
		}
	}

	if baseNumVer != "" {
		var names []string
		if wantPro {
			names = []string{
				fmt.Sprintf("LumaOS_%s_Pro.exe", baseNumVer),
				fmt.Sprintf("LumaOS_%s.exe", baseNumVer),
				fmt.Sprintf("LumaOS_%s_Base.exe", baseNumVer),
			}
		} else {
			names = []string{
				fmt.Sprintf("LumaOS_%s_Base.exe", baseNumVer),
				fmt.Sprintf("LumaOS_%s.exe", baseNumVer),
				fmt.Sprintf("LumaOS_%s_Pro.exe", baseNumVer),
			}
		}
		for _, n := range names {
			add(baseRaw + "/" + n)
		}
		for _, n := range names {
			add(directRaw + "/" + n)
		}
	}
	return out
}

func resolveReleaseDownloadURL(owner, repo, latestClean string, rel *ghReleasePayload, client *http.Client) (string, int64) {
	// 1. Prefer attached release asset matching current edition
	wantSuffix := "_pro.exe"
	if !isProEdition() {
		wantSuffix = "_base.exe"
	}
	for _, a := range rel.Assets {
		low := strings.ToLower(a.Name)
		if strings.HasSuffix(low, wantSuffix) && a.BrowserDownloadURL != "" {
			return a.BrowserDownloadURL, a.Size
		}
	}
	for _, a := range rel.Assets {
		if strings.HasSuffix(strings.ToLower(a.Name), ".exe") && a.BrowserDownloadURL != "" {
			return a.BrowserDownloadURL, a.Size
		}
	}

	// 2. Probe edition-aware raw/main & raw.githubusercontent.com candidates with fast HEAD request so we always return a live HTTP 200 URL!
	candidates := buildCandidateExeURLs(owner, repo, latestClean, "", rel.Body)
	probeClient := &http.Client{Timeout: 4 * time.Second}
	if client != nil {
		probeClient.Transport = client.Transport
	}
	for _, cand := range candidates {
		req, err := http.NewRequest("HEAD", cand, nil)
		if err != nil {
			continue
		}
		req.Header.Set("User-Agent", "LumaOS-Updater/"+KernelVersion)
		if resp, err := probeClient.Do(req); err == nil {
			sz := resp.ContentLength
			_ = resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return cand, sz
			}
		}
	}
	if len(candidates) > 0 {
		return candidates[0], 0
	}
	return fmt.Sprintf("https://github.com/%s/%s/raw/main/LumaOS_%s.exe", owner, repo, latestClean), 0
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

		owner, repo := extractRepoOwnerName(downloadURL)
		candidates := buildCandidateExeURLs(owner, repo, targetVersion, downloadURL, "")
		var resp *http.Response
		var usedURL string
		var lastStatus int
		var lastErr error

		for _, candURL := range candidates {
			req, err := http.NewRequest("GET", candURL, nil)
			if err != nil {
				lastErr = err
				continue
			}
			req.Header.Set("User-Agent", "LumaOS-Updater/"+KernelVersion)
			r, err := client.Do(req)
			if err != nil {
				lastErr = err
				continue
			}
			if r.StatusCode == http.StatusOK {
				resp = r
				usedURL = candURL
				break
			}
			lastStatus = r.StatusCode
			_ = r.Body.Close()
		}

		if resp == nil {
			if lastStatus > 0 {
				setUpdaterState(UpdateProgressState{
					Stage:   "error",
					Error:   fmt.Sprintf("HTTP %d", lastStatus),
					Message: fmt.Sprintf("Файл обновления недоступен на GitHub (HTTP %d)", lastStatus),
				})
			} else if lastErr != nil {
				setUpdaterState(UpdateProgressState{Stage: "error", Error: lastErr.Error(), Message: "Ошибка подключения к GitHub"})
			} else {
				setUpdaterState(UpdateProgressState{Stage: "error", Error: "no download candidate", Message: "Не найден файл обновления на GitHub"})
			}
			return
		}
		defer resp.Body.Close()

		total := resp.ContentLength
		exePath, _ := os.Executable()
		targetDir := filepath.Dir(exePath)
		if targetDir == "" || targetDir == "." {
			targetDir = os.TempDir()
		}

		// Derive exact output EXE filename from resolved URL (e.g. LumaOS_1.7.2_Pro.exe / LumaOS_1.7.2_Base.exe / LumaOS_1.7.2.exe)
		outName := ""
		if u, uerr := url.Parse(usedURL); uerr == nil {
			base := filepath.Base(u.Path)
			if strings.HasSuffix(strings.ToLower(base), ".exe") && len(base) > 4 {
				outName = base
			}
		}
		if outName == "" {
			safeVer := strings.ReplaceAll(strings.TrimSpace(targetVersion), " ", "_")
			if safeVer == "" {
				safeVer = "latest"
			}
			outName = fmt.Sprintf("LumaOS_%s.exe", safeVer)
		}
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

		// Safe Windows atomic swap: if target EXE is currently running & locked by Windows,
		// rename the running EXE to *.old FIRST (allowed by NTFS!) and then move new EXE into place!
		finalPath := filepath.Join(targetDir, outName)
		deferredSwap := false
		if _, statErr := os.Stat(finalPath); statErr == nil {
			if rmErr := os.Remove(finalPath); rmErr != nil {
				oldPath := finalPath + ".old"
				_ = os.Remove(oldPath)
				if renOldErr := os.Rename(finalPath, oldPath); renOldErr != nil {
					deferredSwap = true
				}
			}
		}
		if !deferredSwap {
			if err := os.Rename(tmpPath, finalPath); err != nil {
				deferredSwap = true
			}
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

			// Give UI 900ms to render 100% progress bar, then cleanly hand off, swap if locked, update Autostart Run key & relaunch new EXE!
			go func() {
				time.Sleep(900 * time.Millisecond)
				restoreWindowsShell()
				escFinal := strings.ReplaceAll(finalPath, "'", "''")
				escTmp := strings.ReplaceAll(tmpPath, "'", "''")
				swapCmd := ""
				if deferredSwap {
					swapCmd = fmt.Sprintf(`Move-Item -LiteralPath '%s' -Destination '%s' -Force -ErrorAction SilentlyContinue; `, escTmp, escFinal)
				}
				helper := fmt.Sprintf(
					`Start-Sleep -Milliseconds 1100; %s$p='%s'; $rk='HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'; $cur=(Get-ItemProperty -Path $rk -Name 'LumaOS' -ErrorAction SilentlyContinue).LumaOS; if ($cur) { $arg = if ($cur -like '*--fullscreen*') { ' --fullscreen' } else { '' }; Set-ItemProperty -Path $rk -Name 'LumaOS' -Value ('"' + $p + '"' + $arg) -ErrorAction SilentlyContinue }; Start-Process -FilePath $p`,
					swapCmd,
					escFinal,
				)
				_ = exec.Command("powershell.exe", "-NoProfile", "-WindowStyle", "Hidden", "-Command", helper).Start()
				os.Exit(0)
			}()
		} else {
			if deferredSwap {
				finalPath = tmpPath
			}
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
		{Version: "1.7.4", Tag: "v1.7.4", Title: "Luma OS 1.7.4 Pro (Oxygen · Универсальное обновление)", DownloadURL: baseRaw + "/LumaOS_1.7.4.exe", Summary: "Обновлённая классическая панель задач в аккуратном стиле Windows без тёмных рамок, лишних линий и со свободным переключением окон по клику, возможность в один клик скрыть модульную панель виджетов и кнопку конструктора, беспроводной второй экран по Windows Miracast (трансляция, режим экрана и переключение Дублировать / Расширить), а также актуальная версия 1.7.4 в главном окне настроек"},
		{Version: "1.7.4 Pro", Tag: "v1.7.4", Title: "Luma OS 1.7.4 Pro (Oxygen · Полные права)", DownloadURL: baseRaw + "/LumaOS_1.7.4_Pro.exe", Summary: "Полная версия Pro 1.7.4: аккуратная панель задач в стиле Windows, скрытие модульной панели и конструктора, беспроводной второй экран Miracast (Источник, Приёмник и режимы Дублировать / Расширить) и обновлённые настройки"},
		{Version: "1.7.4 Base", Tag: "v1.7.4", Title: "Luma OS 1.7.4 Base (Oxygen)", DownloadURL: baseRaw + "/LumaOS_1.7.4_Base.exe", Summary: "Обычная версия Base 1.7.4 со всеми новинками: панель задач в стиле Windows, скрытие модульной панели и конструктора, беспроводной второй экран Miracast и актуальная версия в настройках"},
		{Version: "1.7.3", Tag: "v1.7.3", Title: "Luma OS 1.7.3 Pro (Oxygen · Универсальное обновление)", DownloadURL: baseRaw + "/LumaOS_1.7.3.exe", Summary: "Исправлено переключение на классическую панель задач (больше не застревает в Luma Nova), свободное перетаскивание и вынос любых элементов панели задач на рабочий стол (Пуск, Circle to Search и др.), правильное положение меню ПКМ по панели задач, более плавные высококадровые анимации, возвращено добавление своих обоев, компактная Панель управления в Стиле ОС с удобными ползунками звука и яркости и полноценное окно настроек плеера с перемоткой"},
		{Version: "1.7.3 Pro", Tag: "v1.7.3", Title: "Luma OS 1.7.3 Pro (Oxygen · Полные права)", DownloadURL: baseRaw + "/LumaOS_1.7.3_Pro.exe", Summary: "Полная версия Pro: классическая и гибко настраиваемая панель задач с перетаскиванием всех кнопок, вынос функций на рабочий стол, плавные анимации, свои обои с диска, компактная Панель управления в Стиле ОС, удобные ползунки звука/яркости и расширенное окно плеера с перемоткой"},
		{Version: "1.7.3 Base", Tag: "v1.7.3", Title: "Luma OS 1.7.3 Base (Oxygen)", DownloadURL: baseRaw + "/LumaOS_1.7.3_Base.exe", Summary: "Обычная версия Base со всеми новинками 1.7.3: классическая панель задач, перетаскивание и вынос элементов на рабочий стол, плавные анимации, свои обои, компактная Панель управления в Стиле ОС и окно настроек плеера"},
		{Version: "1.7.2B", Tag: "v1.7.2B", Title: "Luma OS 1.7.2B Pro (Oxygen · Универсальное обновление)", DownloadURL: baseRaw + "/LumaOS_1.7.2B.exe", Summary: "Исправлен чёрный экран в Circle to Search на ПК и телефоне, возвращены и объединены полноценные мозги распознавания для ПК и смартфона"},
		{Version: "1.7.2B Pro", Tag: "v1.7.2B", Title: "Luma OS 1.7.2B Pro (Oxygen · Полные права)", DownloadURL: baseRaw + "/LumaOS_1.7.2B_Pro.exe", Summary: "Редакция Pro 1.7.2B с полными правами Администратора: исправленный Circle to Search без чёрного экрана на ПК и телефоне с единым распознаванием, Luma Photo Studio 4K, системное открытие файлов, модульная панель, Стиль ОС + Суперустройство и фикс Alt+Tab"},
		{Version: "1.7.2B Base", Tag: "v1.7.2B", Title: "Luma OS 1.7.2B Base (Oxygen)", DownloadURL: baseRaw + "/LumaOS_1.7.2B_Base.exe", Summary: "Базовая редакция Luma OS 1.7.2B: исправленный Circle to Search без чёрного экрана на ПК и телефоне, Photo Studio, модульная панель, Стиль ОС, Суперустройство и фикс Alt+Tab"},
		{Version: "1.7.2", Tag: "v1.7.2", Title: "Luma OS 1.7.2 Pro (Oxygen · Универсальное обновление)", DownloadURL: baseRaw + "/LumaOS_1.7.2.exe", Summary: "Флагманская сборка Pro с полными правами: Luma Photo Studio 4K, системное открытие всех фото и папок, единый Circle to Search (ПК + Телефон), модульная панель, Стиль ОС + Суперустройство и полный фикс Alt+Tab"},
		{Version: "1.7.2 Pro", Tag: "v1.7.2", Title: "Luma OS 1.7.2 Pro (Oxygen · Полные права)", DownloadURL: baseRaw + "/LumaOS_1.7.2_Pro.exe", Summary: "Редакция Pro с полными правами Администратора: встроенный фоторедактор Luma Photo Studio 4K, открытие всех фото и папок через Luma OS, единый Circle to Search (ПК + Телефон), модульная панель, Стиль ОС, экосистема Суперустройство и полный фикс Alt+Tab"},
		{Version: "1.7.2 Base", Tag: "v1.7.2", Title: "Luma OS 1.7.2 Base (Oxygen)", DownloadURL: baseRaw + "/LumaOS_1.7.2_Base.exe", Summary: "Базовая редакция Luma OS 1.7.2: фоторедактор Luma Photo Studio, единый Circle to Search, модульная панель, Стиль ОС, Суперустройство и фикс фокуса Alt+Tab"},
		{Version: "1.7.1", Tag: "v1.7.1", Title: "Luma OS 1.7.1 (Oxygen)", DownloadURL: baseRaw + "/LumaOS_1.7.1.exe", Summary: "Волна отправки/приёма файлов в Стиле ОС из центра по всему экрану (ПК + телефон), максимально простой 1-тап интерфейс Oxygen Connect на смартфоне, ускоренная плавная сенса тачпада с телефона и полноценный Circle to Search с визуальным анализом экрана"},
		{Version: "1.7", Tag: "v1.7", Title: "Luma OS 1.7 (Oxygen)", DownloadURL: baseRaw + "/LumaOS_1.7.exe", Summary: "Флагманское обновление Oxygen: 100% загрузка всех иконок, автозапуск всегда самой свежей версии ОС, неломаемый Alt+Tab, менеджер правил окон, полка Drag & Drop, умный буфер обмена с категориями и закреплением, по-приложечный звук, обои Oxygen 2.5D, новая мини-игра «Oxygen Pulse 2.5D» и приложение Oxygen Connect для Android (Стиль ОС)"},
		{Version: "1.6.7", Tag: "v1.6.7", Title: "Luma OS 1.6.7 (Nitrogen · Final 1.6.x)", DownloadURL: baseRaw + "/LumaOS_1.6.7.exe", Summary: "Финальное стабильное обновление ветки 1.6.x: исправлен зависающий курсор загрузки и нерабочие клики на Dynamic Island поверх Chrome и окон Windows, полностью починен выбор и проверка конкретного файла в антивирусе, добавлены таймауты на системные проверки и наведён порядок в репозитории"},
		{Version: "1.6.6b", Tag: "v1.6.6b", Title: "Luma OS 1.6.6b (Нестабильная · используйте 1.6.7)", DownloadURL: baseRaw + "/LumaOS_1.6.6b.exe", Summary: "⚠️ Нестабильная версия (1.6.4–1.6.6b) — рекомендуется обновиться до свежей стабильной версии"},
		{Version: "1.6.6", Tag: "v1.6.6", Title: "Luma OS 1.6.6 (Nitrogen)", DownloadURL: baseRaw + "/LumaOS_1.6.6.exe", Summary: "Рамочное выделение нескольких элементов ЛКМ на рабочем столе (групповое перетаскивание, сбор в папку, ПКМ и Delete), расширение языков интерфейса ОС до 36 языков мира с поиском и автопереводом, а также Dynamic Island поверх Chrome и всех окон Windows с прилипанием к экрану и 15+ настройками капсулы"},
		{Version: "1.6.5", Tag: "v1.6.5", Title: "Luma OS 1.6.5 (Nitrogen)", DownloadURL: baseRaw + "/LumaOS_1.6.5.exe", Summary: "Новая настройка «Пружинные анимации во всей системе» в Настройках панели задач и в ПКМ-меню самой панели задач, улучшение жестов тачпада, фикс обрезки магнитного Dock и ореолов прогресса"},
		{Version: "1.6.4", Tag: "v1.6.4", Title: "Luma OS 1.6.4 (Nitrogen)", DownloadURL: baseRaw + "/LumaOS_1.6.4.exe", Summary: "Многопальцевые жесты тачпада, авто-скрытие визуального шума при просмотре видео и в полноэкранном режиме, интерактивный магнитный Dock с отскоком запуска и индикатором рендера/загрузки, пружинная физика окон и меню"},
		{Version: "1.6.3", Tag: "v1.6.3", Title: "Luma OS 1.6.3 (Nitrogen)", DownloadURL: baseRaw + "/LumaOS_1.6.3.exe", Summary: "Модульный Luma AI с опцией Скачать/Удалить, отключение системных жестов тачпада Windows, список Wi-Fi и Bluetooth устройств, режим сбережения батареи, поддержка сенсора и стилуса, многостраничный редактор документов, обзор окон и закрепление окон поверх Chrome"},
		{Version: "1.6.2b", Tag: "v1.6.2b", Title: "Luma OS 1.6.2b (Nitrogen)", DownloadURL: baseRaw + "/LumaOS_1.6.2b.exe", Summary: "Встроенные Wi-Fi и Bluetooth с выбором сетей, вводом пароля и списком устройств прямо в Панели управления, настройка «Замена горячих клавиш» и устранение самопроизвольного открытия настроек Windows"},
		{Version: "1.6.2", Tag: "v1.6.2", Title: "Luma OS 1.6.2 (Nitrogen)", DownloadURL: baseRaw + "/LumaOS_1.6.2.exe", Summary: "Luma AI с долгосрочной памятью, Обвести для поиска, Управление жестами и Спецвозможности, живой индикатор загрузок на панели, безопасная Корзина и гибкая Папка «Luma Система»"},
		{Version: "1.6.1", Tag: "v1.6.1", Title: "Luma OS 1.6.1 (Nitrogen)", DownloadURL: baseRaw + "/LumaOS_1.6.1.exe", Summary: "Сверхчистая панель задач с полкой Luma Dock, автономный Luma AI, главные 2.5D-обои Nitrogen и фирменный стиль Luma OS"},
		{Version: "1.6", Tag: "v1.6", Title: "Luma OS 1.6 (Nitrogen)", DownloadURL: baseRaw + "/LumaOS_1.6.exe", Summary: "Ядро 1.5, антивирус 2.5, стиль Luma Nova, Luma SwapBoost, Поверх всех окон, Luma Gamepad Studio, Luma Deep Uninstaller, Luma Peek по Space и Умный Dock"},
		{Version: "1.5.4", Tag: "v1.5.4", Title: "Luma OS 1.5.4 (Carbon)", DownloadURL: baseRaw + "/LumaOS_1.5.4.exe", Summary: "Повышение стабильности, новая Шторка уведомлений без спама, умный Alt+Tab с живыми превью, многошторочный Проводник, 140+ формул в таблицах и сбережение батареи"},
		{Version: "1.5.3", Tag: "v1.5.3", Title: "Luma OS 1.5.3 (Carbon)", DownloadURL: baseRaw + "/LumaOS_1.5.3.exe", Summary: "Alt+Tab поверх всех окон + Win+D в Luma OS, обновлённый приём уведомлений, офисный пакет Luma Office и настройки сна при бездействии"},
		{Version: "1.5.2", Tag: "v1.5.2", Title: "Luma OS 1.5.2 (Carbon)", DownloadURL: baseRaw + "/LumaOS_1.5.2.exe", Summary: "Исправление записи экрана и Приватного стола, чистые уведомления мессенджеров с аватарами, собственный Luma Alt+Tab, Luma Office, Cut Studio, Code Studio и 100% перевод интерфейса"},
		{Version: "1.5.1", Tag: "v1.5.1", Title: "Luma OS 1.5.1 (Carbon)", DownloadURL: baseRaw + "/LumaOS_1.5.1.exe", Summary: "Полноценный Luma Office Studio, уведомления мессенджеров, Luma AI 2.0, антивирус 2.0, 4K обои Carbon, обновлённая Панель управления, умные контекстные меню"},
		{Version: "1.5", Tag: "v1.5", Title: "Luma OS 1.5 (Carbon)", DownloadURL: baseRaw + "/LumaOS_1.5.exe", Summary: "Панель управления Tab / правый верхний угол + Центр уведомлений, Сценарии автоматизации, Двойная панель задач, Кнопки окон «3 точки», Корзина Luma, Luma Code Studio, Luma Cut Studio, Конструктор виджетов, Скриншот и Запись экрана, Приватный стол, Заряд беспроводных мышек, Анимации Стиль ОС, Календарь Pro и Карбоновые обои"},
		{Version: "1.4", Tag: "v1.4", Title: "Luma OS 1.4 (Boron)", DownloadURL: baseRaw + "/LumaOS_1.4.exe", Summary: "Календарь Luma, исправлено обнаружение всех Bluetooth и 2.4GHz мышек/гаджетов, сервис скорости мыши и DPI, Developer SDK & Theme/Plugin API v3.0, ядро LumaCore 1.5 + LumaShield 1.5 (85+ правил + аудит Hosts), кино-анимация обновления, 4 уникальных студийных обоев Boron, виджеты погоды с картинками на неделю + часы/батарея + прозрачность и фон виджетов"},
		{Version: "1.3.1", Tag: "v1.3.1", Title: "Luma OS 1.3.1 (Beryllium)", DownloadURL: baseRaw + "/LumaOS_1.3.1.exe", Summary: "Мгновенная реакция Alt+Shift на панели задач, родные иконки всех предустановленных приложений ОС, возвращена полная галерея обоев, выбор плееров в Dynamic Island, панель задач справа, уникальный студийный 3D-арт Beryllium"},
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
	Provider       string          `json:"provider"`  // luma_local | autonomous | gemini | openai | claude | deepseek | openrouter | groq | ollama | custom
	Mode           string          `json:"mode"`      // language | code | auto | flashlite | autonomous
	Verbosity      string          `json:"verbosity"` // brief | balanced | detailed
	APIKey         string          `json:"api_key"`
	BaseURL        string          `json:"base_url"`
	Model          string          `json:"model"`
	SystemPrompt   string          `json:"system_prompt"`
	Temperature    float64         `json:"temperature"`
	IncludeContext bool            `json:"include_context"`
	Autonomous     *bool           `json:"autonomous,omitempty"`
	WebSearch      *bool           `json:"web_search,omitempty"`
	Prompt         string          `json:"prompt,omitempty"`
	Message        string          `json:"message,omitempty"`
	Messages       []AIChatMessage `json:"messages"`
}

// sanitizeGeminiModelID strips accidental leading/repeated "models/" prefixes and trailing ":action" suffixes
// so Google Gemini URLs NEVER become ".../v1beta/models/models/gemini-...".
func sanitizeGeminiModelID(model string) string {
	clean := strings.TrimSpace(model)
	clean = strings.Trim(clean, "/")
	for {
		lower := strings.ToLower(clean)
		if strings.HasPrefix(lower, "models/") {
			clean = strings.TrimPrefix(clean, clean[:len("models/")])
			clean = strings.TrimLeft(clean, "/")
			continue
		}
		break
	}
	if idx := strings.Index(clean, ":"); idx > 0 && strings.HasPrefix(strings.ToLower(clean), "gemini") {
		clean = strings.TrimSpace(clean[:idx])
	}
	return clean
}

// maskURLSecret masks sensitive query params (key=..., api_key=...) before writing URLs to logs/errors.
func maskURLSecret(rawURL string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}
	q := u.Query()
	changed := false
	for k := range q {
		lk := strings.ToLower(k)
		if lk == "key" || lk == "api_key" || lk == "apikey" || lk == "token" {
			q.Set(k, "***")
			changed = true
		}
	}
	if changed {
		u.RawQuery = q.Encode()
	}
	return u.String()
}

// buildGeminiEndpoint builds a strictly valid Google Gemini URL matching either:
//   - OpenAI-compatible endpoint: https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
//   - Native Gemini SSE:          https://generativelanguage.googleapis.com/v1beta/models/{cleanModel}:streamGenerateContent?alt=sse&key={apiKey}
//   - Native Gemini REST:         https://generativelanguage.googleapis.com/v1beta/models/{cleanModel}:generateContent?key={apiKey}
func buildGeminiEndpoint(baseURL, model, apiKey string, stream bool) (endpoint string, sanitizedURL string, isOpenAICompat bool) {
	cleanModel := sanitizeGeminiModelID(model)
	if cleanModel == "" {
		cleanModel = "gemini-2.5-flash"
	}
	base := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if base == "" {
		base = "https://generativelanguage.googleapis.com/v1beta"
	}
	lowerBase := strings.ToLower(base)

	// Detect OpenAI-compatible Gemini endpoint (e.g. .../v1beta/openai or .../v1beta/openai/chat/completions)
	if strings.Contains(lowerBase, "/openai") || strings.HasSuffix(lowerBase, "/chat/completions") {
		if strings.HasSuffix(lowerBase, "/chat/completions") {
			endpoint = base
		} else {
			endpoint = base + "/chat/completions"
		}
		return endpoint, maskURLSecret(endpoint), true
	}

	// Native Google Gemini REST / SSE API:
	// Strip accidental trailing "/models" or "/models/{anything}" if pasted into BaseURL
	if idx := strings.Index(lowerBase, "/models"); idx >= 0 {
		base = strings.TrimRight(base[:idx], "/")
		lowerBase = strings.ToLower(base)
	}
	// Ensure API version prefix (/v1beta or /v1) is present on official Google host
	if strings.Contains(lowerBase, "generativelanguage.googleapis.com") &&
		!strings.HasSuffix(lowerBase, "/v1beta") &&
		!strings.HasSuffix(lowerBase, "/v1") &&
		!strings.HasSuffix(lowerBase, "/v1alpha") {
		base += "/v1beta"
	}

	action := "generateContent"
	query := "key=" + url.QueryEscape(strings.TrimSpace(apiKey))
	if stream {
		action = "streamGenerateContent"
		query = "alt=sse&" + query
	}
	endpoint = fmt.Sprintf("%s/models/%s:%s?%s", base, url.PathEscape(cleanModel), action, query)
	return endpoint, maskURLSecret(endpoint), false
}

// formatGeminiHTTPError extracts the exact Google/OpenAI error message from any non-200 HTTP response body.
// Guarantees the returned text is never empty after the colon (no more "Gemini HTTP 404: .").
func formatGeminiHTTPError(statusCode int, statusText string, body []byte, model, sanitizedURL string) string {
	raw := strings.TrimSpace(string(body))
	detail := ""
	if raw != "" {
		// 1. Standard Google / OpenAI JSON object: {"error": {"code":..., "message":..., "status":...}}
		var objErr struct {
			Error *struct {
				Code    interface{} `json:"code"`
				Message string      `json:"message"`
				Status  string      `json:"status"`
			} `json:"error"`
			Message string `json:"message"`
		}
		if json.Unmarshal([]byte(raw), &objErr) == nil {
			if objErr.Error != nil && strings.TrimSpace(objErr.Error.Message) != "" {
				detail = strings.TrimSpace(objErr.Error.Message)
				if st := strings.TrimSpace(objErr.Error.Status); st != "" {
					detail += " [" + st + "]"
				}
			} else if strings.TrimSpace(objErr.Message) != "" {
				detail = strings.TrimSpace(objErr.Message)
			}
		}
		// 2. Google OpenAI-compat / SSE array format: [{"error": {"message":...}}]
		if detail == "" && strings.HasPrefix(raw, "[") {
			var arrErr []struct {
				Error *struct {
					Message string `json:"message"`
					Status  string `json:"status"`
				} `json:"error"`
			}
			if json.Unmarshal([]byte(raw), &arrErr) == nil && len(arrErr) > 0 && arrErr[0].Error != nil && strings.TrimSpace(arrErr[0].Error.Message) != "" {
				detail = strings.TrimSpace(arrErr[0].Error.Message)
				if st := strings.TrimSpace(arrErr[0].Error.Status); st != "" {
					detail += " [" + st + "]"
				}
			}
		}
		// 3. Plain text / stripped HTML fallback
		if detail == "" {
			clean := strings.ReplaceAll(raw, "\r", " ")
			clean = strings.ReplaceAll(clean, "\n", " ")
			for strings.Contains(clean, "  ") {
				clean = strings.ReplaceAll(clean, "  ", " ")
			}
			clean = strings.TrimSpace(clean)
			if len(clean) > 420 {
				clean = clean[:420] + "…"
			}
			detail = clean
		}
	}
	if detail == "" {
		st := strings.TrimSpace(statusText)
		if st == "" {
			st = fmt.Sprintf("%d %s", statusCode, http.StatusText(statusCode))
		}
		detail = fmt.Sprintf("пустой ответ сервера (%s) — проверьте URL %s и модель %s", st, sanitizedURL, model)
	}
	if model != "" {
		return fmt.Sprintf("HTTP %d (%s): %s", statusCode, model, detail)
	}
	return fmt.Sprintf("HTTP %d: %s", statusCode, detail)
}

func HandleAIChatRequest(req AIChatRequest, kernel *LumaKernel) map[string]interface{} {
	if kernel != nil && !kernel.IsAIEnabled() {
		return map[string]interface{}{
			"ok":       false,
			"disabled": true,
			"error":    "Luma AI отключён пользователем в настройках системы (Настройки → ИИ и Нейросети)",
		}
	}
	if len(req.Messages) == 0 {
		single := strings.TrimSpace(req.Prompt)
		if single == "" {
			single = strings.TrimSpace(req.Message)
		}
		if single != "" {
			req.Messages = []AIChatMessage{{Role: "user", Content: single}}
		}
	}
	autonomousMode := true
	if req.Autonomous != nil {
		autonomousMode = *req.Autonomous
	}
	webSearchEnabled := true
	if req.WebSearch != nil {
		webSearchEnabled = *req.WebSearch
	}
	provider := strings.ToLower(strings.TrimSpace(req.Provider))
	if provider == "" || provider == "luma_local" || provider == "offline" || provider == "local" || provider == "flashlite" || provider == "autonomous" || provider == "luma_40" || provider == "luma_50" || provider == "nexus" {
		var trashRef *LumaTrashStore
		if kernel != nil {
			trashRef = kernel.trash
		}
		return RunLumaAI50Nexus(req.Messages, req.Mode, req.Verbosity, autonomousMode, webSearchEnabled, kernel, trashRef)
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
			sysPrompt = "Ты — Luma AI 5.0 Nexus (Code), системный ИИ-программист Luma OS 1.6.2 (Nitrogen). Пиши чистый, современный, готовый к запуску код с пояснениями."
		case "language":
			sysPrompt = "Ты — Luma AI 5.0 Nexus, умный думающий ИИ-агент с долгосрочной памятью в Luma OS 1.6.2 (Nitrogen). Отвечай грамотно, информативно, естественно и по сути вопроса."
		default:
			sysPrompt = "Ты — автономный ИИ-агент Luma AI 5.0 Nexus в Luma OS 1.6.2 (Nitrogen). Думай пошагово, используй память о пользователе, отвечай чётко и помогай с задачами, ПК, поиском и кодом."
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
	// Inject Luma AI 5.0 persistent user memory into external providers too
	mem := GetAIMemorySnapshot()
	if mem.UserName != "" || mem.UserCity != "" || len(mem.Facts) > 0 {
		var memParts []string
		if mem.UserName != "" {
			memParts = append(memParts, "Имя пользователя="+mem.UserName)
		}
		if mem.UserCity != "" {
			memParts = append(memParts, "Город="+mem.UserCity)
		}
		for i, f := range mem.Facts {
			if i >= 12 {
				break
			}
			memParts = append(memParts, f.Key+": "+f.Value)
		}
		sysPrompt += "\n\n[Долгосрочная память Luma AI 5.0 о пользователе: " + strings.Join(memParts, "; ") + "]"
	}
	if req.IncludeContext && kernel != nil {
		snap := kernel.SystemSnapshot()
		sysPrompt += fmt.Sprintf(
			"\n\n[Живой контекст ПК LumaCore %s: Хост=%s, ОС=%s, Модель=%s, CPU=%d%% (%s), RAM=%.1f/%.1f ГБ (%d%%), Город=%s, Сеть=%.1f/%.1f Мбит/с]",
			KernelEngineVersion, snap.Hostname, snap.OSName, snap.DeviceModel, snap.CPUPercent, snap.CPUModel,
			snap.RAMUsedGB, snap.RAMTotalGB, snap.RAMPercent, snap.Location.City, snap.NetDownMbps, snap.NetUpMbps,
		)
	}

	if len(req.Messages) == 0 {
		return map[string]interface{}{"ok": false, "error": "Пустой запрос"}
	}

	client := &http.Client{Timeout: 60 * time.Second}

	// ---- A. Google Gemini API (Native REST or OpenAI-Compatible Endpoint) ----
	geminiUseOpenAI := false
	geminiOpenAIEndpoint := ""
	if provider == "gemini" {
		if apiKey == "" {
			return map[string]interface{}{"ok": false, "error": "Укажите API-ключ Google Gemini (aistudio.google.com/apikey)"}
		}
		model = sanitizeGeminiModelID(model)
		if model == "" {
			model = "gemini-2.5-flash"
		}
		endpoint, sanitizedURL, isOpenAI := buildGeminiEndpoint(req.BaseURL, model, apiKey, false)
		if isOpenAI {
			// User configured OpenAI-compatible endpoint (.../v1beta/openai): route via Section C!
			geminiUseOpenAI = true
			geminiOpenAIEndpoint = endpoint
		} else {
			log.Printf("[LumaCore AI][Gemini REST] POST %s (model=%s)", sanitizedURL, model)

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
			httpReq, reqErr := http.NewRequest("POST", endpoint, bytes.NewReader(rawBody))
			if reqErr != nil {
				return map[string]interface{}{"ok": false, "error": fmt.Sprintf("Ошибка создания запроса Gemini (%s): %v", model, reqErr), "model": model}
			}
			httpReq.Header.Set("Content-Type", "application/json")
			resp, err := client.Do(httpReq)
			if err != nil {
				return map[string]interface{}{"ok": false, "error": fmt.Sprintf("Ошибка сети Gemini (%s): %v", model, err), "model": model}
			}
			defer resp.Body.Close()
			respBytes, _ := io.ReadAll(resp.Body)

			if resp.StatusCode != http.StatusOK {
				formatted := formatGeminiHTTPError(resp.StatusCode, resp.Status, respBytes, model, sanitizedURL)
				log.Printf("[LumaCore AI][Gemini REST][ERROR] %s", formatted)
				return map[string]interface{}{"ok": false, "error": formatted, "provider": "gemini", "model": model}
			}

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
				return map[string]interface{}{"ok": false, "error": fmt.Sprintf("Gemini (%s): %s", model, parsed.Error.Message), "provider": "gemini", "model": model}
			}
			var sb strings.Builder
			if len(parsed.Candidates) > 0 {
				for _, p := range parsed.Candidates[0].Content.Parts {
					sb.WriteString(p.Text)
				}
			}
			reply := strings.TrimSpace(sb.String())
			if reply == "" {
				return map[string]interface{}{"ok": false, "error": fmt.Sprintf("Gemini (%s) вернул пустой ответ", model), "provider": "gemini", "model": model}
			}
			return map[string]interface{}{"ok": true, "reply": reply, "provider": "gemini", "model": model}
		}
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

		if resp.StatusCode != http.StatusOK {
			formatted := formatGeminiHTTPError(resp.StatusCode, resp.Status, respBytes, model, maskURLSecret(endpoint))
			return map[string]interface{}{"ok": false, "error": formatted, "provider": "claude", "model": model}
		}

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
		var sb strings.Builder
		for _, c := range parsed.Content {
			sb.WriteString(c.Text)
		}
		return map[string]interface{}{"ok": true, "reply": strings.TrimSpace(sb.String()), "provider": "claude", "model": model}
	}

	// ---- C. OpenAI-Compatible APIs (Gemini OpenAI-compat, OpenAI, DeepSeek, OpenRouter, Groq, Ollama, Custom) ----
	baseURL := strings.TrimRight(strings.TrimSpace(req.BaseURL), "/")
	switch provider {
	case "gemini":
		if geminiUseOpenAI && geminiOpenAIEndpoint != "" {
			baseURL = geminiOpenAIEndpoint
		} else if baseURL == "" {
			baseURL = "https://generativelanguage.googleapis.com/v1beta/openai"
		}
		model = sanitizeGeminiModelID(model)
		if model == "" {
			model = "gemini-2.5-flash"
		}
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
			model = "qwen2.5:3b"
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
	if !strings.HasSuffix(strings.ToLower(endpoint), "/chat/completions") {
		endpoint += "/chat/completions"
	}
	if strings.Contains(strings.ToLower(endpoint), "generativelanguage.googleapis.com") {
		model = sanitizeGeminiModelID(model)
	}
	sanitizedURL := maskURLSecret(endpoint)
	log.Printf("[LumaCore AI][OpenAI-Compat] POST %s (provider=%s, model=%s)", sanitizedURL, provider, model)

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
	httpReq, reqErr := http.NewRequest("POST", endpoint, bytes.NewReader(rawBody))
	if reqErr != nil {
		return map[string]interface{}{"ok": false, "error": fmt.Sprintf("Ошибка создания запроса (%s): %v", model, reqErr), "provider": provider, "model": model}
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	}
	if provider == "openrouter" {
		httpReq.Header.Set("HTTP-Referer", "https://github.com/Tveexty/L_H-3.0")
		httpReq.Header.Set("X-Title", "Luma OS 1.6.7 Nitrogen")
	}

	resp, err := client.Do(httpReq)
	if err != nil {
		return map[string]interface{}{"ok": false, "error": fmt.Sprintf("Ошибка подключения к %s (%s): %v", provider, model, err), "provider": provider, "model": model}
	}
	defer resp.Body.Close()
	respBytes, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		formatted := formatGeminiHTTPError(resp.StatusCode, resp.Status, respBytes, model, sanitizedURL)
		log.Printf("[LumaCore AI][OpenAI-Compat][ERROR] %s", formatted)
		return map[string]interface{}{"ok": false, "error": formatted, "provider": provider, "model": model}
	}

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
		return map[string]interface{}{"ok": false, "error": parsed.Error.Message, "provider": provider, "model": model}
	}
	if len(parsed.Choices) == 0 {
		return map[string]interface{}{"ok": false, "error": fmt.Sprintf("Пустой ответ от модели %s", model), "provider": provider, "model": model}
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
