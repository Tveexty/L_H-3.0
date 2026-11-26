# [file name]: hotkey_manager.py
import flet as ft
from typing import Callable

from .logger import get_logger

logger = get_logger(__name__)


class HotkeyManager:
    """Менеджер горячих клавиш"""

    def __init__(self, ui_core):
        self.core = ui_core
        self.hotkeys = {}
        self.custom_hotkeys = {}
        self.setup_default_hotkeys()
        self.load_custom_hotkeys()

    def setup_default_hotkeys(self):
        self.hotkeys = {
            "ctrl+f": self.focus_search,
            "ctrl+,": self.open_settings,
            "ctrl+r": self.refresh_apps,
            "ctrl+q": self.quit_app,
            "escape": self.clear_search,
            "f5": self.refresh_apps,
            "ctrl+shift+f": self.toggle_fullscreen,
            "ctrl+shift+s": self.open_workspace,
            "ctrl+shift+h": self.toggle_hud,
            "ctrl+shift+b": self.open_recycle_bin,
            "ctrl+shift+g": lambda: self.run_workspace_preset("gaming"),
            "ctrl+shift+d": lambda: self.run_workspace_preset("dev"),
        }

    def load_custom_hotkeys(self):
        try:
            self.custom_hotkeys = self.core.app_manager.file_manager.load_data("custom_hotkeys.json", {}) or {}
        except Exception:
            logger.exception("Не удалось загрузить custom hotkeys")
            self.custom_hotkeys = {}

    def save_custom_hotkeys(self):
        self.core.app_manager.file_manager.save_data("custom_hotkeys.json", self.custom_hotkeys)

    def register_hotkey(self, key_combination: str, action: Callable):
        self.hotkeys[key_combination.lower()] = action

    def handle_keyboard(self, e: ft.KeyboardEvent):
        if e.key is None:
            return

        key_combination = self._format_key_combination(e)

        # динамические hotkeys из workspace
        for preset_id, combo in self.core.smart_workspace_manager.hotkeys.items():
            if combo and combo.lower() == key_combination:
                self.run_workspace_preset(preset_id)
                return

        action = self.hotkeys.get(key_combination)
        if action:
            try:
                action()
            except Exception:
                logger.exception("Ошибка выполнения горячей клавиши: %s", key_combination)
            return

        action_name = self.custom_hotkeys.get(key_combination)
        if action_name:
            self.execute_custom_action(action_name)

    def _format_key_combination(self, e: ft.KeyboardEvent) -> str:
        parts = []
        if e.ctrl:
            parts.append("ctrl")
        if e.alt:
            parts.append("alt")
        if e.shift:
            parts.append("shift")
        if e.key and e.key.lower() not in ["control", "alt", "shift", "meta"]:
            parts.append(e.key.lower())
        return "+".join(parts)

    def execute_custom_action(self, action_name: str):
        action_map = {
            "open_settings": self.open_settings,
            "focus_search": self.focus_search,
            "refresh_apps": self.refresh_apps,
            "toggle_theme": self.toggle_theme,
            "show_plugins": lambda: self.core.show_plugins_manager(None),
            "add_app": lambda: self.core.show_add_custom_app_dialog(None),
            "create_backup": lambda: self.core.create_backup_now(None),
            "open_workspace": self.open_workspace,
            "toggle_hud": self.toggle_hud,
        }
        action = action_map.get(action_name)
        if action:
            try:
                action()
            except Exception:
                logger.exception("Ошибка кастомного действия: %s", action_name)

    def focus_search(self):
        if hasattr(self.core.panels, "search_field") and self.core.panels.search_field:
            self.core.panels.search_field.focus()

    def open_settings(self):
        self.core.show_settings(None)

    def refresh_apps(self):
        self.core.refresh_apps_list()

    def quit_app(self):
        self.core.page.window_close()

    def clear_search(self):
        if hasattr(self.core.panels, "search_field") and self.core.panels.search_field:
            self.core.panels.search_field.value = ""
            self.core.panels.search_field.update()
            self.core.update_main_content()

    def toggle_theme(self):
        current_theme = self.core.theme_manager.current_theme
        themes = list(self.core.theme_manager.BASE_THEMES.keys())
        idx = themes.index(current_theme)
        self.core.apply_theme_settings(themes[(idx + 1) % len(themes)])

    def toggle_fullscreen(self):
        self.core.page.window_fullscreen = not self.core.page.window_fullscreen
        self.core.page.update()

    def open_workspace(self):
        self.core.dialogs.show_workspace_manager(None)

    def toggle_hud(self):
        self.core.toggle_floating_hud()

    def open_recycle_bin(self):
        self.core.open_recycle_bin()

    def run_workspace_preset(self, preset_id: str):
        self.core.run_workspace_preset(preset_id)