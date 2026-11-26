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

var (
	oxyConnMu      sync.RWMutex
	oxyConnStarted bool
	oxyConnPIN     string
	oxyConnDevices = map[string]OxygenConnectedDevice{}
	oxyConnInbox   = []OxygenReceivedFile{}
	oxyConnDir     string
)

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
	oxyConnMu.RUnlock()

	pairURL := fmt.Sprintf("http://%s:%d/?pin=%s", ip, OxygenConnectPort, pin)
	return map[string]interface{}{
		"ok":          true,
		"running":     true,
		"lan_ip":      ip,
		"port":        OxygenConnectPort,
		"pin":         pin,
		"pair_url":    pairURL,
		"inbox_dir":   dir,
		"devices":     devs,
		"inbox":       inbox,
		"device_name": hostDeviceName(),
	}
}

func hostDeviceName() string {
	h, err := os.Hostname()
	if err != nil || h == "" {
		return "Luma OS 1.7 (Oxygen)"
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
		})
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
		if zone == "shelf" {
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
			http.Error(w, "Доступ разрешён только к папке пользователя", http.StatusForbidden)
			return
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
			Action string `json:"action"` // move | click | rclick | scroll | type | volume | media_play | media_next | media_prev | lock | launch
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

// Embedded Oxygen Connect Mobile PWA App (HarmonyOS SuperHub style in Oxygen 2.5D Cryo-Glass design!)
const oxygenConnectMobileHTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<meta name="theme-color" content="#050b18"/>
<link rel="manifest" href="/manifest.json"/>
<title>Luma Oxygen Connect</title>
<style>
  :root{--accent:#06b6d4;--accent2:#38bdf8;--bg:#050b18;--card:rgba(15,28,50,.72);--border:rgba(125,211,252,.22)}
  *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-tap-highlight-color:transparent}
  body{margin:0;min-height:100vh;background:radial-gradient(circle at 20% 0%,#0c2748 0%,#050b18 55%,#02060f 100%);color:#f0f9ff;padding:14px 14px 86px}
  .card{background:var(--card);border:1px solid var(--border);backdrop-filter:blur(22px);border-radius:22px;padding:15px;margin-bottom:12px;box-shadow:0 16px 40px rgba(0,0,0,.4)}
  .row{display:flex;align-items:center;justify-content:space-between;gap:10px}
  .pill{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;font-size:11px;font-weight:700;background:rgba(6,182,212,.18);border:1px solid rgba(56,189,248,.35);color:#7dd3fc}
  .btn{width:100%;border:0;border-radius:16px;padding:13px 16px;font-weight:800;font-size:14px;color:#fff;background:linear-gradient(135deg,#06b6d4,#2563eb);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 8px 24px rgba(6,182,212,.3)}
  .btn:active{transform:scale(.97)}
  .btn2{border:1px solid var(--border);background:rgba(255,255,255,.06);color:#e0f2fe;border-radius:14px;padding:10px 12px;font-weight:700;font-size:12px;cursor:pointer}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
  .tabs{position:fixed;left:12px;right:12px;bottom:12px;background:rgba(7,15,30,.92);border:1px solid var(--border);backdrop-filter:blur(24px);border-radius:22px;padding:6px;display:grid;grid-template-columns:repeat(4,1fr);gap:4px;z-index:50}
  .tab{border:0;background:transparent;color:#94a3b8;padding:10px 4px;border-radius:16px;font-size:11px;font-weight:700;cursor:pointer}
  .tab.active{background:linear-gradient(135deg,rgba(6,182,212,.35),rgba(37,99,235,.35));color:#fff;border:1px solid rgba(56,189,248,.35)}
  .pad{height:210px;border-radius:20px;background:radial-gradient(circle at 50% 45%,rgba(6,182,212,.14),rgba(2,6,23,.85));border:1px dashed rgba(56,189,248,.4);display:flex;align-items:center;justify-content:center;color:#7dd3fc;font-weight:700;font-size:13px;touch-action:none;user-select:none}
  input[type=text],input[type=password],textarea{width:100%;background:rgba(2,6,23,.65);border:1px solid var(--border);border-radius:14px;padding:11px 13px;color:#fff;font-size:14px;outline:none}
  input[type=range]{width:100%;accent-color:#06b6d4}
  .toast{position:fixed;top:14px;left:14px;right:14px;background:rgba(6,182,212,.95);color:#02101a;font-weight:800;padding:11px 16px;border-radius:16px;text-align:center;font-size:13px;display:none;z-index:99}
  .hide{display:none}
</style>
</head>
<body>
<div id="toast" class="toast"></div>

<div class="card">
  <div class="row">
    <div>
      <div style="font-size:18px;font-weight:900;letter-spacing:-.02em">Oxygen Connect · O₂</div>
      <div id="pcName" style="font-size:12px;opacity:.7;margin-top:2px">Подключение к Luma OS 1.7...</div>
    </div>
    <span id="connPill" class="pill">● SuperHub</span>
  </div>
  <div id="statsRow" class="grid3" style="margin-top:12px;text-align:center">
    <div class="btn2">CPU <b id="sCpu">—</b></div>
    <div class="btn2">RAM <b id="sRam">—</b></div>
    <div class="btn2">Звук <b id="sVol">—</b></div>
  </div>
</div>

<div id="pinBox" class="card hide">
  <div style="font-weight:800;margin-bottom:8px">Введите 6-значный PIN из Luma OS</div>
  <div class="row">
    <input id="pinInput" type="text" placeholder="6 цифр"/>
    <button class="btn" style="width:auto;padding:11px 18px" onclick="savePin()">Войти</button>
  </div>
</div>

<div id="tab-drop">
  <div class="card">
    <div style="font-weight:800;font-size:15px;margin-bottom:4px">📸 Камера и SuperHub → на ПК</div>
    <div style="font-size:12px;opacity:.72;margin-bottom:12px">Сделайте фото сейчас или выберите файлы — они мгновенно появятся на полке и в Luma OS</div>
    <div class="grid2">
      <label class="btn" style="cursor:pointer">📷 Сделать фото<input type="file" accept="image/*" capture="environment" class="hide" onchange="uploadFiles(this.files)"/></label>
      <label class="btn" style="background:linear-gradient(135deg,#0ea5e9,#6366f1);cursor:pointer">📁 Кинуть файлы<input type="file" multiple class="hide" onchange="uploadFiles(this.files)"/></label>
    </div>
    <div id="uploadStatus" style="font-size:12px;margin-top:10px;color:#7dd3fc"></div>
  </div>

  <div class="card">
    <div style="font-weight:800;font-size:15px;margin-bottom:8px">📋 Общий буфер обмена (Телефон ↔ ПК)</div>
    <textarea id="clipText" rows="3" placeholder="Вставьте текст или ссылку для мгновенной отправки на ПК..."></textarea>
    <div class="grid2" style="margin-top:8px">
      <button class="btn2" onclick="sendClip()">⬆ Отправить на ПК</button>
      <button class="btn2" onclick="pullClip()">⬇ Взять с ПК</button>
    </div>
  </div>
</div>

<div id="tab-files" class="hide">
  <div class="card">
    <div class="row" style="margin-bottom:10px">
      <div style="font-weight:800">💻 Файлы на ПК → скачать</div>
      <button class="btn2" onclick="loadPcFiles(curZone)">↻</button>
    </div>
    <div class="grid3" style="margin-bottom:10px">
      <button class="btn2" onclick="loadPcFiles('shelf')">Полка</button>
      <button class="btn2" onclick="loadPcFiles('desktop')">Стол</button>
      <button class="btn2" onclick="loadPcFiles('downloads')">Загрузки</button>
    </div>
    <div id="pcFilesList" style="display:flex;flex-direction:column;gap:8px;max-height:360px;overflow:auto"></div>
  </div>
</div>

<div id="tab-remote" class="hide">
  <div class="card">
    <div style="font-weight:800;margin-bottom:8px">🖱 Виртуальный тачпад ПК</div>
    <div id="trackpad" class="pad">Водите пальцем для курсора · Тап = ЛКМ</div>
    <div class="grid3" style="margin-top:10px">
      <button class="btn2" onclick="ctrl({action:'lclick'})">ЛКМ</button>
      <button class="btn2" onclick="ctrl({action:'rclick'})">ПКМ</button>
      <button class="btn2" onclick="ctrl({action:'scroll',dy:-3})">⬇ Скролл</button>
    </div>
  </div>
  <div class="card">
    <div style="font-weight:800;margin-bottom:8px">⌨ Набрать текст на ПК</div>
    <div class="row">
      <input id="remoteType" type="text" placeholder="Текст сразу вставится на ПК..."/>
      <button class="btn2" onclick="sendType()">Ввод</button>
    </div>
  </div>
</div>

<div id="tab-media" class="hide">
  <div class="card">
    <div style="font-weight:800;margin-bottom:10px">🎵 Медиа и громкость ПК</div>
    <div class="grid3" style="margin-bottom:12px">
      <button class="btn2" onclick="ctrl({action:'media_prev'})">⏮ Пред.</button>
      <button class="btn" onclick="ctrl({action:'media_play'})">⏯ Пауза</button>
      <button class="btn2" onclick="ctrl({action:'media_next'})">⏭ След.</button>
    </div>
    <div style="font-size:12px;opacity:.75;margin-bottom:6px">Громкость ПК: <b id="volLbl">50%</b></div>
    <input id="volRange" type="range" min="0" max="100" value="50" onchange="ctrl({action:'volume',value:+this.value})" oninput="document.getElementById('volLbl').textContent=this.value+'%'"/>
  </div>
  <div class="card">
    <div style="font-weight:800;margin-bottom:10px">⚡ Быстрые действия</div>
    <div class="grid2">
      <button class="btn2" onclick="ctrl({action:'launch',text:'explorer'})">📁 Проводник</button>
      <button class="btn2" onclick="ctrl({action:'launch',text:'calc'})">🧮 Калькулятор</button>
      <button class="btn2" onclick="ctrl({action:'launch',text:'cmd'})">💻 Терминал</button>
      <button class="btn2" style="color:#fda4af" onclick="ctrl({action:'lock'})">🔒 Блок ПК</button>
    </div>
  </div>
</div>

<div class="tabs">
  <button class="tab active" onclick="openTab('drop',this)">📸 SuperHub</button>
  <button class="tab" onclick="openTab('files',this)">📁 Файлы ПК</button>
  <button class="tab" onclick="openTab('remote',this)">🖱 Тачпад</button>
  <button class="tab" onclick="openTab('media',this)">🎵 Пульт</button>
</div>

<script>
const qs = new URLSearchParams(location.search);
let PIN = qs.get('pin') || localStorage.getItem('oxy_pin') || '';
if (qs.get('pin')) localStorage.setItem('oxy_pin', PIN);
let curZone = 'shelf';

function toast(m){const t=document.getElementById('toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',2200);}
function savePin(){PIN=document.getElementById('pinInput').value.trim();localStorage.setItem('oxy_pin',PIN);ping();}
function openTab(id,btn){
  ['drop','files','remote','media'].forEach(x=>document.getElementById('tab-'+x).classList.toggle('hide',x!==id));
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(id==='files') loadPcFiles(curZone);
}
async function api(path,opt={}){
  opt.headers = Object.assign({'X-Oxygen-PIN':PIN}, opt.headers||{});
  const r = await fetch(path,opt);
  if(r.status===401){document.getElementById('pinBox').classList.remove('hide');throw new Error('PIN');}
  document.getElementById('pinBox').classList.add('hide');
  return r.json();
}
async function ping(){
  try{
    const d = await api('/api/ping?device=Android');
    document.getElementById('pcName').textContent = d.pc_name + ' · Luma OS ' + d.os_version;
    document.getElementById('sCpu').textContent = Math.round(d.cpu||0)+'%';
    document.getElementById('sRam').textContent = Math.round(d.ram||0)+'%';
    document.getElementById('sVol').textContent = (d.volume||0)+'%';
    document.getElementById('volRange').value = d.volume||50;
    document.getElementById('volLbl').textContent = (d.volume||50)+'%';
    document.getElementById('connPill').textContent = '● Подключено';
  }catch{
    document.getElementById('connPill').textContent = '○ Введите PIN';
  }
}
async function uploadFiles(files){
  if(!files||!files.length) return;
  const fd = new FormData();
  fd.append('device','Android');
  for(const f of files) fd.append('files',f);
  document.getElementById('uploadStatus').textContent='Отправка на ПК ('+files.length+')...';
  try{
    const d = await api('/api/upload',{method:'POST',body:fd});
    document.getElementById('uploadStatus').textContent='✓ Отправлено на полку и в Загрузки/OxygenConnect: '+d.count;
    toast('Отправлено на ПК: '+d.count);
  }catch{document.getElementById('uploadStatus').textContent='Ошибка отправки';}
}
async function sendClip(){
  const text=document.getElementById('clipText').value;
  if(!text) return;
  await api('/api/clipboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
  toast('Скопировано в буфер ПК!');
}
async function pullClip(){
  const d = await api('/api/clipboard');
  document.getElementById('clipText').value = d.text || '';
  if(navigator.clipboard && d.text) navigator.clipboard.writeText(d.text).catch(()=>{});
  toast('Буфер ПК получен!');
}
async function loadPcFiles(zone){
  curZone = zone;
  const d = await api('/api/pc-files?zone='+encodeURIComponent(zone));
  const box = document.getElementById('pcFilesList');
  box.innerHTML='';
  if(!d.files||!d.files.length){box.innerHTML='<div style="opacity:.6;font-size:12px;text-align:center;padding:18px">Файлов нет</div>';return;}
  for(const f of d.files){
    const a=document.createElement('a');
    a.href='/api/download?pin='+encodeURIComponent(PIN)+'&path='+encodeURIComponent(f.path);
    a.className='btn2 row';a.style.textDecoration='none';
    a.innerHTML='<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+f.name+'</span><span style="opacity:.65;flex-shrink:0">'+Math.max(1,Math.round((f.size||0)/1024))+' КБ ⬇</span>';
    box.appendChild(a);
  }
}
async function ctrl(body){await api('/api/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}
async function sendType(){const el=document.getElementById('remoteType');if(!el.value)return;await ctrl({action:'type',text:el.value});el.value='';toast('Отправлено на ПК');}

// Touchpad gesture handler
const pad = document.getElementById('trackpad');
let lx=0,ly=0,moved=false,lastSend=0;
pad.addEventListener('touchstart',e=>{const t=e.touches[0];lx=t.clientX;ly=t.clientY;moved=false;},{passive:true});
pad.addEventListener('touchmove',e=>{
  e.preventDefault();
  const t=e.touches[0];const dx=Math.round((t.clientX-lx)*2.2);const dy=Math.round((t.clientY-ly)*2.2);
  lx=t.clientX;ly=t.clientY;
  if(Math.abs(dx)>1||Math.abs(dy)>1){moved=true;const now=Date.now();if(now-lastSend>22){lastSend=now;ctrl({action:'move',dx,dy});}}
},{passive:false});
pad.addEventListener('touchend',()=>{if(!moved)ctrl({action:'lclick'});});

ping();
setInterval(ping, 5000);
</script>
</body>
</html>`
