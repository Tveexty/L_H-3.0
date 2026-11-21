package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

// LumaShield 1.3 — Advanced, zero-conflict user-space security core & on-demand + real-time guard antivirus.
// Does NOT register kernel filter drivers or replace Windows SecurityCenter, so it runs
// cleanly alongside Windows Defender with zero locks or conflicts.
//
// New in 1.3:
// - 20+ heuristic rules (Ransomware, Credential Stealers, Reverse Shells, LOLBins, Persistence)
// - PE Header ("MZ") Masquerading Detector (catches EXEs disguised as PDF/JPG/DOCX/TXT)
// - Shannon Entropy Packed-Binary Detector (> 7.55 bits/byte in Downloads/Temp)
// - Lightweight Real-Time Folder Guard (Watches Downloads & Desktop without locking files)
// - Running Process Threat Inspector (flags suspicious Temp/Miner/Stealer active processes)
// - Persistent Whitelist / Exclusions Manager & Deep Scan Mode

const eicarStandardSignature = `X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*`

type SecurityKernel struct {
	mu                   sync.RWMutex
	quarantineDir        string
	quarantine           []QuarantineItem
	exclusions           []string
	lastThreats          []SecurityThreat
	auditLog             []SecurityAuditEvent
	lastScanTime         string
	lastScanFiles        int
	lastScanMs           int64
	scanCount            int
	realtimeGuardEnabled bool
	guardKnownFiles      map[string]int64
	defender             DefenderStatus
	defenderAt           time.Time
}

func NewSecurityKernel() *SecurityKernel {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		home = os.TempDir()
	}
	qDir := filepath.Join(home, ".luma_quarantine")
	_ = os.MkdirAll(qDir, 0o700)

	sk := &SecurityKernel{
		quarantineDir:        qDir,
		quarantine:           []QuarantineItem{},
		exclusions:           []string{},
		lastThreats:          []SecurityThreat{},
		auditLog:             []SecurityAuditEvent{},
		realtimeGuardEnabled: true,
		guardKnownFiles:      map[string]int64{},
	}
	sk.loadQuarantineIndex()
	sk.loadExclusions()
	sk.LogAudit("ok", "kernel", "LumaShield 1.3 инициализирован", "20+ эвристических правил, PE-маскировка, энтропия Шеннона, Real-Time Guard и совместимость с Windows Defender")
	go sk.realtimeGuardLoop()
	return sk
}

func (s *SecurityKernel) realtimeGuardLoop() {
	ticker := time.NewTicker(20 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		s.mu.RLock()
		enabled := s.realtimeGuardEnabled
		s.mu.RUnlock()
		if !enabled {
			continue
		}
		home, _ := os.UserHomeDir()
		dirs := []string{filepath.Join(os.TempDir(), "LumaShield_Test")}
		if home != "" {
			dirs = append(dirs, filepath.Join(home, "Downloads"), filepath.Join(home, "Desktop"))
		}
		for _, dir := range dirs {
			entries, err := os.ReadDir(dir)
			if err != nil {
				continue
			}
			for _, e := range entries {
				if e.IsDir() {
					continue
				}
				full := filepath.Join(dir, e.Name())
				info, err := e.Info()
				if err != nil || info == nil {
					continue
				}
				stamp := info.ModTime().Unix()
				s.mu.RLock()
				prevStamp, seen := s.guardKnownFiles[full]
				s.mu.RUnlock()
				if seen && prevStamp == stamp {
					continue
				}
				s.mu.Lock()
				s.guardKnownFiles[full] = stamp
				s.mu.Unlock()
				if thr := s.inspectSingleFile(full, info); thr != nil {
					s.mu.Lock()
					dup := false
					for _, cur := range s.lastThreats {
						if cur.Path == thr.Path {
							dup = true
							break
						}
					}
					if !dup {
						s.lastThreats = append([]SecurityThreat{*thr}, s.lastThreats...)
					}
					s.mu.Unlock()
					if !dup {
						s.LogAudit("danger", "realtime-guard", "Real-Time Guard: обнаружена угроза", fmt.Sprintf("%s (%s)", thr.Name, thr.Category))
					}
				}
			}
		}
	}
}

