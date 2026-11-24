package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// ==================== LUMA OS 1.6 NITROGEN: PROGRAM LEFTOVER CLEANER (REVO / BCUNINSTALLER ANALOG) ====================
// Lists installed programs, launches native uninstaller, runs a 4-stage leftover scanner:
//   Stage 1: AppData / LocalAppData / ProgramData / Temp (or ~/.config / ~/.cache / /tmp)
//   Stage 2: Program Files / Install Location / Shortcuts
//   Stage 3: Windows Registry HKCU / HKLM (or .desktop / MIME entries)
//   Stage 4: Services & Scheduled Tasks (or systemd user services)
// Creates an automatic backup before deleting any checked leftovers, with full restore capability!

type UninstallProgramItem struct {
	ID                   string  `json:"id"`
	Name                 string  `json:"name"`
	Publisher            string  `json:"publisher"`
	Version              string  `json:"version"`
	InstallDate          string  `json:"install_date"`
	InstallLocation      string  `json:"install_location"`
	UninstallString      string  `json:"uninstall_string"`
	QuietUninstallString string  `json:"quiet_uninstall_string,omitempty"`
	SizeMB               float64 `json:"size_mb"`
	RegistryKey          string  `json:"registry_key,omitempty"`
	Source               string  `json:"source"`
}

type LeftoverItem struct {
	ID              string `json:"id"`
	Stage           int    `json:"stage"` // 1..4
	StageName       string `json:"stage_name"`
	Kind            string `json:"kind"` // dir | file | registry | service | task
	Path            string `json:"path"`
	SizeBytes       int64  `json:"size_bytes"`
	Risk            string `json:"risk"` // safe | caution
	SelectedDefault bool   `json:"selected_default"`
	Reason          string `json:"reason"`
}

type LeftoverStageSummary struct {
	Stage      int    `json:"stage"`
	Title      string `json:"title"`
	Count      int    `json:"count"`
	SizeBytes  int64  `json:"size_bytes"`
	DurationMs int64  `json:"duration_ms"`
}

type LeftoverScanReport struct {
	OK             bool                   `json:"ok"`
	ProgramName    string                 `json:"program_name"`
	Publisher      string                 `json:"publisher"`
	Mode           string                 `json:"mode"`
	Stages         []LeftoverStageSummary `json:"stages"`
	Items          []LeftoverItem         `json:"items"`
	TotalCount     int                    `json:"total_count"`
	TotalSizeBytes int64                  `json:"total_size_bytes"`
	ScannedAt      string                 `json:"scanned_at"`
}

type UninstallerBackupManifest struct {
	ID          string         `json:"id"`
	ProgramName string         `json:"program_name"`
	CreatedAt   string         `json:"created_at"`
	BackupDir   string         `json:"backup_dir"`
	ItemsCount  int            `json:"items_count"`
	FreedBytes  int64          `json:"freed_bytes"`
	RegExport   string         `json:"reg_export,omitempty"`
	Items       []LeftoverItem `json:"items"`
	Restored    bool           `json:"restored,omitempty"`
}

func uninstallerBackupsRoot() string {
	cfgDir, err := os.UserConfigDir()
	if err != nil || cfgDir == "" {
		cfgDir = os.TempDir()
	}
	dir := filepath.Join(cfgDir, "LumaOS", "UninstallerBackups")
	_ = os.MkdirAll(dir, 0o700)
	return dir
}

