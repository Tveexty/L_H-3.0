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

var (
	shell32OfficeDLL        = syscall.NewLazyDLL("shell32.dll")
	procOfficeShellExecuteW = shell32OfficeDLL.NewProc("ShellExecuteW")
)

const swShowNormal = 1

func win32ShellExecuteOpen(file, params, dir string) error {
	verbPtr, err := syscall.UTF16PtrFromString("open")
	if err != nil {
		return err
	}
	filePtr, err := syscall.UTF16PtrFromString(file)
	if err != nil {
		return err
	}
	var paramPtr *uint16
	if strings.TrimSpace(params) != "" {
		paramPtr, _ = syscall.UTF16PtrFromString(params)
	}
	var dirPtr *uint16
	if strings.TrimSpace(dir) != "" {
		dirPtr, _ = syscall.UTF16PtrFromString(dir)
	}
	ret, _, callErr := procOfficeShellExecuteW.Call(
		0,
		uintptr(unsafe.Pointer(verbPtr)),
		uintptr(unsafe.Pointer(filePtr)),
		uintptr(unsafe.Pointer(paramPtr)),
		uintptr(unsafe.Pointer(dirPtr)),
		uintptr(swShowNormal),
	)
	// Per Win32 ShellExecuteW docs: return value > 32 indicates success!
	if ret <= 32 {
		if callErr != nil && callErr != syscall.Errno(0) {
			return fmt.Errorf("ShellExecuteW failed (code %d): %v", ret, callErr)
		}
		return fmt.Errorf("ShellExecuteW failed with code %d", ret)
	}
	return nil
}

func isValidRunnableWinExe(p string) bool {
	if p == "" || isBrokenWindowsOfficeStubPath(p) {
		return false
	}
	info, err := os.Stat(p)
	if err != nil || info.IsDir() {
		return false
	}
	low := strings.ToLower(p)
	// Reject 0-byte WindowsApps execution alias stubs when called directly as raw binary paths
	if strings.Contains(low, `\windowsapps\`) && info.Size() == 0 {
		return false
	}
	// Real Office executables are > 16KB; icon-only stubs are small or in Windows\Installer
	if strings.HasSuffix(low, ".exe") && info.Size() < 4096 {
		return false
	}
	return true
}

// resolveRealWindowsOfficeExe finds the REAL WINWORD.EXE / EXCEL.EXE / POWERPNT.EXE binary
// via Registry App Paths + Office16/15/14 Click-to-Run & MSI paths, strictly skipping broken wordicon.exe/xlicons.exe/pptico.exe stubs!
func resolveRealWindowsOfficeExe(kind string) string {
	var exeName string
	switch strings.ToLower(strings.TrimSpace(kind)) {
	case "word", "winword", "ms_word":
		exeName = "WINWORD.EXE"
	case "excel", "ms_excel":
		exeName = "EXCEL.EXE"
	case "powerpoint", "powerpnt", "ms_powerpoint":
		exeName = "POWERPNT.EXE"
	default:
		return ""
	}

	// 1. Registry App Paths (HKLM, HKLM WOW6432Node, HKCU) — fastest & most authoritative on Windows!
	regPaths := []struct {
		hive syscall.Handle
		sub  string
	}{
		{syscall.HKEY_LOCAL_MACHINE, `SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\` + exeName},
		{syscall.HKEY_LOCAL_MACHINE, `SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\` + exeName},
		{syscall.HKEY_CURRENT_USER, `SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\` + exeName},
	}
	for _, rp := range regPaths {
		if raw := readWinRegString(rp.hive, rp.sub, ""); raw != "" {
			clean := expandWinEnvVars(strings.Trim(strings.TrimSpace(raw), `"`))
			if isValidRunnableWinExe(clean) {
				return clean
			}
		}
		if dir := readWinRegString(rp.hive, rp.sub, "Path"); dir != "" {
			cleanDir := expandWinEnvVars(strings.Trim(strings.TrimSpace(dir), `"`))
			cand := filepath.Join(cleanDir, exeName)
			if isValidRunnableWinExe(cand) {
				return cand
			}
		}
	}

	// 2. Office InstallRoot registry keys (Office 16.0 / 15.0 / 14.0)
	for _, ver := range []string{"16.0", "15.0", "14.0"} {
		for _, sub := range []string{
			`SOFTWARE\Microsoft\Office\` + ver + `\Word\InstallRoot`,
			`SOFTWARE\WOW6432Node\Microsoft\Office\` + ver + `\Word\InstallRoot`,
			`SOFTWARE\Microsoft\Office\` + ver + `\Excel\InstallRoot`,
			`SOFTWARE\WOW6432Node\Microsoft\Office\` + ver + `\Excel\InstallRoot`,
			`SOFTWARE\Microsoft\Office\` + ver + `\PowerPoint\InstallRoot`,
			`SOFTWARE\WOW6432Node\Microsoft\Office\` + ver + `\PowerPoint\InstallRoot`,
			`SOFTWARE\Microsoft\Office\ClickToRun\Configuration`,
		} {
			for _, valName := range []string{"Path", "ClientFolder"} {
				if dir := readWinRegString(syscall.HKEY_LOCAL_MACHINE, sub, valName); dir != "" {
					cleanDir := expandWinEnvVars(strings.Trim(strings.TrimSpace(dir), `"`))
					for _, cand := range []string{
						filepath.Join(cleanDir, exeName),
						filepath.Join(cleanDir, "root", "Office16", exeName),
						filepath.Join(cleanDir, "Office16", exeName),
					} {
						if isValidRunnableWinExe(cand) {
							return cand
						}
					}
				}
			}
		}
	}

	// 3. Direct filesystem scan of all standard Microsoft Office installation folders (64-bit & 32-bit)
	roots := []string{
		os.Getenv("ProgramFiles"),
		os.Getenv("ProgramFiles(x86)"),
		`C:\Program Files`,
		`C:\Program Files (x86)`,
	}
	subDirs := []string{
		`Microsoft Office\root\Office16`,
		`Microsoft Office\Office16`,
		`Microsoft Office\root\Office15`,
		`Microsoft Office\Office15`,
		`Microsoft Office 15\root\office15`,
		`Microsoft Office\Office14`,
		`Microsoft Office\Office12`,
	}
	seenRoot := map[string]bool{}
	for _, r := range roots {
		r = strings.TrimSpace(r)
		if r == "" {
			continue
		}
		lr := strings.ToLower(r)
		if seenRoot[lr] {
			continue
		}
		seenRoot[lr] = true
		for _, sd := range subDirs {
			cand := filepath.Join(r, sd, exeName)
			if isValidRunnableWinExe(cand) {
				return cand
			}
		}
	}

	// 4. PATH lookup fallback
	if p, err := exec.LookPath(exeName); err == nil && isValidRunnableWinExe(p) {
		return p
	}
	return ""
}