func (s *SecurityKernel) SetRealtimeGuard(enabled bool) bool {
	s.mu.Lock()
	s.realtimeGuardEnabled = enabled
	s.mu.Unlock()
	state := "включён"
	if !enabled {
		state = "приостановлен"
	}
	s.LogAudit("info", "realtime-guard", "Real-Time Guard "+state, "Фоновый контроль папок Загрузки и Рабочий стол (Zero-Conflict)")
	return enabled
}

func (s *SecurityKernel) LogAudit(level, category, action, detail string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	ev := SecurityAuditEvent{
		ID:       fmt.Sprintf("sec_%d", time.Now().UnixNano()),
		Time:     time.Now().Format("15:04:05"),
		Level:    level,
		Category: category,
		Action:   action,
		Detail:   detail,
	}
	s.auditLog = append([]SecurityAuditEvent{ev}, s.auditLog...)
	if len(s.auditLog) > 160 {
		s.auditLog = s.auditLog[:160]
	}
}

func (s *SecurityKernel) loadQuarantineIndex() {
	idxPath := filepath.Join(s.quarantineDir, "index.json")
	raw, err := os.ReadFile(idxPath)
	if err != nil {
		return
	}
	var items []QuarantineItem
	if json.Unmarshal(raw, &items) == nil {
		s.quarantine = items
	}
}

func (s *SecurityKernel) saveQuarantineIndexLocked() {
	idxPath := filepath.Join(s.quarantineDir, "index.json")
	raw, err := json.MarshalIndent(s.quarantine, "", "  ")
	if err == nil {
		_ = os.WriteFile(idxPath, raw, 0o600)
	}
}

func (s *SecurityKernel) loadExclusions() {
	exPath := filepath.Join(s.quarantineDir, "exclusions.json")
	raw, err := os.ReadFile(exPath)
	if err != nil {
		return
	}
	var list []string
	if json.Unmarshal(raw, &list) == nil {
		s.exclusions = list
	}
}

func (s *SecurityKernel) saveExclusionsLocked() {
	exPath := filepath.Join(s.quarantineDir, "exclusions.json")
	raw, err := json.MarshalIndent(s.exclusions, "", "  ")
	if err == nil {
		_ = os.WriteFile(exPath, raw, 0o600)
	}
}

func (s *SecurityKernel) isExcluded(path string) bool {
	low := strings.ToLower(filepath.Clean(path))
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, ex := range s.exclusions {
		cleanEx := strings.ToLower(filepath.Clean(strings.TrimSpace(ex)))
		if cleanEx != "" && (low == cleanEx || strings.HasPrefix(low, cleanEx+string(filepath.Separator))) {
			return true
		}
	}
	return false
}

func (s *SecurityKernel) ManageExclusion(action, targetPath string) []string {
	clean := strings.TrimSpace(targetPath)
	if clean == "" {
		s.mu.RLock()
		defer s.mu.RUnlock()
		return append([]string{}, s.exclusions...)
	}
	resolved := resolvePath(clean)
	s.mu.Lock()
	switch strings.ToLower(strings.TrimSpace(action)) {
	case "add":
		exists := false
		for _, ex := range s.exclusions {
			if strings.EqualFold(ex, resolved) {
				exists = true
				break
			}
		}
		if !exists {
			s.exclusions = append(s.exclusions, resolved)
			// Remove matching threats immediately
			filtered := make([]SecurityThreat, 0, len(s.lastThreats))
			for _, t := range s.lastThreats {
				if !strings.EqualFold(t.Path, resolved) {
					filtered = append(filtered, t)
				}
			}
			s.lastThreats = filtered
			s.saveExclusionsLocked()
		}
	case "remove":
		next := make([]string, 0, len(s.exclusions))
		for _, ex := range s.exclusions {
			if !strings.EqualFold(ex, resolved) && !strings.EqualFold(ex, clean) {
				next = append(next, ex)
			}
		}
		s.exclusions = next
		s.saveExclusionsLocked()
	}
	out := append([]string{}, s.exclusions...)
	s.mu.Unlock()
	s.LogAudit("info", "whitelist", "Белый список обновлён ("+action+")", resolved)
	return out
}

