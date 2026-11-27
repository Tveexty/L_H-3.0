package main

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// ==================== LUMA OS 1.7 (OXYGEN) — OXYGEN CONNECT FOR ANDROID (HARMONYOS SUPERHUB) ====================
// Zero-cable LAN Companion Server on 0.0.0.0:49218 + Real Scannable Offline QR Code SVG + Installable Android PWA!
// Features:
//   - Snap Photo from Android Camera -> Instant drop onto Luma OS Desktop / Shelf / Downloads/OxygenConnect
//   - Two-way File Transfer (Phone <-> PC Desktop / Downloads / Drop Shelf)
//   - Universal Clipboard Sync (Phone <-> PC)
//   - Virtual Remote Trackpad + Keyboard + Media/Volume Remote + Live PC Screenshot & Hardware Telemetry

const OxygenConnectPort = 49218

type OxygenConnectedDevice struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	IP         string `json:"ip"`
	LastSeenAt string `json:"last_seen_at"`
	UserAgent  string `json:"user_agent,omitempty"`
}

type OxygenReceivedFile struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Path       string `json:"path"`
	Size       int64  `json:"size"`
	IsImage    bool   `json:"is_image"`
	FromDevice string `json:"from_device"`
	ReceivedAt string `json:"received_at"`
	PreviewURL string `json:"preview_url,omitempty"`
}

type OxygenTransferEvent struct {
	ID         string `json:"id"`
	Direction  string `json:"direction"` // "receive" (phone -> PC) | "send" (PC -> phone)
	FileName   string `json:"file_name"`
	Path       string `json:"path,omitempty"`
	Size       int64  `json:"size"`
	IsImage    bool   `json:"is_image"`
	PreviewURL string `json:"preview_url,omitempty"`
	Device     string `json:"device"`
	Timestamp  int64  `json:"timestamp"`
}

var (
	oxyConnMu          sync.RWMutex
	oxyConnStarted     bool
	oxyConnPIN         string
	oxyConnDevices     = map[string]OxygenConnectedDevice{}
	oxyConnInbox       = []OxygenReceivedFile{}
	oxyConnOutbox      = []OxygenReceivedFile{}
	oxyConnDir         string
	oxyConnLastEvent   *OxygenTransferEvent
	oxyTransferSubMu   sync.Mutex
	oxyTransferSubs    = map[int]chan OxygenTransferEvent{}
	oxyTransferSubNext int
)

func subscribeOxygenTransferEvents() (int, chan OxygenTransferEvent) {
	oxyTransferSubMu.Lock()
	defer oxyTransferSubMu.Unlock()
	oxyTransferSubNext++
	id := oxyTransferSubNext
	ch := make(chan OxygenTransferEvent, 16)
	oxyTransferSubs[id] = ch
	return id, ch
}

func unsubscribeOxygenTransferEvents(id int) {
	oxyTransferSubMu.Lock()
	if ch, ok := oxyTransferSubs[id]; ok {
		delete(oxyTransferSubs, id)
		close(ch)
	}
	oxyTransferSubMu.Unlock()
}

func publishOxygenTransferEvent(ev OxygenTransferEvent) {
	if ev.ID == "" {
		ev.ID = fmt.Sprintf("tr_%d", time.Now().UnixNano())
	}
	if ev.Timestamp == 0 {
		ev.Timestamp = time.Now().UnixMilli()
	}
	oxyConnMu.Lock()
	copyEv := ev
	oxyConnLastEvent = &copyEv
	oxyConnMu.Unlock()

	oxyTransferSubMu.Lock()
	for _, ch := range oxyTransferSubs {
		select {
		case ch <- ev:
		default:
		}
	}
	oxyTransferSubMu.Unlock()
}

func initOxygenConnectState() {
	oxyConnMu.Lock()
	defer oxyConnMu.Unlock()
	if oxyConnPIN == "" {
		n, err := rand.Int(rand.Reader, big.NewInt(900000))
		if err == nil {
			oxyConnPIN = fmt.Sprintf("%06d", n.Int64()+100000)
		} else {
			oxyConnPIN = "742819"
		}
	}
	if oxyConnDir == "" {
		home, err := os.UserHomeDir()
		if err != nil || home == "" {
			home = os.TempDir()
		}
		oxyConnDir = filepath.Join(home, "Downloads", "OxygenConnect")
		_ = os.MkdirAll(oxyConnDir, 0o755)
	}
}

func detectLocalLANIP() string {
	ifaces, err := net.Interfaces()
	if err != nil {
		return "127.0.0.1"
	}
	var fallback string
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		low := strings.ToLower(iface.Name)
		if strings.Contains(low, "docker") || strings.Contains(low, "vethernet") || strings.Contains(low, "wsl") || strings.Contains(low, "virtual") {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if !ok || ipNet.IP == nil || ipNet.IP.IsLoopback() {
				continue
			}
			v4 := ipNet.IP.To4()
			if v4 == nil {
				continue
			}
			s := v4.String()
			if strings.HasPrefix(s, "192.168.") || strings.HasPrefix(s, "10.") || strings.HasPrefix(s, "172.") {
				return s
			}
			if fallback == "" {
				fallback = s
			}
		}
	}
	if fallback != "" {
		return fallback
	}
	return "127.0.0.1"
}

func touchOxygenDevice(r *http.Request, name string) {
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		ip = r.RemoteAddr
	}
	if name == "" {
		ua := r.UserAgent()
		if strings.Contains(ua, "Android") {
			name = "Android (Oxygen Connect)"
		} else {
			name = "Мобильное устройство"
		}
	}
	id := "dev_" + strings.ReplaceAll(ip, ".", "_")
	oxyConnMu.Lock()
	oxyConnDevices[id] = OxygenConnectedDevice{
		ID:         id,
		Name:       name,
		IP:         ip,
		LastSeenAt: time.Now().Format("15:04:05"),
		UserAgent:  r.UserAgent(),
	}
	oxyConnMu.Unlock()
}

func getOxygenConnectStatusSnapshot() map[string]interface{} {
	initOxygenConnectState()
	ip := detectLocalLANIP()
	oxyConnMu.RLock()
	pin := oxyConnPIN
	dir := oxyConnDir
	devs := make([]OxygenConnectedDevice, 0, len(oxyConnDevices))
	for _, d := range oxyConnDevices {
		devs = append(devs, d)
	}
	inbox := append([]OxygenReceivedFile(nil), oxyConnInbox...)
	outbox := append([]OxygenReceivedFile(nil), oxyConnOutbox...)
	lastEv := oxyConnLastEvent
	oxyConnMu.RUnlock()

	pairURL := fmt.Sprintf("http://%s:%d/?pin=%s", ip, OxygenConnectPort, pin)
	return map[string]interface{}{
		"ok":            true,
		"running":       true,
		"lan_ip":        ip,
		"port":          OxygenConnectPort,
		"pin":           pin,
		"pair_url":      pairURL,
		"inbox_dir":     dir,
		"devices":       devs,
		"inbox":         inbox,
		"outbox":        outbox,
		"last_transfer": lastEv,
		"device_name":   hostDeviceName(),
	}
}

func hostDeviceName() string {
	h, err := os.Hostname()
	if err != nil || h == "" {
		return "Luma OS 1.7.4 (Oxygen)"
	}
	return h
}

func checkOxygenPIN(r *http.Request) bool {
	oxyConnMu.RLock()
	expected := oxyConnPIN
	oxyConnMu.RUnlock()
	got := strings.TrimSpace(r.Header.Get("X-Oxygen-PIN"))
	if got == "" {
		got = strings.TrimSpace(r.URL.Query().Get("pin"))
	}
	return got == expected
}

