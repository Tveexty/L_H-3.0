// Luma OS 1.0.2 (Flagship Edition) — Native Kernel & Material 3 Expressive Dual-Window Shell
// Architecture: Modular OS Kernel (HAL Hardware Probe, Activity/Process Manager,
// Binder / JSON-RPC 2.0 IPC on 127.0.0.1:49215, LumaGuard AES-256-GCM + PBKDF2-HMAC-SHA512
// SecurityKernel, Encrypted Virtual File System, Real Media/Audio Controller, Region Auto-Detection,
// and 18-Widget Engine across Luma Pulse, Luma Aura, and Luma Core suites).
// Compiles to a zero-dependency standalone executable: LumaOS_1.0.2.exe

package main

import (
	"bufio"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/sha512"
	"embed"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"log"
	"math"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

//go:embed dist
var embeddedDist embed.FS

//go:embed luma_kernel_main.go system_types.go system_windows.go system_unix.go Luma_Core LauncherHab3.0_CSharp src/components/LumaDesktopCanvas.tsx src/components/LumaGrid20x30Window.tsx
var embeddedSources embed.FS

const (
	KernelVersion   = "1.0.2b"
	KernelCodename  = "Mono Desktop"
	DefaultRpcPort  = 49215
	DefaultHttpPort = 49216
)

type WidgetDescriptor struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Ecosystem string `json:"ecosystem"` // pulse | aura | core
	SpanW     int    `json:"spanW"`
	SpanH     int    `json:"spanH"`
	Category  string `json:"category"`
}

type ActiveProcess struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Target    string    `json:"target"`
	StartedAt time.Time `json:"started_at"`
	PID       int       `json:"pid"`
}

type LumaKernel struct {
	mu          sync.RWMutex
	bootTime    time.Time
	masterKey   []byte
	hmacSecret  []byte
	vfsDir      string
	vfsStore    map[string]string
	processes   map[string]*ActiveProcess
	widgets     []WidgetDescriptor
	probe       *platformProbe
	location    LocationInfo
	rpcRequests uint64
}

// pbkdf2HMACSHA512 derives a cryptographic key using standard RFC 2898 PBKDF2-HMAC-SHA512 (zero external deps)
func pbkdf2HMACSHA512(password, salt []byte, iter, keyLen int) []byte {
	prf := func(key, data []byte) []byte {
		h := hmac.New(sha512.New, key)
		h.Write(data)
		return h.Sum(nil)
	}
	hashLen := sha512.Size
	numBlocks := (keyLen + hashLen - 1) / hashLen
	var dk []byte
	for block := 1; block <= numBlocks; block++ {
		buf := make([]byte, len(salt)+4)
		copy(buf, salt)
		buf[len(salt)] = byte(block >> 24)
		buf[len(salt)+1] = byte(block >> 16)
		buf[len(salt)+2] = byte(block >> 8)
		buf[len(salt)+3] = byte(block)
		u := prf(password, buf)
		t := make([]byte, len(u))
		copy(t, u)
		for i := 1; i < iter; i++ {
			u = prf(password, u)
			for j := range t {
				t[j] ^= u[j]
			}
		}
		dk = append(dk, t...)
	}
	return dk[:keyLen]
}

func resolveVfsDir() string {
	base, err := os.UserConfigDir()
	if err != nil || base == "" {
		base = os.TempDir()
	}
	dir := filepath.Join(base, "LumaOS_1.0.2")
	_ = os.MkdirAll(dir, 0o700)
	return dir
}

func NewLumaKernel() *LumaKernel {
	vfsDir := resolveVfsDir()
	host, _ := os.Hostname()
	pass := []byte("LumaOS_1.0.2_Hardware_Root_" + host + "_" + runtime.GOOS)
	salt := []byte("LumaGuard_PBKDF2_SHA512_Salt_v1.0.2")
	derived := pbkdf2HMACSHA512(pass, salt, 25000, 64)

	k := &LumaKernel{
		bootTime:   time.Now(),
		masterKey:  derived[:32],
		hmacSecret: derived[32:64],
		vfsDir:     vfsDir,
		vfsStore:   make(map[string]string),
		processes:  make(map[string]*ActiveProcess),
		widgets:    default18Widgets(),
		probe:      newPlatformProbe(),
	}
	k.loadEncryptedVFS()
	go k.RefreshLocation()
	return k
}

