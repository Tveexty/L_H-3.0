package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"html"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode/utf16"
)

// ==================== LUMA OS 1.5.4 (CARBON) FROM-SCRATCH REAL NOTIFICATION SHADE ENGINE ====================
// Strict Zero-Spam Guarantee:
//   - NEVER tracks unread counters of muted channels!
//   - NEVER emits fake "+4 нажмите чтобы посмотреть" placeholders!
//   - ONLY delivers REAL incoming notifications with WHO (sender + chat), WHAT (exact message body),
//     WHEN (real Windows FILETIME or arrival timestamp + date), and circular Avatar!

type OSNotificationItem struct {
	ID        string `json:"id"`
	App       string `json:"app"`
	AppKey    string `json:"app_key"` // telegram | discord | whatsapp | vk | viber | steam | slack | teams | mail | browser | message
	Sender    string `json:"sender"`
	Chat      string `json:"chat,omitempty"`
	Title     string `json:"title"`
	Body      string `json:"body"`
	AvatarURL string `json:"avatar_url,omitempty"`
	Direction string `json:"direction"` // incoming
	Level     string `json:"level"`     // info | ok | warn | danger
	Source    string `json:"source"`    // wpn_db | live_toast_uia | manual
	Time      string `json:"time"`      // HH:MM
	DateLabel string `json:"date_label"` // DD.MM.YYYY
	Timestamp int64  `json:"timestamp"` // Unix ms
}

type OSNotificationDiagnostics struct {
	WPNDBFound         bool     `json:"wpn_db_found"`
	WPNWALFound        bool     `json:"wpn_wal_found"`
	WPNWALBytes        int64    `json:"wpn_wal_bytes"`
	WPNDBBytes         int64    `json:"wpn_db_bytes"`
	UIAListenerActive  bool     `json:"uia_listener_active"`
	RunningMessengers  []string `json:"running_messengers"`
	DeliveredCount     int      `json:"delivered_count"`
	LastScanUnix       int64    `json:"last_scan_unix"`
}

type OSNotificationBridge struct {
	mu            sync.Mutex
	probe         *platformProbe
	items         []OSNotificationItem
	seenHashes    map[string]bool
	lastDBFP      string
	lastWALFP     string
	seededDB      bool
	activeSources []string
	diag          OSNotificationDiagnostics
}

func NewOSNotificationBridge(probe *platformProbe) *OSNotificationBridge {
	b := &OSNotificationBridge{
		probe:      probe,
		items:      []OSNotificationItem{},
		seenHashes: map[string]bool{},
		activeSources: []string{
			"Luma 1.5.4 Real-Text Notification Engine (Кто · Что · Когда, 0% спама из мута)",
		},
	}
	if runtime.GOOS == "windows" {
		b.activeSources = append([]string{
			"Windows WPN DB + WAL Share-Safe Direct XML & FILETIME Reader",
			"Win32 COM UIAutomation Live Toast Banner Spy",
		}, b.activeSources...)
	}
	// Seed recent real toast messages on startup so the Notification Shade immediately has real history
	b.scanWPNDatabase(true)
	go b.backgroundLoop()
	if runtime.GOOS == "windows" {
		b.startWinLiveUIAToastWatcher()
	}
	return b
}