func registerOxygenConnectRoutes(mainMux *http.ServeMux, kernel *LumaKernel) {
	initOxygenConnectState()

	// Desktop-side local management routes (127.0.0.1:49216)
	mainMux.HandleFunc("/api/kernel/oxygen-connect/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_ = json.NewEncoder(w).Encode(getOxygenConnectStatusSnapshot())
	})

	// Real-time HarmonyOS Transfer Wave SSE stream for Luma OS Desktop
	mainMux.HandleFunc("/api/kernel/oxygen-connect/events", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no")
		flusher, _ := w.(http.Flusher)

		subID, ch := subscribeOxygenTransferEvents()
		defer unsubscribeOxygenTransferEvents(subID)

		writeSSEEvent(w, flusher, map[string]interface{}{"type": "connected", "engine": "OxygenConnect 1.7.1 HarmonyWave"})
		keepalive := time.NewTicker(25 * time.Second)
		defer keepalive.Stop()
		for {
			select {
			case <-r.Context().Done():
				return
			case ev, ok := <-ch:
				if !ok {
					return
				}
				writeSSEEvent(w, flusher, map[string]interface{}{"type": "transfer", "event": ev})
			case <-keepalive.C:
				_, _ = fmt.Fprintf(w, ": ping\n\n")
				if flusher != nil {
					flusher.Flush()
				}
			}
		}
	})

	// Send file from PC -> Android phone (triggers HarmonyOS Send Wave on PC & Receive Wave on Android!)
	mainMux.HandleFunc("/api/kernel/oxygen-connect/send-to-phone", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Path string `json:"path"`
		}
		_ = json.NewDecoder(io.LimitReader(r.Body, 65536)).Decode(&req)
		p := filepath.Clean(strings.TrimSpace(req.Path))
		info, err := os.Stat(p)
		if p == "" || err != nil || info.IsDir() {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "Укажите существующий файл на ПК"})
			return
		}
		name := filepath.Base(p)
		extLow := strings.ToLower(filepath.Ext(name))
		isImg := extLow == ".jpg" || extLow == ".jpeg" || extLow == ".png" || extLow == ".webp" || extLow == ".gif"
		rec := OxygenReceivedFile{
			ID:         fmt.Sprintf("out_%d", time.Now().UnixNano()),
			Name:       name,
			Path:       p,
			Size:       info.Size(),
			IsImage:    isImg,
			FromDevice: hostDeviceName(),
			ReceivedAt: time.Now().Format("15:04:05"),
		}
		oxyConnMu.Lock()
		oxyConnOutbox = append([]OxygenReceivedFile{rec}, oxyConnOutbox...)
		if len(oxyConnOutbox) > 30 {
			oxyConnOutbox = oxyConnOutbox[:30]
		}
		oxyConnMu.Unlock()

		publishOxygenTransferEvent(OxygenTransferEvent{
			ID:        rec.ID,
			Direction: "send",
			FileName:  rec.Name,
			Path:      rec.Path,
			Size:      rec.Size,
			IsImage:   rec.IsImage,
			Device:    "Android",
			Timestamp: time.Now().UnixMilli(),
		})
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "file": rec})
	})

	mainMux.HandleFunc("/api/kernel/oxygen-connect/regenerate-pin", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		n, err := rand.Int(rand.Reader, big.NewInt(900000))
		oxyConnMu.Lock()
		if err == nil {
			oxyConnPIN = fmt.Sprintf("%06d", n.Int64()+100000)
		}
		oxyConnMu.Unlock()
		_ = json.NewEncoder(w).Encode(getOxygenConnectStatusSnapshot())
	})

	mainMux.HandleFunc("/api/kernel/oxygen-connect/qr.svg", func(w http.ResponseWriter, r *http.Request) {
		snap := getOxygenConnectStatusSnapshot()
		pairURL, _ := snap["pair_url"].(string)
		w.Header().Set("Content-Type", "image/svg+xml; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write([]byte(generateQRCodeSVG(pairURL)))
	})

	mainMux.HandleFunc("/api/kernel/oxygen-connect/inbox-file", func(w http.ResponseWriter, r *http.Request) {
		name := filepath.Base(strings.TrimSpace(r.URL.Query().Get("name")))
		if name == "" || name == "." || name == "/" {
			http.NotFound(w, r)
			return
		}
		oxyConnMu.RLock()
		dir := oxyConnDir
		oxyConnMu.RUnlock()
		full := filepath.Join(dir, name)
		http.ServeFile(w, r, full)
	})

	// Launch dedicated LAN server on 0.0.0.0:49218 for Android phones on the same Wi-Fi!
	oxyConnMu.Lock()
	if oxyConnStarted {
		oxyConnMu.Unlock()
		return
	}
	oxyConnStarted = true
	oxyConnMu.Unlock()

	lanMux := http.NewServeMux()
	lanMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/manifest.json" {
			w.Header().Set("Content-Type", "application/manifest+json; charset=utf-8")
			_, _ = w.Write([]byte(`{"name":"Luma Oxygen Connect","short_name":"Oxygen","start_url":"/","display":"standalone","background_color":"#050b18","theme_color":"#06b6d4","icons":[{"src":"/icon.svg","sizes":"512x512","type":"image/svg+xml"}]}`))
			return
		}
		if r.URL.Path == "/icon.svg" {
			w.Header().Set("Content-Type", "image/svg+xml; charset=utf-8")
			_, _ = w.Write([]byte(renderFallbackAppIconSVG("O2")))
			return
		}
		touchOxygenDevice(r, "")
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write([]byte(oxygenConnectMobileHTML))
	})

	lanMux.HandleFunc("/api/ping", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if !checkOxygenPIN(r) {
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "Неверный PIN-код"})
			return
		}
		touchOxygenDevice(r, r.URL.Query().Get("device"))
		hw := kernel.SystemSnapshot()
		clipStr, _ := kernel.probe.GetClipboard()
		oxyConnMu.RLock()
		outbox := append([]OxygenReceivedFile(nil), oxyConnOutbox...)
		oxyConnMu.RUnlock()
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":         true,
			"pc_name":    hostDeviceName(),
			"os_version": KernelVersion + " (" + KernelCodename + ")",
			"cpu":        hw.CPUPercent,
			"ram":        hw.RAMPercent,
			"battery":    hw.BatteryPercent,
			"volume":     50,
			"media":      hw.Media.Title,
			"clipboard":  clipStr,
			"outbox":     outbox,
		})
	})

	// Mobile Circle to Search: Live PC Screen Capture (Luma OS 1.7.2B — fast JPEG over Wi-Fi, ZERO double data-URI prefix!)
	lanMux.HandleFunc("/api/screen-now", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		if !checkOxygenPIN(r) {
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "Неверный PIN-код"})
			return
		}
		dataURI, width, height, err := captureFullScreenJPEG(1440, 86)
		mime := "image/jpeg"
		if err != nil || dataURI == "" {
			dataURI, width, height, err = captureFullScreenPNG()
			mime = "image/png"
		}
		if err != nil || dataURI == "" {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "Не удалось захватить экран ПК"})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":           true,
			"image_base64": ensureImageDataURI(dataURI, mime),
			"width":        width,
			"height":       height,
		})
	})

	lanMux.HandleFunc("/api/circle-search", func(w http.ResponseWriter, r *http.Request) {
		if !checkOxygenPIN(r) {
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "Неверный PIN-код"})
			return
		}
		handleCircleSearchHTTP(w, r, kernel)
	})

	lanMux.HandleFunc("/api/upload", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if !checkOxygenPIN(r) {
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "Неверный PIN-код"})
			return
		}
		touchOxygenDevice(r, r.FormValue("device"))
		if err := r.ParseMultipartForm(128 << 20); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		oxyConnMu.RLock()
		dir := oxyConnDir
		oxyConnMu.RUnlock()
		_ = os.MkdirAll(dir, 0o755)

		files := r.MultipartForm.File["files"]
		if len(files) == 0 {
			files = r.MultipartForm.File["file"]
		}
		saved := []OxygenReceivedFile{}
		for _, hdr := range files {
			src, err := hdr.Open()
			if err != nil {
				continue
			}
			cleanName := filepath.Base(hdr.Filename)
			if cleanName == "" || cleanName == "." {
				cleanName = fmt.Sprintf("oxygen_photo_%d.jpg", time.Now().Unix())
			}
			dstPath := filepath.Join(dir, cleanName)
			if _, err := os.Stat(dstPath); err == nil {
				ext := filepath.Ext(cleanName)
				stem := strings.TrimSuffix(cleanName, ext)
				dstPath = filepath.Join(dir, fmt.Sprintf("%s_%d%s", stem, time.Now().Unix()%10000, ext))
				cleanName = filepath.Base(dstPath)
			}
			dst, err := os.Create(dstPath)
			if err != nil {
				_ = src.Close()
				continue
			}
			n, _ := io.Copy(dst, src)
			_ = dst.Close()
			_ = src.Close()

			extLow := strings.ToLower(filepath.Ext(cleanName))
			isImg := extLow == ".jpg" || extLow == ".jpeg" || extLow == ".png" || extLow == ".webp" || extLow == ".gif"
			rec := OxygenReceivedFile{
				ID:         fmt.Sprintf("oxy_%d", time.Now().UnixNano()),
				Name:       cleanName,
				Path:       dstPath,
				Size:       n,
				IsImage:    isImg,
				FromDevice: r.FormValue("device"),
				ReceivedAt: time.Now().Format("15:04:05"),
				PreviewURL: "/api/kernel/oxygen-connect/inbox-file?name=" + cleanName,
			}
			if rec.FromDevice == "" {
				rec.FromDevice = "Android"
			}
			oxyConnMu.Lock()
			oxyConnInbox = append([]OxygenReceivedFile{rec}, oxyConnInbox...)
			if len(oxyConnInbox) > 60 {
				oxyConnInbox = oxyConnInbox[:60]
			}
			oxyConnMu.Unlock()

			// Automatically drop received phone file/photo onto Luma Drop Shelf too!
			kind := "file"
			if isImg {
				kind = "image"
			}
			addItemToDropShelf(ShelfItem{
				Kind: kind,
				Name: cleanName,
				Path: dstPath,
				Size: n,
			})

			// Trigger full-screen HarmonyOS Receive Ripple Wave on Luma OS Desktop!
			publishOxygenTransferEvent(OxygenTransferEvent{
				ID:         rec.ID,
				Direction:  "receive",
				FileName:   rec.Name,
				Path:       rec.Path,
				Size:       rec.Size,
				IsImage:    rec.IsImage,
				PreviewURL: rec.PreviewURL,
				Device:     rec.FromDevice,
				Timestamp:  time.Now().UnixMilli(),
			})

			saved = append(saved, rec)
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "saved": saved, "count": len(saved)})
	})

	lanMux.HandleFunc("/api/pc-files", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if !checkOxygenPIN(r) {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		zone := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("zone")))
		home, _ := os.UserHomeDir()
		type fileRow struct {
			Name  string `json:"name"`
			Path  string `json:"path"`
			Size  int64  `json:"size"`
			IsDir bool   `json:"is_dir"`
		}
		var rows []fileRow
		if zone == "outbox" {
			oxyConnMu.RLock()
			for _, it := range oxyConnOutbox {
				rows = append(rows, fileRow{Name: it.Name, Path: it.Path, Size: it.Size})
			}
			oxyConnMu.RUnlock()
		} else if zone == "shelf" {
			for _, it := range getShelfItemsSnapshot() {
				if it.Path != "" {
					rows = append(rows, fileRow{Name: it.Name, Path: it.Path, Size: it.Size})
				}
			}
		} else {
			dir := filepath.Join(home, "Desktop")
			if zone == "downloads" {
				dir = filepath.Join(home, "Downloads")
			} else if zone == "documents" {
				dir = filepath.Join(home, "Documents")
			} else if zone == "inbox" {
				oxyConnMu.RLock()
				dir = oxyConnDir
				oxyConnMu.RUnlock()
			}
			if entries, err := os.ReadDir(dir); err == nil {
				for _, e := range entries {
					if e.IsDir() || strings.HasPrefix(e.Name(), ".") {
						continue
					}
					info, _ := e.Info()
					var sz int64
					if info != nil {
						sz = info.Size()
					}
					rows = append(rows, fileRow{Name: e.Name(), Path: filepath.Join(dir, e.Name()), Size: sz})
					if len(rows) >= 60 {
						break
					}
				}
			}
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "files": rows})
	})

	lanMux.HandleFunc("/api/download", func(w http.ResponseWriter, r *http.Request) {
		if !checkOxygenPIN(r) {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		p := strings.TrimSpace(r.URL.Query().Get("path"))
		home, _ := os.UserHomeDir()
		clean := filepath.Clean(p)
		if home != "" && !strings.HasPrefix(strings.ToLower(clean), strings.ToLower(home)) {
			// Also allow explicit outbox files selected by user from any drive!
			allowed := false
			oxyConnMu.RLock()
			for _, it := range oxyConnOutbox {
				if strings.EqualFold(filepath.Clean(it.Path), clean) {
					allowed = true
					break
				}
			}
			oxyConnMu.RUnlock()
			if !allowed {
				http.Error(w, "Доступ разрешён только к папке пользователя или отправленным файлам", http.StatusForbidden)
				return
			}
		}
		if info, err := os.Stat(clean); err == nil && !info.IsDir() {
			publishOxygenTransferEvent(OxygenTransferEvent{
				Direction: "send",
				FileName:  filepath.Base(clean),
				Path:      clean,
				Size:      info.Size(),
				Device:    "Android",
				Timestamp: time.Now().UnixMilli(),
			})
		}
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filepath.Base(clean)))
		http.ServeFile(w, r, clean)
	})

	lanMux.HandleFunc("/api/clipboard", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if !checkOxygenPIN(r) {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		if r.Method == http.MethodPost {
			var req struct {
				Text string `json:"text"`
			}
			_ = json.NewDecoder(io.LimitReader(r.Body, 1024*1024)).Decode(&req)
			_ = kernel.probe.SetClipboard(req.Text)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true})
			return
		}
		clipTxt, _ := kernel.probe.GetClipboard()
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "text": clipTxt})
	})

	lanMux.HandleFunc("/api/control", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if !checkOxygenPIN(r) {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		var req struct {
			Action string `json:"action"` // move | click | lclick | rclick | scroll | type | volume | media_play | media_next | media_prev | lock | launch
			DX     int    `json:"dx"`
			DY     int    `json:"dy"`
			Value  int    `json:"value"`
			Text   string `json:"text"`
		}
		_ = json.NewDecoder(io.LimitReader(r.Body, 65536)).Decode(&req)
		switch req.Action {
		case "volume":
			_ = kernel.probe.SetAudioVolume(req.Value, false)
		case "launch":
			if req.Text != "" {
				_, _ = kernel.LaunchTarget(req.Text, req.Text, req.Text, "system", "")
			}
		default:
			oxygenRemoteInputOS(req.Action, req.DX, req.DY, req.Text)
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true})
	})

	go func() {
		defer func() { _ = recover() }()
		srv := &http.Server{
			Addr:              fmt.Sprintf("0.0.0.0:%d", OxygenConnectPort),
			Handler:           lanMux,
			ReadHeaderTimeout: 10 * time.Second,
		}
		_ = srv.ListenAndServe()
	}()
}

