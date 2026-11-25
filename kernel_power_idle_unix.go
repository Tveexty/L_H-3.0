//go:build !windows

package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func platformGetIdleSeconds() int64 { return 0 }

func platformSetKeepAwake(keepAwake bool) {}

func platformReadIdleSleepConfig() (IdleSleepConfig, bool) {
	return defaultIdleSleepConfig(), false
}

func platformApplyIdleSleepConfig(cfg IdleSleepConfig) (bool, string) {
	return true, fmt.Sprintf("Сохранено: экран %d/%d мин, сон %d/%d мин", cfg.DisplayOffACMin, cfg.DisplayOffDCMin, cfg.SleepACMin, cfg.SleepDCMin)
}

func platformApplyChargeLimit(cfg ChargeLimitConfig, batteryPct int) (bool, string, string, string) {
	stopActive := cfg.StopChargingNow || cfg.Enabled
	target := cfg.LimitPercent
	if !stopActive {
		target = 100
	} else if cfg.StopChargingNow && target > 60 {
		target = 60
	}

	matches, _ := filepath.Glob("/sys/class/power_supply/BAT*")
	for _, batDir := range matches {
		behPath := filepath.Join(batDir, "charge_behaviour")
		if cfg.StopChargingNow {
			if os.WriteFile(behPath, []byte("inhibit-charge\n"), 0o644) == nil {
				return true, "Linux ACPI", "sysfs inhibit-charge", "Аппаратная остановка зарядки батареи активна (inhibit-charge)"
			}
		} else if !stopActive {
			_ = os.WriteFile(behPath, []byte("auto\n"), 0o644)
		}
		endPath := filepath.Join(batDir, "charge_control_end_threshold")
		if os.WriteFile(endPath, []byte(strconv.Itoa(target)+"\n"), 0o644) == nil {
			if stopActive {
				return true, "Linux ACPI", "sysfs charge_control_end_threshold", fmt.Sprintf("Аппаратный порог заряда %d%% применён", target)
			}
			return true, "Linux ACPI", "sysfs charge_control_end_threshold", "Аппаратный порог снят (100%)"
		}
	}

	vendorBytes, _ := os.ReadFile("/sys/class/dmi/id/sys_vendor")
	vendor := strings.TrimSpace(string(vendorBytes))
	if vendor == "" {
		vendor = "Linux Host"
	}
	if stopActive {
		return false, vendor, "Luma Eco Guard", fmt.Sprintf("Режим сбережения батареи активен (порог %d%%)", target)
	}
	return false, vendor, "Standard AC", "Стандартный режим зарядки (100%)"
}
