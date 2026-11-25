//go:build !windows

package main

import "sync"

var (
	unixTouchpadMu       sync.Mutex
	unixTouchpadDisabled bool
)

func setWindowsTouchpadGesturesDisabled(disable bool) {
	unixTouchpadMu.Lock()
	unixTouchpadDisabled = disable
	unixTouchpadMu.Unlock()
}

func restoreWindowsTouchpadGestures() {
	unixTouchpadMu.Lock()
	unixTouchpadDisabled = false
	unixTouchpadMu.Unlock()
}

func isWindowsTouchpadGesturesDisabled() bool {
	unixTouchpadMu.Lock()
	defer unixTouchpadMu.Unlock()
	return unixTouchpadDisabled
}
