using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Runtime.Versioning;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace LumaOS.Backend.Display;

/// <summary>
/// Состояние поддержки Miracast и компонента «Беспроводной дисплей» в Windows.
/// </summary>
public sealed record MiracastStatusResult(
    bool Ok,
    bool WifiAvailable,
    bool MiracastSupported,
    bool WirelessDisplayInstalled,
    string AdapterName,
    string ActiveDisplayMode,
    string Message,
    string? Error = null
);

/// <summary>
/// Результат выполнения команды Miracast или переключения режима экрана.
/// </summary>
public sealed record MiracastActionResult(
    bool Ok,
    string Action,
    string Message,
    bool MissingComponent = false,
    bool NoWifiMiracast = false,
    string? InstallSettingsUri = null,
    string? Error = null
);

/// <summary>
/// Запрос на переключение режима проецирования через DisplaySwitch.exe.
/// </summary>
public sealed record DisplayModeRequest(string Mode);

/// <summary>
/// Luma OS 1.7.4 — Сервис беспроводного подключения второго экрана на базе встроенного Windows Miracast.
/// Поддерживает:
/// 1) Источник («Транслировать на другой экран»): ms-settings-connectabledevices:devicediscovery + Win+K fallback.
/// 2) Приёмник («Сделать этот ПК экраном»): проверка установки Microsoft.PPIProjection и запуск Беспроводного дисплея.
/// 3) Переключатель режимов экрана: DisplaySwitch.exe (/clone, /extend, /internal, /external).
/// </summary>
[SupportedOSPlatform("windows")]
public sealed class LumaMiracastService
{
    private const string CastDiscoveryUri = "ms-settings-connectabledevices:devicediscovery";
    private const string ProjectSettingsUri = "ms-settings:project";
    private const string WirelessDisplayAppUri =
        @"shell:AppsFolder\Microsoft.PPIProjection_cw5n1h2txyewy!Microsoft.PPIProjection";

    private const byte VkLWin = 0x5B;
    private const byte VkK = 0x4B;
    private const uint KeyEventFKeyUp = 0x0002;

    private string _lastDisplayMode = "extend";

    [DllImport("user32.dll", SetLastError = true)]
    private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    /// <summary>
    /// Проверяет наличие Wi-Fi адаптера с поддержкой Miracast и установлен ли компонент Windows «Беспроводной дисплей».
    /// </summary>
    public async Task<MiracastStatusResult> GetStatusAsync(CancellationToken ct = default)
    {
        try
        {
            var (wifiAvailable, miracastSupported, adapterName) = await ProbeWifiMiracastAsync(ct);
            var receiverInstalled = IsWirelessDisplayInstalled();

            string summary;
            if (!wifiAvailable)
            {
                summary = "Wi-Fi адаптер не обнаружен — для Miracast требуется Wi-Fi с поддержкой Wi-Fi Direct.";
            }
            else if (!miracastSupported)
            {
                summary = "Драйвер Wi-Fi не сообщает о поддержке Miracast (Wireless Display).";
            }
            else if (!receiverInstalled)
            {
                summary = "Miracast поддерживается (Источник готов). Для приёма установите «Беспроводной дисплей».";
            }
            else
            {
                summary = "Miracast полностью готов: доступны трансляция и приём второго экрана.";
            }

            return new MiracastStatusResult(
                Ok: true,
                WifiAvailable: wifiAvailable,
                MiracastSupported: miracastSupported,
                WirelessDisplayInstalled: receiverInstalled,
                AdapterName: adapterName,
                ActiveDisplayMode: _lastDisplayMode,
                Message: summary
            );
        }
        catch (Exception ex)
        {
            return new MiracastStatusResult(
                Ok: false,
                WifiAvailable: false,
                MiracastSupported: false,
                WirelessDisplayInstalled: false,
                AdapterName: string.Empty,
                ActiveDisplayMode: _lastDisplayMode,
                Message: "Не удалось проверить состояние Miracast.",
                Error: ex.Message
            );
        }
    }

    /// <summary>
    /// Режим 1 (Источник): открывает системную панель Windows Cast (аналог Win + K).
    /// </summary>
    public async Task<MiracastActionResult> OpenWindowsCastAsync(CancellationToken ct = default)
    {
        try
        {
            var status = await GetStatusAsync(ct);
            if (!status.WifiAvailable)
            {
                return new MiracastActionResult(
                    Ok: false,
                    Action: "cast",
                    Message: "На этом ПК не найден активный Wi-Fi адаптер для Miracast.",
                    NoWifiMiracast: true,
                    Error: "Модуль Wi-Fi с поддержкой Miracast отсутствует или отключён."
                );
            }

            // Основной способ: системный URI панели поиска беспроводных экранов
            try
            {
                LaunchShellUri(CastDiscoveryUri);
                return new MiracastActionResult(
                    Ok: true,
                    Action: "cast",
                    Message: status.MiracastSupported
                        ? "Панель подключения беспроводного экрана (Windows Cast) открыта."
                        : "Панель Windows Cast открыта (драйвер Wi-Fi может ограничивать Miracast)."
                );
            }
            catch
            {
                // Надёжный резерв: программная эмуляция системного вызова Win + K
                TriggerWinKHotkey();
                return new MiracastActionResult(
                    Ok: true,
                    Action: "cast",
                    Message: "Панель Windows Cast открыта через системное сочетание Win + K."
                );
            }
        }
        catch (Exception ex)
        {
            return new MiracastActionResult(
                Ok: false,
                Action: "cast",
                Message: "Не удалось открыть панель беспроводной трансляции Windows.",
                Error: ex.Message
            );
        }
    }

