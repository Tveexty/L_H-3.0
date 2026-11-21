package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

// LumaShield 1.2 — Lightweight, zero-conflict user-space security core & on-demand antivirus.
// Does NOT register kernel filter drivers or replace Windows SecurityCenter, so it runs
// cleanly alongside Windows Defender with zero locks or conflicts.

const eicarStandardSignature = `X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*`

type SecurityKernel struct {
	mu            sync.RWMutex
	quarantineDir string
	quarantine    []QuarantineItem
	lastThreats   []SecurityThreat
	auditLog      []SecurityAuditEvent
	lastScanTime  string
	lastScanFiles int
	lastScanMs    int64
	scanCount     int
	defender      DefenderStatus
	defenderAt    time.Time
}

func NewSecurityKernel() *SecurityKernel {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		home = os.TempDir()
	}
	qDir := filepath.Join(home, ".luma_quarantine")
	_ = os.MkdirAll(qDir, 0o700)

	sk := &SecurityKernel{
		quarantineDir: qDir,
		quarantine:    []QuarantineItem{},
		lastThreats:   []SecurityThreat{},
		auditLog:      []SecurityAuditEvent{},
	}
	sk.loadQuarantineIndex()
	sk.LogAudit("ok", "kernel", "LumaShield 1.2 инициализирован", "Пассивный user-space режим (без конфликтов с Windows Defender), loopback IPC 127.0.0.1")
	return sk
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
	if len(s.auditLog) > 120 {
		s.auditLog = s.auditLog[:120]
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

func computeFileSHA256(path string) string {
	f, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer f.Close()
	h := sha256.New()
	_, _ = io.CopyN(h, f, 20*1024*1024) // cap at 20MB for responsiveness
	return hex.EncodeToString(h.Sum(nil))
}

var suspiciousDoubleExts = []string{
	".pdf.exe", ".doc.exe", ".docx.exe", ".xls.exe", ".xlsx.exe",
	".jpg.exe", ".jpeg.exe", ".png.exe", ".mp3.exe", ".mp4.exe", ".txt.exe",
	".pdf.scr", ".jpg.scr", ".png.scr", ".doc.scr", ".txt.vbs", ".pdf.vbs",
	".jpg.bat", ".png.bat", ".docx.js", ".pdf.js", ".zip.exe", ".rar.exe",
	".pdf.cmd", ".txt.cmd", ".doc.hta", ".pdf.hta",
}

type heuristicRule struct {
	needle   []byte
	category string
	severity string
	reason   string
}

var scriptHeuristics = []heuristicRule{
	{
		needle:   []byte(eicarStandardSignature),
		category: "EICAR-Test",
		severity: "high",
		reason:   "Обнаружена стандартная тестовая сигнатура антивируса EICAR",
	},
	{
		needle:   []byte("invoke-expression"),
		category: "Suspicious-Script",
		severity: "medium",
		reason:   "Скрытое динамическое выполнение PowerShell (Invoke-Expression)",
	},
	{
		needle:   []byte("-encodedcommand"),
		category: "Obfuscated-PS",
		severity: "high",
		reason:   "Обфусцированная команда PowerShell (-EncodedCommand)",
	},
	{
		needle:   []byte("frombase64string"),
		category: "Obfuscated-Payload",
		severity: "medium",
		reason:   "Декодирование скрытой Base64 нагрузки в скрипте",
	},
	{
		needle:   []byte("certutil -urlcache"),
		category: "LOLBin-Dropper",
		severity: "high",
		reason:   "Попытка скрытой загрузки через certutil -urlcache",
	},
	{
		needle:   []byte("mshta http"),
		category: "Remote-HTA",
		severity: "high",
		reason:   "Удалённый запуск HTA-сценария (mshta http)",
	},
	{
		needle:   []byte("downloadstring("),
		category: "Dropper-Script",
		severity: "medium",
		reason:   "Загрузка и исполнение удалённого кода (DownloadString)",
	},
}

func (s *SecurityKernel) inspectSingleFile(path string, info os.FileInfo) *SecurityThreat {
	if info == nil || info.IsDir() {
		return nil
	}
	name := info.Name()
	lower := strings.ToLower(name)
	ext := strings.ToLower(filepath.Ext(name))

	// Skip own quarantine directory
	if strings.HasPrefix(path, s.quarantineDir) {
		return nil
	}

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

	// 2. Content signature & heuristic scan for scripts/text/small binaries (<= 4MB)
	scanContent := ext == ".txt" || ext == ".ps1" || ext == ".bat" || ext == ".cmd" ||
		ext == ".vbs" || ext == ".js" || ext == ".hta" || ext == ".sh" ||
		ext == ".py" || ext == ".com" || ext == ".eicar" || info.Size() <= 256*1024
	if scanContent && info.Size() > 0 && info.Size() <= 4*1024*1024 {
		f, err := os.Open(path)
		if err == nil {
			buf := make([]byte, 512*1024)
			n, _ := f.Read(buf)
			_ = f.Close()
			if n > 0 {
				chunk := buf[:n]
				// Exact EICAR match (case sensitive)
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
				// Script-only heuristics (avoid false positives on Luma's own sources/docs)
				if (ext == ".ps1" || ext == ".bat" || ext == ".cmd" || ext == ".vbs" || ext == ".hta") &&
					!strings.Contains(strings.ToLower(path), "l_h-3.0") {
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
			}
		}
	}

	// 3. Suspicious temp-dropped executable check (only suspicious names in Temp)
	lowerPath := strings.ToLower(path)
	if (ext == ".exe" || ext == ".scr" || ext == ".pif") &&
		(strings.Contains(lowerPath, `\temp\`) || strings.Contains(lowerPath, "/tmp/")) {
		if strings.Contains(lower, "crack") || strings.Contains(lower, "keygen") ||
			strings.Contains(lower, "stealer") || strings.Contains(lower, "miner") ||
			strings.Contains(lower, "trojan") || strings.Contains(lower, "rat_") {
			return &SecurityThreat{
				ID:         fmt.Sprintf("thr_%d", time.Now().UnixNano()),
				Path:       path,
				Name:       name,
				Severity:   "high",
				Category:   "Suspicious-Temp-Binary",
				Reason:     "Подозрительный исполняемый файл во временной папке",
				SHA256:     computeFileSHA256(path),
				Size:       info.Size(),
				DetectedAt: time.Now().Format("15:04:05"),
			}
		}
	}

	return nil
}

func (s *SecurityKernel) RunScan(mode, customPath string, probe *platformProbe) map[string]interface{} {
	start := time.Now()
	var roots []string

	home, _ := os.UserHomeDir()
	switch strings.ToLower(strings.TrimSpace(mode)) {
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
	default: // "quick"
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
	maxFiles := 2500
	if mode == "custom" {
		maxFiles = 5000
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
				if base == "node_modules" || base == ".git" || base == ".luma_quarantine" || base == "windows" || base == "winsxs" {
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

	// Also audit suspicious startup commands when running quick or startup scan
	if probe != nil && (mode == "quick" || mode == "startup") {
		for _, item := range probe.ListStartupItems() {
			lowCmd := strings.ToLower(item.Command)
			if strings.Contains(lowCmd, "-encodedcommand") || strings.Contains(lowCmd, "mshta http") || strings.Contains(lowCmd, "certutil -urlcache") {
				threats = append(threats, SecurityThreat{
					ID:         fmt.Sprintf("thr_st_%d", time.Now().UnixNano()),
					Path:       item.Command,
					Name:       item.Name + " (Автозагрузка)",
					Severity:   "high",
					Category:   "Startup-Persistence",
					Reason:     "Подозрительная команда в автозагрузке системы",
					SHA256:     "",
					Size:       0,
					DetectedAt: time.Now().Format("15:04:05"),
				})
			}
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
	msg := fmt.Sprintf("Сканирование (%s): проверено %d файлов за %d мс · угроз: %d", mode, filesScanned, elapsed, len(threats))
	if len(threats) > 0 {
		level = "danger"
	}
	s.LogAudit(level, "antivirus", "Проверка LumaShield 1.2 завершена", msg)

	return map[string]interface{}{
		"ok":            true,
		"mode":          mode,
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
		// Cross-device copy + delete
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
	// Remove from lastThreats
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

	score := 96
	if len(s.lastThreats) > 0 {
		score -= len(s.lastThreats) * 18
		if score < 25 {
			score = 25
		}
	}
	if def.Available && def.RealtimeEnabled {
		score += 4
		if score > 100 {
			score = 100
		}
	}

	return map[string]interface{}{
		"ok":                    true,
		"security_core_version": SecurityCoreVersion,
		"engine_name":           "LumaShield 1.2 (Zero-Conflict User-Space)",
		"score":                 score,
		"defender":              def,
		"last_scan_time":        s.lastScanTime,
		"last_scan_files":       s.lastScanFiles,
		"last_scan_ms":          s.lastScanMs,
		"scan_count":            s.scanCount,
		"threats":               s.lastThreats,
		"quarantine":            s.quarantine,
		"quarantine_dir":        s.quarantineDir,
		"audit_log":             s.auditLog,
		"crypto":                "AES-256-GCM + PBKDF2-HMAC-SHA512 (32k iter) + Loopback IPC",
	}
}
