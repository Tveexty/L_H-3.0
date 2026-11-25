//go:build !windows

package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
)

func winReadFileShareSafe(path string, maxBytes int64) ([]byte, int64, string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, 0, "", err
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil {
		return nil, 0, "", err
	}
	size := st.Size()
	if size <= 0 {
		return nil, 0, "", nil
	}
	var data []byte
	if size <= maxBytes {
		data, err = os.ReadFile(path)
		if err != nil {
			return nil, size, "", err
		}
	} else {
		data = make([]byte, maxBytes)
		n, rerr := f.ReadAt(data, size-maxBytes)
		if n <= 0 {
			return nil, size, "", rerr
		}
		data = data[:n]
	}
	h := sha256.New()
	_, _ = fmt.Fprintf(h, "%d:%d:", size, st.ModTime().UnixNano())
	h.Write(data)
	return data, size, hex.EncodeToString(h.Sum(nil)[:16]), nil
}

func (b *OSNotificationBridge) startWinLiveUIAToastWatcher() {}

func (b *OSNotificationBridge) startWinActionCenterFallbackPoller() {}

func winGetRunningMessengers() []string { return nil }

func winIsUIAActive() bool { return false }
