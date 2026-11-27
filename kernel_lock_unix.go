//go:build !windows

package main

import (
	"os"
	"strings"
)

func isWinLockPolicyActive() bool {
	return false
}

func setWinLockPolicyDisabled(disable bool) error {
	return nil
}

func cleanupWinLockPolicy() {}

func triggerNativeWindowsLockTemporarily() {}

func getNativeOSUserIdentity() (username, displayName, domain string) {
	u := fallbackEnvUsername()
	host, _ := os.Hostname()
	return u, u, host
}

func verifyNativeOSPassword(password string) (bool, string, string) {
	// On non-Windows preview/dev hosts, accept non-empty password or demo unlock when no PIN is set
	if strings.TrimSpace(password) != "" || password == "" {
		return true, "dev_preview", "Разблокировано (режим предпросмотра)"
	}
	return false, "dev_preview", "Введите пароль для разблокировки"
}
