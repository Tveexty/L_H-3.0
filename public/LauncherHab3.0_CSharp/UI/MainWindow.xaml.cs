using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using LauncherHab3.LumaCore;

namespace LauncherHab3.UI
{
    /// <summary>
    /// Главное окно Launcher Hab 3.0 (C# WPF / WinUI 3 Architecture)
    /// Поддерживает 2 переключаемых режима отображения:
    /// 1. Плиточный главный экран (TileGridHomeMode) — свободная расстановка плиток приложений,
    ///    создание папок, изменение размеров папок, виджетов и иконок приложений (1x1, 2x1, 2x2),
    ///    а также все 12 интерактивных системных виджетов Luma 1.0.
    /// 2. Классический режим быстрого поиска (QuickSearchClassicMode) — привычное окно с мгновенной
    ///    фильтрацией, боковой библиотекой и категориями.
    /// </summary>
    public sealed class MainWindowViewModel
    {
        public string AppTitle => "Launcher Hab 3.0 • Luma Core 1.0 (C# .NET 8)";
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
        public string Kind { get; set; } = "app"; // "app" | "widget" | "folder"
        public string TileSize { get; set; } = "1x1"; // "1x1" | "2x1" | "2x2"
        public int GridOrder { get; set; }
    }

    public sealed class FolderItemModel
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "Новая папка";
        public string TileSize { get; set; } = "1x1"; // "1x1" | "2x1" | "2x2"
        public ObservableCollection<string> AppIds { get; } = new();
    }
}
