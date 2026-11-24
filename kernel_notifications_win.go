//go:build windows

package main

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"
	"unicode/utf16"
	"unsafe"
)

// ==================== LUMA OS 1.5.4 (CARBON) FROM-SCRATCH REAL NOTIFICATION ENGINE (WINDOWS) ====================
// Zero muted-channel spam! Zero generic "+4 нажмите чтобы посмотреть"!
// ONLY real incoming notifications with actual WHO (sender), WHAT (message body), and WHEN (timestamp):
//   Engine 1: Share-safe Win32 CreateFileW (FILE_SHARE_READ|WRITE|DELETE) WPN DB + WAL direct XML reader
//             (immune to NTFS cached ModTime lag; parses real FILETIME timestamps & avatars).
//   Engine 2: Pure-Go COM UIAutomationCore (IUIAutomation) live on-screen Windows Toast Banner reader
//             (reads exact sender & message text directly off ShellExperienceHost / native popups in real time!).

var (
	notifKernel32        = syscall.NewLazyDLL("kernel32.dll")
	notifUser32          = syscall.NewLazyDLL("user32.dll")
	notifOle32           = syscall.NewLazyDLL("ole32.dll")
	notifOleAut32        = syscall.NewLazyDLL("oleaut32.dll")
	notifProcOpenProc    = notifKernel32.NewProc("OpenProcess")
	notifProcCloseHandle = notifKernel32.NewProc("CloseHandle")
	notifProcQueryFullPN = notifKernel32.NewProc("QueryFullProcessImageNameW")
	notifProcEnumWindows = notifUser32.NewProc("EnumWindows")
	notifProcIsVis       = notifUser32.NewProc("IsWindowVisible")
	notifProcGetWinText  = notifUser32.NewProc("GetWindowTextW")
	notifProcGetClass    = notifUser32.NewProc("GetClassNameW")
	notifProcGetRect     = notifUser32.NewProc("GetWindowRect")
	notifProcGetWinPID   = notifUser32.NewProc("GetWindowThreadProcessId")
	notifProcCoInitEx    = notifOle32.NewProc("CoInitializeEx")
	notifProcCoUninit    = notifOle32.NewProc("CoUninitialize")
	notifProcCoCreate    = notifOle32.NewProc("CoCreateInstance")
	notifProcSysFreeStr  = notifOleAut32.NewProc("SysFreeString")
	notifProcSysStrLen   = notifOleAut32.NewProc("SysStringLen")
)

const (
	notifFileShareAll      = syscall.FILE_SHARE_READ | syscall.FILE_SHARE_WRITE | syscall.FILE_SHARE_DELETE
	notifProcessQueryLimit = 0x1000
	coinitMultithreaded    = 0x0
	clsctxInprocServer     = 0x1
	treeScopeSubtree       = 0x4
)

type comGUID struct {
	Data1 uint32
	Data2 uint16
	Data3 uint16
	Data4 [8]byte
}

var (
	// CLSID_CUIAutomation {ff48dba4-60ef-4201-aa87-54103eef594e}
	clsidCUIAutomation = comGUID{0xff48dba4, 0x60ef, 0x4201, [8]byte{0xaa, 0x87, 0x54, 0x10, 0x3e, 0xef, 0x59, 0x4e}}
	// IID_IUIAutomation {30cbe57d-d9d0-452a-ab13-7ac5ac4825ee}
	iidIUIAutomation = comGUID{0x30cbe57d, 0xd9d0, 0x452a, [8]byte{0xab, 0x13, 0x7a, 0xc5, 0xac, 0x48, 0x25, 0xee}}
)

// winReadFileShareSafe reads up to maxBytes from the end of a file even while WpnUserService holds it open.
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
		if _, err = syscall.Seek(h, offset, 0); err != nil {
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
	hSum := sha256.New()
	_, _ = fmt.Fprintf(hSum, "%d:", size)
	if len(data) > 4096 {
		hSum.Write(data[:4096])
	} else {
		hSum.Write(data)
	}
	if len(data) > 24576 {
		hSum.Write(data[len(data)-24576:])
	}
	return data, size, hex.EncodeToString(hSum.Sum(nil)[:12]), nil
}

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
	return strings.ToLower(filepath.Base(syscall.UTF16ToString(buf[:sz])))
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

