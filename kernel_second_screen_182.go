package main

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"image/jpeg"
	"io"
	"log"
	"math/big"
	"net"
	"net/http"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// ==================== LUMA OS 1.8.2: TURBO 60 FPS UNIVERSAL SECOND SCREEN ENGINE («LUMA AIRDISPLAY 2.0») ====================
// Works under ANY circumstances — zero Miracast, zero Wi-Fi Direct, zero external drivers required!
// Works over Wi-Fi, Ethernet, Hotspot, or USB tethering with ANY phone, tablet, iPad, laptop, Mac, PC, or Smart TV.
// Turbo 60 FPS Pipeline: Persistent CreateDIBSection + SRCCOPY BitBlt/StretchBlt + parallel BGRA->YCbCr420
// + multi-core JPEG encoder worker pool + pre-framed single-write MJPEG + event broadcast + TCP_NODELAY + 1ms timer.

const (
	SecondScreenPort      = 49225
	SecondScreenBeaconUDP = 49226
	ssMJPEGBoundary       = "lumaframeboundary182"
	ssIncomingBoundary    = "lumaincoming182"
)

type SecondScreenConfig struct {
	Enabled      bool   `json:"enabled"`
	MonitorMode  string `json:"monitor_mode"` // primary | mon_1 | mon_2 | ... | all | right_half | left_half | virtual_board
	FPS          int    `json:"fps"`          // 15 | 24 | 30 | 45 | 60
	MaxWidth     int    `json:"max_width"`    // 0 (Native 1:1) | 960 | 1280 | 1600 | 1920
	Quality      int    `json:"quality"`      // 55..98 (default 86 — crisp high bitrate!)
	AllowInput   bool   `json:"allow_input"`  // Touch / Mouse / Keyboard control from 2nd screen
	RequirePIN   bool   `json:"require_pin"`
	PIN          string `json:"pin"`
	ReceiverOpen bool   `json:"receiver_open"`
}

type SecondScreenClientInfo struct {
	ID         string `json:"id"`
	IP         string `json:"ip"`
	UserAgent  string `json:"user_agent"`
	DeviceName string `json:"device_name"`
	Connected  string `json:"connected"`
	LastSeen   int64  `json:"last_seen"`
}

type SecondScreenPeer struct {
	Host      string `json:"host"`
	IP        string `json:"ip"`
	Port      int    `json:"port"`
	Streaming bool   `json:"streaming"`
	Receiving bool   `json:"receiving"`
	Monitors  int    `json:"monitors"`
	LastSeen  int64  `json:"last_seen"`
}

type SecondScreenWorkspaceState struct {
	Title       string   `json:"title"`
	Note        string   `json:"note"`
	QuickURL    string   `json:"quick_url"`
	ShowClock   bool     `json:"show_clock"`
	ShowMetrics bool     `json:"show_metrics"`
	PinnedCards []string `json:"pinned_cards"`
	UpdatedAt   int64    `json:"updated_at"`
}

type ssEncodeJob struct {
	seq     uint64
	img     *image.YCbCr
	outW    int
	outH    int
	rect    [4]int
	quality int
}

type noDelayListener struct {
	*net.TCPListener
}

func (l noDelayListener) Accept() (net.Conn, error) {
	tc, err := l.AcceptTCP()
	if err != nil {
		return nil, err
	}
	_ = tc.SetNoDelay(true)
	_ = tc.SetKeepAlive(true)
	_ = tc.SetKeepAlivePeriod(30 * time.Second)
	_ = tc.SetWriteBuffer(2 * 1024 * 1024)
	return tc, nil
}

type SecondScreenEngine struct {
	mu           sync.RWMutex
	cfg          SecondScreenConfig
	serverUp     bool
	listenErr    string
	lanIP        string
	hostName     string
	activeRect   [4]int // x, y, w, h of currently captured source
	latestFrame  []byte
	latestPacket []byte // Pre-framed MJPEG multipart chunk for single-write zero-overhead fan-out
	frameW       int
	frameH       int
	frameSeq     uint64
	frameNotify  chan struct{}
	actualFPS    float64
	lastBitrateK int
	clients      map[string]*SecondScreenClientInfo
	viewersCount int32

	// Monitor geometry cache (avoids calling Win32 EnumDisplayMonitors on every frame!)
	monMu    sync.RWMutex
	monCache []MonitorInfo
	monAt    time.Time

	// Reusable pools & metrics for multi-core Turbo encoder
	ycbcrPool  sync.Pool
	bufPool    sync.Pool
	pubMu      sync.Mutex
	pubFrames  int
	pubBytes   int
	pubWindowT time.Time

	// Universal Receiver (Incoming stream pushed from ANY Phone / Laptop / Mac / PC via /send!)
	inMu         sync.RWMutex
	inFrame      []byte
	inPacket     []byte
	inSeq        uint64
	inNotify     chan struct{}
	inSenderName string
	inSenderIP   string
	inLastAt     time.Time
	inFPS        float64
	inFrameCount int

	// Auto-discovered Luma OS LAN peers
	peerMu sync.RWMutex
	peers  map[string]*SecondScreenPeer

	// Virtual Extended Workspace state (for 1-monitor PCs!)
	wsMu      sync.RWMutex
	workspace SecondScreenWorkspaceState

	captureStop chan struct{}
	kernel      *LumaKernel
}

var (
	secondScreenOnce sync.Once
	secondScreenEng  *SecondScreenEngine
)

func generate4DigitPIN() string {
	n, err := rand.Int(rand.Reader, big.NewInt(9000))
	if err != nil {
		return "4829"
	}
	return fmt.Sprintf("%04d", 1000+n.Int64())
}

func getSecondScreenEngine(k *LumaKernel) *SecondScreenEngine {
	secondScreenOnce.Do(func() {
		secondScreenEng = &SecondScreenEngine{
			cfg: SecondScreenConfig{
				Enabled:     false,
				MonitorMode: "primary",
				FPS:         60,   // Turbo 60 FPS out of the box!
				MaxWidth:    1600, // Crisp HD+/900p default (supports 960/1280/1600/1920/Native 0)
				Quality:     86,   // High bitrate crisp text & colors (55..98)
				AllowInput:  true,
				RequirePIN:  false,
				PIN:         generate4DigitPIN(),
			},
			lanIP:       detectLocalLANIP(),
			hostName:    hostDeviceName(),
			clients:     map[string]*SecondScreenClientInfo{},
			peers:       map[string]*SecondScreenPeer{},
			frameNotify: make(chan struct{}),
			inNotify:    make(chan struct{}),
			pubWindowT:  time.Now(),
			workspace: SecondScreenWorkspaceState{
				Title:       "Расширенный стол Luma OS",
				Note:        "Сюда можно отправлять заметки, ссылки и следить за системой, пока основной экран свободен.",
				ShowClock:   true,
				ShowMetrics: true,
				PinnedCards: []string{"clock", "telemetry", "note", "media"},
				UpdatedAt:   time.Now().Unix(),
			},
			kernel: k,
		}
		secondScreenEng.bufPool = sync.Pool{
			New: func() interface{} {
				b := bytes.NewBuffer(make([]byte, 0, 256*1024))
				return b
			},
		}
		go secondScreenEng.startLANServer()
		go secondScreenEng.startLANPeerDiscovery()
	})
	return secondScreenEng
}

func (e *SecondScreenEngine) refreshNetworkInfo() string {
	ip := detectLocalLANIP()
	e.mu.Lock()
	e.lanIP = ip
	e.mu.Unlock()
	return ip
}

