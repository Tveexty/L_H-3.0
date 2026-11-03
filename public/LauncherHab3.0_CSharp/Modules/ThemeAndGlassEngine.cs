// ============================================================================
// ПРОЕКТ: Luma System OS 1.0 & Launcher Hab 3.0 (C# .NET 8)
// ФАЙЛ: Modules/ThemeAndGlassEngine.cs (Перевод theme_manager.py + glass_morphism.py)
// ОПИСАНИЕ: Движок адаптивных тем «День / Ночь» по расписанию, 18 стилей часов,
//           эффекта жидкого стекла (Windows 11 Acrylic / Mica & Android Blur)
//           и переключателя стиля плиток (Windows Metro vs Android 15 Material).
// ============================================================================

using System;
using System.Collections.Generic;
using LumaCore.SystemKernel;

namespace LauncherHab3.Modules
{
    public sealed record ThemePalette(
        string Id,
        string Name,
        bool IsDark,
        string BackgroundHex,
        string SurfaceHex,
        string AccentHex
    );

    public sealed class ThemeAndGlassEngine
    {
        public string ActiveThemeId { get; set; } = "dark";
        public bool AdaptiveDayNightEnabled { get; set; } = true;
        public TimeOnly DayStart { get; set; } = new(7, 0);
        public TimeOnly NightStart { get; set; } = new(20, 0);
        public string DayThemeId { get; set; } = "light";
        public string NightThemeId { get; set; } = "dark";

        public string ActiveClockStyle { get; set; } = "android_vertical";
        public bool GlassMorphismEnabled { get; set; } = true;
        public int GlassOpacityPercent { get; set; } = 82;
        public int CardCornerRadiusPx { get; set; } = 20;
        public int IconScalePercent { get; set; } = 100;
        public TileShellStyle TileMode { get; set; } = TileShellStyle.WindowsMetroFluent;

        private readonly Dictionary<string, ThemePalette> _themes = new()
        {
            ["dark"] = new("dark", "Темная (Midnight Slate)", true, "#0b0f17", "#151b26", "#3b82f6"),
            ["amoled"] = new("amoled", "Черный Оникс (AMOLED)", true, "#05070b", "#0d1118", "#10b981"),
            ["light"] = new("light", "Светлая (Daylight Clean)", false, "#f1f5f9", "#ffffff", "#2563eb"),
            ["purple"] = new("purple", "Кибер-Фиолетовая", true, "#0f0b1d", "#1a1430", "#a855f7"),
            ["spring"] = new("spring", "Весна (Rose Quartz)", false, "#fff5f8", "#ffffff", "#ec4899")
        };

        public ThemePalette EvaluateCurrentTheme(DateTime now)
        {
            if (AdaptiveDayNightEnabled)
            {
                var current = TimeOnly.FromDateTime(now);
                bool isDay = current >= DayStart && current < NightStart;
                ActiveThemeId = isDay ? DayThemeId : NightThemeId;
            }

            return _themes.TryGetValue(ActiveThemeId, out var palette)
                ? palette
                : _themes["dark"];
        }

        public string FormatArgbGlassHex(string rgbHex, int opacityPercent)
        {
            int alpha = Math.Clamp((int)Math.Round(opacityPercent * 2.55), 0, 255);
            string cleanRgb = rgbHex.TrimStart('#');
            return $"#{alpha:X2}{cleanRgb}";
        }
    }
}
