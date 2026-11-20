//go:build !windows

package main

func runNativeDesktopWindow(url string) bool {
	return false
}

func toggleNativeFullscreen(force *bool) bool {
	return false
}

func isNativeFullscreen() bool {
	return false
}
