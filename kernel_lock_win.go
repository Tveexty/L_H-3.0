//go:build windows

package main

import (
	"os"
	"os/exec"
	"strings"
	"sync/atomic"
	"syscall"
	"time"
	"unsafe"
)

var (
	advapi32LockDLL     = syscall.NewLazyDLL("advapi32.dll")
	procLogonUserW      = advapi32LockDLL.NewProc("LogonUserW")
	procGetUserNameW    = advapi32LockDLL.NewProc("GetUserNameW")
	procRegCreateKeyExW = advapi32LockDLL.NewProc("RegCreateKeyExW")
	procRegSetValueExW  = advapi32LockDLL.NewProc("RegSetValueExW")
	procRegDeleteValueW = advapi32LockDLL.NewProc("RegDeleteValueW")
	procRegCloseKeyLock = advapi32LockDLL.NewProc("RegCloseKey")
	winLockPolicyOn     int32
)

const (
	logon32LogonInteractive   = 2
	logon32LogonNetwork       = 3
	logon32LogonUnlock        = 7
	logon32ProviderDefault    = 0
	regKeySetValue            = 0x0002
	regKeyCreateSubKey        = 0x0004
	regTypeDword              = 4
	winErrAccountRestriction  = 1327
	winErrLogonFailure        = 1326
	winPolicySystemSubKey     = `Software\Microsoft\Windows\CurrentVersion\Policies\System`
	winDisableLockValueName   = "DisableLockWorkstation"
)

func isWinLockPolicyActive() bool {
	return atomic.LoadInt32(&winLockPolicyOn) == 1
}

// setWinLockPolicyDisabled sets HKCU\...\Policies\System\DisableLockWorkstation = 1 while Luma OS runs
// so Win+L can be cleanly intercepted by WH_KEYBOARD_LL for the Luma System Lock Screen.
// When disable=false (or on Luma OS shutdown via cleanupWinLockPolicy), the registry value is REMOVED so native Win+L works normally!
func setWinLockPolicyDisabled(disable bool) error {
	subKeyPtr, err := syscall.UTF16PtrFromString(winPolicySystemSubKey)
	if err != nil {
		return err
	}
	valPtr, err := syscall.UTF16PtrFromString(winDisableLockValueName)
	if err != nil {
		return err
	}
	var hKey uintptr
	var disposition uint32
	ret, _, _ := procRegCreateKeyExW.Call(
		uintptr(syscall.HKEY_CURRENT_USER),
		uintptr(unsafe.Pointer(subKeyPtr)),
		0,
		0,
		0,
		uintptr(regKeySetValue|regKeyCreateSubKey),
		0,
		uintptr(unsafe.Pointer(&hKey)),
		uintptr(unsafe.Pointer(&disposition)),
	)
	if ret != 0 || hKey == 0 {
		return syscall.Errno(ret)
	}
	defer procRegCloseKeyLock.Call(hKey)

	if disable {
		val := uint32(1)
		ret2, _, _ := procRegSetValueExW.Call(
			hKey,
			uintptr(unsafe.Pointer(valPtr)),
			0,
			uintptr(regTypeDword),
			uintptr(unsafe.Pointer(&val)),
			4,
		)
		if ret2 != 0 {
			return syscall.Errno(ret2)
		}
		atomic.StoreInt32(&winLockPolicyOn, 1)
		return nil
	}

	// Cleanly remove DisableLockWorkstation so native Windows Win+L is 100% restored!
	_, _, _ = procRegDeleteValueW.Call(hKey, uintptr(unsafe.Pointer(valPtr)))
	atomic.StoreInt32(&winLockPolicyOn, 0)
	return nil
}

// cleanupWinLockPolicy MUST always be called when Luma OS exits so Windows native Win+L is never left disabled.
func cleanupWinLockPolicy() {
	if atomic.LoadInt32(&winLockPolicyOn) == 1 {
		_ = setWinLockPolicyDisabled(false)
	}
}

func triggerNativeWindowsLockTemporarily() {
	wasDisabled := isWinLockPolicyActive()
	if wasDisabled {
		_ = setWinLockPolicyDisabled(false)
		time.Sleep(80 * time.Millisecond)
	}
	_ = exec.Command("rundll32.exe", "user32.dll,LockWorkStation").Start()
	if wasDisabled {
		go func() {
			time.Sleep(1500 * time.Millisecond)
			if isWinLToLumaEnabled() {
				_ = setWinLockPolicyDisabled(true)
			}
		}()
	}
}

func getNativeOSUserIdentity() (username, displayName, domain string) {
	buf := make([]uint16, 256)
	sz := uint32(len(buf))
	if r, _, _ := procGetUserNameW.Call(uintptr(unsafe.Pointer(&buf[0])), uintptr(unsafe.Pointer(&sz))); r != 0 && sz > 0 {
		username = syscall.UTF16ToString(buf[:sz])
	}
	if strings.TrimSpace(username) == "" {
		username = fallbackEnvUsername()
	}
	domain = strings.TrimSpace(os.Getenv("USERDOMAIN"))
	if domain == "" {
		domain = strings.TrimSpace(os.Getenv("COMPUTERNAME"))
	}
	displayName = username
	return username, displayName, domain
}

func tryWinLogonUser(user, domain, password string, logonType uint32) (bool, syscall.Errno) {
	uPtr, err := syscall.UTF16PtrFromString(user)
	if err != nil {
		return false, 0
	}
	var dPtr *uint16
	if domain != "" {
		dPtr, _ = syscall.UTF16PtrFromString(domain)
	}
	pPtr, err := syscall.UTF16PtrFromString(password)
	if err != nil {
		return false, 0
	}
	var token syscall.Handle
	r, _, callErr := procLogonUserW.Call(
		uintptr(unsafe.Pointer(uPtr)),
		uintptr(unsafe.Pointer(dPtr)),
		uintptr(unsafe.Pointer(pPtr)),
		uintptr(logonType),
		uintptr(logon32ProviderDefault),
		uintptr(unsafe.Pointer(&token)),
	)
	if r != 0 {
		if token != 0 {
			_ = syscall.CloseHandle(token)
		}
		return true, 0
	}
	if errno, ok := callErr.(syscall.Errno); ok {
		return false, errno
	}
	return false, 0
}

// verifyNativeOSPassword verifies the user's REAL Windows account password via Win32 advapi32.dll LogonUserW.
// Supports Local accounts, Microsoft Accounts (cached), Active Directory accounts, and blank-password accounts!
func verifyNativeOSPassword(password string) (bool, string, string) {
	username, _, domain := getNativeOSUserIdentity()
	domains := []string{".", domain, ""}
	logonTypes := []uint32{logon32LogonUnlock, logon32LogonInteractive, logon32LogonNetwork}

	blankRestrictionHit := false
	for _, dom := range domains {
		for _, lt := range logonTypes {
			ok, errno := tryWinLogonUser(username, dom, password, lt)
			if ok {
				return true, "windows_logon", "Пароль учётной записи Windows подтверждён"
			}
			if errno == winErrAccountRestriction {
				blankRestrictionHit = true
			}
		}
	}

	// If user entered empty password and Windows explicitly returned ERROR_ACCOUNT_RESTRICTION (1327),
	// that means this Windows local account genuinely has NO password set!
	if password == "" && blankRestrictionHit {
		return true, "windows_blank_account", "Вход выполнен (учётная запись Windows без пароля)"
	}

	return false, "windows_logon", "Неверный пароль учётной записи Windows"
}
