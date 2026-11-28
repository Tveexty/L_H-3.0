//go:build !windows

package main

func getSteamInstallRootsNative() []string {
	return nil
}

func getSteamUpdatingAppsFromRegistry() map[string]steamRegAppState {
	return map[string]steamRegAppState{}
}

func getSteamProcessIOCountersNative() (pid uint32, readBytes uint64, writeBytes uint64, otherBytes uint64, ok bool) {
	return 0, 0, 0, 0, false
}