// ==================== PURE-GO STANDARDS-COMPLIANT QR CODE GENERATOR (VERSION 4-L, ZERO DEPS!) ====================
// Generates a 100% real, scannable ISO/IEC 18004 QR Code SVG (33x33 modules, capacity 78 bytes — fits any LAN URL+PIN!).

func generateQRCodeSVG(text string) string {
	matrix := encodeQRVersion4L([]byte(text))
	n := len(matrix)
	quiet := 4
	total := n + quiet*2
	var b strings.Builder
	b.WriteString(fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" shape-rendering="crispEdges">`, total, total))
	b.WriteString(fmt.Sprintf(`<rect width="%d" height="%d" rx="3" fill="#ffffff"/>`, total, total))
	b.WriteString(`<path fill="#050b18" d="`)
	for y := 0; y < n; y++ {
		for x := 0; x < n; x++ {
			if matrix[y][x] {
				b.WriteString(fmt.Sprintf("M%d,%dh1v1h-1z", x+quiet, y+quiet))
			}
		}
	}
	b.WriteString(`"/></svg>`)
	return b.String()
}

func encodeQRVersion4L(data []byte) [][]bool {
	// Version 4-L: size 33x33, 80 data codewords, 20 EC codewords (1 block of 100 bytes), max 78 payload bytes
	const (
		size     = 33
		dataCode = 80
		ecCode   = 20
	)
	if len(data) > 78 {
		data = data[:78]
	}

	// 1. Build bit stream: Byte Mode (0100) + 8-bit length + payload + terminator + pad bytes
	bits := make([]byte, 0, dataCode*8)
	appendBits := func(val, count int) {
		for i := count - 1; i >= 0; i-- {
			bits = append(bits, byte((val>>uint(i))&1))
		}
	}
	appendBits(0x4, 4)
	appendBits(len(data), 8)
	for _, c := range data {
		appendBits(int(c), 8)
	}
	term := dataCode*8 - len(bits)
	if term > 4 {
		term = 4
	}
	appendBits(0, term)
	for len(bits)%8 != 0 {
		bits = append(bits, 0)
	}
	cw := make([]byte, 0, dataCode+ecCode)
	for i := 0; i < len(bits); i += 8 {
		var v byte
		for j := 0; j < 8; j++ {
			v = (v << 1) | bits[i+j]
		}
		cw = append(cw, v)
	}
	padBytes := []byte{0xEC, 0x11}
	for p := 0; len(cw) < dataCode; p++ {
		cw = append(cw, padBytes[p%2])
	}

	// 2. Reed-Solomon ECC over GF(256) (poly 0x11D), degree 20
	gfMul := func(a, b byte) byte {
		var r byte
		for i := 0; i < 8; i++ {
			if b&1 != 0 {
				r ^= a
			}
			hi := a & 0x80
			a <<= 1
			if hi != 0 {
				a ^= 0x1D
			}
			b >>= 1
		}
		return r
	}
	gen := []byte{1}
	root := byte(1)
	for i := 0; i < ecCode; i++ {
		next := make([]byte, len(gen)+1)
		for j := range gen {
			next[j] ^= gen[j]
			next[j+1] ^= gfMul(gen[j], root)
		}
		gen = next
		root = gfMul(root, 2)
	}
	rem := make([]byte, ecCode)
	for _, d := range cw {
		factor := d ^ rem[0]
		copy(rem, rem[1:])
		rem[ecCode-1] = 0
		for j := 0; j < ecCode; j++ {
			rem[j] ^= gfMul(gen[j+1], factor)
		}
	}
	cw = append(cw, rem...)

	// 3. Place function patterns
	mat := make([][]bool, size)
	isFunc := make([][]bool, size)
	for i := 0; i < size; i++ {
		mat[i] = make([]bool, size)
		isFunc[i] = make([]bool, size)
	}
	setFunc := func(x, y int, dark bool) {
		if x >= 0 && y >= 0 && x < size && y < size {
			mat[y][x] = dark
			isFunc[y][x] = true
		}
	}
	drawFinder := func(cx, cy int) {
		for dy := -4; dy <= 4; dy++ {
			for dx := -4; dx <= 4; dx++ {
				adx, ady := dx, dy
				if adx < 0 {
					adx = -adx
				}
				if ady < 0 {
					ady = -ady
				}
				dist := adx
				if ady > dist {
					dist = ady
				}
				setFunc(cx+dx, cy+dy, dist != 2 && dist != 4)
			}
		}
	}
	drawFinder(3, 3)
	drawFinder(size-4, 3)
	drawFinder(3, size-4)
	// Alignment pattern for Version 4 at (26, 26)
	for dy := -2; dy <= 2; dy++ {
		for dx := -2; dx <= 2; dx++ {
			adx, ady := dx, dy
			if adx < 0 {
				adx = -adx
			}
			if ady < 0 {
				ady = -ady
			}
			dist := adx
			if ady > dist {
				dist = ady
			}
			setFunc(26+dx, 26+dy, dist != 1)
		}
	}
	// Timing patterns
	for i := 0; i < size; i++ {
		if !isFunc[6][i] {
			setFunc(i, 6, i%2 == 0)
		}
		if !isFunc[i][6] {
			setFunc(6, i, i%2 == 0)
		}
	}
	// Reserve format info areas
	for i := 0; i <= 8; i++ {
		if i != 6 {
			setFunc(8, i, false)
			setFunc(i, 8, false)
		}
	}
	for i := size - 8; i < size; i++ {
		setFunc(8, i, false)
		setFunc(i, 8, false)
	}
	setFunc(8, size-8, true) // Dark module

	// 4. Zig-zag data placement + Mask 0 ((x+y)%2 == 0)
	bitIdx := 0
	totalBits := len(cw) * 8
	upward := true
	for right := size - 1; right >= 1; right -= 2 {
		if right == 6 {
			right = 5
		}
		for vert := 0; vert < size; vert++ {
			y := vert
			if upward {
				y = size - 1 - vert
			}
			for j := 0; j < 2; j++ {
				x := right - j
				if !isFunc[y][x] {
					dark := false
					if bitIdx < totalBits {
						dark = ((cw[bitIdx>>3] >> uint(7-(bitIdx&7))) & 1) != 0
						bitIdx++
					}
					if (x+y)%2 == 0 {
						dark = !dark
					}
					mat[y][x] = dark
				}
			}
		}
		upward = !upward
	}

	// 5. Write Format Bits for ECC Level L (01) + Mask 0 (000) -> 0b111011111000100 (0x77C4)
	const fmtBits = 0x77C4
	for i := 0; i < 6; i++ {
		mat[i][8] = ((fmtBits >> uint(i)) & 1) != 0
	}
	mat[7][8] = ((fmtBits >> 6) & 1) != 0
	mat[8][8] = ((fmtBits >> 7) & 1) != 0
	mat[8][7] = ((fmtBits >> 8) & 1) != 0
	for i := 9; i < 15; i++ {
		mat[8][14-i] = ((fmtBits >> uint(i)) & 1) != 0
	}
	for i := 0; i < 8; i++ {
		mat[8][size-1-i] = ((fmtBits >> uint(i)) & 1) != 0
	}
	for i := 8; i < 15; i++ {
		mat[size-15+i][8] = ((fmtBits >> uint(i)) & 1) != 0
	}
	mat[size-8][8] = true
	return mat
}

// Embedded Oxygen Connect 1.7.1 Mobile PWA App — Ultra-Simple 1-Tap UI + HarmonyOS Center Ripple Wave + Faster Trackpad + Circle to Search!
const oxygenConnectMobileHTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<meta name="theme-color" content="#040a16"/>
<link rel="manifest" href="/manifest.json"/>
<title>Oxygen Connect · Luma OS 1.7.4</title>
<style>
  :root{--accent:#06b6d4;--accent2:#38bdf8;--bg:#040a16;--card:rgba(14,25,46,.78);--border:rgba(125,211,252,.22)}
  *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-tap-highlight-color:transparent}
  body{margin:0;min-height:100vh;background:radial-gradient(circle at 50% -10%,#0d2b4e 0%,#040a16 60%,#02060e 100%);color:#f0f9ff;padding:12px 12px 24px;overflow-x:hidden}
  .top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;padding:4px 2px}
  .brand{display:flex;align-items:center;gap:9px;min-width:0}
  .dot{width:10px;height:10px;border-radius:999px;background:#34d399;box-shadow:0 0 12px #34d399;flex-shrink:0}
  .dot.off{background:#f59e0b;box-shadow:0 0 10px #f59e0b}
  .title{font-size:16px;font-weight:900;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sub{font-size:11px;opacity:.68;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pill{padding:5px 10px;border-radius:999px;font-size:11px;font-weight:800;background:rgba(56,189,248,.14);border:1px solid rgba(56,189,248,.32);color:#7dd3fc;flex-shrink:0}
  .card{background:var(--card);border:1px solid var(--border);backdrop-filter:blur(22px);border-radius:22px;padding:12px;margin-bottom:10px;box-shadow:0 14px 36px rgba(0,0,0,.38)}
  .heroGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:10px}
  .tile{border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:15px 12px;color:#fff;font-weight:800;font-size:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;cursor:pointer;transition:transform .14s ease,filter .14s ease;box-shadow:0 10px 24px rgba(0,0,0,.28);position:relative;overflow:hidden}
  .tile:active{transform:scale(.95);filter:brightness(1.12)}
  .tile .ico{font-size:26px;line-height:1}
  .tile .hint{font-size:11px;font-weight:600;opacity:.82}
  .t-photo{background:linear-gradient(135deg,#0891b2,#2563eb)}
  .t-file{background:linear-gradient(135deg,#0284c7,#4f46e5)}
  .t-circle{background:linear-gradient(135deg,#7c3aed,#06b6d4)}
  .t-clip{background:linear-gradient(135deg,#0f766e,#0284c7)}
  .padWrap{position:relative}
  .pad{height:220px;border-radius:20px;background:radial-gradient(circle at 50% 45%,rgba(56,189,248,.16),rgba(2,8,20,.88));border:1.5px solid rgba(56,189,248,.34);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:#7dd3fc;font-weight:800;font-size:13px;touch-action:none;user-select:none}
  .padSub{font-size:11px;opacity:.62;font-weight:600}
  .sensBtn{position:absolute;top:9px;right:9px;z-index:5;border:1px solid rgba(125,211,252,.35);background:rgba(4,12,28,.82);color:#7dd3fc;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:800;cursor:pointer}
  .row{display:flex;align-items:center;gap:8px}
  .btn2{flex:1;border:1px solid var(--border);background:rgba(255,255,255,.07);color:#e0f2fe;border-radius:14px;padding:11px 10px;font-weight:800;font-size:13px;cursor:pointer;text-align:center}
  .btn2:active{transform:scale(.96);background:rgba(56,189,248,.22)}
  .btnPrimary{border:0;background:linear-gradient(135deg,#06b6d4,#2563eb);color:#fff;border-radius:14px;padding:11px 14px;font-weight:800;font-size:13px;cursor:pointer}
  .btnPrimary:active{transform:scale(.96)}
  .volRow{display:flex;align-items:center;gap:8px;margin-top:9px}
  input[type=range]{flex:1;accent-color:#38bdf8;height:6px}
  input[type=text],textarea{width:100%;background:rgba(2,6,20,.75);border:1px solid var(--border);border-radius:14px;padding:11px 12px;color:#fff;font-size:14px;outline:none}
  .hide{display:none!important}
  .toast{position:fixed;top:12px;left:12px;right:12px;background:rgba(14,165,233,.96);color:#02101a;font-weight:900;padding:11px 14px;border-radius:16px;text-align:center;font-size:13px;display:none;z-index:200;box-shadow:0 12px 30px rgba(6,182,212,.4)}
  .sheet{position:fixed;inset:0;z-index:140;background:rgba(2,6,18,.82);backdrop-filter:blur(18px);display:flex;align-items:flex-end;justify-content:center;padding:10px}
  .sheetBox{width:100%;max-width:520px;max-height:86vh;overflow-y:auto;background:#081326;border:1px solid rgba(125,211,252,.28);border-radius:26px;padding:16px;box-shadow:0 -12px 48px rgba(0,0,0,.6)}
  .incomingRow{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-radius:14px;background:rgba(16,185,129,.12);border:1px solid rgba(52,211,153,.35);text-decoration:none;color:#ecfdf5;margin-top:6px;font-size:13px;font-weight:700}

  /* HarmonyOS Full-Screen Center Ripple Wave Animation (Send & Receive!) */
  #hWave{position:fixed;inset:0;z-index:300;pointer-events:none;display:none;align-items:center;justify-content:center;overflow:hidden}
  #hWave.show{display:flex}
  .hw-flash{position:absolute;inset:0;opacity:0;animation:hwFlash 1.5s cubic-bezier(.16,1,.3,1) forwards}
  .hw-ring{position:absolute;left:50%;top:50%;width:18vmax;height:18vmax;border-radius:50%;transform:translate(-50%,-50%) scale(.15);opacity:0;animation:hwRipple 1.45s cubic-bezier(.16,1,.3,1) forwards}
  .hw-ring.r2{animation-delay:.16s}
  .hw-ring.r3{animation-delay:.32s}
  .hw-pill{position:relative;z-index:5;padding:16px 22px;border-radius:24px;background:rgba(7,18,38,.88);border:1.5px solid rgba(125,211,252,.55);backdrop-filter:blur(26px);text-align:center;box-shadow:0 20px 60px rgba(6,182,212,.45);animation:hwPill 2.1s cubic-bezier(.16,1,.3,1) forwards;max-width:86vw}
  @keyframes hwRipple{
    0%{transform:translate(-50%,-50%) scale(.1);opacity:.95;box-shadow:0 0 36px rgba(56,189,248,.9),0 0 80px rgba(129,140,248,.65),inset 0 0 28px rgba(255,255,255,.75)}
    55%{opacity:.7}
    100%{transform:translate(-50%,-50%) scale(9.5);opacity:0;box-shadow:0 0 90px rgba(56,189,248,0),inset 0 0 4px rgba(255,255,255,0)}
  }
  @keyframes hwFlash{
    0%{opacity:0}
    18%{opacity:.45}
    100%{opacity:0}
  }
  @keyframes hwPill{
    0%{transform:scale(.76);opacity:0}
    14%{transform:scale(1.03);opacity:1}
    24%{transform:scale(1);opacity:1}
    82%{transform:scale(1);opacity:1}
    100%{transform:scale(.92);opacity:0}
  }

  /* Full-Screen Circle to Search Modal on Phone */
  #c2sModal{position:fixed;inset:0;z-index:160;background:#030814;display:flex;flex-direction:column}
  .c2sHead{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid rgba(125,211,252,.18);background:rgba(7,16,32,.92)}
  .c2sStage{position:relative;flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#020610;touch-action:none}
  .c2sStage img{max-width:100%;max-height:100%;object-fit:contain;user-select:none;pointer-events:none}
  .c2sStage canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}
  .c2sResult{max-height:46vh;overflow-y:auto;background:rgba(7,16,34,.96);border-top:1.5px solid rgba(56,189,248,.4);padding:14px;border-radius:22px 22px 0 0;font-size:13.5px;line-height:1.5}
  .c2sResult b{color:#7dd3fc}
  .c2sResult ul{margin:6px 0;padding-left:18px}
  .c2sResult li{margin:4px 0}
</style>
</head>
<body>
<div id="toast" class="toast"></div>

<!-- HarmonyOS Full-Screen Center Wave Overlay -->
<div id="hWave">
  <div id="hwFlash" class="hw-flash"></div>
  <div id="hwR1" class="hw-ring"></div>
  <div id="hwR2" class="hw-ring r2"></div>
  <div id="hwR3" class="hw-ring r3"></div>
  <div class="hw-pill">
    <div id="hwIco" style="font-size:28px;margin-bottom:4px">🌊</div>
    <div id="hwTitle" style="font-size:15px;font-weight:900">Отправлено на ПК</div>
    <div id="hwSub" style="font-size:12px;opacity:.75;margin-top:2px;word-break:break-word"></div>
  </div>
</div>

<!-- Compact Header -->
<div class="top">
  <div class="brand">
    <span id="connDot" class="dot off"></span>
    <div style="min-width:0">
      <div id="pcName" class="title">Oxygen Connect</div>
      <div id="pcSub" class="sub">Подключение к Luma OS...</div>
    </div>
  </div>
  <button class="pill" onclick="openPcFilesSheet()">💻 Файлы ПК</button>
</div>

<!-- Auto-hidden PIN box (only shown if PIN missing or changed) -->
<div id="pinBox" class="card hide">
  <div style="font-weight:800;font-size:14px;margin-bottom:8px">Введите 6-значный PIN с экрана ПК</div>
  <div class="row">
    <input id="pinInput" type="text" inputmode="numeric" placeholder="6 цифр"/>
    <button class="btnPrimary" onclick="savePin()">Войти</button>
  </div>
</div>

<!-- 4 BIG 1-TAP ACTION TILES (ZERO CONFUSION!) -->
<div class="heroGrid">
  <label class="tile t-photo">
    <span class="ico">📸</span>
    <span>Фото на ПК</span>
    <span class="hint">Сразу с камеры</span>
    <input type="file" accept="image/*" capture="environment" class="hide" onchange="uploadFiles(this.files);this.value=''"/>
  </label>
  <label class="tile t-file">
    <span class="ico">📁</span>
    <span>Файл на ПК</span>
    <span class="hint">Фото, видео, док</span>
    <input type="file" multiple class="hide" onchange="uploadFiles(this.files);this.value=''"/>
  </label>
  <button class="tile t-circle" onclick="openCircleModal()">
    <span class="ico">🔍</span>
    <span>Circle to Search</span>
    <span class="hint">Обвести пальцем</span>
  </button>
  <button class="tile t-clip" onclick="openClipSheet()">
    <span class="ico">📋</span>
    <span>Общий буфер</span>
    <span class="hint">Текст ПК ↔ Тел</span>
  </button>
</div>

<!-- Auto-appearing Incoming Files from PC -->
<div id="outboxCard" class="card hide">
  <div style="font-size:13px;font-weight:900;color:#6ee7b7">📥 Пришло с компьютера (1 тап — скачать)</div>
  <div id="outboxList"></div>
</div>

<!-- DIRECT ON-SCREEN FAST TRACKPAD + SIMPLE CONTROLS -->
<div class="card">
  <div class="padWrap">
    <button id="sensBtn" class="sensBtn" onclick="cycleSens()">⚡ Сенса: 1.4×</button>
    <div id="trackpad" class="pad">
      <div>🖱 Мышь ПК</div>
      <div class="padSub">1 палец — курсор · Тап — ЛКМ · 2 пальца — ПКМ / скролл</div>
    </div>
  </div>
  <div class="row" style="margin-top:9px">
    <button class="btn2" onclick="ctrl({action:'lclick'})">ЛКМ</button>
    <button class="btn2" onclick="ctrl({action:'rclick'})">ПКМ</button>
    <button class="btn2" onclick="openTypeSheet()">⌨️ Текст</button>
  </div>
  <div class="row" style="margin-top:8px">
    <button class="btn2" onclick="ctrl({action:'media_prev'})">⏮</button>
    <button class="btn2" style="background:rgba(6,182,212,.22);border-color:rgba(56,189,248,.45)" onclick="ctrl({action:'media_play'})">⏯ Пауза</button>
    <button class="btn2" onclick="ctrl({action:'media_next'})">⏭</button>
  </div>
  <div class="volRow">
    <span style="font-size:14px">🔊</span>
    <input id="volRange" type="range" min="0" max="100" value="50" onchange="ctrl({action:'volume',value:+this.value})" oninput="document.getElementById('volLbl').textContent=this.value+'%'"/>
    <b id="volLbl" style="font-size:12px;width:36px;text-align:right">50%</b>
  </div>
</div>

<!-- Compact Sheet: Clipboard -->
<div id="clipSheet" class="sheet hide" onclick="if(event.target===this)this.classList.add('hide')">
  <div class="sheetBox">
    <div class="row" style="justify-content:space-between;margin-bottom:10px">
      <b style="font-size:15px">📋 Общий буфер (Телефон ↔ ПК)</b>
      <button class="pill" onclick="document.getElementById('clipSheet').classList.add('hide')">Закрыть</button>
    </div>
    <textarea id="clipText" rows="4" placeholder="Вставьте текст или ссылку..."></textarea>
    <div class="row" style="margin-top:10px">
      <button class="btnPrimary" style="flex:1" onclick="sendClip()">⬆ На ПК</button>
      <button class="btn2" onclick="pullClip()">⬇ Взять с ПК</button>
    </div>
  </div>
</div>

<!-- Compact Sheet: Keyboard Typing -->
<div id="typeSheet" class="sheet hide" onclick="if(event.target===this)this.classList.add('hide')">
  <div class="sheetBox">
    <div class="row" style="justify-content:space-between;margin-bottom:10px">
      <b style="font-size:15px">⌨️ Набрать текст на ПК</b>
      <button class="pill" onclick="document.getElementById('typeSheet').classList.add('hide')">Закрыть</button>
    </div>
    <div class="row">
      <input id="remoteType" type="text" placeholder="Текст сразу вставится в активное окно ПК..."/>
      <button class="btnPrimary" onclick="sendType()">Ввод</button>
    </div>
  </div>
</div>

<!-- Compact Sheet: PC Files Browser -->
<div id="filesSheet" class="sheet hide" onclick="if(event.target===this)this.classList.add('hide')">
  <div class="sheetBox">
    <div class="row" style="justify-content:space-between;margin-bottom:10px">
      <b style="font-size:15px">💻 Файлы на ПК → скачать</b>
      <button class="pill" onclick="document.getElementById('filesSheet').classList.add('hide')">Закрыть</button>
    </div>
    <div class="row" style="margin-bottom:10px">
      <button class="btn2" onclick="loadPcFiles('outbox')">Отправлено</button>
      <button class="btn2" onclick="loadPcFiles('shelf')">Полка</button>
      <button class="btn2" onclick="loadPcFiles('desktop')">Стол</button>
      <button class="btn2" onclick="loadPcFiles('downloads')">Загрузки</button>
    </div>
    <div id="pcFilesList" style="display:flex;flex-direction:column;gap:7px"></div>
  </div>
</div>

<!-- Full-Screen Mobile Circle to Search Modal -->
<div id="c2sModal" class="hide">
  <div class="c2sHead">
    <div style="font-weight:900;font-size:14px">🔍 Circle to Search</div>
    <div class="row">
      <label class="pill" style="cursor:pointer">📷 Фото<input type="file" accept="image/*" class="hide" onchange="loadCircleLocalImage(this.files[0]);this.value=''"/></label>
      <button class="pill" onclick="capturePcForCircle()">🖥 Экран ПК</button>
      <button class="pill" style="color:#fda4af;border-color:rgba(251,113,133,.4)" onclick="closeCircleModal()">✕</button>
    </div>
  </div>
  <div id="c2sStage" class="c2sStage">
    <div id="c2sHint" style="text-align:center;padding:24px;max-width:300px">
      <div style="font-size:38px;margin-bottom:8px">✨</div>
      <div style="font-weight:900;font-size:16px;margin-bottom:6px">Обведите пальцем любой объект</div>
      <div style="font-size:12px;opacity:.7;margin-bottom:14px">Выберите фото с телефона или мгновенный снимок экрана ПК, затем обведите нужную область пальцем</div>
      <div class="row">
        <label class="btnPrimary" style="flex:1;text-align:center;cursor:pointer">📷 Камера / Фото<input type="file" accept="image/*" class="hide" onchange="loadCircleLocalImage(this.files[0]);this.value=''"/></label>
        <button class="btn2" onclick="capturePcForCircle()">🖥 Экран ПК</button>
      </div>
    </div>
    <img id="c2sImg" class="hide" alt=""/>
    <canvas id="c2sCanvas" class="hide"></canvas>
  </div>
  <div id="c2sResult" class="c2sResult hide">
    <div class="row" style="justify-content:space-between;margin-bottom:6px">
      <span id="c2sBadge" class="pill">Анализ...</span>
      <button class="pill" onclick="document.getElementById('c2sResult').classList.add('hide')">Скрыть</button>
    </div>
    <div id="c2sBody"></div>
  </div>
</div>

<script>
const qs = new URLSearchParams(location.search);
let PIN = qs.get('pin') || localStorage.getItem('oxy_pin') || '';
if (qs.get('pin')) localStorage.setItem('oxy_pin', PIN);
let knownOutboxIds = new Set();
let outboxBooted = false;

// Sensitivity presets (faster & smoother by default in 1.7.1!)
const SENS_LEVELS = [{label:'1.0×',val:2.4},{label:'1.4×',val:3.35},{label:'2.0×',val:4.6}];
let sensIdx = Number(localStorage.getItem('oxy_sens_idx') || 1);
if (isNaN(sensIdx) || sensIdx < 0 || sensIdx >= SENS_LEVELS.length) sensIdx = 1;
function updateSensBtn(){ document.getElementById('sensBtn').textContent = '⚡ Сенса: ' + SENS_LEVELS[sensIdx].label; }
function cycleSens(){ sensIdx = (sensIdx + 1) % SENS_LEVELS.length; localStorage.setItem('oxy_sens_idx', String(sensIdx)); updateSensBtn(); toast('Скорость курсора: ' + SENS_LEVELS[sensIdx].label); }
updateSensBtn();

function toast(m){ const t=document.getElementById('toast'); t.textContent=m; t.style.display='block'; clearTimeout(window._tt); window._tt=setTimeout(()=>t.style.display='none',2200); }
function savePin(){ PIN=document.getElementById('pinInput').value.trim(); localStorage.setItem('oxy_pin',PIN); ping(); }

// HarmonyOS Full-Screen Center Ripple Wave on Phone!
function triggerHarmonyWave(dir, title, sub){
  const el = document.getElementById('hWave');
  const flash = document.getElementById('hwFlash');
  const r1 = document.getElementById('hwR1'), r2 = document.getElementById('hwR2'), r3 = document.getElementById('hwR3');
  const isSend = dir === 'send';
  document.getElementById('hwIco').textContent = isSend ? '📤' : '📥';
  document.getElementById('hwTitle').textContent = title || (isSend ? 'Отправлено на ПК' : 'Получено с ПК');
  document.getElementById('hwSub').textContent = sub || '';
  const borderCol = isSend ? 'rgba(56,189,248,.92)' : 'rgba(52,211,153,.92)';
  const flashBg = isSend
    ? 'radial-gradient(circle at 50% 50%, rgba(56,189,248,.48) 0%, rgba(99,102,241,.22) 45%, transparent 75%)'
    : 'radial-gradient(circle at 50% 50%, rgba(16,185,129,.48) 0%, rgba(6,182,212,.22) 45%, transparent 75%)';
  flash.style.background = flashBg;
  [r1,r2,r3].forEach((r,i)=>{
    r.style.border = (4 - i) + 'px solid ' + borderCol;
    r.style.animation = 'none'; void r.offsetWidth; r.style.animation = '';
  });
  flash.style.animation = 'none'; void flash.offsetWidth; flash.style.animation = '';
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  if (navigator.vibrate) { try { navigator.vibrate([18, 35, 24]); } catch {} }
  clearTimeout(window._hwt);
  window._hwt = setTimeout(()=>el.classList.remove('show'), 2200);
}

async function api(path,opt={}){
  opt.headers = Object.assign({'X-Oxygen-PIN':PIN}, opt.headers||{});
  const r = await fetch(path,opt);
  if(r.status===401){ document.getElementById('pinBox').classList.remove('hide'); throw new Error('PIN'); }
  document.getElementById('pinBox').classList.add('hide');
  return r.json();
}

async function ping(){
  try{
    const d = await api('/api/ping?device=Android');
    document.getElementById('connDot').classList.remove('off');
    document.getElementById('pcName').textContent = d.pc_name || 'Luma OS';
    document.getElementById('pcSub').textContent = 'Подключено · CPU ' + Math.round(d.cpu||0) + '% · RAM ' + Math.round(d.ram||0) + '%';
    if (typeof d.volume === 'number'){
      document.getElementById('volRange').value = d.volume;
      document.getElementById('volLbl').textContent = d.volume + '%';
    }
    const outbox = Array.isArray(d.outbox) ? d.outbox : [];
    const boxCard = document.getElementById('outboxCard');
    const listEl = document.getElementById('outboxList');
    if (outbox.length > 0){
      boxCard.classList.remove('hide');
      listEl.innerHTML = '';
      for (const f of outbox.slice(0, 4)){
        if (outboxBooted && !knownOutboxIds.has(f.id)){
          triggerHarmonyWave('receive', 'Файл с компьютера!', f.name);
        }
        knownOutboxIds.add(f.id);
        const a = document.createElement('a');
        a.className = 'incomingRow';
        a.href = '/api/download?pin=' + encodeURIComponent(PIN) + '&path=' + encodeURIComponent(f.path);
        a.onclick = () => triggerHarmonyWave('receive', 'Скачивание с ПК', f.name);
        a.innerHTML = '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + f.name + '</span><span style="flex-shrink:0;color:#6ee7b7">⬇ ' + Math.max(1,Math.round((f.size||0)/1024)) + ' КБ</span>';
        listEl.appendChild(a);
      }
    } else {
      boxCard.classList.add('hide');
    }
    outboxBooted = true;
  }catch{
    document.getElementById('connDot').classList.add('off');
    document.getElementById('pcSub').textContent = 'Введите 6-значный PIN с экрана ПК';
  }
}

async function uploadFiles(files){
  if(!files || !files.length) return;
  const fd = new FormData();
  fd.append('device', 'Android');
  for (const f of files) fd.append('files', f);
  const firstName = files.length === 1 ? files[0].name : (files.length + ' файлов');
  triggerHarmonyWave('send', 'Отправка на ПК...', firstName);
  try{
    const d = await api('/api/upload', {method:'POST', body:fd});
    triggerHarmonyWave('send', 'Доставлено на ПК!', firstName);
    toast('Отправлено на ПК: ' + (d.count || files.length));
  }catch{ toast('Ошибка отправки'); }
}

function openClipSheet(){ document.getElementById('clipSheet').classList.remove('hide'); pullClip(true); }
function openTypeSheet(){ document.getElementById('typeSheet').classList.remove('hide'); setTimeout(()=>document.getElementById('remoteType').focus(),80); }
function openPcFilesSheet(){ document.getElementById('filesSheet').classList.remove('hide'); loadPcFiles('outbox'); }

async function sendClip(){
  const text = document.getElementById('clipText').value;
  if(!text) return;
  await api('/api/clipboard', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({text})});
  document.getElementById('clipSheet').classList.add('hide');
  toast('Текст скопирован на ПК!');
}
async function pullClip(silent){
  try{
    const d = await api('/api/clipboard');
    document.getElementById('clipText').value = d.text || '';
    if(!silent){
      if(navigator.clipboard && d.text) navigator.clipboard.writeText(d.text).catch(()=>{});
      toast('Буфер ПК получен!');
    }
  }catch{}
}
async function loadPcFiles(zone){
  try{
    const d = await api('/api/pc-files?zone=' + encodeURIComponent(zone));
    const box = document.getElementById('pcFilesList');
    box.innerHTML = '';
    if(!d.files || !d.files.length){ box.innerHTML = '<div style="opacity:.6;font-size:12px;text-align:center;padding:18px">Файлов нет</div>'; return; }
    for (const f of d.files){
      const a = document.createElement('a');
      a.href = '/api/download?pin=' + encodeURIComponent(PIN) + '&path=' + encodeURIComponent(f.path);
      a.className = 'btn2 row';
      a.style.textDecoration = 'none';
      a.style.justifyContent = 'space-between';
      a.onclick = () => triggerHarmonyWave('receive', 'Приём файла с ПК', f.name);
      a.innerHTML = '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + f.name + '</span><span style="opacity:.7;flex-shrink:0">' + Math.max(1,Math.round((f.size||0)/1024)) + ' КБ ⬇</span>';
      box.appendChild(a);
    }
  }catch{}
}
async function ctrl(body){ try { await api('/api/control', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)}); } catch {} }
async function sendType(){
  const el = document.getElementById('remoteType');
  if(!el.value) return;
  await ctrl({action:'type', text:el.value});
  el.value = '';
  document.getElementById('typeSheet').classList.add('hide');
  toast('Вставлено на ПК');
}

// FAST, SILKY TRACKPAD WITH POINTER ACCELERATION + 2-FINGER SCROLL & RMB!
const pad = document.getElementById('trackpad');
let lx=0, ly=0, moved=false, lastSend=0, accDX=0, accDY=0, maxFingers=0, scrollAcc=0;
pad.addEventListener('touchstart', e => {
  maxFingers = Math.max(maxFingers, e.touches.length);
  const t = e.touches[0];
  lx = t.clientX; ly = t.clientY;
  if (e.touches.length === 1) { moved = false; accDX = 0; accDY = 0; scrollAcc = 0; }
}, {passive:true});

pad.addEventListener('touchmove', e => {
  e.preventDefault();
  const t = e.touches[0];
  const rawX = t.clientX - lx;
  const rawY = t.clientY - ly;
  lx = t.clientX; ly = t.clientY;

  if (e.touches.length >= 2){
    moved = true;
    scrollAcc += rawY;
    if (Math.abs(scrollAcc) >= 16){
      const steps = scrollAcc > 0 ? 2 : -2;
      scrollAcc = 0;
      ctrl({action:'scroll', dy:steps});
    }
    return;
  }

  const baseSens = SENS_LEVELS[sensIdx].val;
  const speed = Math.hypot(rawX, rawY);
  const accel = 1 + Math.min(1.15, speed * 0.055);
  accDX += rawX * baseSens * accel;
  accDY += rawY * baseSens * accel;

  if (Math.abs(accDX) >= 1 || Math.abs(accDY) >= 1){
    moved = true;
    const now = Date.now();
    if (now - lastSend >= 14){
      lastSend = now;
      const sendX = Math.round(accDX);
      const sendY = Math.round(accDY);
      accDX -= sendX;
      accDY -= sendY;
      if (sendX !== 0 || sendY !== 0) ctrl({action:'move', dx:sendX, dy:sendY});
    }
  }
}, {passive:false});

pad.addEventListener('touchend', e => {
  if (e.touches.length === 0){
    if (!moved){
      if (maxFingers >= 2) ctrl({action:'rclick'});
      else ctrl({action:'lclick'});
    }
    maxFingers = 0;
  }
});

// ==================== MOBILE CIRCLE TO SEARCH (FINGER LASSO + LIVE PC SCREEN + MULTIMODAL VISION!) ====================
let c2sPts = [], c2sDrawing = false;
function openCircleModal(){
  document.getElementById('c2sModal').classList.remove('hide');
  const img = document.getElementById('c2sImg');
  if (!img.src || img.classList.contains('hide')) {
    capturePcForCircle();
  } else {
    syncCircleCanvasSize();
  }
}
function closeCircleModal(){ document.getElementById('c2sModal').classList.add('hide'); }

function syncCircleCanvasSize(){
  const cvs = document.getElementById('c2sCanvas');
  const stage = document.getElementById('c2sStage');
  if (!cvs || !stage) return;
  const rect = stage.getBoundingClientRect();
  if (rect.width > 1 && rect.height > 1) {
    cvs.width = Math.round(rect.width);
    cvs.height = Math.round(rect.height);
  }
}
window.addEventListener('resize', syncCircleCanvasSize);

function showCircleImage(dataUrl){
  const img = document.getElementById('c2sImg');
  const cvs = document.getElementById('c2sCanvas');
  const hint = document.getElementById('c2sHint');
  if (!dataUrl || typeof dataUrl !== 'string') {
    hint.classList.remove('hide');
    toast('Пустое изображение экрана');
    return;
  }
  img.onload = () => {
    hint.classList.add('hide');
    img.classList.remove('hide');
    cvs.classList.remove('hide');
    requestAnimationFrame(() => {
      syncCircleCanvasSize();
      const ctx = cvs.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, cvs.width, cvs.height);
    });
  };
  img.onerror = () => {
    img.classList.add('hide');
    cvs.classList.add('hide');
    hint.classList.remove('hide');
    toast('Не удалось отобразить снимок — нажмите «🖥 Экран ПК» ещё раз');
  };
  img.src = dataUrl;
}

function loadCircleLocalImage(file){
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => showCircleImage(reader.result);
  reader.readAsDataURL(file);
}

async function capturePcForCircle(){
  const hint = document.getElementById('c2sHint');
  const img = document.getElementById('c2sImg');
  toast('📸 Захват экрана ПК...');
  try{
    const d = await api('/api/screen-now?t=' + Date.now());
    if (d.ok && d.image_base64) {
      showCircleImage(d.image_base64);
      toast('Экран ПК готов — обведите объект пальцем!');
    } else {
      if (img.classList.contains('hide')) hint.classList.remove('hide');
      toast(d.error || 'Не удалось захватить экран ПК');
    }
  }catch{
    if (img.classList.contains('hide')) hint.classList.remove('hide');
    toast('Ошибка связи с ПК при захвате экрана');
  }
}

function renderSimpleMarkdown(md){
  const esc = String(md||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\x60([^\x60]+)\x60/g, '<code style="background:rgba(56,189,248,.16);padding:1px 5px;border-radius:6px;font-size:12px">$1</code>')
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/\n/g, '<br/>');
}

const c2sCanvas = document.getElementById('c2sCanvas');
function getCanvasXY(e){
  const r = c2sCanvas.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return { x: t.clientX - r.left, y: t.clientY - r.top };
}
function drawCircleStroke(){
  const ctx = c2sCanvas.getContext('2d');
  ctx.clearRect(0, 0, c2sCanvas.width, c2sCanvas.height);
  if (c2sPts.length < 2) return;
  const g = ctx.createLinearGradient(0, 0, c2sCanvas.width, c2sCanvas.height);
  g.addColorStop(0, '#38bdf8'); g.addColorStop(.5, '#a855f7'); g.addColorStop(1, '#22d3ee');
  ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = g; ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(c2sPts[0].x, c2sPts[0].y);
  for (let i=1; i<c2sPts.length; i++) ctx.lineTo(c2sPts[i].x, c2sPts[i].y);
  ctx.stroke();
}

let c2sLastCrop = '';
let c2sLastReply = '';

async function runCircleAnalysis(customQ){
  let cropB64 = c2sLastCrop;
  if (!customQ) {
    if (c2sPts.length < 3) return;
    let minX=1e9, minY=1e9, maxX=-1, maxY=-1;
    for (const p of c2sPts){ if(p.x<minX)minX=p.x; if(p.y<minY)minY=p.y; if(p.x>maxX)maxX=p.x; if(p.y>maxY)maxY=p.y; }
    if (maxX - minX < 18 || maxY - minY < 18) return;

    const img = document.getElementById('c2sImg');
    if (!img || !img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
      toast('Сначала загрузите экран ПК или фото');
      return;
    }
    const ir = img.getBoundingClientRect();
    const cr = c2sCanvas.getBoundingClientRect();
    const ox = ir.left - cr.left, oy = ir.top - cr.top;
    const x1 = Math.max(0, Math.min(ir.width, minX - ox));
    const y1 = Math.max(0, Math.min(ir.height, minY - oy));
    const x2 = Math.max(0, Math.min(ir.width, maxX - ox));
    const y2 = Math.max(0, Math.min(ir.height, maxY - oy));
    const scaleX = img.naturalWidth / Math.max(1, ir.width);
    const scaleY = img.naturalHeight / Math.max(1, ir.height);
    const sx = Math.max(0, Math.round(x1 * scaleX));
    const sy = Math.max(0, Math.round(y1 * scaleY));
    const sw = Math.max(16, Math.min(img.naturalWidth - sx, Math.round((x2 - x1) * scaleX)));
    const sh = Math.max(16, Math.min(img.naturalHeight - sy, Math.round((y2 - y1) * scaleY)));

    const off = document.createElement('canvas');
    off.width = Math.min(1024, Math.max(16, sw));
    off.height = Math.min(1024, Math.max(16, sh));
    off.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, off.width, off.height);
    cropB64 = off.toDataURL('image/jpeg', 0.88);
    c2sLastCrop = cropB64;
  }

  const resBox = document.getElementById('c2sResult');
  const bodyEl = document.getElementById('c2sBody');
  const badgeEl = document.getElementById('c2sBadge');
  resBox.classList.remove('hide');
  badgeEl.textContent = '✨ Circle to Search...';
  bodyEl.innerHTML = '<div style="opacity:.7">Анализирую выделенную область...</div>';

  try{
    const d = await api('/api/circle-search', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({image_base64:cropB64, query:(customQ||'').trim(), source_device:'phone', stream:false})
    });
    c2sLastReply = d.reply || '';
    badgeEl.textContent = (d.model || 'Circle to Search') + (d.elapsed_ms ? ' · ' + d.elapsed_ms + 'мс' : '');
    bodyEl.innerHTML = renderSimpleMarkdown(d.reply || 'Не удалось распознать фрагмент')
      + '<div class="row" style="margin-top:10px;gap:6px">'
      + '<button class="pill" style="flex:1" onclick="copyC2sReply()">📋 Копировать</button>'
      + '<button class="pill" style="flex:1;border-color:rgba(56,189,248,.5);color:#7dd3fc" onclick="sendC2sToPc()">💻 В буфер ПК</button>'
      + '<button class="pill" onclick="capturePcForCircle()">🔄 Экран</button>'
      + '</div>'
      + '<div class="row" style="margin-top:8px">'
      + '<input id="c2sFollow" type="text" style="padding:8px 10px;font-size:12px" placeholder="Уточнить вопрос (перевести, цена, фикс)..."/>'
      + '<button class="btn2" style="flex:0 0 auto;padding:8px 14px;font-size:12px" onclick="askC2sFollow()">→</button>'
      + '</div>';
  }catch{
    badgeEl.textContent = 'Ошибка';
    bodyEl.textContent = 'Не удалось связаться с Luma OS Circle to Search.';
  }
}
function copyC2sReply(){
  if (!c2sLastReply) return;
  if (navigator.clipboard) navigator.clipboard.writeText(c2sLastReply).catch(()=>{});
  toast('Ответ скопирован!');
}
async function sendC2sToPc(){
  if (!c2sLastReply) return;
  try {
    await api('/api/clipboard', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:c2sLastReply})});
    triggerHarmonyWave('send', 'Ответ Circle to Search на ПК!', c2sLastReply.slice(0, 60));
    toast('Отправлено в буфер ПК!');
  } catch { toast('Ошибка отправки'); }
}
function askC2sFollow(){
  const inp = document.getElementById('c2sFollow');
  if (!inp || !inp.value.trim()) return;
  runCircleAnalysis(inp.value.trim());
}

c2sCanvas.addEventListener('touchstart', e => { e.preventDefault(); c2sDrawing=true; c2sPts=[getCanvasXY(e)]; }, {passive:false});
c2sCanvas.addEventListener('touchmove', e => { if(!c2sDrawing)return; e.preventDefault(); c2sPts.push(getCanvasXY(e)); drawCircleStroke(); }, {passive:false});
c2sCanvas.addEventListener('touchend', () => { if(!c2sDrawing)return; c2sDrawing=false; runCircleAnalysis(); });
c2sCanvas.addEventListener('mousedown', e => { c2sDrawing=true; c2sPts=[getCanvasXY(e)]; });
c2sCanvas.addEventListener('mousemove', e => { if(!c2sDrawing)return; c2sPts.push(getCanvasXY(e)); drawCircleStroke(); });
c2sCanvas.addEventListener('mouseup', () => { if(!c2sDrawing)return; c2sDrawing=false; runCircleAnalysis(); });

ping();
setInterval(ping, 3500);
</script>
</body>
</html>`
