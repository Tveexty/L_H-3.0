//go:build windows

package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"syscall"
)

func listInstalledUninstallPrograms() []UninstallProgramItem {
	ps := `
$paths = @(
  'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
$items = Get-ItemProperty $paths -ErrorAction SilentlyContinue | Where-Object {
  $_.DisplayName -and (-not $_.SystemComponent) -and ($_.UninstallString -or $_.QuietUninstallString)
} | ForEach-Object {
  [PSCustomObject]@{
    name = [string]$_.DisplayName
    publisher = [string]$_.Publisher
    version = [string]$_.DisplayVersion
    install_date = [string]$_.InstallDate
    install_location = [string]$_.InstallLocation
    uninstall_string = [string]$_.UninstallString
    quiet_uninstall_string = [string]$_.QuietUninstallString
    size_mb = if ($_.EstimatedSize) { [math]::Round(([double]$_.EstimatedSize)/1024, 1) } else { 0 }
    registry_key = [string]$_.PSPath -replace '^Microsoft\.PowerShell\.Core\\Registry::', ''
  }
} | Sort-Object name -Unique
$items | ConvertTo-Json -Compress -Depth 2
`
	out, err := runHiddenPowerShell(ps)
	if err != nil || strings.TrimSpace(out) == "" {
		return []UninstallProgramItem{}
	}
	raw := strings.TrimSpace(out)
	var list []UninstallProgramItem
	if strings.HasPrefix(raw, "[") {
		_ = json.Unmarshal([]byte(raw), &list)
	} else {
		var one UninstallProgramItem
		if json.Unmarshal([]byte(raw), &one) == nil && one.Name != "" {
			list = append(list, one)
		}
	}
	for i := range list {
		list[i].ID = fmt.Sprintf("win_prog_%d", i+1)
		list[i].Source = "windows_registry"
	}
	sort.Slice(list, func(i, j int) bool {
		return strings.ToLower(list[i].Name) < strings.ToLower(list[j].Name)
	})
	return list
}

func launchProgramUninstaller(uninstallString, quietString string, quiet bool) map[string]interface{} {
	cmdLine := strings.TrimSpace(uninstallString)
	if quiet && strings.TrimSpace(quietString) != "" {
		cmdLine = strings.TrimSpace(quietString)
	}
	if cmdLine == "" {
		return map[string]interface{}{"ok": false, "error": "Строка деинсталляции пуста"}
	}
	cmd := exec.Command("cmd.exe", "/C", cmdLine)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: false}
	if err := cmd.Start(); err != nil {
		return map[string]interface{}{"ok": false, "error": "Не удалось запустить деинсталлятор: " + err.Error()}
	}
	return map[string]interface{}{
		"ok":      true,
		"pid":     cmd.Process.Pid,
		"command": cmdLine,
		"message": "Деинсталлятор программы запущен. После завершения запустите 4-этапный сканер хвостов!",
	}
}

func getStage1ScanDirs() []string {
	dirs := []string{}
	for _, env := range []string{"APPDATA", "LOCALAPPDATA", "PROGRAMDATA", "TEMP"} {
		if v := strings.TrimSpace(os.Getenv(env)); v != "" {
			dirs = append(dirs, v)
		}
	}
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		dirs = append(dirs, filepath.Join(home, "AppData", "LocalLow"))
	}
	return dirs
}

func getStage2ScanDirs() []string {
	dirs := []string{}
	for _, env := range []string{"ProgramFiles", "ProgramFiles(x86)"} {
		if v := strings.TrimSpace(os.Getenv(env)); v != "" {
			dirs = append(dirs, v)
		}
	}
	if appData := os.Getenv("APPDATA"); appData != "" {
		dirs = append(dirs, filepath.Join(appData, "Microsoft", "Windows", "Start Menu", "Programs"))
	}
	if pd := os.Getenv("PROGRAMDATA"); pd != "" {
		dirs = append(dirs, filepath.Join(pd, "Microsoft", "Windows", "Start Menu", "Programs"))
	}
	return dirs
}

