// ============================================================================
// ПРОЕКТ: Luma System OS 1.0 & Launcher Hab 3.0 (C# .NET 8)
// ФАЙЛ: Modules/AppAndWorkspaceManager.cs
//       (Перевод app_manager.py, smart_workspace_manager.py, hotkey_manager.py)
// ОПИСАНИЕ: Менеджер приложений, папок плиточного экрана, рабочих пространств
//           (Smart Workspaces) и глобальных горячих клавиш Win32 (RegisterHotKey).
// ============================================================================

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;

namespace LauncherHab3.Modules
{
    public sealed class AppDescriptor
    {
        public required string Id { get; init; }
        public required string Name { get; set; }
        public required string Category { get; set; }
        public required string ExecutableOrUrl { get; set; }
        public string TileSize { get; set; } = "1x1"; // 1x1, 2x1, 2x2
        public bool Favorite { get; set; }
        public bool IsRunning { get; set; }
        public int ElapsedSeconds { get; set; }
    }

    public sealed class WorkspaceProfile
    {
        public required string Id { get; init; }
        public required string Name { get; set; }
        public required string HotkeyGesture { get; set; }
        public List<string> ProcessesToClose { get; init; } = new();
        public List<string> AppsToLaunch { get; init; } = new();
    }

    public sealed class AppAndWorkspaceManager
    {
        private readonly List<AppDescriptor> _apps = new();
        private readonly List<WorkspaceProfile> _workspaces = new();

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

        public AppAndWorkspaceManager()
        {
            SeedDefaultApps();
            SeedDefaultWorkspaces();
        }

        private void SeedDefaultApps()
        {
            _apps.Add(new AppDescriptor { Id = "steam", Name = "Steam", Category = "Games", ExecutableOrUrl = "steam://", TileSize = "2x1", Favorite = true });
            _apps.Add(new AppDescriptor { Id = "chrome", Name = "Google Chrome", Category = "Browser", ExecutableOrUrl = "https://google.com", TileSize = "1x1", Favorite = true });
            _apps.Add(new AppDescriptor { Id = "telegram", Name = "Telegram", Category = "Social", ExecutableOrUrl = "tg://", TileSize = "1x1", Favorite = true });
            _apps.Add(new AppDescriptor { Id = "taskmgr", Name = "Диспетчер задач", Category = "System", ExecutableOrUrl = "taskmgr.exe", TileSize = "1x1" });
        }

        private void SeedDefaultWorkspaces()
        {
            _workspaces.Add(new WorkspaceProfile
            {
                Id = "gaming",
                Name = "Игровой режим Luma Boost",
                HotkeyGesture = "Ctrl+Shift+G",
                ProcessesToClose = new List<string> { "chrome", "winword" },
                AppsToLaunch = new List<string> { "steam", "telegram" }
            });
            _workspaces.Add(new WorkspaceProfile
            {
                Id = "dev",
                Name = "Разработка C# .NET 8",
                HotkeyGesture = "Ctrl+Shift+D",
                AppsToLaunch = new List<string> { "devenv.exe", "wt.exe" }
            });
        }

        public IReadOnlyList<AppDescriptor> GetApps() => _apps;
        public IReadOnlyList<WorkspaceProfile> GetWorkspaces() => _workspaces;

        public async Task LaunchAppAsync(string appId)
        {
            var app = _apps.FirstOrDefault(a => a.Id == appId);
            if (app == null) return;

            app.IsRunning = true;
            app.ElapsedSeconds = 0;

            await Task.Run(() =>
            {
                try
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = app.ExecutableOrUrl,
                        UseShellExecute = true
                    });
                }
                catch
                {
                    // Изолированный перехват ошибок запуска процесса
                }
            });
        }
    }
}
