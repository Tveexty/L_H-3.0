//go:build windows

package main

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

const (
	miracastCastURI            = "ms-settings-connectabledevices:devicediscovery"
	miracastProjectSettingsURI = "ms-settings:project"
	miracastReceiverAppURI     = `shell:AppsFolder\Microsoft.PPIProjection_cw5n1h2txyewy!Microsoft.PPIProjection`
)

var (
	miracastShell32        = syscall.NewLazyDLL("shell32.dll")
	procMiracastShellExecW = miracastShell32.NewProc("ShellExecuteW")
	miracastUser32         = syscall.NewLazyDLL("user32.dll")
	procMiracastKeybdEvent = miracastUser32.NewProc("keybd_event")
)

func shellExecuteURI(target, params string) error {
	verbPtr, _ := syscall.UTF16PtrFromString("open")
	filePtr, err := syscall.UTF16PtrFromString(target)
	if err != nil {
		return err
	}
	var paramsPtr *uint16
	if params != "" {
		paramsPtr, _ = syscall.UTF16PtrFromString(params)
	}
	ret, _, callErr := procMiracastShellExecW.Call(
		0,
		uintptr(unsafe.Pointer(verbPtr)),
		uintptr(unsafe.Pointer(filePtr)),
		uintptr(unsafe.Pointer(paramsPtr)),
		0,
		1, // SW_SHOWNORMAL
	)
	if ret <= 32 {
		if callErr != nil && callErr != syscall.Errno(0) {
			return callErr
		}
		return syscall.Errno(ret)
	}
	return nil
}

func triggerWinKCastHotkey() {
	const (
		vkLWin        = 0x5B
		vkK           = 0x4B
		keyEventFUp   = 0x0002
	)
	procMiracastKeybdEvent.Call(vkLWin, 0, 0, 0)
	time.Sleep(25 * time.Millisecond)
	procMiracastKeybdEvent.Call(vkK, 0, 0, 0)
	time.Sleep(25 * time.Millisecond)
	procMiracastKeybdEvent.Call(vkK, 0, keyEventFUp, 0)
	procMiracastKeybdEvent.Call(vkLWin, 0, keyEventFUp, 0)
}

func isWirelessDisplayFeatureInstalledWin() bool {
	winDir := os.Getenv("SystemRoot")
	if winDir == "" {
		winDir = `C:\Windows`
	}
	candidates := []string{
		filepath.Join(winDir, "SystemApps", "Microsoft.PPIProjection_cw5n1h2txyewy", "Receiver.exe"),
		filepath.Join(winDir, "SystemApps", "Microsoft.PPIProjection_cw5n1h2txyewy", "AppxManifest.xml"),
		filepath.Join(winDir, "System32", "Connect.exe"),
	}
	for _, p := range candidates {
		if st, err := os.Stat(p); err == nil && !st.IsDir() {
			return true
		}
	}
	return false
}

func shellExecuteVerb(verb, target, params string) error {
	verbPtr, _ := syscall.UTF16PtrFromString(verb)
	filePtr, err := syscall.UTF16PtrFromString(target)
	if err != nil {
		return err
	}
	var paramsPtr *uint16
	if params != "" {
		paramsPtr, _ = syscall.UTF16PtrFromString(params)
	}
	ret, _, callErr := procMiracastShellExecW.Call(
		0,
		uintptr(unsafe.Pointer(verbPtr)),
		uintptr(unsafe.Pointer(filePtr)),
		uintptr(unsafe.Pointer(paramsPtr)),
		0,
		1, // SW_SHOWNORMAL
	)
	if ret <= 32 {
		if callErr != nil && callErr != syscall.Errno(0) {
			return callErr
		}
		return syscall.Errno(ret)
	}
	return nil
}