func (e *SecondScreenEngine) getMonitorsCached(force bool) []MonitorInfo {
	e.monMu.RLock()
	if !force && len(e.monCache) > 0 && time.Since(e.monAt) < 3*time.Second {
		mons := e.monCache
		e.monMu.RUnlock()
		return mons
	}
	e.monMu.RUnlock()

	mons := listMonitorsOS()
	e.monMu.Lock()
	e.monCache = mons
	e.monAt = time.Now()
	e.monMu.Unlock()
	return mons
}

func (e *SecondScreenEngine) resolveCaptureRect(mode string) (x, y, w, h int) {
	mons := e.getMonitorsCached(false)
	if len(mons) == 0 {
		return 0, 0, 1920, 1080
	}
	primary := mons[0]
	for _, m := range mons {
		if m.Primary {
			primary = m
			break
		}
	}

	switch mode {
	case "", "primary":
		return primary.X, primary.Y, primary.Width, primary.Height
	case "all":
		minX, minY := mons[0].X, mons[0].Y
		maxX, maxY := mons[0].X+mons[0].Width, mons[0].Y+mons[0].Height
		for _, m := range mons[1:] {
			if m.X < minX {
				minX = m.X
			}
			if m.Y < minY {
				minY = m.Y
			}
			if m.X+m.Width > maxX {
				maxX = m.X + m.Width
			}
			if m.Y+m.Height > maxY {
				maxY = m.Y + m.Height
			}
		}
		return minX, minY, maxX - minX, maxY - minY
	case "right_half":
		hw := primary.Width / 2
		return primary.X + hw, primary.Y, primary.Width - hw, primary.Height
	case "left_half":
		hw := primary.Width / 2
		return primary.X, primary.Y, hw, primary.Height
	default:
		if strings.HasPrefix(mode, "mon_") {
			if idx, err := strconv.Atoi(strings.TrimPrefix(mode, "mon_")); err == nil && idx >= 1 && idx <= len(mons) {
				m := mons[idx-1]
				return m.X, m.Y, m.Width, m.Height
			}
		}
		return primary.X, primary.Y, primary.Width, primary.Height
	}
}

func buildMJPEGPacket(boundary string, jpg []byte) []byte {
	hdr := fmt.Sprintf("--%s\r\nContent-Type: image/jpeg\r\nContent-Length: %d\r\n\r\n", boundary, len(jpg))
	pkt := make([]byte, len(hdr)+len(jpg)+2)
	copy(pkt, hdr)
	copy(pkt[len(hdr):], jpg)
	pkt[len(pkt)-2] = '\r'
	pkt[len(pkt)-1] = '\n'
	return pkt
}

func (e *SecondScreenEngine) publishEncodedFrame(seq uint64, jpg []byte, outW, outH int, rect [4]int) {
	pkt := buildMJPEGPacket(ssMJPEGBoundary, jpg)

	e.mu.Lock()
	if seq <= e.frameSeq {
		// Out-of-order older encode finished after a newer frame; drop to keep motion crisp
		e.mu.Unlock()
		return
	}
	e.latestFrame = jpg
	e.latestPacket = pkt
	e.frameW = outW
	e.frameH = outH
	e.activeRect = rect
	e.frameSeq = seq
	oldNotify := e.frameNotify
	e.frameNotify = make(chan struct{})
	e.mu.Unlock()

	// Wake every connected MJPEG viewer immediately (<0.05ms)!
	close(oldNotify)

	// Rolling 500ms FPS & Bitrate telemetry
	e.pubMu.Lock()
	e.pubFrames++
	e.pubBytes += len(jpg)
	if el := time.Since(e.pubWindowT); el >= 500*time.Millisecond {
		fps := float64(e.pubFrames) / el.Seconds()
		kbps := int(float64(e.pubBytes*8) / 1000.0 / el.Seconds())
		e.pubFrames = 0
		e.pubBytes = 0
		e.pubWindowT = time.Now()
		e.pubMu.Unlock()

		e.mu.Lock()
		e.actualFPS = float64(int(fps*10)) / 10.0
		e.lastBitrateK = kbps
		e.mu.Unlock()
		return
	}
	e.pubMu.Unlock()
}

func (e *SecondScreenEngine) ensureCaptureLoopRunning() {
	e.mu.Lock()
	if e.captureStop != nil {
		e.mu.Unlock()
		return
	}
	stop := make(chan struct{})
	e.captureStop = stop
	e.mu.Unlock()

	// Spin up multi-core parallel JPEG encoder workers (2..4 workers) so 1080p 60 FPS encodes concurrently!
	workers := runtime.NumCPU() / 2
	if workers < 2 {
		workers = 2
	}
	if workers > 4 {
		workers = 4
	}
	jobCh := make(chan ssEncodeJob, workers)

	for i := 0; i < workers; i++ {
		go func() {
			defer func() { _ = recover() }()
			for {
				select {
				case <-stop:
					return
				case job, ok := <-jobCh:
					if !ok {
						return
					}
					buf := e.bufPool.Get().(*bytes.Buffer)
					buf.Reset()
					q := job.quality
					if q < 50 || q > 98 {
						q = 86
					}
					err := jpeg.Encode(buf, job.img, &jpeg.Options{Quality: q})
					// Return YCbCr buffer immediately to pool for zero-GC reuse
					e.ycbcrPool.Put(job.img)
					if err == nil && buf.Len() > 0 {
						jpg := make([]byte, buf.Len())
						copy(jpg, buf.Bytes())
						e.bufPool.Put(buf)
						e.publishEncodedFrame(job.seq, jpg, job.outW, job.outH, job.rect)
					} else {
						e.bufPool.Put(buf)
					}
				}
			}
		}()
	}

	// Capture producer goroutine with 1ms Windows high-res timer & drift-free pacing
	go func() {
		defer func() {
			_ = recover()
			setSecondScreenHighResTimer(false)
			e.mu.Lock()
			if e.captureStop == stop {
				e.captureStop = nil
			}
			e.mu.Unlock()
		}()

		var seqGen uint64
		highResOn := false
		nextTick := time.Now()

		for {
			select {
			case <-stop:
				return
			default:
			}

			e.mu.RLock()
			cfg := e.cfg
			viewers := atomic.LoadInt32(&e.viewersCount)
			e.mu.RUnlock()

			// Zero-CPU idle when streaming is disabled AND no viewer is connected!
			if !cfg.Enabled && viewers <= 0 {
				if highResOn {
					setSecondScreenHighResTimer(false)
					highResOn = false
				}
				e.mu.Lock()
				e.actualFPS = 0
				e.lastBitrateK = 0
				e.mu.Unlock()
				time.Sleep(200 * time.Millisecond)
				nextTick = time.Now()
				continue
			}

			targetFPS := cfg.FPS
			if targetFPS < 10 {
				targetFPS = 15
			}
			if targetFPS > 60 {
				targetFPS = 60
			}
			if viewers <= 0 {
				// Keep warm at 6 FPS when enabled with 0 connected viewers so joining is instant with <2% CPU
				targetFPS = 6
				if highResOn {
					setSecondScreenHighResTimer(false)
					highResOn = false
				}
			} else if !highResOn {
				setSecondScreenHighResTimer(true)
				highResOn = true
				nextTick = time.Now()
			}

			frameDur := time.Second / time.Duration(targetFPS)
			now := time.Now()
			if wait := nextTick.Sub(now); wait > 0 {
				if wait > frameDur {
					wait = frameDur
					nextTick = now.Add(wait)
				}
				select {
				case <-stop:
					return
				case <-time.After(wait):
				}
			}
			nextTick = nextTick.Add(frameDur)
			if time.Since(nextTick) > 2*frameDur {
				nextTick = time.Now().Add(frameDur)
			}

			// Acquire pooled YCbCr buffer
			var reuse *image.YCbCr
			if v := e.ycbcrPool.Get(); v != nil {
				reuse, _ = v.(*image.YCbCr)
			}

			rx, ry, rw, rh := e.resolveCaptureRect(cfg.MonitorMode)
			img, outW, outH, err := captureSecondScreenRectYCbCr(rx, ry, rw, rh, cfg.MaxWidth, reuse)
			if err != nil || img == nil {
				if reuse != nil {
					e.ycbcrPool.Put(reuse)
				}
				time.Sleep(15 * time.Millisecond)
				continue
			}

			seqGen++
			job := ssEncodeJob{
				seq:     seqGen,
				img:     img,
				outW:    outW,
				outH:    outH,
				rect:    [4]int{rx, ry, rw, rh},
				quality: cfg.Quality,
			}

			// Non-blocking submit: if all encoder workers are saturated, drop this frame instead of queueing lag!
			select {
			case jobCh <- job:
			default:
				e.ycbcrPool.Put(img)
			}
		}
	}()
}

