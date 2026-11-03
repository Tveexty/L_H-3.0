// ============================================================================
// ПРОЕКТ: LauncherHub 3.0 & Luma System OS 1.0 (C# .NET 8 Windows)
// ФАЙЛ: Program.cs
// ОПИСАНИЕ: Единая точка входа системы Luma OS на языке C# (.NET 8).
//           1. Инициализирует защищенное ядро LumaSystemKernel (AES-256-GCM + PBKDF2-SHA512)
//           2. Регистрирует встроенные плагины C# (SessionTracker, FocusMode, Weather, Music, Notes)
//           3. Поднимает фоновый демон JSON-RPC 2.0 (127.0.0.1:49215)
//           4. Открывает главное графическое окно лаунчера (MainWindow) и третье окно
//              плиточного дашборда с 12 виджетами (TileShellDashboardWindow)
// ============================================================================

using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using LauncherHab3.Modules;
using LauncherHab3.Plugins;
using LauncherHab3.UI;
using LumaCore.Daemon;
using LumaCore.Security;
using LumaCore.SystemKernel;
using LumaCore.Widgets;

namespace LauncherHab3
{
    public static class Program
    {
        [STAThread]
        public static void Main(string[] args)
        {
            Console.OutputEncoding = System.Text.Encoding.UTF8;
            Console.WriteLine("==================================================================");
            Console.WriteLine(" 🚀 LUMA SYSTEM OS 1.0 & LAUNCHERHUB 3.0 (C# .NET 8 WINDOWS)");
            Console.WriteLine("==================================================================");

            using var cts = new CancellationTokenSource();

            // 1. Загрузка защищенного ядра системы Luma OS (AES-256-GCM + PBKDF2-SHA512)
            var kernel = new LumaSystemKernel("LumaOS-Master-Secret-Key-2026");

            // 2. Регистрация всех встроенных C# плагинов и запуск ядра
            BootKernelAndPluginsAsync(kernel, cts.Token).GetAwaiter().GetResult();

            var health = kernel.GetHealthReport();
            Console.WriteLine($"[Ядро Luma OS] Статус защиты : {(health.SecurityActive ? "АКТИВНА" : "ОТКЛЮЧЕНА")} ({health.CipherSuite})");
            Console.WriteLine($"[Ядро Luma OS] Плагинов C#   : {health.LoadedPluginsCount} загружено в песочнице Zero-Trust");
            Console.WriteLine($"[Оболочка UI] Стиль плиток   : {health.CurrentShellStyle} (Windows 11 Metro / Android 15)");

            // 3. Запуск фонового демона IPC JSON-RPC 2.0 (127.0.0.1:49215)
            var daemon = new LumaCoreDaemon("127.0.0.1", 49215, kernel.Security, kernel.Widgets);
            _ = Task.Run(() => daemon.StartAsync(cts.Token), cts.Token);

            // 4. Самодиагностика всех 6 узлов системы
            var diagnostics = new DiagnosticsAndUpdater();
            foreach (var check in diagnostics.RunFullSystemDiagnostics())
            {
                Console.WriteLine($"  ✔ {check.SubsystemName}: {check.StatusDetails} ({check.LatencyMs:F1} ms)");
            }

            // Если передан флаг --headless, работаем как фоновый демон без открытия WPF-окон
            if (args.Contains("--headless", StringComparer.OrdinalIgnoreCase))
            {
                Console.WriteLine("[Режим Headless] Сервер ядра 127.0.0.1:49215 активен. Нажмите Ctrl+C для выхода.");
                Console.CancelKeyPress += (_, e) =>
                {
                    e.Cancel = true;
                    cts.Cancel();
                };
                cts.Token.WaitHandle.WaitOne();
                return;
            }

            // 5. Запуск графической оболочки WPF: Главное окно Лаунчера + 3-е окно Дашборда с виджетами
            var app = new Application
            {
                ShutdownMode = ShutdownMode.OnMainWindowClose
            };

            var mainWindow = new MainWindow(kernel);
            var dashboardWindow = new TileShellDashboardWindow(kernel);

            app.Startup += (_, _) =>
            {
                mainWindow.Show();
                dashboardWindow.Show();
            };

            app.Exit += async (_, _) =>
            {
                cts.Cancel();
                daemon.Dispose();
                await kernel.DisposeAsync();
            };

            app.Run(mainWindow);
        }

        private static async Task BootKernelAndPluginsAsync(LumaSystemKernel kernel, CancellationToken ct)
        {
            await kernel.RegisterPluginAsync(new SessionTrackerPlugin(), ct);
            await kernel.RegisterPluginAsync(new FocusModePomodoroPlugin(), ct);
            await kernel.RegisterPluginAsync(new SmartWeatherPlugin(), ct);
            await kernel.RegisterPluginAsync(new SmartMusicControllerPlugin(), ct);
            await kernel.RegisterPluginAsync(new IdeaNotebookAndFinderPlugin(), ct);
            await kernel.BootSystemAsync(ct);
        }
    }
}
