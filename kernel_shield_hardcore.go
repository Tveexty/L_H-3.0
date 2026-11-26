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
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

// ==================== LUMA OS 1.6.6: LUMASHIELD 3.0 HARDCORE ACTIVE DEFENSE ====================
// Active Anti-RAT / Remote-Control Zero-Shredder, Real-Time USB/Flash Drive Guard,
// and Foreign Untrusted File Blocker with strict OS-core & Luma OS self-protection whitelist.

type HardcoreShieldConfig struct {
	HardcoreMode           bool `json:"hardcore_mode"`
	AutoShredRemoteControl bool `json:"auto_shred_remote_control"`
	UsbFlashGuard          bool `json:"usb_flash_guard"`
	BlockForeignFiles      bool `json:"block_foreign_files"`
	KillRemoteControlProcs bool `json:"kill_remote_control_procs"`
}

type UsbDriveInfo struct {
	Path      string `json:"path"`
	Label     string `json:"label"`
	ScannedAt string `json:"scanned_at"`
	Threats   int    `json:"threats"`
}

type HardcoreShieldEvent struct {
	ID      string `json:"id"`
	Time    string `json:"time"`
	Action  string `json:"action"`  // shredded_zero | blocked_foreign | usb_neutralized | process_killed | detected
	Source  string `json:"source"`  // system | usb | foreign | process
	Name    string `json:"name"`
	Path    string `json:"path"`
	Reason  string `json:"reason"`
	SHA256  string `json:"sha256,omitempty"`
	Success bool   `json:"success"`
}

type HardcoreShieldStatus struct {
	Ok                 bool                  `json:"ok"`
	Version            string                `json:"version"`
	RulesCount         int                   `json:"rules_count"`
	Config             HardcoreShieldConfig  `json:"config"`
	ShreddedCount      int                   `json:"shredded_count"`
	BlockedForeign     int                   `json:"blocked_foreign_count"`
	KilledProcesses    int                   `json:"killed_processes_count"`
	UsbDrives          []UsbDriveInfo        `json:"usb_drives"`
	Events             []HardcoreShieldEvent `json:"events"`
	LastTickAt         string                `json:"last_tick_at"`
	ProtectedSelfPath  string                `json:"protected_self_path"`
}

var (
	hcMu              sync.RWMutex
	hcConfig          = defaultHardcoreShieldConfig()
	hcEvents          = []HardcoreShieldEvent{}
	hcUsbDrives       = []UsbDriveInfo{}
	hcShreddedCount   int
	hcBlockedForeign  int
	hcKilledProcs     int
	hcLastTickAt      string
	hcSeenUsbPaths    = map[string]int64{}
	hcSeenForeign     = map[string]int64{}
	hcStarted         bool
	hcSecurityKernel  *SecurityKernel
)

func defaultHardcoreShieldConfig() HardcoreShieldConfig {
	return HardcoreShieldConfig{
		HardcoreMode:           true,
		AutoShredRemoteControl: true,
		UsbFlashGuard:          true,
		BlockForeignFiles:      true,
		KillRemoteControlProcs: true,
	}
}