func default18Widgets() []WidgetDescriptor {
	return []WidgetDescriptor{
		// Luma Pulse (6)
		{ID: "android_m3_clock", Title: "Luma Sculpt Clock & Сводка дня", Ecosystem: "pulse", SpanW: 6, SpanH: 4, Category: "Часы и сводка"},
		{ID: "android_quick_settings", Title: "Центр быстрых плиток Luma", Ecosystem: "pulse", SpanW: 8, SpanH: 4, Category: "Управление"},
		{ID: "android_pixel_weather", Title: "Luma Погода (Авто-регион Live)", Ecosystem: "pulse", SpanW: 8, SpanH: 4, Category: "Погода"},
		{ID: "android_wellbeing", Title: "Luma Баланс и Экранное время", Ecosystem: "pulse", SpanW: 6, SpanH: 3, Category: "Баланс"},
		{ID: "android_keep_notes", Title: "Luma Notes — Заметки и Задачи", Ecosystem: "pulse", SpanW: 6, SpanH: 4, Category: "Заметки"},
		{ID: "android_calculator", Title: "Luma Calc & Конвертер", Ecosystem: "pulse", SpanW: 6, SpanH: 4, Category: "Утилиты"},
		// Luma Aura (6)
		{ID: "ios_activity_rings", Title: "Luma Кольца ритма и фокуса", Ecosystem: "aura", SpanW: 6, SpanH: 4, Category: "Активность"},
		{ID: "ios_battery_matrix", Title: "Luma Энергия и Питание", Ecosystem: "aura", SpanW: 6, SpanH: 4, Category: "Энергия"},
		{ID: "ios_now_playing", Title: "Luma Vinyl — Живой Медиаплеер", Ecosystem: "aura", SpanW: 8, SpanH: 4, Category: "Музыка"},
		{ID: "ios_calendar_worldclock", Title: "Luma Календарь и Часовые пояса", Ecosystem: "aura", SpanW: 6, SpanH: 4, Category: "Время"},
		{ID: "ios_pomodoro_focus", Title: "Luma Focus Flow (Помидор)", Ecosystem: "aura", SpanW: 6, SpanH: 4, Category: "Фокус"},
		{ID: "ios_stocks_crypto", Title: "Luma Рынки и Курсы Live", Ecosystem: "aura", SpanW: 6, SpanH: 4, Category: "Финансы"},
		// Luma Core (6)
		{ID: "win_cpu_gpu_ram", Title: "Luma Монитор CPU / GPU / RAM", Ecosystem: "core", SpanW: 6, SpanH: 4, Category: "Ресурсы"},
		{ID: "win_storage_disks", Title: "Luma Хранилище и Тома дисков", Ecosystem: "core", SpanW: 6, SpanH: 4, Category: "Диски"},
		{ID: "win_network_monitor", Title: "Luma Сеть и Шина IPC 49215", Ecosystem: "core", SpanW: 6, SpanH: 4, Category: "Сеть"},
		{ID: "win_quick_utilities", Title: "Luma Быстрый запуск утилит", Ecosystem: "core", SpanW: 8, SpanH: 3, Category: "Система"},
		{ID: "win_power_center", Title: "Luma Питание и Щит блокировки", Ecosystem: "core", SpanW: 8, SpanH: 3, Category: "Питание"},
		{ID: "win_security_defender", Title: "LumaGuard AES-256-GCM Защита", Ecosystem: "core", SpanW: 8, SpanH: 3, Category: "Безопасность"},
	}
}

