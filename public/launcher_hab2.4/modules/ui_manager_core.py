# [file name]: ui_manager_core.py
import flet as ft
import threading
import time
import os
from datetime import datetime
from .theme_manager import ThemeManager
from .app_manager import AppManager
from .system_monitor import SystemMonitor
from .glass_morphism import GlassMorphism
from .backup_manager import BackupManager
from .cache_manager import CacheManager, SearchCache
from .logger import get_logger
from .hotkey_manager import HotkeyManager
from .smart_workspace_manager import SmartWorkspaceManager

try:
    from .plugin_manager import PluginManager
except ImportError:
    class PluginManager:
        def __init__(self, file_manager):
            self.file_manager = file_manager

        def create_plugin_ui(self, colors):
            return ft.Container(
                content=ft.Column(
                    [
                        ft.Icon("extension", size=48, color=colors["ON_SURFACE_VARIANT"]),
                        ft.Text("Плагины недоступны", size=16, weight=ft.FontWeight.BOLD),
                    ],
                    horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                    spacing=10,
                ),
                padding=40,
                alignment=ft.alignment.center,
            )

try:
    from .audio_controller import AudioController
except ImportError:
    class AudioController:
        def __init__(self):
            pass

        def get_volume_level(self):
            return 50

        def set_volume_level(self, volume):
            pass

logger = get_logger(__name__)