func (e *SecondScreenEngine) SetConfig(patch map[string]interface{}) SecondScreenConfig {
	e.mu.Lock()
	if v, ok := patch["enabled"].(bool); ok {
		e.cfg.Enabled = v
	}
	if v, ok := patch["monitor_mode"].(string); ok && strings.TrimSpace(v) != "" {
		e.cfg.MonitorMode = strings.TrimSpace(v)
	}
	if v, ok := patch["fps"].(float64); ok {
		f := int(v)
		if f < 10 {
			f = 15
		}
		if f > 60 {
			f = 60
		}
		e.cfg.FPS = f
	}
	if v, ok := patch["max_width"].(float64); ok {
		mw := int(v)
		if mw <= 0 {
			e.cfg.MaxWidth = 0 // Native 1:1 full resolution!
		} else {
			if mw < 640 {
				mw = 960
			}
			if mw > 3840 {
				mw = 3840
			}
			e.cfg.MaxWidth = mw
		}
	}
	if v, ok := patch["quality"].(float64); ok {
		q := int(v)
		if q < 50 {
			q = 55
		}
		if q > 98 {
			q = 98
		}
		e.cfg.Quality = q
	}
	if v, ok := patch["allow_input"].(bool); ok {
		e.cfg.AllowInput = v
	}
	if v, ok := patch["require_pin"].(bool); ok {
		e.cfg.RequirePIN = v
	}
	if v, ok := patch["pin"].(string); ok && len(strings.TrimSpace(v)) >= 4 {
		e.cfg.PIN = strings.TrimSpace(v)[:4]
	}
	if v, ok := patch["regenerate_pin"].(bool); ok && v {
		e.cfg.PIN = generate4DigitPIN()
	}
	if v, ok := patch["receiver_open"].(bool); ok {
		e.cfg.ReceiverOpen = v
	}
	enabled := e.cfg.Enabled
	cfgCopy := e.cfg
	e.mu.Unlock()

	if enabled {
		go ensureSecondScreenFirewallAllowed(SecondScreenPort)
		e.ensureCaptureLoopRunning()
	}
	return cfgCopy
}

func (e *SecondScreenEngine) StatusSnapshot() map[string]interface{} {
	ip := e.refreshNetworkInfo()
	mons := e.getMonitorsCached(false)

	now := time.Now().Unix()
	e.mu.Lock()
	var activeClients []SecondScreenClientInfo
	for id, cl := range e.clients {
		if now-cl.LastSeen > 25 {
			delete(e.clients, id)
			continue
		}
		activeClients = append(activeClients, *cl)
	}
	cfg := e.cfg
	up := e.serverUp
	lerr := e.listenErr
	fps := e.actualFPS
	kbps := e.lastBitrateK
	fw, fh := e.frameW, e.frameH
	host := e.hostName
	e.mu.Unlock()

	e.inMu.RLock()
	inActive := len(e.inFrame) > 0 && time.Since(e.inLastAt) < 8*time.Second
	inSender := e.inSenderName
	inIP := e.inSenderIP
	inFPS := e.inFPS
	inSeq := e.inSeq
	e.inMu.RUnlock()

	e.peerMu.Lock()
	var peerList []SecondScreenPeer
	for key, p := range e.peers {
		if now-p.LastSeen > 18 {
			delete(e.peers, key)
			continue
		}
		peerList = append(peerList, *p)
	}
	e.peerMu.Unlock()

	e.wsMu.RLock()
	ws := e.workspace
	e.wsMu.RUnlock()

	viewerURL := fmt.Sprintf("http://%s:%d/", ip, SecondScreenPort)
	senderURL := fmt.Sprintf("http://%s:%d/send", ip, SecondScreenPort)

	return map[string]interface{}{
		"ok":                true,
		"server_up":         up,
		"listen_error":      lerr,
		"host":              host,
		"lan_ip":            ip,
		"port":              SecondScreenPort,
		"viewer_url":        viewerURL,
		"sender_url":        senderURL,
		"config":            cfg,
		"monitors":          mons,
		"actual_fps":        fps,
		"bitrate_kbps":      kbps,
		"stream_width":      fw,
		"stream_height":     fh,
		"connected_clients": activeClients,
		"viewers_count":     atomic.LoadInt32(&e.viewersCount),
		"incoming_active":   inActive,
		"incoming_sender":   inSender,
		"incoming_ip":       inIP,
		"incoming_fps":      inFPS,
		"incoming_seq":      inSeq,
		"peers":             peerList,
		"workspace":         ws,
		"os":                runtime.GOOS,
	}
}

func (e *SecondScreenEngine) verifyPIN(r *http.Request) bool {
	e.mu.RLock()
	reqPin := e.cfg.RequirePIN
	pin := e.cfg.PIN
	e.mu.RUnlock()
	if !reqPin || pin == "" {
		return true
	}
	got := strings.TrimSpace(r.URL.Query().Get("pin"))
	if got == "" {
		got = strings.TrimSpace(r.Header.Get("X-Luma-PIN"))
	}
	return got == pin
}

func (e *SecondScreenEngine) touchClient(r *http.Request) string {
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		ip = r.RemoteAddr
	}
	ua := r.UserAgent()
	dev := "Устройство"
	low := strings.ToLower(ua)
	switch {
	case strings.Contains(low, "iphone"):
		dev = "iPhone"
	case strings.Contains(low, "ipad"):
		dev = "iPad"
	case strings.Contains(low, "android"):
		dev = "Android"
	case strings.Contains(low, "windows"):
		dev = "Windows ПК"
	case strings.Contains(low, "macintosh") || strings.Contains(low, "mac os"):
		dev = "Mac"
	case strings.Contains(low, "linux"):
		dev = "Linux"
	case strings.Contains(low, "smart-tv") || strings.Contains(low, "tizen") || strings.Contains(low, "webos"):
		dev = "Smart TV"
	}
	id := ip + "_" + dev
	now := time.Now().Unix()
	e.mu.Lock()
	if cl, ok := e.clients[id]; ok {
		cl.LastSeen = now
	} else {
		e.clients[id] = &SecondScreenClientInfo{
			ID:         id,
			IP:         ip,
			UserAgent:  ua,
			DeviceName: dev,
			Connected:  time.Now().Format("15:04:05"),
			LastSeen:   now,
		}
	}
	e.mu.Unlock()
	return id
}

