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
	_, _ = fmt.Fprintf(h, "%d:", size)
	if len(data) > 4096 {
		h.Write(data[:4096])
	} else {
		h.Write(data)
	}
	if len(data) > 16384 {
		h.Write(data[len(data)-16384:])
	}
	return data, size, hex.EncodeToString(h.Sum(nil)[:10]), nil
}

func (b *OSNotificationBridge) winScanLivePopupsAndDeltas() {}

func winGetRunningMessengers() []string { return nil }