    /// <summary>
    /// Режим 2 (Приёмник): запускает встроенное приложение Windows «Беспроводной дисплей» (Connect / PPIProjection).
    /// Если компонент отсутствует, возвращает флаг MissingComponent и URI ms-settings:project.
    /// </summary>
    public async Task<MiracastActionResult> StartReceiverAsync(CancellationToken ct = default)
    {
        try
        {
            var status = await GetStatusAsync(ct);
            if (!status.WifiAvailable)
            {
                return new MiracastActionResult(
                    Ok: false,
                    Action: "receive",
                    Message: "Для работы ПК в роли беспроводного экрана нужен Wi-Fi адаптер с поддержкой Miracast.",
                    NoWifiMiracast: true,
                    InstallSettingsUri: ProjectSettingsUri,
                    Error: "Отсутствует Wi-Fi адаптер с поддержкой Miracast."
                );
            }

            if (!status.WirelessDisplayInstalled)
            {
                return new MiracastActionResult(
                    Ok: false,
                    Action: "receive",
                    Message: "Компонент Windows «Беспроводной дисплей» не установлен. Нажмите кнопку ниже, чтобы открыть Параметры → Проецирование на этот компьютер и установить его.",
                    MissingComponent: true,
                    InstallSettingsUri: ProjectSettingsUri,
                    Error: "Компонент Microsoft.PPIProjection (Беспроводной дисплей) не найден в системе."
                );
            }

            var psi = new ProcessStartInfo
            {
                FileName = "explorer.exe",
                Arguments = WirelessDisplayAppUri,
                UseShellExecute = true,
            };
            Process.Start(psi);

            return new MiracastActionResult(
                Ok: true,
                Action: "receive",
                Message: "Приложение «Беспроводной дисплей» запущено — этот ПК готов принимать картинку по Miracast."
            );
        }
        catch (Exception ex)
        {
            return new MiracastActionResult(
                Ok: false,
                Action: "receive",
                Message: "Не удалось запустить «Беспроводной дисплей». Проверьте параметры проецирования Windows.",
                MissingComponent: true,
                InstallSettingsUri: ProjectSettingsUri,
                Error: ex.Message
            );
        }
    }

    /// <summary>
    /// Открывает Параметры Windows → Система → Проецирование на этот компьютер (ms-settings:project).
    /// </summary>
    public MiracastActionResult OpenProjectSettings()
    {
        try
        {
            LaunchShellUri(ProjectSettingsUri);
            return new MiracastActionResult(
                Ok: true,
                Action: "open_project_settings",
                Message: "Открыты Параметры Windows → Проецирование на этот компьютер."
            );
        }
        catch (Exception ex)
        {
            return new MiracastActionResult(
                Ok: false,
                Action: "open_project_settings",
                Message: "Не удалось открыть параметры проецирования Windows.",
                Error: ex.Message
            );
        }
    }

    /// <summary>
    /// Режим 3 (Переключатель режимов экрана): вызывает DisplaySwitch.exe (/clone, /extend, /internal, /external).
    /// </summary>
    public MiracastActionResult SetDisplayMode(string mode)
    {
        var normalized = (mode ?? string.Empty).Trim().ToLowerInvariant();
        string arg;
        string label;
        switch (normalized)
        {
            case "clone":
            case "duplicate":
                arg = "/clone";
                label = "Дублировать экраны";
                normalized = "clone";
                break;
            case "extend":
                arg = "/extend";
                label = "Расширить рабочий стол";
                normalized = "extend";
                break;
            case "internal":
            case "pc":
                arg = "/internal";
                label = "Только экран ПК";
                normalized = "internal";
                break;
            case "external":
            case "second":
                arg = "/external";
                label = "Только второй экран";
                normalized = "external";
                break;
            default:
                return new MiracastActionResult(
                    Ok: false,
                    Action: "display_mode",
                    Message: "Неизвестный режим экрана. Доступны: clone, extend, internal, external.",
                    Error: $"Unsupported display mode: {mode}"
                );
        }

        try
        {
            var sysDir = Environment.GetFolderPath(Environment.SpecialFolder.System);
            var exePath = Path.Combine(sysDir, "DisplaySwitch.exe");
            if (!File.Exists(exePath))
            {
                exePath = "DisplaySwitch.exe";
            }

            var psi = new ProcessStartInfo
            {
                FileName = exePath,
                Arguments = arg,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            Process.Start(psi);
            _lastDisplayMode = normalized;

            return new MiracastActionResult(
                Ok: true,
                Action: "display_mode",
                Message: $"Режим экрана переключён: {label}."
            );
        }
        catch (Exception ex)
        {
            return new MiracastActionResult(
                Ok: false,
                Action: "display_mode",
                Message: $"Не удалось переключить режим экрана ({label}).",
                Error: ex.Message
            );
        }
    }

    /// <summary>
    /// Проверяет, установлен ли системный пакет «Беспроводной дисплей» (Microsoft.PPIProjection / Receiver.exe).
    /// </summary>
    private static bool IsWirelessDisplayInstalled()
    {
        try
        {
            var winDir = Environment.GetFolderPath(Environment.SpecialFolder.Windows);
            var systemAppsDir = Path.Combine(winDir, "SystemApps");
            var candidates = new[]
            {
                Path.Combine(systemAppsDir, "Microsoft.PPIProjection_cw5n1h2txyewy", "Receiver.exe"),
                Path.Combine(systemAppsDir, "Microsoft.PPIProjection_cw5n1h2txyewy", "AppxManifest.xml"),
                Path.Combine(winDir, "System32", "Connect.exe"),
            };

            foreach (var path in candidates)
            {
                if (File.Exists(path)) return true;
            }
        }
        catch
        {
            // Игнорируем ошибки доступа к файловой системе и переходим к возврату false
        }
        return false;
    }

    /// <summary>
    /// Опрашивает драйвер Wi-Fi через netsh wlan show drivers (поддержка Miracast / Wi-Fi Direct).
    /// </summary>
    private static async Task<(bool WifiAvailable, bool MiracastSupported, string AdapterName)> ProbeWifiMiracastAsync(
        CancellationToken ct
    )
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "netsh",
                Arguments = "wlan show drivers",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                StandardOutputEncoding = Encoding.UTF8,
            };