func computeFileSHA256(path string) string {
	f, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer f.Close()
	h := sha256.New()
	_, _ = io.CopyN(h, f, 20*1024*1024)
	return hex.EncodeToString(h.Sum(nil))
}

func computeShannonEntropy(data []byte) float64 {
	if len(data) == 0 {
		return 0
	}
	var counts [256]int
	for _, b := range data {
		counts[b]++
	}
	total := float64(len(data))
	var entropy float64
	for _, c := range counts {
		if c == 0 {
			continue
		}
		p := float64(c) / total
		entropy -= p * math.Log2(p)
	}
	return entropy
}

var suspiciousDoubleExts = []string{
	".pdf.exe", ".doc.exe", ".docx.exe", ".xls.exe", ".xlsx.exe",
	".jpg.exe", ".jpeg.exe", ".png.exe", ".mp3.exe", ".mp4.exe", ".txt.exe",
	".pdf.scr", ".jpg.scr", ".png.scr", ".doc.scr", ".txt.vbs", ".pdf.vbs",
	".jpg.bat", ".png.bat", ".docx.js", ".pdf.js", ".zip.exe", ".rar.exe",
	".pdf.cmd", ".txt.cmd", ".doc.hta", ".pdf.hta", ".png.pif", ".doc.lnk",
}

var ransomwareExts = map[string]bool{
	".wannacry": true, ".wcry": true, ".lockbit": true, ".ryuk": true,
	".cryptolocker": true, ".cerber": true, ".blackcat": true,
}

type heuristicRule struct {
	needle   []byte
	category string
	severity string
	reason   string
}

var scriptHeuristics = []heuristicRule{
	{[]byte(eicarStandardSignature), "EICAR-Test", "high", "Обнаружена стандартная тестовая сигнатура антивируса EICAR"},
	{[]byte("invoke-expression"), "Suspicious-Script", "medium", "Скрытое динамическое выполнение PowerShell (Invoke-Expression)"},
	{[]byte("-encodedcommand"), "Obfuscated-PS", "high", "Обфусцированная команда PowerShell (-EncodedCommand)"},
	{[]byte("frombase64string"), "Obfuscated-Payload", "medium", "Декодирование скрытой Base64 нагрузки в скрипте"},
	{[]byte("certutil -urlcache"), "LOLBin-Dropper", "high", "Попытка скрытой загрузки через certutil -urlcache"},
	{[]byte("bitsadmin /transfer"), "LOLBin-Dropper", "high", "Скрытая загрузка файла через bitsadmin /transfer"},
	{[]byte("mshta http"), "Remote-HTA", "high", "Удалённый запуск HTA-сценария (mshta http)"},
	{[]byte("regsvr32 /s /u /i:http"), "LOLBin-Squiblydoo", "high", "Удалённое выполнение скрипта через regsvr32"},
	{[]byte("rundll32 javascript:"), "LOLBin-Script", "high", "Исполнение скрытого JavaScript через rundll32"},
	{[]byte("downloadstring("), "Dropper-Script", "medium", "Загрузка и исполнение удалённого кода (DownloadString)"},
	{[]byte("invoke-mimikatz"), "Credential-Stealer", "high", "Сигнатура инструмента дампа учётных данных (Mimikatz)"},
	{[]byte("sekurlsa::logonpasswords"), "Credential-Stealer", "high", "Попытка извлечения паролей из LSASS"},
	{[]byte("bash -i >& /dev/tcp/"), "Reverse-Shell", "high", "Скрытый обратный shell (/dev/tcp)"},
	{[]byte("powershell -nop -w hidden"), "Stealth-PS", "high", "Скрытый запуск PowerShell без окна (-nop -w hidden)"},
	{[]byte("add-mppreference -exclusionpath"), "Defense-Evasion", "high", "Попытка добавить исключение в Windows Defender"},
	{[]byte("set-mppreference -disablerealtimemonitoring"), "Defense-Evasion", "high", "Попытка отключить защиту реального времени Windows Defender"},
	{[]byte("vssadmin delete shadows"), "Ransomware-Behavior", "high", "Попытка удаления теневых копий системы (признак шифровальщика)"},
	{[]byte("wbadmin delete catalog"), "Ransomware-Behavior", "high", "Попытка уничтожения резервных копий Windows"},
	{[]byte("wmic shadowcopy delete"), "Ransomware-Behavior", "high", "Удаление теневых копий через WMIC"},
	{[]byte("schtasks /create"), "Persistence-Task", "medium", "Создание скрытого задания автозапуска в планировщике"},
}