// RefreshLocation auto-detects the host's real region, city, country, timezone and coordinates
func (k *LumaKernel) RefreshLocation() LocationInfo {
	client := &http.Client{Timeout: 5 * time.Second}

	// Primary: ipwho.is (HTTPS, reliable, returns exact city/region/country/lat/lon/tz)
	if resp, err := client.Get("https://ipwho.is/"); err == nil {
		defer resp.Body.Close()
		var data struct {
			Success   bool    `json:"success"`
			IP        string  `json:"ip"`
			City      string  `json:"city"`
			Region    string  `json:"region"`
			Country   string  `json:"country"`
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
			Timezone  struct {
				ID string `json:"id"`
			} `json:"timezone"`
		}
		if json.NewDecoder(resp.Body).Decode(&data) == nil && data.Success && data.City != "" {
			loc := LocationInfo{
				Detected:  true,
				City:      data.City,
				Region:    data.Region,
				Country:   data.Country,
				Timezone:  data.Timezone.ID,
				Latitude:  data.Latitude,
				Longitude: data.Longitude,
				IP:        data.IP,
				Source:    "ipwho.is",
			}
			k.mu.Lock()
			k.location = loc
			k.mu.Unlock()
			return loc
		}
	}

	// Secondary fallback: ipapi.co
	if resp, err := client.Get("https://ipapi.co/json/"); err == nil {
		defer resp.Body.Close()
		var data struct {
			IP        string  `json:"ip"`
			City      string  `json:"city"`
			Region    string  `json:"region"`
			Country   string  `json:"country_name"`
			Timezone  string  `json:"timezone"`
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
		}
		if json.NewDecoder(resp.Body).Decode(&data) == nil && data.City != "" {
			loc := LocationInfo{
				Detected:  true,
				City:      data.City,
				Region:    data.Region,
				Country:   data.Country,
				Timezone:  data.Timezone,
				Latitude:  data.Latitude,
				Longitude: data.Longitude,
				IP:        data.IP,
				Source:    "ipapi.co",
			}
			k.mu.Lock()
			k.location = loc
			k.mu.Unlock()
			return loc
		}
	}

	k.mu.RLock()
	defer k.mu.RUnlock()
	return k.location
}

// SealAES256GCM encrypts payload with AES-256-GCM (96-bit nonce + 128-bit authentication tag)
func (k *LumaKernel) SealAES256GCM(plaintext []byte) (string, error) {
	block, err := aes.NewCipher(k.masterKey)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	sealed := gcm.Seal(nonce, nonce, plaintext, nil)
	return hex.EncodeToString(sealed), nil
}

// OpenAES256GCM decrypts and authenticates an AES-256-GCM hex payload
func (k *LumaKernel) OpenAES256GCM(hexCipher string) ([]byte, error) {
	raw, err := hex.DecodeString(strings.TrimSpace(hexCipher))
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(k.masterKey)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	ns := gcm.NonceSize()
	if len(raw) < ns {
		return nil, fmt.Errorf("ciphertext too short")
	}
	return gcm.Open(nil, raw[:ns], raw[ns:], nil)
}

func (k *LumaKernel) loadEncryptedVFS() {
	vaultPath := filepath.Join(k.vfsDir, "vfs_vault.luma.enc")
	data, err := os.ReadFile(vaultPath)
	if err != nil {
		return
	}
	plain, err := k.OpenAES256GCM(string(data))
	if err != nil {
		return
	}
	var store map[string]string
	if json.Unmarshal(plain, &store) == nil && store != nil {
		k.vfsStore = store
	}
}

func (k *LumaKernel) saveEncryptedVFS() error {
	raw, err := json.Marshal(k.vfsStore)
	if err != nil {
		return err
	}
	sealed, err := k.SealAES256GCM(raw)
	if err != nil {
		return err
	}
	tmpPath := filepath.Join(k.vfsDir, "vfs_vault.luma.enc.tmp")
	finalPath := filepath.Join(k.vfsDir, "vfs_vault.luma.enc")
	if err := os.WriteFile(tmpPath, []byte(sealed), 0o600); err != nil {
		return err
	}
	return os.Rename(tmpPath, finalPath)
}

