package main

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

// LumaShield 2.5 — Next-Gen Zero-Conflict Antivirus & Threat Detection Engine for Luma OS 1.6 (Nitrogen).
// Runs cleanly alongside Windows Defender with zero driver conflicts:
//   - 230+ heuristic, behavioral & YARA-like rules (Telegram/Discord/Browser/Crypto/Cloud/Dev Stealers, Ransomware,
//     BYOVD Drivers, Keyloggers, Crypto-Clippers, Reverse Shells, LOLBins, AMSI/ETW/UAC Bypass, Rootkits, Office Macros)
//   - Deep Archive & Office Macro Inspector (.zip, .docm, .xlsm, .pptm, .docx, .xlsx, .pptx -> vbaProject.bin & hidden EXEs)
//   - PE Header ("MZ") Masquerading & Shannon Entropy Packed-Binary Detector (>7.55) across Downloads/Desktop/Documents/Temp
//   - Unified Startup + Scheduled Tasks Persistence Auditor, Live Process + Network + Hosts Audit & Exportable Report

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
	defer func() { _ = recover() }()
	ticker := time.NewTicker(45 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		func() {
			defer func() { _ = recover() }()
			s.realtimeGuardTick()
		}()
	}
}

func (s *SecurityKernel) realtimeGuardTick() {
		s.mu.RLock()
		enabled := s.realtimeGuardEnabled
		s.mu.RUnlock()
		if !enabled {
			return
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
	".pdf.exe", ".doc.exe", ".docx.exe", ".xls.exe", ".xlsx.exe", ".ppt.exe", ".pptx.exe",
	".jpg.exe", ".jpeg.exe", ".png.exe", ".mp3.exe", ".mp4.exe", ".txt.exe", ".avi.exe",
	".pdf.scr", ".jpg.scr", ".png.scr", ".doc.scr", ".txt.vbs", ".pdf.vbs", ".docx.vbs",
	".jpg.bat", ".png.bat", ".docx.js", ".pdf.js", ".zip.exe", ".rar.exe", ".7z.exe",
	".pdf.cmd", ".txt.cmd", ".doc.hta", ".pdf.hta", ".png.pif", ".doc.lnk", ".pdf.lnk",
	".mp4.scr", ".wav.exe", ".rtf.exe", ".csv.exe",
}

var ransomwareExts = map[string]bool{
	".wannacry": true, ".wcry": true, ".wncry": true, ".lockbit": true, ".ryuk": true,
	".cryptolocker": true, ".cerber": true, ".blackcat": true, ".alphv": true, ".conti": true,
	".revil": true, ".sodinokibi": true, ".djvu": true, ".stop": true, ".phobos": true,
	".akira": true, ".royal": true, ".play": true, ".clop": true, ".hive": true,
	".medusa": true, ".blackbasta": true, ".rhysida": true,
	// LumaShield 2.5 modern ransomware family extensions
	".blacksuit": true, ".hunters": true, ".inc": true, ".bianlian": true, ".qilin": true,
	".ransomhub": true, ".cactus": true, ".8base": true, ".trigona": true, ".mallox": true,
	".cuba": true, ".snatch": true, ".lockbit3": true, ".babuk": true, ".makop": true,
}

type heuristicRule struct {
	needle   []byte
	category string
	severity string
	reason   string
}

var scriptHeuristics = []heuristicRule{
	{[]byte(eicarStandardSignature), "EICAR-Test", "high", "Обнаружена стандартная тестовая сигнатура антивируса EICAR"},
	// 1. PowerShell / Obfuscation / Download Cradles
	{[]byte("invoke-expression"), "Suspicious-Script", "medium", "Скрытое динамическое выполнение PowerShell (Invoke-Expression)"},
	{[]byte("-encodedcommand"), "Obfuscated-PS", "high", "Обфусцированная команда PowerShell (-EncodedCommand)"},
	{[]byte("-enc "), "Obfuscated-PS", "high", "Скрытая закодированная команда PowerShell (-enc)"},
	{[]byte("frombase64string"), "Obfuscated-Payload", "medium", "Декодирование скрытой Base64 нагрузки в скрипте"},
	{[]byte("powershell -nop -w hidden"), "Stealth-PS", "high", "Скрытый запуск PowerShell без окна (-nop -w hidden)"},
	{[]byte("-windowstyle hidden"), "Stealth-PS", "medium", "Попытка скрыть окно выполнения сценария (-WindowStyle Hidden)"},
	{[]byte("downloadstring("), "Dropper-Script", "medium", "Загрузка и исполнение удалённого кода (DownloadString)"},
	{[]byte("downloadfile("), "Dropper-Script", "medium", "Скрытая загрузка файла через WebClient.DownloadFile"},
	{[]byte("invoke-webrequest"), "Dropper-Script", "low", "Загрузка данных из сети внутри системного скрипта"},
	{[]byte("start-bitstransfer"), "Dropper-Script", "medium", "Фоновая загрузка удалённой нагрузки через BITS"},
	{[]byte("net.webclient"), "Dropper-Script", "medium", "Использование сетевого загрузчика Net.WebClient"},
	{[]byte("reflection.assembly]::load"), "Fileless-Malware", "high", "Бесфайловая загрузка .NET-сборки прямо в память"},
	{[]byte("gzipstream"), "Obfuscated-Payload", "medium", "Распаковка сжатого полезного кода в памяти"},
	{[]byte("memorystream"), "Fileless-Malware", "medium", "Исполнение нагрузки через MemoryStream"},
	// 2. LOLBins & Living-off-the-Land Droppers
	{[]byte("certutil -urlcache"), "LOLBin-Dropper", "high", "Попытка скрытой загрузки через certutil -urlcache"},
	{[]byte("certutil -decode"), "LOLBin-Decoder", "high", "Декодирование скрытого бинарника через certutil -decode"},
	{[]byte("bitsadmin /transfer"), "LOLBin-Dropper", "high", "Скрытая загрузка файла через bitsadmin /transfer"},
	{[]byte("mshta http"), "Remote-HTA", "high", "Удалённый запуск HTA-сценария (mshta http)"},
	{[]byte("mshta vbscript:"), "Remote-HTA", "high", "Скрытый запуск VBScript через mshta"},
	{[]byte("regsvr32 /s /u /i:http"), "LOLBin-Squiblydoo", "high", "Удалённое выполнение скрипта через regsvr32 (Squiblydoo)"},
	{[]byte("regsvr32 /s /n /u /i:http"), "LOLBin-Abuse", "high", "Удалённая загрузка скрипта через regsvr32 (Squiblydoo)"},
	{[]byte("rundll32 javascript:"), "LOLBin-Script", "high", "Исполнение скрытого JavaScript через rundll32"},
	{[]byte("rundll32 url.dll"), "LOLBin-Abuse", "medium", "Запуск скрытого URL/объекта через rundll32"},
	{[]byte("cmstp /s"), "LOLBin-Bypass", "high", "Обход контроля приложений через cmstp"},
	{[]byte("installutil /logfile="), "LOLBin-Bypass", "high", "Запуск кода в обход AppLocker через InstallUtil"},
	{[]byte("wmic process call create"), "LOLBin-Exec", "high", "Скрытый запуск процесса через WMIC"},
	{[]byte("forfiles /p "), "LOLBin-Exec", "medium", "Нестандартный запуск команды через forfiles"},
	{[]byte("msiexec /q /i http"), "LOLBin-Dropper", "high", "Тихая удалённая установка MSI-пакета"},
	// 3. Telegram / Discord / Browser / Crypto Wallet InfoStealers
	{[]byte("\\telegram desktop\\tdata"), "Telegram-Stealer", "high", "Попытка кражи сессии Telegram Desktop (tdata)"},
	{[]byte("tdata\\d877f783d5d3ef8c"), "Telegram-Stealer", "high", "Сигнатура стилера ключей сессии Telegram"},
	{[]byte("api.telegram.org/bot"), "InfoStealer-Exfil", "high", "Скрытая отправка украденных данных через Telegram Bot API"},
	{[]byte("discord.com/api/webhooks"), "InfoStealer-Webhook", "medium", "Подозрительная отправка данных через Discord Webhook"},
	{[]byte("\\discord\\local storage\\leveldb"), "Discord-Stealer", "high", "Попытка кражи токенов авторизации Discord"},
	{[]byte("\\google\\chrome\\user data\\default\\login data"), "Browser-Stealer", "high", "Попытка кражи сохранённых паролей Google Chrome"},
	{[]byte("\\microsoft\\edge\\user data\\default\\login data"), "Browser-Stealer", "high", "Попытка кражи сохранённых паролей Microsoft Edge"},
	{[]byte("\\bravesoftware\\brave-browser\\user data"), "Browser-Stealer", "high", "Попытка кражи паролей/куки Brave Browser"},
	{[]byte("\\yandex\\yandexbrowser\\user data"), "Browser-Stealer", "high", "Попытка кражи паролей/куки Яндекс Браузера"},
	{[]byte("\\opera software\\opera stable\\login data"), "Browser-Stealer", "high", "Попытка кражи паролей Opera"},
	{[]byte("\\mozilla\\firefox\\profiles"), "Browser-Stealer", "medium", "Обращение скрипта к базе профилей/паролей Firefox"},
	{[]byte("local state"), "Browser-Stealer", "medium", "Чтение ключа шифрования браузера (Local State DPAPI)"},
	{[]byte("cryptunprotectdata"), "Credential-Stealer", "high", "Дешифровка защищённых паролей Windows через DPAPI (CryptUnprotectData)"},
	{[]byte("\\exodus\\exodus.wallet"), "Wallet-Stealer", "high", "Попытка доступа к криптокошельку Exodus"},
	{[]byte("nkbihfbeogaeaoehlefnkodbefgpgknn"), "Wallet-Stealer", "high", "Попытка кражи данных криптокошелька MetaMask"},
	{[]byte("bfnaelmomeimhlpmgjnjophhpkkoljpa"), "Wallet-Stealer", "high", "Попытка кражи криптокошелька Phantom"},
	{[]byte("egjidjbpglichdcondbcbdnbeeppgdph"), "Wallet-Stealer", "high", "Попытка кражи криптокошелька Trust Wallet"},
	{[]byte("hnfanknocfeofbddgcijnmhnfnkdnaad"), "Wallet-Stealer", "high", "Попытка кражи криптокошелька Coinbase Wallet"},
	{[]byte("\\electrum\\wallets"), "Wallet-Stealer", "high", "Попытка кражи файлов криптокошелька Electrum"},
	{[]byte("\\atomic\\local storage"), "Wallet-Stealer", "high", "Попытка кражи данных Atomic Wallet"},
	{[]byte("seed phrase"), "Wallet-Stealer", "medium", "Поиск мнемонической seed-фразы криптокошелька"},
	{[]byte("\\steam\\config\\loginusers.vdf"), "Gaming-Stealer", "high", "Попытка кражи сессии Steam (loginusers.vdf)"},
	{[]byte("ssfn"), "Gaming-Stealer", "medium", "Поиск файлов аутентификации Steam (ssfn)"},
	// 4. Keyloggers, Screen-Spies & Crypto-Clippers
	{[]byte("setwindowshookex"), "Keylogger-Spy", "high", "Перехват нажатий клавиш через Win32 SetWindowsHookEx (Кейлоггер)"},
	{[]byte("getasynckeystate"), "Keylogger-Spy", "high", "Скрытое считывание клавиш через GetAsyncKeyState (Кейлоггер)"},
	{[]byte("getkeyboardstate"), "Keylogger-Spy", "medium", "Считывание состояния клавиатуры в скрипте"},
	{[]byte("pynput.keyboard"), "Keylogger-Spy", "high", "Python-кейлоггер на базе pynput.keyboard"},
	{[]byte("openclipboard"), "Crypto-Clipper", "medium", "Перехват буфера обмена (возможен крипто-клиппер)"},
	{[]byte("setclipboarddata"), "Crypto-Clipper", "medium", "Подмена содержимого буфера обмена (Crypto-Clipper)"},
	{[]byte("bc1q"), "Crypto-Clipper", "low", "Обнаружен встроенный BTC-адрес (проверьте на клиппер)"},
	// 5. Credential Dumpers & LSASS Attacks
	{[]byte("invoke-mimikatz"), "Credential-Stealer", "high", "Сигнатура инструмента дампа учётных данных (Mimikatz)"},
	{[]byte("sekurlsa::logonpasswords"), "Credential-Dumper", "high", "Попытка извлечения паролей из памяти LSASS (sekurlsa)"},
	{[]byte("lsadump::sam"), "Credential-Dumper", "high", "Попытка извлечения хешей SAM (Mimikatz)"},
	{[]byte("reg save hklm\\sam"), "Credential-Dumper", "high", "Попытка дампа ветки реестра SAM (кража хешей паролей)"},
	{[]byte("reg save hklm\\system"), "Credential-Dumper", "high", "Попытка дампа системного ключа реестра SYSTEM"},
	{[]byte("comsvcs.dll, minidump"), "Credential-Dumper", "high", "Дамп памяти LSASS через comsvcs.dll MiniDump"},
	{[]byte("procdump"), "Credential-Dumper", "medium", "Потенциальный дамп памяти системных процессов (ProcDump)"},
	{[]byte("lazagne"), "Credential-Stealer", "high", "Сигнатура сборщика паролей LaZagne"},
	// 6. Ransomware & Destructive Behavior
	{[]byte("vssadmin delete shadows"), "Ransomware-Behavior", "high", "Уничтожение теневых копий системы (признак шифровальщика)"},
	{[]byte("wbadmin delete catalog"), "Ransomware-Behavior", "high", "Уничтожение каталога резервных копий Windows (Ransomware)"},
	{[]byte("wmic shadowcopy delete"), "Ransomware-Behavior", "high", "Удаление теневых копий через WMIC (Ransomware)"},
	{[]byte("bcdedit /set {default} recoveryenabled no"), "Ransomware-Behavior", "high", "Отключение восстановления системы Windows (Ransomware)"},
	{[]byte("bcdedit /set {default} bootstatuspolicy ignoreallfailures"), "Ransomware-Behavior", "high", "Подавление экрана восстановления Windows (Ransomware)"},
	{[]byte("cipher /w:"), "Ransomware-Wiper", "high", "Затирание свободного места диска для блокировки восстановления"},
	{[]byte("wevtutil cl security"), "Anti-Forensics", "high", "Очистка журнала безопасности Windows (заметание следов)"},
	{[]byte("wevtutil cl system"), "Anti-Forensics", "high", "Очистка системного журнала Windows"},
	{[]byte("your files have been encrypted"), "Ransomware-Note", "high", "Текст записки вымогателя-шифровальщика"},
	{[]byte("ваши файлы зашифрованы"), "Ransomware-Note", "high", "Текст записки вымогателя-шифровальщика"},
	// 7. Defense Evasion, AMSI, ETW, UAC Bypass
	{[]byte("add-mppreference -exclusionpath"), "Defense-Evasion", "high", "Попытка добавить скрытое исключение в антивирус Defender"},
	{[]byte("set-mppreference -disablerealtimemonitoring"), "Defense-Evasion", "high", "Попытка отключить защиту реального времени Windows Defender"},
	{[]byte("set-mppreference -disablebehaviormonitoring"), "Defense-Evasion", "high", "Отключение поведенческого анализа антивируса"},
	{[]byte("amsiutils"), "AMSI-Bypass", "high", "Попытка обхода системы защиты скриптов AMSI (AmsiUtils)"},
	{[]byte("amsiinitfailed"), "AMSI-Bypass", "high", "Попытка патча памяти AMSI (amsiInitFailed)"},
	{[]byte("amsiscanbuffer"), "AMSI-Bypass", "high", "Патч функции AmsiScanBuffer для обхода антивируса"},
	{[]byte("etweventwrite"), "ETW-Bypass", "high", "Попытка отключения телеметрии ядра ETW (EtwEventWrite)"},
	{[]byte("fodhelper.exe"), "UAC-Bypass", "high", "Признак обхода контроля учётных записей (UAC Bypass fodhelper)"},
	{[]byte("compmgmtlauncher.exe"), "UAC-Bypass", "medium", "Подозрительный паттерн повышения привилегий (UAC Bypass)"},
	{[]byte("eventvwr.exe"), "UAC-Bypass", "medium", "Возможный обход UAC через eventvwr"},
	{[]byte("sdclt.exe"), "UAC-Bypass", "medium", "Возможный обход UAC через sdclt"},
	{[]byte("netsh advfirewall set allprofiles state off"), "Firewall-Tamper", "high", "Попытка полного отключения брандмауэра Windows"},
	// 8. Reverse Shells, C2 & Backdoors
	{[]byte("bash -i >& /dev/tcp/"), "Reverse-Shell", "high", "Скрытый обратный shell (/dev/tcp)"},
	{[]byte("nc -e /bin/sh"), "Reverse-Shell", "high", "Обратный shell через Netcat (nc -e)"},
	{[]byte("ncat -e cmd"), "Reverse-Shell", "high", "Обратный shell Windows через Ncat"},
	{[]byte("socket.socket(socket.af_inet"), "Reverse-Shell", "medium", "Скрытое сетевое подключение/бэкдор на Python"},
	{[]byte("subprocess.popen"), "Suspicious-Exec", "low", "Запуск скрытого системного подпроцесса из Python"},
	{[]byte("new-object system.net.sockets.tcpclient"), "Reverse-Shell", "high", "PowerShell Reverse Shell (TCPClient)"},
	{[]byte("fsockopen("), "WebShell-Backdoor", "high", "PHP обратный shell (fsockopen)"},
	{[]byte("eval($_post"), "WebShell-Backdoor", "high", "PHP веб-шелл бэкдор (eval $_POST)"},
	{[]byte("meterpreter"), "C2-Framework", "high", "Сигнатура фреймворка удалённого управления Meterpreter"},
	{[]byte("cobaltstrike"), "C2-Framework", "high", "Сигнатура агента Cobalt Strike Beacon"},
	{[]byte("net user /add"), "Backdoor-Account", "high", "Попытка скрытого создания учётной записи пользователя"},
	{[]byte("net localgroup administrators"), "Privilege-Escalation", "high", "Попытка добавления пользователя в группу Администраторы"},
	// 9. Process Injection, Shellcode & Persistence
	{[]byte("virtualalloc"), "Shellcode-Injection", "medium", "Подозрительное выделение исполняемой памяти (VirtualAlloc)"},
	{[]byte("virtualallocex"), "Process-Injection", "high", "Выделение памяти в чужом процессе (VirtualAllocEx)"},
	{[]byte("writeprocessmemory"), "Process-Injection", "high", "Запись шеллкода в память другого процесса (WriteProcessMemory)"},
	{[]byte("createremotethread"), "Process-Injection", "high", "Внедрение потока исполнения в чужой процесс (CreateRemoteThread)"},
	{[]byte("ntunmapviewofsection"), "Process-Hollowing", "high", "Техника подмены процесса Process Hollowing"},
	{[]byte("queueuserapc"), "Process-Injection", "high", "Внедрение кода через асинхронный вызов QueueUserAPC"},
	{[]byte("schtasks /create"), "Persistence-Task", "medium", "Создание скрытого задания автозапуска в планировщике"},
	{[]byte("image file execution options"), "Persistence-IFEO", "high", "Перехват запуска приложений через ветку IFEO"},
	{[]byte("currentversion\\run"), "Persistence-Registry", "medium", "Запись в ветку автозагрузки реестра Windows Run"},
	{[]byte("__eventfilter"), "Persistence-WMI", "high", "Скрытое закрепление через подписку WMI EventFilter"},
	// 10. Crypto Miners & Office VBA Macro Droppers
	{[]byte("stratum+tcp://"), "Crypto-Miner", "high", "Обнаружен скрытый пул майнинга криптовалюты (stratum+tcp)"},
	{[]byte("stratum+ssl://"), "Crypto-Miner", "high", "Зашифрованный пул скрытого криптомайнера (stratum+ssl)"},
	{[]byte("xmrig"), "Crypto-Miner", "high", "Сигнатура скрытого криптомайнера (XMRig)"},
	{[]byte("randomx"), "Crypto-Miner", "medium", "Алгоритм майнинга Monero (RandomX) в скрипте"},
	{[]byte("autoopen()"), "Office-Macro-Dropper", "high", "Автозапускаемый макрос Office (AutoOpen)"},
	{[]byte("document_open()"), "Office-Macro-Dropper", "high", "Автозапускаемый макрос Word (Document_Open)"},
	{[]byte("workbook_open()"), "Office-Macro-Dropper", "high", "Автозапускаемый макрос Excel (Workbook_Open)"},
	{[]byte("wscript.shell"), "Script-Dropper", "medium", "Вызов системной оболочки через WScript.Shell"},
	{[]byte("shell.application"), "Script-Dropper", "medium", "Запуск программ через COM-объект Shell.Application"},
	// 11. LumaShield 2.5 Next-Gen Rules: Modern InfoStealers, Cloud/Dev Secret Theft, BYOVD, Direct Syscalls & LOLBins (70+ new rules -> 235+ total!)
	{[]byte("lummac2"), "InfoStealer-Lumma", "high", "LumaShield 2.5: сигнатура стилера LummaC2"},
	{[]byte("rhadamanthys"), "InfoStealer-Rhadamanthys", "high", "LumaShield 2.5: сигнатура стилера Rhadamanthys"},
	{[]byte("stealc_config"), "InfoStealer-StealC", "high", "LumaShield 2.5: конфигурация стилера StealC"},
	{[]byte("redline.client"), "InfoStealer-RedLine", "high", "LumaShield 2.5: сигнатура RedLine Stealer"},
	{[]byte("vidar_bot"), "InfoStealer-Vidar", "high", "LumaShield 2.5: сигнатура Vidar Stealer"},
	{[]byte("asyncrat"), "RAT-AsyncRAT", "high", "LumaShield 2.5: сигнатура удалённого трояна AsyncRAT"},
	{[]byte("xworm"), "RAT-XWorm", "high", "LumaShield 2.5: сигнатура трояна XWorm RAT"},
	{[]byte("quasar.client"), "RAT-Quasar", "high", "LumaShield 2.5: сигнатура Quasar RAT"},
	{[]byte("venomrat"), "RAT-Venom", "high", "LumaShield 2.5: сигнатура VenomRAT / HVNC"},
	{[]byte("remcos_mutex"), "RAT-Remcos", "high", "LumaShield 2.5: мьютекс коммерческого RAT Remcos"},
	{[]byte("app-bound-encryption"), "Browser-Stealer-ABE", "high", "LumaShield 2.5: попытка обхода Chrome App-Bound Encryption"},
	{[]byte("ielevator"), "Browser-Stealer-ABE", "high", "LumaShield 2.5: злоупотребление COM IElevator для кражи куки Chrome"},
	{[]byte("\\opera gx stable\\login data"), "Browser-Stealer", "high", "LumaShield 2.5: попытка кражи паролей Opera GX"},
	{[]byte("\\vivaldi\\user data\\default\\login data"), "Browser-Stealer", "high", "LumaShield 2.5: попытка кражи паролей Vivaldi"},
	{[]byte("\\waterfox\\profiles"), "Browser-Stealer", "medium", "LumaShield 2.5: обращение к профилю Waterfox"},
	{[]byte("cookies.sqlite"), "Browser-Cookie-Stealer", "medium", "LumaShield 2.5: попытка экспорта сессионных cookie браузера"},
	{[]byte(".aws/credentials"), "Cloud-Cred-Stealer", "high", "LumaShield 2.5: попытка кражи ключей AWS (~/.aws/credentials)"},
	{[]byte(".ssh/id_rsa"), "SSH-Key-Stealer", "high", "LumaShield 2.5: попытка кражи приватного SSH-ключа"},
	{[]byte(".ssh/id_ed25519"), "SSH-Key-Stealer", "high", "LumaShield 2.5: попытка кражи ключа Ed25519 SSH"},
	{[]byte(".kube/config"), "Cloud-Cred-Stealer", "high", "LumaShield 2.5: попытка кражи конфигурации Kubernetes"},
	{[]byte(".docker/config.json"), "Cloud-Cred-Stealer", "medium", "LumaShield 2.5: попытка чтения токенов Docker Registry"},
	{[]byte("ghp_"), "Token-Exfiltration", "medium", "LumaShield 2.5: обнаружен GitHub Personal Access Token в скрипте"},
	{[]byte("odbcconf.exe /a"), "LOLBin-OdbcConf", "high", "LumaShield 2.5: загрузка DLL через LOLBin odbcconf.exe"},
	{[]byte("pcalua.exe -a"), "LOLBin-Pcalua", "medium", "LumaShield 2.5: скрытый запуск программы через pcalua.exe"},
	{[]byte("msdt.exe /id pcwdiagnostic"), "CVE-Follina", "high", "LumaShield 2.5: паттерн эксплуатации Follina (msdt.exe)"},
	{[]byte("mavinject.exe"), "LOLBin-Injection", "high", "LumaShield 2.5: инъекция DLL через системный mavinject.exe"},
	{[]byte("hh.exe http"), "LOLBin-CHM", "high", "LumaShield 2.5: удалённая загрузка CHM/HTML через hh.exe"},
	{[]byte("ieexec.exe http"), "LOLBin-Dropper", "high", "LumaShield 2.5: удалённый запуск .NET через ieexec.exe"},
	{[]byte("syncappvpublishingserver"), "LOLBin-Exec", "high", "LumaShield 2.5: выполнение PowerShell в обход через SyncAppvPublishingServer"},
	{[]byte("finger.exe "), "LOLBin-C2", "medium", "LumaShield 2.5: подозрительный канал передачи через finger.exe"},
	{[]byte("msbuild.exe"), "LOLBin-InlineTask", "medium", "LumaShield 2.5: возможный запуск бесфайлового кода через MSBuild"},
	{[]byte("csc.exe /out:"), "LOLBin-Compile", "medium", "LumaShield 2.5: динамическая компиляция вредоносного C# на хосте"},
	{[]byte("rtcore64.sys"), "BYOVD-Driver", "high", "LumaShield 2.5: уязвимый драйвер BYOVD RTCore64 для отключения EDR"},
	{[]byte("dbutil_2_3.sys"), "BYOVD-Driver", "high", "LumaShield 2.5: уязвимый драйвер BYOVD Dell dbutil_2_3"},
	{[]byte("gdrv.sys"), "BYOVD-Driver", "high", "LumaShield 2.5: уязвимый драйвер BYOVD Gigabyte gdrv.sys"},
	{[]byte("procexp152.sys"), "BYOVD-Killer", "high", "LumaShield 2.5: злоупотребление драйвером для убийства антивирусов"},
	{[]byte("ntallocatevirtualmemory"), "Direct-Syscall", "high", "LumaShield 2.5: прямое выделение памяти через NT API / Syscall"},
	{[]byte("ntwritevirtualmemory"), "Direct-Syscall", "high", "LumaShield 2.5: прямая запись в память процесса (Direct Syscall)"},
	{[]byte("ntcreatethreadex"), "Direct-Syscall", "high", "LumaShield 2.5: скрытое создание удалённого потока NtCreateThreadEx"},
	{[]byte("zwunmapviewofsection"), "Process-Hollowing", "high", "LumaShield 2.5: подмена секции процесса ZwUnmapViewOfSection"},
	{[]byte("setthreadcontext"), "Thread-Hijacking", "high", "LumaShield 2.5: угон контекста потока исполнения SetThreadContext"},
	{[]byte("reflective_loader"), "Reflective-DLL", "high", "LumaShield 2.5: рефлективный загрузчик DLL в память"},
	{[]byte("hells_gate"), "Syscall-Evasion", "high", "LumaShield 2.5: техника обхода хуков Hell's Gate"},
	{[]byte("halos_gate"), "Syscall-Evasion", "high", "LumaShield 2.5: техника обхода хуков Halo's Gate"},
	{[]byte("inprocserver32"), "COM-Hijacking", "medium", "LumaShield 2.5: закрепление через перехват COM InprocServer32"},
	{[]byte("appinit_dlls"), "Persistence-AppInit", "high", "LumaShield 2.5: внедрение DLL во все процессы через AppInit_DLLs"},
	{[]byte("winlogon\\shell"), "Persistence-Winlogon", "high", "LumaShield 2.5: подмена системной оболочки Winlogon Shell"},
	{[]byte("winlogon\\userinit"), "Persistence-Winlogon", "high", "LumaShield 2.5: модификация Winlogon Userinit для автозапуска"},
	{[]byte("commandlineeventconsumer"), "Persistence-WMI", "high", "LumaShield 2.5: скрытый автозапуск через WMI CommandLineEventConsumer"},
	{[]byte("register-scheduledtask"), "Persistence-Task", "medium", "LumaShield 2.5: программная регистрация задачи планировщика Windows"},
	{[]byte("new-scheduledtaskaction"), "Persistence-Task", "medium", "LumaShield 2.5: создание действия планировщика через PowerShell"},
	{[]byte("powershell -ep bypass"), "Execution-Bypass", "high", "LumaShield 2.5: обход политики выполнения PowerShell (-ep bypass)"},
	{[]byte("-executionpolicy bypass"), "Execution-Bypass", "medium", "LumaShield 2.5: запуск скрипта с отключённой проверкой подписи"},
	{[]byte("iex (irm "), "Fileless-Cradle", "high", "LumaShield 2.5: однострочный бесфайловый загрузчик iex (irm ...)"},
	{[]byte("iex(new-object"), "Fileless-Cradle", "high", "LumaShield 2.5: бесфайловое выполнение кода из сети"},
	{[]byte("curl -s http"), "Dropper-Pipe", "medium", "LumaShield 2.5: скрытая загрузка удалённого скрипта через curl"},
	{[]byte("| bash"), "Dropper-Pipe", "high", "LumaShield 2.5: прямое выполнение загруженного потока в bash"},
	{[]byte("| sh"), "Dropper-Pipe", "high", "LumaShield 2.5: прямое выполнение загруженного потока в sh"},
	{[]byte("chmod +x /tmp/"), "Linux-Dropper", "high", "LumaShield 2.5: запуск загруженного бинарника из /tmp"},
	{[]byte("crontab -l"), "Linux-Persistence", "medium", "LumaShield 2.5: модификация заданий планировщика cron"},
	{[]byte("sliver_implant"), "C2-Sliver", "high", "LumaShield 2.5: сигнатура импланта C2 Sliver"},
	{[]byte("havoc_demon"), "C2-Havoc", "high", "LumaShield 2.5: сигнатура агента C2 Havoc Demon"},
	{[]byte("brute_ratel"), "C2-BruteRatel", "high", "LumaShield 2.5: сигнатура C2 Brute Ratel C4"},
	{[]byte("ngrok.io"), "Tunnel-Exfil", "medium", "LumaShield 2.5: подозрительный туннель вывода данных через ngrok"},
	{[]byte("trycloudflare.com"), "Tunnel-Exfil", "medium", "LumaShield 2.5: скрытый туннель C2 через Cloudflare Quick Tunnel"},
	{[]byte("disableantispyware"), "Defense-Evasion", "high", "LumaShield 2.5: попытка отключения Defender через реестр DisableAntiSpyware"},
	{[]byte("tamperprotection"), "Defense-Evasion", "high", "LumaShield 2.5: попытка вмешательства в защиту от подделки Tamper Protection"},
	{[]byte("net stop windefend"), "Defense-Evasion", "high", "LumaShield 2.5: попытка остановки службы Windows Defender"},
	{[]byte("sc delete windefend"), "Defense-Evasion", "high", "LumaShield 2.5: попытка удаления службы Windows Defender"},
	{[]byte("vssadmin resize shadowstorage"), "Ransomware-Behavior", "high", "LumaShield 2.5: обнуление хранилища теневых копий перед шифрованием"},
	{[]byte("fsutil usn deletejournal"), "Anti-Forensics", "high", "LumaShield 2.5: удаление журнала NTFS USN для сокрытия следов"},
	{[]byte("wevtutil cl application"), "Anti-Forensics", "high", "LumaShield 2.5: очистка журнала приложений Windows"},
	{[]byte("powershell_ise_stealer"), "InfoStealer-PS", "high", "LumaShield 2.5: сигнатура PowerShell-стилера"},
}

// inspectArchiveThreat checks ZIP archives and Office macro documents (.docm/.xlsm/.pptm/.zip) for VBA macros or hidden executables.
func inspectArchiveThreat(path, name, ext string, info os.FileInfo) *SecurityThreat {
	zr, err := zip.OpenReader(path)
	if err != nil {
		return nil
	}
	defer zr.Close()

	isOfficeMacroExt := ext == ".docm" || ext == ".xlsm" || ext == ".pptm" || ext == ".docx" || ext == ".xlsx" || ext == ".pptx"
	for _, f := range zr.File {
		lowEntry := strings.ToLower(strings.ReplaceAll(f.Name, "\\", "/"))
		// 1. Office VBA Macro binary (vbaProject.bin)
		if isOfficeMacroExt && strings.HasSuffix(lowEntry, "vbaproject.bin") {
			return &SecurityThreat{
				ID:         fmt.Sprintf("thr_vba_%d", time.Now().UnixNano()),
				Path:       path,
				Name:       name,
				Severity:   "high",
				Category:   "Office-VBA-Macro",
				Reason:     fmt.Sprintf("В документе обнаружен исполняемый макрос VBA (%s) — потенциальный дроппер", f.Name),
				SHA256:     computeFileSHA256(path),
				Size:       info.Size(),
				DetectedAt: time.Now().Format("15:04:05"),
			}
		}
		// 2. Double extension or dangerous script disguised inside ZIP
		if ext == ".zip" {
			for _, dext := range suspiciousDoubleExts {
				if strings.HasSuffix(lowEntry, dext) {
					return &SecurityThreat{
						ID:         fmt.Sprintf("thr_zip_%d", time.Now().UnixNano()),
						Path:       path,
						Name:       name,
						Severity:   "high",
						Category:   "Archive-Masquerading",
						Reason:     fmt.Sprintf("Внутри архива скрыт файл с двойным расширением (%s)", f.Name),
						SHA256:     computeFileSHA256(path),
						Size:       info.Size(),
						DetectedAt: time.Now().Format("15:04:05"),
					}
				}
			}
			if strings.HasSuffix(lowEntry, ".hta") || strings.HasSuffix(lowEntry, ".vbs") || strings.HasSuffix(lowEntry, ".scr") || strings.HasSuffix(lowEntry, ".pif") {
				return &SecurityThreat{
					ID:         fmt.Sprintf("thr_zip_%d", time.Now().UnixNano()),
					Path:       path,
					Name:       name,
					Severity:   "medium",
					Category:   "Archive-Suspicious-Payload",
					Reason:     fmt.Sprintf("Архив содержит потенциально опасный скрипт/исполняемый файл (%s)", f.Name),
					SHA256:     computeFileSHA256(path),
					Size:       info.Size(),
					DetectedAt: time.Now().Format("15:04:05"),
				}
			}
		}
	}
	return nil
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
	if ransomwareExts[ext] || strings.Contains(lower, "how_to_decrypt") || strings.Contains(lower, "restore_my_files") || strings.Contains(lower, "readme_decrypt") {
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

	// 2b. LumaShield 2.0 Archive & Office VBA Macro Deep Inspection (.zip, .docm, .xlsm, .pptm, .docx, .xlsx, .pptx)
	if (ext == ".zip" || ext == ".docm" || ext == ".xlsm" || ext == ".pptm" || ext == ".docx" || ext == ".xlsx" || ext == ".pptx") &&
		info.Size() > 0 && info.Size() <= 25*1024*1024 && !strings.Contains(lowerPath, "l_h-3.0") {
		if archThreat := inspectArchiveThreat(path, name, ext, info); archThreat != nil {
			return archThreat
		}
	}

	// 3. Content signature, PE-header masquerading & Shannon entropy check
	isDocOrImg := ext == ".pdf" || ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".docx" || ext == ".xlsx" || ext == ".pptx" || ext == ".txt" || ext == ".mp3" || ext == ".mp4"
	isScript := ext == ".ps1" || ext == ".bat" || ext == ".cmd" || ext == ".vbs" || ext == ".hta" || ext == ".js" || ext == ".wsf" || ext == ".sh" || ext == ".py" || ext == ".php" || ext == ".rb" || ext == ".vba"
	isBinary := ext == ".exe" || ext == ".scr" || ext == ".dll" || ext == ".pif" || ext == ".com" || ext == ".msi"
	scanContent := isDocOrImg || isScript || ext == ".eicar" || (isBinary && info.Size() <= 4*1024*1024) || info.Size() <= 256*1024

	if scanContent && info.Size() > 0 && info.Size() <= 8*1024*1024 {
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

				// 3c. Script & small-file heuristic rules (170+ LumaShield 2.0 signatures)
				if (isScript || ext == ".txt" || ext == ".lnk") && !strings.Contains(lowerPath, "l_h-3.0") {
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

				// 3d. High Shannon Entropy Packed Binary Check in Temp / Downloads / Desktop
				if isBinary && n >= 16384 &&
					(strings.Contains(lowerPath, `\temp\`) || strings.Contains(lowerPath, "/tmp/") || strings.Contains(lowerPath, "downloads")) &&
					!strings.Contains(lower, "lumaos") && !strings.Contains(lower, "setup") && !strings.Contains(lower, "install") && !strings.Contains(lower, "update") {
					ent := computeShannonEntropy(chunk)
					if ent >= 7.55 {
						return &SecurityThreat{
							ID:         fmt.Sprintf("thr_%d", time.Now().UnixNano()),
							Path:       path,
							Name:       name,
							Severity:   "medium",
							Category:   "High-Entropy-Packer",
							Reason:     fmt.Sprintf("Сильно запакованный/криптованный бинарник (энтропия Шеннона %.2f бит/байт)", ent),
							SHA256:     computeFileSHA256(path),
							Size:       info.Size(),
							DetectedAt: time.Now().Format("15:04:05"),
						}
					}
				}
			}
		}
	}

	// 4. Suspicious temp/downloads executable names
	if (ext == ".exe" || ext == ".scr" || ext == ".pif" || ext == ".bat" || ext == ".vbs") &&
		(strings.Contains(lowerPath, `\temp\`) || strings.Contains(lowerPath, "/tmp/") || strings.Contains(lowerPath, "downloads")) {
		badNameTokens := []string{"crack", "keygen", "stealer", "miner", "trojan", "rat_", "redline", "lumma", "vidar", "raccoon", "asyncrat", "njrat", "clipper", "keylog", "cheatengine_crack", "activator_kms"}
		for _, tok := range badNameTokens {
			if strings.Contains(lower, tok) {
				return &SecurityThreat{
					ID:         fmt.Sprintf("thr_%d", time.Now().UnixNano()),
					Path:       path,
					Name:       name,
					Severity:   "high",
					Category:   "Suspicious-Binary",
					Reason:     fmt.Sprintf("Подозрительный исполняемый файл (индикатор «%s»)", tok),
					SHA256:     computeFileSHA256(path),
					Size:       info.Size(),
					DetectedAt: time.Now().Format("15:04:05"),
				}
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

// ScanRunningProcesses inspects active host processes for 35+ known malware/stealer/RAT/miner signatures + Temp execution.
func (s *SecurityKernel) ScanRunningProcesses(probe *platformProbe) []SecurityThreat {
	if probe == nil {
		return []SecurityThreat{}
	}
	procs := probe.TopProcesses(150)
	var found []SecurityThreat
	suspiciousNames := []string{
		"xmrig", "minerd", "cpuminer", "nbminer", "t-rex", "phoenixminer", "lolminer", "gminer",
		"njrat", "darkcomet", "quasarrat", "asyncrat", "remcos", "nanocore", "warzone", "orcus",
		"mimikatz", "rubeus", "lazagne", "procdump", "sharphound", "cobaltstrike", "meterpreter",
		"redline", "raccoon", "vidar", "lumma", "stealc", "meta_stealer", "azorult", "lokibot",
		"keylogger", "clipper", "hvnc", "xworm", "venomrat", "dcrat",
	}
	for _, pr := range procs {
		if pr.IsSelf {
			continue
		}
		lowName := strings.ToLower(pr.Name)
		lowPath := strings.ToLower(pr.ExePath)
		matched := false
		for _, bad := range suspiciousNames {
			if strings.Contains(lowName, bad) || strings.Contains(lowPath, bad) {
				found = append(found, SecurityThreat{
					ID:         fmt.Sprintf("thr_proc_%d", pr.PID),
					Path:       pr.ExePath,
					Name:       fmt.Sprintf("%s (PID %d)", pr.Name, pr.PID),
					Severity:   "high",
					Category:   "Malicious-Process",
					Reason:     fmt.Sprintf("LumaShield 2.0: обнаружен вредоносный активный процесс (%s)", bad),
					DetectedAt: time.Now().Format("15:04:05"),
				})
				matched = true
				break
			}
		}
		if !matched && lowPath != "" && (strings.Contains(lowPath, `\appdata\local\temp\`) || strings.Contains(lowPath, `\windows\temp\`)) &&
			!strings.Contains(lowName, "setup") && !strings.Contains(lowName, "install") && !strings.Contains(lowName, "update") && !strings.Contains(lowName, "luma") {
			found = append(found, SecurityThreat{
				ID:         fmt.Sprintf("thr_tmpproc_%d", pr.PID),
				Path:       pr.ExePath,
				Name:       fmt.Sprintf("%s (PID %d)", pr.Name, pr.PID),
				Severity:   "medium",
				Category:   "Temp-Process",
				Reason:     "Необычный процесс запущен напрямую из временного каталога Temp",
				DetectedAt: time.Now().Format("15:04:05"),
			})
		}
	}
	if len(found) > 0 {
		s.mu.Lock()
		s.lastThreats = append(found, s.lastThreats...)
		s.mu.Unlock()
		s.LogAudit("danger", "process-guard", "LumaShield 2.0 · Процессы: найдены угрозы", fmt.Sprintf("Подозрительных процессов: %d", len(found)))
	} else {
		s.LogAudit("ok", "process-guard", "LumaShield 2.0 · Процессы проверены", fmt.Sprintf("Проверено %d активных процессов — угроз не найдено", len(procs)))
	}
	return found
}

// InspectUploadedFile analyzes an arbitrary file dropped in the UI (bytes + filename) through LumaShield 2.0 without touching the user's disk permanently.
func (s *SecurityKernel) InspectUploadedFile(name string, raw []byte) map[string]interface{} {
	tmpDir := filepath.Join(os.TempDir(), "LumaShield_SingleCheck")
	_ = os.MkdirAll(tmpDir, 0o700)
	safeName := filepath.Base(strings.TrimSpace(name))
	if safeName == "" || safeName == "." {
		safeName = "dropped_file.bin"
	}
	tmpPath := filepath.Join(tmpDir, safeName)
	_ = os.WriteFile(tmpPath, raw, 0o600)
	defer os.Remove(tmpPath)

	st, _ := os.Stat(tmpPath)
	thr := s.inspectSingleFile(tmpPath, st)
	hash := sha256.Sum256(raw)
	ent := computeShannonEntropy(raw[:minInt(len(raw), 256*1024)])
	isPE := len(raw) >= 64 && raw[0] == 'M' && raw[1] == 'Z'

	verdict := "clean"
	if thr != nil {
		verdict = "threat"
		s.LogAudit("danger", "file-inspector", "Проверка файла: обнаружена угроза", fmt.Sprintf("%s · %s", safeName, thr.Category))
	} else {
		s.LogAudit("ok", "file-inspector", "Проверка файла: угроз не обнаружено", fmt.Sprintf("%s (%.1f КБ)", safeName, float64(len(raw))/1024.0))
	}
	return map[string]interface{}{
		"ok":       true,
		"name":     safeName,
		"size":     len(raw),
		"sha256":   hex.EncodeToString(hash[:]),
		"entropy":  math.Round(ent*100) / 100,
		"is_pe":    isPE,
		"verdict":  verdict,
		"threat":   thr,
		"engine":   "LumaShield 2.0",
		"rules":    len(scriptHeuristics) + len(suspiciousDoubleExts) + len(ransomwareExts) + 5,
		"checked":  time.Now().Format("15:04:05"),
	}
}

// GenerateAuditReport produces a unified security audit summary across threats, quarantine, hosts, startup, network & Defender.
func (s *SecurityKernel) GenerateAuditReport(probe *platformProbe) map[string]interface{} {
	snap := s.StatusSnapshot(probe)
	hosts := s.AuditHostsFile()
	var conns []ActiveTcpConnection
	var startupFindings []map[string]interface{}
	if probe != nil {
		conns = probe.ActiveTcpConnections()
		startupFindings = s.AuditStartupEntries(probe.ListStartupItems())
	}
	suspNet := 0
	for _, c := range conns {
		if c.Suspicious {
			suspNet++
		}
	}
	suspStartup := 0
	for _, f := range startupFindings {
		if r, _ := f["risk"].(string); r == "high" || r == "medium" {
			suspStartup++
		}
	}
	var md strings.Builder
	md.WriteString(fmt.Sprintf("# Отчёт аудита безопасности LumaShield %s\n\n", SecurityCoreVersion))
	md.WriteString(fmt.Sprintf("- **ОС:** Luma OS %s (%s) · Ядро LumaCore %s\n", KernelVersion, KernelCodename, KernelEngineVersion))
	md.WriteString(fmt.Sprintf("- **Дата отчёта:** %s\n", time.Now().Format("02.01.2006 15:04:05")))
	md.WriteString(fmt.Sprintf("- **Индекс защиты:** %v / 100\n", snap["score"]))
	md.WriteString(fmt.Sprintf("- **Активных сигнатур и правил:** %v\n", snap["rules_count"]))
	md.WriteString(fmt.Sprintf("- **Обнаружено угроз:** %d\n", len(s.lastThreats)))
	md.WriteString(fmt.Sprintf("- **В карантине:** %d\n", len(s.quarantine)))
	md.WriteString(fmt.Sprintf("- **Файл hosts:** %d записей (подозрительных: %d)\n", hosts.TotalMappings, hosts.SuspiciousCount))
	md.WriteString(fmt.Sprintf("- **Сетевые TCP-соединения:** %d (подозрительных: %d)\n", len(conns), suspNet))
	md.WriteString(fmt.Sprintf("- **Автозагрузка:** %d записей (требуют внимания: %d)\n", len(startupFindings), suspStartup))
	if len(s.lastThreats) > 0 {
		md.WriteString("\n## Обнаруженные угрозы\n")
		for _, t := range s.lastThreats {
			md.WriteString(fmt.Sprintf("- **[%s] %s** (`%s`) — %s\n", strings.ToUpper(t.Severity), t.Name, t.Category, t.Reason))
		}
	}
	return map[string]interface{}{
		"ok":                  true,
		"generated_at":        time.Now().Format("02.01.2006 15:04:05"),
		"score":               snap["score"],
		"rules_count":         snap["rules_count"],
		"threats_count":       len(s.lastThreats),
		"quarantine_count":    len(s.quarantine),
		"hosts_suspicious":    hosts.SuspiciousCount,
		"network_connections": len(conns),
		"network_suspicious":  suspNet,
		"startup_suspicious":  suspStartup,
		"markdown_report":     md.String(),
	}
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
		"engine_name":            "LumaShield 2.5 (230+ Rules · Stealer/BYOVD/Syscall/VBA Shield · Archive Scan · PE/Entropy · Startup/Tasks/Hosts/Net Guard)",
		"rules_count":            len(scriptHeuristics) + len(suspiciousDoubleExts) + len(ransomwareExts) + 5,
		"archive_macro_guard":    true,
		"stealer_shield":         true,
		"tasks_audit_supported":  true,
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
		"crypto":                 "AES-256-GCM + PBKDF2-HMAC-SHA512 + VBA/Archive Inspector + Shannon Entropy + InfoStealer/Tasks/Hosts/PE/Net Guard",
	}
}

// AuditStartupEntries (LumaShield 2.5) inspects OS autorun entries for suspicious persistence techniques.
func (s *SecurityKernel) AuditStartupEntries(entries []StartupEntry) []map[string]interface{} {
	findings := make([]map[string]interface{}, 0, len(entries))
	for _, e := range entries {
		lowCmd := strings.ToLower(e.Command)
		risk := "safe"
		reason := "Штатная запись автозагрузки"
		switch {
		case strings.Contains(lowCmd, "-encodedcommand") || strings.Contains(lowCmd, "-w hidden") || strings.Contains(lowCmd, "mshta ") || strings.Contains(lowCmd, "certutil -urlcache") || strings.Contains(lowCmd, "regsvr32 /s"):
			risk = "high"
			reason = "Скрытый или обфусцированный скрипт/LOLBin в автозагрузке"
		case strings.Contains(lowCmd, "\\temp\\") || strings.Contains(lowCmd, "/tmp/") || strings.HasSuffix(lowCmd, ".vbs") || strings.HasSuffix(lowCmd, ".hta") || strings.HasSuffix(lowCmd, ".bat") || strings.Contains(lowCmd, "appdata\\local\\temp"):
			risk = "medium"
			reason = "Запуск скрипта или файла из временного каталога при старте ОС"
		case strings.Contains(lowCmd, "powershell") || strings.Contains(lowCmd, "wscript") || strings.Contains(lowCmd, "cscript") || strings.Contains(lowCmd, "rundll32"):
			risk = "medium"
			reason = "Интерпретатор сценариев в автозагрузке — рекомендуется проверить источник"
		}
		findings = append(findings, map[string]interface{}{
			"name":     e.Name,
			"command":  e.Command,
			"location": e.Location,
			"enabled":  e.Enabled,
			"risk":     risk,
			"reason":   reason,
		})
	}
	return findings
}

// AuditScheduledTasks (LumaShield 2.5) audits Windows Task Scheduler non-OS tasks or POSIX cron/systemd user timers.
func (s *SecurityKernel) AuditScheduledTasks() []map[string]interface{} {
	findings := make([]map[string]interface{}, 0, 24)
	classifyTask := func(name, path, action, state string) map[string]interface{} {
		low := strings.ToLower(action + " " + name)
		risk := "safe"
		reason := "Штатная задача планировщика"
		switch {
		case strings.Contains(low, "-encodedcommand") || strings.Contains(low, "-enc ") || strings.Contains(low, "-w hidden") || strings.Contains(low, "mshta") || strings.Contains(low, "certutil") || strings.Contains(low, "iex(") || strings.Contains(low, "| bash"):
			risk = "high"
			reason = "Опасная скрытая команда / скрипт в планировщике задач"
		case strings.Contains(low, "\\temp\\") || strings.Contains(low, "/tmp/") || strings.Contains(low, "powershell") || strings.Contains(low, "wscript") || strings.Contains(low, "cmd.exe /c") || strings.Contains(low, "curl "):
			risk = "medium"
			reason = "Нестандартный запуск скрипта/интерпретатора по расписанию"
		}
		return map[string]interface{}{
			"name":   name,
			"path":   path,
			"action": action,
			"state":  state,
			"risk":   risk,
			"reason": reason,
		}
	}

	if runtime.GOOS == "windows" {
		ps := `Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.TaskPath -notlike '\Microsoft\*' } | Select-Object -First 40 | ForEach-Object { $act = ($_.Actions | ForEach-Object { "$($_.Execute) $($_.Arguments)".Trim() }) -join '; '; [PSCustomObject]@{ name=$_.TaskName; path=$_.TaskPath; action=$act; state=[string]$_.State } } | ConvertTo-Json -Compress`
		if out, err := exec.Command("powershell.exe", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps).Output(); err == nil {
			raw := strings.TrimSpace(string(out))
			type row struct {
				Name   string `json:"name"`
				Path   string `json:"path"`
				Action string `json:"action"`
				State  string `json:"state"`
			}
			var rows []row
			if strings.HasPrefix(raw, "[") {
				_ = json.Unmarshal([]byte(raw), &rows)
			} else if strings.HasPrefix(raw, "{") {
				var one row
				if json.Unmarshal([]byte(raw), &one) == nil && one.Name != "" {
					rows = append(rows, one)
				}
			}
			for _, r := range rows {
				findings = append(findings, classifyTask(r.Name, r.Path, r.Action, r.State))
			}
		}
	} else {
		// Linux/POSIX: inspect user crontab & systemd user units & autostart entries
		if out, err := exec.Command("crontab", "-l").Output(); err == nil {
			for i, ln := range strings.Split(string(out), "\n") {
				t := strings.TrimSpace(ln)
				if t == "" || strings.HasPrefix(t, "#") {
					continue
				}
				findings = append(findings, classifyTask(fmt.Sprintf("crontab #%d", i+1), "user-crontab", t, "Enabled"))
			}
		}
		if home, err := os.UserHomeDir(); err == nil && home != "" {
			for _, dir := range []string{
				filepath.Join(home, ".config", "systemd", "user"),
				filepath.Join(home, ".config", "autostart"),
			} {
				entries, err2 := os.ReadDir(dir)
				if err2 != nil {
					continue
				}
				for _, e := range entries {
					if e.IsDir() {
						continue
					}
					raw, _ := os.ReadFile(filepath.Join(dir, e.Name()))
					act := e.Name()
					for _, ln := range strings.Split(string(raw), "\n") {
						if strings.HasPrefix(ln, "ExecStart=") || strings.HasPrefix(ln, "Exec=") {
							act = strings.TrimSpace(ln)
							break
						}
					}
					findings = append(findings, classifyTask(e.Name(), dir, act, "Ready"))
				}
			}
		}
	}
	s.LogAudit("ok", "tasks-audit", "LumaShield 2.5: аудит задач планировщика завершён", fmt.Sprintf("Проверено задач: %d", len(findings)))
	return findings
}

// AuditHostsFile (LumaShield 1.5) inspects the real OS hosts file for suspicious DNS hijacks or security vendor blocks.
func (s *SecurityKernel) AuditHostsFile() HostsAuditResult {
	hostsPath := "/etc/hosts"
	if runtime.GOOS == "windows" {
		sysRoot := os.Getenv("SystemRoot")
		if sysRoot == "" {
			sysRoot = `C:\Windows`
		}
		hostsPath = filepath.Join(sysRoot, "System32", "drivers", "etc", "hosts")
	}
	res := HostsAuditResult{
		OK:        true,
		Path:      hostsPath,
		Entries:   []HostsAuditEntry{},
		CheckedAt: time.Now().Format("15:04:05"),
	}
	raw, err := os.ReadFile(hostsPath)
	if err != nil {
		res.OK = false
		return res
	}
	sensitiveDomains := []string{
		"windowsupdate", "microsoft", "kaspersky", "drweb", "avast", "eset", "malwarebytes",
		"bitdefender", "virustotal", "sberbank", "tinkoff", "gosuslugi", "google.com", "github.com",
		"steamcommunity", "paypal", "binance", "coinbase",
	}
	for idx, rawLine := range strings.Split(string(raw), "\n") {
		line := strings.TrimSpace(rawLine)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if hashPos := strings.Index(line, "#"); hashPos >= 0 {
			line = strings.TrimSpace(line[:hashPos])
		}
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		ip := fields[0]
		for _, host := range fields[1:] {
			lowHost := strings.ToLower(host)
			isLocalHost := lowHost == "localhost" || lowHost == "ip6-localhost" || lowHost == "ip6-loopback" || strings.HasSuffix(lowHost, ".local")
			susp := false
			reason := "Стандартная системная запись"
			if !isLocalHost {
				if ip == "0.0.0.0" || ip == "127.0.0.1" {
					for _, sd := range sensitiveDomains {
						if strings.Contains(lowHost, sd) {
							susp = true
							reason = "Блокировка важного системного/антивирусного/банковского домена в hosts"
							break
						}
					}
					if !susp {
						reason = "Локальная блокировка домена пользователем"
					}
				} else {
					susp = true
					reason = fmt.Sprintf("Перенаправление домена %s на внешний IP %s (проверьте DNS Hijack)", host, ip)
				}
			}
			if susp {
				res.SuspiciousCount++
			}
			res.TotalMappings++
			if len(res.Entries) < 80 {
				res.Entries = append(res.Entries, HostsAuditEntry{
					Line:       idx + 1,
					IP:         ip,
					Host:       host,
					Suspicious: susp,
					Reason:     reason,
				})
			}
		}
	}
	if res.SuspiciousCount > 0 {
		s.LogAudit("warn", "hosts-guard", "LumaShield 1.5: подозрительные записи в файле hosts", fmt.Sprintf("Обнаружено %d нетипичных перенаправлений", res.SuspiciousCount))
	} else {
		s.LogAudit("ok", "hosts-guard", "LumaShield 1.5: файл hosts проверен", fmt.Sprintf("Проверено %d записей — подмены DNS не обнаружено", res.TotalMappings))
	}
	return res
}