func (e *SecondScreenEngine) serveMJPEGStream(w http.ResponseWriter, r *http.Request) {
	if !e.verifyPIN(r) {
		http.Error(w, "PIN required", http.StatusUnauthorized)
		return
	}
	e.touchClient(r)
	e.ensureCaptureLoopRunning()

	atomic.AddInt32(&e.viewersCount, 1)
	defer atomic.AddInt32(&e.viewersCount, -1)

	w.Header().Set("Content-Type", "multipart/x-mixed-replace; boundary="+ssMJPEGBoundary)
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, _ := w.(http.Flusher)
	var lastSeq uint64
	lastTouch := time.Now()
	ctx := r.Context()

	for {
		e.mu.RLock()
		seq := e.frameSeq
		pkt := e.latestPacket
		notifyCh := e.frameNotify
		e.mu.RUnlock()

		if len(pkt) > 0 && seq != lastSeq {
			lastSeq = seq
			if time.Since(lastTouch) >= 2*time.Second {
				e.touchClient(r)
				lastTouch = time.Now()
			}
			// Single zero-fragmentation syscall write!
			if _, err := w.Write(pkt); err != nil {
				return
			}
			if flusher != nil {
				flusher.Flush()
			}
			continue
		}

		// Instant event-driven wakeup (<0.05ms latency, zero 16ms polling sleep!)
		select {
		case <-ctx.Done():
			return
		case <-notifyCh:
		}
	}
}

func (e *SecondScreenEngine) serveSingleFrame(w http.ResponseWriter, r *http.Request) {
	if !e.verifyPIN(r) {
		http.Error(w, "PIN required", http.StatusUnauthorized)
		return
	}
	e.touchClient(r)
	e.ensureCaptureLoopRunning()

	e.mu.RLock()
	frame := e.latestFrame
	cfg := e.cfg
	e.mu.RUnlock()

	if len(frame) == 0 {
		rx, ry, rw, rh := e.resolveCaptureRect(cfg.MonitorMode)
		if img, ow, oh, err := captureSecondScreenRectYCbCr(rx, ry, rw, rh, cfg.MaxWidth, nil); err == nil && img != nil {
			var buf bytes.Buffer
			q := cfg.Quality
			if q < 50 || q > 98 {
				q = 86
			}
			if jpeg.Encode(&buf, img, &jpeg.Options{Quality: q}) == nil && buf.Len() > 0 {
				frame = buf.Bytes()
				e.publishEncodedFrame(1, frame, ow, oh, [4]int{rx, ry, rw, rh})
			}
		}
	}
	if len(frame) == 0 {
		http.Error(w, "capturing...", http.StatusServiceUnavailable)
		return
	}
	w.Header().Set("Content-Type", "image/jpeg")
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	_, _ = w.Write(frame)
}

func (e *SecondScreenEngine) handlePushIncomingFrame(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Luma-Sender")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var jpg []byte
	ct := strings.ToLower(r.Header.Get("Content-Type"))
	if strings.Contains(ct, "application/json") {
		var req struct {
			Data   string `json:"data"`
			Sender string `json:"sender"`
		}
		if err := json.NewDecoder(io.LimitReader(r.Body, 8*1024*1024)).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		rawB64 := req.Data
		if idx := strings.Index(rawB64, ","); idx >= 0 {
			rawB64 = rawB64[idx+1:]
		}
		dec, err := base64.StdEncoding.DecodeString(rawB64)
		if err != nil || len(dec) == 0 {
			http.Error(w, "invalid frame", http.StatusBadRequest)
			return
		}
		jpg = dec
		if req.Sender != "" {
			r.Header.Set("X-Luma-Sender", req.Sender)
		}
	} else {
		data, err := io.ReadAll(io.LimitReader(r.Body, 8*1024*1024))
		if err != nil || len(data) == 0 {
			http.Error(w, "empty frame", http.StatusBadRequest)
			return
		}
		jpg = data
	}

	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		ip = r.RemoteAddr
	}
	sender := strings.TrimSpace(r.Header.Get("X-Luma-Sender"))
	if sender == "" {
		sender = "Устройство (" + ip + ")"
	}

	pkt := buildMJPEGPacket(ssIncomingBoundary, jpg)
	now := time.Now()
	e.inMu.Lock()
	e.inFrame = jpg
	e.inPacket = pkt
	e.inSeq++
	e.inSenderName = sender
	e.inSenderIP = ip
	if !e.inLastAt.IsZero() {
		dt := now.Sub(e.inLastAt).Seconds()
		if dt > 0.005 && dt < 3.0 {
			inst := 1.0 / dt
			e.inFPS = float64(int((e.inFPS*0.7+inst*0.3)*10)) / 10.0
		}
	}
	e.inLastAt = now
	e.inFrameCount++
	oldInNotify := e.inNotify
	e.inNotify = make(chan struct{})
	e.inMu.Unlock()

	close(oldInNotify)

	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"ok":true}`))
}

func (e *SecondScreenEngine) serveIncomingMJPEG(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "multipart/x-mixed-replace; boundary="+ssIncomingBoundary)
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")
	w.Header().Set("X-Accel-Buffering", "no")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, _ := w.(http.Flusher)
	var lastSeq uint64
	ctx := r.Context()

	for {
		e.inMu.RLock()
		seq := e.inSeq
		pkt := e.inPacket
		notifyCh := e.inNotify
		e.inMu.RUnlock()

		if len(pkt) > 0 && seq != lastSeq {
			lastSeq = seq
			if _, err := w.Write(pkt); err != nil {
				return
			}
			if flusher != nil {
				flusher.Flush()
			}
			continue
		}

		select {
		case <-ctx.Done():
			return
		case <-notifyCh:
		}
	}
}

func (e *SecondScreenEngine) handleRemoteInput(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if !e.verifyPIN(r) {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "PIN required"})
		return
	}
	e.mu.RLock()
	allow := e.cfg.AllowInput
	rect := e.activeRect
	mode := e.cfg.MonitorMode
	e.mu.RUnlock()
	if !allow {
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "Управление отключено на ПК"})
		return
	}

	var req struct {
		Action string   `json:"action"` // move | click | dblclick | rclick | down | up | scroll | text | key
		NX     *float64 `json:"nx"`     // 0..1 normalized X inside captured monitor rect
		NY     *float64 `json:"ny"`     // 0..1 normalized Y inside captured monitor rect
		X      *float64 `json:"x"`      // alias for nx
		Y      *float64 `json:"y"`      // alias for ny
		DX     int      `json:"dx"`     // relative move dx (trackpad mode)
		DY     int      `json:"dy"`     // relative move dy (trackpad mode)
		Delta  int      `json:"delta"`  // wheel delta
		Text   string   `json:"text"`
		Key    string   `json:"key"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 16*1024)).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
		return
	}

	nx, ny := 0.5, 0.5
	if req.NX != nil {
		nx = *req.NX
	} else if req.X != nil {
		nx = *req.X
	}
	if req.NY != nil {
		ny = *req.NY
	} else if req.Y != nil {
		ny = *req.Y
	}

	if rect[2] <= 0 || rect[3] <= 0 {
		rx, ry, rw, rh := e.resolveCaptureRect(mode)
		rect = [4]int{rx, ry, rw, rh}
	}
	absX := rect[0] + int(nx*float64(rect[2]))
	absY := rect[1] + int(ny*float64(rect[3]))
	injectSecondScreenInput(req.Action, absX, absY, req.DX, req.DY, req.Delta, req.Text, req.Key)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true})
}