func probeWifiMiracastWin() (wifiAvail bool, miracastOK bool, adapterName string) {
	// Luma OS 1.8.2: Use UTF-8 PowerShell wrapper first so Russian Windows CP866 output
	// ("Имя интерфейса", "Поддержка беспроводного дисплея: Да") decodes accurately!
	var out string
	if psOut, err := runHiddenPowerShell(`[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; $OutputEncoding=[System.Text.Encoding]::UTF8; netsh wlan show drivers 2>&1 | Out-String`); err == nil && strings.TrimSpace(psOut) != "" {
		out = psOut
	} else {
		ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
		defer cancel()
		cmd := exec.CommandContext(ctx, "netsh", "wlan", "show", "drivers")
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		outBytes, err := cmd.Output()
		if err != nil && len(outBytes) == 0 {
			return false, false, ""
		}
		out = string(outBytes)
	}

	lower := strings.ToLower(out)
	if strings.TrimSpace(out) == "" ||
		strings.Contains(lower, "there is no wireless interface") ||
		strings.Contains(lower, "беспроводной интерфейс отсутствует") ||
		(strings.Contains(lower, "wlan autoconfig") && strings.Contains(lower, "not running")) ||
		(strings.Contains(lower, "автонастройки wlan") && strings.Contains(lower, "не запущена")) {
		return false, false, ""
	}

	wifiAvail = true
	for _, raw := range strings.Split(out, "\n") {
		line := strings.TrimSpace(raw)
		l := strings.ToLower(line)
		if adapterName == "" && (strings.HasPrefix(l, "interface name") || strings.HasPrefix(l, "имя интерфейса")) {
			if idx := strings.Index(line, ":"); idx >= 0 {
				adapterName = strings.TrimSpace(line[idx+1:])
			}
		}
		if strings.Contains(l, "wireless display supported") || strings.Contains(l, "беспроводного дисплея") {
			if strings.Contains(l, "yes") || strings.Contains(l, "да") {
				miracastOK = true
			}
		}
	}
	if adapterName == "" {
		adapterName = "Wi-Fi"
	}
	return wifiAvail, miracastOK, adapterName
}

func installWirelessDisplayFeatureNative() MiracastActionResult {
	if isWirelessDisplayFeatureInstalledWin() {
		return MiracastActionResult{
			OK:      true,
			Action:  "install_wireless_display",
			Message: "Компонент Windows «Беспроводной дисплей» уже установлен и готов к работе.",
		}
	}
	args := `-NoProfile -ExecutionPolicy Bypass -Command "Write-Host '=== Luma OS 1.8.2: Установка компонента Windows Беспроводной дисплей ===' -ForegroundColor Cyan; DISM /Online /Add-Capability /CapabilityName:App.WirelessDisplay.Connect~~~~0.0.1.0; Write-Host ''; Write-Host 'Готово! Теперь можно закрыть это окно и нажать кнопку обновления статуса в Luma OS.' -ForegroundColor Green; Start-Sleep -Seconds 6"`
	if err := shellExecuteVerb("runas", "powershell.exe", args); err != nil {
		return MiracastActionResult{
			OK:                 false,
			Action:             "install_wireless_display",
			InstallSettingsURI: miracastProjectSettingsURI,
			Message:            "Не удалось запустить установку с правами администратора. Вы можете использовать встроенный Luma AirDisplay (работает без Miracast!) или открыть Параметры Windows.",
			Error:              err.Error(),
		}
	}
	return MiracastActionResult{
		OK:      true,
		Action:  "install_wireless_display",
		Message: "Запущена установка компонента «Беспроводной дисплей» (DISM). Подтвердите запрос Windows и дождитесь завершения.",
	}
}

func probeMiracastStatusNative(activeMode string) MiracastStatusInfo {
	wifiAvail, miracastOK, adapter := probeWifiMiracastWin()
	installed := isWirelessDisplayFeatureInstalledWin()

	msg := "Miracast полностью готов: доступны трансляция на второй экран и режим приёмника."
	if !wifiAvail {
		msg = "Wi-Fi модуль не найден или выключен — для Miracast нужен адаптер Wi-Fi."
	} else if !miracastOK {
		msg = "Wi-Fi найден, но драйвер может не поддерживать Miracast."
	} else if !installed {
		msg = "Трансляция на другой экран готова. Для режима приёмника нужно установить «Беспроводной дисплей»."
	}

	return MiracastStatusInfo{
		OK:                       true,
		WifiAvailable:            wifiAvail,
		MiracastSupported:        miracastOK,
		WirelessDisplayInstalled: installed,
		AdapterName:              adapter,
		ActiveDisplayMode:        activeMode,
		Message:                  msg,
	}
}

