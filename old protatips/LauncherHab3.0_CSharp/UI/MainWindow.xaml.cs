// ============================================================================
// ПРОЕКТ: LauncherHub 3.0 & Luma System OS 1.0 (C# .NET 8 Windows)
// ФАЙЛ: UI/MainWindow.xaml.cs
// ОПИСАНИЕ: Главное графическое окно лаунчера LauncherHub 3.0 (WPF .NET 8)
//           с поддержкой 2 режимов:
//           1. Плиточный экран (Windows 11 Metro / Android 15 Tiles, размеры 1x1/2x1/2x2, папки)
//           2. Классический режим быстрого поиска (Quick Search Mode)
//           и кнопкой открытия 3-го окна дашборда 12 живых виджетов Luma Core.
// ============================================================================

using System;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using LauncherHab3.Modules;
using LumaCore.SystemKernel;

namespace LauncherHab3.UI
{
    public sealed class MainWindow : Window
    {
        private readonly LumaSystemKernel _kernel;
        private readonly AppAndWorkspaceManager _appManager;
        private readonly MainWindowViewModel _viewModel;
        private readonly WrapPanel _tilesWrapPanel;
        private readonly TextBlock _statusBanner;
        private TileShellDashboardWindow? _dashboardWindow;

        public MainWindow(LumaSystemKernel kernel)
        {
            _kernel = kernel ?? throw new ArgumentNullException(nameof(kernel));
            _appManager = new AppAndWorkspaceManager();
            _viewModel = new MainWindowViewModel();

            Title = _viewModel.AppTitle;
            Width = 1120;
            Height = 720;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;
            Background = new SolidColorBrush(Color.FromRgb(11, 15, 23));
            Foreground = Brushes.White;

            var rootGrid = new Grid { Margin = new Thickness(20) };
            rootGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            rootGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            rootGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });

            // Верхняя панель управления
            var headerPanel = new DockPanel { Margin = new Thickness(0, 0, 0, 16) };
            var titleStack = new StackPanel();
            titleStack.Children.Add(new TextBlock
            {
                Text = "LauncherHub 3.0 • Luma System OS 1.0 (C# .NET 8)",
                FontSize = 22,
                FontWeight = FontWeights.Bold,
                Foreground = Brushes.White
            });
            _statusBanner = new TextBlock
            {
                Text = "Ядро: AES-256-GCM активно • IPC JSON-RPC 127.0.0.1:49215 • Режим: Плитки Windows 11 Metro",
                FontSize = 12,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                Margin = new Thickness(0, 4, 0, 0)
            };
            titleStack.Children.Add(_statusBanner);
            headerPanel.Children.Add(titleStack);

