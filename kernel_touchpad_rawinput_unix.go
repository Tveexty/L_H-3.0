//go:build !windows

package main

import (
	"sync"
)

type NativeTouchpadGestureEvent struct {
	Type    string  `json:"type"`
	Gesture string  `json:"gesture"`
	Fingers int     `json:"fingers"`
	Vx      float64 `json:"vx"`
	Vy      float64 `json:"vy"`
	Source  string  `json:"source"`
	AtMs    int64   `json:"at_ms"`
}

var (
	tpSubMu   sync.Mutex
	tpNextSub int
	tpSubs    = map[int]chan NativeTouchpadGestureEvent{}
)

func subscribeNativeTouchpadGestures() (int, <-chan NativeTouchpadGestureEvent) {
	tpSubMu.Lock()
	defer tpSubMu.Unlock()
	tpNextSub++
	id := tpNextSub
	ch := make(chan NativeTouchpadGestureEvent, 16)
	tpSubs[id] = ch
	return id, ch
}

func unsubscribeNativeTouchpadGestures(id int) {
	tpSubMu.Lock()
	if ch, ok := tpSubs[id]; ok {
		delete(tpSubs, id)
		close(ch)
	}
	tpSubMu.Unlock()
}

func getNativeTouchpadGestureStatus() map[string]interface{} {
	return map[string]interface{}{
		"ok":                true,
		"platform":          "unix",
		"raw_input_active":  false,
		"gestures_detected": 0,
		"last_gesture":      "",
		"last_gesture_at":   0,
	}
}
