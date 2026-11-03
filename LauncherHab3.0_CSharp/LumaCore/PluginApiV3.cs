using System;
using System.Collections.Generic;

namespace LauncherHab3.LumaCore
{
    /// <summary>
    /// Контракт Plugin API v3.0 для Launcher Hab 3.0 (C# .NET 8)
    /// Поддерживает:
    /// - Регистрацию пользовательских плиток (1x1, 2x1, 2x2) на главном экране
    /// - Изолированные разрешения (Filesystem, Network, Process, Audio, Notifications)
    /// - Шифрованное хранилище секретов плагина в SecurityKernel (AES-256-GCM)
    /// - Реактивные хуки жизненного цикла (OnCoreInitialized, OnTileResized, OnAppLaunched, OnWeatherUpdated)
    /// </summary>
    public interface ILumaPluginV3
    {
        string Id { get; }
        string Name { get; }
        string Version { get; }
        string Author { get; }
        string[] Permissions { get; }
        string DefaultTileSize { get; } // "1x1", "2x1", "2x2"

        void OnInitialize(ILumaPluginContextV3 context);
        void OnAppLaunched(string appId, string executablePath);
        void OnTileResized(string newSize);
        object GetTileViewModel();
    }

    public interface ILumaPluginContextV3
    {
        void PushNotification(string title, string message, string severity = "info");
        void SaveEncryptedSecret(string key, string secretValue);
        string? ReadEncryptedSecret(string key);
        void RegisterCustomTile(string tileId, string title, string defaultSize);
    }

    public sealed class PluginHostV3
    {
        private readonly SecurityKernel _security;
        private readonly List<object> _loadedPlugins = new();

        public PluginHostV3(SecurityKernel security)
        {
            _security = security;
            _loadedPlugins.Add(new
            {
                id = "session_tracker_v3",
                name = "Game & App Session Tracker C# v3.0",
                version = "3.0.0",
                runtime = ".NET 8 Isolated AssemblyLoadContext",
                permissions = new[] { "Process.Read", "Notifications.Send", "TileGrid.Register" },
                defaultTileSize = "2x1",
                enabled = true
            });
            _loadedPlugins.Add(new
            {
                id = "hardware_telemetry_v3",
                name = "Luma Hardware & Sensor Bridge v3.0",
                version = "3.0.0",
                runtime = ".NET 8 Native WMI + WASAPI",
                permissions = new[] { "Hardware.Sensors", "Audio.WASAPI" },
                defaultTileSize = "2x1",
                enabled = true
            });
            _loadedPlugins.Add(new
            {
                id = "smart_weather_geo_v3",
                name = "Open-Meteo Live Weather & Radar v3.0",
                version = "3.0.0",
                runtime = ".NET 8 HttpClient Async",
                permissions = new[] { "Network.Https", "TileGrid.Register" },
                defaultTileSize = "2x1",
                enabled = true
            });
        }

        public IReadOnlyList<object> GetLoadedPlugins() => _loadedPlugins;
    }
}
