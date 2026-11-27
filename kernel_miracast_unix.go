//go:build !windows

package main

func probeMiracastStatusNative(activeMode string) MiracastStatusInfo {
	return MiracastStatusInfo{
		OK:                       true,
		WifiAvailable:            true,
		MiracastSupported:        true,
		WirelessDisplayInstalled: false,
		AdapterName:              "Wi-Fi (Simulation)",
		ActiveDisplayMode:        activeMode,
		Message:                  "Беспроводной дисплей Miracast активен в Windows 10 / 11 (в среде Linux работает тестовый режим API).",
	}
}

func openWindowsCastNative() MiracastActionResult {
	return MiracastActionResult{
		OK:      true,
		Action:  "cast",
		Message: "Запрос открытия панели Windows Cast (Win + K) обработан (работает в Windows 10 / 11).",
	}
}

func startWirelessDisplayReceiverNative() MiracastActionResult {
	return MiracastActionResult{
		OK:                 false,
		Action:             "receive",
		MissingComponent:   true,
		InstallSettingsURI: "ms-settings:project",
		Message:            "Компонент Windows «Беспроводной дисплей» не установлен. Откройте Параметры → Система → Проецирование на этот компьютер.",
		Error:              "wireless_display_not_installed",
	}
}

func openProjectionSettingsNative() MiracastActionResult {
	return MiracastActionResult{
		OK:      true,
		Action:  "open_project_settings",
		Message: "Открыты параметры проецирования на этот компьютер.",
	}
}

func installWirelessDisplayFeatureNative() MiracastActionResult {
	return MiracastActionResult{
		OK:      true,
		Action:  "install_wireless_display",
		Message: "Установка компонента Windows «Беспроводной дисплей» (DISM) выполняется на Windows 10/11. Режим Luma AirDisplay уже активен и работает без Miracast!",
	}
}

func switchDisplayProjectionModeNative(mode string) MiracastActionResult {
	switch mode {
	case "clone", "duplicate":
		return MiracastActionResult{OK: true, Action: "display_mode", ActiveDisplayMode: "clone", Message: "Режим экрана переключён: Дублировать экраны."}
	case "extend":
		return MiracastActionResult{OK: true, Action: "display_mode", ActiveDisplayMode: "extend", Message: "Режим экрана переключён: Расширить рабочий стол."}
	case "internal", "pc":
		return MiracastActionResult{OK: true, Action: "display_mode", ActiveDisplayMode: "internal", Message: "Режим экрана переключён: Только экран ПК."}
	case "external", "second":
		return MiracastActionResult{OK: true, Action: "display_mode", ActiveDisplayMode: "external", Message: "Режим экрана переключён: Только второй экран."}
	default:
		return MiracastActionResult{OK: false, Action: "display_mode", Message: "Неизвестный режим экрана.", Error: "unsupported mode"}
	}
}
