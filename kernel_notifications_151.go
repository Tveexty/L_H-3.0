package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"html"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ==================== LUMA OS 1.5.1 (CARBON) REAL TELEGRAM & MESSENGER NOTIFICATION BRIDGE ====================
// Zero-PowerShell, Zero-Admin, Zero-WMI live OS notification listener combining:
//   1. Native Windows 10/11 WPN Toast DB + WAL reader (%LOCALAPPDATA%\Microsoft\Windows\Notifications\wpndatabase.db*)
//      catching real Telegram Desktop, Discord, WhatsApp, Viber, VK, Steam, Chrome, Edge & Windows toast alerts!
//   2. Live Win32 Window Unread-Badge Monitor (EnumWindows) catching instant Telegram "(3) Telegram",
//      Discord "• Discord", WhatsApp "(2) WhatsApp", Viber, VK, Slack, Teams unread counter rises even under Focus Assist!

type OSNotificationItem struct {
	ID        string `json:"id"`
	App       string `json:"app"`
	AppKey    string `json:"app_key"` // telegram | discord | whatsapp | vk | viber | steam | browser | mail | system
	Title     string `json:"title"`
	Body      string `json:"body"`
	Level     string `json:"level"`  // info | ok | warn | danger
	Source    string `json:"source"` // wpn_db | window_badge | manual
	Time      string `json:"time"`
	Timestamp int64  `json:"timestamp"`
}

type OSNotificationBridge struct {
	mu            sync.Mutex
	probe         *platformProbe
	items         []OSNotificationItem
	seenHashes    map[string]bool
	lastDBMod     int64
	lastWALMod    int64
	seededDB      bool
	windowUnread  map[string]int
	windowTitles  map[string]string
	activeSources []string
}

func NewOSNotificationBridge(probe *platformProbe) *OSNotificationBridge {
	b := &OSNotificationBridge{
		probe:        probe,
		items:        []OSNotificationItem{},
		seenHashes:   map[string]bool{},
		windowUnread: map[string]int{},
		windowTitles: map[string]string{},
		activeSources: []string{
			"Win32 Messenger Unread-Badge Watcher (Telegram / Discord / WhatsApp / VK / Viber)",
		},
	}
	if runtime.GOOS == "windows" {
		b.activeSources = append([]string{"Windows WPN Notification DB + WAL Live Reader"}, b.activeSources...)
	}
	// Initial seed scan without spamming old toasts as brand-new alerts
	b.scanWPNDatabase(true)
	b.scanMessengerWindows(true)
	go b.backgroundLoop()
	return b
}

func (b *OSNotificationBridge) backgroundLoop() {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		b.scanWPNDatabase(false)
		b.scanMessengerWindows(false)
	}
}

func (b *OSNotificationBridge) List(sinceTs int64) []OSNotificationItem {
	b.mu.Lock()
	defer b.mu.Unlock()
	out := make([]OSNotificationItem, 0, len(b.items))
	for _, it := range b.items {
		if sinceTs <= 0 || it.Timestamp > sinceTs {
			out = append(out, it)
		}
	}
	return out
}

func (b *OSNotificationBridge) Sources() []string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return append([]string{}, b.activeSources...)
}

func (b *OSNotificationBridge) Clear() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.items = []OSNotificationItem{}
}

func (b *OSNotificationBridge) PushManual(app, title, body, level string) OSNotificationItem {
	if strings.TrimSpace(app) == "" {
		app = "Telegram"
	}
	if strings.TrimSpace(title) == "" {
		title = "Новое сообщение"
	}
	if strings.TrimSpace(level) == "" {
		level = "info"
	}
	appName, appKey := detectMessengerApp(app + " " + title + " " + body)
	if appName == "Windows" && app != "" {
		appName = app
	}
	it := OSNotificationItem{
		ID:        fmt.Sprintf("osn_%d", time.Now().UnixNano()),
		App:       appName,
		AppKey:    appKey,
		Title:     strings.TrimSpace(title),
		Body:      strings.TrimSpace(body),
		Level:     level,
		Source:    "manual",
		Time:      time.Now().Format("15:04"),
		Timestamp: time.Now().UnixMilli(),
	}
	b.mu.Lock()
	b.items = append([]OSNotificationItem{it}, b.items...)
	if len(b.items) > 80 {
		b.items = b.items[:80]
	}
	b.mu.Unlock()
	return it
}