            var actionsStack = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                HorizontalAlignment = HorizontalAlignment.Right
            };

            var btnWinStyle = CreateActionButton("🪟 Плитки Windows 11", Color.FromRgb(37, 99, 235));
            btnWinStyle.Click += (_, _) =>
            {
                _kernel.ActiveShellStyle = TileShellStyle.WindowsMetroFluent;
                _statusBanner.Text = "Стиль оболочки: Windows 11 Metro Live Tiles (Acrylic Glass)";
                RenderTiles();
            };

            var btnAndroidStyle = CreateActionButton("🤖 Плитки Android 15", Color.FromRgb(16, 185, 129));
            btnAndroidStyle.Click += (_, _) =>
            {
                _kernel.ActiveShellStyle = TileShellStyle.AndroidMaterialYou;
                _statusBanner.Text = "Стиль оболочки: Android 15 Material You Quick Tiles";
                RenderTiles();
            };

            var btnNewFolder = CreateActionButton("📁 + Создать папку", Color.FromRgb(124, 58, 237));
            btnNewFolder.Click += (_, _) =>
            {
                _viewModel.CreateFolder($"Папка #{_viewModel.Folders.Count + 1}", "2x1");
                RenderTiles();
            };

            var btnOpenDashboard = CreateActionButton("🧩 3-е окно: Дашборд 12 виджетов", Color.FromRgb(217, 119, 6));
            btnOpenDashboard.Click += (_, _) => OpenOrActivateDashboardWindow();

            actionsStack.Children.Add(btnWinStyle);
            actionsStack.Children.Add(btnAndroidStyle);
            actionsStack.Children.Add(btnNewFolder);
            actionsStack.Children.Add(btnOpenDashboard);
            headerPanel.Children.Add(actionsStack);

            Grid.SetRow(headerPanel, 0);
            rootGrid.Children.Add(headerPanel);

            // Строка быстрого поиска
            var searchBox = new TextBox
            {
                Height = 38,
                FontSize = 14,
                Padding = new Thickness(12, 6, 12, 6),
                Background = new SolidColorBrush(Color.FromRgb(21, 27, 38)),
                Foreground = Brushes.White,
                BorderBrush = new SolidColorBrush(Color.FromRgb(51, 65, 85)),
                Margin = new Thickness(0, 0, 0, 16),
                Text = ""
            };
            searchBox.TextChanged += (_, _) => RenderTiles(searchBox.Text);
            Grid.SetRow(searchBox, 1);
            rootGrid.Children.Add(searchBox);

            // Сетка плиток приложений и папок
            var scrollViewer = new ScrollViewer
            {
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto
            };
            _tilesWrapPanel = new WrapPanel();
            scrollViewer.Content = _tilesWrapPanel;
            Grid.SetRow(scrollViewer, 2);
            rootGrid.Children.Add(scrollViewer);

            Content = rootGrid;

            SeedInitialTiles();
            RenderTiles();
        }

        public void OpenOrActivateDashboardWindow()
        {
            if (_dashboardWindow == null || !_dashboardWindow.IsLoaded)
            {
                _dashboardWindow = new TileShellDashboardWindow(_kernel);
                _dashboardWindow.Show();
            }
            else
            {
                _dashboardWindow.Activate();
            }
        }

        private void SeedInitialTiles()
        {
            foreach (var app in _appManager.GetApps())
            {
                _viewModel.TileItems.Add(new TileGridItemModel
                {
                    Id = app.Id,
                    Title = app.Name,
                    Kind = "app",
                    TileSize = app.TileSize,
                    Category = app.Category,
                    ExecutableOrUrl = app.ExecutableOrUrl
                });
            }
            _viewModel.CreateFolder("Игры & Стриминг", "2x1");
        }

        private void RenderTiles(string filter = "")
        {
            _tilesWrapPanel.Children.Clear();
            bool isAndroid = _kernel.ActiveShellStyle == TileShellStyle.AndroidMaterialYou;
            double cornerRadius = isAndroid ? 26.0 : 10.0;

            foreach (var folder in _viewModel.Folders)
            {
                if (!string.IsNullOrWhiteSpace(filter) && !folder.Name.Contains(filter, StringComparison.OrdinalIgnoreCase))
                    continue;

                var (w, h) = GetTilePixelDimensions(folder.TileSize);
                var border = new Border
                {
                    Width = w,
                    Height = h,
                    Margin = new Thickness(0, 0, 14, 14),
                    CornerRadius = new CornerRadius(cornerRadius),
                    Background = new SolidColorBrush(Color.FromRgb(30, 27, 75)),
                    BorderBrush = new SolidColorBrush(Color.FromRgb(129, 140, 248)),
                    BorderThickness = new Thickness(1.5),
                    Padding = new Thickness(14),
                    Cursor = Cursors.Hand
                };

                var stack = new StackPanel();
                stack.Children.Add(new TextBlock
                {
                    Text = $"📁 {folder.Name}",
                    FontSize = 15,
                    FontWeight = FontWeights.SemiBold,
                    Foreground = Brushes.White
                });
                stack.Children.Add(new TextBlock
                {
                    Text = $"Папка плиток • Размер: {folder.TileSize} (ПКМ — изменить размер)",
                    FontSize = 11,
                    Foreground = new SolidColorBrush(Color.FromRgb(199, 210, 254)),
                    Margin = new Thickness(0, 6, 0, 0)
                });

                border.MouseRightButtonUp += (_, e) =>
                {
                    folder.TileSize = CycleTileSize(folder.TileSize);
                    RenderTiles(filter);
                    e.Handled = true;
                };

                border.Child = stack;
                _tilesWrapPanel.Children.Add(border);
            }

            foreach (var tile in _viewModel.TileItems)
            {
                if (!string.IsNullOrWhiteSpace(filter) && !tile.Title.Contains(filter, StringComparison.OrdinalIgnoreCase))
                    continue;

                var (w, h) = GetTilePixelDimensions(tile.TileSize);
                var border = new Border
                {
                    Width = w,
                    Height = h,
                    Margin = new Thickness(0, 0, 14, 14),
                    CornerRadius = new CornerRadius(cornerRadius),
                    Background = new SolidColorBrush(Color.FromRgb(21, 27, 38)),
                    BorderBrush = new SolidColorBrush(Color.FromRgb(59, 130, 246)),
                    BorderThickness = new Thickness(1),
                    Padding = new Thickness(14),
                    Cursor = Cursors.Hand
                };

                var stack = new StackPanel();
                stack.Children.Add(new TextBlock
                {
                    Text = $"🚀 {tile.Title}",
                    FontSize = 15,
                    FontWeight = FontWeights.Bold,
                    Foreground = Brushes.White
                });
                stack.Children.Add(new TextBlock
                {
                    Text = $"{tile.Category} • Плитка {tile.TileSize}",
                    FontSize = 11,
                    Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                    Margin = new Thickness(0, 6, 0, 0)
                });
                stack.Children.Add(new TextBlock
                {
                    Text = "ЛКМ: Запуск • ПКМ: Размер (1x1 / 2x1 / 2x2)",
                    FontSize = 10,
                    Foreground = new SolidColorBrush(Color.FromRgb(96, 165, 250)),
                    Margin = new Thickness(0, 10, 0, 0)
                });

                border.MouseLeftButtonUp += async (_, _) =>
                {
                    await _appManager.LaunchAppAsync(tile.Id);
                    _statusBanner.Text = $"Запущено приложение: {tile.Title} (счетчик сессии 🟢 00:00)";
                };

                border.MouseRightButtonUp += (_, e) =>
                {
                    tile.TileSize = CycleTileSize(tile.TileSize);
                    RenderTiles(filter);
                    e.Handled = true;
                };

                border.Child = stack;
                _tilesWrapPanel.Children.Add(border);
            }
        }

        private static string CycleTileSize(string current) => current switch
        {
            "1x1" => "2x1",
            "2x1" => "2x2",
            _ => "1x1"
        };

        private static (double Width, double Height) GetTilePixelDimensions(string size) => size switch
        {
            "2x1" => (314, 140),
            "2x2" => (314, 294),
            _ => (150, 140)
        };

        private static Button CreateActionButton(string text, Color bg)
        {
            return new Button
            {
                Content = text,
                Margin = new Thickness(8, 0, 0, 0),
                Padding = new Thickness(12, 7, 12, 7),
                Background = new SolidColorBrush(bg),
                Foreground = Brushes.White,
                BorderThickness = new Thickness(0),
                Cursor = Cursors.Hand,
                FontWeight = FontWeights.SemiBold
            };
        }
    }

    public sealed class MainWindowViewModel
    {
        public string AppTitle => "LauncherHub 3.0 • Luma Core 1.0 (C# .NET 8)";
        public string ActiveWindowMode { get; set; } = "tile_grid"; // "tile_grid" | "quick_search"

        public ObservableCollection<TileGridItemModel> TileItems { get; } = new();
        public ObservableCollection<FolderItemModel> Folders { get; } = new();

        public void SwitchWindowMode(string mode)
        {
            if (mode == "tile_grid" || mode == "quick_search")
            {
                ActiveWindowMode = mode;
            }
        }

        public FolderItemModel CreateFolder(string name, string size = "1x1")
        {
            var folder = new FolderItemModel
            {
                Id = "folder_" + Guid.NewGuid().ToString("N")[..8],
                Name = name,
                TileSize = size
            };
            Folders.Add(folder);
            return folder;
        }

        public void ResizeItem(string itemId, string newSize)
        {
            foreach (var tile in TileItems)
            {
                if (tile.Id == itemId)
                {
                    tile.TileSize = newSize;
                    return;
                }
            }
            foreach (var folder in Folders)
            {
                if (folder.Id == itemId)
                {
                    folder.TileSize = newSize;
                    return;
                }
            }
        }
    }

    public sealed class TileGridItemModel
    {
        public string Id { get; set; } = "";
        public string Title { get; set; } = "";
        public string Kind { get; set; } = "app";
        public string TileSize { get; set; } = "1x1";
        public string Category { get; set; } = "General";
        public string ExecutableOrUrl { get; set; } = "";
        public int GridOrder { get; set; }
    }

    public sealed class FolderItemModel
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "Новая папка";
        public string TileSize { get; set; } = "1x1";
        public ObservableCollection<string> AppIds { get; } = new();
    }
}
