//go:build !windows

package main

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

func listMonitorsOS() []MonitorInfo {
	return []MonitorInfo{
		{Index: 1, Name: "Primary Display (1)", Primary: true, X: 0, Y: 0, Width: 1920, Height: 1080, WorkX: 0, WorkY: 0, WorkWidth: 1920, WorkHeight: 1036},
		{Index: 2, Name: "Secondary Display (2)", Primary: false, X: 1920, Y: 0, Width: 1920, Height: 1080, WorkX: 1920, WorkY: 0, WorkWidth: 1920, WorkHeight: 1036},
	}
}

func applyWindowRulesOS(rules []WindowRule) (int, []string, bool, bool, map[string]int) {
	return 0, []string{}, false, false, map[string]int{}
}

func readLockKeysOS() (caps, num, scroll bool) {
	return false, true, false
}

func listAudioAppSessionsOS(_ *platformProbe) []AudioAppSession {
	if _, err := exec.LookPath("pactl"); err == nil {
		out, err := exec.Command("pactl", "list", "sink-inputs").Output()
		if err == nil {
			var apps []AudioAppSession
			var cur AudioAppSession
			for _, line := range strings.Split(string(out), "\n") {
				t := strings.TrimSpace(line)
				if strings.HasPrefix(t, "Sink Input #") {
					if cur.PID > 0 {
						apps = append(apps, cur)
					}
					idNum, _ := strconv.Atoi(strings.TrimPrefix(t, "Sink Input #"))
					cur = AudioAppSession{PID: idNum, Volume: 80, Playing: true}
				} else if strings.HasPrefix(t, "application.name = ") {
					cur.Name = strings.Trim(strings.TrimPrefix(t, "application.name = "), `"`)
					cur.Title = cur.Name
					cur.IconURL = "/api/kernel/app-icon?name=" + cur.Name
				} else if strings.HasPrefix(t, "Mute: yes") {
					cur.Muted = true
				}
			}
			if cur.PID > 0 {
				apps = append(apps, cur)
			}
			if len(apps) > 0 {
				return apps
			}
		}
	}
	return []AudioAppSession{
		{PID: 1001, Name: "chrome", Title: "Google Chrome · Media", Volume: 85, Muted: false, Playing: true, IconURL: "/api/kernel/app-icon?name=chrome"},
		{PID: 1002, Name: "spotify", Title: "Spotify · Oxygen Mix", Volume: 72, Muted: false, Playing: true, IconURL: "/api/kernel/app-icon?name=spotify"},
		{PID: 1003, Name: "telegram", Title: "Telegram Desktop", Volume: 60, Muted: false, Playing: false, IconURL: "/api/kernel/app-icon?name=telegram"},
	}
}

func setAudioAppVolumeOS(pid int, vol *int, muted *bool) error {
	if _, err := exec.LookPath("pactl"); err == nil && pid > 0 {
		if vol != nil {
			_ = exec.Command("pactl", "set-sink-input-volume", strconv.Itoa(pid), fmt.Sprintf("%d%%", *vol)).Run()
		}
		if muted != nil {
			m := "0"
			if *muted {
				m = "1"
			}
			_ = exec.Command("pactl", "set-sink-input-mute", strconv.Itoa(pid), m).Run()
		}
	}
	return nil
}

func toggleMicMuteOS(mute bool) error {
	if _, err := exec.LookPath("pactl"); err == nil {
		m := "0"
		if mute {
			m = "1"
		}
		return exec.Command("pactl", "set-source-mute", "@DEFAULT_SOURCE@", m).Run()
	}
	return nil
}

func runImageOCROS(_ []byte) (string, string, error) {
	return "", "Oxygen OCR (Linux)", fmt.Errorf("установите tesseract или запустите на Windows для встроенного WinRT OCR")
}

func pastePlainTextOS() {}

func oxygenRemoteInputOS(_ string, _, _ int, _ string) {}