// Channel A: Windows 10/11 WPN Notification SQLite + WAL direct XML <toast> extractor (0 PowerShell, 0 CGo)
func (b *OSNotificationBridge) scanWPNDatabase(seedOnly bool) {
	if runtime.GOOS != "windows" {
		return
	}
	localAppData := os.Getenv("LOCALAPPDATA")
	if localAppData == "" {
		return
	}
	dir := filepath.Join(localAppData, "Microsoft", "Windows", "Notifications")
	dbPath := filepath.Join(dir, "wpndatabase.db")
	walPath := filepath.Join(dir, "wpndatabase.db-wal")

	var dbMod, walMod int64
	if st, err := os.Stat(dbPath); err == nil {
		dbMod = st.ModTime().UnixNano()
	}
	if st, err := os.Stat(walPath); err == nil {
		walMod = st.ModTime().UnixNano()
	}
	if dbMod == 0 && walMod == 0 {
		return
	}

	b.mu.Lock()
	if !seedOnly && dbMod == b.lastDBMod && walMod == b.lastWALMod {
		b.mu.Unlock()
		return
	}
	b.lastDBMod = dbMod
	b.lastWALMod = walMod
	b.mu.Unlock()

	var found []OSNotificationItem
	// Scan WAL first (freshest live toasts!), then main DB
	for _, p := range []string{walPath, dbPath} {
		raw, err := readFileHeadTail(p, 6*1024*1024)
		if err != nil || len(raw) == 0 {
			continue
		}
		found = append(found, extractToastsFromBinary(raw)...)
	}

	b.mu.Lock()
	defer b.mu.Unlock()
	seededCount := 0
	for i := len(found) - 1; i >= 0; i-- {
		it := found[i]
		fp := hashToastFingerprint(it.AppKey, it.Title, it.Body)
		if b.seenHashes[fp] {
			continue
		}
		b.seenHashes[fp] = true
		if seedOnly {
			// Seed only last 4 recent OS notifications on boot so history is populated without flood
			if seededCount < 4 {
				it.Timestamp = time.Now().UnixMilli() - int64(60000+seededCount*1000)
				b.items = append(b.items, it)
				seededCount++
			}
			continue
		}
		it.Timestamp = time.Now().UnixMilli()
		b.items = append([]OSNotificationItem{it}, b.items...)
	}
	if len(b.items) > 80 {
		b.items = b.items[:80]
	}
	b.seededDB = true
}

func readFileHeadTail(path string, maxBytes int64) ([]byte, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil {
		return nil, err
	}
	size := st.Size()
	if size <= maxBytes {
		return os.ReadFile(path)
	}
	// Read the tail of large DB/WAL files where the newest toasts live
	buf := make([]byte, maxBytes)
	n, err := f.ReadAt(buf, size-maxBytes)
	if n > 0 {
		return buf[:n], nil
	}
	return nil, err
}