func scanStage3RegistryLeftovers(tokens []string, _ string) []LeftoverItem {
	if len(tokens) == 0 {
		return nil
	}
	// Build safe regex alternation
	var escaped []string
	for _, t := range tokens {
		if len(t) >= 4 {
			clean := strings.Map(func(r rune) rune {
				if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == ' ' || r == '-' || r == '_' {
					return r
				}
				return -1
			}, t)
			if len(clean) >= 4 {
				escaped = append(escaped, clean)
			}
		}
	}
	if len(escaped) == 0 {
		return nil
	}
	pattern := strings.Join(escaped, "|")
	ps := fmt.Sprintf(`
$pat = '%s'
$roots = @('HKCU:\Software', 'HKLM:\SOFTWARE', 'HKLM:\SOFTWARE\WOW6432Node')
$found = @()
foreach ($r in $roots) {
  Get-ChildItem -Path $r -ErrorAction SilentlyContinue | Where-Object {
    $_.PSChildName -match $pat -and $_.PSChildName -notmatch '^(Microsoft|Windows|Classes|Policies|LumaOS)$'
  } | Select-Object -First 20 | ForEach-Object {
    $found += [string]$_.Name
  }
}
$found | ConvertTo-Json -Compress
`, strings.ReplaceAll(pattern, "'", "''"))

	out, err := runHiddenPowerShell(ps)
	if err != nil || strings.TrimSpace(out) == "" {
		return nil
	}
	raw := strings.TrimSpace(out)
	var keys []string
	if strings.HasPrefix(raw, "[") {
		_ = json.Unmarshal([]byte(raw), &keys)
	} else {
		var one string
		if json.Unmarshal([]byte(raw), &one) == nil && one != "" {
			keys = append(keys, one)
		}
	}
	items := make([]LeftoverItem, 0, len(keys))
	for _, k := range keys {
		risk := "safe"
		if strings.HasPrefix(strings.ToUpper(k), "HKEY_LOCAL_MACHINE") {
			risk = "caution"
		}
		items = append(items, LeftoverItem{
			Stage:           3,
			StageName:       "Реестр Windows (HKCU / HKLM)",
			Kind:            "registry",
			Path:            k,
			Risk:            risk,
			SelectedDefault: risk == "safe",
			Reason:          "Остаточный ключ реестра программы",
		})
	}
	return items
}

func scanStage4ServiceTaskLeftovers(tokens []string) []LeftoverItem {
	if len(tokens) == 0 {
		return nil
	}
	var escaped []string
	for _, t := range tokens {
		clean := strings.Map(func(r rune) rune {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
				return r
			}
			return -1
		}, t)
		if len(clean) >= 4 {
			escaped = append(escaped, clean)
		}
	}
	if len(escaped) == 0 {
		return nil
	}
	pat := strings.Join(escaped, "|")
	ps := fmt.Sprintf(`
$pat = '%s'
$res = @()
Get-Service -ErrorAction SilentlyContinue | Where-Object { ($_.Name -match $pat -or $_.DisplayName -match $pat) -and $_.Name -notmatch '^(Win|Wpn|Lanman|Dhcp|Dnscache|Audio|Spooler)' } | Select-Object -First 10 | ForEach-Object {
  $res += [PSCustomObject]@{ kind='service'; path=$_.Name; reason="Служба Windows: $($_.DisplayName) ($($_.Status))" }
}
Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.TaskPath -notlike '\Microsoft\*' -and ($_.TaskName -match $pat -or $_.TaskPath -match $pat) } | Select-Object -First 10 | ForEach-Object {
  $res += [PSCustomObject]@{ kind='task'; path="$($_.TaskPath)$($_.TaskName)"; reason="Задача планировщика: $($_.State)" }
}
$res | ConvertTo-Json -Compress
`, strings.ReplaceAll(pat, "'", "''"))

	out, err := runHiddenPowerShell(ps)
	if err != nil || strings.TrimSpace(out) == "" {
		return nil
	}
	raw := strings.TrimSpace(out)
	type row struct {
		Kind   string `json:"kind"`
		Path   string `json:"path"`
		Reason string `json:"reason"`
	}
	var rows []row
	if strings.HasPrefix(raw, "[") {
		_ = json.Unmarshal([]byte(raw), &rows)
	} else {
		var one row
		if json.Unmarshal([]byte(raw), &one) == nil && one.Path != "" {
			rows = append(rows, one)
		}
	}
	items := make([]LeftoverItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, LeftoverItem{
			Stage:           4,
			StageName:       "Службы и Задачи планировщика",
			Kind:            r.Kind,
			Path:            r.Path,
			Risk:            "caution",
			SelectedDefault: false,
			Reason:          r.Reason,
		})
	}
	return items
}

func backupRegistryKeyPlatform(regPath, backupDir string, idx int) string {
	outFile := filepath.Join(backupDir, fmt.Sprintf("reg_%03d.reg", idx))
	cmd := exec.Command("reg.exe", "export", regPath, outFile, "/y")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if err := cmd.Run(); err == nil {
		return outFile
	}
	return ""
}

func deleteRegistryLeftoverPlatform(regPath string) error {
	cmd := exec.Command("reg.exe", "delete", regPath, "/f")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Run()
}

func disableServiceOrTaskPlatform(kind, target string) error {
	if kind == "service" {
		cmd := exec.Command("sc.exe", "config", target, "start=", "disabled")
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		return cmd.Run()
	}
	cmd := exec.Command("schtasks.exe", "/Change", "/TN", target, "/DISABLE")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Run()
}

func restoreRegistryBackupsPlatform(backupDir string) int {
	matches, _ := filepath.Glob(filepath.Join(backupDir, "reg_*.reg"))
	count := 0
	for _, f := range matches {
		cmd := exec.Command("reg.exe", "import", f)
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		if cmd.Run() == nil {
			count++
		}
	}
	return count
}
