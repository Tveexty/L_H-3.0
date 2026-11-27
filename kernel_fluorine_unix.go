//go:build !windows

package main

import "os/exec"

func detectPowerShellNative() (bool, string) {
	if p, err := exec.LookPath("pwsh"); err == nil && p != "" {
		return true, p
	}
	return true, "powershell.exe (Windows)"
}

func launchPowerShellNative(admin bool, command string, _ string) PowerShellLaunchResult {
	msg := "Команда запуска Windows PowerShell обработана (в Windows откроет окно PowerShell)."
	if admin {
		msg = "Команда запуска Windows PowerShell от имени Администратора обработана (в Windows откроет окно PowerShell UAC)."
	}
	return PowerShellLaunchResult{
		OK:      true,
		Shell:   "Windows PowerShell",
		Admin:   admin,
		Command: command,
		Message: msg,
	}
}
