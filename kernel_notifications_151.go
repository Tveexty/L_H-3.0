package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"html"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
	"unicode/utf16"
)

// ==================== LUMA OS 1.5.2 (CARBON) TRUE INCOMING MESSENGER NOTIFICATION BRIDGE ====================
// Zero-PowerShell, Zero-Admin, Zero-WMI live OS notification listener:
//   - Direct Windows 10/11 WPN Toast DB + WAL XML extractor (%LOCALAPPDATA%\Microsoft\Windows\Notifications\wpndatabase.db*)
//     parsing BOTH UTF-8 and UTF-16LE <toast> payloads, real sender names, real message bodies, AND circular user avatars (<image src>).
//   - Strict incoming-only filter: NEVER spams generic unread counters ("3048413 непрочит.") or outgoing/system noise!

type OSNotificationItem struct {
	ID        string `json:"id"`
	App       string `json:"app"`
	AppKey    string `json:"app_key"` // telegram | discord | whatsapp | vk | viber | steam | slack | teams | mail | browser | system
	Sender    string `json:"sender"`
	Chat      string `json:"chat,omitempty"`
	Title     string `json:"title"`
	Body      string `json:"body"`
	AvatarURL string `json:"avatar_url,omitempty"`
	Direction string `json:"direction"` // incoming
	Level     string `json:"level"`     // info | ok | warn | danger
	Source    string `json:"source"`    // wpn_db | manual
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
	activeSources []string
}

func NewOSNotificationBridge(probe *platformProbe) *OSNotificationBridge {
	b := &OSNotificationBridge{
		probe:      probe,
		items:      []OSNotificationItem{},
		seenHashes: map[string]bool{},
		activeSources: []string{
			"Incoming Messenger Filter (Only real user messages, zero unread-badge spam)",
		},
	}
	if runtime.GOOS == "windows" {
		b.activeSources = append([]string{"Windows WPN Notification DB + WAL Direct Toast & Avatar Reader"}, b.activeSources...)
	}
	// Seed existing DB entries on startup without flooding old notifications as brand-new alerts
	b.scanWPNDatabase(true)
	go b.backgroundLoop()
	return b
}

