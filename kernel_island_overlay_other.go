//go:build !windows

package main

func startNativeIslandOverlayEngine() {}

func stopNativeIslandOverlayEngine() {}

func applyNativeIslandOverlayConfig(_ IslandOverlayConfig) {}

func notifyNativeIslandOverlayRedraw() {}

func isNativeIslandOverlayActive() bool {
	return false
}
