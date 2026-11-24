//go:build windows

package main

import (
	"fmt"
	"os"
	"os/user"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

// ==================== LUMA OS 1.6 NITROGEN: ADMIN UAC & ALWAYS-ON-TOP (WIN32) ====================
// Zero syscall.NewCallback inside functions or loops — uses package-level procs & existing singletons!

var (
	advapi32AdminDLL          = syscall.NewLazyDLL("advapi32.dll")
	procOpenProcessToken      = advapi32AdminDLL.NewProc("OpenProcessToken")
	procGetTokenInformation   = advapi32AdminDLL.NewProc("GetTokenInformation")
	shell32AdminDLL           = syscall.NewLazyDLL("shell32.dll")
	procIsUserAnAdmin         = shell32AdminDLL.NewProc("IsUserAnAdmin")
	procShellExecuteW         = shell32AdminDLL.NewProc("ShellExecuteW")
	kernel32AdminDLL          = syscall.NewLazyDLL("kernel32.dll")
	procGetCurrentProcessWin  = kernel32AdminDLL.NewProc("GetCurrentProcess")
	procCloseHandleAdmin      = kernel32AdminDLL.NewProc("CloseHandle")
	procGetWindowLongExTop    = user32WinDLL.NewProc("GetWindowLongW")
	procIsWindowTop           = user32WinDLL.NewProc("IsWindow")

	topmostTrackMu   sync.RWMutex
	topmostPinnedMap = map[int]uintptr{}
)

const (
	tokenQueryFlags    = 0x0008
	tokenElevationInfo = 20
	gwlExStyleIdx      = ^uintptr(19) // -20
	wsExTopmostFlag    = 0x00000008
	swpNoActivateFlag  = 0x0010
	swShowNormalAdmin  = 1
)

type tokenElevationStruct struct {
	TokenIsElevated uint32
}

type AdminStatusInfo struct {
	OK             bool   `json:"ok"`
	IsAdmin        bool   `json:"is_admin"`
	Username       string `json:"username"`
	IntegrityLevel string `json:"integrity_level"`
	ElevationType  string `json:"elevation_type"`
	Platform       string `json:"platform"`
	ExePath        string `json:"exe_path"`
	CanElevate     bool   `json:"can_elevate"`
}

func isProcessElevatedWin() bool {
	hProc, _, _ := procGetCurrentProcessWin.Call()
	var hToken uintptr
	r, _, _ := procOpenProcessToken.Call(hProc, tokenQueryFlags, uintptr(unsafe.Pointer(&hToken)))
	if r != 0 && hToken != 0 {
		defer procCloseHandleAdmin.Call(hToken)
		var elev tokenElevationStruct
		var retLen uint32
		ok, _, _ := procGetTokenInformation.Call(
			hToken,
			tokenElevationInfo,
			uintptr(unsafe.Pointer(&elev)),
			unsafe.Sizeof(elev),
			uintptr(unsafe.Pointer(&retLen)),
		)
		if ok != 0 {
			return elev.TokenIsElevated != 0
		}
	}
	res, _, _ := procIsUserAnAdmin.Call()
	return res != 0
}

func getAdminStatus() AdminStatusInfo {
	elevated := isProcessElevatedWin()
	uname := os.Getenv("USERNAME")
	if u, err := user.Current(); err == nil && u.Username != "" {
		uname = u.Username
	}
	exe, _ := os.Executable()
	level := "Medium"
	eType := "Standard (Limited Token)"
	if elevated {
		level = "High"
		eType = "Administrator (UAC Elevated)"
	}
	return AdminStatusInfo{
		OK:             true,
		IsAdmin:        elevated,
		Username:       uname,
		IntegrityLevel: level,
		ElevationType:  eType,
		Platform:       "windows",
		ExePath:        exe,
		CanElevate:     !elevated,
	}
}

func restartAsAdministrator() map[string]interface{} {
	if isProcessElevatedWin() {
		return map[string]interface{}{
			"ok":            true,
			"already_admin": true,
			"message":       "Luma OS уже запущена с правами Администратора (UAC High).",
		}
	}
	exe, err := os.Executable()
	if err != nil || exe == "" {
		return map[string]interface{}{
			"ok":    false,
			"error": "Не удалось определить путь к исполняемому файлу LumaOS",
		}
	}
	verbPtr, _ := syscall.UTF16PtrFromString("runas")
	filePtr, _ := syscall.UTF16PtrFromString(exe)
	argsStr := ""
	if len(os.Args) > 1 {
		var quoted []string
		for _, a := range os.Args[1:] {
			if strings.ContainsAny(a, " \t") {
				quoted = append(quoted, `"`+a+`"`)
			} else {
				quoted = append(quoted, a)
			}
		}
		argsStr = strings.Join(quoted, " ")
	}
	var argsPtr *uint16
	if argsStr != "" {
		argsPtr, _ = syscall.UTF16PtrFromString(argsStr)
	}
	dirPtr, _ := syscall.UTF16PtrFromString(strings.TrimSpace(os.Getenv("USERPROFILE")))

	ret, _, callErr := procShellExecuteW.Call(
		0,
		uintptr(unsafe.Pointer(verbPtr)),
		uintptr(unsafe.Pointer(filePtr)),
		uintptr(unsafe.Pointer(argsPtr)),
		uintptr(unsafe.Pointer(dirPtr)),
		swShowNormalAdmin,
	)
	if ret <= 32 {
		msg := fmt.Sprintf("Запрос UAC отклонён пользователем или заблокирован политикой (код %d)", ret)
		if callErr != nil && callErr != syscall.Errno(0) {
			msg = fmt.Sprintf("%s: %v", msg, callErr)
		}
		return map[string]interface{}{
			"ok":       false,
			"canceled": true,
			"error":    msg,
		}
	}

	// Cleanly hand off shell & exit current standard-user process so elevated instance binds ports cleanly
	go func() {
		time.Sleep(450 * time.Millisecond)
		restoreWindowsShell()
		os.Exit(0)
	}()

	return map[string]interface{}{
		"ok":         true,
		"restarting": true,
		"message":    "Запущен экземпляр Luma OS 1.6 с правами Администратора (UAC). Текущее окно завершится через мгновение...",
	}
}

func isWindowTopmostWin(hwnd uintptr) bool {
	if hwnd == 0 {
		return false
	}
	exStyle, _, _ := procGetWindowLongExTop.Call(hwnd, gwlExStyleIdx)
	return (exStyle & wsExTopmostFlag) != 0
}

// setExternalWindowTopmost toggles or sets HWND_TOPMOST / HWND_NOTOPMOST on any external Windows window.
func setExternalWindowTopmost(pid int, hwndVal uint64, topmost *bool, toggle bool) map[string]interface{} {
	hwnd := uintptr(hwndVal)
	if hwnd == 0 && pid > 0 {
		hwnd = findMainHwndForPID(pid)
	}
	if hwnd == 0 {
		return map[string]interface{}{
			"ok":    false,
			"error": fmt.Sprintf("Окно процесса PID %d не найдено", pid),
		}
	}
	valid, _, _ := procIsWindowTop.Call(hwnd)
	if valid == 0 {
		return map[string]interface{}{
			"ok":    false,
			"error": "Указанное окно больше не существует",
		}
	}

	currentlyTop := isWindowTopmostWin(hwnd)
	desired := currentlyTop
	if toggle {
		desired = !currentlyTop
	} else if topmost != nil {
		desired = *topmost
	}

	insertAfter := hwndNoTopmost
	if desired {
		insertAfter = hwndTopmost
	}
	r, _, _ := procSetWindowPos.Call(
		hwnd,
		insertAfter,
		0, 0, 0, 0,
		swpNoMove|swpNoSize|swpNoActivateFlag|swpNoOwnerZOrder,
	)
	actual := isWindowTopmostWin(hwnd)
	if r != 0 {
		topmostTrackMu.Lock()
		if actual {
			if pid > 0 {
				topmostPinnedMap[pid] = hwnd
			}
		} else if pid > 0 {
			delete(topmostPinnedMap, pid)
		}
		topmostTrackMu.Unlock()
	}
	return map[string]interface{}{
		"ok":      r != 0,
		"pid":     pid,
		"hwnd":    uint64(hwnd),
		"topmost": actual,
	}
}

func listTopmostWindows() map[string]interface{} {
	topmostTrackMu.Lock()
	defer topmostTrackMu.Unlock()
	pids := make([]int, 0, len(topmostPinnedMap))
	hwnds := make([]uint64, 0, len(topmostPinnedMap))
	for pid, h := range topmostPinnedMap {
		valid, _, _ := procIsWindowTop.Call(h)
		if valid == 0 || !isWindowTopmostWin(h) {
			delete(topmostPinnedMap, pid)
			continue
		}
		pids = append(pids, pid)
		hwnds = append(hwnds, uint64(h))
	}
	return map[string]interface{}{
		"ok":            true,
		"topmost_pids":  pids,
		"topmost_hwnds": hwnds,
	}
}
