//go:build !windows

package main

import "fmt"

func platformGetIdleSeconds() int64 { return 0 }

func platformSetKeepAwake(keepAwake bool) {}

func platformReadIdleSleepConfig() (IdleSleepConfig, bool) {
	return defaultIdleSleepConfig(), false
}

func platformApplyIdleSleepConfig(cfg IdleSleepConfig) (bool, string) {
	return true, fmt.Sprintf("Сохранено: экран %d/%d мин, сон %d/%d мин", cfg.DisplayOffACMin, cfg.DisplayOffDCMin, cfg.SleepACMin, cfg.SleepDCMin)
}
