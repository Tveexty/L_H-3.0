//go:build !windows

package main

import (
	"fmt"
	"os/exec"
	"strings"
)

func listWindowsMicrosoftOfficeApps() []WindowsOfficeAppInfo {
	return []WindowsOfficeAppInfo{
		{
			ID:         "ms_word",
			Kind:       "word",
			Name:       "Microsoft Word",
			ShortName:  "Word",
			ExecPath:   "WINWORD.EXE",
			LaunchURI:  "ms-word:",
			Installed:  false,
			BrandColor: "#185ABD",
			Publisher:  "Microsoft Corporation",
			Detail:     "Документы .docx (Windows)",
		},
		{
			ID:         "ms_excel",
			Kind:       "excel",
			Name:       "Microsoft Excel",
			ShortName:  "Excel",
			ExecPath:   "EXCEL.EXE",
			LaunchURI:  "ms-excel:",
			Installed:  false,
			BrandColor: "#107C41",
			Publisher:  "Microsoft Corporation",
			Detail:     "Таблицы .xlsx (Windows)",
		},
		{
			ID:         "ms_powerpoint",
			Kind:       "powerpoint",
			Name:       "Microsoft PowerPoint",
			ShortName:  "PowerPoint",
			ExecPath:   "POWERPNT.EXE",
			LaunchURI:  "ms-powerpoint:",
			Installed:  false,
			BrandColor: "#C43E1C",
			Publisher:  "Microsoft Corporation",
			Detail:     "Презентации .pptx (Windows)",
		},
	}
}

func launchWindowsMicrosoftOfficeApp(kind, rawTarget, args string) (string, bool, error) {
	return "", false, fmt.Errorf("запуск нативного Microsoft %s доступен в Windows-версии Luma OS", strings.Title(kind))
}

func smartLaunchWindowsTarget(cleanTarget, name, args string) (string, int, error) {
	if strings.HasPrefix(cleanTarget, "http://") || strings.HasPrefix(cleanTarget, "https://") {
		cmd := exec.Command("xdg-open", cleanTarget)
		if err := cmd.Start(); err == nil && cmd.Process != nil {
			return cleanTarget, cmd.Process.Pid, nil
		}
	}
	return cleanTarget, 0, nil
}