func (k *LumaKernel) SignIPC(payload []byte) string {
	mac := hmac.New(sha256.New, k.hmacSecret)
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

func (k *LumaKernel) SystemSnapshot() HostHardwareSnapshot {
	k.mu.RLock()
	loc := k.location
	k.mu.RUnlock()
	return k.probe.Collect(loc)
}

func (k *LumaKernel) TelemetrySnapshot() map[string]interface{} {
	hw := k.SystemSnapshot()

	k.mu.RLock()
	defer k.mu.RUnlock()

	uptime := time.Since(k.bootTime).Seconds()
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)
	rssMB := math.Round((float64(memStats.Sys)/(1024.0*1024.0))*10) / 10

	return map[string]interface{}{
		"kernel":          "LumaCore",
		"version":         KernelVersion,
		"codename":        KernelCodename,
		"os":              hw.OSName,
		"hostname":        hw.Hostname,
		"arch":            hw.Arch,
		"cpu_model":       hw.CPUModel,
		"cpu_cores":       hw.CPUCores,
		"cpu_percent":     hw.CPUPercent,
		"gpu_name":        hw.GPUName,
		"ram_used_gb":     hw.RAMUsedGB,
		"ram_total_gb":    hw.RAMTotalGB,
		"ram_percent":     hw.RAMPercent,
		"battery_percent": hw.BatteryPercent,
		"battery_charging": hw.BatteryCharging,
		"net_down_mbps":   hw.NetDownMbps,
		"net_up_mbps":     hw.NetUpMbps,
		"disks":           hw.Disks,
		"media":           hw.Media,
		"location":        hw.Location,
		"core_rss_mb":     rssMB,
		"uptime_sec":      int(uptime),
		"ipc_endpoint":    fmt.Sprintf("tcp://127.0.0.1:%d", DefaultRpcPort),
		"vfs_path":        k.vfsDir,
		"security_engine": "LumaGuard AES-256-GCM + PBKDF2-HMAC-SHA512 + HMAC-SHA256",
		"widgets_count":   len(k.widgets),
		"rpc_requests":    k.rpcRequests,
		"active_procs":    len(k.processes),
		"real_telemetry":  true,
		"timestamp":       float64(time.Now().UnixMilli()) / 1000.0,
	}
}

func (k *LumaKernel) LaunchTarget(id, name, target, appType, args string) (map[string]interface{}, error) {
	k.mu.Lock()
	defer k.mu.Unlock()

	cleanTarget := strings.TrimSpace(target)
	if cleanTarget == "" {
		return nil, fmt.Errorf("empty target")
	}

	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		switch strings.ToLower(cleanTarget) {
		case "calc", "calc.exe":
			cmd = exec.Command("calc.exe")
		case "explorer", "explorer.exe":
			cmd = exec.Command("explorer.exe")
		case "taskmgr", "taskmgr.exe":
			cmd = exec.Command("taskmgr.exe")
		case "regedit", "regedit.exe":
			cmd = exec.Command("cmd.exe", "/c", "start", "", "regedit.exe")
		case "wt", "wt.exe":
			cmd = exec.Command("cmd.exe", "/c", "start", "", "wt.exe")
		case "cmd", "cmd.exe":
			cmd = exec.Command("cmd.exe", "/c", "start", "cmd.exe")
		case "shell:recyclebinfolder":
			cmd = exec.Command("explorer.exe", "shell:RecycleBinFolder")
		case "lock", "win+l":
			cmd = exec.Command("rundll32.exe", "user32.dll,LockWorkStation")
		default:
			if strings.TrimSpace(args) != "" {
				cmd = exec.Command("cmd.exe", "/c", "start", "", cleanTarget, args)
			} else {
				cmd = exec.Command("cmd.exe", "/c", "start", "", cleanTarget)
			}
		}
	} else {
		if strings.HasPrefix(cleanTarget, "http://") || strings.HasPrefix(cleanTarget, "https://") {
			cmd = exec.Command("xdg-open", cleanTarget)
		}
	}

	pid := 0
	if cmd != nil {
		if err := cmd.Start(); err == nil && cmd.Process != nil {
			pid = cmd.Process.Pid
		}
	}

	proc := &ActiveProcess{
		ID:        id,
		Name:      name,
		Target:    cleanTarget,
		StartedAt: time.Now(),
		PID:       pid,
	}
	k.processes[id] = proc

	return map[string]interface{}{
		"launched": true,
		"id":       id,
		"name":     name,
		"target":   cleanTarget,
		"pid":      pid,
		"os":       runtime.GOOS,
	}, nil
}