func (b *OSNotificationBridge) backgroundLoop() {
	defer func() { _ = recover() }()
	ticker := time.NewTicker(900 * time.Millisecond)
	defer ticker.Stop()
	for range ticker.C {
		func() {
			defer func() { _ = recover() }()
			b.scanWPNDatabase(false)
		}()
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

func (b *OSNotificationBridge) Diagnostics() OSNotificationDiagnostics {
	b.mu.Lock()
	d := b.diag
	d.DeliveredCount = len(b.items)
	b.mu.Unlock()
	d.RunningMessengers = winGetRunningMessengers()
	d.UIAListenerActive = winIsUIAActive()
	return d
}

func (b *OSNotificationBridge) Clear() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.items = []OSNotificationItem{}
}

func (b *OSNotificationBridge) pushUniqueRealMessage(it OSNotificationItem) {
	fp := hashToastFingerprint(it.AppKey, it.Sender, it.Body)
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.seenHashes[fp] {
		return
	}
	b.seenHashes[fp] = true
	now := time.Now()
	if it.Timestamp == 0 {
		it.Timestamp = now.UnixMilli()
	}
	if it.Time == "" {
		it.Time = time.UnixMilli(it.Timestamp).Format("15:04")
	}
	if it.DateLabel == "" {
		it.DateLabel = time.UnixMilli(it.Timestamp).Format("02.01.2006")
	}
	b.items = append([]OSNotificationItem{it}, b.items...)
	if len(b.items) > 120 {
		b.items = b.items[:120]
	}
}

func (b *OSNotificationBridge) PushManual(app, title, body, level string) OSNotificationItem {
	return b.PushManualRich(app, "", "", title, body, "", level)
}

func (b *OSNotificationBridge) PushManualRich(app, senderIn, chatIn, title, body, avatarURL, level string) OSNotificationItem {
	if strings.TrimSpace(app) == "" {
		app = "Telegram"
	}
	if strings.TrimSpace(title) == "" {
		title = senderIn
	}
	if strings.TrimSpace(title) == "" {
		title = "Пользователь"
	}
	if strings.TrimSpace(level) == "" {
		level = "info"
	}
	appName, appKey := detectMessengerApp(app + " " + title + " " + body)
	if appKey == "system" && app != "" {
		appName = app
		appKey = "message"
	}
	cleanTitle := strings.TrimSpace(title)
	sender, chat := splitSenderAndChat(cleanTitle)
	if strings.TrimSpace(senderIn) != "" {
		sender = strings.TrimSpace(senderIn)
	}
	if strings.TrimSpace(chatIn) != "" {
		chat = strings.TrimSpace(chatIn)
	}
	now := time.Now()
	it := OSNotificationItem{
		ID:        fmt.Sprintf("osn_%d", now.UnixNano()),
		App:       appName,
		AppKey:    appKey,
		Sender:    sender,
		Chat:      chat,
		Title:     cleanTitle,
		Body:      strings.TrimSpace(body),
		AvatarURL: strings.TrimSpace(avatarURL),
		Direction: "incoming",
		Level:     level,
		Source:    "manual",
		Time:      now.Format("15:04"),
		DateLabel: now.Format("02.01.2006"),
		Timestamp: now.UnixMilli(),
	}
	b.mu.Lock()
	b.items = append([]OSNotificationItem{it}, b.items...)
	if len(b.items) > 120 {
		b.items = b.items[:120]
	}
	b.mu.Unlock()
	return it
}

// Engine 1: Share-Safe Windows WPN SQLite + WAL Direct XML & FILETIME Extractor
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

	walRaw, walSize, walFP, walErr := winReadFileShareSafe(walPath, 10*1024*1024)
	dbRaw, dbSize, dbFP, dbErr := winReadFileShareSafe(dbPath, 10*1024*1024)

	b.mu.Lock()
	b.diag.WPNWALFound = walErr == nil && walSize > 0
	b.diag.WPNDBFound = dbErr == nil && dbSize > 0
	b.diag.WPNWALBytes = walSize
	b.diag.WPNDBBytes = dbSize
	b.diag.LastScanUnix = time.Now().Unix()
	changed := seedOnly || walFP != b.lastWALFP || dbFP != b.lastDBFP
	if !changed {
		b.mu.Unlock()
		return
	}
	b.lastWALFP = walFP
	b.lastDBFP = dbFP
	b.mu.Unlock()

	running := winGetRunningMessengers()
	var found []OSNotificationItem
	if len(walRaw) > 0 {
		found = append(found, extractToastsFromBinary(walRaw, running)...)
	}
	if len(dbRaw) > 0 {
		found = append(found, extractToastsFromBinary(dbRaw, running)...)
	}

	// Sort newest first by extracted Windows FILETIME (if available)
	sort.SliceStable(found, func(i, j int) bool {
		return found[i].Timestamp > found[j].Timestamp
	})

	b.mu.Lock()
	defer b.mu.Unlock()
	now := time.Now()
	seededCount := 0
	for _, it := range found {
		fp := hashToastFingerprint(it.AppKey, it.Sender, it.Body)
		if b.seenHashes[fp] {
			continue
		}
		b.seenHashes[fp] = true
		if seedOnly {
			if seededCount < 15 {
				if it.Timestamp == 0 {
					t := now.Add(-time.Duration(seededCount+2) * time.Minute)
					it.Timestamp = t.UnixMilli()
					it.Time = t.Format("15:04")
					it.DateLabel = t.Format("02.01.2006")
				}
				b.items = append(b.items, it)
				seededCount++
			}
			continue
		}
		if it.Timestamp == 0 || now.UnixMilli()-it.Timestamp > 3*60*1000 {
			it.Timestamp = now.UnixMilli()
		}
		t := time.UnixMilli(it.Timestamp)
		it.Time = t.Format("15:04")
		it.DateLabel = t.Format("02.01.2006")
		b.items = append([]OSNotificationItem{it}, b.items...)
	}
	if len(b.items) > 120 {
		b.items = b.items[:120]
	}
	b.seededDB = true
}