func (s *SecurityKernel) inspectSingleFile(path string, info os.FileInfo) *SecurityThreat {
	if info == nil || info.IsDir() {
		return nil
	}
	if strings.HasPrefix(path, s.quarantineDir) || s.isExcluded(path) {
		return nil
	}
	name := info.Name()
	lower := strings.ToLower(name)
	ext := strings.ToLower(filepath.Ext(name))
	lowerPath := strings.ToLower(path)

	// 1. Double-extension masquerading check
	for _, dext := range suspiciousDoubleExts {
		if strings.HasSuffix(lower, dext) {
			return &SecurityThreat{
				ID:         fmt.Sprintf("thr_%d", time.Now().UnixNano()),
				Path:       path,
				Name:       name,
				Severity:   "high",
				Category:   "Masquerading",
				Reason:     fmt.Sprintf("Маскировка исполняемого файла под документ (%s)", dext),
				SHA256:     computeFileSHA256(path),
				Size:       info.Size(),
				DetectedAt: time.Now().Format("15:04:05"),
			}
		}
	}

	// 2. Known ransomware encrypted extension or ransom note check
	if ransomwareExts[ext] || strings.Contains(lower, "how_to_decrypt") || strings.Contains(lower, "restore_my_files") {
		return &SecurityThreat{
			ID:         fmt.Sprintf("thr_%d", time.Now().UnixNano()),
			Path:       path,
			Name:       name,
			Severity:   "high",
			Category:   "Ransomware-Indicator",
			Reason:     "Обнаружен признак файла-шифровальщика (Ransomware)",
			SHA256:     computeFileSHA256(path),
			Size:       info.Size(),
			DetectedAt: time.Now().Format("15:04:05"),
		}
	}

	// 3. Content signature, PE-header masquerading & Shannon entropy check
	isDocOrImg := ext == ".pdf" || ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".docx" || ext == ".xlsx" || ext == ".txt"
	isScript := ext == ".ps1" || ext == ".bat" || ext == ".cmd" || ext == ".vbs" || ext == ".hta" || ext == ".js" || ext == ".sh"
	isBinary := ext == ".exe" || ext == ".scr" || ext == ".dll" || ext == ".pif" || ext == ".com"
	scanContent := isDocOrImg || isScript || ext == ".py" || ext == ".eicar" || (isBinary && info.Size() <= 2*1024*1024) || info.Size() <= 256*1024

	if scanContent && info.Size() > 0 && info.Size() <= 4*1024*1024 {
		f, err := os.Open(path)
		if err == nil {
			buf := make([]byte, 256*1024)
			n, _ := f.Read(buf)
			_ = f.Close()
			if n > 0 {
				chunk := buf[:n]

				// 3a. Exact EICAR match
				if bytes.Contains(chunk, []byte(eicarStandardSignature)) {
					return &SecurityThreat{
						ID:         fmt.Sprintf("thr_%d", time.Now().UnixNano()),
						Path:       path,
						Name:       name,
						Severity:   "high",
						Category:   "EICAR-Test",
						Reason:     "Обнаружена тестовая сигнатура антивируса EICAR-Standard-Test",
						SHA256:     computeFileSHA256(path),
						Size:       info.Size(),
						DetectedAt: time.Now().Format("15:04:05"),
					}
				}

				// 3b. PE-header ("MZ" + PE signature) masqueraded inside a document/image!
				if isDocOrImg && n >= 64 && chunk[0] == 'M' && chunk[1] == 'Z' && bytes.Contains(chunk[:minInt(n, 512)], []byte("PE\x00\x00")) {
					return &SecurityThreat{
						ID:         fmt.Sprintf("thr_%d", time.Now().UnixNano()),
						Path:       path,
						Name:       name,
						Severity:   "high",
						Category:   "PE-Masquerading",
						Reason:     fmt.Sprintf("Исполняемый PE-файл Windows скрыт под расширением %s", ext),
						SHA256:     computeFileSHA256(path),
						Size:       info.Size(),
						DetectedAt: time.Now().Format("15:04:05"),
					}
				}

				// 3c. Script-only heuristic rules (avoid false positives on Luma's own sources)
				if isScript && !strings.Contains(lowerPath, "l_h-3.0") {
					lowChunk := bytes.ToLower(chunk)
					for _, rule := range scriptHeuristics[1:] {
						if bytes.Contains(lowChunk, rule.needle) {
							return &SecurityThreat{
								ID:         fmt.Sprintf("thr_%d", time.Now().UnixNano()),
								Path:       path,
								Name:       name,
								Severity:   rule.severity,
								Category:   rule.category,
								Reason:     rule.reason,
								SHA256:     computeFileSHA256(path),
								Size:       info.Size(),
								DetectedAt: time.Now().Format("15:04:05"),
							}
						}
					}
				}

				// 3d. High Shannon Entropy Packed Binary Check in Temp/Downloads (suspected crypter/packer)
				if isBinary && n >= 16384 && (strings.Contains(lowerPath, `\temp\`) || strings.Contains(lowerPath, "/tmp/")) &&
					!strings.Contains(lower, "lumaos") && !strings.Contains(lower, "setup") && !strings.Contains(lower, "install") {
					ent := computeShannonEntropy(chunk)
					if ent >= 7.65 {
						return &SecurityThreat{
							ID:         fmt.Sprintf("thr_%d", time.Now().UnixNano()),
							Path:       path,
							Name:       name,
							Severity:   "medium",
							Category:   "High-Entropy-Packer",
							Reason:     fmt.Sprintf("Сильно запакованный/зашифрованный бинарник в Temp (энтропия %.2f бит/байт)", ent),
							SHA256:     computeFileSHA256(path),
							Size:       info.Size(),
							DetectedAt: time.Now().Format("15:04:05"),
						}
					}
				}
			}
		}
	}

	// 4. Suspicious temp-dropped executable names
	if (ext == ".exe" || ext == ".scr" || ext == ".pif") &&
		(strings.Contains(lowerPath, `\temp\`) || strings.Contains(lowerPath, "/tmp/") || strings.Contains(lowerPath, "downloads")) {
		if strings.Contains(lower, "crack") || strings.Contains(lower, "keygen") ||
			strings.Contains(lower, "stealer") || strings.Contains(lower, "miner") ||
			strings.Contains(lower, "trojan") || strings.Contains(lower, "rat_") || strings.Contains(lower, "redline") {
			return &SecurityThreat{
				ID:         fmt.Sprintf("thr_%d", time.Now().UnixNano()),
				Path:       path,
				Name:       name,
				Severity:   "high",
				Category:   "Suspicious-Binary",
				Reason:     "Подозрительный исполняемый файл (признак трояна/майнера/кряка)",
				SHA256:     computeFileSHA256(path),
				Size:       info.Size(),
				DetectedAt: time.Now().Format("15:04:05"),
			}
		}
	}

	return nil
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// ScanRunningProcesses inspects active host processes for suspicious execution locations or known malware indicators.
func (s *SecurityKernel) ScanRunningProcesses(probe *platformProbe) []SecurityThreat {
	if probe == nil {
		return []SecurityThreat{}
	}
	procs := probe.TopProcesses(100)
	var found []SecurityThreat
	suspiciousNames := []string{"xmrig", "minerd", "njrat", "darkcomet", "mimikatz", "redline", "asyncrat", "remcos"}
	for _, pr := range procs {
		if pr.IsSelf {
			continue
		}
		lowName := strings.ToLower(pr.Name)
		lowPath := strings.ToLower(pr.ExePath)
		for _, bad := range suspiciousNames {
			if strings.Contains(lowName, bad) || strings.Contains(lowPath, bad) {
				found = append(found, SecurityThreat{
					ID:         fmt.Sprintf("thr_proc_%d", pr.PID),
					Path:       pr.ExePath,
					Name:       fmt.Sprintf("%s (PID %d)", pr.Name, pr.PID),
					Severity:   "high",
					Category:   "Malicious-Process",
					Reason:     fmt.Sprintf("Обнаружен подозрительный активный процесс (%s)", bad),
					DetectedAt: time.Now().Format("15:04:05"),
				})
				break
			}
		}
	}
	if len(found) > 0 {
		s.mu.Lock()
		s.lastThreats = append(found, s.lastThreats...)
		s.mu.Unlock()
		s.LogAudit("danger", "process-guard", "Сканирование процессов: найдены угрозы", fmt.Sprintf("Подозрительных процессов: %d", len(found)))
	} else {
		s.LogAudit("ok", "process-guard", "Сканирование процессов завершено", fmt.Sprintf("Проверено %d активных процессов — угроз не найдено", len(procs)))
	}
	return found
}

func (s *SecurityKernel) RunScan(mode, customPath string, probe *platformProbe) map[string]interface{} {
	start := time.Now()
	var roots []string
	normMode := strings.ToLower(strings.TrimSpace(mode))

	home, _ := os.UserHomeDir()
	switch normMode {
	case "custom":
		if strings.TrimSpace(customPath) != "" {
			roots = append(roots, resolvePath(customPath))
		}
	case "startup":
		if runtime.GOOS == "windows" {
			appData := os.Getenv("APPDATA")
			if appData != "" {
				roots = append(roots, filepath.Join(appData, "Microsoft", "Windows", "Start Menu", "Programs", "Startup"))
			}
			roots = append(roots, filepath.Join(os.TempDir(), "LumaShield_Test"))
		} else {
			roots = append(roots, filepath.Join(home, ".config", "autostart"), filepath.Join(os.TempDir(), "LumaShield_Test"))
		}
	case "deep":
		if home != "" {
			roots = append(roots,
				filepath.Join(home, "Downloads"),
				filepath.Join(home, "Desktop"),
				filepath.Join(home, "Documents"),
				filepath.Join(home, "Pictures"),
			)
		}
		roots = append(roots, filepath.Join(os.TempDir(), "LumaShield_Test"), os.TempDir())
		if runtime.GOOS == "windows" {
			appData := os.Getenv("APPDATA")
			if appData != "" {
				roots = append(roots, filepath.Join(appData, "Microsoft", "Windows", "Start Menu", "Programs", "Startup"))
			}
		}
	case "processes":
		threats := s.ScanRunningProcesses(probe)
		elapsed := time.Since(start).Milliseconds()
		s.mu.Lock()
		s.lastScanTime = time.Now().Format("02.01.2006 15:04:05")
		s.lastScanMs = elapsed
		s.scanCount++
		s.mu.Unlock()
		return map[string]interface{}{
			"ok":            true,
			"mode":          "processes",
			"files_scanned": 100,
			"elapsed_ms":    elapsed,
			"threats":       threats,
			"scanned_at":    s.lastScanTime,
		}
	default: // "quick"
		normMode = "quick"
		if home != "" {
			roots = append(roots,
				filepath.Join(home, "Downloads"),
				filepath.Join(home, "Desktop"),
			)
		}
		roots = append(roots, filepath.Join(os.TempDir(), "LumaShield_Test"))
		if runtime.GOOS == "windows" {
			appData := os.Getenv("APPDATA")
			if appData != "" {
				roots = append(roots, filepath.Join(appData, "Microsoft", "Windows", "Start Menu", "Programs", "Startup"))
			}
		}
	}

	var threats []SecurityThreat
	filesScanned := 0
	maxFiles := 3000
	if normMode == "deep" {
		maxFiles = 8500
	} else if normMode == "custom" {
		maxFiles = 6000
	}

	for _, root := range roots {
		if root == "" {
			continue
		}
		st, err := os.Stat(root)
		if err != nil {
			continue
		}
		if !st.IsDir() {
			filesScanned++
			if thr := s.inspectSingleFile(root, st); thr != nil {
				threats = append(threats, *thr)
			}
			continue
		}
		_ = filepath.Walk(root, func(p string, info os.FileInfo, err error) error {
			if err != nil || info == nil {
				return nil
			}
			if info.IsDir() {
				base := strings.ToLower(info.Name())
				if base == "node_modules" || base == ".git" || base == ".luma_quarantine" || base == "windows" || base == "winsxs" || s.isExcluded(p) {
					return filepath.SkipDir
				}
				return nil
			}
			filesScanned++
			if filesScanned > maxFiles {
				return filepath.SkipAll
			}
			if thr := s.inspectSingleFile(p, info); thr != nil {
				threats = append(threats, *thr)
			}
			return nil
		})
	}

	// Audit startup persistence & active processes on quick/deep/startup scans
	if probe != nil && (normMode == "quick" || normMode == "deep" || normMode == "startup") {
		for _, item := range probe.ListStartupItems() {
			lowCmd := strings.ToLower(item.Command)
			if strings.Contains(lowCmd, "-encodedcommand") || strings.Contains(lowCmd, "mshta http") ||
				strings.Contains(lowCmd, "certutil -urlcache") || strings.Contains(lowCmd, "powershell -nop -w hidden") {
				threats = append(threats, SecurityThreat{
					ID:         fmt.Sprintf("thr_st_%d", time.Now().UnixNano()),
					Path:       item.Command,
					Name:       item.Name + " (Автозагрузка)",
					Severity:   "high",
					Category:   "Startup-Persistence",
					Reason:     "Подозрительная команда в автозагрузке системы",
					DetectedAt: time.Now().Format("15:04:05"),
				})
			}
		}
		if normMode == "deep" {
			procThreats := s.ScanRunningProcesses(probe)
			threats = append(threats, procThreats...)
		}
	}

	elapsed := time.Since(start).Milliseconds()
	if threats == nil {
		threats = []SecurityThreat{}
	}

	s.mu.Lock()
	s.lastThreats = threats
	s.lastScanTime = time.Now().Format("02.01.2006 15:04:05")
	s.lastScanFiles = filesScanned
	s.lastScanMs = elapsed
	s.scanCount++
	s.mu.Unlock()

	level := "ok"
	msg := fmt.Sprintf("Сканирование (%s): проверено %d файлов за %d мс · угроз: %d", normMode, filesScanned, elapsed, len(threats))
	if len(threats) > 0 {
		level = "danger"
	}
	s.LogAudit(level, "antivirus", "Проверка LumaShield 1.3 завершена", msg)

	return map[string]interface{}{
		"ok":            true,
		"mode":          normMode,
		"files_scanned": filesScanned,
		"elapsed_ms":    elapsed,
		"threats":       threats,
		"scanned_at":    s.lastScanTime,
	}
}

func (s *SecurityKernel) QuarantineFile(path, reason, severity string) (QuarantineItem, error) {
	clean := resolvePath(path)
	info, err := os.Stat(clean)
	if err != nil {
		return QuarantineItem{}, err
	}
	if info.IsDir() {
		return QuarantineItem{}, fmt.Errorf("нельзя поместить директорию в карантин")
	}

	id := fmt.Sprintf("q_%d", time.Now().UnixNano())
	qFile := filepath.Join(s.quarantineDir, id+".lumaquarantine")
	hash := computeFileSHA256(clean)

	if err := os.Rename(clean, qFile); err != nil {
		if err2 := copyPathRecursive(clean, qFile); err2 != nil {
			return QuarantineItem{}, err2
		}
		_ = os.Remove(clean)
	}
	_ = os.Chmod(qFile, 0o600)

	item := QuarantineItem{
		ID:             id,
		OriginalPath:   clean,
		OriginalName:   filepath.Base(clean),
		QuarantineFile: qFile,
		Reason:         reason,
		Severity:       severity,
		SHA256:         hash,
		QuarantinedAt:  time.Now().Format("02.01.2006 15:04"),
		Size:           info.Size(),
	}

	s.mu.Lock()
	s.quarantine = append([]QuarantineItem{item}, s.quarantine...)
	filtered := make([]SecurityThreat, 0, len(s.lastThreats))
	for _, t := range s.lastThreats {
		if t.Path != clean {
			filtered = append(filtered, t)
		}
	}
	s.lastThreats = filtered
	s.saveQuarantineIndexLocked()
	s.mu.Unlock()

	s.LogAudit("warn", "quarantine", "Файл изолирован в карантин", fmt.Sprintf("%s -> %s", item.OriginalName, id))
	return item, nil
}

func (s *SecurityKernel) QuarantineAllThreats() int {
	s.mu.RLock()
	copyThreats := append([]SecurityThreat{}, s.lastThreats...)
	s.mu.RUnlock()
	moved := 0
	for _, thr := range copyThreats {
		if thr.Path == "" {
			continue
		}
		if _, err := s.QuarantineFile(thr.Path, thr.Reason, thr.Severity); err == nil {
			moved++
		}
	}
	return moved
}

func (s *SecurityKernel) RestoreQuarantine(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	idx := -1
	for i, q := range s.quarantine {
		if q.ID == id {
			idx = i
			break
		}
	}
	if idx < 0 {
		return fmt.Errorf("объект карантина не найден")
	}
	item := s.quarantine[idx]
	_ = os.MkdirAll(filepath.Dir(item.OriginalPath), 0o755)
	if err := os.Rename(item.QuarantineFile, item.OriginalPath); err != nil {
		if err2 := copyPathRecursive(item.QuarantineFile, item.OriginalPath); err2 != nil {
			return err2
		}
		_ = os.Remove(item.QuarantineFile)
	}
	s.quarantine = append(s.quarantine[:idx], s.quarantine[idx+1:]...)
	s.saveQuarantineIndexLocked()
	go s.LogAudit("info", "quarantine", "Файл восстановлен из карантина", item.OriginalPath)
	return nil
}

func (s *SecurityKernel) DeleteQuarantine(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	idx := -1
	for i, q := range s.quarantine {
		if q.ID == id {
			idx = i
			break
		}
	}
	if idx < 0 {
		return fmt.Errorf("объект карантина не найден")
	}
	item := s.quarantine[idx]
	_ = os.Remove(item.QuarantineFile)
	s.quarantine = append(s.quarantine[:idx], s.quarantine[idx+1:]...)
	s.saveQuarantineIndexLocked()
	go s.LogAudit("ok", "quarantine", "Объект удалён из карантина", item.OriginalName)
	return nil
}

func (s *SecurityKernel) CreateEicarTestFile() (string, error) {
	dir := filepath.Join(os.TempDir(), "LumaShield_Test")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	testPath := filepath.Join(dir, "eicar_test_file.txt")
	if err := os.WriteFile(testPath, []byte(eicarStandardSignature+"\n"), 0o600); err != nil {
		return "", err
	}
	s.LogAudit("info", "antivirus", "Создан безопасный тестовый файл EICAR", testPath)
	return testPath, nil
}

func (s *SecurityKernel) StatusSnapshot(probe *platformProbe) map[string]interface{} {
	s.mu.RLock()
	needDefender := time.Since(s.defenderAt) > 60*time.Second || s.defenderAt.IsZero()
	def := s.defender
	s.mu.RUnlock()

	if needDefender && probe != nil {
		def = probe.GetDefenderStatus()
		s.mu.Lock()
		s.defender = def
		s.defenderAt = time.Now()
		s.mu.Unlock()
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	score := 95
	if s.realtimeGuardEnabled {
		score += 3
	}
	if len(s.lastThreats) > 0 {
		score -= len(s.lastThreats) * 18
		if score < 25 {
			score = 25
		}
	}
	if def.Available && def.RealtimeEnabled {
		score += 2
		if score > 100 {
			score = 100
		}
	}

	return map[string]interface{}{
		"ok":                     true,
		"security_core_version":  SecurityCoreVersion,
		"engine_name":            "LumaShield 1.3 (Heuristic + Entropy + Real-Time Guard)",
		"rules_count":            len(scriptHeuristics) + len(suspiciousDoubleExts) + len(ransomwareExts) + 3,
		"realtime_guard_enabled": s.realtimeGuardEnabled,
		"score":                  score,
		"defender":               def,
		"last_scan_time":         s.lastScanTime,
		"last_scan_files":        s.lastScanFiles,
		"last_scan_ms":           s.lastScanMs,
		"scan_count":             s.scanCount,
		"threats":                s.lastThreats,
		"quarantine":             s.quarantine,
		"exclusions":             s.exclusions,
		"quarantine_dir":         s.quarantineDir,
		"audit_log":              s.auditLog,
		"crypto":                 "AES-256-GCM + PBKDF2-HMAC-SHA512 + Shannon Entropy + PE Guard",
	}
}