func (k *LumaKernel) HandleJSONRPC(raw []byte) []byte {
	k.mu.Lock()
	k.rpcRequests++
	k.mu.Unlock()

	var req struct {
		JSONRPC string                 `json:"jsonrpc"`
		Method  string                 `json:"method"`
		Params  map[string]interface{} `json:"params"`
		ID      interface{}            `json:"id"`
	}
	if err := json.Unmarshal(raw, &req); err != nil {
		resp, _ := json.Marshal(map[string]interface{}{
			"jsonrpc": "2.0",
			"error":   map[string]interface{}{"code": -32700, "message": "Parse error"},
			"id":      nil,
		})
		return resp
	}

	var result interface{}
	switch req.Method {
	case "system.ping":
		result = map[string]interface{}{
			"pong":       true,
			"engine":     "Luma OS 1.0.2 Kernel",
			"version":    KernelVersion,
			"ipc_socket": fmt.Sprintf("tcp://127.0.0.1:%d", DefaultRpcPort),
			"timestamp":  float64(time.Now().UnixMilli()) / 1000.0,
		}
	case "system.info":
		result = k.TelemetrySnapshot()
	case "widgets.list":
		result = k.widgets
	case "widgets.get_data":
		snap := k.TelemetrySnapshot()
		result = map[string]interface{}{
			"engine":        "Luma WidgetEngine 1.0.2 (Luma Pulse + Luma Aura + Luma Core)",
			"grid_matrix":   "20x30 (600 coordinate cells)",
			"widgets_total": len(k.widgets),
			"interval_sec":  1,
			"metrics":       snap,
			"widgets":       k.widgets,
		}
	case "security.status":
		sampleCipher, _ := k.SealAES256GCM([]byte("LumaOS_1.0.2_Verified_Container"))
		result = map[string]interface{}{
			"engine":            "LumaGuard SecurityKernel 1.0.2",
			"cipher":            "AES-256-GCM (96-bit Nonce + 128-bit AuthTag)",
			"kdf":               "PBKDF2-HMAC-SHA512",
			"ipc_mac":           "HMAC-SHA256",
			"vfs_vault_dir":     k.vfsDir,
			"sample_ciphertext": sampleCipher,
			"hmac_signature":    k.SignIPC(raw),
		}
	default:
		result = k.TelemetrySnapshot()
	}

	resp, _ := json.Marshal(map[string]interface{}{
		"jsonrpc": "2.0",
		"result":  result,
		"id":      req.ID,
	})
	return resp
}

func startTcpRpcServer(kernel *LumaKernel, port int) {
	addr := fmt.Sprintf("127.0.0.1:%d", port)
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		log.Printf("[LumaCore TCP] Port %s already active or unavailable: %v", addr, err)
		return
	}
	log.Printf("[LumaCore TCP] JSON-RPC 2.0 Kernel Bus listening on %s", addr)
	for {
		conn, err := ln.Accept()
		if err != nil {
			continue
		}
		go func(c net.Conn) {
			defer c.Close()
			scanner := bufio.NewScanner(c)
			for scanner.Scan() {
				line := scanner.Bytes()
				if len(line) == 0 {
					continue
				}
				resp := kernel.HandleJSONRPC(line)
				_, _ = c.Write(append(resp, '\n'))
			}
		}(conn)
	}
}

func openNativeDesktopWindow(url string, width, height, x, y int) {
	if runtime.GOOS != "windows" {
		return
	}
	candidates := []string{
		filepath.Join(os.Getenv("ProgramFiles(x86)"), "Microsoft", "Edge", "Application", "msedge.exe"),
		filepath.Join(os.Getenv("ProgramFiles"), "Microsoft", "Edge", "Application", "msedge.exe"),
		filepath.Join(os.Getenv("ProgramFiles"), "Google", "Chrome", "Application", "chrome.exe"),
		filepath.Join(os.Getenv("ProgramFiles(x86)"), "Google", "Chrome", "Application", "chrome.exe"),
		filepath.Join(os.Getenv("LocalAppData"), "Google", "Chrome", "Application", "chrome.exe"),
	}
	for _, bin := range candidates {
		if bin != "" {
			if _, err := os.Stat(bin); err == nil {
				cmd := exec.Command(
					bin,
					fmt.Sprintf("--app=%s", url),
					fmt.Sprintf("--window-size=%d,%d", width, height),
					fmt.Sprintf("--window-position=%d,%d", x, y),
				)
				_ = cmd.Start()
				return
			}
		}
	}
	_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
}