func (e *SecondScreenEngine) startLANServer() {
	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write([]byte(secondScreenViewerHTML))
	})

	mux.HandleFunc("/send", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write([]byte(secondScreenSenderHTML))
	})

	mux.HandleFunc("/stream.mjpeg", e.serveMJPEGStream)
	mux.HandleFunc("/frame.jpg", e.serveSingleFrame)
	mux.HandleFunc("/api/push-frame", e.handlePushIncomingFrame)
	mux.HandleFunc("/api/input", e.handleRemoteInput)

	mux.HandleFunc("/api/info", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		e.mu.RLock()
		cfg := e.cfg
		host := e.hostName
		fps := e.actualFPS
		kbps := e.lastBitrateK
		e.mu.RUnlock()

		e.wsMu.RLock()
		ws := e.workspace
		e.wsMu.RUnlock()

		var cpuPct, ramPct float64
		if e.kernel != nil {
			hw := e.kernel.SystemSnapshot()
			cpuPct = float64(hw.CPUPercent)
			ramPct = float64(hw.RAMPercent)
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":           true,
			"host":         host,
			"require_pin":  cfg.RequirePIN,
			"pin_ok":       e.verifyPIN(r),
			"allow_input":  cfg.AllowInput,
			"monitor_mode": cfg.MonitorMode,
			"fps":          cfg.FPS,
			"max_width":    cfg.MaxWidth,
			"quality":      cfg.Quality,
			"actual_fps":   fps,
			"bitrate_kbps": kbps,
			"monitors":     e.getMonitorsCached(false),
			"workspace":    ws,
			"cpu_percent":  cpuPct,
			"ram_percent":  ramPct,
		})
	})

	mux.HandleFunc("/api/client-config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if !e.verifyPIN(r) {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		var patch map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&patch); err == nil {
			safePatch := map[string]interface{}{}
			for _, k := range []string{"monitor_mode", "fps", "max_width", "quality"} {
				if v, ok := patch[k]; ok {
					safePatch[k] = v
				}
			}
			e.SetConfig(safePatch)
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true})
	})

	addr := fmt.Sprintf("0.0.0.0:%d", SecondScreenPort)
	tcpAddr, err := net.ResolveTCPAddr("tcp", addr)
	if err != nil {
		e.mu.Lock()
		e.serverUp = false
		e.listenErr = err.Error()
		e.mu.Unlock()
		return
	}
	tcpLn, err := net.ListenTCP("tcp", tcpAddr)
	if err != nil {
		e.mu.Lock()
		e.serverUp = false
		e.listenErr = err.Error()
		e.mu.Unlock()
		log.Printf("[Luma AirDisplay 1.8.2] listen %s error: %v", addr, err)
		return
	}
	e.mu.Lock()
	e.serverUp = true
	e.listenErr = ""
	e.mu.Unlock()
	log.Printf("[Luma AirDisplay 1.8.2 Turbo 60FPS] Universal Second Screen Server online on http://%s:%d/ (and /send)", e.lanIP, SecondScreenPort)
	_ = http.Serve(noDelayListener{tcpLn}, mux)
}

// startLANPeerDiscovery broadcasts and listens for other Luma OS PCs on the local network (UDP :49226)
func (e *SecondScreenEngine) startLANPeerDiscovery() {
	go func() {
		defer func() { _ = recover() }()
		pc, err := net.ListenPacket("udp4", fmt.Sprintf(":%d", SecondScreenBeaconUDP))
		if err != nil {
			return
		}
		defer pc.Close()
		buf := make([]byte, 1024)
		for {
			n, _, err := pc.ReadFrom(buf)
			if err != nil || n <= 0 {
				continue
			}
			var peer SecondScreenPeer
			if json.Unmarshal(buf[:n], &peer) == nil && peer.IP != "" && peer.Port > 0 {
				myIP := detectLocalLANIP()
				if peer.IP == myIP {
					continue
				}
				peer.LastSeen = time.Now().Unix()
				e.peerMu.Lock()
				e.peers[peer.IP] = &peer
				e.peerMu.Unlock()
			}
		}
	}()

	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		e.mu.RLock()
		active := e.cfg.Enabled || e.cfg.ReceiverOpen
		streaming := e.cfg.Enabled
		receiving := e.cfg.ReceiverOpen
		host := e.hostName
		e.mu.RUnlock()
		if !active {
			continue
		}
		ip := detectLocalLANIP()
		if ip == "" || ip == "127.0.0.1" {
			continue
		}
		payload, _ := json.Marshal(SecondScreenPeer{
			Host:      host,
			IP:        ip,
			Port:      SecondScreenPort,
			Streaming: streaming,
			Receiving: receiving,
			Monitors:  len(e.getMonitorsCached(false)),
		})
		conn, err := net.DialUDP("udp4", nil, &net.UDPAddr{IP: net.IPv4bcast, Port: SecondScreenBeaconUDP})
		if err == nil {
			_, _ = conn.Write(payload)
			_ = conn.Close()
		}
	}
}

