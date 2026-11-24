//go:build !windows

package main

import (
	"sync"
	"time"
)

var (
	unixMruMu     sync.Mutex
	unixMruLastMs = map[int]int64{}
)

func startForegroundMRUTracker() {}

func recordWindowMRU(pid int) {
	if pid <= 0 {
		return
	}
	unixMruMu.Lock()
	unixMruLastMs[pid] = time.Now().UnixMilli()
	unixMruMu.Unlock()
}

func getWindowMRUSnapshot() map[int]int64 {
	unixMruMu.Lock()
	defer unixMruMu.Unlock()
	out := make(map[int]int64, len(unixMruLastMs))
	for k, v := range unixMruLastMs {
		out[k] = v
	}
	return out
}

func captureHostWindowPreview(pid int) string {
	return ""
}