func (b *OSNotificationBridge) backgroundLoop() {
	ticker := time.NewTicker(1500 * time.Millisecond)
	defer ticker.Stop()
	for range ticker.C {
		b.scanWPNDatabase(false)
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
		title = "Пользователь"
	}
	if strings.TrimSpace(level) == "" {
		level = "info"
	}
	appName, appKey := detectMessengerApp(app + " " + title + " " + body)
	if appName == "Windows" && app != "" {
		appName = app
	}
	cleanTitle := strings.TrimSpace(title)
	sender, chat := splitSenderAndChat(cleanTitle)
	it := OSNotificationItem{
		ID:        fmt.Sprintf("osn_%d", time.Now().UnixNano()),
		App:       appName,
		AppKey:    appKey,
		Sender:    sender,
		Chat:      chat,
		Title:     cleanTitle,
		Body:      strings.TrimSpace(body),
		Direction: "incoming",
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
// Reads real incoming messages with sender name, message body, and circular user avatar!
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
	// Scan WAL first (freshest real-time toasts!), then main DB
	for _, p := range []string{walPath, dbPath} {
		raw, err := readFileHeadTail(p, 8*1024*1024)
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
			// Seed only last 5 recent incoming messenger messages on boot
			if seededCount < 5 {
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
	buf := make([]byte, maxBytes)
	n, err := f.ReadAt(buf, size-maxBytes)
	if n > 0 {
		return buf[:n], nil
	}
	return nil, err
}

func extractToastsFromBinary(raw []byte) []OSNotificationItem {
	var out []OSNotificationItem
	// 1. Scan UTF-8 <toast>...</toast>
	out = append(out, scanUTF8Toasts(raw)...)
	// 2. Also scan UTF-16LE <toast>...</toast> (used by some UWP / WhatsApp / Teams notifications)
	out = append(out, scanUTF16LEToasts(raw)...)

	if len(out) > 40 {
		out = out[len(out)-40:]
	}
	return out
}

func scanUTF8Toasts(raw []byte) []OSNotificationItem {
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
		if endIdx < 0 || endIdx > 28*1024 {
			pos = absStart + len(startTag)
			continue
		}
		absEnd := absStart + endIdx + len(endTag)
		xmlChunk := raw[absStart:absEnd]
		ctxStart := absStart - 420
		if ctxStart < 0 {
			ctxStart = 0
		}
		ctxEnd := absEnd + 260
		if ctxEnd > len(raw) {
			ctxEnd = len(raw)
		}
		if item, ok := parseToastChunk(xmlChunk, string(raw[ctxStart:ctxEnd]), len(out)); ok {
			out = append(out, item)
		}
		pos = absEnd
	}
	return out
}

func scanUTF16LEToasts(raw []byte) []OSNotificationItem {
	var out []OSNotificationItem
	startTag := encodeUTF16LE("<toast")
	endTag := encodeUTF16LE("</toast>")
	pos := 0
	for pos < len(raw) {
		idx := bytes.Index(raw[pos:], startTag)
		if idx < 0 {
			break
		}
		absStart := pos + idx
		endIdx := bytes.Index(raw[absStart:], endTag)
		if endIdx < 0 || endIdx > 56*1024 {
			pos = absStart + len(startTag)
			continue
		}
		absEnd := absStart + endIdx + len(endTag)
		utf8XML := decodeUTF16LE(raw[absStart:absEnd])
		ctxStart := absStart - 512
		if ctxStart < 0 {
			ctxStart = 0
		}
		ctxEnd := absEnd + 320
		if ctxEnd > len(raw) {
			ctxEnd = len(raw)
		}
		ctxStr := decodeUTF16LE(raw[ctxStart:ctxEnd]) + " " + string(raw[ctxStart:ctxEnd])
		if item, ok := parseToastChunk([]byte(utf8XML), ctxStr, len(out)+1000); ok {
			out = append(out, item)
		}
		pos = absEnd
	}
	return out
}

func encodeUTF16LE(s string) []byte {
	u := utf16.Encode([]rune(s))
	b := make([]byte, len(u)*2)
	for i, v := range u {
		b[i*2] = byte(v)
		b[i*2+1] = byte(v >> 8)
	}
	return b
}

func decodeUTF16LE(b []byte) string {
	n := len(b) / 2
	if n == 0 {
		return ""
	}
	u := make([]uint16, n)
	for i := 0; i < n; i++ {
		u[i] = uint16(b[i*2]) | (uint16(b[i*2+1]) << 8)
	}
	return string(utf16.Decode(u))
}

func parseToastChunk(xmlChunk []byte, contextText string, seq int) (OSNotificationItem, bool) {
	texts, avatarSrc := extractToastDetails(xmlChunk)
	if len(texts) == 0 {
		return OSNotificationItem{}, false
	}

	title := strings.TrimSpace(texts[0])
	body := ""
	chat := ""
	if len(texts) == 2 {
		body = strings.TrimSpace(texts[1])
	} else if len(texts) >= 3 {
		// Many Telegram/WhatsApp/Discord toasts put: [0]=Sender or Group, [1]=Message, [2]=Account/Channel
		body = strings.TrimSpace(texts[1])
		extra := strings.TrimSpace(texts[2])
		if extra != "" && len(extra) < 64 && !strings.EqualFold(extra, title) {
			chat = extra
		}
	}

	// Strictly filter to REAL incoming user/messenger messages!
	// Ignore empty bodies, outgoing self-messages, system sync/update alerts, and generic unread counts.
	if title == "" || body == "" {
		return OSNotificationItem{}, false
	}
	if !isIncomingUserMessage(title, body, contextText) {
		return OSNotificationItem{}, false
	}

	appName, appKey := detectMessengerApp(contextText + " " + title + " " + body)
	// Only accept real messaging/communication notifications from WPN (not random Windows telemetry/updates)
	if !isAllowedMessengerApp(appKey) {
		return OSNotificationItem{}, false
	}

	sender, parsedChat := splitSenderAndChat(title)
	if chat == "" {
		chat = parsedChat
	}
	displayTitle := sender
	if chat != "" && !strings.Contains(sender, "→") {
		displayTitle = sender + " → " + chat
	}

	avatarData := loadToastAvatarDataURI(avatarSrc)

	return OSNotificationItem{
		ID:        fmt.Sprintf("wpn_%d_%d", time.Now().UnixNano()%10000000, seq),
		App:       appName,
		AppKey:    appKey,
		Sender:    truncateUTF8(sender, 64),
		Chat:      truncateUTF8(chat, 64),
		Title:     truncateUTF8(displayTitle, 96),
		Body:      truncateUTF8(body, 260),
		AvatarURL: avatarData,
		Direction: "incoming",
		Level:     "info",
		Source:    "wpn_db",
		Time:      time.Now().Format("15:04"),
	}, true
}

func isAllowedMessengerApp(appKey string) bool {
	switch appKey {
	case "telegram", "discord", "whatsapp", "viber", "vk", "slack", "teams", "steam", "mail":
		return true
	default:
		return false
	}
}

func isIncomingUserMessage(title, body, ctx string) bool {
	lt := strings.ToLower(strings.TrimSpace(title))
	lb := strings.ToLower(strings.TrimSpace(body))
	lc := strings.ToLower(ctx)

	// Block outgoing / self-sent prefixes
	outgoingPrefixes := []string{
		"вы:", "you:", "me:", "я:", "sent ", "отправлено", "delivered", "доставлено",
		"uploading", "downloading", "загрузка", "скачивание", "синхронизация", "syncing",
	}
	for _, p := range outgoingPrefixes {
		if strings.HasPrefix(lb, p) || strings.HasPrefix(lt, p) {
			return false
		}
	}

	// Block generic unread-counter & system/maintenance banners
	noisePhrases := []string{
		"непрочит", "unread messages", "new messages", "новое сообщение (",
		"update available", "доступно обновление", "restarting", "connected",
		"подключено", "windows security", "windows update", "onedrive", "defender",
		"backup complete", "резервное копирование", "battery", "usb device",
		"typing...", "печатает...", "recording voice", "записывает голосовое",
	}
	for _, n := range noisePhrases {
		if strings.Contains(lb, n) || strings.Contains(lt, n) {
			return false
		}
	}
	if strings.Contains(lc, "windows.systemtoast") && !strings.Contains(lc, "telegram") && !strings.Contains(lc, "whatsapp") && !strings.Contains(lc, "discord") {
		return false
	}
	return true
}

func splitSenderAndChat(raw string) (string, string) {
	for _, sep := range []string{" → ", " -> ", " — ", " | ", ": "} {
		if idx := strings.Index(raw, sep); idx > 0 {
			left := strings.TrimSpace(raw[:idx])
			right := strings.TrimSpace(raw[idx+len(sep):])
			if left != "" && right != "" {
				return left, right
			}
		}
	}
	return strings.TrimSpace(raw), ""
}

func extractToastDetails(xmlBytes []byte) ([]string, string) {
	dec := xml.NewDecoder(bytes.NewReader(xmlBytes))
	var texts []string
	var avatarSrc string
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
			} else if strings.EqualFold(t.Name.Local, "image") {
				var src, placement string
				for _, attr := range t.Attr {
					if strings.EqualFold(attr.Name.Local, "src") {
						src = strings.TrimSpace(attr.Value)
					} else if strings.EqualFold(attr.Name.Local, "placement") {
						placement = strings.ToLower(strings.TrimSpace(attr.Value))
					}
				}
				if src != "" && (avatarSrc == "" || placement == "applogooverride") {
					avatarSrc = src
				}
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
	return texts, avatarSrc
}

func loadToastAvatarDataURI(src string) string {
	src = strings.TrimSpace(src)
	if src == "" {
		return ""
	}
	if strings.HasPrefix(src, "data:image/") {
		return src
	}
	localPath := src
	if strings.HasPrefix(strings.ToLower(src), "file://") {
		if u, err := url.Parse(src); err == nil {
			localPath = u.Path
			if runtime.GOOS == "windows" && strings.HasPrefix(localPath, "/") && len(localPath) > 2 && localPath[2] == ':' {
				localPath = localPath[1:]
			}
			localPath = filepath.FromSlash(localPath)
		}
	}
	st, err := os.Stat(localPath)
	if err != nil || st.IsDir() || st.Size() == 0 || st.Size() > 256*1024 {
		return ""
	}
	raw, err := os.ReadFile(localPath)
	if err != nil || len(raw) == 0 {
		return ""
	}
	mime := "image/png"
	low := strings.ToLower(localPath)
	if strings.HasSuffix(low, ".jpg") || strings.HasSuffix(low, ".jpeg") {
		mime = "image/jpeg"
	} else if strings.HasSuffix(low, ".webp") {
		mime = "image/webp"
	} else if strings.HasSuffix(low, ".gif") {
		mime = "image/gif"
	}
	return "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(raw)
}

func detectMessengerApp(ctx string) (string, string) {
	l := strings.ToLower(ctx)
	switch {
	case strings.Contains(l, "telegram") || strings.Contains(l, "ayugram") || strings.Contains(l, "kotatogram") || strings.Contains(l, "tdesktop"):
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
	case strings.Contains(l, "signal"):
		return "Signal", "telegram"
	case strings.Contains(l, "outlook") || strings.Contains(l, "mail") || strings.Contains(l, "gmail") || strings.Contains(l, "thunderbird"):
		return "Почта", "mail"
	case strings.Contains(l, "chrome"):
		return "Chrome", "browser"
	case strings.Contains(l, "msedge") || strings.Contains(l, "edge"):
		return "Edge", "browser"
	case strings.Contains(l, "firefox"):
		return "Firefox", "browser"
	default:
		return "Windows", "system"
	}
}

func hashToastFingerprint(appKey, title, body string) string {
	sum := sha256.Sum256([]byte(appKey + "|" + title + "|" + body))
	return hex.EncodeToString(sum[:12])
}