func listWindowsMicrosoftOfficeApps() []WindowsOfficeAppInfo {
	defs := []struct {
		id         string
		kind       string
		name       string
		shortName  string
		uri        string
		brandColor string
		detail     string
	}{
		{
			id:         "ms_word",
			kind:       "word",
			name:       "Microsoft Word",
			shortName:  "Word",
			uri:        "ms-word:",
			brandColor: "#185ABD",
			detail:     "Документы .docx (Windows)",
		},
		{
			id:         "ms_excel",
			kind:       "excel",
			name:       "Microsoft Excel",
			shortName:  "Excel",
			uri:        "ms-excel:",
			brandColor: "#107C41",
			detail:     "Таблицы .xlsx (Windows)",
		},
		{
			id:         "ms_powerpoint",
			kind:       "powerpoint",
			name:       "Microsoft PowerPoint",
			shortName:  "PowerPoint",
			uri:        "ms-powerpoint:",
			brandColor: "#C43E1C",
			detail:     "Презентации .pptx (Windows)",
		},
	}

	out := make([]WindowsOfficeAppInfo, 0, len(defs))
	for _, d := range defs {
		exe := resolveRealWindowsOfficeExe(d.kind)
		iconPath := exe
		if iconPath == "" {
			iconPath = d.uri
		}
		iconURL := ""
		if exe != "" {
			iconURL = buildAppIconURL(exe)
		}
		out = append(out, WindowsOfficeAppInfo{
			ID:         d.id,
			Kind:       d.kind,
			Name:       d.name,
			ShortName:  d.shortName,
			ExecPath:   exe,
			LaunchURI:  d.uri,
			Installed:  exe != "",
			IconURL:    iconURL,
			BrandColor: d.brandColor,
			Publisher:  "Microsoft Corporation",
			Detail:     d.detail,
		})
	}
	return out
}

