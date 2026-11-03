// ============================================================================
// ПРОЕКТ: LauncherHub 3.0 & Luma System OS 1.0 (C# .NET 8 Windows)
// ФАЙЛ: UI/TileShellDashboardWindow.cs
// ОПИСАНИЕ: Третье графическое окно — Плиточный Дашборд 12 интерактивных виджетов
//           Luma Core (Windows Metro Live Tiles / Android 15 Quick Tiles).
//           Автоматически опрашивает фоновое ядро по JSON-RPC (127.0.0.1:49215)
//           и отображает живые метрики системы в реальном времени.
// ============================================================================

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;
using LumaCore.Ipc;
using LumaCore.SystemKernel;

namespace LauncherHab3.UI
{
    public sealed class TileShellDashboardWindow : Window
    {
        private readonly LumaSystemKernel _kernel;
        private readonly IpcClientBridge _ipcClient;
        private readonly Stack<string> _navigationHistory = new();
        private readonly WrapPanel _widgetsWrapPanel;
        private readonly TextBlock _ipcStatusText;
        private readonly DispatcherTimer _refreshTimer;

        public bool RightClickBackEnabled { get; set; } = true;

        public TileShellStyle CurrentTileStyle
        {
            get => _kernel.ActiveShellStyle;
            set => _kernel.ActiveShellStyle = value;
        }

        public TileShellDashboardWindow(LumaSystemKernel kernel)
        {
            _kernel = kernel ?? throw new ArgumentNullException(nameof(kernel));
            _ipcClient = new IpcClientBridge("127.0.0.1", 49215);
            _navigationHistory.Push("tile_home_30");

            Title = "Luma Core 1.0 — Плиточный Дашборд 12 Виджетов (Окно #3)";
            Width = 1040;
            Height = 680;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;
            Background = new SolidColorBrush(Color.FromRgb(9, 13, 22));
            Foreground = Brushes.White;

            var rootGrid = new Grid { Margin = new Thickness(18) };
            rootGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            rootGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });

            var headerStack = new StackPanel { Margin = new Thickness(0, 0, 0, 14) };
            headerStack.Children.Add(new TextBlock
            {
                Text = "🧩 Luma Core 1.0 • Интерактивный Дашборд Плиток и Виджетов",
                FontSize = 20,
                FontWeight = FontWeights.Bold,
                Foreground = Brushes.White
            });

            _ipcStatusText = new TextBlock
            {
                Text = "Подключение к JSON-RPC сокету 127.0.0.1:49215...",
                FontSize = 12,
                Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153)),
                Margin = new Thickness(0, 4, 0, 0)
            };
            headerStack.Children.Add(_ipcStatusText);
            Grid.SetRow(headerStack, 0);
            rootGrid.Children.Add(headerStack);

            var scroll = new ScrollViewer { VerticalScrollBarVisibility = ScrollBarVisibility.Auto };
            _widgetsWrapPanel = new WrapPanel();
            scroll.Content = _widgetsWrapPanel;
            Grid.SetRow(scroll, 1);
            rootGrid.Children.Add(scroll);

            Content = rootGrid;

            MouseRightButtonUp += (_, _) => HandleRightClickBackGesture();

            _refreshTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(1.5)
            };
            _refreshTimer.Tick += async (_, _) => await PollLumaWidgetsAsync();
            Loaded += async (_, _) =>
            {
                await PollLumaWidgetsAsync();
                _refreshTimer.Start();
            };
            Closed += (_, _) => _refreshTimer.Stop();
        }

        public void SwitchTileShellStyle(TileShellStyle style)
        {
            CurrentTileStyle = style;
            _kernel.WriteEncryptedConfig("/sys/shell/tile_style", new { style = style.ToString(), updatedUtc = DateTime.UtcNow });
        }

        public string HandleRightClickBackGesture()
        {
            if (!RightClickBackEnabled || _navigationHistory.Count <= 1)
                return "tile_home_30";

            _navigationHistory.Pop();
            return _navigationHistory.Peek();
        }

        public async Task PollLumaWidgetsAsync(CancellationToken ct = default)
        {
            try
            {
                using var doc = await _ipcClient.CallAsync("widgets.get_all", null, ct);
                if (doc != null && doc.RootElement.TryGetProperty("result", out var result) &&
                    result.TryGetProperty("widgets", out var widgets) &&
                    widgets.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    _ipcStatusText.Text = $"🟢 IPC JSON-RPC 2.0 (127.0.0.1:49215) активен • Обновлено: {DateTime.Now:HH:mm:ss}";
                    _widgetsWrapPanel.Children.Clear();

                    foreach (var w in widgets.EnumerateArray())
                    {
                        string title = w.TryGetProperty("title", out var t) ? (t.GetString() ?? "Виджет") : "Виджет";
                        string size = w.TryGetProperty("size", out var s) ? (s.GetString() ?? "1x1") : "1x1";
                        string id = w.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";

                        var card = new Border
                        {
                            Width = size == "1x1" ? 210 : 310,
                            Height = size == "2x2" ? 210 : 125,
                            Margin = new Thickness(0, 0, 12, 12),
                            CornerRadius = new CornerRadius(CurrentTileStyle == TileShellStyle.AndroidMaterialYou ? 22 : 10),
                            Background = new SolidColorBrush(Color.FromRgb(19, 26, 39)),
                            BorderBrush = new SolidColorBrush(Color.FromRgb(56, 189, 248)),
                            BorderThickness = new Thickness(1),
                            Padding = new Thickness(12)
                        };

                        var sp = new StackPanel();
                        sp.Children.Add(new TextBlock
                        {
                            Text = title,
                            FontSize = 13,
                            FontWeight = FontWeights.Bold,
                            Foreground = Brushes.White,
                            TextWrapping = TextWrapping.Wrap
                        });
                        sp.Children.Add(new TextBlock
                        {
                            Text = $"ID: {id} • Формат: [{size}]",
                            FontSize = 11,
                            Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                            Margin = new Thickness(0, 4, 0, 0)
                        });
                        sp.Children.Add(new TextBlock
                        {
                            Text = w.ToString(),
                            FontSize = 10,
                            Foreground = new SolidColorBrush(Color.FromRgb(125, 211, 252)),
                            Margin = new Thickness(0, 6, 0, 0),
                            TextTrimming = TextTrimming.CharacterEllipsis
                        });

                        card.Child = sp;
                        _widgetsWrapPanel.Children.Add(card);
                    }
                }
            }
            catch (Exception ex)
            {
                _ipcStatusText.Text = $"⚠️ Ожидание ответа ядра 127.0.0.1:49215 ({ex.Message})";
            }
        }
    }
}