            using var proc = Process.Start(psi);
            if (proc is null) return (false, false, string.Empty);

            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(4));

            var output = await proc.StandardOutput.ReadToEndAsync(timeoutCts.Token);
            await proc.WaitForExitAsync(timeoutCts.Token);

            var lower = output.ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(output) ||
                lower.Contains("there is no wireless interface") ||
                lower.Contains("беспроводной интерфейс отсутствует") ||
                lower.Contains("wlan autoconfig") && lower.Contains("not running"))
            {
                return (false, false, string.Empty);
            }

            var adapterName = string.Empty;
            var miracastSupported = false;
            foreach (var rawLine in output.Split('\n'))
            {
                var line = rawLine.Trim();
                var l = line.ToLowerInvariant();
                if (string.IsNullOrEmpty(adapterName) &&
                    (l.StartsWith("interface name") || l.StartsWith("имя интерфейса")))
                {
                    var colon = line.IndexOf(':');
                    if (colon >= 0) adapterName = line[(colon + 1)..].Trim();
                }

                if (l.Contains("wireless display supported") || l.Contains("беспроводного дисплея"))
                {
                    if (l.Contains("yes") || l.Contains("да"))
                    {
                        miracastSupported = true;
                    }
                }
            }

            return (true, miracastSupported, string.IsNullOrEmpty(adapterName) ? "Wi-Fi" : adapterName);
        }
        catch
        {
            return (false, false, string.Empty);
        }
    }

    private static void LaunchShellUri(string uri)
    {
        var psi = new ProcessStartInfo
        {
            FileName = uri,
            UseShellExecute = true,
        };
        Process.Start(psi);
    }

    private static void TriggerWinKHotkey()
    {
        keybd_event(VkLWin, 0, 0, UIntPtr.Zero);
        keybd_event(VkK, 0, 0, UIntPtr.Zero);
        keybd_event(VkK, 0, KeyEventFKeyUp, UIntPtr.Zero);
        keybd_event(VkLWin, 0, KeyEventFKeyUp, UIntPtr.Zero);
    }
}

/// <summary>
/// Регистрация REST API маршрутов Miracast для ASP.NET Core Minimal API (.NET 8),
/// совместимых с веб-интерфейсом Luma OS 1.7.4.
/// </summary>
[SupportedOSPlatform("windows")]
public static class LumaMiracastEndpoints
{
    public static IEndpointRouteBuilder MapLumaMiracastEndpoints(this IEndpointRouteBuilder app)
    {
        var svc = new LumaMiracastService();
        var group = app.MapGroup("/api/kernel/miracast");

        group.MapGet("/status", async (CancellationToken ct) =>
        {
            var res = await svc.GetStatusAsync(ct);
            return Results.Ok(res);
        });

        group.MapPost("/cast", async (CancellationToken ct) =>
        {
            var res = await svc.OpenWindowsCastAsync(ct);
            return Results.Ok(res);
        });

        group.MapPost("/receive", async (CancellationToken ct) =>
        {
            var res = await svc.StartReceiverAsync(ct);
            return Results.Ok(res);
        });

        group.MapPost("/open-project-settings", () =>
        {
            var res = svc.OpenProjectSettings();
            return Results.Ok(res);
        });

        group.MapPost("/display-mode", (DisplayModeRequest req) =>
        {
            var res = svc.SetDisplayMode(req.Mode);
            return Results.Ok(res);
        });

        return app;
    }
}