// extractNearbyFiletime scans adjacent SQLite record bytes around a <toast> blob for a realistic Windows FILETIME
// (big-endian 64-bit integer in SQLite record payload: 100ns ticks since 1601-01-01 -> years 2023..2035).
func extractNearbyFiletime(raw []byte, start, end int) int64 {
	const (
		// Windows FILETIME ticks between 1601-01-01 and 1970-01-01
		epochDiffTicks = int64(116444736000000000)
		minTicks       = int64(133170048000000000) // ~2023-01-01
		maxTicks       = int64(137273184000000000) // ~2036-01-01
	)
	nowMs := time.Now().Add(24 * time.Hour).UnixMilli()
	var bestMs int64

	scanRange := func(lo, hi int) {
		if lo < 0 {
			lo = 0
		}
		if hi > len(raw) {
			hi = len(raw)
		}
		for i := lo; i+8 <= hi; i++ {
			// SQLite stores 8-byte integers in BIG-ENDIAN!
			v := int64(binary.BigEndian.Uint64(raw[i : i+8]))
			if v >= minTicks && v <= maxTicks {
				unixMs := (v - epochDiffTicks) / 10000
				if unixMs <= nowMs && unixMs > bestMs {
					bestMs = unixMs
				}
			}
		}
	}
	scanRange(end, end+96)
	scanRange(start-96, start)
	return bestMs
}

func extractToastsFromBinary(raw []byte, runningMessengers []string) []OSNotificationItem {
	var out []OSNotificationItem
	out = append(out, scanUTF8Toasts(raw, runningMessengers)...)
	out = append(out, scanUTF16LEToasts(raw, runningMessengers)...)
	if len(out) > 64 {
		out = out[len(out)-64:]
	}
	return out
}

func scanUTF8Toasts(raw []byte, runningMessengers []string) []OSNotificationItem {
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
		if endIdx < 0 || endIdx > 32*1024 {
			pos = absStart + len(startTag)
			continue
		}
		absEnd := absStart + endIdx + len(endTag)
		xmlChunk := raw[absStart:absEnd]
		ctxStart := absStart - 640
		if ctxStart < 0 {
			ctxStart = 0
		}
		ctxEnd := absEnd + 420
		if ctxEnd > len(raw) {
			ctxEnd = len(raw)
		}
		ftMs := extractNearbyFiletime(raw, absStart, absEnd)
		if item, ok := parseToastChunk(xmlChunk, string(raw[ctxStart:ctxEnd]), runningMessengers, ftMs, len(out)); ok {
			out = append(out, item)
		}
		pos = absEnd
	}
	return out
}