func launchWindowsMicrosoftOfficeApp(kind, rawTarget, args string) (string, bool, error) {
	k := strings.ToLower(strings.TrimSpace(kind))
	if k == "" {
		k = detectOfficeKindFromTarget(rawTarget, "")
	}
	// 1. Prefer verified real Office executable (WINWORD.EXE / EXCEL.EXE / POWERPNT.EXE) via ShellExecuteW!
	if exe := resolveRealWindowsOfficeExe(k); exe != "" {
		if err := win32ShellExecuteOpen(exe, args, filepath.Dir(exe)); err == nil {
			return exe, false, nil
		}
	}
	// 2. If user supplied a valid non-stub path, try ShellExecuteW directly
	clean := expandWinEnvVars(strings.Trim(strings.TrimSpace(rawTarget), `"`))
	if clean != "" && !isBrokenWindowsOfficeStubPath(clean) {
		if _, err := os.Stat(clean); err == nil {
			if err2 := win32ShellExecuteOpen(clean, args, filepath.Dir(clean)); err2 == nil {
				return clean, false, nil
			}
		}
	}
	// 3. Fallback to registered Office protocol URI (works for Microsoft Store / UWP Office editions!)
	uriMap := map[string]string{
		"word":       "ms-word:",
		"excel":      "ms-excel:",
		"powerpoint": "ms-powerpoint:",
	}
	if uri, ok := uriMap[k]; ok {
		if err := win32ShellExecuteOpen(uri, "", ""); err == nil {
			return uri, true, nil
		}
	}
	return "", false, fmt.Errorf("приложение Microsoft %s не найдено на этом ПК. Установите Microsoft Office или откройте встроенный Luma Office", strings.Title(k))
}

// smartLaunchWindowsTarget safely launches any Windows app/shortcut/file/URI via native Win32 ShellExecuteW,
// automatically repairing broken Office installer stubs (wordicon.exe / xlicons.exe / pptico.exe) so Windows
// NEVER displays "Невозможно запустить это приложение на вашем ПК"!
func smartLaunchWindowsTarget(cleanTarget, name, args string) (string, int, error) {
	// Detect broken Office icon stub or explicit Office target -> route to real WINWORD/EXCEL/POWERPNT!
	if officeKind := detectOfficeKindFromTarget(cleanTarget, name); officeKind != "" {
		if isBrokenWindowsOfficeStubPath(cleanTarget) ||
			!strings.ContainsAny(cleanTarget, `\/`) ||
			strings.HasPrefix(strings.ToLower(cleanTarget), "ms-") ||
			strings.HasPrefix(strings.ToLower(cleanTarget), "ms_") ||
			!isValidRunnableWinExe(cleanTarget) {
			if launched, _, err := launchWindowsMicrosoftOfficeApp(officeKind, cleanTarget, args); err == nil {
				return launched, 0, nil
			}
		}
	}

	expanded := expandWinEnvVars(strings.Trim(strings.TrimSpace(cleanTarget), `"`))
	if expanded == "" {
		return "", 0, fmt.Errorf("empty target")
	}

	// If it's a shell:AppsFolder or URI or .lnk or real executable, ShellExecuteW handles it natively!
	dir := ""
	if info, err := os.Stat(expanded); err == nil && !info.IsDir() {
		dir = filepath.Dir(expanded)
	}
	if err := win32ShellExecuteOpen(expanded, args, dir); err == nil {
		return expanded, 0, nil
	}

	// Fallback: explorer.exe for shell: paths, or cmd start
	if strings.HasPrefix(strings.ToLower(expanded), "shell:") {
		cmd := exec.Command("explorer.exe", expanded)
		if err := cmd.Start(); err == nil && cmd.Process != nil {
			return expanded, cmd.Process.Pid, nil
		}
	}
	var cmd *exec.Cmd
	if strings.TrimSpace(args) != "" {
		cmd = exec.Command("cmd.exe", "/c", "start", "", expanded, args)
	} else {
		cmd = exec.Command("cmd.exe", "/c", "start", "", expanded)
	}
	if err := cmd.Start(); err != nil {
		return expanded, 0, err
	}
	pid := 0
	if cmd.Process != nil {
		pid = cmd.Process.Pid
	}
	return expanded, pid, nil
}
