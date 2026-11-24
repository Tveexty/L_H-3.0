//go:build windows

package main

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

// ==================== LUMA OS 1.5.3 (CARBON) WINDOWS 4-LAYER GUARANTEED NOTIFICATION ENGINE ====================
// Layer 1: Share-safe Win32 CreateFileW (FILE_SHARE_READ|WRITE|DELETE) WPN DB + WAL live reader (immune to NTFS ModTime lag!)
// Layer 2: Live on-screen Windows Toast Banner + Native Messenger Popup (Telegram Qt, WhatsApp, Discord, Viber) detector
// Layer 3: Strict Positive Unread-Count Delta detector (NEVER spams boot totals like 3048413 — ONLY fires on +1 real incoming!)
// Layer 4: Fresh Telegram/Messenger avatar cache resolver

var (
	notifKernel32        = syscall.NewLazyDLL("kernel32.dll")
	notifUser32          = syscall.NewLazyDLL("user32.dll")
	notifProcOpenProc    = notifKernel32.NewProc("OpenProcess")
	notifProcCloseHandle = notifKernel32.NewProc("CloseHandle")
	notifProcQueryFullPN = notifKernel32.NewProc("QueryFullProcessImageNameW")
	notifProcEnumWindows = notifUser32.NewProc("EnumWindows")
	notifProcEnumChild   = notifUser32.NewProc("EnumChildWindows")
	notifProcIsVis       = notifUser32.NewProc("IsWindowVisible")
	notifProcGetWinText  = notifUser32.NewProc("GetWindowTextW")
	notifProcGetClass    = notifUser32.NewProc("GetClassNameW")
	notifProcGetRect     = notifUser32.NewProc("GetWindowRect")
	notifProcGetLong     = notifUser32.NewProc("GetWindowLongW")
	notifProcGetWinPID   = notifUser32.NewProc("GetWindowThreadProcessId")
	notifProcGetSysMet   = notifUser32.NewProc("GetSystemMetrics")
)

const (
	notifFileShareAll       = syscall.FILE_SHARE_READ | syscall.FILE_SHARE_WRITE | syscall.FILE_SHARE_DELETE
	notifProcessQueryLimit  = 0x1000
	notifGwlExStyle         = ^uintptr(19) // -20
	notifWsExTopmost        = 0x00000008
	notifWsExToolWindow     = 0x00000080
	notifWsExNoActivate     = 0x08000000
)

// winReadFileShareSafe reads up to maxBytes from the end of a file even while Windows WpnUserService
// actively holds and writes to wpndatabase.db / wpndatabase.db-wal!
func winReadFileShareSafe(path string, maxBytes int64) ([]byte, int64, string, error) {
	pPtr, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return nil, 0, "", err
	}
	h, err := syscall.CreateFile(
		pPtr,
		syscall.GENERIC_READ,
		notifFileShareAll,
		nil,
		syscall.OPEN_EXISTING,
		syscall.FILE_ATTRIBUTE_NORMAL,
		0,
	)
	if err != nil {
		return nil, 0, "", err
	}
	defer syscall.CloseHandle(h)

	var fi syscall.ByHandleFileInformation
	if err := syscall.GetFileInformationByHandle(h, &fi); err != nil {
		return nil, 0, "", err
	}
	size := (int64(fi.FileSizeHigh) << 32) | int64(fi.FileSizeLow)
	if size <= 0 {
		return nil, 0, "", nil
	}
	readLen := size
	var offset int64 = 0
	if readLen > maxBytes {
		offset = size - maxBytes
		readLen = maxBytes
	}
	if offset > 0 {
		high := int32(offset >> 32)
		low := int32(offset & 0xFFFFFFFF)
		_, err = syscall.Seek(h, offset, 0)
		if err != nil {
			_ = high
			_ = low
			return nil, size, "", err
		}
	}

	buf := make([]byte, readLen)
	total := 0
	for total < len(buf) {
		var n uint32
		chunk := len(buf) - total
		if chunk > 1024*1024 {
			chunk = 1024 * 1024
		}
		err = syscall.ReadFile(h, buf[total:total+chunk], &n, nil)
		if err != nil || n == 0 {
			break
		}
		total += int(n)
	}
	data := buf[:total]
	// Fast content fingerprint (size + first 4KB + last 16KB) — completely immune to Windows NTFS cached ModTime!
	hSum := sha256.New()
	_, _ = fmt.Fprintf(hSum, "%d:", size)
	if len(data) > 4096 {
		hSum.Write(data[:4096])
	} else {
		hSum.Write(data)
	}
	if len(data) > 16384 {
		hSum.Write(data[len(data)-16384:])
	}
	return data, size, hex.EncodeToString(hSum.Sum(nil)[:10]), nil
}

