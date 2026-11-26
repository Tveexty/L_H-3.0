//go:build !windows

package main

import (
	"strings"
	"sync"
)

type SystemHandlersConfig struct {
	PhotosInLuma   bool   `json:"photos_in_luma"`
	ExplorerInLuma bool   `json:"explorer_in_luma"`
	CodeInLuma     bool   `json:"code_in_luma"`
	OfficeInLuma   bool   `json:"office_in_luma"`
	RegisterOS     bool   `json:"register_os"`
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

func getSystemFileHandlersStatus() map[string]interface{} {
	sysHandlersMu.RLock()
	cfg := sysHandlersCfg
	sysHandlersMu.RUnlock()
	return map[string]interface{}{
		"ok":               true,
		"photos_in_luma":   cfg.PhotosInLuma,
		"explorer_in_luma": cfg.ExplorerInLuma,
		"code_in_luma":     cfg.CodeInLuma,
		"office_in_luma":   cfg.OfficeInLuma,
		"os_registered":    cfg.RegisterOS,
		"is_pro":           isProEdition(),
		"message":          "Все фото, папки и файлы открываются внутри Luma OS",
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
	return getSystemFileHandlersStatus()
}