func comVtableCall(obj uintptr, methodIdx uintptr, args ...uintptr) uintptr {
	if obj == 0 {
		return 0x80004003 // E_POINTER
	}
	vtable := *(*uintptr)(unsafe.Pointer(obj))
	if vtable == 0 {
		return 0x80004003
	}
	fnPtr := *(*uintptr)(unsafe.Pointer(vtable + methodIdx*unsafe.Sizeof(uintptr(0))))
	if fnPtr == 0 {
		return 0x80004003
	}
	callArgs := make([]uintptr, 0, len(args)+1)
	callArgs = append(callArgs, obj)
	callArgs = append(callArgs, args...)
	r1, _, _ := syscall.SyscallN(fnPtr, callArgs...)
	return r1
}

func comRelease(obj uintptr) {
	if obj != 0 {
		comVtableCall(obj, 2) // IUnknown::Release
	}
}

func bstrToGoString(bstr uintptr) string {
	if bstr == 0 {
		return ""
	}
	defer notifProcSysFreeStr.Call(bstr)
	n, _, _ := notifProcSysStrLen.Call(bstr)
	if n == 0 || n > 4096 {
		return ""
	}
	slice := unsafe.Slice((*uint16)(unsafe.Pointer(bstr)), int(n))
	return strings.TrimSpace(string(utf16.Decode(slice)))
}

// uiaExtractVisibleTexts walks a live Windows Toast Banner or native popup HWND via IUIAutomation
// and returns every distinct non-empty text node (e.g. ["Telegram", "Максим", "Привет, пошли гулять!"])
// WITHOUT ever emitting synthetic/generic "+4" placeholders!
func uiaExtractVisibleTexts(uia uintptr, trueCond uintptr, hwnd uintptr) []string {
	if uia == 0 || trueCond == 0 || hwnd == 0 {
		return nil
	}
	var rootElem uintptr
	// IUIAutomation::ElementFromHandle is vtable index 6
	hr := comVtableCall(uia, 6, hwnd, uintptr(unsafe.Pointer(&rootElem)))
	if int32(hr) < 0 || rootElem == 0 {
		return nil
	}
	defer comRelease(rootElem)

	var elemArray uintptr
	// IUIAutomationElement::FindAll is vtable index 6
	hr = comVtableCall(rootElem, 6, treeScopeSubtree, trueCond, uintptr(unsafe.Pointer(&elemArray)))
	if int32(hr) < 0 || elemArray == 0 {
		return nil
	}
	defer comRelease(elemArray)

	var count int32
	// IUIAutomationElementArray::get_Length is vtable index 3
	hr = comVtableCall(elemArray, 3, uintptr(unsafe.Pointer(&count)))
	if int32(hr) < 0 || count <= 0 {
		return nil
	}
	if count > 48 {
		count = 48
	}

	var texts []string
	seen := map[string]bool{}
	for i := int32(0); i < count; i++ {
		var el uintptr
		// IUIAutomationElementArray::GetElement is vtable index 4
		hr = comVtableCall(elemArray, 4, uintptr(i), uintptr(unsafe.Pointer(&el)))
		if int32(hr) < 0 || el == 0 {
			continue
		}
		var bstr uintptr
		// IUIAutomationElement::get_CurrentName is vtable index 23
		hr = comVtableCall(el, 23, uintptr(unsafe.Pointer(&bstr)))
		comRelease(el)
		if int32(hr) < 0 || bstr == 0 {
			continue
		}
		txt := bstrToGoString(bstr)
		if len(txt) < 1 || len(txt) > 320 {
			continue
		}
		low := strings.ToLower(txt)
		// Skip UI chrome buttons on Windows toast banners
		if low == "закрыть" || low == "close" || low == "dismiss" || low == "отклонить" ||
			low == "параметры" || low == "settings" || low == "ответить" || low == "reply" ||
			low == "отправить" || low == "send" || low == "новое уведомление" || low == "new notification" ||
			low == "notification" || low == "уведомление" || low == "больше параметров" || low == "more options" ||
			low == "перейти к параметрам" || low == "go to settings" || low == "прочитать" || low == "mark as read" ||
			low == "отключить звук" || low == "mute" || strings.HasPrefix(low, "введите ответ") || strings.HasPrefix(low, "type a reply") {
			continue
		}
		if !seen[txt] {
			seen[txt] = true
			texts = append(texts, txt)
		}
	}
	return texts
}

type winNotifRuntimeState struct {
	mu                sync.Mutex
	runningMessengers []string
	uiaActive         bool
	seenUIAHashes     map[string]time.Time
}

