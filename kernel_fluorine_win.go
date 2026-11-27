//go:build windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"
)

func detectPowerShellNative() (bool, string) {
	if p, err := exec.LookPath("pwsh.exe"); err == nil && p != "" {
		return true, p
	}
	candidates := []string{
		filepath.Join(os.Getenv("ProgramFiles"), "PowerShell", "7", "pwsh.exe"),
		filepath.Join(os.Getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
	}
	for _, c := range candidates {
		if c != "" {
			if _, err := os.Stat(c); err == nil {
				return true, c
			}
		}
	}
	if p, err := exec.LookPath("powershell.exe"); err == nil && p != "" {
		return true, p
	}
	return false, ""
}

func launchPowerShellNative(admin bool, command string, cwd string) PowerShellLaunchResult {
	ready, psPath := detectPowerShellNative()
	if !ready || psPath == "" {
		psPath = "powershell.exe"
	}

	shellName := "Windows PowerShell"
	if strings.Contains(strings.ToLower(psPath), "pwsh") {
		shellName = "PowerShell 7"
	}

	if cwd == "" || cwd == "~" {
		if h, err := os.UserHomeDir(); err == nil && h != "" {
			cwd = h
		}
	}

	var args string
	if command != "" {
		escaped := strings.ReplaceAll(command, `"`, `\"`)
		args = fmt.Sprintf(`-NoExit -Command "%s"`, escaped)
	} else {
		args = "-NoExit"
	}

	verb := "open"
	if admin {
		verb = "runas"
	}

	shell32 := syscall.NewLazyDLL("shell32.dll")
	shellExecW := shell32.NewProc("ShellExecuteW")

	vPtr, _ := syscall.UTF16PtrFromString(verb)
	fPtr, _ := syscall.UTF16PtrFromString(psPath)
	pPtr, _ := syscall.UTF16PtrFromString(args)
	var dPtr *uint16
	if cwd != "" {
		dPtr, _ = syscall.UTF16PtrFromString(cwd)
	}

	ret, _, callErr := shellExecW.Call(
		0,
		uintptr(unsafe.Pointer(vPtr)),
		uintptr(unsafe.Pointer(fPtr)),
		uintptr(unsafe.Pointer(pPtr)),
		uintptr(unsafe.Pointer(dPtr)),
		1, // SW_SHOWNORMAL
	)
	if ret > 32 {
		msg := fmt.Sprintf("Открыт %s", shellName)
		if admin {
			msg = fmt.Sprintf("Открыт %s (от имени Администратора)", shellName)
		}
		if command != "" {
			msg += fmt.Sprintf(" · команда: %s", command)
		}
		return PowerShellLaunchResult{
			OK:      true,
			Shell:   shellName,
			Admin:   admin,
			Command: command,
			Message: msg,
		}
	}

	// Fallback non-elevated start if ShellExecuteW returned <= 32
	if !admin {
		cmdArgs := []string{"-NoExit"}
		if command != "" {
			cmdArgs = append(cmdArgs, "-Command", command)
		}
		cmd := exec.Command(psPath, cmdArgs...)
		if cwd != "" {
			cmd.Dir = cwd
		}
		if err := cmd.Start(); err == nil {
			return PowerShellLaunchResult{
				OK:      true,
				Shell:   shellName,
				Admin:   false,
				Command: command,
				Message: fmt.Sprintf("Открыт %s", shellName),
			}
		}
	}

	return PowerShellLaunchResult{
		OK:      false,
		Shell:   shellName,
		Admin:   admin,
		Command: command,
		Message: "Не удалось открыть PowerShell (возможно, отменён запрос UAC).",
		Error:   fmt.Sprintf("ShellExecuteW=%d (%v)", ret, callErr),
	}
}