type winPopupState struct {
	mu                sync.Mutex
	seenPopups        map[uintptr]time.Time
	unreadBaseline    map[string]int // appKey -> last observed unread count
	baselineBootUntil time.Time
	lastMessengerList []string
}

var globalWinPopupState = &winPopupState{
	seenPopups:        map[uintptr]time.Time{},
	unreadBaseline:    map[string]int{},
	baselineBootUntil: time.Now().Add(4 * time.Second),
}

var unreadCountTitleRe = regexp.MustCompile(`(?:\((\d{1,7})\)|\[(\d{1,7})\])`)

func winProcessBaseName(pid uint32) string {
	if pid == 0 {
		return ""
	}
	h, _, _ := notifProcOpenProc.Call(notifProcessQueryLimit, 0, uintptr(pid))
	if h == 0 {
		return ""
	}
	defer notifProcCloseHandle.Call(h)
	buf := make([]uint16, 512)
	sz := uint32(len(buf))
	ok, _, _ := notifProcQueryFullPN.Call(h, 0, uintptr(unsafe.Pointer(&buf[0])), uintptr(unsafe.Pointer(&sz)))
	if ok == 0 || sz == 0 {
		return ""
	}
	full := syscall.UTF16ToString(buf[:sz])
	return strings.ToLower(filepath.Base(full))
}

