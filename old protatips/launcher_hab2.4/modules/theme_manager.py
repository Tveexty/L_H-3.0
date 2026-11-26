# [file name]: theme_manager.py
import flet as ft
from .file_manager import FileManager
from .logger import get_logger

logger = get_logger(__name__)


class ThemeManager:
    # 18 стилей часов в версии 2.5 (8 базовых + 10 новых дизайнерских стилей!)
    CLOCK_STYLES = {
        "android_vertical": "Android 14 Вертикальный (Крупный HH / MM)",
        "stacked": "Компактный вертикальный (14 / 32)",
        "standard": "Классический цифровой (14:32:08)",
        "pill_glass": "Android Капсула (14:32 • Дата)",
        "split_flip": "Flip-карточки ([14] : [32])",
        "cyber_mono": "Киберпанк Моно ([ 14 : 32 : 08 ])",
        "minimal": "Минималистичный тонкий (14:32)",
        "compact_badge": "Бейдж с днем недели",
        # --- 10 НОВЫХ СТИЛЕЙ ЧАСОВ В ВЕРСИИ 2.5 ---
        "nothing_dot": "Nothing OS (Dot-Matrix 14·32·08)",
        "ios_standby": "iOS 17 StandBy (Ночной Неон)",
        "samsung_oneui": "Samsung OneUI 6 Lock",
        "neon_synthwave": "Neon Synthwave 80s",
        "retro_casio": "Retro LCD (Casio F-91W)",
        "macos_sonoma": "macOS Sonoma Widget",
        "futuristic_hud": "Sci-Fi Tactical HUD",
        "analog_hybrid": "Гибридный Хронограф (Кольцо)",
        "vertical_neon_bar": "Неоновая Вертикаль (Бар)",
        "material_expressive": "Material You Expressive",
    }

    # Все прозрачные цвета записаны в формате Flet #AARRGGBB (Alpha в начале!)
    BASE_THEMES = {
        "dark": {
            "NAME": "Темная (Midnight Slate)",
            "BG": "#0d111a",
            "SURFACE": "#151b26",
            "SURFACE_VARIANT": "#1e2636",
            "ON_SURFACE": "#f1f5f9",
            "ON_SURFACE_VARIANT": "#8b9bb4",
            "OUTLINE": "#263042",
            "ACCENT": "#3b82f6",
            "ACCENT_GLOW": "#333b82f6",
            "ERROR": "#ef4444",
            "SUCCESS": "#10b981",
            "WEB_BLUE": "#60a5fa",
            "GLASS_BG": "#b8151b26",
            "GLASS_BORDER": "#18f8fafc",
            "GLASS_SHADOW": "#66000000",
            "GLASS_BG_LIGHT": "#881e2636",
            "SETTINGS_BG": "#0d111a",
            "SETTINGS_SURFACE": "#151b26",
            "SETTINGS_CARD": "#1b2230",
        },
        "amoled": {
            "NAME": "Черный Оникс (AMOLED)",
            "BG": "#07090e",
            "SURFACE": "#10141d",
            "SURFACE_VARIANT": "#181e2b",
            "ON_SURFACE": "#f8fafc",
            "ON_SURFACE_VARIANT": "#94a3b8",
            "OUTLINE": "#222938",
            "ACCENT": "#10b981",
            "ACCENT_GLOW": "#3310b981",
            "ERROR": "#f87171",
            "SUCCESS": "#10b981",
            "WEB_BLUE": "#38bdf8",
            "GLASS_BG": "#c010141d",
            "GLASS_BORDER": "#16ffffff",
            "GLASS_SHADOW": "#80000000",
            "GLASS_BG_LIGHT": "#80181e2b",
            "SETTINGS_BG": "#07090e",
            "SETTINGS_SURFACE": "#10141d",
            "SETTINGS_CARD": "#161b26",
        },
        "light": {
            "NAME": "Светлая",
            "BG": "#f1f5f9",
            "SURFACE": "#ffffff",
            "SURFACE_VARIANT": "#e2e8f0",
            "ON_SURFACE": "#0f172a",
            "ON_SURFACE_VARIANT": "#64748b",
            "OUTLINE": "#cbd5e1",
            "ACCENT": "#3b82f6",
            "ACCENT_GLOW": "#243b82f6",
            "ERROR": "#dc2626",
            "SUCCESS": "#059669",
            "WEB_BLUE": "#2563eb",
            "GLASS_BG": "#d8ffffff",
            "GLASS_BORDER": "#180f172a",
            "GLASS_SHADOW": "#1f0f172a",
            "GLASS_BG_LIGHT": "#99ffffff",
            "SETTINGS_BG": "#f8fafc",
            "SETTINGS_SURFACE": "#ffffff",
            "SETTINGS_CARD": "#f1f5f9",
        },
        "purple": {
            "NAME": "Фиолетовая",
            "BG": "#121121",
            "SURFACE": "#1d1b36",
            "SURFACE_VARIANT": "#2a274d",
            "ON_SURFACE": "#ffffff",
            "ON_SURFACE_VARIANT": "#c4b5fd",
            "OUTLINE": "#3d386b",
            "ACCENT": "#a855f7",
            "ACCENT_GLOW": "#33a855f7",
            "ERROR": "#ff6b6b",
            "SUCCESS": "#34d399",
            "WEB_BLUE": "#c084fc",
            "GLASS_BG": "#b81d1b36",
            "GLASS_BORDER": "#1fffffff",
            "GLASS_SHADOW": "#66000000",
            "GLASS_BG_LIGHT": "#802a274d",
            "SETTINGS_BG": "#121121",
            "SETTINGS_SURFACE": "#1d1b36",
            "SETTINGS_CARD": "#262347",
        },
        "spring": {
            "NAME": "Весна",
            "BG": "#fff5f7",
            "SURFACE": "#fce7f3",
            "SURFACE_VARIANT": "#fbcfe8",
            "ON_SURFACE": "#4a148c",
            "ON_SURFACE_VARIANT": "#880e4f",
            "OUTLINE": "#f472b6",
            "ACCENT": "#e91e63",
            "ACCENT_GLOW": "#24e91e63",
            "ERROR": "#f44336",
            "SUCCESS": "#10b981",
            "WEB_BLUE": "#db2777",
            "GLASS_BG": "#ccfcd7eb",
            "GLASS_BORDER": "#20880e4f",
            "GLASS_SHADOW": "#24000000",
            "GLASS_BG_LIGHT": "#88fce7f3",
            "SETTINGS_BG": "#fff5f7",
            "SETTINGS_SURFACE": "#fce7f3",
            "SETTINGS_CARD": "#fbcfe8",
        },
    }

    def __init__(self):
        self.file_manager = FileManager()
        self.custom_themes = self.load_custom_themes()
        self.smooth_animations = True
        self.android_animations = True
        self.load_settings()

    def load_settings(self):
        settings = self.file_manager.load_settings()
        if not isinstance(settings, dict):
            settings = {}

        self.current_theme = settings.get("theme", "dark")
        self.glass_effect_enabled = bool(settings.get("glass_effect", True))
        self.glass_intensity = settings.get("glass_intensity", "medium")
        self.advanced_glass_enabled = bool(settings.get("advanced_glass_enabled", True))
        self.advanced_glass_opacity = int(settings.get("advanced_glass_opacity", 72))
        self.desktop_mode_enabled = bool(settings.get("desktop_mode_enabled", True))
        self.smooth_animations = bool(settings.get("smooth_animations", True))
        self.android_animations = bool(settings.get("android_animations", True))

        # Настройки времени, часов и шрифтов (v2.5)
        self.time_format = settings.get("time_format", "24")
        self.date_format = settings.get("date_format", "dd.mm.yyyy")
        self.font_family = settings.get("font_family", "Segoe UI")
        self.font_size = int(settings.get("font_size", 14))
        self.time_font_size = int(settings.get("time_font_size", 22))
        self.date_font_size = int(settings.get("date_font_size", 12))
        self.time_font_family = settings.get("time_font_family", self.font_family)
        self.date_font_family = settings.get("date_font_family", self.font_family)
        self.backup_auto = bool(settings.get("backup_auto", True))
        self.backup_interval = int(settings.get("backup_interval", 7))
        self.search_cache_enabled = bool(settings.get("search_cache_enabled", True))
        self.virtualization_enabled = bool(settings.get("virtualization_enabled", True))

        # 18 стилей часов и расширенный дизайн часов v2.5
        self.clock_style = settings.get("clock_style", "android_vertical")
        if self.clock_style not in self.CLOCK_STYLES:
            self.clock_style = "android_vertical"
        self.show_date = bool(settings.get("show_date", True))
        self.show_seconds = bool(settings.get("show_seconds", True))
        self.show_weekday = bool(settings.get("show_weekday", True))
        self.clock_glass_frame = bool(settings.get("clock_glass_frame", True))
        self.show_android_clock_widget = bool(settings.get("show_android_clock_widget", True))
        self.time_color = settings.get(
            "time_color", self.get_theme(self.current_theme).get("ON_SURFACE", "#f1f5f9")
        )
        self.date_color = settings.get(
            "date_color", self.get_theme(self.current_theme).get("ON_SURFACE_VARIANT", "#8b9bb4")
        )
        self.clock_accent_color = settings.get("clock_accent_color", "#3b82f6")
        self.clock_glow_enabled = bool(settings.get("clock_glow_enabled", True))
        self.clock_glow_intensity = int(settings.get("clock_glow_intensity", 16))
        self.clock_border_radius = int(settings.get("clock_border_radius", 14))
        self.clock_bg_opacity = int(settings.get("clock_bg_opacity", 70))
        self.clock_bold = bool(settings.get("clock_bold", True))
        self.clock_blink_colon = bool(settings.get("clock_blink_colon", False))

        self.search_history_enabled = bool(settings.get("search_history_enabled", True))

        # Расширенные настройки персонализации карточек и интерфейса v2.5
        self.card_border_radius = int(settings.get("card_border_radius", 18))
        self.card_hover_glow = bool(settings.get("card_hover_glow", True))
        self.active_app_color = settings.get("active_app_color", "#10b981")
        self.icon_scale_pct = int(settings.get("icon_scale_pct", 100))

        # Настройки программы
        self.show_plugins_in_grid = bool(settings.get("show_plugins_in_grid", True))
        self.launch_behavior = settings.get("launch_behavior", "keep")
        self.card_columns = int(settings.get("card_columns", 6))
        self.detox_notifications = bool(settings.get("detox_notifications", True))
        self.auto_update_enabled = bool(settings.get("auto_update_enabled", True))
        self.system_notifications_enabled = bool(settings.get("system_notifications_enabled", True))
        self.autostart_windows = bool(settings.get("autostart_windows", False))

        # --- НОВЫЕ НАСТРОЙКИ ВЕРСИИ 2.6 ---
        # 1. Адаптивная тема День / Ночь (по расписанию времени)
        self.adaptive_theme_enabled = bool(settings.get("adaptive_theme_enabled", False))
        self.day_start_time = settings.get("day_start_time", "07:00")
        self.night_start_time = settings.get("night_start_time", "20:00")
        self.day_theme_name = settings.get("day_theme_name", "light")
        self.night_theme_name = settings.get("night_theme_name", "dark")

        # 2. Dynamic Island 2.6
        self.island_dnd_enabled = bool(settings.get("island_dnd_enabled", False))
        self.island_glow_enabled = bool(settings.get("island_glow_enabled", True))
        self.island_charging_anim = bool(settings.get("island_charging_anim", True))
        self.island_simulate_charging = bool(settings.get("island_simulate_charging", True))
        self.island_style = settings.get("island_style", "expanded")

        # 3. Удобная навигация одной рукой: ПКМ = Назад
        self.right_click_back_enabled = bool(settings.get("right_click_back_enabled", True))

        # 4. Автообновление с GitHub
        self.github_repo_url = settings.get("github_repo_url", "https://github.com/launcher-hab/LauncherHab")
        self.github_auto_update = bool(settings.get("github_auto_update", True))

    def evaluate_adaptive_theme(self, current_dt=None) -> str:
        """
        Определяет, какая тема должна быть активна сейчас при включенной адаптивной теме День/Ночь.
        Если день (между day_start_time и night_start_time) -> day_theme_name (по умолчанию 'light'),
        иначе ночь -> night_theme_name (по умолчанию 'dark').
        """
        from datetime import datetime as _dt

        now = current_dt or _dt.now()
        cur_minutes = now.hour * 60 + now.minute

        def _parse_hhmm(val: str, fallback_h: int) -> int:
            try:
                parts = str(val).strip().split(":")
                return int(parts[0]) * 60 + (int(parts[1]) if len(parts) > 1 else 0)
            except Exception:
                return fallback_h * 60

        day_m = _parse_hhmm(self.day_start_time, 7)
        night_m = _parse_hhmm(self.night_start_time, 20)

        if day_m <= night_m:
            is_daytime = day_m <= cur_minutes < night_m
        else:
            is_daytime = cur_minutes >= day_m or cur_minutes < night_m

        target = self.day_theme_name if is_daytime else self.night_theme_name
        all_themes = self.get_available_themes()
        if target not in all_themes:
            target = "light" if is_daytime else "dark"
        return target

    def set_adaptive_theme_preferences(
        self,
        enabled=None,
        day_start_time=None,
        night_start_time=None,
        day_theme_name=None,
        night_theme_name=None,
    ):
        if enabled is not None:
            self.adaptive_theme_enabled = bool(enabled)
        if day_start_time:
            self.day_start_time = str(day_start_time)
        if night_start_time:
            self.night_start_time = str(night_start_time)
        if day_theme_name:
            self.day_theme_name = str(day_theme_name)
        if night_theme_name:
            self.night_theme_name = str(night_theme_name)
        self.save_settings()

    def save_settings(self):
        settings_data = {
            "theme": self.current_theme,
            "glass_effect": self.glass_effect_enabled,
            "glass_intensity": self.glass_intensity,
            "advanced_glass_enabled": self.advanced_glass_enabled,
            "advanced_glass_opacity": self.advanced_glass_opacity,
            "desktop_mode_enabled": self.desktop_mode_enabled,
            "smooth_animations": self.smooth_animations,
            "android_animations": self.android_animations,
            "time_format": self.time_format,
            "date_format": self.date_format,
            "font_family": self.font_family,
            "font_size": self.font_size,
            "time_font_size": self.time_font_size,
            "date_font_size": self.date_font_size,
            "time_font_family": self.time_font_family,
            "date_font_family": self.date_font_family,
            "backup_auto": self.backup_auto,
            "backup_interval": self.backup_interval,
            "search_cache_enabled": self.search_cache_enabled,
            "virtualization_enabled": self.virtualization_enabled,
            "clock_style": self.clock_style,
            "show_date": self.show_date,
            "show_seconds": self.show_seconds,
            "show_weekday": self.show_weekday,
            "clock_glass_frame": self.clock_glass_frame,
            "show_android_clock_widget": self.show_android_clock_widget,
            "time_color": self.time_color,
            "date_color": self.date_color,
            "clock_accent_color": self.clock_accent_color,
            "clock_glow_enabled": self.clock_glow_enabled,
            "clock_glow_intensity": self.clock_glow_intensity,
            "clock_border_radius": self.clock_border_radius,
            "clock_bg_opacity": self.clock_bg_opacity,
            "clock_bold": self.clock_bold,
            "clock_blink_colon": self.clock_blink_colon,
            "search_history_enabled": self.search_history_enabled,
            "card_border_radius": self.card_border_radius,
            "card_hover_glow": self.card_hover_glow,
            "active_app_color": self.active_app_color,
            "icon_scale_pct": self.icon_scale_pct,
            "show_plugins_in_grid": self.show_plugins_in_grid,
            "launch_behavior": self.launch_behavior,
            "card_columns": self.card_columns,
            "detox_notifications": self.detox_notifications,
            "auto_update_enabled": self.auto_update_enabled,
            "system_notifications_enabled": self.system_notifications_enabled,
            "autostart_windows": self.autostart_windows,
            "adaptive_theme_enabled": self.adaptive_theme_enabled,
            "day_start_time": self.day_start_time,
            "night_start_time": self.night_start_time,
            "day_theme_name": self.day_theme_name,
            "night_theme_name": self.night_theme_name,
            "island_dnd_enabled": self.island_dnd_enabled,
            "island_glow_enabled": self.island_glow_enabled,
            "island_charging_anim": self.island_charging_anim,
            "island_simulate_charging": self.island_simulate_charging,
            "island_style": self.island_style,
            "right_click_back_enabled": self.right_click_back_enabled,
            "github_repo_url": self.github_repo_url,
            "github_auto_update": self.github_auto_update,
        }
        return self.file_manager.save_settings(settings_data)

    def load_custom_themes(self):
        themes = self.file_manager.load_data("custom_themes.json", {})
        return themes if isinstance(themes, dict) else {}

    def save_custom_themes(self):
        self.file_manager.save_data("custom_themes.json", self.custom_themes)

    def get_theme(self, theme_name=None):
        theme_name = theme_name or self.current_theme
        all_themes = {**self.BASE_THEMES, **self.custom_themes}
        return all_themes.get(theme_name, self.BASE_THEMES["dark"])

    def get_current_theme(self):
        return self.get_theme(self.current_theme)

    def apply_theme(self, page, theme_name):
        if theme_name not in self.BASE_THEMES and theme_name not in self.custom_themes:
            theme_name = "dark"

        self.current_theme = theme_name
        theme = self.get_theme(theme_name)

        if page:
            page.bgcolor = theme["BG"]
            if theme_name in ["light", "spring"] or theme.get("MODE") == "light":
                page.theme_mode = ft.ThemeMode.LIGHT
            else:
                page.theme_mode = ft.ThemeMode.DARK

            try:
                page.theme = ft.Theme(
                    font_family=self.font_family,
                    page_transitions=ft.PageTransitionsTheme(
                        windows=ft.PageTransitionTheme.CUPERTINO,
                        linux=ft.PageTransitionTheme.CUPERTINO,
                        macos=ft.PageTransitionTheme.CUPERTINO,
                    )
                    if self.smooth_animations
                    else None,
                )
            except Exception:
                logger.exception("Не удалось применить тему")

        self.save_settings()
        return theme

    def toggle_glass_effect(self):
        self.glass_effect_enabled = not self.glass_effect_enabled
        self.save_settings()
        return self.glass_effect_enabled

    def set_glass_intensity(self, intensity):
        if intensity in ["light", "medium", "strong"]:
            self.glass_intensity = intensity
            self.save_settings()

    def set_advanced_glass(self, enabled: bool, opacity: int = None):
        self.advanced_glass_enabled = bool(enabled)
        if opacity is not None:
            self.advanced_glass_opacity = max(15, min(95, int(opacity)))
        self.save_settings()

    def set_desktop_mode(self, enabled: bool):
        self.desktop_mode_enabled = bool(enabled)
        self.save_settings()

    def toggle_smooth_animations(self):
        self.smooth_animations = not self.smooth_animations
        self.save_settings()
        return self.smooth_animations

    def toggle_android_animations(self):
        self.android_animations = not self.android_animations
        self.save_settings()
        return self.android_animations

    def get_available_themes(self):
        return {**self.BASE_THEMES, **self.custom_themes}

    def add_custom_theme(self, name, theme_data):
        if name and theme_data:
            self.custom_themes[name] = theme_data
            self.save_custom_themes()
            return True
        return False

    def delete_custom_theme(self, name):
        if name in self.custom_themes:
            del self.custom_themes[name]
            self.save_custom_themes()
            if self.current_theme == name:
                self.current_theme = "dark"
                self.save_settings()
            return True
        return False

    def set_time_format(self, format_type):
        if format_type in ["12", "24"]:
            self.time_format = format_type
            self.save_settings()

    def set_date_format(self, date_format):
        if date_format in ["dd.mm.yyyy", "mm/dd/yyyy", "yyyy-mm-dd"]:
            self.date_format = date_format
            self.save_settings()

    def set_font_family(self, font_family):
        self.font_family = font_family
        self.save_settings()

    def set_font_size(self, font_size):
        self.font_size = int(font_size)
        self.save_settings()

    def set_time_style(self, time_size=None, date_size=None, time_family=None, date_family=None):
        if time_size is not None:
            self.time_font_size = int(time_size)
        if date_size is not None:
            self.date_font_size = int(date_size)
        if time_family:
            self.time_font_family = time_family
        if date_family:
            self.date_font_family = date_family
        self.save_settings()

    def set_backup_settings(self, auto_backup, interval):
        self.backup_auto = bool(auto_backup)
        self.backup_interval = int(interval)
        self.save_settings()

    def set_performance_settings(self, search_cache, virtualization):
        self.search_cache_enabled = bool(search_cache)
        self.virtualization_enabled = bool(virtualization)
        self.save_settings()

    def set_clock_preferences(
        self,
        style=None,
        show_date=None,
        time_color=None,
        date_color=None,
        show_seconds=None,
        show_weekday=None,
        clock_glass_frame=None,
        time_font_size=None,
        show_android_clock_widget=None,
        clock_accent_color=None,
        clock_glow_enabled=None,
        clock_glow_intensity=None,
        clock_border_radius=None,
        clock_bg_opacity=None,
        clock_bold=None,
        clock_blink_colon=None,
    ):
        if style in self.CLOCK_STYLES:
            self.clock_style = style
        if show_date is not None:
            self.show_date = bool(show_date)
        if show_seconds is not None:
            self.show_seconds = bool(show_seconds)
        if show_weekday is not None:
            self.show_weekday = bool(show_weekday)
        if clock_glass_frame is not None:
            self.clock_glass_frame = bool(clock_glass_frame)
        if show_android_clock_widget is not None:
            self.show_android_clock_widget = bool(show_android_clock_widget)
        if time_font_size is not None:
            self.time_font_size = max(14, min(52, int(time_font_size)))
        if isinstance(time_color, str) and time_color.startswith("#"):
            self.time_color = time_color
        if isinstance(date_color, str) and date_color.startswith("#"):
            self.date_color = date_color
        if isinstance(clock_accent_color, str) and clock_accent_color.startswith("#"):
            self.clock_accent_color = clock_accent_color
        if clock_glow_enabled is not None:
            self.clock_glow_enabled = bool(clock_glow_enabled)
        if clock_glow_intensity is not None:
            self.clock_glow_intensity = max(4, min(36, int(clock_glow_intensity)))
        if clock_border_radius is not None:
            self.clock_border_radius = max(4, min(32, int(clock_border_radius)))
        if clock_bg_opacity is not None:
            self.clock_bg_opacity = max(0, min(100, int(clock_bg_opacity)))
        if clock_bold is not None:
            self.clock_bold = bool(clock_bold)
        if clock_blink_colon is not None:
            self.clock_blink_colon = bool(clock_blink_colon)
        self.save_settings()

    def set_personalization_preferences(
        self,
        card_border_radius=None,
        card_hover_glow=None,
        active_app_color=None,
        icon_scale_pct=None,
    ):
        if card_border_radius is not None:
            self.card_border_radius = max(8, min(32, int(card_border_radius)))
        if card_hover_glow is not None:
            self.card_hover_glow = bool(card_hover_glow)
        if isinstance(active_app_color, str) and active_app_color.startswith("#"):
            self.active_app_color = active_app_color
        if icon_scale_pct is not None:
            self.icon_scale_pct = max(80, min(130, int(icon_scale_pct)))
        self.save_settings()

    def set_program_preferences(
        self,
        show_plugins_in_grid=None,
        launch_behavior=None,
        card_columns=None,
        detox_notifications=None,
        autostart_windows=None,
    ):
        if show_plugins_in_grid is not None:
            self.show_plugins_in_grid = bool(show_plugins_in_grid)
        if launch_behavior in ["keep", "minimize"]:
            self.launch_behavior = launch_behavior
        if card_columns is not None:
            self.card_columns = max(4, min(8, int(card_columns)))
        if detox_notifications is not None:
            self.detox_notifications = bool(detox_notifications)
        if autostart_windows is not None:
            self.autostart_windows = bool(autostart_windows)
        self.save_settings()