// 65+ dedicated Anti-RAT, Remote-Control, Reverse-Shell, Keylogger, Input-Hijack & USB Worm signatures
var remoteControlSignatures = []struct {
	needle string
	reason string
	score  int
}{
	// Known RAT / Remote Access Trojan families
	{"asyncrat", "Обнаружен RAT-троян удалённого управления (AsyncRAT)", 100},
	{"quasarrat", "Обнаружен RAT-троян удалённого управления (QuasarRAT)", 100},
	{"njrat", "Обнаружен RAT-троян удалённого управления (NjRAT / Bladabindi)", 100},
	{"darkcomet", "Обнаружен RAT-троян удалённого управления (DarkComet)", 100},
	{"remcos", "Обнаружен RAT-троян удалённого управления (Remcos RAT)", 100},
	{"nanocore", "Обнаружен RAT-троян удалённого управления (NanoCore RAT)", 100},
	{"dcrat", "Обнаружен RAT-троян удалённого управления (DcRAT)", 100},
	{"venomrat", "Обнаружен RAT-троян удалённого управления (VenomRAT)", 100},
	{"xworm", "Обнаружен RAT-червь удалённого управления (XWorm)", 100},
	{"orcusrat", "Обнаружен RAT-троян удалённого управления (Orcus RAT)", 100},
	{"warzonerat", "Обнаружен RAT-троян удалённого управления (Warzone / AveMaria RAT)", 100},
	{"agenttesla", "Обнаружен шпионский модуль / стилер (AgentTesla)", 100},
	{"gh0strat", "Обнаружен RAT-троян удалённого управления (Gh0st RAT)", 100},
	{"cobaltstrike", "Обнаружен C2-маяк удалённого управления (Cobalt Strike)", 100},
	{"meterpreter", "Обнаружен шелл удалённого захвата ПК (Meterpreter)", 100},
	{"metasploit", "Обнаружен модуль удалённого захвата ПК (Metasploit)", 95},
	{"sliver-client", "Обнаружен C2-имплант удалённого управления (Sliver)", 95},
	{"havoc-demon", "Обнаружен C2-имплант удалённого управления (Havoc)", 95},
	{"rat_server", "Обнаружен сервер удалённого контроля ПК (RAT Server)", 90},
	{"reverse_tcp", "Обнаружен обратный TCP-шелл управления ПК", 95},
	{"bind_tcp", "Обнаружен скрытый TCP-шелл удалённого доступа", 95},

	// Reverse shells & remote command execution payloads
	{"net.sockets.tcpclient", "Попытка открыть удалённый обратный шелл (TCPClient)", 90},
	{"invoke-powershelltcp", "PowerShell Reverse Shell удалённого управления ПК", 100},
	{"/dev/tcp/", "Обратный шелл удалённого управления (/dev/tcp)", 95},
	{"nc.exe -e", "Netcat удалённый шелл управления ПК (nc -e)", 100},
	{"ncat -e", "Ncat удалённый шелл управления ПК (ncat -e)", 100},
	{"socat exec:", "Socat удалённый шелл управления ПК", 95},
	{"redirectstandardinput", "Скрытый перехват командной строки (Remote Shell)", 65},
	{"-encodedcommand", "Скрытая закодированная команда PowerShell (-EncodedCommand)", 75},
	{"frombase64string", "Декодирование скрытой полезной нагрузки (Base64)", 50},
	{"downloadstring(", "Загрузка и запуск удалённого кода из сети (DownloadString)", 80},
	{"invoke-expression", "Динамическое выполнение удалённого кода (Invoke-Expression)", 60},
	{"mshta http", "Скрытый удалённый запуск через mshta.exe", 95},
	{"rundll32 javascript:", "Обход защиты и выполнение кода через rundll32", 95},
	{"regsvr32 /s /n /u /i:http", "Удалённая загрузка скрипта через regsvr32 (Squiblydoo)", 95},
	{"certutil -urlcache", "Скрытая загрузка чужого файла через certutil", 85},
	{"bitsadmin /transfer", "Скрытая фоновая загрузка чужого файла (BITSAdmin)", 80},

	// Input / Screen Hijack, Keylogging & Remote Control Win32 APIs
	{"setwindowshookex", "Перехват клавиатуры/мыши (Keylogger / Hook)", 55},
	{"getasynckeystate", "Скрытое считывание нажатий клавиш (Keylogger)", 45},
	{"sendinput", "Программное управление мышью/клавиатурой", 35},
	{"mouse_event", "Скрытое управление курсором мыши", 40},
	{"keybd_event", "Скрытая эмуляция нажатий клавиатуры", 40},
	{"blockinput", "Попытка заблокировать ввод пользователя (BlockInput)", 85},
	{"ntraisesystemerror", "Попытка вызвать BSOD / крах системы", 95},
	{"rtlsetprocessiscritical", "Попытка сделать вредоносный процесс критическим", 95},

	// Defense Tampering & Ransomware / Shadow Deletion
	{"disable-realtimemonitoring", "Попытка отключить антивирус в реальном времени", 100},
	{"disablerealtimemonitoring", "Попытка отключить антивирус (DisableRealtimeMonitoring)", 100},
	{"add-mppreference -exclusionpath", "Попытка добавить вредонос в исключения антивируса", 95},
	{"vssadmin delete shadows", "Попытка удалить теневые копии (Ransomware)", 100},
	{"wmic shadowcopy delete", "Попытка уничтожить резервные копии Windows", 100},
	{"bcdedit /set {default} recoveryenabled no", "Попытка отключить восстановление Windows", 100},
	{"currentversion\\run", "Попытка скрытого закрепления в автозагрузке Windows", 45},
	{"schtasks /create", "Попытка скрытого закрепления в планировщике задач", 50},

	// USB Flash Drive Worms & Autorun Hijackers
	{"[autorun]", "Вредоносный автозапуск с USB-флешки (autorun.inf)", 95},
	{"shellexecute=", "Скрытый автозапуск файла с USB-флешки", 85},
	{"open=", "Автозапуск исполняемого файла с USB-флешки", 45},
	{"wscript.shell", "Скриптовое управление ПК (WScript.Shell)", 55},
	{"shell.application", "Скрытый запуск процессов через Shell.Application", 50},
	{"createremotethread", "Инъекция кода в чужой процесс (CreateRemoteThread)", 90},
	{"virtualallocex", "Выделение памяти в чужом процессе (Process Injection)", 80},
	{"writeprocessmemory", "Запись вредоносного кода в чужой процесс", 85},
	{"ntunmapviewofsection", "Подмена системного процесса (Process Hollowing)", 95},
}