func openWindowsCastNative() MiracastActionResult {
	wifiAvail, miracastOK, _ := probeWifiMiracastWin()
	if !wifiAvail {
		return MiracastActionResult{
			OK:             false,
			Action:         "cast",
			NoWifiMiracast: true,
			Message:        "На компьютере не обнаружен активный Wi-Fi адаптер для подключения экрана по Miracast.",
			Error:          "Отсутствует активный Wi-Fi модуль.",
		}
	}

	if err := shellExecuteURI(miracastCastURI, ""); err == nil {
		msg := "Панель подключения беспроводного экрана (Windows Cast) открыта."
		if !miracastOK {
			msg = "Панель Windows Cast открыта (проверьте поддержку Miracast в драйвере Wi-Fi)."
		}
		return MiracastActionResult{
			OK:      true,
			Action:  "cast",
			Message: msg,
		}
	}

	// Fallback: Win + K native hotkey emulation
	triggerWinKCastHotkey()
	return MiracastActionResult{
		OK:      true,
		Action:  "cast",
		Message: "Панель беспроводных экранов открыта через сочетание Win + K.",
	}
}

func startWirelessDisplayReceiverNative() MiracastActionResult {
	wifiAvail, _, _ := probeWifiMiracastWin()
	if !wifiAvail {
		return MiracastActionResult{
			OK:                 false,
			Action:             "receive",
			NoWifiMiracast:     true,
			InstallSettingsURI: miracastProjectSettingsURI,
			Message:            "Для работы этого ПК в качестве беспроводного экрана необходим активный Wi-Fi модуль с поддержкой Miracast.",
			Error:              "Wi-Fi адаптер отсутствует или выключен.",
		}
	}

	if !isWirelessDisplayFeatureInstalledWin() {
		return MiracastActionResult{
			OK:                 false,
			Action:             "receive",
			MissingComponent:   true,
			InstallSettingsURI: miracastProjectSettingsURI,
			Message:            "Компонент Windows «Беспроводной дисплей» не установлен. Нажмите кнопку ниже, чтобы открыть Параметры → Система → Проецирование на этот компьютер.",
			Error:              "Компонент Microsoft.PPIProjection не найден в системе.",
		}
	}

	if err := shellExecuteURI("explorer.exe", miracastReceiverAppURI); err != nil {
		return MiracastActionResult{
			OK:                 false,
			Action:             "receive",
			MissingComponent:   true,
			InstallSettingsURI: miracastProjectSettingsURI,
			Message:            "Не удалось запустить «Беспроводной дисплей». Откройте параметры проецирования Windows.",
			Error:              err.Error(),
		}
	}

	return MiracastActionResult{
		OK:      true,
		Action:  "receive",
		Message: "Приложение «Беспроводной дисплей» запущено — этот ПК готов принимать картинку как второй экран!",
	}
}

func openProjectionSettingsNative() MiracastActionResult {
	if err := shellExecuteURI(miracastProjectSettingsURI, ""); err != nil {
		return MiracastActionResult{
			OK:      false,
			Action:  "open_project_settings",
			Message: "Не удалось открыть Параметры проецирования Windows.",
			Error:   err.Error(),
		}
	}
	return MiracastActionResult{
		OK:      true,
		Action:  "open_project_settings",
		Message: "Открыты Параметры Windows → Система → Проецирование на этот компьютер.",
	}
}

func switchDisplayProjectionModeNative(mode string) MiracastActionResult {
	var arg, label, norm string
	switch mode {
	case "clone", "duplicate":
		arg = "/clone"
		label = "Дублировать экраны"
		norm = "clone"
	case "extend":
		arg = "/extend"
		label = "Расширить рабочий стол"
		norm = "extend"
	case "internal", "pc":
		arg = "/internal"
		label = "Только экран ПК"
		norm = "internal"
	case "external", "second":
		arg = "/external"
		label = "Только второй экран"
		norm = "external"
	default:
		return MiracastActionResult{
			OK:      false,
			Action:  "display_mode",
			Message: "Неверный режим экрана. Используйте clone, extend, internal или external.",
			Error:   "unsupported mode",
		}
	}

	winDir := os.Getenv("SystemRoot")
	if winDir == "" {
		winDir = `C:\Windows`
	}
	exePath := filepath.Join(winDir, "System32", "DisplaySwitch.exe")
	if _, err := os.Stat(exePath); err != nil {
		exePath = "DisplaySwitch.exe"
	}

	cmd := exec.Command(exePath, arg)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if err := cmd.Start(); err != nil {
		return MiracastActionResult{
			OK:      false,
			Action:  "display_mode",
			Message: "Не удалось переключить режим экрана (" + label + ").",
			Error:   err.Error(),
		}
	}
	go func() { _ = cmd.Wait() }()

	return MiracastActionResult{
		OK:                true,
		Action:            "display_mode",
		ActiveDisplayMode: norm,
		Message:           "Режим экрана переключён: " + label + ".",
	}
}
