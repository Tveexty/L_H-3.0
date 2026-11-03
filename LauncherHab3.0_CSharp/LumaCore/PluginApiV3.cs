// ============================================================================
// ПРОЕКТ: LauncherHub 3.0 & Luma System OS 1.0 (C# .NET 8 Windows)
// ФАЙЛ: LumaCore/PluginApiV3.cs
// ОПИСАНИЕ: Строго типизированный контракт плагинов ILumaPluginV3, манифест
//           PluginManifestV3, контекст безопасности ILumaPluginContextV3 и
//           песочница разрешений PluginHostV3.
// ============================================================================

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Security;
using System.Threading;
using System.Threading.Tasks;
using LumaCore.Security;
using LumaCore.Widgets;

namespace LumaCore.PluginApi
{
    /// <summary>
    /// Форм-фактор плитки на домашнем экране LauncherHub 3.0 / Luma OS
    /// </summary>
    public enum TileSize
    {
        Small1x1,
        Wide2x1,
        Large2x2
    }

    /// <summary>
    /// Флаги разрешений безопасности для плагинов Luma Plugin API 3.0
    /// </summary>
    [Flags]
    public enum LumaPluginPermissions
    {
        None = 0,
        ReadTelemetry = 1 << 0,
        ProcessControl = 1 << 1,
        ProcessMonitor = 1 << 2,
        AudioControl = 1 << 3,
        NetworkWeather = 1 << 4,
        NetworkAccess = 1 << 5,
        StorageVault = 1 << 6,
        EncryptedStorage = 1 << 7,
        DesktopNotifications = 1 << 8,
        CustomTileProvider = 1 << 9
    }

    /// <summary>
    /// Декларативный манифест плагина Luma 3.0
    /// </summary>
    public sealed record PluginManifestV3(
        string Id,
        string Name,
        string Version,
        string Author,
        LumaPluginPermissions RequiredPermissions,
        TileSize PreferredTileSize = TileSize.Small1x1
    );

    /// <summary>
    /// Контекст изолированной среды выполнения плагина
    /// </summary>
    public interface ILumaPluginContextV3
    {
        string PluginId { get; }
        bool HasPermission(LumaPluginPermissions permission);
        void LogInfo(string message);
        void PushNotification(string title, string message);
        void SaveEncryptedState(string key, string jsonValue);
        string? LoadEncryptedState(string key);
    }

    /// <summary>
    /// Единый интерфейс плагина Luma Plugin API 3.0
    /// </summary>
    public interface ILumaPluginV3
    {
        PluginManifestV3 Manifest { get; }
        Task OnInitializeAsync(ILumaPluginContextV3 context, CancellationToken ct = default);
        Task OnTickAsync(CancellationToken ct = default);
        object GetTilePayload();
        Task OnShutdownAsync();
    }

    /// <summary>
    /// Реализация изолированного контекста плагина с проверкой прав доступа и AES-256-GCM хранилищем
    /// </summary>
    public sealed class LumaPluginContextV3 : ILumaPluginContextV3
    {
        private readonly PluginManifestV3 _manifest;
        private readonly SecurityKernel _security;
        private readonly ConcurrentDictionary<string, SecurityKernel.EncryptedEnvelope> _vault = new();
        private readonly ConcurrentQueue<string> _notifications = new();

        public string PluginId => _manifest.Id;

        public LumaPluginContextV3(PluginManifestV3 manifest, SecurityKernel security)
        {
            _manifest = manifest ?? throw new ArgumentNullException(nameof(manifest));
            _security = security ?? throw new ArgumentNullException(nameof(security));
        }

        public bool HasPermission(LumaPluginPermissions permission)
        {
            return (_manifest.RequiredPermissions & permission) == permission;
        }

        public void LogInfo(string message)
        {
            Console.WriteLine($"[Plugin:{_manifest.Id}] {message}");
        }

        public void PushNotification(string title, string message)
        {
            if (!HasPermission(LumaPluginPermissions.DesktopNotifications))
            {
                throw new SecurityException($"Плагин '{_manifest.Id}' не имеет разрешения DesktopNotifications.");
            }
            string formatted = $"[{DateTime.Now:HH:mm:ss}] {title}: {message}";
            _notifications.Enqueue(formatted);
            Console.WriteLine($"[Luma Notification • {_manifest.Name}] {title} — {message}");
        }

        public void SaveEncryptedState(string key, string jsonValue)
        {
            if (!HasPermission(LumaPluginPermissions.EncryptedStorage) && !HasPermission(LumaPluginPermissions.StorageVault))
            {
                throw new SecurityException($"Плагин '{_manifest.Id}' не имеет разрешения EncryptedStorage.");
            }
            _vault[key] = _security.EncryptConfig(jsonValue);
        }

        public string? LoadEncryptedState(string key)
        {
            if (!HasPermission(LumaPluginPermissions.EncryptedStorage) && !HasPermission(LumaPluginPermissions.StorageVault))
            {
                throw new SecurityException($"Плагин '{_manifest.Id}' не имеет разрешения EncryptedStorage.");
            }
            return _vault.TryGetValue(key, out var env) ? _security.DecryptConfig(env) : null;
        }
    }

    /// <summary>
    /// Хост-песочница расширений Luma Plugin API 3.0
    /// </summary>
    public sealed class PluginHostV3
    {
        private readonly SecurityKernel _security;
        private readonly ConcurrentDictionary<string, ILumaPluginV3> _loadedPlugins = new();

        public PluginHostV3(SecurityKernel security)
        {
            _security = security ?? throw new ArgumentNullException(nameof(security));
        }

        public async Task RegisterPluginAsync(ILumaPluginV3 plugin, CancellationToken ct = default)
        {
            ArgumentNullException.ThrowIfNull(plugin);
            var manifest = plugin.Manifest;
            if (string.IsNullOrWhiteSpace(manifest.Id))
            {
                throw new SecurityException("Отказ загрузки плагина: пустой идентификатор PluginManifestV3.Id.");
            }

            var context = new LumaPluginContextV3(manifest, _security);
            await plugin.OnInitializeAsync(context, ct).ConfigureAwait(false);
            _loadedPlugins[manifest.Id] = plugin;
        }

        public void LoadAndVerifyPlugin(ILumaPluginV3 plugin)
        {
            RegisterPluginAsync(plugin).GetAwaiter().GetResult();
        }

        public async Task TickAllAsync(CancellationToken ct = default)
        {
            foreach (var plugin in _loadedPlugins.Values)
            {
                await plugin.OnTickAsync(ct).ConfigureAwait(false);
            }
        }

        public IReadOnlyList<object> GetLoadedPlugins()
        {
            return _loadedPlugins.Values.Select(p => (object)new
            {
                id = p.Manifest.Id,
                name = p.Manifest.Name,
                version = p.Manifest.Version,
                author = p.Manifest.Author,
                permissions = p.Manifest.RequiredPermissions.ToString(),
                tileSize = p.Manifest.PreferredTileSize.ToString(),
                payload = p.GetTilePayload()
            }).ToList();
        }
    }
}

namespace LauncherHab3.LumaCore
{
    // Пространство имен для полной обратной совместимости модулей LauncherHab3.LumaCore
}