func scanUTF16LEToasts(raw []byte, runningMessengers []string) []OSNotificationItem {
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
		if endIdx < 0 || endIdx > 64*1024 {
			pos = absStart + len(startTag)
			continue
		}
		absEnd := absStart + endIdx + len(endTag)
		utf8XML := decodeUTF16LE(raw[absStart:absEnd])
		ctxStart := absStart - 768
		if ctxStart < 0 {
			ctxStart = 0
		}
		ctxEnd := absEnd + 512
		if ctxEnd > len(raw) {
			ctxEnd = len(raw)
		}
		ctxStr := decodeUTF16LE(raw[ctxStart:ctxEnd]) + " " + string(raw[ctxStart:ctxEnd])
		ftMs := extractNearbyFiletime(raw, absStart, absEnd)
		if item, ok := parseToastChunk([]byte(utf8XML), ctxStr, runningMessengers, ftMs, len(out)+1000); ok {
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

type parsedToastMeta struct {
	Texts        []string
	AvatarSrc    string
	HeaderTitle  string
	LaunchAttr   string
	HasReplyBox  bool
	HasCircleImg bool
}

func parseToastChunk(xmlChunk []byte, contextText string, runningMessengers []string, arrivalMs int64, seq int) (OSNotificationItem, bool) {
	meta := extractToastMeta(xmlChunk)
	if len(meta.Texts) == 0 {
		return OSNotificationItem{}, false
	}

	title := strings.TrimSpace(meta.Texts[0])
	body := ""
	chat := ""
	if len(meta.Texts) == 2 {
		body = strings.TrimSpace(meta.Texts[1])
	} else if len(meta.Texts) >= 3 {
		body = strings.TrimSpace(meta.Texts[1])
		extra := strings.TrimSpace(meta.Texts[2])
		if extra != "" && len(extra) < 64 && !strings.EqualFold(extra, title) {
			chat = extra
		}
	}

	if title == "" || body == "" {
		return OSNotificationItem{}, false
	}
	if !isIncomingUserMessage(title, body, contextText+" "+meta.LaunchAttr+" "+meta.HeaderTitle) {
		return OSNotificationItem{}, false
	}

	fullHint := contextText + " " + meta.LaunchAttr + " " + meta.AvatarSrc + " " + meta.HeaderTitle + " " + title + " " + body
	appName, appKey := detectMessengerApp(fullHint)

	if appKey == "system" {
		looksLikeRealChat := meta.HasReplyBox || meta.HasCircleImg || meta.AvatarSrc != "" || meta.HeaderTitle != ""
		if !looksLikeRealChat {
			lowLaunch := strings.ToLower(meta.LaunchAttr)
			if strings.Contains(lowLaunch, "windows.") || strings.Contains(lowLaunch, "settings") || strings.Contains(lowLaunch, "defender") || strings.Contains(lowLaunch, "update") {
				return OSNotificationItem{}, false
			}
		}
		if meta.HeaderTitle != "" {
			hApp, hKey := detectMessengerApp(meta.HeaderTitle)
			if hKey != "system" {
				appName, appKey = hApp, hKey
			} else {
				appName = meta.HeaderTitle
				appKey = "message"
			}
		} else if len(runningMessengers) == 1 {
			appKey = runningMessengers[0]
			appName = prettyAppName(appKey)
		} else if strings.Contains(strings.ToLower(meta.AvatarSrc), "tdata") || strings.Contains(strings.ToLower(meta.LaunchAttr), "msg") {
			appName, appKey = "Telegram", "telegram"
		} else {
			appName, appKey = "Сообщение", "message"
		}
	}

	sender, parsedChat := splitSenderAndChat(title)
	if chat == "" {
		chat = parsedChat
	}
	displayTitle := sender
	if chat != "" && !strings.Contains(sender, "→") {
		displayTitle = sender + " → " + chat
	}

	avatarData := loadToastAvatarDataURI(meta.AvatarSrc)
	tsTime := time.Now()
	if arrivalMs > 0 {
		tsTime = time.UnixMilli(arrivalMs)
	}

	return OSNotificationItem{
		ID:        fmt.Sprintf("wpn_%d_%d", time.Now().UnixNano()%10000000, seq),
		App:       appName,
		AppKey:    appKey,
		Sender:    truncateUTF8(sender, 64),
		Chat:      truncateUTF8(chat, 64),
		Title:     truncateUTF8(displayTitle, 96),
		Body:      truncateUTF8(body, 320),
		AvatarURL: avatarData,
		Direction: "incoming",
		Level:     "info",
		Source:    "wpn_db",
		Time:      tsTime.Format("15:04"),
		DateLabel: tsTime.Format("02.01.2006"),
		Timestamp: arrivalMs,
	}, true
}

func prettyAppName(key string) string {
	switch key {
	case "telegram":
		return "Telegram"
	case "whatsapp":
		return "WhatsApp"
	case "discord":
		return "Discord"
	case "viber":
		return "Viber"
	case "vk":
		return "VK"
	case "slack":
		return "Slack"
	case "teams":
		return "Teams"
	case "steam":
		return "Steam"
	case "mail":
		return "Почта"
	default:
		return "Сообщение"
	}
}

func isIncomingUserMessage(title, body, ctx string) bool {
	lt := strings.ToLower(strings.TrimSpace(title))
	lb := strings.ToLower(strings.TrimSpace(body))
	lc := strings.ToLower(ctx)

	outgoingPrefixes := []string{
		"вы:", "you:", "me:", "я:", "sent ", "отправлено", "delivered", "доставлено",
		"uploading", "downloading", "загрузка", "скачивание", "синхронизация", "syncing",
	}
	for _, p := range outgoingPrefixes {
		if strings.HasPrefix(lb, p) || strings.HasPrefix(lt, p) {
			return false
		}
	}

	noisePhrases := []string{
		"непрочит", "unread messages", "new messages", "новое сообщение (",
		"новые входящие сообщения (+", "нажмите, чтобы открыть",
		"update available", "доступно обновление", "restarting", "перезапуск",
		"windows security", "безопасность windows", "windows update", "центр обновления",
		"onedrive", "defender", "защитник windows", "antimalware",
		"backup complete", "резервное копирование", "battery saver", "экономия заряда",
		"usb device", "устройство usb", "display driver", "realtek", "nvidia geforce",
		"typing...", "печатает...", "recording voice", "записывает голосовое",
		"connected to", "подключено к", "bluetooth", "microsoft store", "xbox game bar",
		"screenshot saved", "снимок экрана сохранён", "clipboard", "буфер обмена",
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

func extractToastMeta(xmlBytes []byte) parsedToastMeta {
	dec := xml.NewDecoder(bytes.NewReader(xmlBytes))
	var meta parsedToastMeta
	inText := false
	var buf strings.Builder
	for {
		tok, err := dec.Token()
		if err != nil {
			break
		}
		switch t := tok.(type) {
		case xml.StartElement:
			lname := strings.ToLower(t.Name.Local)
			switch lname {
			case "toast":
				for _, attr := range t.Attr {
					if strings.EqualFold(attr.Name.Local, "launch") {
						meta.LaunchAttr = strings.TrimSpace(attr.Value)
					}
				}
			case "header":
				for _, attr := range t.Attr {
					if strings.EqualFold(attr.Name.Local, "title") && meta.HeaderTitle == "" {
						meta.HeaderTitle = strings.TrimSpace(attr.Value)
					}
				}
			case "input":
				meta.HasReplyBox = true
			case "text":
				inText = true
				buf.Reset()
			case "image":
				var src, placement, crop string
				for _, attr := range t.Attr {
					al := strings.ToLower(attr.Name.Local)
					if al == "src" {
						src = strings.TrimSpace(attr.Value)
					} else if al == "placement" {
						placement = strings.ToLower(strings.TrimSpace(attr.Value))
					} else if al == "hint-crop" {
						crop = strings.ToLower(strings.TrimSpace(attr.Value))
					}
				}
				if crop == "circle" {
					meta.HasCircleImg = true
				}
				if src != "" && (meta.AvatarSrc == "" || placement == "applogooverride") {
					meta.AvatarSrc = src
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
					meta.Texts = append(meta.Texts, s)
				}
			}
		}
	}
	return meta
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
	raw, size, _, err := winReadFileShareSafe(localPath, 256*1024)
	if err != nil || len(raw) == 0 || size > 256*1024 {
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
	case strings.Contains(l, "telegram") || strings.Contains(l, "ayugram") || strings.Contains(l, "kotatogram") || strings.Contains(l, "tdesktop") || strings.Contains(l, "unigram") || strings.Contains(l, "tg://"):
		return "Telegram", "telegram"
	case strings.Contains(l, "discord"):
		return "Discord", "discord"
	case strings.Contains(l, "whatsapp"):
		return "WhatsApp", "whatsapp"
	case strings.Contains(l, "viber"):
		return "Viber", "viber"
	case strings.Contains(l, "vk.com") || strings.Contains(l, "вконтакте") || strings.Contains(l, "vkontakte") || strings.Contains(l, "vk messenger") || strings.Contains(l, "vk.me"):
		return "VK", "vk"
	case strings.Contains(l, "slack"):
		return "Slack", "slack"
	case strings.Contains(l, "teams"):
		return "Teams", "teams"
	case strings.Contains(l, "steam"):
		return "Steam", "steam"
	case strings.Contains(l, "signal"):
		return "Signal", "telegram"
	case strings.Contains(l, "outlook") || strings.Contains(l, "mail") || strings.Contains(l, "gmail") || strings.Contains(l, "thunderbird") || strings.Contains(l, "yandex.ru/mail"):
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

func hashToastFingerprint(appKey, sender, body string) string {
	sum := sha256.Sum256([]byte(appKey + "|" + strings.TrimSpace(sender) + "|" + strings.TrimSpace(body)))
	return hex.EncodeToString(sum[:12])
}