func registerSecondScreen182Routes(mux *http.ServeMux, k *LumaKernel) {
	eng := getSecondScreenEngine(k)

	mux.HandleFunc("/api/kernel/second-screen/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_ = json.NewEncoder(w).Encode(eng.StatusSnapshot())
	})

	mux.HandleFunc("/api/kernel/second-screen/config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			_ = json.NewEncoder(w).Encode(eng.StatusSnapshot())
			return
		}
		var patch map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		eng.SetConfig(patch)
		_ = json.NewEncoder(w).Encode(eng.StatusSnapshot())
	})

	mux.HandleFunc("/api/kernel/second-screen/workspace", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method == http.MethodPost {
			var ws SecondScreenWorkspaceState
			if err := json.NewDecoder(r.Body).Decode(&ws); err == nil {
				ws.UpdatedAt = time.Now().Unix()
				eng.wsMu.Lock()
				eng.workspace = ws
				eng.wsMu.Unlock()
			}
		}
		eng.wsMu.RLock()
		cur := eng.workspace
		eng.wsMu.RUnlock()
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "workspace": cur})
	})

	mux.HandleFunc("/api/kernel/second-screen/qr.svg", func(w http.ResponseWriter, r *http.Request) {
		ip := eng.refreshNetworkInfo()
		mode := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("mode")))
		targetURL := fmt.Sprintf("http://%s:%d/", ip, SecondScreenPort)
		if mode == "send" || mode == "receive" {
			targetURL = fmt.Sprintf("http://%s:%d/send", ip, SecondScreenPort)
		}
		svg := generateQRCodeSVG(targetURL)
		w.Header().Set("Content-Type", "image/svg+xml; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write([]byte(svg))
	})

	mux.HandleFunc("/api/kernel/second-screen/preview.jpg", eng.serveSingleFrame)
	mux.HandleFunc("/api/kernel/second-screen/incoming.mjpeg", eng.serveIncomingMJPEG)
	mux.HandleFunc("/api/kernel/second-screen/incoming.jpg", func(w http.ResponseWriter, r *http.Request) {
		eng.inMu.RLock()
		frame := eng.inFrame
		eng.inMu.RUnlock()
		if len(frame) == 0 {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		w.Header().Set("Content-Type", "image/jpeg")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write(frame)
	})
	mux.HandleFunc("/api/kernel/second-screen/push-frame", eng.handlePushIncomingFrame)

	mux.HandleFunc("/api/kernel/second-screen/remote-stream", func(w http.ResponseWriter, r *http.Request) {
		host := strings.TrimSpace(r.URL.Query().Get("host"))
		pin := strings.TrimSpace(r.URL.Query().Get("pin"))
		if host == "" {
			http.Error(w, "host required", http.StatusBadRequest)
			return
		}
		if !strings.Contains(host, ":") {
			host = fmt.Sprintf("%s:%d", host, SecondScreenPort)
		}
		u := fmt.Sprintf("http://%s/stream.mjpeg", host)
		if pin != "" {
			u += "?pin=" + pin
		}
		req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, u, nil)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()
		for k, vv := range resp.Header {
			for _, v := range vv {
				w.Header().Add(k, v)
			}
		}
		w.WriteHeader(resp.StatusCode)
		flusher, _ := w.(http.Flusher)
		buf := make([]byte, 64*1024)
		for {
			n, rerr := resp.Body.Read(buf)
			if n > 0 {
				if _, werr := w.Write(buf[:n]); werr != nil {
					return
				}
				if flusher != nil {
					flusher.Flush()
				}
			}
			if rerr != nil {
				return
			}
		}
	})

	mux.HandleFunc("/api/kernel/second-screen/remote-input", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Host    string                 `json:"host"`
			PIN     string                 `json:"pin"`
			Payload map[string]interface{} `json:"payload"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Host) == "" {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "invalid remote input"})
			return
		}
		h := strings.TrimSpace(req.Host)
		if !strings.Contains(h, ":") {
			h = fmt.Sprintf("%s:%d", h, SecondScreenPort)
		}
		bodyBytes, _ := json.Marshal(req.Payload)
		u := fmt.Sprintf("http://%s/api/input", h)
		if req.PIN != "" {
			u += "?pin=" + req.PIN
		}
		client := &http.Client{Timeout: 2 * time.Second}
		resp, err := client.Post(u, "application/json", bytes.NewReader(bodyBytes))
		if err != nil {
			w.WriteHeader(http.StatusBadGateway)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		_ = resp.Body.Close()
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true})
	})
}

// ==================== EMBEDDED HTML5 TURBO 60 FPS SECOND SCREEN VIEWER ====================

const secondScreenViewerHTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="theme-color" content="#050811"/>
<title>Luma AirDisplay · 2-й экран 60 FPS</title>
<style>
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none}
  html,body{margin:0;padding:0;width:100%;height:100%;background:#04070f;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow:hidden}
  #stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#04070f;touch-action:none}
  #screenImg{max-width:100%;max-height:100%;object-fit:contain;display:block;transition:transform .2s ease;will-change:transform}
  #screenImg.fill{width:100%;height:100%;object-fit:cover}
  #virtualBoard{position:fixed;inset:0;display:none;padding:24px;overflow:auto;background:radial-gradient(circle at 20% 15%,rgba(16,185,129,.22),transparent 45%),radial-gradient(circle at 80% 85%,rgba(56,189,248,.22),transparent 50%),#060b16}
  .vb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;max-width:1100px;margin:48px auto 0}
  .vb-card{background:rgba(15,23,42,.72);border:1px solid rgba(255,255,255,.14);border-radius:24px;padding:20px;backdrop-filter:blur(22px)}
  #toolbar{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:50;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px;padding:7px 10px;border-radius:999px;background:rgba(10,16,30,.82);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(20px);box-shadow:0 14px 40px rgba(0,0,0,.55);transition:opacity .25s,transform .25s;max-width:96vw}
  #toolbar.hidden{opacity:0;transform:translate(-50%,-130%);pointer-events:none}
  .btn{background:rgba(255,255,255,.09);color:#f1f5f9;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:6px 11px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
  .btn.active{background:#10b981;border-color:#34d399;color:#022c22}
  .btn:active{transform:scale(.95)}
  select.btn{appearance:none;padding-right:16px}
  #showBarHit{position:fixed;top:0;left:0;right:0;height:28px;z-index:40}
  #stats{font-family:ui-monospace,monospace;font-size:11px;color:#7dd3fc;padding:0 6px}
  #kbdModal,#pinModal{position:fixed;inset:0;z-index:90;background:rgba(4,7,15,.85);backdrop-filter:blur(18px);display:none;align-items:center;justify-content:center;padding:18px}
  .modal-card{width:100%;max-width:360px;background:#0f172a;border:1px solid rgba(255,255,255,.16);border-radius:24px;padding:18px;display:flex;flex-direction:column;gap:10px}
  input.inp{width:100%;padding:11px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;font-size:15px;outline:none}
</style>
</head>
<body>
<div id="showBarHit" onclick="toggleBar(true)"></div>
<div id="toolbar">
  <span style="font-weight:900;font-size:12px;color:#34d399;padding:0 4px">Luma Turbo</span>
  <span id="stats">Подключение...</span>
  <select id="monSel" class="btn" onchange="changeMon(this.value)">
    <option value="primary">Монитор 1</option>
    <option value="right_half">Правая половина</option>
    <option value="all">Все мониторы</option>
    <option value="virtual_board">Виртуальный стол</option>
  </select>
  <select id="qualSel" class="btn" onchange="changeQuality(this.value)" title="Битрейт и чёткость">
    <option value="72">Эконом</option>
    <option value="86" selected>Высокий</option>
    <option value="93">Макс HD</option>
    <option value="96">Ультра</option>
  </select>
  <select id="fpsSel" class="btn" onchange="changeFps(this.value)" title="Частота кадров">
    <option value="30">30 FPS</option>
    <option value="45">45 FPS</option>
    <option value="60" selected>60 FPS</option>
  </select>
  <button id="inputBtn" class="btn active" onclick="cycleInputMode()">👆 Тач</button>
  <button class="btn" onclick="openKbd()">⌨️</button>
  <button id="fitBtn" class="btn" onclick="toggleFit()">⛶ Вписать</button>
  <button class="btn" onclick="rotateScreen(this)">↻ 0°</button>
  <button class="btn" onclick="toggleFS()">⛶ Экран</button>
  <button class="btn" onclick="toggleBar(false)">✕</button>
</div>

<div id="stage">
  <img id="screenImg" alt="Luma Second Screen" decoding="async" draggable="false"/>
</div>

<div id="virtualBoard">
  <div class="vb-grid">
    <div class="vb-card">
      <div style="font-size:11px;opacity:.65;text-transform:uppercase;letter-spacing:1px">Luma OS · 2-й экран</div>
      <div id="vbClock" style="font-size:56px;font-weight:900;margin:8px 0">--:--</div>
      <div id="vbDate" style="font-size:14px;opacity:.8"></div>
    </div>
    <div class="vb-card">
      <div style="font-size:11px;opacity:.65;text-transform:uppercase;letter-spacing:1px">Система ПК</div>
      <div style="margin-top:14px;font-size:20px;font-weight:800">CPU: <span id="vbCpu" style="color:#34d399">0%</span></div>
      <div style="margin-top:8px;font-size:20px;font-weight:800">RAM: <span id="vbRam" style="color:#38bdf8">0%</span></div>
      <div id="vbHost" style="margin-top:10px;font-size:12px;opacity:.65"></div>
    </div>
    <div class="vb-card" style="grid-column:1/-1">
      <div id="vbTitle" style="font-size:16px;font-weight:800;color:#34d399">Расширенный стол Luma OS</div>
      <div id="vbNote" style="margin-top:10px;font-size:15px;line-height:1.5;white-space:pre-wrap;opacity:.92"></div>
      <div id="vbLinkWrap" style="margin-top:14px"></div>
    </div>
  </div>
</div>

<div id="kbdModal">
  <div class="modal-card">
    <div style="font-weight:800;font-size:14px">Клавиатура ПК</div>
    <input id="kbdInput" class="inp" placeholder="Введите текст для ПК..."/>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn active" style="flex:1;justify-content:center" onclick="sendKbdText()">Отправить</button>
      <button class="btn" onclick="sendKey('Enter')">Enter</button>
      <button class="btn" onclick="sendKey('Backspace')">⌫</button>
      <button class="btn" onclick="sendKey('Escape')">Esc</button>
      <button class="btn" onclick="closeKbd()">Закрыть</button>
    </div>
  </div>
</div>

<div id="pinModal">
  <div class="modal-card">
    <div style="font-weight:800;font-size:15px">Введите 4-значный PIN с экрана ПК</div>
    <input id="pinInput" class="inp" inputmode="numeric" maxlength="4" placeholder="Например: 4829"/>
    <button class="btn active" style="justify-content:center;padding:10px" onclick="submitPin()">Подключиться</button>
  </div>
</div>

<script>
let pin = localStorage.getItem('luma_ss_pin') || '';
let inputMode = 'touch';
let rot = 0;
let fillMode = false;
let barTimer = null;
let wakeLock = null;
let lastTap = 0;
let dragDown = false;
let lastPX = 0, lastPY = 0;

function qp(){ return pin ? ('?pin='+encodeURIComponent(pin)) : ''; }
function toggleBar(show){
  const el = document.getElementById('toolbar');
  if(show){ el.classList.remove('hidden'); resetBarTimer(); }
  else { el.classList.add('hidden'); }
}
function resetBarTimer(){
  clearTimeout(barTimer);
  barTimer = setTimeout(()=>{ document.getElementById('toolbar').classList.add('hidden'); }, 6500);
}
async function requestWake(){
  try{ if('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); }catch(e){}
}
function toggleFS(){
  if(!document.fullscreenElement){ document.documentElement.requestFullscreen?.().catch(()=>{}); requestWake(); }
  else { document.exitFullscreen?.().catch(()=>{}); }
}
function toggleFit(){
  fillMode = !fillMode;
  document.getElementById('screenImg').classList.toggle('fill', fillMode);
  document.getElementById('fitBtn').textContent = fillMode ? '⛶ Заполнить' : '⛶ Вписать';
}
function rotateScreen(btn){
  rot = (rot + 90) % 360;
  document.getElementById('screenImg').style.transform = rot ? ('rotate('+rot+'deg)') : '';
  if(btn) btn.textContent = '↻ ' + rot + '°';
}
function cycleInputMode(){
  const order = ['touch','trackpad','view'];
  inputMode = order[(order.indexOf(inputMode)+1)%order.length];
  const btn = document.getElementById('inputBtn');
  btn.textContent = inputMode==='touch'?'👆 Тач':inputMode==='trackpad'?'🖱️ Тачпад':'👁️ Просмотр';
  btn.classList.toggle('active', inputMode!=='view');
}
function startStream(){
  const img = document.getElementById('screenImg');
  img.src = '/stream.mjpeg' + qp() + (pin ? '&' : '?') + 't=' + Date.now();
}
async function changeMon(val){
  const vb = document.getElementById('virtualBoard');
  const st = document.getElementById('stage');
  if(val === 'virtual_board'){
    vb.style.display = 'block';
    st.style.display = 'none';
  } else {
    vb.style.display = 'none';
    st.style.display = 'flex';
  }
  await fetch('/api/client-config'+qp(), {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({monitor_mode:val})}).catch(()=>{});
}
async function changeQuality(val){
  const q = Number(val) || 86;
  await fetch('/api/client-config'+qp(), {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({quality:q})}).catch(()=>{});
}
async function changeFps(val){
  const f = Number(val) || 60;
  await fetch('/api/client-config'+qp(), {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fps:f})}).catch(()=>{});
}
function sendInput(payload){
  if(inputMode === 'view') return;
  fetch('/api/input'+qp(), {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).catch(()=>{});
}
function normCoords(clientX, clientY){
  const img = document.getElementById('screenImg');
  const r = img.getBoundingClientRect();
  if(!r.width || !r.height) return {nx:0.5, ny:0.5};
  return {
    nx: Math.max(0, Math.min(1, (clientX - r.left)/r.width)),
    ny: Math.max(0, Math.min(1, (clientY - r.top)/r.height))
  };
}
const stage = document.getElementById('stage');
stage.addEventListener('pointerdown', (e)=>{
  if(e.clientY < 26){ toggleBar(true); return; }
  if(inputMode === 'view') return;
  dragDown = true;
  lastPX = e.clientX; lastPY = e.clientY;
  const c = normCoords(e.clientX, e.clientY);
  if(inputMode === 'touch'){
    const now = Date.now();
    if(now - lastTap < 300){ sendInput({action:'dblclick', nx:c.nx, ny:c.ny}); lastTap = 0; dragDown = false; return; }
    lastTap = now;
    sendInput({action:'down', nx:c.nx, ny:c.ny});
  }
});
stage.addEventListener('pointermove', (e)=>{
  if(!dragDown || inputMode === 'view') return;
  if(inputMode === 'trackpad'){
    const dx = Math.round((e.clientX - lastPX)*1.7);
    const dy = Math.round((e.clientY - lastPY)*1.7);
    lastPX = e.clientX; lastPY = e.clientY;
    if(dx||dy) sendInput({action:'move_rel', dx, dy});
  } else {
    const c = normCoords(e.clientX, e.clientY);
    sendInput({action:'move', nx:c.nx, ny:c.ny});
  }
});
stage.addEventListener('pointerup', (e)=>{
  if(!dragDown) return;
  dragDown = false;
  if(inputMode === 'touch'){
    const c = normCoords(e.clientX, e.clientY);
    sendInput({action:'up', nx:c.nx, ny:c.ny});
  } else if(inputMode === 'trackpad'){
    if(Math.hypot(e.clientX-lastPX, e.clientY-lastPY) < 5) sendInput({action:'click_cur'});
  }
});
stage.addEventListener('contextmenu', (e)=>{
  e.preventDefault();
  if(inputMode==='view') return;
  const c = normCoords(e.clientX, e.clientY);
  sendInput({action:'rclick', nx:c.nx, ny:c.ny});
});
stage.addEventListener('wheel', (e)=>{
  if(inputMode==='view') return;
  e.preventDefault();
  sendInput({action:'scroll', delta: e.deltaY > 0 ? -120 : 120});
}, {passive:false});

function openKbd(){ document.getElementById('kbdModal').style.display='flex'; setTimeout(()=>document.getElementById('kbdInput').focus(),80); }
function closeKbd(){ document.getElementById('kbdModal').style.display='none'; }
function sendKbdText(){
  const inp = document.getElementById('kbdInput');
  if(inp.value){ sendInput({action:'text', text:inp.value}); inp.value=''; }
}
function sendKey(k){ sendInput({action:'key', key:k}); }
function submitPin(){
  pin = document.getElementById('pinInput').value.trim();
  localStorage.setItem('luma_ss_pin', pin);
  document.getElementById('pinModal').style.display='none';
  pollInfo(true);
}
async function pollInfo(init){
  try{
    const r = await fetch('/api/info'+qp());
    const d = await r.json();
    if(d.require_pin && !d.pin_ok){
      document.getElementById('pinModal').style.display='flex';
      return;
    }
    const fps = d.actual_fps ? (Math.round(d.actual_fps) + ' FPS') : (d.fps + ' FPS');
    const mbps = d.bitrate_kbps ? (' · ' + (d.bitrate_kbps/1000).toFixed(1) + ' Мбит/с') : '';
    document.getElementById('stats').textContent = (d.host||'ПК') + ' · ' + fps + mbps;
    if(init){
      const sel = document.getElementById('monSel');
      sel.innerHTML = '';
      (d.monitors||[]).forEach((m, i)=>{
        const o = document.createElement('option');
        o.value = 'mon_'+(i+1);
        o.textContent = 'Монитор '+(i+1)+' ('+m.width+'×'+m.height+')';
        sel.appendChild(o);
      });
      [['right_half','Правая половина (Расш.)'],['left_half','Левая половина'],['all','Все мониторы'],['virtual_board','Виртуальный стол Luma']].forEach(([v,lbl])=>{
        const o = document.createElement('option'); o.value=v; o.textContent=lbl; sel.appendChild(o);
      });
      sel.value = d.monitor_mode || 'primary';
      if(d.fps) document.getElementById('fpsSel').value = String(d.fps);
      if(d.quality){
        const qSel = document.getElementById('qualSel');
        const closest = [72,86,93,96].reduce((a,b)=>Math.abs(b-d.quality)<Math.abs(a-d.quality)?b:a);
        qSel.value = String(closest);
      }
      if(d.monitor_mode === 'virtual_board'){
        document.getElementById('virtualBoard').style.display='block';
        document.getElementById('stage').style.display='none';
      }
      startStream();
    }
    document.getElementById('vbCpu').textContent = Math.round(d.cpu_percent||0)+'%';
    document.getElementById('vbRam').textContent = Math.round(d.ram_percent||0)+'%';
    document.getElementById('vbHost').textContent = d.host || '';
    if(d.workspace){
      document.getElementById('vbTitle').textContent = d.workspace.title || 'Расширенный стол Luma OS';
      document.getElementById('vbNote').textContent = d.workspace.note || '';
      const lw = document.getElementById('vbLinkWrap');
      if(d.workspace.quick_url){
        lw.innerHTML = '<a href="'+d.workspace.quick_url+'" target="_blank" style="color:#38bdf8;font-weight:700">'+d.workspace.quick_url+'</a>';
      } else lw.innerHTML = '';
    }
  }catch(e){}
}
setInterval(()=>{
  const now = new Date();
  document.getElementById('vbClock').textContent = now.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('vbDate').textContent = now.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
}, 1000);
pollInfo(true);
setInterval(()=>pollInfo(false), 2000);
resetBarTimer();
requestWake();
</script>
</body>
</html>`

// ==================== EMBEDDED HTML5 TURBO UNIVERSAL SENDER (TURNS THIS PC INTO A 2ND SCREEN!) ====================

const secondScreenSenderHTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<meta name="theme-color" content="#050811"/>
<title>Отправить экран на Luma OS (Turbo 60 FPS)</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;background:radial-gradient(circle at 25% 15%,rgba(56,189,248,.22),transparent 45%),#060a14;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;padding:18px}
  .card{width:100%;max-width:460px;background:rgba(15,23,42,.82);border:1px solid rgba(255,255,255,.15);border-radius:28px;padding:22px;backdrop-filter:blur(24px);box-shadow:0 24px 60px rgba(0,0,0,.55);display:flex;flex-direction:column;gap:14px}
  .btn{width:100%;padding:13px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.15);font-size:14px;font-weight:800;cursor:pointer;color:#fff;background:linear-gradient(135deg,#0ea5e9,#6366f1)}
  .btn.sec{background:rgba(255,255,255,.09)}
  .btn.stop{background:linear-gradient(135deg,#e11d48,#f97316)}
  video{width:100%;border-radius:16px;background:#000;max-height:220px;display:none}
  .row{display:flex;gap:8px}
  select,input{flex:1;padding:9px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.07);color:#fff;font-size:13px}
  #status{font-size:12px;color:#7dd3fc;font-family:ui-monospace,monospace}
</style>
</head>
<body>
<div class="card">
  <div>
    <div style="font-size:11px;font-weight:800;color:#34d399;text-transform:uppercase;letter-spacing:1px">Luma AirDisplay Turbo · Приёмник ПК</div>
    <h2 style="margin:6px 0 4px;font-size:20px">Транслировать на экран ПК</h2>
    <div style="font-size:12px;opacity:.75">Работает без Miracast и без установки приложений — высокий битрейт и до 60 FPS прямо из браузера.</div>
  </div>
  <input id="devName" placeholder="Имя этого устройства (например: Ноутбук / Телефон)" value="Второе устройство"/>
  <div class="row">
    <select id="fpsSel">
      <option value="30">30 FPS</option>
      <option value="45">45 FPS</option>
      <option value="60" selected>60 FPS (Turbo)</option>
    </select>
    <select id="resSel">
      <option value="1280">720p HD</option>
      <option value="1600" selected>900p HD+</option>
      <option value="1920">1080p FullHD</option>
    </select>
  </div>
  <button id="btnScreen" class="btn" onclick="startCapture('screen')">🖥️ Транслировать мой экран на ПК</button>
  <button id="btnCam" class="btn sec" onclick="startCapture('camera')">📷 Транслировать камеру на ПК</button>
  <button id="btnStop" class="btn stop" style="display:none" onclick="stopCapture()">⏹ Остановить трансляцию</button>
  <video id="preview" autoplay muted playsinline></video>
  <canvas id="capCanvas" style="display:none"></canvas>
  <div id="status">Готово к подключению</div>
</div>
<script>
let stream = null, running = false, sent = 0, inFlight = 0;
async function startCapture(kind){
  stopCapture();
  const st = document.getElementById('status');
  try{
    if(kind === 'screen' && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia){
      stream = await navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:60,max:60}}, audio:false});
    } else if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
      stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',frameRate:{ideal:60}}, audio:false});
    } else {
      st.textContent = 'Браузер ограничил захват экрана по HTTP. Откройте в Chrome/Edge на ПК или используйте камеру.';
      return;
    }
  }catch(err){
    st.textContent = 'Доступ к экрану отменён: ' + err.message;
    return;
  }
  const v = document.getElementById('preview');
  v.srcObject = stream;
  v.style.display = 'block';
  await v.play();
  document.getElementById('btnStop').style.display = 'block';
  running = true; sent = 0; inFlight = 0;
  stream.getTracks()[0].onended = stopCapture;
  loopSend();
}
function stopCapture(){
  running = false;
  if(stream){ stream.getTracks().forEach(t=>t.stop()); stream = null; }
  document.getElementById('preview').style.display = 'none';
  document.getElementById('btnStop').style.display = 'none';
  document.getElementById('status').textContent = 'Трансляция остановлена';
}
async function loopSend(){
  const v = document.getElementById('preview');
  const c = document.getElementById('capCanvas');
  const ctx = c.getContext('2d', {alpha:false});
  const sender = document.getElementById('devName').value || 'Устройство';
  while(running){
    const t0 = performance.now();
    const fps = Number(document.getElementById('fpsSel').value) || 60;
    const maxW = Number(document.getElementById('resSel').value) || 1600;
    if(v.videoWidth > 0 && v.videoHeight > 0 && inFlight < 2){
      const scale = Math.min(1, maxW / v.videoWidth);
      const nw = Math.round(v.videoWidth * scale);
      const nh = Math.round(v.videoHeight * scale);
      if(c.width !== nw || c.height !== nh){ c.width = nw; c.height = nh; }
      ctx.drawImage(v, 0, 0, nw, nh);
      const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.86));
      if(blob && running){
        inFlight++;
        fetch('/api/push-frame', {method:'POST', headers:{'Content-Type':'image/jpeg','X-Luma-Sender':sender}, body:blob})
          .then(()=>{
            sent++;
            document.getElementById('status').textContent = 'Turbo поток · ' + nw + '×' + nh + ' · кадров: ' + sent;
          })
          .catch(()=>{
            document.getElementById('status').textContent = 'Переподключение к ПК...';
          })
          .finally(()=>{ inFlight--; });
      }
    }
    const wait = Math.max(4, Math.round(1000/fps) - (performance.now()-t0));
    await new Promise(r => setTimeout(r, wait));
  }
}
</script>
</body>
</html>`