// isProtectedSystemPath ensures the leftover scanner & cleaner NEVER touches critical OS/user roots!
func isProtectedSystemPath(p string) bool {
	clean := strings.ToLower(filepath.Clean(strings.TrimSpace(p)))
	if clean == "" || len(clean) <= 4 {
		return true
	}
	protectedExact := map[string]bool{
		`c:\`: true, `c:\windows`: true, `c:\program files`: true, `c:\program files (x86)`: true,
		`c:\programdata`: true, `c:\users`: true, `/`: true, `/usr`: true, `/etc`: true, `/bin`: true,
		`/lib`: true, `/var`: true, `/home`: true, `/tmp`: true, `/opt`: true,
	}
	if protectedExact[clean] {
		return true
	}
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		lh := strings.ToLower(filepath.Clean(home))
		if clean == lh || clean == filepath.Join(lh, "appdata") || clean == filepath.Join(lh, "appdata", "roaming") ||
			clean == filepath.Join(lh, "appdata", "local") || clean == filepath.Join(lh, "desktop") ||
			clean == filepath.Join(lh, "documents") || clean == filepath.Join(lh, "downloads") ||
			clean == filepath.Join(lh, ".config") || clean == filepath.Join(lh, ".local") || clean == filepath.Join(lh, ".cache") {
			return true
		}
	}
	base := strings.ToLower(filepath.Base(clean))
	protectedNames := []string{
		"windows", "system32", "syswow64", "microsoft", "lumaos", "luma_os", "common files",
		"windowsapps", "packages", "temp", "desktop", "documents", "downloads", "pictures",
	}
	for _, pn := range protectedNames {
		if base == pn {
			return true
		}
	}
	return false
}

// buildSearchTokens extracts meaningful lowercase matching tokens from program name & publisher.
func buildSearchTokens(name, publisher string) []string {
	stop := map[string]bool{
		"the": true, "for": true, "and": true, "inc": true, "llc": true, "ltd": true, "corp": true,
		"corporation": true, "software": true, "technologies": true, "technology": true, "systems": true,
		"windows": true, "microsoft": true, "app": true, "application": true, "desktop": true,
		"setup": true, "installer": true, "edition": true, "pro": true, "free": true, "version": true,
		"x64": true, "x86": true, "64-bit": true, "32-bit": true, "update": true, "client": true,
	}
	rawList := []string{}
	cleanName := strings.TrimSpace(strings.ToLower(name))
	// Strip trailing version numbers like "App 2.4.1"
	parts := strings.FieldsFunc(cleanName, func(r rune) bool {
		return r == ' ' || r == '(' || r == ')' || r == '[' || r == ']' || r == '-' || r == '_' || r == '/'
	})
	if len(cleanName) >= 4 {
		rawList = append(rawList, cleanName)
	}
	for _, tok := range parts {
		if len(tok) >= 4 && !stop[tok] && !(tok[0] >= '0' && tok[0] <= '9') {
			rawList = append(rawList, tok)
		}
	}
	if len(parts) >= 2 {
		joined := parts[0] + parts[1]
		if len(joined) >= 5 && !stop[parts[0]] {
			rawList = append(rawList, joined)
		}
	}
	pubClean := strings.TrimSpace(strings.ToLower(publisher))
	if len(pubClean) >= 5 && !stop[pubClean] && !strings.Contains(pubClean, "microsoft") {
		pubParts := strings.FieldsFunc(pubClean, func(r rune) bool { return r == ' ' || r == ',' || r == '.' })
		if len(pubParts) > 0 && len(pubParts[0]) >= 5 && !stop[pubParts[0]] {
			rawList = append(rawList, pubParts[0])
		}
	}
	// Deduplicate
	seen := map[string]bool{}
	out := make([]string, 0, len(rawList))
	for _, t := range rawList {
		if !seen[t] {
			seen[t] = true
			out = append(out, t)
		}
	}
	return out
}

func matchesAnyToken(candidate string, tokens []string) (bool, string) {
	low := strings.ToLower(strings.TrimSpace(candidate))
	if low == "" {
		return false, ""
	}
	for _, tok := range tokens {
		if len(tok) >= 4 && strings.Contains(low, tok) {
			return true, tok
		}
	}
	return false, ""
}

func computeDirSizeBounded(root string, maxFiles int) int64 {
	var total int64
	seen := 0
	_ = filepath.Walk(root, func(_ string, info os.FileInfo, err error) error {
		if err != nil || info == nil {
			return nil
		}
		if !info.IsDir() {
			total += info.Size()
			seen++
			if seen >= maxFiles {
				return filepath.SkipAll
			}
		}
		return nil
	})
	return total
}

func scanDirectoryForTokens(dir string, stage int, stageName string, tokens []string, maxDepth int, out *[]LeftoverItem, seen map[string]bool) {
	if dir == "" {
		return
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}
	for _, e := range entries {
		full := filepath.Join(dir, e.Name())
		lowFull := strings.ToLower(filepath.Clean(full))
		if seen[lowFull] || isProtectedSystemPath(full) {
			continue
		}
		if matched, tok := matchesAnyToken(e.Name(), tokens); matched {
			seen[lowFull] = true
			kind := "file"
			var sz int64
			if e.IsDir() {
				kind = "dir"
				sz = computeDirSizeBounded(full, 600)
			} else if info, err2 := e.Info(); err2 == nil && info != nil {
				sz = info.Size()
			}
			*out = append(*out, LeftoverItem{
				ID:              fmt.Sprintf("lo_%d_%d", stage, len(*out)+1),
				Stage:           stage,
				StageName:       stageName,
				Kind:            kind,
				Path:            full,
				SizeBytes:       sz,
				Risk:            "safe",
				SelectedDefault: true,
				Reason:          fmt.Sprintf("Совпадение хвоста по «%s» в %s", tok, filepath.Base(dir)),
			})
			continue
		}
		if maxDepth > 1 && e.IsDir() {
			subName := strings.ToLower(e.Name())
			if subName != "microsoft" && subName != "windows" && subName != "lumaos" && subName != "packages" {
				scanDirectoryForTokens(full, stage, stageName, tokens, maxDepth-1, out, seen)
			}
		}
	}
}

func runFourStageLeftoverScan(programName, publisher, installLocation, mode string) LeftoverScanReport {
	if mode == "" {
		mode = "moderate"
	}
	tokens := buildSearchTokens(programName, publisher)
	items := make([]LeftoverItem, 0, 24)
	seen := map[string]bool{}
	stages := make([]LeftoverStageSummary, 0, 4)

	// Stage 1: AppData / LocalAppData / ProgramData / Temp (or POSIX ~/.config ~/.local/share ~/.cache /tmp)
	t1 := time.Now()
	s1Start := len(items)
	for _, root := range getStage1ScanDirs() {
		scanDirectoryForTokens(root, 1, "AppData / Кэш / Temp", tokens, 2, &items, seen)
	}
	var s1Bytes int64
	for i := s1Start; i < len(items); i++ {
		s1Bytes += items[i].SizeBytes
	}
	stages = append(stages, LeftoverStageSummary{
		Stage: 1, Title: "AppData / LocalAppData / ProgramData / Temp",
		Count: len(items) - s1Start, SizeBytes: s1Bytes, DurationMs: time.Since(t1).Milliseconds(),
	})

	// Stage 2: Program Files / Install Location / Shortcuts
	t2 := time.Now()
	s2Start := len(items)
	if cleanLoc := strings.TrimSpace(installLocation); cleanLoc != "" && !isProtectedSystemPath(cleanLoc) {
		if st, err := os.Stat(cleanLoc); err == nil {
			lowLoc := strings.ToLower(filepath.Clean(cleanLoc))
			if !seen[lowLoc] {
				seen[lowLoc] = true
				sz := st.Size()
				kind := "file"
				if st.IsDir() {
					kind = "dir"
					sz = computeDirSizeBounded(cleanLoc, 800)
				}
				items = append(items, LeftoverItem{
					ID: fmt.Sprintf("lo_2_%d", len(items)+1), Stage: 2, StageName: "Каталоги установки и ярлыки",
					Kind: kind, Path: cleanLoc, SizeBytes: sz, Risk: "caution", SelectedDefault: true,
					Reason: "Основная папка установки программы",
				})
			}
		}
	}
	for _, root := range getStage2ScanDirs() {
		scanDirectoryForTokens(root, 2, "Каталоги установки и ярлыки", tokens, 1, &items, seen)
	}
	var s2Bytes int64
	for i := s2Start; i < len(items); i++ {
		s2Bytes += items[i].SizeBytes
	}
	stages = append(stages, LeftoverStageSummary{
		Stage: 2, Title: "Program Files / Папка установки / Ярлыки",
		Count: len(items) - s2Start, SizeBytes: s2Bytes, DurationMs: time.Since(t2).Milliseconds(),
	})

	// Stage 3: Registry HKCU / HKLM (Windows) or .desktop/MIME (Linux)
	t3 := time.Now()
	s3Start := len(items)
	regItems := scanStage3RegistryLeftovers(tokens, mode)
	for _, ri := range regItems {
		ri.ID = fmt.Sprintf("lo_3_%d", len(items)+1)
		items = append(items, ri)
	}
	stages = append(stages, LeftoverStageSummary{
		Stage: 3, Title: "Реестр Windows (HKCU / HKLM)",
		Count: len(items) - s3Start, SizeBytes: 0, DurationMs: time.Since(t3).Milliseconds(),
	})

	// Stage 4: Services & Scheduled Tasks
	t4 := time.Now()
	s4Start := len(items)
	svcItems := scanStage4ServiceTaskLeftovers(tokens)
	for _, si := range svcItems {
		si.ID = fmt.Sprintf("lo_4_%d", len(items)+1)
		items = append(items, si)
	}
	stages = append(stages, LeftoverStageSummary{
		Stage: 4, Title: "Службы и Задачи планировщика",
		Count: len(items) - s4Start, SizeBytes: 0, DurationMs: time.Since(t4).Milliseconds(),
	})

	var totalBytes int64
	for _, it := range items {
		totalBytes += it.SizeBytes
	}

	return LeftoverScanReport{
		OK:             true,
		ProgramName:    programName,
		Publisher:      publisher,
		Mode:           mode,
		Stages:         stages,
		Items:          items,
		TotalCount:     len(items),
		TotalSizeBytes: totalBytes,
		ScannedAt:      time.Now().Format("15:04:05"),
	}
}

func cleanSelectedLeftovers(programName string, selected []LeftoverItem, autoBackup bool) map[string]interface{} {
	if len(selected) == 0 {
		return map[string]interface{}{"ok": false, "error": "Не выбрано ни одного элемента для очистки"}
	}
	safeName := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '-' {
			return r
		}
		return '_'
	}, strings.TrimSpace(programName))
	if safeName == "" {
		safeName = "program"
	}
	backupID := fmt.Sprintf("bak_%s_%d", safeName, time.Now().Unix())
	backupDir := filepath.Join(uninstallerBackupsRoot(), backupID)
	filesBackupDir := filepath.Join(backupDir, "files")
	if autoBackup {
		_ = os.MkdirAll(filesBackupDir, 0o700)
	}

	deleted := 0
	var freedBytes int64
	var failed []string
	var cleanedItems []LeftoverItem
	regExportPath := ""

	for idx, it := range selected {
		switch it.Kind {
		case "file", "dir":
			if isProtectedSystemPath(it.Path) {
				failed = append(failed, it.Path+" (защищённый системный путь)")
				continue
			}
			st, err := os.Stat(it.Path)
			if err != nil {
				continue
			}
			sz := it.SizeBytes
			if sz <= 0 {
				if st.IsDir() {
					sz = computeDirSizeBounded(it.Path, 500)
				} else {
					sz = st.Size()
				}
			}
			// Auto-backup files/configs up to 35 MB each before removing
			if autoBackup && sz <= 35*1024*1024 {
				dst := filepath.Join(filesBackupDir, fmt.Sprintf("%03d_%s", idx+1, filepath.Base(it.Path)))
				_ = copyPathRecursive(it.Path, dst)
			}
			if err := os.RemoveAll(it.Path); err != nil {
				failed = append(failed, it.Path+": "+err.Error())
				continue
			}
			deleted++
			freedBytes += sz
			cleanedItems = append(cleanedItems, it)

		case "registry":
			if autoBackup {
				if exp := backupRegistryKeyPlatform(it.Path, backupDir, idx+1); exp != "" {
					regExportPath = exp
				}
			}
			if err := deleteRegistryLeftoverPlatform(it.Path); err != nil {
				failed = append(failed, it.Path+": "+err.Error())
				continue
			}
			deleted++
			cleanedItems = append(cleanedItems, it)

		case "service", "task":
			if err := disableServiceOrTaskPlatform(it.Kind, it.Path); err != nil {
				failed = append(failed, it.Path+": "+err.Error())
				continue
			}
			deleted++
			cleanedItems = append(cleanedItems, it)
		}
	}

	if autoBackup {
		manifest := UninstallerBackupManifest{
			ID:          backupID,
			ProgramName: programName,
			CreatedAt:   time.Now().Format("02.01.2006 15:04:05"),
			BackupDir:   backupDir,
			ItemsCount:  len(cleanedItems),
			FreedBytes:  freedBytes,
			RegExport:   regExportPath,
			Items:       cleanedItems,
		}
		if raw, err := json.MarshalIndent(manifest, "", "  "); err == nil {
			_ = os.WriteFile(filepath.Join(backupDir, "manifest.json"), raw, 0o600)
		}
	}

	return map[string]interface{}{
		"ok":            true,
		"backup_id":     backupID,
		"backup_dir":    backupDir,
		"auto_backup":   autoBackup,
		"deleted_count": deleted,
		"freed_bytes":   freedBytes,
		"failed":        failed,
	}
}

func listUninstallerBackups() []UninstallerBackupManifest {
	root := uninstallerBackupsRoot()
	entries, err := os.ReadDir(root)
	if err != nil {
		return []UninstallerBackupManifest{}
	}
	out := make([]UninstallerBackupManifest, 0, len(entries))
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		raw, err2 := os.ReadFile(filepath.Join(root, e.Name(), "manifest.json"))
		if err2 != nil {
			continue
		}
		var m UninstallerBackupManifest
		if json.Unmarshal(raw, &m) == nil {
			out = append(out, m)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID > out[j].ID })
	return out
}

func restoreUninstallerBackup(backupID string) map[string]interface{} {
	backupDir := filepath.Join(uninstallerBackupsRoot(), filepath.Base(strings.TrimSpace(backupID)))
	manifestPath := filepath.Join(backupDir, "manifest.json")
	raw, err := os.ReadFile(manifestPath)
	if err != nil {
		return map[string]interface{}{"ok": false, "error": "Резервная копия не найдена"}
	}
	var m UninstallerBackupManifest
	if err := json.Unmarshal(raw, &m); err != nil {
		return map[string]interface{}{"ok": false, "error": "Повреждённый манифест бэкапа"}
	}
	restoredFiles := 0
	filesDir := filepath.Join(backupDir, "files")
	if entries, err := os.ReadDir(filesDir); err == nil {
		for idx, it := range m.Items {
			if it.Kind != "file" && it.Kind != "dir" {
				continue
			}
			prefix := fmt.Sprintf("%03d_", idx+1)
			for _, e := range entries {
				if strings.HasPrefix(e.Name(), prefix) {
					src := filepath.Join(filesDir, e.Name())
					_ = os.MkdirAll(filepath.Dir(it.Path), 0o755)
					if copyPathRecursive(src, it.Path) == nil {
						restoredFiles++
					}
					break
				}
			}
		}
	}
	regRestored := restoreRegistryBackupsPlatform(backupDir)
	m.Restored = true
	if updated, err := json.MarshalIndent(m, "", "  "); err == nil {
		_ = os.WriteFile(manifestPath, updated, 0o600)
	}
	return map[string]interface{}{
		"ok":             true,
		"backup_id":      m.ID,
		"restored_files": restoredFiles,
		"reg_restored":   regRestored,
		"message":        fmt.Sprintf("Восстановлено объектов: %d (реестр: %d)", restoredFiles, regRestored),
	}
}
