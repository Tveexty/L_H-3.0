//go:build !windows

package main

import (
	"os"
	"path/filepath"
)

func listRemovableDrives() []UsbDriveInfo {
	var out []UsbDriveInfo
	for _, base := range []string{"/media", "/mnt"} {
		entries, err := os.ReadDir(base)
		if err != nil {
			continue
		}
		for _, e := range entries {
			if e.IsDir() {
				out = append(out, UsbDriveInfo{
					Path:  filepath.Join(base, e.Name()),
					Label: e.Name(),
				})
			}
		}
	}
	return out
}

func stripWindowsFileAttributes(_ string) {}

func hasMarkOfTheWeb(_ string) bool {
	return false
}

func killProcessByPID(_ int) bool {
	return false
}

func killProcessByPath(_ string) int {
	return 0
}

func scanSuspiciousRemoteProcesses() []suspiciousProcHit {
	return nil
}