func extractToastsFromBinary(raw []byte) []OSNotificationItem {
	var out []OSNotificationItem
	startTag := []byte("<toast")
	endTag := []byte("</toast>")
	pos := 0
	for pos < len(raw) {
		idx := bytes.Index(raw[pos:], startTag)
		if idx < 0 {
			break
		}
		absStart := pos + idx
		endIdx := bytes.Index(raw[absStart:], endTag)
		if endIdx < 0 || endIdx > 24*1024 {
			pos = absStart + len(startTag)
			continue
		}
		absEnd := absStart + endIdx + len(endTag)
		xmlChunk := raw[absStart:absEnd]
		// Grab surrounding 320 bytes to detect AppUserModelID (Telegram.TelegramDesktop, com.squirrel.Discord, WhatsApp, etc.)
		ctxStart := absStart - 320
		if ctxStart < 0 {
			ctxStart = 0
		}
		ctxEnd := absEnd + 220
		if ctxEnd > len(raw) {
			ctxEnd = len(raw)
		}
		contextText := string(raw[ctxStart:ctxEnd])

		texts := extractToastTextNodes(xmlChunk)
		if len(texts) > 0 {
			title := strings.TrimSpace(texts[0])
			body := ""
			if len(texts) > 1 {
				body = strings.TrimSpace(strings.Join(texts[1:], " · "))
			}
			if title != "" || body != "" {
				appName, appKey := detectMessengerApp(contextText + " " + title + " " + body)
				out = append(out, OSNotificationItem{
					ID:     fmt.Sprintf("wpn_%d_%d", time.Now().UnixNano()%10000000, len(out)),
					App:    appName,
					AppKey: appKey,
					Title:  truncateUTF8(title, 96),
					Body:   truncateUTF8(body, 220),
					Level:  "info",
					Source: "wpn_db",
					Time:   time.Now().Format("15:04"),
				})
			}
		}
		pos = absEnd
	}
	if len(out) > 40 {
		out = out[len(out)-40:]
	}
	return out
}

func extractToastTextNodes(xmlBytes []byte) []string {
	dec := xml.NewDecoder(bytes.NewReader(xmlBytes))
	var texts []string
	inText := false
	var buf strings.Builder
	for {
		tok, err := dec.Token()
		if err != nil {
			break
		}
		switch t := tok.(type) {
		case xml.StartElement:
			if strings.EqualFold(t.Name.Local, "text") {
				inText = true
				buf.Reset()
			}
		case xml.CharData:
			if inText {
				buf.Write(t)
			}
		case xml.EndElement:
			if strings.EqualFold(t.Name.Local, "text") && inText {
				inText = false
				s := strings.TrimSpace(html.UnescapeString(buf.String()))
				if s != "" {
					texts = append(texts, s)
				}
			}
		}
	}
	return texts
}

// Channel B: Live Messenger Window Unread-Badge Watcher (Telegram, Discord, WhatsApp, VK, Viber, Slack, Teams, Steam)
var unreadParenRe = regexp.MustCompile(`\((\d+)\)`)

func (b *OSNotificationBridge) scanMessengerWindows(seedOnly bool) {
	if b.probe == nil {
		return
	}
	wins := b.probe.ListOpenWindows()
	if len(wins) == 0 {
		return
	}

	b.mu.Lock()
	defer b.mu.Unlock()

	for _, w := range wins {
		lowProc := strings.ToLower(w.Name + " " + w.FriendlyName)
		lowTitle := strings.ToLower(w.Title)
		appName, appKey := matchMessengerProcess(lowProc, lowTitle)
		if appKey == "" {
			continue
		}

		unread := 0
		if m := unreadParenRe.FindStringSubmatch(w.Title); len(m) == 2 {
			unread, _ = strconv.Atoi(m[1])
		} else if strings.HasPrefix(w.Title, "•") || strings.Contains(w.Title, "• ") || strings.Contains(w.Title, "* ") {
			unread = 1
		}

		key := fmt.Sprintf("%s_%d", appKey, w.PID)
		prevCount, hadPrev := b.windowUnread[key]
		prevTitle := b.windowTitles[key]
		b.windowUnread[key] = unread
		b.windowTitles[key] = w.Title

		if seedOnly || !hadPrev {
			continue
		}

		if unread > prevCount || (unread > 0 && w.Title != prevTitle) {
			delta := unread - prevCount
			if delta < 1 {
				delta = 1
			}
			cleanTitle := strings.TrimSpace(unreadParenRe.ReplaceAllString(w.Title, ""))
			cleanTitle = strings.TrimLeft(cleanTitle, "•* -")
			if cleanTitle == "" {
				cleanTitle = appName
			}
			body := fmt.Sprintf("Новое сообщение (%d непрочит.) · %s", unread, cleanTitle)
			if delta == 1 && unread == 1 {
				body = fmt.Sprintf("Новое входящее сообщение · %s", cleanTitle)
			}
			it := OSNotificationItem{
				ID:        fmt.Sprintf("msg_%d", time.Now().UnixNano()),
				App:       appName,
				AppKey:    appKey,
				Title:     fmt.Sprintf("%s — новое сообщение", appName),
				Body:      truncateUTF8(body, 180),
				Level:     "info",
				Source:    "window_badge",
				Time:      time.Now().Format("15:04"),
				Timestamp: time.Now().UnixMilli(),
			}
			b.items = append([]OSNotificationItem{it}, b.items...)
			if len(b.items) > 80 {
				b.items = b.items[:80]
			}
		}
	}
}