func isLumaAlreadyRunning(httpPort int) bool {
	client := &http.Client{Timeout: 400 * time.Millisecond}
	resp, err := client.Get(fmt.Sprintf("http://127.0.0.1:%d/api/kernel/status", httpPort))
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func main() {
	runtime.LockOSThread()
	httpPort := flag.Int("port", DefaultHttpPort, "HTTP port for Luma OS 1.0.2b Desktop")
	rpcPort := flag.Int("rpc-port", DefaultRpcPort, "TCP JSON-RPC 2.0 port for Luma Core 1.0.2b")
	headless := flag.Bool("headless", false, "Run Luma Core 1.0.2b daemon without opening desktop window")
	flag.Parse()

	if isLumaAlreadyRunning(*httpPort) {
		log.Printf("[LumaOS 1.0.2b] Existing kernel daemon detected on 127.0.0.1:%d — attaching native window...", *httpPort)
		if !*headless && runtime.GOOS == "windows" {
			winURL := fmt.Sprintf("http://127.0.0.1:%d/", *httpPort)
			if !runNativeDesktopWindow(winURL) {
				openNativeDesktopWindow(winURL, 1440, 900, 40, 40)
			}
		}
		return
	}

	kernel := NewLumaKernel()

	// 1. Start Luma Core 1.0.2 TCP JSON-RPC 2.0 Server (127.0.0.1:49215)
	go startTcpRpcServer(kernel, *rpcPort)

	// 2. Prepare embedded dist/ filesystem
	distSub, err := fs.Sub(embeddedDist, "dist")
	if err != nil {
		log.Fatalf("Failed to mount embedded dist/: %v", err)
	}
	fileServer := http.FileServer(http.FS(distSub))

	mux := http.NewServeMux()

	// Full Real Hardware + Media + Region Telemetry API
	mux.HandleFunc("/api/kernel/system", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_ = json.NewEncoder(w).Encode(kernel.SystemSnapshot())
	})

	// Kernel Status API
	mux.HandleFunc("/api/kernel/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_ = json.NewEncoder(w).Encode(kernel.TelemetrySnapshot())
	})

	// Region & Geolocation Auto-Detection API
	mux.HandleFunc("/api/kernel/location", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.URL.Query().Get("refresh") == "1" || !kernel.location.Detected {
			loc := kernel.RefreshLocation()
			_ = json.NewEncoder(w).Encode(loc)
			return
		}
		kernel.mu.RLock()
		loc := kernel.location
		kernel.mu.RUnlock()
		_ = json.NewEncoder(w).Encode(loc)
	})

	// Real OS Media Track Switching API (play_pause | next | prev)
	mux.HandleFunc("/api/kernel/media", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var payload struct {
			Action string `json:"action"`
		}
		_ = json.NewDecoder(r.Body).Decode(&payload)
		if payload.Action == "" {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "media": kernel.SystemSnapshot().Media})
			return
		}
		media, err := kernel.probe.ControlMedia(payload.Action)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "action": payload.Action, "media": media})
	})

	// Real OS Audio Volume & Mute Control API
	mux.HandleFunc("/api/kernel/audio", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var payload struct {
			Volume int  `json:"volume"`
			Mute   bool `json:"mute"`
		}
		_ = json.NewDecoder(r.Body).Decode(&payload)
		_ = kernel.probe.SetAudioVolume(payload.Volume, payload.Mute)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "volume": payload.Volume, "mute": payload.Mute})
	})

	// Real OS Power & System Action API (lock | sleep | recycle_bin)
	mux.HandleFunc("/api/kernel/power", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var payload struct {
			Action string `json:"action"`
		}
		_ = json.NewDecoder(r.Body).Decode(&payload)
		err := kernel.probe.ExecutePowerAction(payload.Action)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "action": payload.Action})
	})

	// Kernel JSON-RPC 2.0 over HTTP Bridge
	mux.HandleFunc("/api/kernel/rpc", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		body, _ := io.ReadAll(r.Body)
		if len(body) == 0 {
			body = []byte(`{"jsonrpc":"2.0","method":"widgets.get_data","id":1}`)
		}
		_, _ = w.Write(kernel.HandleJSONRPC(body))
	})

	// Encrypted Virtual File System (VFS) Key-Value Store API
	mux.HandleFunc("/api/kernel/vfs", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method == http.MethodPost {
			var kv struct {
				Key   string `json:"key"`
				Value string `json:"value"`
			}
			if err := json.NewDecoder(r.Body).Decode(&kv); err == nil && kv.Key != "" {
				kernel.mu.Lock()
				kernel.vfsStore[kv.Key] = kv.Value
				_ = kernel.saveEncryptedVFS()
				kernel.mu.Unlock()
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "key": kv.Key, "encrypted": "AES-256-GCM"})
				return
			}
		}
		kernel.mu.RLock()
		defer kernel.mu.RUnlock()
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "keys": len(kernel.vfsStore), "store": kernel.vfsStore})
	})

	// Kernel Process Launcher API
	mux.HandleFunc("/api/kernel/launch", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var payload struct {
			ID      string `json:"id"`
			Name    string `json:"name"`
			URL     string `json:"url"`
			Command string `json:"command"`
			Type    string `json:"type"`
			Args    string `json:"args"`
		}
		_ = json.NewDecoder(r.Body).Decode(&payload)
		target := payload.URL
		if target == "" {
			target = payload.Command
		}
		if payload.ID == "" {
			payload.ID = strings.ToLower(strings.ReplaceAll(target, " ", "_"))
		}
		res, err := kernel.LaunchTarget(payload.ID, payload.Name, target, payload.Type, payload.Args)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		_ = json.NewEncoder(w).Encode(res)
	})

	// Native Host Clipboard API (Luma Island Clipboard Manager)
	mux.HandleFunc("/api/kernel/clipboard", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method == http.MethodPost {
			var payload struct {
				Text string `json:"text"`
			}
			_ = json.NewDecoder(r.Body).Decode(&payload)
			err := kernel.probe.SetClipboard(payload.Text)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": err == nil, "text": payload.Text})
			return
		}
		txt, err := kernel.probe.GetClipboard()
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": err == nil, "text": txt})
	})

	// Open ANY local file, folder, EXE, or URL natively
	mux.HandleFunc("/api/kernel/open-path", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var payload struct {
			Path string `json:"path"`
		}
		_ = json.NewDecoder(r.Body).Decode(&payload)
		err := kernel.probe.OpenPath(payload.Path)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "path": payload.Path})
	})

	// Native OS File / Folder Picker Dialog (Add real PC files/folders to desktop)
	mux.HandleFunc("/api/kernel/pick-file", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var payload struct {
			Mode string `json:"mode"`
		}
		_ = json.NewDecoder(r.Body).Decode(&payload)
		if payload.Mode == "" {
			payload.Mode = "file"
		}
		picked := kernel.probe.PickFile(payload.Mode)
		_ = json.NewEncoder(w).Encode(picked)
	})

	// Real Top Host Processes (for Terminal `top` / `ps`)
	mux.HandleFunc("/api/kernel/processes", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		procs := kernel.probe.TopProcesses(12)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "processes": procs})
	})

	// Safe Host Filesystem Inspector (for Terminal `ls` / `cat`)
	mux.HandleFunc("/api/kernel/fs", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var payload struct {
			Action string `json:"action"`
			Path   string `json:"path"`
		}
		_ = json.NewDecoder(r.Body).Decode(&payload)
		target := strings.TrimSpace(payload.Path)
		if target == "" || target == "~" {
			target, _ = os.UserHomeDir()
		}
		if strings.HasPrefix(target, "~/") {
			home, _ := os.UserHomeDir()
			target = filepath.Join(home, target[2:])
		}
		if strings.EqualFold(payload.Action, "cat") {
			data, err := os.ReadFile(target)
			if err != nil {
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
				return
			}
			if len(data) > 16384 {
				data = data[:16384]
			}
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "path": target, "content": string(data)})
			return
		}
		entries, err := os.ReadDir(target)
		if err != nil {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		var out []FsEntry
		for _, e := range entries {
			info, _ := e.Info()
			var sz int64
			if info != nil {
				sz = info.Size()
			}
			out = append(out, FsEntry{
				Name:  e.Name(),
				Path:  filepath.Join(target, e.Name()),
				IsDir: e.IsDir(),
				Size:  sz,
			})
			if len(out) >= 60 {
				break
			}
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "path": target, "entries": out})
	})

	// Host Shell Execution (for Pro Luma Terminal)
	mux.HandleFunc("/api/kernel/exec", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var payload struct {
			Command string `json:"command"`
		}
		_ = json.NewDecoder(r.Body).Decode(&payload)
		if strings.TrimSpace(payload.Command) == "" {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "stderr": "empty command", "exit_code": 1})
			return
		}
		stdout, stderr, code := kernel.probe.ExecShell(payload.Command)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":        code == 0,
			"stdout":    stdout,
			"stderr":    stderr,
			"exit_code": code,
		})
	})

	// Native Win32 Fullscreen Toggle API
	mux.HandleFunc("/api/kernel/fullscreen", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method == http.MethodPost {
			var payload struct {
				Enabled *bool `json:"enabled"`
			}
			_ = json.NewDecoder(r.Body).Decode(&payload)
			active := toggleNativeFullscreen(payload.Enabled)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "fullscreen": active})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "fullscreen": isNativeFullscreen()})
	})

	// Serve standalone executable download for LumaOS_1.0.2b.exe (with backward-compatible aliases)
	serveExe := func(w http.ResponseWriter, r *http.Request) {
		for _, candidate := range []string{"LumaOS_1.0.2b.exe", "LumaOS_1.0.2.exe", "LumaOS_1.0.1.exe", "LumaOS_1.0.exe"} {
			if _, err := os.Stat(candidate); err == nil {
				w.Header().Set("Content-Type", "application/vnd.microsoft.portable-executable")
				w.Header().Set("Content-Disposition", `attachment; filename="LumaOS_1.0.2b.exe"`)
				http.ServeFile(w, r, candidate)
				return
			}
		}
		exePath, err := os.Executable()
		if err == nil && strings.HasSuffix(strings.ToLower(exePath), ".exe") {
			w.Header().Set("Content-Type", "application/vnd.microsoft.portable-executable")
			w.Header().Set("Content-Disposition", `attachment; filename="LumaOS_1.0.2b.exe"`)
			http.ServeFile(w, r, exePath)
			return
		}
		fileServer.ServeHTTP(w, r)
	}
	mux.HandleFunc("/LumaOS_1.0.2b.exe", serveExe)
	mux.HandleFunc("/LumaOS_1.0.2.exe", serveExe)
	mux.HandleFunc("/LumaOS_1.0.1.exe", serveExe)
	mux.HandleFunc("/LumaOS_1.0.exe", serveExe)

	// Serve embedded source files for built-in "Ядро Luma" Code Viewer
	sourceFileServer := http.FileServer(http.FS(embeddedSources))
	mux.Handle("/LauncherHab3.0_CSharp/", sourceFileServer)
	mux.Handle("/Luma_Core/", sourceFileServer)
	mux.Handle("/src/", sourceFileServer)
	for _, goFile := range []string{"luma_kernel_main.go", "system_types.go", "system_windows.go", "system_unix.go"} {
		fileName := goFile
		mux.HandleFunc("/"+fileName, func(w http.ResponseWriter, r *http.Request) {
			data, err := embeddedSources.ReadFile(fileName)
			if err != nil {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			_, _ = w.Write(data)
		})
	}

	// Serve SPA & static assets
	mux.Handle("/", fileServer)

	addr := fmt.Sprintf("127.0.0.1:%d", *httpPort)
	log.Printf("=================================================================")
	log.Printf("  LUMA OS 1.0.2b — MONO DESKTOP & KERNEL")
	log.Printf("  - Desktop Environment:         http://%s/", addr)
	log.Printf("  - Kernel JSON-RPC 2.0 Socket:  tcp://127.0.0.1:%d", *rpcPort)
	log.Printf("  - Real Telemetry & Media API:  http://%s/api/kernel/system", addr)
	log.Printf("=================================================================")

	if !*headless && runtime.GOOS == "windows" {
		go func() {
			if err := http.ListenAndServe(addr, mux); err != nil {
				log.Printf("Luma OS HTTP server error: %v", err)
			}
		}()
		time.Sleep(200 * time.Millisecond)
		winURL := fmt.Sprintf("http://127.0.0.1:%d/", *httpPort)
		// Host directly inside native standalone Win32 WebView2 GUI window (no Microsoft Edge!)
		if !runNativeDesktopWindow(winURL) {
			openNativeDesktopWindow(winURL, 1440, 900, 40, 40)
			select {}
		}
		return
	}

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Luma OS HTTP server error: %v", err)
	}
}
