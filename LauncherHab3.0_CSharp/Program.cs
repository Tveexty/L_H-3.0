// ============================================================================
// ПРОЕКТ: Luma System OS 1.0 & Launcher Hab 3.0 (100% C# .NET 8 Edition)
// ФАЙЛ: Program.cs (Перевод main.py + run_all.py на C#)
// ОПИСАНИЕ: Единый загрузчик полноценной системы Luma OS (Ядро + Службы + IPC)
//           и графической плиточной оболочки (Windows Metro / Android 15 Tiles)
//           поверх системы Luma.
// ============================================================================

using System;
using System.Threading;
using System.Threading.Tasks;
using LumaCore.SystemKernel;
using LumaCore.Daemon;
using LumaCore.Security;
using LumaCore.Widgets;
using LauncherHab3.UI;

namespace LauncherHab3
{
    public static class Program
    {
        private static CancellationTokenSource? _systemCts;

        [STAThread]
        public static async Task Main(string[] args)
        {
            Console.OutputEncoding = System.Text.Encoding.UTF8;
            _systemCts = new CancellationTokenSource();

            Console.WriteLine("======================================================================");
            Console.WriteLine("⚡ ЗАГРУЗКА СИСТЕМЫ LUMA OS 1.0 (C# .NET 8 SYSTEM KERNEL)");
            Console.WriteLine("🪟 ПЛИТОЧНАЯ ОБОЛОЧКА: Windows Live Tiles / Android 15 Bento Shell");
            Console.WriteLine("======================================================================");

            // 1. Инициализация полноценной системы Luma OS (Ядро, VFS, Безопасность, Телеметрия)
            var lumaKernel = LumaSystemKernel.Instance;
            await lumaKernel.BootSystemAsync(_systemCts.Token);

            // 2. Запуск фонового IPC-демона LumaCoreDaemon (127.0.0.1:49215, JSON-RPC 2.0)
            var daemon = new LumaCoreDaemon();
            _ = Task.Run(() => daemon.StartAsync(_systemCts.Token));

            // 3. Запуск графической плиточной оболочки (Windows / Android Tile Shell) поверх Luma OS
            var shellWindow = new MainWindow(lumaKernel);
            await shellWindow.InitializeTileShellAsync();

            Console.WriteLine("[Luma OS] Графическая оболочка плиток успешно смонтирована поверх ядра Luma.");
        }
    }
}