func matchMessengerProcess(lowProc, lowTitle string) (string, string) {
	switch {
	case strings.Contains(lowProc, "telegram") || strings.Contains(lowProc, "ayugram") || strings.Contains(lowProc, "kotatogram") || strings.Contains(lowTitle, "telegram"):
		return "Telegram", "telegram"
	case strings.Contains(lowProc, "discord") || strings.Contains(lowTitle, "discord"):
		return "Discord", "discord"
	case strings.Contains(lowProc, "whatsapp") || strings.Contains(lowTitle, "whatsapp"):
		return "WhatsApp", "whatsapp"
	case strings.Contains(lowProc, "viber") || strings.Contains(lowTitle, "viber"):
		return "Viber", "viber"
	case strings.Contains(lowProc, "vk") || strings.Contains(lowTitle, "вконтакте") || strings.Contains(lowTitle, "vk messenger"):
		return "VK Мессенджер", "vk"
	case strings.Contains(lowProc, "slack") || strings.Contains(lowTitle, "slack"):
		return "Slack", "slack"
	case strings.Contains(lowProc, "teams") || strings.Contains(lowTitle, "microsoft teams"):
		return "Teams", "teams"
	case strings.Contains(lowProc, "signal") || strings.Contains(lowProc, "element"):
		return "Messenger", "telegram"
	case strings.Contains(lowProc, "steam") && (strings.Contains(lowTitle, "чат") || strings.Contains(lowTitle, "chat") || strings.Contains(lowTitle, "friends")):
		return "Steam", "steam"
	}
	return "", ""
}

func detectMessengerApp(ctx string) (string, string) {
	l := strings.ToLower(ctx)
	switch {
	case strings.Contains(l, "telegram") || strings.Contains(l, "ayugram") || strings.Contains(l, "tdesktop"):
		return "Telegram", "telegram"
	case strings.Contains(l, "discord"):
		return "Discord", "discord"
	case strings.Contains(l, "whatsapp"):
		return "WhatsApp", "whatsapp"
	case strings.Contains(l, "viber"):
		return "Viber", "viber"
	case strings.Contains(l, "vk.com") || strings.Contains(l, "вконтакте") || strings.Contains(l, "vkontakte") || strings.Contains(l, "vk messenger"):
		return "VK", "vk"
	case strings.Contains(l, "slack"):
		return "Slack", "slack"
	case strings.Contains(l, "teams"):
		return "Teams", "teams"
	case strings.Contains(l, "steam"):
		return "Steam", "steam"
	case strings.Contains(l, "chrome"):
		return "Chrome", "browser"
	case strings.Contains(l, "msedge") || strings.Contains(l, "edge"):
		return "Edge", "browser"
	case strings.Contains(l, "firefox"):
		return "Firefox", "browser"
	case strings.Contains(l, "outlook") || strings.Contains(l, "mail") || strings.Contains(l, "gmail") || strings.Contains(l, "thunderbird"):
		return "Почта", "mail"
	case strings.Contains(l, "spotify") || strings.Contains(l, "яндекс музыка"):
		return "Музыка", "system"
	default:
		return "Windows", "system"
	}
}

func hashToastFingerprint(appKey, title, body string) string {
	sum := sha256.Sum256([]byte(appKey + "|" + title + "|" + body))
	return hex.EncodeToString(sum[:12])
}
