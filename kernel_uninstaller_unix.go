//go:build !windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

func listInstalledUninstallPrograms() []UninstallProgramItem {
	list := make([]UninstallProgramItem, 0, 64)
	seen := map[string]bool{}

	// 1. Scan .desktop apps
	home, _ := os.UserHomeDir()
	desktopDirs := []string{"/usr/share/applications", filepath.Join(home, ".local/share/applications")}
	for _, dir := range desktopDirs {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, e := range entries {
			if !strings.HasSuffix(e.Name(), ".desktop") {
				continue
			}
			raw, err2 := os.ReadFile(filepath.Join(dir, e.Name()))
			if err2 != nil {
				continue
			}
			name, execLine := "", ""
			for _, ln := range strings.Split(string(raw), "\n") {
				if strings.HasPrefix(ln, "Name=") && name == "" {
					name = strings.TrimSpace(strings.TrimPrefix(ln, "Name="))
				} else if strings.HasPrefix(ln, "Exec=") && execLine == "" {
					execLine = strings.TrimSpace(strings.TrimPrefix(ln, "Exec="))
				}
			}
			if name == "" || seen[strings.ToLower(name)] {
				continue
			}
			seen[strings.ToLower(name)] = true
			list = append(list, UninstallProgramItem{
				ID:              fmt.Sprintf("unix_app_%d", len(list)+1),
				Name:            name,
				Publisher:       "Linux Application",
				Version:         "1.0",
				InstallLocation: filepath.Join(dir, e.Name()),
				UninstallString: execLine,
				SizeMB:          12.0,
				Source:          "desktop_entry",
			})
		}
	}

	// 2. Also include top dpkg packages if available
	if out, err := exec.Command("dpkg-query", "-W", "-f=${Package}\t${Version}\t${Installed-Size}\t${Maintainer}\n").Output(); err == nil {
		for _, ln := range strings.Split(string(out), "\n") {
			if len(list) >= 120 {
				break
			}
			parts := strings.Split(ln, "\t")
			if len(parts) < 3 {
				continue
			}
			pkg := strings.TrimSpace(parts[0])
			if pkg == "" || seen[strings.ToLower(pkg)] {
				continue
			}
			szKB, _ := strconv.ParseFloat(strings.TrimSpace(parts[2]), 64)
			if szKB < 2048 {
				continue
			}
			seen[strings.ToLower(pkg)] = true
			pub := "APT Package"
			if len(parts) >= 4 && strings.TrimSpace(parts[3]) != "" {
				pub = strings.TrimSpace(parts[3])
				if idx := strings.Index(pub, "<"); idx > 0 {
					pub = strings.TrimSpace(pub[:idx])
				}
			}
			list = append(list, UninstallProgramItem{
				ID:              fmt.Sprintf("dpkg_%s", pkg),
				Name:            pkg,
				Publisher:       pub,
				Version:         strings.TrimSpace(parts[1]),
				InstallLocation: "/usr/share/" + pkg,
				UninstallString: "apt-get remove " + pkg,
				SizeMB:          float64(int(szKB/102.4)) / 10.0,
				Source:          "dpkg",
			})
		}
	}

	sort.Slice(list, func(i, j int) bool {
		return strings.ToLower(list[i].Name) < strings.ToLower(list[j].Name)
	})
	return list
}

func launchProgramUninstaller(uninstallString, _ string, _ bool) map[string]interface{} {
	return map[string]interface{}{
		"ok":      true,
		"command": uninstallString,
		"message": "Команда удаления подготовлена. Выполните 4-этапное сканирование хвостов для очистки конфигов и кэша.",
	}
}

func getStage1ScanDirs() []string {
	home, _ := os.UserHomeDir()
	dirs := []string{os.TempDir()}
	if home != "" {
		dirs = append(dirs,
			filepath.Join(home, ".config"),
			filepath.Join(home, ".local", "share"),
			filepath.Join(home, ".cache"),
		)
	}
	return dirs
}

func getStage2ScanDirs() []string {
	home, _ := os.UserHomeDir()
	dirs := []string{}
	if home != "" {
		dirs = append(dirs, filepath.Join(home, ".local", "share", "applications"))
	}
	return dirs
}

func scanStage3RegistryLeftovers(tokens []string, _ string) []LeftoverItem {
	home, _ := os.UserHomeDir()
	if home == "" {
		return nil
	}
	appDir := filepath.Join(home, ".local", "share", "applications")
	entries, err := os.ReadDir(appDir)
	if err != nil {
		return nil
	}
	var out []LeftoverItem
	for _, e := range entries {
		if matched, tok := matchesAnyToken(e.Name(), tokens); matched {
			out = append(out, LeftoverItem{
				Stage:           3,
				StageName:       "Реестр / Desktop-записи",
				Kind:            "file",
				Path:            filepath.Join(appDir, e.Name()),
				Risk:            "safe",
				SelectedDefault: true,
				Reason:          fmt.Sprintf("Остаточный ярлык .desktop (%s)", tok),
			})
		}
	}
	return out
}

func scanStage4ServiceTaskLeftovers(tokens []string) []LeftoverItem {
	home, _ := os.UserHomeDir()
	if home == "" {
		return nil
	}
	sysd := filepath.Join(home, ".config", "systemd", "user")
	entries, err := os.ReadDir(sysd)
	if err != nil {
		return nil
	}
	var out []LeftoverItem
	for _, e := range entries {
		if matched, tok := matchesAnyToken(e.Name(), tokens); matched {
			out = append(out, LeftoverItem{
				Stage:           4,
				StageName:       "Службы и Задачи планировщика",
				Kind:            "service",
				Path:            filepath.Join(sysd, e.Name()),
				Risk:            "caution",
				SelectedDefault: false,
				Reason:          fmt.Sprintf("Пользовательская служба systemd (%s)", tok),
			})
		}
	}
	return out
}

func backupRegistryKeyPlatform(_, _ string, _ int) string     { return "" }
func deleteRegistryLeftoverPlatform(_ string) error           { return nil }
func disableServiceOrTaskPlatform(_, _ string) error          { return nil }
func restoreRegistryBackupsPlatform(_ string) int             { return 0 }