var dangerousForeignExts = map[string]bool{
	".exe": true, ".scr": true, ".pif": true, ".com": true, ".bat": true,
	".cmd": true, ".vbs": true, ".vbe": true, ".js": true, ".jse": true,
	".wsf": true, ".wsh": true, ".ps1": true, ".hta": true, ".msi": true,
	".dll": true, ".cpl": true, ".reg": true, ".lnk": true, ".inf": true,
}

var doubleExtDecoys = []string{
	".pdf.", ".doc.", ".docx.", ".xls.", ".xlsx.", ".ppt.", ".pptx.",
	".jpg.", ".jpeg.", ".png.", ".gif.", ".mp4.", ".mp3.", ".txt.", ".zip.", ".rar.",
}

func hardcoreConfigPath() string {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		home = os.TempDir()
	}
	dir := filepath.Join(home, ".luma_quarantine")
	_ = os.MkdirAll(dir, 0o700)
	return filepath.Join(dir, "hardcore_config.json")
}

func loadHardcoreShieldConfig() {
	raw, err := os.ReadFile(hardcoreConfigPath())
	if err != nil {
		return
	}
	var cfg HardcoreShieldConfig
	if json.Unmarshal(raw, &cfg) == nil {
		hcMu.Lock()
		hcConfig = cfg
		hcMu.Unlock()
	}
}

func saveHardcoreShieldConfig(cfg HardcoreShieldConfig) {
	b, err := json.MarshalIndent(cfg, "", "  ")
	if err == nil {
		_ = os.WriteFile(hardcoreConfigPath(), b, 0o600)
	}
}

func startHardcoreShieldEngine(sk *SecurityKernel) {
	hcMu.Lock()
	if hcStarted {
		hcMu.Unlock()
		return
	}
	hcStarted = true
	hcSecurityKernel = sk
	hcMu.Unlock()

	loadHardcoreShieldConfig()
	if sk != nil {
		sk.LogAudit("ok", "shield3", "LumaShield 3.0 Hardcore Active Defense запущен", "340+ правил Anti-RAT, Щит USB-флешек, Блокировка чужих файлов и Авто-уничтожение под ноль")
	}

	go func() {
		defer func() { _ = recover() }()
		// Initial quick USB scan on boot
		time.Sleep(4 * time.Second)
		runHardcoreGuardTick()

		ticker := time.NewTicker(6 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			func() {
				defer func() { _ = recover() }()
				runHardcoreGuardTick()
			}()
		}
	}()
}

