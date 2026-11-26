//go:build windows

package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"golang.org/x/sys/windows/registry"
)

type SystemHandlersConfig struct {
	PhotosInLuma   bool   `json:"photos_in_luma"`
	ExplorerInLuma bool   `json:"explorer_in_luma"`
	CodeInLuma     bool   `json:"code_in_luma"`
	OfficeInLuma   bool   `json:"office_in_luma"`
	RegisterOS     bool   `json:"register_os"` // Register per-user HKCU Windows handlers
	Action         string `json:"action,omitempty"`
}

var (
	sysHandlersMu  sync.RWMutex
	sysHandlersCfg = SystemHandlersConfig{
		PhotosInLuma:   true,
		ExplorerInLuma: true,
		CodeInLuma:     true,
		OfficeInLuma:   true,
		RegisterOS:     false,
	}
)

var lumaPhotoExts = []string{".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
var lumaCodeExts = []string{".txt", ".md", ".json", ".log"}

func getSystemFileHandlersStatus() map[string]interface{} {
	sysHandlersMu.RLock()
	cfg := sysHandlersCfg
	sysHandlersMu.RUnlock()

	// Check if HKCU LumaPhotoStudio ProgID exists
	osRegistered := false
	if k, err := registry.OpenKey(registry.CURRENT_USER, `Software\Classes\LumaOS.PhotoStudio\shell\open\command`, registry.QUERY_VALUE); err == nil {
		_ = k.Close()
		osRegistered = true
	}

	return map[string]interface{}{
		"ok":               true,
		"photos_in_luma":   cfg.PhotosInLuma,
		"explorer_in_luma": cfg.ExplorerInLuma,
		"code_in_luma":     cfg.CodeInLuma,
		"office_in_luma":   cfg.OfficeInLuma,
		"os_registered":    osRegistered,
		"is_pro":           isProEdition(),
		"message":          map[bool]string{true: "Все фото, папки и файлы открываются через Luma OS (HKCU интегрирован)", false: "Все фото, папки и файлы открываются внутри Luma OS"}[osRegistered],
	}
}

func applySystemFileHandlers(req SystemHandlersConfig) map[string]interface{} {
	sysHandlersMu.Lock()
	if strings.EqualFold(req.Action, "restore") {
		sysHandlersCfg.RegisterOS = false
	} else {
		sysHandlersCfg = req
	}
	sysHandlersMu.Unlock()

	if strings.EqualFold(req.Action, "restore") {
		_ = registry.DeleteKey(registry.CURRENT_USER, `Software\Classes\LumaOS.PhotoStudio\shell\open\command`)
		_ = registry.DeleteKey(registry.CURRENT_USER, `Software\Classes\LumaOS.PhotoStudio\shell\open`)
		_ = registry.DeleteKey(registry.CURRENT_USER, `Software\Classes\LumaOS.PhotoStudio\shell`)
		_ = registry.DeleteKey(registry.CURRENT_USER, `Software\Classes\LumaOS.PhotoStudio`)
		_ = registry.DeleteKey(registry.CURRENT_USER, `Software\Classes\Directory\shell\OpenInLumaExplorer\command`)
		_ = registry.DeleteKey(registry.CURRENT_USER, `Software\Classes\Directory\shell\OpenInLumaExplorer`)
		_ = registry.DeleteKey(registry.CURRENT_USER, `Software\Classes\SystemFileAssociations\image\shell\OpenInLumaPhoto\command`)
		_ = registry.DeleteKey(registry.CURRENT_USER, `Software\Classes\SystemFileAssociations\image\shell\OpenInLumaPhoto`)
		st := getSystemFileHandlersStatus()
		st["message"] = "Стандартные ассоциации Windows восстановлены"
		return st
	}

	if req.RegisterOS {
		exePath, err := os.Executable()
		if err == nil {
			exePath, _ = filepath.Abs(exePath)
			// 1. Register Luma Photo Studio ProgID & Image context menu + OpenWith
			if req.PhotosInLuma {
				photoCmd := fmt.Sprintf(`"%s" --open-photo "%%1"`, exePath)
				if k, _, kerr := registry.CreateKey(registry.CURRENT_USER, `Software\Classes\LumaOS.PhotoStudio\shell\open\command`, registry.SET_VALUE); kerr == nil {
					_ = k.SetStringValue("", photoCmd)
					_ = k.Close()
				}
				if k, _, kerr := registry.CreateKey(registry.CURRENT_USER, `Software\Classes\SystemFileAssociations\image\shell\OpenInLumaPhoto`, registry.SET_VALUE); kerr == nil {
					_ = k.SetStringValue("", "Открыть в Luma Photo Studio")
					_ = k.SetStringValue("Icon", exePath)
					_ = k.Close()
				}
				if k, _, kerr := registry.CreateKey(registry.CURRENT_USER, `Software\Classes\SystemFileAssociations\image\shell\OpenInLumaPhoto\command`, registry.SET_VALUE); kerr == nil {
					_ = k.SetStringValue("", photoCmd)
					_ = k.Close()
				}
				for _, ext := range lumaPhotoExts {
					if k, _, kerr := registry.CreateKey(registry.CURRENT_USER, `Software\Classes\`+ext+`\OpenWithProgids`, registry.SET_VALUE); kerr == nil {
						_ = k.SetStringValue("LumaOS.PhotoStudio", "")
						_ = k.Close()
					}
					if isProEdition() {
						if k, _, kerr := registry.CreateKey(registry.CURRENT_USER, `Software\Classes\`+ext, registry.SET_VALUE); kerr == nil {
							_ = k.SetStringValue("", "LumaOS.PhotoStudio")
							_ = k.Close()
						}
					}
				}
			}

			// 2. Register Luma Explorer for Folders (Directory shell handler)
			if req.ExplorerInLuma {
				dirCmd := fmt.Sprintf(`"%s" --open-folder "%%1"`, exePath)
				if k, _, kerr := registry.CreateKey(registry.CURRENT_USER, `Software\Classes\Directory\shell\OpenInLumaExplorer`, registry.SET_VALUE); kerr == nil {
					_ = k.SetStringValue("", "Открыть в Проводнике Luma OS")
					_ = k.SetStringValue("Icon", exePath)
					_ = k.Close()
				}
				if k, _, kerr := registry.CreateKey(registry.CURRENT_USER, `Software\Classes\Directory\shell\OpenInLumaExplorer\command`, registry.SET_VALUE); kerr == nil {
					_ = k.SetStringValue("", dirCmd)
					_ = k.Close()
				}
			}

			// 3. Register Luma Code Studio for text/code files
			if req.CodeInLuma {
				codeCmd := fmt.Sprintf(`"%s" --open-code "%%1"`, exePath)
				if k, _, kerr := registry.CreateKey(registry.CURRENT_USER, `Software\Classes\LumaOS.CodeStudio\shell\open\command`, registry.SET_VALUE); kerr == nil {
					_ = k.SetStringValue("", codeCmd)
					_ = k.Close()
				}
				for _, ext := range lumaCodeExts {
					if k, _, kerr := registry.CreateKey(registry.CURRENT_USER, `Software\Classes\`+ext+`\OpenWithProgids`, registry.SET_VALUE); kerr == nil {
						_ = k.SetStringValue("LumaOS.CodeStudio", "")
						_ = k.Close()
					}
				}
			}
		}
	}

	return getSystemFileHandlersStatus()
}