class UIManagerCore:
    WEEKDAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

    def __init__(self, page: ft.Page):
        self.page = page
        self.theme_manager = ThemeManager()
        self.app_manager = AppManager()
        self.system_monitor = SystemMonitor()
        self.plugin_manager = self._safe_create_plugin_manager()
        if hasattr(self.plugin_manager, "set_context"):
            self.plugin_manager.set_context(self)
        self.audio_controller = self._safe_create_audio_controller()
        self.backup_manager = BackupManager(self.app_manager.file_manager)
        self.cache_manager = CacheManager()
        self.search_cache = SearchCache()
        self.smart_workspace_manager = SmartWorkspaceManager(self.app_manager.file_manager, self.app_manager)
        self.hotkey_manager = HotkeyManager(self)

        self.floating_hud_visible = False
        self.floating_hud = None
        self.floating_hud_cpu_text = None
        self.floating_hud_ram_text = None
        self.floating_hud_apps_text = None
        self.search_history_file = "search_history.json"

        from .ui_panels import UIPanels
        from .ui_dialogs import UIDialogs
        from .dynamic_island import DynamicIslandManager
        from .diagnostics_updater import GitHubUpdaterAndDiagnostics

        self.dynamic_island = DynamicIslandManager(self)
        self.diagnostics_updater = GitHubUpdaterAndDiagnostics(self)
        self.panels = UIPanels(self)
        self.dialogs = UIDialogs(self)

        # Состояние разделов и стек навигации для функции «ПКМ = Назад» (v2.6)
        self.active_section = "apps"  # "apps" | "tracker"
        self.current_filter = "all"
        self.navigation_stack = []
        self.filter_dialog_open = False
        self.auto_update_enabled = self.theme_manager.auto_update_enabled
        self.system_notifications_enabled = self.theme_manager.system_notifications_enabled
        self.volume_slider_visible = False
        self.search_history = self.load_search_history()

        # UI элементы
        self.header = None
        self.sidebar = None
        self.main_content = None
        self.loading_progress = None

        self.setup_hotkeys()

    def show_toast(self, message: str, title: str = None, force_show: bool = False):
        """
        Универсальный метод показа уведомления в современном Flet.
        Если в Dynamic Island включен режим «Не беспокоить» (DND), всплывающее окно подавляется,
        а уведомление тихо сохраняется в центр уведомлений Dynamic Island!
        """
        if hasattr(self, "dynamic_island") and self.dynamic_island and title:
            self.dynamic_island.push_notification(
                app=title,
                title=title,
                message=message,
                icon="notifications_active",
                color="#3b82f6",
                silent=True,
            )

        if (
            not force_show
            and hasattr(self, "dynamic_island")
            and self.dynamic_island
            and self.dynamic_island.dnd_enabled
        ):
            # Полностью рабочий режим «Не беспокоить»: блокируем всплывающий баннер
            return

        if not hasattr(self, "page") or not self.page:
            return
        try:
            content = (
                ft.Column(
                    [
                        ft.Text(title, weight=ft.FontWeight.BOLD, size=13),
                        ft.Text(message, size=12),
                    ],
                    tight=True,
                    spacing=2,
                )
                if title
                else ft.Text(message, size=13)
            )
            sb = ft.SnackBar(content=content, action="OK", duration=2800)
            if hasattr(self.page, "open"):
                self.page.open(sb)
            else:
                self.page.snack_bar = sb
                sb.open = True
                self.page.update()
        except Exception:
            logger.exception("Не удалось показать SnackBar")

    def handle_right_click_back(self, e=None):
        """
        Функция «Назад» по правой кнопке мыши (ПКМ) для удобного управления одной рукой (v2.6).
        Возвращает из раздела «Трекер времени», сбрасывает поисковый запрос или фильтр категории.
        """
        if not getattr(self.theme_manager, "right_click_back_enabled", True):
            return

        # 1. Если открыт поиск — очищаем строку поиска
        if hasattr(self.panels, "search_field") and self.panels.search_field and self.panels.search_field.value:
            self.panels.search_field.value = ""
            self.update_main_content()
            self.update_sidebar()
            self.show_toast("⬅️ Назад (ПКМ): поиск очищен")
            return

        # 2. Если включен фильтр категории — возвращаем «Все приложения»
        if self.current_filter != "all":
            self.current_filter = "all"
            self.update_main_content()
            self.update_sidebar()
            self.show_toast("⬅️ Назад (ПКМ): показаны все приложения")
            return

        # 3. Если мы во вкладке «Трекер времени» — возвращаемся в «Приложения»
        if self.active_section != "apps":
            self.switch_section("apps")
            self.show_toast("⬅️ Назад (ПКМ): возврат на главный экран приложений")
            return

        # 4. Если есть история в стеке навигации
        if self.navigation_stack:
            prev_state = self.navigation_stack.pop()
            self.active_section = prev_state.get("section", "apps")
            self.current_filter = prev_state.get("filter", "all")
            self.update_header()
            self.update_main_content()
            self.update_sidebar()
            self.show_toast("⬅️ Назад (ПКМ)")
            return

        self.show_toast("⬅️ Вы на главном экране (ПКМ — Назад активно)")

    def check_and_apply_adaptive_theme(self, force_notify: bool = False):
        """
        Проверяет расписание адаптивной темы «День / Ночь» (v2.6):
        Днём включает выбранную светлую тему, ночью — тёмную.
        """
        if not getattr(self.theme_manager, "adaptive_theme_enabled", False):
            return
        target_theme = self.theme_manager.evaluate_adaptive_theme()
        if target_theme and target_theme != self.theme_manager.current_theme:
            self.theme_manager.apply_theme(self.page, target_theme)
            self.update_interface_colors()
            self.update_header()
            self.update_main_content()
            self.update_sidebar()
            if force_notify:
                self.show_toast(
                    f"🌗 Адаптивная тема День/Ночь переключена на: {target_theme}",
                    title="Адаптивная тема 2.6",
                )
        elif force_notify:
            self.show_toast(
                f"🌗 По расписанию активна тема: {target_theme} ({self.theme_manager.day_start_time} – {self.theme_manager.night_start_time})"
            )

    def setup_hotkeys(self):
        try:
            if hasattr(self.page, "on_keyboard_event"):
                self.page.on_keyboard_event = self.hotkey_manager.handle_keyboard
        except Exception:
            logger.exception("Не удалось подключить обработчик горячих клавиш")

    def _safe_create_plugin_manager(self):
        try:
            return PluginManager(self.app_manager.file_manager)
        except Exception:
            logger.exception("PluginManager не инициализирован; используем запасной режим")

            class _FallbackPluginManager:
                def set_context(self, _context):
                    return None

                def get_launchable_plugin_apps(self):
                    return []

                def create_plugin_ui(self, colors):
                    return ft.Container(
                        content=ft.Text("PluginManager недоступен", color=colors["ON_SURFACE_VARIANT"]),
                        padding=12,
                    )

            return _FallbackPluginManager()

    def _safe_create_audio_controller(self):
        try:
            return AudioController()
        except Exception:
            logger.exception("AudioController не инициализирован; используем запасной режим")

            class _FallbackAudioController:
                def get_volume_level(self):
                    return 50

                def set_volume_level(self, _volume):
                    return None

            return _FallbackAudioController()

    def get_all_launchable_items(self):
        """Возвращает все приложения + активные плагины (чтобы плагины были в списке запуска)."""
        base_apps = self.app_manager.all_apps + self.app_manager.custom_apps
        if getattr(self.theme_manager, "show_plugins_in_grid", True) and hasattr(
            self.plugin_manager, "get_launchable_plugin_apps"
        ):
            return base_apps + self.plugin_manager.get_launchable_plugin_apps()
        return base_apps

    def initialize_ui(self):
        self.setup_page()
        if getattr(self.theme_manager, "adaptive_theme_enabled", False):
            target = self.theme_manager.evaluate_adaptive_theme()
            self.theme_manager.current_theme = target
        self.create_ui_elements()
        self.setup_timers()
        self.apply_initial_theme()

        if hasattr(self.theme_manager, "backup_auto") and self.theme_manager.backup_auto:
            threading.Thread(target=self.backup_manager.auto_backup, daemon=True).start()

        if getattr(self.theme_manager, "github_auto_update", True):
            threading.Thread(
                target=lambda: self.diagnostics_updater.check_for_updates(silent=True),
                daemon=True,
            ).start()

    def setup_page(self):
        self.page.title = "Launcher Hab 2.6"
        self.page.padding = 0
        self.page.spacing = 0
        self.page.theme_mode = ft.ThemeMode.DARK
        self.page.bgcolor = "#0d111a"

        try:
            self.page.theme = ft.Theme(
                font_family=self.theme_manager.font_family,
                page_transitions=ft.PageTransitionsTheme(
                    windows=ft.PageTransitionTheme.CUPERTINO,
                    linux=ft.PageTransitionTheme.CUPERTINO,
                    macos=ft.PageTransitionTheme.CUPERTINO,
                )
                if self.theme_manager.smooth_animations
                else None,
            )
        except Exception:
            logger.exception("Ошибка настройки темы страницы")

        try:
            if hasattr(self.page, "on_window_event"):
                self.page.on_window_event = self.on_window_event
        except Exception:
            logger.exception("Не удалось подключить обработчик событий окна")

        icon_candidate = os.path.join("assets", "app_icon.png")
        if os.path.exists(icon_candidate):
            self.page.window_icon = "app_icon.png"

    def create_ui_elements(self):
        self.header = self.panels.create_header()
        self.sidebar = self.panels.create_sidebar()
        self.main_content = self.panels.create_main_content()
        self.loading_progress = self.panels.create_loading_progress()

        content = ft.Row(
            [
                self.sidebar,
                ft.VerticalDivider(width=1, color=self.get_colors()["OUTLINE"], thickness=1),
                ft.Container(content=self.main_content, expand=True, padding=0, margin=0),
            ],
            expand=True,
            spacing=0,
        )

        recycle_fab = ft.Container(
            content=ft.IconButton(
                icon="delete_outline",
                icon_color=self.get_colors()["ON_SURFACE"],
                tooltip="Открыть корзину",
                on_click=lambda e: self.open_recycle_bin(),
            ),
            right=24,
            bottom=24,
            bgcolor=GlassMorphism._apply_opacity(self.get_colors()["SURFACE"], 0.85),
            blur=GlassMorphism._make_blur(14),
            border=ft.border.all(1, GlassMorphism._apply_opacity(self.get_colors()["ON_SURFACE"], 0.12)),
            border_radius=16,
            padding=6,
            shadow=ft.BoxShadow(blur_radius=14, color=self.get_colors()["GLASS_SHADOW"], offset=ft.Offset(0, 4)),
        )

        body = ft.Stack([content, recycle_fab], expand=True)
        self.page.add(self.header, body)
        self.update_interface_colors()

    def setup_timers(self):
        def time_timer():
            tick_counter = 0
            while True:
                self.update_time()
                # Посекундный тик для Dynamic Island 2.6 (Таймер, Секундомер, Зарядка)
                if hasattr(self, "dynamic_island") and self.dynamic_island:
                    self.dynamic_island.tick_second()
                # Посекундный тик для запущенных приложений в Session Tracker
                if hasattr(self.plugin_manager, "notify_second_tick"):
                    has_active = self.plugin_manager.notify_second_tick()
                    if has_active and tick_counter % 3 == 0:
                        try:
                            self.update_main_content()
                            self.update_sidebar()
                        except Exception:
                            pass
                tick_counter += 1
                if tick_counter >= 60:
                    tick_counter = 0
                    self.check_and_apply_adaptive_theme(force_notify=False)
                    if hasattr(self.plugin_manager, "notify_tick"):
                        self.plugin_manager.notify_tick()
                time.sleep(1)

        def devices_timer():
            while True:
                self.update_devices_header()
                time.sleep(5)

        def backup_timer():
            while True:
                if hasattr(self.theme_manager, "backup_auto") and self.theme_manager.backup_auto:
                    self.backup_manager.auto_backup()
                time.sleep(86400)

        threading.Thread(target=time_timer, daemon=True).start()
        threading.Thread(target=devices_timer, daemon=True).start()
        threading.Thread(target=backup_timer, daemon=True).start()

    def update_time(self):
        """Обновление времени и даты с поддержкой всех 18 стилей часов (v2.5)."""
        if hasattr(self.panels, "current_time_text") and self.panels.current_time_text:
            now = datetime.now()
            clock_style = getattr(self.theme_manager, "clock_style", "android_vertical")
            show_sec = getattr(self.theme_manager, "show_seconds", True)
            show_weekday = getattr(self.theme_manager, "show_weekday", True)
            is_12h = getattr(self.theme_manager, "time_format", "24") == "12"
            blink_colon = getattr(self.theme_manager, "clock_blink_colon", False)

            hours_str = now.strftime("%I" if is_12h else "%H")
            mins_str = now.strftime("%M")
            secs_str = now.strftime("%S")
            sep = (" " if (blink_colon and now.second % 2 == 1) else ":")

            if clock_style in (
                "android_vertical",
                "stacked",
                "samsung_oneui",
                "vertical_neon_bar",
                "material_expressive",
            ):
                time_str = f"{hours_str}\n{mins_str}"
            elif clock_style in ("minimal", "pill_glass", "ios_standby", "macos_sonoma"):
                suffix = f" {now.strftime('%p')}" if is_12h else ""
                time_str = f"{hours_str}{sep}{mins_str}{suffix}"
            elif clock_style == "split_flip":
                time_str = f"[{hours_str}] {sep} [{mins_str}]" + (f" {sep} [{secs_str}]" if show_sec else "")
            elif clock_style == "cyber_mono":
                time_str = f"[ {hours_str} {sep} {mins_str}" + (f" {sep} {secs_str} ]" if show_sec else " ]")
            elif clock_style == "nothing_dot":
                time_str = f"::{hours_str} · {mins_str}" + (f" · {secs_str}::" if show_sec else "::")
            elif clock_style == "neon_synthwave":
                time_str = f"⚡ {hours_str}{sep}{mins_str}" + (f"{sep}{secs_str}" if show_sec else "")
            elif clock_style == "retro_casio":
                time_str = f"LCD {hours_str}{sep}{mins_str}" + (f"'{secs_str}" if show_sec else "")
            elif clock_style == "futuristic_hud":
                time_str = f"SYS//{hours_str}{sep}{mins_str}" + (f".{secs_str}" if show_sec else "")
            elif clock_style == "analog_hybrid":
                time_str = f"◔ {hours_str}{sep}{mins_str}" + (f"{sep}{secs_str}" if show_sec else "")
            else:
                suffix = f" {now.strftime('%p')}" if is_12h else ""
                time_str = f"{hours_str}{sep}{mins_str}" + (f"{sep}{secs_str}" if show_sec else "") + suffix

            date_format = getattr(self.theme_manager, "date_format", "dd.mm.yyyy")
            if date_format == "mm/dd/yyyy":
                date_str = now.strftime("%m/%d/%Y")
            elif date_format == "yyyy-mm-dd":
                date_str = now.strftime("%Y-%m-%d")
            else:
                date_str = now.strftime("%d.%m.%Y")

            if show_weekday or clock_style == "compact_badge":
                weekday_ru = self.WEEKDAYS_RU[now.weekday()]
                date_str = f"{weekday_ru}, {date_str}"

            self.panels.current_time_text.value = time_str
            if hasattr(self.panels, "current_date_text") and self.panels.current_date_text:
                self.panels.current_date_text.value = date_str
                self.panels.current_date_text.visible = getattr(self.theme_manager, "show_date", True)

            self.panels.current_time_text.color = getattr(
                self.theme_manager, "time_color", self.get_colors()["ON_SURFACE"]
            )
            if hasattr(self.panels, "current_date_text") and self.panels.current_date_text:
                self.panels.current_date_text.color = getattr(
                    self.theme_manager, "date_color", self.get_colors()["ON_SURFACE_VARIANT"]
                )

            if hasattr(self.panels, "android_clock_hours") and self.panels.android_clock_hours:
                self.panels.android_clock_hours.value = hours_str
                self.panels.android_clock_hours.color = getattr(
                    self.theme_manager, "time_color", self.get_colors()["ON_SURFACE"]
                )
            if hasattr(self.panels, "android_clock_minutes") and self.panels.android_clock_minutes:
                self.panels.android_clock_minutes.value = mins_str
                self.panels.android_clock_minutes.color = getattr(
                    self.theme_manager, "clock_accent_color", self.get_colors()["ACCENT"]
                )
            if hasattr(self.panels, "android_clock_date") and self.panels.android_clock_date:
                self.panels.android_clock_date.value = f"{date_str}" + (f" • {secs_str} сек" if show_sec else "")

            self.update_floating_hud_data()
            if hasattr(self, "page") and self.page:
                try:
                    self.page.update()
                except Exception:
                    pass

    def switch_section(self, section_name: str):
        """Плавное переключение между разделами ('apps' <-> 'tracker') с анимацией и сохранением истории для ПКМ Назад."""
        if self.active_section == section_name:
            return
        self.navigation_stack.append({"section": self.active_section, "filter": self.current_filter})
        if len(self.navigation_stack) > 15:
            self.navigation_stack.pop(0)
        self.active_section = section_name
        self.update_header()
        self.update_main_content()

    def update_floating_hud_data(self):
        if not self.floating_hud_visible:
            return
        if not (self.floating_hud_cpu_text and self.floating_hud_ram_text and self.floating_hud_apps_text):
            return
        perf = self.system_monitor.get_performance_info()
        self.floating_hud_cpu_text.value = f"CPU {perf['cpu']}%"
        self.floating_hud_ram_text.value = f"RAM {perf['ram']}%"
        self.floating_hud_apps_text.value = f"Избранных: {len(self.app_manager.favorite_apps)}"

    def update_devices_header(self):
        if hasattr(self.panels, "devices_container") and self.panels.devices_container:
            self.panels.devices_container.content = self.system_monitor.create_devices_header(self.get_colors())
            try:
                self.page.update()
            except Exception:
                pass

    def apply_initial_theme(self):
        self.theme_manager.apply_theme(self.page, self.theme_manager.current_theme)
        self.update_interface_colors()
        self.update_time()

    def get_colors(self):
        return self.theme_manager.get_current_theme()

    def update_interface_colors(self):
        colors = self.get_colors()
        self.page.bgcolor = colors["BG"]

        if self.header:
            self.header.bgcolor = (
                GlassMorphism._apply_opacity(colors["SURFACE"], 0.86)
                if self.theme_manager.glass_effect_enabled
                else colors["SURFACE"]
            )
        if self.sidebar:
            self.sidebar.bgcolor = (
                GlassMorphism._apply_opacity(colors["SURFACE"], 0.78)
                if self.theme_manager.glass_effect_enabled
                else colors["SURFACE"]
            )
        if self.main_content:
            self.main_content.bgcolor = colors["BG"]

        self.page.update()

    def update_main_content(self):
        """Плавное обновление основного контента через AnimatedSwitcher."""
        if self.main_content:
            new_inner = self.panels.create_main_content_internal()
            if hasattr(self.panels, "animated_switcher") and self.panels.animated_switcher:
                self.panels.animated_switcher.content = new_inner
            else:
                self.main_content.content = new_inner
            self.page.update()

    def update_sidebar(self):
        if self.sidebar:
            self.sidebar.content = self.panels.create_sidebar_content()
            self.page.update()

    def launch_app(self, app):
        """
        Запуск приложения или плагина + автоматический старт таймера в Game & App Session Tracker.
        """
        if app.get("type") == "plugin":
            plugin_id = app.get("plugin_id") or app.get("package")
            if plugin_id == "session_tracker_plugin":
                self.switch_section("tracker")
                self.show_toast("Открыт раздел «Трекер времени»", "Game & App Session Tracker")
            elif hasattr(self.plugin_manager, "open_plugin_window"):
                self.plugin_manager.open_plugin_window(plugin_id)
            return

        success, message = self.app_manager.launch_app(app)
        # Запускаем таймер сессии с 0 при клике на запуск приложения
        if hasattr(self.plugin_manager, "notify_app_launched"):
            self.plugin_manager.notify_app_launched(app)

        if getattr(self.theme_manager, "launch_behavior", "keep") == "minimize" and success:
            try:
                self.page.window_minimized = True
            except Exception:
                pass

        self.update_main_content()
        self.update_sidebar()
        if self.system_notifications_enabled:
            self.show_system_notification("Запуск и старт таймера", f"{message} • Таймер сессии запущен")

    def show_system_notification(self, title, message):
        if self.system_notifications_enabled:
            self.show_toast(message, title=title)

    def toggle_volume_slider(self, e):
        self.volume_slider_visible = not self.volume_slider_visible
        if hasattr(self.panels, "volume_slider_container") and self.panels.volume_slider_container:
            self.panels.volume_slider_container.visible = self.volume_slider_visible
            self.panels.volume_slider_container.update()

    def on_volume_change(self, e):
        """Неблокирующее изменение системной громкости в фоне."""
        volume = int(e.control.value)
        self.audio_controller.set_volume_level(volume)
        e.control.label = f"{volume}%"
        e.control.update()

    def filter_apps(self, e):
        query = e.control.value.lower().strip()

        if getattr(self.theme_manager, "search_history_enabled", True) and query and query not in self.search_history:
            self.search_history.append(query)
            if len(self.search_history) > 50:
                self.search_history.pop(0)
            self.save_search_history()

        if not query:
            self.update_main_content()
            return

        all_apps = self.get_all_launchable_items()
        if hasattr(self.theme_manager, "search_cache_enabled") and self.theme_manager.search_cache_enabled:
            results = self.search_cache.get_search_results(query, all_apps)
        else:
            results = [
                app
                for app in all_apps
                if query in app["name"].lower()
                or query in app["category"].lower()
                or (app.get("tags") and query in app["tags"].lower())
            ]

        self.panels.show_search_results(results, query)

    def show_filter_menu(self, e):
        self.dialogs.show_filter_menu(e)

    def on_window_event(self, e):
        try:
            if getattr(self.theme_manager, "desktop_mode_enabled", True) and getattr(e, "data", "") == "minimize":
                self.page.window_minimized = False
                self.page.window_full_screen = True
                self.page.window_to_front()
                self.page.update()
        except Exception:
            logger.exception("Ошибка обработки window event")

    def quick_add_idea(self):
        idea_field = ft.TextField(label="New idea", autofocus=True)

        def save_idea(_):
            idea = (idea_field.value or "").strip()
            if not idea:
                return
            with open("idea_notes.txt", "a", encoding="utf-8") as f:
                f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {idea}\n")
            self.page.close(dialog)
            self.show_system_notification("Idea Notebook", "Идея сохранена")

        dialog = ft.AlertDialog(
            title=ft.Text("Idea Notebook"),
            content=idea_field,
            actions=[
                ft.TextButton("Отмена", on_click=lambda e: self.page.close(dialog)),
                ft.FilledButton("Сохранить", on_click=save_idea),
            ],
        )
        self.page.open(dialog)

    def open_recycle_bin(self):
        import subprocess
        import platform

        try:
            system = platform.system().lower()
            if system == "windows":
                os.system("start shell:RecycleBinFolder")
            elif system == "darwin":
                subprocess.Popen(["open", os.path.expanduser("~/.Trash")])
            else:
                candidates = [
                    "trash://",
                    os.path.expanduser("~/.local/share/Trash/files"),
                    os.path.expanduser("~/.Trash"),
                ]
                opened = False
                for candidate in candidates:
                    try:
                        if candidate.startswith("trash://") or os.path.exists(candidate):
                            subprocess.Popen(["xdg-open", candidate])
                            opened = True
                            break
                    except Exception:
                        continue
                if not opened:
                    raise RuntimeError("Корзина не найдена")
            self.show_system_notification("Корзина", "Открыта корзина системы")
        except Exception:
            logger.exception("Ошибка открытия корзины")
            self.show_system_notification("Корзина", "Не удалось открыть корзину")

    def toggle_floating_hud(self):
        self.floating_hud_visible = not self.floating_hud_visible
        self.update_header()
        self.update_main_content()

    def run_workspace_preset(self, preset_id):
        result = self.smart_workspace_manager.run_preset(preset_id)
        self.show_system_notification("Smart Workspace", result.get("message", "Готово"))

    def apply_theme_settings(self, theme_name):
        self.theme_manager.apply_theme(self.page, theme_name)
        self.update_interface_colors()
        self.update_header()
        self.update_main_content()
        self.update_sidebar()
        self.show_toast(f"✅ Тема применена и сохранена: {theme_name}")

    def toggle_glass_effect(self):
        enabled = self.theme_manager.toggle_glass_effect()
        self.update_header()
        self.update_main_content()
        self.update_sidebar()
        message = "Эффект прозрачного стекла включен" if enabled else "Эффект прозрачного стекла выключен"
        self.show_toast(message)

    def set_glass_intensity(self, intensity):
        self.theme_manager.set_glass_intensity(intensity)
        self.update_main_content()
        self.update_sidebar()
        intensity_names = {"light": "Слабая", "medium": "Средняя", "strong": "Сильная"}
        self.show_toast(f"Интенсивность стекла: {intensity_names.get(intensity, intensity)}")

    def toggle_smooth_animations(self):
        enabled = self.theme_manager.toggle_smooth_animations()
        message = "Плавные анимации включены" if enabled else "Плавные анимации выключены"
        self.show_toast(message)

    def toggle_android_animations(self):
        enabled = self.theme_manager.toggle_android_animations()
        message = "Android-анимации включены" if enabled else "Android-анимации выключены"
        self.show_toast(message)

    def toggle_auto_update(self, e):
        self.auto_update_enabled = bool(e.control.value)
        self.theme_manager.auto_update_enabled = self.auto_update_enabled
        self.theme_manager.save_settings()
        if self.auto_update_enabled:
            self.show_system_notification("Автообновление включено", "Интерфейс будет обновляться автоматически")

    def toggle_system_notifications(self, e):
        self.system_notifications_enabled = bool(e.control.value)
        self.theme_manager.system_notifications_enabled = self.system_notifications_enabled
        self.theme_manager.save_settings()
        if self.system_notifications_enabled:
            self.show_system_notification("Уведомления включены", "Вы будете получать уведомления о действиях")

    def refresh_apps_list(self):
        self.search_cache.invalidate_search_cache()
        self.update_main_content()
        self.update_sidebar()
        self.show_toast("✅ Список приложений и плагинов обновлен")

    def reset_favorites(self):
        self.app_manager.favorite_apps = []
        self.app_manager.save_favorites()
        self.update_main_content()
        self.show_toast("✅ Избранное сброшено")

    def clear_manual_paths(self):
        self.app_manager.manual_paths = {}
        self.app_manager.save_manual_paths()
        self.update_main_content()
        self.update_sidebar()
        self.show_toast("✅ Ручные пути очищены")

    def show_settings(self, e):
        self.dialogs.show_settings(e)

    def show_plugins_manager(self, e):
        self.dialogs.show_plugins_manager(e)

    def show_workspace_manager(self, e=None):
        self.dialogs.show_workspace_manager(e)

    def show_add_custom_app_dialog(self, e):
        self.dialogs.show_add_custom_app_dialog(e)

    def show_app_menu_dialog(self, app):
        self.dialogs.show_app_menu_dialog(app)

    def show_favorite_app_menu_dialog(self, app):
        self.dialogs.show_favorite_app_menu_dialog(app)

    def select_manual_path(self, app):
        self.dialogs.select_manual_path(app)

    def show_edit_custom_app_dialog(self, app):
        self.dialogs.show_edit_custom_app_dialog(app)

    def show_edit_tags_dialog(self, app):
        self.dialogs.show_edit_tags_dialog(app)

    def reload_interface(self):
        self.page.clean()
        self.initialize_ui()

    def create_backup_now(self, e=None):
        backup_path = self.backup_manager.create_backup()
        if backup_path:
            self.show_toast(f"✅ Резервная копия создана: {os.path.basename(backup_path)}")
        else:
            self.show_toast("❌ Ошибка создания резервной копии")

    def restore_from_backup(self, backup_path):
        if self.backup_manager.restore_backup(backup_path):
            self.show_toast("✅ Настройки восстановлены из резервной копии")
            self.theme_manager.load_settings()
            self.apply_initial_theme()
            self.update_header()
            self.update_main_content()
            self.update_sidebar()
        else:
            self.show_toast("❌ Ошибка восстановления из резервной копии")

    def get_backup_list(self):
        return self.backup_manager.get_backup_list()

    def delete_backup(self, backup_filename):
        return self.backup_manager.delete_backup(backup_filename)

    def update_header(self):
        if self.header:
            new_header = self.panels.create_header()
            self.header.content = new_header.content
            self.header.bgcolor = new_header.bgcolor
            self.header.blur = new_header.blur
            self.page.update()

    def set_time_format(self, format_type):
        self.theme_manager.set_time_format(format_type)
        self.update_time()

    def set_font_family(self, font_family):
        self.theme_manager.set_font_family(font_family)
        self.page.theme = ft.Theme(font_family=font_family)
        self.page.update()

    def set_font_size(self, font_size):
        self.theme_manager.set_font_size(font_size)
        self.update_interface_colors()

    def set_performance_settings(self, search_cache, virtualization):
        self.theme_manager.set_performance_settings(search_cache, virtualization)
        if not search_cache:
            self.search_cache.cache_manager.clear()

    def set_backup_settings(self, auto_backup, interval):
        self.theme_manager.set_backup_settings(auto_backup, interval)

    def load_search_history(self):
        history = self.app_manager.file_manager.load_data(self.search_history_file, [])
        return history if isinstance(history, list) else []

    def save_search_history(self):
        self.app_manager.file_manager.save_data(self.search_history_file, self.search_history)

    def clear_search_cache(self):
        self.search_cache.invalidate_search_cache()
        self.search_history.clear()
        self.save_search_history()

    def get_apps_count(self):
        return len(self.get_all_launchable_items())

    def get_favorites_count(self):
        return len(self.app_manager.favorite_apps)

    def get_custom_apps_count(self):
        return len(self.app_manager.custom_apps)

    def get_performance_info(self):
        return {
            "search_cache_enabled": self.theme_manager.search_cache_enabled,
            "virtualization_enabled": self.theme_manager.virtualization_enabled,
            "cached_searches": len([k for k in self.search_cache.cache_manager.cache.keys() if k.startswith("search_")]),
            "search_history": len(self.search_history),
            "total_apps": self.get_apps_count(),
        }