func winGetText(hwnd uintptr) string {
	buf := make([]uint16, 256)
	n, _, _ := notifProcGetWinText.Call(hwnd, uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
	if n == 0 {
		return ""
	}
	return strings.TrimSpace(syscall.UTF16ToString(buf[:n]))
}

func winGetClass(hwnd uintptr) string {
	buf := make([]uint16, 128)
	n, _, _ := notifProcGetClass.Call(hwnd, uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
	if n == 0 {
		return ""
	}
	return strings.TrimSpace(syscall.UTF16ToString(buf[:n]))
}

func winCollectChildTexts(parent uintptr) []string {
	var out []string
	seen := map[string]bool{}
	cb := syscall.NewCallback(func(child uintptr, _ uintptr) uintptr {
		t := winGetText(child)
		if len(t) >= 2 && len(t) <= 240 && !seen[t] {
			seen[t] = true
			out = append(out, t)
		}
		if len(out) >= 8 {
			return 0
		}
		return 1
	})
	_, _, _ = notifProcEnumChild.Call(parent, cb, 0)
	return out
}

func winMessengerFromExe(exe string) (string, string) {
	switch {
	case strings.Contains(exe, "telegram") || strings.Contains(exe, "ayugram") || strings.Contains(exe, "kotatogram") || strings.Contains(exe, "unigram"):
		return "Telegram", "telegram"
	case strings.Contains(exe, "whatsapp"):
		return "WhatsApp", "whatsapp"
	case strings.Contains(exe, "discord"):
		return "Discord", "discord"
	case strings.Contains(exe, "viber"):
		return "Viber", "viber"
	case strings.Contains(exe, "vk") && !strings.Contains(exe, "vulkan"):
		return "VK", "vk"
	case strings.Contains(exe, "slack"):
		return "Slack", "slack"
	case strings.Contains(exe, "teams"):
		return "Teams", "teams"
	case strings.Contains(exe, "signal"):
		return "Signal", "telegram"
	case strings.Contains(exe, "steam"):
		return "Steam", "steam"
	case strings.Contains(exe, "outlook") || strings.Contains(exe, "thunderbird") || strings.Contains(exe, "hxmail"):
		return "Почта", "mail"
	default:
		return "", ""
	}
}

func winLatestTelegramAvatar() string {
	appData := os.Getenv("APPDATA")
	localAppData := os.Getenv("LOCALAPPDATA")
	candidates := []string{
		filepath.Join(appData, "Telegram Desktop", "tdata", "user_data", "cache"),
		filepath.Join(appData, "Telegram Desktop", "tdata", "user_data", "media_cache"),
		filepath.Join(appData, "AyuGram Desktop", "tdata", "user_data", "cache"),
		filepath.Join(localAppData, "Temp"),
	}
	cutoff := time.Now().Add(-20 * time.Second)
	var newestPath string
	var newestTime time.Time
	for _, root := range candidates {
		entries, err := os.ReadDir(root)
		if err != nil {
			continue
		}
		for _, e := range entries {
			if e.IsDir() {
				continue
			}
			low := strings.ToLower(e.Name())
			if !strings.HasSuffix(low, ".png") && !strings.HasSuffix(low, ".jpg") && !strings.HasSuffix(low, ".jpeg") {
				continue
			}
			if root == filepath.Join(localAppData, "Temp") && !strings.Contains(low, "tg") && !strings.Contains(low, "telegram") && !strings.Contains(low, "avatar") {
				continue
			}
			info, err := e.Info()
			if err != nil || info.Size() < 300 || info.Size() > 160*1024 {
				continue
			}
			if info.ModTime().After(cutoff) && info.ModTime().After(newestTime) {
				newestTime = info.ModTime()
				newestPath = filepath.Join(root, e.Name())
			}
		}
	}
	if newestPath == "" {
		return ""
	}
	raw, _, _, err := winReadFileShareSafe(newestPath, 160*1024)
	if err != nil || len(raw) == 0 {
		return ""
	}
	mime := "image/png"
	if strings.HasSuffix(strings.ToLower(newestPath), ".jpg") || strings.HasSuffix(strings.ToLower(newestPath), ".jpeg") {
		mime = "image/jpeg"
	}
	return "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(raw)
}

// winScanLivePopupsAndDeltas runs every ~650ms on Windows:
//   1. Detects native Telegram/WhatsApp/Discord/Viber custom popup windows (even when "Use Windows notifications" is OFF!)
//   2. Detects strict positive unread-badge DELTAS (+1, +2) AFTER startup calibration — NEVER spamming existing totals!
func (b *OSNotificationBridge) winScanLivePopupsAndDeltas() {
	scrW, _, _ := notifProcGetSysMet.Call(0)
	scrH, _, _ := notifProcGetSysMet.Call(1)
	if scrW == 0 {
		scrW = 1920
	}
	if scrH == 0 {
		scrH = 1080
	}

	type winSnap struct {
		hwnd  uintptr
		pid   uint32
		exe   string
		title string
		cls   string
		ex    uintptr
		rect  winRect
	}

	var snaps []winSnap
	cb := syscall.NewCallback(func(hwnd uintptr, _ uintptr) uintptr {
		vis, _, _ := notifProcIsVis.Call(hwnd)
		if vis == 0 {
			return 1
		}
		var r winRect
		_, _, _ = notifProcGetRect.Call(hwnd, uintptr(unsafe.Pointer(&r)))
		w := r.Right - r.Left
		h := r.Bottom - r.Top
		if w < 120 || h < 36 {
			return 1
		}
		var pid uint32
		_, _, _ = notifProcGetWinPID.Call(hwnd, uintptr(unsafe.Pointer(&pid)))
		exe := winProcessBaseName(pid)
		if exe == "" {
			return 1
		}
		appName, _ := winMessengerFromExe(exe)
		isToastHost := strings.Contains(exe, "shellexperiencehost") || strings.Contains(exe, "experiencehost")
		if appName == "" && !isToastHost {
			return 1
		}
		ex, _, _ := notifProcGetLong.Call(hwnd, notifGwlExStyle)
		snaps = append(snaps, winSnap{
			hwnd:  hwnd,
			pid:   pid,
			exe:   exe,
			title: winGetText(hwnd),
			cls:   winGetClass(hwnd),
			ex:    ex,
			rect:  r,
		})
		return 1
	})
	_, _, _ = notifProcEnumWindows.Call(cb, 0)

	now := time.Now()
	runningApps := map[string]bool{}
	maxUnreadByApp := map[string]int{}
	appDisplay := map[string]string{}

	globalWinPopupState.mu.Lock()
	// Expire old popup HWNDs after 12 seconds so repeated new popups on recycled HWNDs still register
	for k, ts := range globalWinPopupState.seenPopups {
		if now.Sub(ts) > 12*time.Second {
			delete(globalWinPopupState.seenPopups, k)
		}
	}
	booting := now.Before(globalWinPopupState.baselineBootUntil)
	globalWinPopupState.mu.Unlock()

	for _, s := range snaps {
		appName, appKey := winMessengerFromExe(s.exe)
		w := s.rect.Right - s.rect.Left
		h := s.rect.Bottom - s.rect.Top

		if appKey != "" {
			runningApps[appKey] = true
			appDisplay[appKey] = appName

			// Check if this is a NATIVE MESSENGER POPUP TOAST (e.g. Telegram Desktop's own Qt popup in bottom-right corner!)
			isTopmostOrTool := (s.ex&notifWsExTopmost) != 0 || (s.ex&notifWsExToolWindow) != 0 || (s.ex&notifWsExNoActivate) != 0
			isPopupSize := w >= 160 && w <= 560 && h >= 44 && h <= 260
			isQtPopup := strings.Contains(strings.ToLower(s.cls), "toolsavebits") || strings.Contains(strings.ToLower(s.cls), "popup")
			nearEdge := s.rect.Right >= int32(scrW)-220 || s.rect.Bottom >= int32(scrH)-320 || s.rect.Top <= 220

			if isPopupSize && (isTopmostOrTool || isQtPopup) && nearEdge {
				globalWinPopupState.mu.Lock()
				_, already := globalWinPopupState.seenPopups[s.hwnd]
				if !already {
					globalWinPopupState.seenPopups[s.hwnd] = now
				}
				globalWinPopupState.mu.Unlock()

				if !already && !booting {
					// Give WPN DB 650ms head start so if Windows Toast XML has the full message text, we don't duplicate!
					snapCopy := s
					go func() {
						time.Sleep(650 * time.Millisecond)
						if b.hasRecentFromApp(appKey, 4500*time.Millisecond) {
							return
						}
						childTexts := winCollectChildTexts(snapCopy.hwnd)
						sender := appName
						body := "Новое входящее сообщение · Нажмите, чтобы открыть"
						if len(childTexts) >= 2 {
							sender = childTexts[0]
							body = childTexts[1]
						} else if len(childTexts) == 1 && !strings.EqualFold(childTexts[0], appName) {
							body = childTexts[0]
						} else if snapCopy.title != "" && !strings.EqualFold(snapCopy.title, appName) && !strings.Contains(strings.ToLower(snapCopy.title), "notification") {
							body = snapCopy.title
						}
						avatar := ""
						if appKey == "telegram" {
							avatar = winLatestTelegramAvatar()
						}
						b.pushLiveDetected(OSNotificationItem{
							ID:        fmt.Sprintf("pop_%d", time.Now().UnixNano()),
							App:       appName,
							AppKey:    appKey,
							Sender:    truncateUTF8(sender, 64),
							Title:     truncateUTF8(sender, 96),
							Body:      truncateUTF8(body, 260),
							AvatarURL: avatar,
							Direction: "incoming",
							Level:     "info",
							Source:    "native_popup",
							Time:      time.Now().Format("15:04"),
							Timestamp: time.Now().UnixMilli(),
						})
					}()
				}
			}

			// Track main window unread count ONLY for strict positive DELTA (+1/+2), NEVER emitting raw totals!
			if m := unreadCountTitleRe.FindStringSubmatch(s.title); len(m) >= 3 {
				numStr := m[1]
				if numStr == "" {
					numStr = m[2]
				}
				if cnt, err := strconv.Atoi(numStr); err == nil && cnt >= 0 {
					if cnt > maxUnreadByApp[appKey] {
						maxUnreadByApp[appKey] = cnt
					}
				}
			} else if w > 500 && h > 350 {
				// Main window open with 0 unread badge
				if _, ok := maxUnreadByApp[appKey]; !ok {
					maxUnreadByApp[appKey] = 0
				}
			}
		}
	}

	// Update running messengers cache (used to enrich unknown WPN toasts!)
	var runningList []string
	for k := range runningApps {
		runningList = append(runningList, k)
	}
	globalWinPopupState.mu.Lock()
	globalWinPopupState.lastMessengerList = runningList

	// Compute strict positive unread deltas (e.g. 3048413 -> 3048414 = delta +1!)
	type deltaAlert struct {
		appKey  string
		appName string
		delta   int
	}
	var deltas []deltaAlert
	for appKey, cnt := range maxUnreadByApp {
		prev, hasPrev := globalWinPopupState.unreadBaseline[appKey]
		globalWinPopupState.unreadBaseline[appKey] = cnt
		if !booting && hasPrev && cnt > prev {
			d := cnt - prev
			if d > 0 && d <= 200 {
				deltas = append(deltas, deltaAlert{
					appKey:  appKey,
					appName: appDisplay[appKey],
					delta:   d,
				})
			}
		}
	}
	globalWinPopupState.mu.Unlock()

	for _, da := range deltas {
		alert := da
		go func() {
			// Wait 1100ms so WPN DB (full text + avatar) or native popup watcher always takes priority!
			time.Sleep(1100 * time.Millisecond)
			if b.hasRecentFromApp(alert.appKey, 5500*time.Millisecond) {
				return
			}
			body := "Новое входящее сообщение · Нажмите, чтобы открыть"
			if alert.delta > 1 {
				body = fmt.Sprintf("Новые входящие сообщения (+%d) · Нажмите, чтобы открыть", alert.delta)
			}
			avatar := ""
			if alert.appKey == "telegram" {
				avatar = winLatestTelegramAvatar()
			}
			b.pushLiveDetected(OSNotificationItem{
				ID:        fmt.Sprintf("dlt_%d", time.Now().UnixNano()),
				App:       alert.appName,
				AppKey:    alert.appKey,
				Sender:    alert.appName,
				Title:     alert.appName,
				Body:      body,
				AvatarURL: avatar,
				Direction: "incoming",
				Level:     "info",
				Source:    "unread_delta",
				Time:      time.Now().Format("15:04"),
				Timestamp: time.Now().UnixMilli(),
			})
		}()
	}
}

func winGetRunningMessengers() []string {
	globalWinPopupState.mu.Lock()
	defer globalWinPopupState.mu.Unlock()
	return append([]string{}, globalWinPopupState.lastMessengerList...)
}
