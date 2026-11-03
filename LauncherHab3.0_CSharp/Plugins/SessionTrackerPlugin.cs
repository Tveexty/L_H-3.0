// ============================================================================
// ПРОЕКТ: Luma System OS 1.0 & Launcher Hab 3.0 (C# .NET 8)
// ФАЙЛ: Plugins/SessionTrackerPlugin.cs (Перевод plugins/session_tracker_plugin.py)
// ОПИСАНИЕ: Плагин посекундного учета времени приложений и игр с 00:00 (Zero-Start),
//           живой индикации на плитках (🟢 00:00:15) и контроля лимитов детокса.
// ============================================================================

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using LumaCore.PluginApi;
using LumaCore.Widgets;

namespace LauncherHab3.Plugins
{
    public sealed class SessionTrackerPlugin : ILumaPluginV3
    {
        private ILumaPluginContextV3? _context;
        private readonly ConcurrentDictionary<string, int> _activeElapsedSeconds = new();
        private readonly ConcurrentDictionary<string, int> _dailyLimitMinutes = new();

        public PluginManifestV3 Manifest => new(
            Id: "luma.plugin.session_tracker",
            Name: "Game & App Session Tracker 3.0 (C#)",
            Version: "3.0.0",
            Author: "Luma OS Core Team",
            RequiredPermissions: LumaPluginPermissions.ProcessMonitor | LumaPluginPermissions.CustomTileProvider | LumaPluginPermissions.DesktopNotifications,
            PreferredTileSize: TileSize.Wide2x1
        );

        public Task OnInitializeAsync(ILumaPluginContextV3 context, CancellationToken ct)
        {
            _context = context;
            return Task.CompletedTask;
        }

        public void OnAppLaunched(string appId)
        {
            // Все счетчики начинаются строго с 00:00 при запуске приложения
            _activeElapsedSeconds[appId] = 0;
        }

        public Task OnTickAsync(CancellationToken ct)
        {
            foreach (var key in _activeElapsedSeconds.Keys)
            {
                int current = _activeElapsedSeconds.AddOrUpdate(key, 1, (_, prev) => prev + 1);
                if (_dailyLimitMinutes.TryGetValue(key, out int limitMin) && current == limitMin * 60)
                {
                    _context?.PushNotification(
                        "Цифровой детокс Luma OS",
                        $"Достигнут дневной лимит ({limitMin} мин) для приложения {key}."
                    );
                }
            }
            return Task.CompletedTask;
        }

        public string FormatLiveTileBadge(string appId, bool isRunning)
        {
            int sec = _activeElapsedSeconds.GetValueOrDefault(appId, 0);
            if (isRunning)
            {
                var ts = TimeSpan.FromSeconds(sec);
                return ts.TotalHours >= 1
                    ? $"🟢 {(int)ts.TotalHours:D2}:{ts.Minutes:D2}:{ts.Seconds:D2}"
                    : $"🟢 {ts.Minutes:D2}:{ts.Seconds:D2}";
            }
            return sec <= 0 ? "0 мин" : $"{Math.Max(1, sec / 60)} мин в мес";
        }

        public object GetTilePayload() => new
        {
            widget = "session_tracker_30",
            trackedAppsCount = _activeElapsedSeconds.Count,
            zeroStartMode = true
        };

        public Task OnShutdownAsync() => Task.CompletedTask;
    }
}