var globalWinNotifState = &winNotifRuntimeState{
	seenUIAHashes: map[string]time.Time{},
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
	candidates := []string{
		filepath.Join(appData, "Telegram Desktop", "tdata", "user_data", "cache"),
		filepath.Join(appData, "AyuGram Desktop", "tdata", "user_data", "cache"),
	}
	cutoff := time.Now().Add(-15 * time.Second)
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

type notifCandWin struct {
	hwnd        uintptr
	exe         string
	title       string
	cls         string
	isWinToast  bool
	knownApp    string
	knownAppKey string
}

var (
	notifEnumMu      sync.Mutex
	notifEnumCands   []notifCandWin
	notifEnumRunning map[string]bool
	// Package-level singleton callback — created ONCE ever!
	// Calling syscall.NewCallback inside a periodic loop exhausts Go's 2000-slot Windows callback table
	// and causes a hard fatal crash every ~15-30 minutes!
	notifEnumWinCb = syscall.NewCallback(func(hwnd uintptr, _ uintptr) uintptr {
		vis, _, _ := notifProcIsVis.Call(hwnd)
		if vis == 0 {
			return 1
		}
		var pid uint32
		_, _, _ = notifProcGetWinPID.Call(hwnd, uintptr(unsafe.Pointer(&pid)))
		exe := winProcessBaseName(pid)
		if exe == "" {
			return 1
		}
		appName, appKey := winMessengerFromExe(exe)
		if appKey != "" {
			notifEnumRunning[appKey] = true
		}

		var r winRect
		_, _, _ = notifProcGetRect.Call(hwnd, uintptr(unsafe.Pointer(&r)))
		w := r.Right - r.Left
		h := r.Bottom - r.Top
		if w < 150 || w > 640 || h < 45 || h > 420 {
			return 1
		}

		cls := winGetClass(hwnd)
		title := winGetText(hwnd)
		lowTitle := strings.ToLower(title)
		lowCls := strings.ToLower(cls)

		isWinToast := (strings.Contains(exe, "shellexperiencehost") || strings.Contains(exe, "experiencehost")) &&
			(strings.Contains(lowCls, "corewindow") || strings.Contains(lowTitle, "уведомлен") || strings.Contains(lowTitle, "notification"))
		isMsgPopup := appKey != "" && (strings.Contains(lowCls, "popup") || strings.Contains(lowCls, "toolsavebits") || h <= 240)

		if isWinToast || isMsgPopup {
			notifEnumCands = append(notifEnumCands, notifCandWin{
				hwnd:        hwnd,
				exe:         exe,
				title:       title,
				cls:         cls,
				isWinToast:  isWinToast,
				knownApp:    appName,
				knownAppKey: appKey,
			})
		}
		return 1
	})
)

// startWinLiveUIAToastWatcher runs on a dedicated COM MTA thread, inspecting ONLY live Windows Toast Banners
// (ShellExperienceHost / Windows.UI.Core.CoreWindow) and messenger popups that expose REAL sender + message text!
// ZERO muted-channel unread counter deltas! ZERO generic "+4" placeholders! ZERO callback leaks!
func (b *OSNotificationBridge) startWinLiveUIAToastWatcher() {
	go func() {
		defer func() { _ = recover() }()
		runtime.LockOSThread()
		defer runtime.UnlockOSThread()

		_, _, _ = notifProcCoInitEx.Call(0, coinitMultithreaded)
		defer notifProcCoUninit.Call()

		var uia uintptr
		hr, _, _ := notifProcCoCreate.Call(
			uintptr(unsafe.Pointer(&clsidCUIAutomation)),
			0,
			clsctxInprocServer,
			uintptr(unsafe.Pointer(&iidIUIAutomation)),
			uintptr(unsafe.Pointer(&uia)),
		)
		var trueCond uintptr
		if int32(hr) >= 0 && uia != 0 {
			defer comRelease(uia)
			// IUIAutomation::CreateTrueCondition is vtable index 21
			hr2 := comVtableCall(uia, 21, uintptr(unsafe.Pointer(&trueCond)))
			if int32(hr2) >= 0 && trueCond != 0 {
				defer comRelease(trueCond)
				globalWinNotifState.mu.Lock()
				globalWinNotifState.uiaActive = true
				globalWinNotifState.mu.Unlock()
			}
		}

		ticker := time.NewTicker(450 * time.Millisecond)
		defer ticker.Stop()
		for range ticker.C {
			func() {
				defer func() { _ = recover() }()
				b.winScanLiveToastBanners(uia, trueCond)
			}()
		}
	}()
}

func (b *OSNotificationBridge) winScanLiveToastBanners(uia, trueCond uintptr) {
	notifEnumMu.Lock()
	notifEnumCands = notifEnumCands[:0]
	notifEnumRunning = map[string]bool{}
	_, _, _ = notifProcEnumWindows.Call(notifEnumWinCb, 0)
	cands := make([]notifCandWin, len(notifEnumCands))
	copy(cands, notifEnumCands)
	running := make([]string, 0, len(notifEnumRunning))
	for k := range notifEnumRunning {
		running = append(running, k)
	}
	notifEnumMu.Unlock()

	globalWinNotifState.mu.Lock()
	globalWinNotifState.runningMessengers = running
	now := time.Now()
	for k, ts := range globalWinNotifState.seenUIAHashes {
		if now.Sub(ts) > 5*time.Minute {
			delete(globalWinNotifState.seenUIAHashes, k)
		}
	}
	globalWinNotifState.mu.Unlock()

	if uia == 0 || trueCond == 0 || len(cands) == 0 {
		return
	}

	for _, c := range cands {
		texts := uiaExtractVisibleTexts(uia, trueCond, c.hwnd)
		if len(texts) < 2 {
			// STRICT 1.5.4 RULE: NEVER emit a notification without REAL sender + REAL message text!
			continue
		}

		appName := c.knownApp
		appKey := c.knownAppKey
		joined := strings.Join(texts, " ")
		if appKey == "" {
			appName, appKey = detectMessengerApp(joined)
		}

		// Parse [AppName?, Sender, MessageBody, ExtraChat?] cleanly
		idx := 0
		if len(texts) >= 3 {
			firstApp, firstKey := detectMessengerApp(texts[0])
			if firstKey != "system" && len(texts[0]) <= 36 {
				appName, appKey = firstApp, firstKey
				idx = 1
			}
		}
		if idx+1 >= len(texts) {
			continue
		}
		rawTitle := strings.TrimSpace(texts[idx])
		body := strings.TrimSpace(texts[idx+1])
		chat := ""
		if idx+2 < len(texts) && len(texts[idx+2]) < 64 && !strings.EqualFold(texts[idx+2], rawTitle) {
			chat = strings.TrimSpace(texts[idx+2])
		}

		if rawTitle == "" || body == "" {
			continue
		}
		if !isIncomingUserMessage(rawTitle, body, joined) {
			continue
		}
		if appKey == "system" {
			appName, appKey = "Сообщение", "message"
		}

		sender, parsedChat := splitSenderAndChat(rawTitle)
		if chat == "" {
			chat = parsedChat
		}
		fp := hashToastFingerprint(appKey, sender, body)

		globalWinNotifState.mu.Lock()
		_, seen := globalWinNotifState.seenUIAHashes[fp]
		if !seen {
			globalWinNotifState.seenUIAHashes[fp] = now
		}
		globalWinNotifState.mu.Unlock()
		if seen {
			continue
		}

		avatar := ""
		if appKey == "telegram" {
			avatar = winLatestTelegramAvatar()
		}

		displayTitle := sender
		if chat != "" && !strings.Contains(sender, "→") {
			displayTitle = sender + " → " + chat
		}

		b.pushUniqueRealMessage(OSNotificationItem{
			ID:        fmt.Sprintf("uia_%d", time.Now().UnixNano()),
			App:       appName,
			AppKey:    appKey,
			Sender:    truncateUTF8(sender, 64),
			Chat:      truncateUTF8(chat, 64),
			Title:     truncateUTF8(displayTitle, 96),
			Body:      truncateUTF8(body, 320),
			AvatarURL: avatar,
			Direction: "incoming",
			Level:     "info",
			Source:    "live_toast_uia",
			Time:      now.Format("15:04"),
			DateLabel: now.Format("02.01.2006"),
			Timestamp: now.UnixMilli(),
		})
	}
}

func winGetRunningMessengers() []string {
	globalWinNotifState.mu.Lock()
	defer globalWinNotifState.mu.Unlock()
	return append([]string{}, globalWinNotifState.runningMessengers...)
}

func winIsUIAActive() bool {
	globalWinNotifState.mu.Lock()
	defer globalWinNotifState.mu.Unlock()
	return globalWinNotifState.uiaActive
}