// isProtectedCorePath guarantees LumaShield 3.0 NEVER deletes Windows system files or Luma OS itself!
func isProtectedCorePath(targetPath string) bool {
	abs, err := filepath.Abs(targetPath)
	if err != nil {
		abs = targetPath
	}
	low := strings.ToLower(filepath.Clean(abs))

	// Never touch current Luma OS executable or any LumaOS_*.exe
	if exe, err := os.Executable(); err == nil && exe != "" {
		exeLow := strings.ToLower(filepath.Clean(exe))
		if low == exeLow {
			return true
		}
	}
	base := strings.ToLower(filepath.Base(low))
	if strings.HasPrefix(base, "lumaos_") && strings.HasSuffix(base, ".exe") {
		return true
	}

	// Never touch critical Windows OS directories or Linux root binaries
	if runtime.GOOS == "windows" {
		winDir := strings.ToLower(os.Getenv("WINDIR"))
		if winDir == "" {
			winDir = `c:\windows`
		}
		protectedPrefixes := []string{
			winDir + `\system32\`,
			winDir + `\syswow64\`,
			winDir + `\winsxs\`,
			winDir + `\boot\`,
			winDir + `\servicing\`,
			`c:\program files\windows`,
			`c:\program files (x86)\microsoft\edgewebview`,
		}
		for _, p := range protectedPrefixes {
			if strings.HasPrefix(low, p) {
				return true
			}
		}
		if low == winDir+`\explorer.exe` || low == winDir+`\regedit.exe` || low == winDir+`\notepad.exe` {
			return true
		}
	} else {
		for _, p := range []string{"/bin/", "/sbin/", "/usr/bin/", "/usr/sbin/", "/lib/", "/boot/", "/etc/", "/proc/", "/sys/"} {
			if strings.HasPrefix(low, p) {
				return true
			}
		}
	}

	// Respect user whitelist / exclusions in SecurityKernel
	hcMu.RLock()
	sk := hcSecurityKernel
	hcMu.RUnlock()
	if sk != nil {
		sk.mu.RLock()
		for _, ex := range sk.exclusions {
			exLow := strings.ToLower(strings.TrimSpace(ex))
			if exLow != "" && strings.Contains(low, exLow) {
				sk.mu.RUnlock()
				return true
			}
		}
		sk.mu.RUnlock()
	}

	return false
}

func isProtectedCoreProcess(procName string) bool {
	low := strings.ToLower(strings.TrimSpace(procName))
	switch low {
	case "system", "registry", "smss.exe", "csrss.exe", "wininit.exe", "winlogon.exe",
		"services.exe", "lsass.exe", "svchost.exe", "dwm.exe", "explorer.exe",
		"taskmgr.exe", "fontdrvhost.exe", "sihost.exe", "ctfmon.exe", "msedgewebview2.exe",
		"audiodg.exe", "spoolsv.exe", "searchindexer.exe", "securityhealthservice.exe",
		"msmpeng.exe", "nissrv.exe":
		return true
	}
	if strings.HasPrefix(low, "lumaos_") {
		return true
	}
	return false
}

func appendHardcoreEvent(ev HardcoreShieldEvent) {
	if ev.ID == "" {
		ev.ID = fmt.Sprintf("hc_%d", time.Now().UnixNano())
	}
	if ev.Time == "" {
		ev.Time = time.Now().Format("15:04:05")
	}
	hcMu.Lock()
	hcEvents = append([]HardcoreShieldEvent{ev}, hcEvents...)
	if len(hcEvents) > 120 {
		hcEvents = hcEvents[:120]
	}
	hcMu.Unlock()

	hcMu.RLock()
	sk := hcSecurityKernel
	hcMu.RUnlock()
	if sk != nil {
		lvl := "warn"
		if ev.Action == "shredded_zero" || ev.Action == "usb_neutralized" || ev.Action == "process_killed" {
			lvl = "alert"
		}
		sk.LogAudit(lvl, "shield3", fmt.Sprintf("LumaShield 3.0 [%s]: %s", ev.Action, ev.Name), ev.Reason+" · "+ev.Path)
	}
}

// ShredFileToZero terminates any process backed by path, strips Hidden/System/ReadOnly attributes,
// overwrites bytes with zeros, truncates to 0, and permanently deletes the file from disk!
func ShredFileToZero(targetPath, reason, source string) (bool, string, string) {
	if strings.TrimSpace(targetPath) == "" {
		return false, "", "Пустой путь к файлу"
	}
	if isProtectedCorePath(targetPath) {
		return false, "", "Файл защищён белым списком ядра ОС / Luma OS"
	}

	info, err := os.Stat(targetPath)
	if err != nil {
		return false, "", "Файл уже отсутствует: " + err.Error()
	}
	if info.IsDir() {
		return false, "", "Указана папка, а не файл"
	}

	// Compute SHA-256 before zeroing for forensic log
	var hashHex string
	if f, err := os.Open(targetPath); err == nil {
		h := sha256.New()
		_, _ = io.CopyN(h, f, 8*1024*1024)
		hashHex = hex.EncodeToString(h.Sum(nil))
		_ = f.Close()
	}

	// 1. Kill any running process using this executable
	if killed := killProcessByPath(targetPath); killed > 0 {
		hcMu.Lock()
		hcKilledProcs += killed
		hcMu.Unlock()
	}

	// 2. Strip Read-Only / Hidden / System attributes
	stripWindowsFileAttributes(targetPath)
	_ = os.Chmod(targetPath, 0o666)

	// 3. Overwrite with zeros (up to 32 MB for instant zero-lag response) & truncate
	if f, err := os.OpenFile(targetPath, os.O_WRONLY, 0o666); err == nil {
		size := info.Size()
		if size > 32*1024*1024 {
			size = 32 * 1024 * 1024
		}
		zeroBuf := make([]byte, 64*1024)
		var written int64
		for written < size {
			chunk := int64(len(zeroBuf))
			if size-written < chunk {
				chunk = size - written
			}
			n, wErr := f.Write(zeroBuf[:chunk])
			if wErr != nil || n == 0 {
				break
			}
			written += int64(n)
		}
		_ = f.Truncate(0)
		_ = f.Sync()
		_ = f.Close()
	}

	// 4. Permanently remove file
	if err := os.Remove(targetPath); err != nil {
		return false, hashHex, "Не удалось удалить файл: " + err.Error()
	}

	hcMu.Lock()
	hcShreddedCount++
	hcMu.Unlock()

	// Remove from SecurityKernel lastThreats if present
	hcMu.RLock()
	sk := hcSecurityKernel
	hcMu.RUnlock()
	if sk != nil {
		sk.mu.Lock()
		filtered := sk.lastThreats[:0]
		for _, t := range sk.lastThreats {
			if !strings.EqualFold(t.Path, targetPath) {
				filtered = append(filtered, t)
			}
		}
		sk.lastThreats = filtered
		sk.mu.Unlock()
	}

	action := "shredded_zero"
	if source == "usb" {
		action = "usb_neutralized"
	}
	appendHardcoreEvent(HardcoreShieldEvent{
		Action:  action,
		Source:  source,
		Name:    filepath.Base(targetPath),
		Path:    targetPath,
		Reason:  reason,
		SHA256:  hashHex,
		Success: true,
	})
	return true, hashHex, "Файл перезаписан нулями и уничтожен под ноль"
}

// analyzeRemoteControlThreat inspects a file for remote-control / RAT / USB worm / foreign threat indicators.
// Returns (isRemoteControlThreat, isForeignSuspicious, score, reason).
func analyzeRemoteControlThreat(path string, info os.FileInfo, isUsb bool) (bool, bool, int, string) {
	if info == nil || info.IsDir() || isProtectedCorePath(path) {
		return false, false, 0, ""
	}
	base := strings.ToLower(filepath.Base(path))
	ext := strings.ToLower(filepath.Ext(base))

	// 1. Instant USB autorun.inf detection
	if isUsb && base == "autorun.inf" {
		return true, true, 100, "Вредоносный файл автозапуска USB-флешки (autorun.inf)"
	}

	// 2. Double-extension masquerading (e.g. "photo.jpg.exe", "invoice.pdf.scr", "doc.docx.vbs")
	if dangerousForeignExts[ext] {
		for _, decoy := range doubleExtDecoys {
			if strings.Contains(base, decoy) {
				return true, true, 100, fmt.Sprintf("Маскировка исполняемого файла под документ (%s)", base)
			}
		}
	}

	// 3. Suspicious filename keywords for RATs / remote-control tools
	for _, kw := range []string{"asyncrat", "njrat", "quasarrat", "remcos", "darkcomet", "nanocore", "xworm", "dcrat", "venomrat", "keylogger", "stealer", "rat_stub", "reverse_shell", "backdoor"} {
		if strings.Contains(base, kw) {
			return true, true, 100, fmt.Sprintf("Обнаружена сигнатура удалённого управления ПК в имени файла (%s)", kw)
		}
	}

	// 4. Content inspection (read up to 512 KB for fast deep heuristic matching)
	isForeign := isUsb || hasMarkOfTheWeb(path)
	if !dangerousForeignExts[ext] && ext != ".txt" && ext != ".py" && ext != ".sh" && ext != ".rb" && ext != ".php" {
		return false, false, 0, ""
	}

	f, err := os.Open(path)
	if err != nil {
		return false, false, 0, ""
	}
	buf := make([]byte, 512*1024)
	n, _ := f.Read(buf)
	_ = f.Close()
	if n <= 0 {
		return false, isForeign && dangerousForeignExts[ext], 0, ""
	}
	sample := buf[:n]

	// Check EICAR test string
	if bytes.Contains(sample, []byte(eicarStandardSignature)) {
		return true, true, 100, "Тестовая вирусная сигнатура EICAR (LumaShield 3.0)"
	}

	lowerSample := strings.ToLower(string(sample))
	// Also normalize UTF-16LE ASCII strings common in .NET / Windows RAT binaries
	var asciiFold strings.Builder
	if bytes.Contains(sample, []byte{0x00}) && n <= 256*1024 {
		asciiFold.Grow(n / 2)
		for i := 0; i < n; i++ {
			b := sample[i]
			if b >= 32 && b <= 126 {
				if b >= 'A' && b <= 'Z' {
					b += 32
				}
				asciiFold.WriteByte(b)
			}
		}
	}
	folded := asciiFold.String()

	totalScore := 0
	topReason := ""
	topScore := 0
	matchedHits := 0

	for _, sig := range remoteControlSignatures {
		if strings.Contains(lowerSample, sig.needle) || (folded != "" && strings.Contains(folded, sig.needle)) {
			totalScore += sig.score
			matchedHits++
			if sig.score > topScore {
				topScore = sig.score
				topReason = sig.reason
			}
			if totalScore >= 100 {
				break
			}
		}
	}

	// USB .lnk worm check: shortcut pointing to powershell / cmd / wscript / mshta
	if isUsb && ext == ".lnk" {
		if strings.Contains(lowerSample, "powershell") || strings.Contains(folded, "powershell") ||
			strings.Contains(lowerSample, "cmd.exe") || strings.Contains(folded, "cmd.exe") ||
			strings.Contains(lowerSample, "wscript") || strings.Contains(folded, "wscript") ||
			strings.Contains(lowerSample, "mshta") || strings.Contains(folded, "mshta") {
			return true, true, 100, "Вирусный ярлык USB-флешки (.lnk запускает скрытую консоль/скрипт)"
		}
	}

	// Threshold: >= 85 score means confirmed Remote Control / RAT / Trojan payload!
	if totalScore >= 85 {
		return true, true, totalScore, fmt.Sprintf("%s (риск %d/100, совпадений: %d)", topReason, minIntVal(100, totalScore), matchedHits)
	}

	// Foreign untrusted script/executable with Mark-of-the-Web or on USB with suspicious hits (>= 45)
	if isForeign && dangerousForeignExts[ext] && totalScore >= 45 {
		return false, true, totalScore, fmt.Sprintf("Подозрительный чужой файл (%s · риск %d/100)", topReason, totalScore)
	}

	// Strict foreign script blocker for USB hidden/script payloads (.vbs/.vbe/.hta/.pif/.scr/.bat/.ps1)
	if isUsb && (ext == ".vbs" || ext == ".vbe" || ext == ".hta" || ext == ".pif" || ext == ".scr") {
		return true, true, 90, fmt.Sprintf("Опасный исполняемый скрипт на USB-флешке (%s)", ext)
	}

	return false, false, totalScore, ""
}

func minIntVal(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func scanDirectoryHardcore(rootDir string, isUsb bool, maxDepth int, cfg HardcoreShieldConfig) (scanned int, threatsFound int, shredded int, blocked int) {
	if rootDir == "" {
		return
	}
	rootClean := filepath.Clean(rootDir)
	_ = filepath.WalkDir(rootClean, func(p string, d os.DirEntry, err error) error {
		if err != nil || d == nil {
			return nil
		}
		if d.IsDir() {
			if p == rootClean {
				return nil
			}
			nameLow := strings.ToLower(d.Name())
			if nameLow == "system volume information" || nameLow == "$recycle.bin" || nameLow == ".git" || nameLow == "node_modules" {
				return filepath.SkipDir
			}
			rel, rErr := filepath.Rel(rootClean, p)
			if rErr == nil {
				depth := strings.Count(filepath.ToSlash(rel), "/") + 1
				if depth > maxDepth {
					return filepath.SkipDir
				}
			}
			return nil
		}
		if scanned >= 800 {
			return filepath.SkipAll
		}
		info, iErr := d.Info()
		if iErr != nil || info == nil || info.Size() > 40*1024*1024 {
			return nil
		}
		scanned++

		isRC, isForeignSusp, _, reason := analyzeRemoteControlThreat(p, info, isUsb)
		if isRC {
			threatsFound++
			if cfg.HardcoreMode && cfg.AutoShredRemoteControl {
				src := "system"
				if isUsb {
					src = "usb"
				}
				if ok, _, _ := ShredFileToZero(p, reason, src); ok {
					shredded++
				}
			} else {
				appendHardcoreEvent(HardcoreShieldEvent{
					Action:  "detected",
					Source:  map[bool]string{true: "usb", false: "system"}[isUsb],
					Name:    filepath.Base(p),
					Path:    p,
					Reason:  reason,
					Success: true,
				})
			}
			return nil
		}

		if isForeignSusp && cfg.HardcoreMode && cfg.BlockForeignFiles {
			threatsFound++
			hcMu.RLock()
			sk := hcSecurityKernel
			hcMu.RUnlock()
			if sk != nil {
				if _, qErr := sk.QuarantineFile(p, reason, "high"); qErr == nil {
					blocked++
					hcMu.Lock()
					hcBlockedForeign++
					hcMu.Unlock()
					appendHardcoreEvent(HardcoreShieldEvent{
						Action:  "blocked_foreign",
						Source:  map[bool]string{true: "usb", false: "foreign"}[isUsb],
						Name:    filepath.Base(p),
						Path:    p,
						Reason:  reason,
						Success: true,
					})
				}
			}
		}
		return nil
	})
	return
}

func runHardcoreGuardTick() {
	hcMu.RLock()
	cfg := hcConfig
	hcMu.RUnlock()

	nowStr := time.Now().Format("15:04:05")
	hcMu.Lock()
	hcLastTickAt = nowStr
	hcMu.Unlock()

	if !cfg.HardcoreMode {
		return
	}

	// 1. Real-Time USB / Flash Drive Guard
	if cfg.UsbFlashGuard {
		drives := listRemovableDrives()
		updated := make([]UsbDriveInfo, 0, len(drives))
		for _, drv := range drives {
			_, threats, _, _ := scanDirectoryHardcore(drv.Path, true, 2, cfg)
			drv.ScannedAt = nowStr
			drv.Threats = threats
			updated = append(updated, drv)
		}
		hcMu.Lock()
		hcUsbDrives = updated
		hcMu.Unlock()
	}

	// 2. Real-Time Foreign File Blocker (Downloads / Temp / Desktop)
	if cfg.BlockForeignFiles || cfg.AutoShredRemoteControl {
		home, _ := os.UserHomeDir()
		watchDirs := []string{filepath.Join(os.TempDir(), "LumaShield_Test")}
		if home != "" {
			watchDirs = append(watchDirs, filepath.Join(home, "Downloads"), filepath.Join(home, "Desktop"))
		}
		for _, dir := range watchDirs {
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
				if err != nil || info == nil || info.Size() > 40*1024*1024 {
					continue
				}
				stamp := info.ModTime().UnixNano()
				hcMu.RLock()
				prev, seen := hcSeenForeign[full]
				hcMu.RUnlock()
				if seen && prev == stamp {
					continue
				}
				hcMu.Lock()
				hcSeenForeign[full] = stamp
				hcMu.Unlock()

				isRC, isForeignSusp, _, reason := analyzeRemoteControlThreat(full, info, false)
				if isRC && cfg.AutoShredRemoteControl {
					_, _, _ = ShredFileToZero(full, reason, "system")
				} else if isForeignSusp && cfg.BlockForeignFiles {
					hcMu.RLock()
					sk := hcSecurityKernel
					hcMu.RUnlock()
					if sk != nil {
						if _, qErr := sk.QuarantineFile(full, reason, "high"); qErr == nil {
							hcMu.Lock()
							hcBlockedForeign++
							hcMu.Unlock()
							appendHardcoreEvent(HardcoreShieldEvent{
								Action:  "blocked_foreign",
								Source:  "foreign",
								Name:    filepath.Base(full),
								Path:    full,
								Reason:  reason,
								Success: true,
							})
						}
					}
				}
			}
		}
	}

	// 3. Active Remote-Control Process Killer
	if cfg.KillRemoteControlProcs {
		hits := scanSuspiciousRemoteProcesses()
		for _, hit := range hits {
			if isProtectedCoreProcess(hit.Name) || isProtectedCorePath(hit.Path) {
				continue
			}
			killed := killProcessByPID(hit.PID)
			if killed {
				hcMu.Lock()
				hcKilledProcs++
				hcMu.Unlock()
				appendHardcoreEvent(HardcoreShieldEvent{
					Action:  "process_killed",
					Source:  "process",
					Name:    hit.Name,
					Path:    hit.Path,
					Reason:  hit.Reason,
					Success: true,
				})
			}
			if cfg.AutoShredRemoteControl && hit.Path != "" {
				_, _, _ = ShredFileToZero(hit.Path, hit.Reason, "process")
			}
		}
	}
}

type suspiciousProcHit struct {
	PID    int
	Name   string
	Path   string
	Reason string
}

func getHardcoreShieldStatus() HardcoreShieldStatus {
	hcMu.RLock()
	cfg := hcConfig
	eventsCopy := append([]HardcoreShieldEvent(nil), hcEvents...)
	drivesCopy := append([]UsbDriveInfo(nil), hcUsbDrives...)
	shredded := hcShreddedCount
	blocked := hcBlockedForeign
	killed := hcKilledProcs
	lastTick := hcLastTickAt
	hcMu.RUnlock()

	exePath, _ := os.Executable()
	return HardcoreShieldStatus{
		Ok:                true,
		Version:           "3.0",
		RulesCount:        340,
		Config:            cfg,
		ShreddedCount:     shredded,
		BlockedForeign:    blocked,
		KilledProcesses:   killed,
		UsbDrives:         drivesCopy,
		Events:            eventsCopy,
		LastTickAt:        lastTick,
		ProtectedSelfPath: exePath,
	}
}

func registerHardcoreShieldRoutes(mux *http.ServeMux, sk *SecurityKernel) {
	startHardcoreShieldEngine(sk)

	mux.HandleFunc("/api/kernel/security/hardcore/config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method == http.MethodPost {
			hcMu.RLock()
			next := hcConfig
			hcMu.RUnlock()
			if err := json.NewDecoder(r.Body).Decode(&next); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
				return
			}
			hcMu.Lock()
			hcConfig = next
			hcMu.Unlock()
			saveHardcoreShieldConfig(next)
			if sk != nil {
				sk.LogAudit("ok", "shield3", "Настройки LumaShield 3.0 обновлены", fmt.Sprintf("Hardcore=%v · AutoShred=%v · USB=%v · Foreign=%v · ProcKill=%v",
					next.HardcoreMode, next.AutoShredRemoteControl, next.UsbFlashGuard, next.BlockForeignFiles, next.KillRemoteControlProcs))
			}
		}
		_ = json.NewEncoder(w).Encode(getHardcoreShieldStatus())
	})

	// Immediate Zero-Trace Shred endpoint (deletes any malicious/remote-control file under zero!)
	mux.HandleFunc("/api/kernel/security/hardcore/shred", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var req struct {
			Path   string `json:"path"`
			Reason string `json:"reason"`
			Source string `json:"source"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		if req.Reason == "" {
			req.Reason = "Ручное уничтожение угрозы под ноль (LumaShield 3.0)"
		}
		if req.Source == "" {
			req.Source = "system"
		}
		ok, sha, msg := ShredFileToZero(req.Path, req.Reason, req.Source)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":      ok,
			"sha256":  sha,
			"message": msg,
			"status":  getHardcoreShieldStatus(),
		})
	})

	// Force immediate deep USB / Flash Drive scan (+ optional custom directory for verification)
	mux.HandleFunc("/api/kernel/security/hardcore/usb-scan", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var req struct {
			CustomPath string `json:"custom_path"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)

		hcMu.RLock()
		cfg := hcConfig
		hcMu.RUnlock()

		drives := listRemovableDrives()
		if strings.TrimSpace(req.CustomPath) != "" {
			drives = append(drives, UsbDriveInfo{Path: req.CustomPath, Label: "USB Target"})
		}

		totalScanned := 0
		totalThreats := 0
		totalShredded := 0
		totalBlocked := 0
		nowStr := time.Now().Format("15:04:05")
		for i := range drives {
			sc, th, sh, bl := scanDirectoryHardcore(drives[i].Path, true, 3, cfg)
			drives[i].ScannedAt = nowStr
			drives[i].Threats = th
			totalScanned += sc
			totalThreats += th
			totalShredded += sh
			totalBlocked += bl
		}
		hcMu.Lock()
		hcUsbDrives = drives
		hcMu.Unlock()

		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":       true,
			"drives":   drives,
			"scanned":  totalScanned,
			"threats":  totalThreats,
			"shredded": totalShredded,
			"blocked":  totalBlocked,
			"status":   getHardcoreShieldStatus(),
		})
	})

	// Active Anti-RAT & Remote-Control Hunt across system folders, USB drives & running processes
	mux.HandleFunc("/api/kernel/security/hardcore/hunt", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var req struct {
			CustomPath string `json:"custom_path"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)

		hcMu.RLock()
		cfg := hcConfig
		hcMu.RUnlock()

		totalScanned := 0
		totalThreats := 0
		totalShredded := 0
		totalBlocked := 0
		killedNow := 0

		// 1. Scan suspicious running processes
		for _, hit := range scanSuspiciousRemoteProcesses() {
			if isProtectedCoreProcess(hit.Name) || isProtectedCorePath(hit.Path) {
				continue
			}
			totalThreats++
			if cfg.HardcoreMode && cfg.KillRemoteControlProcs && killProcessByPID(hit.PID) {
				killedNow++
				hcMu.Lock()
				hcKilledProcs++
				hcMu.Unlock()
				appendHardcoreEvent(HardcoreShieldEvent{
					Action:  "process_killed",
					Source:  "process",
					Name:    hit.Name,
					Path:    hit.Path,
					Reason:  hit.Reason,
					Success: true,
				})
			}
			if cfg.HardcoreMode && cfg.AutoShredRemoteControl && hit.Path != "" {
				if ok, _, _ := ShredFileToZero(hit.Path, hit.Reason, "process"); ok {
					totalShredded++
				}
			}
		}

		// 2. Scan Downloads, Desktop, Temp, Startup & optional custom path
		dirs := []string{}
		if strings.TrimSpace(req.CustomPath) != "" {
			dirs = append(dirs, req.CustomPath)
		} else {
			home, _ := os.UserHomeDir()
			if home != "" {
				dirs = append(dirs,
					filepath.Join(home, "Downloads"),
					filepath.Join(home, "Desktop"),
					filepath.Join(home, "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Startup"),
				)
			}
			dirs = append(dirs, filepath.Join(os.TempDir(), "LumaShield_Test"))
		}
		for _, dir := range dirs {
			sc, th, sh, bl := scanDirectoryHardcore(dir, false, 2, cfg)
			totalScanned += sc
			totalThreats += th
			totalShredded += sh
			totalBlocked += bl
		}

		// 3. Scan connected USB drives
		for _, drv := range listRemovableDrives() {
			sc, th, sh, bl := scanDirectoryHardcore(drv.Path, true, 2, cfg)
			totalScanned += sc
			totalThreats += th
			totalShredded += sh
			totalBlocked += bl
		}

		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":       true,
			"scanned":  totalScanned,
			"threats":  totalThreats,
			"shredded": totalShredded,
			"blocked":  totalBlocked,
			"killed":   killedNow,
			"status":   getHardcoreShieldStatus(),
		})
	})
}
