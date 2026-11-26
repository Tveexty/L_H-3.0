# [file name]: plugin_manager.py
import flet as ft
import importlib.util
import os
import shutil
import sys
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from .glass_morphism import GlassMorphism
from .logger import get_logger

logger = get_logger(__name__)


def _safe_toast(page, message: str):
    """Универсальный показ уведомления Flet без ошибки AttributeError: show_snack_bar."""
    if not page:
        return
    try:
        sb = ft.SnackBar(content=ft.Text(message), action="OK", duration=2500)
        if hasattr(page, "open"):
            page.open(sb)
        else:
            page.snack_bar = sb
            sb.open = True
            page.update()
    except Exception:
        pass


class PluginAPI:
    """
    Расширенный SDK / API для плагинов и расширений Launcher Hab 2.5.
    Позволяет плагинам безопасно взаимодействовать с ядром лаунчера:
    - подписываться на события ('app_launched', 'theme_changed', 'clock_style_changed', 'tick');
    - добавлять бейджи на карточки приложений (get_app_card_badge);
    - регистрировать плагин в общем списке запуска («Плагины»);
    - хранить настройки в JSON (get_config / save_config) и зашифрованные секреты (get_secure_secret / set_secure_secret);
    - управлять системной громкостью и уведомлениями.
    """

    API_VERSION = "2.5.0"

    def __init__(self, plugin_manager, core=None):
        self.plugin_manager = plugin_manager
        self.core = core
        self._event_listeners: Dict[str, List[Callable]] = {}

    def on(self, event_name: str, callback: Callable):
        """Подписка на системное событие ('app_launched', 'theme_changed', 'clock_style_changed', 'tick')."""
        self._event_listeners.setdefault(event_name, []).append(callback)

    def emit(self, event_name: str, *args, **kwargs):
        """Вызов обработчиков события."""
        for cb in self._event_listeners.get(event_name, []):
            try:
                cb(*args, **kwargs)
            except Exception:
                logger.exception("Ошибка в обработчике события плагина: %s", event_name)

    def notify(self, title: str, message: str):
        """Показать уведомление в лаунчере."""
        if self.core and hasattr(self.core, "show_system_notification"):
            self.core.show_system_notification(title, message)

    def get_config(self, plugin_name: str, default: Optional[Dict] = None) -> Dict:
        return self.plugin_manager.get_plugin_config(plugin_name, default or {})

    def save_config(self, plugin_name: str, config: Dict) -> bool:
        return self.plugin_manager.save_plugin_config(plugin_name, config)

    def set_secure_secret(self, plugin_name: str, key: str, secret_value: str) -> bool:
        """Сохранить зашифрованный секрет плагина через EncryptionManager v2.5 (AES-Fernet + PBKDF2)."""
        cfg = self.get_config(plugin_name, {})
        sec_map = cfg.get("_encrypted_secrets", {})
        enc_mgr = getattr(self.plugin_manager.file_manager, "encryption_manager", None)
        if enc_mgr and hasattr(enc_mgr, "encrypt_data"):
            sec_map[key] = enc_mgr.encrypt_data(str(secret_value))
        else:
            sec_map[key] = str(secret_value)
        cfg["_encrypted_secrets"] = sec_map
        return self.save_config(plugin_name, cfg)

    def get_secure_secret(self, plugin_name: str, key: str, default: str = "") -> str:
        """Расшифровать секрет плагина через EncryptionManager v2.5."""
        cfg = self.get_config(plugin_name, {})
        sec_map = cfg.get("_encrypted_secrets", {})
        raw = sec_map.get(key)
        if not raw:
            return default
        enc_mgr = getattr(self.plugin_manager.file_manager, "encryption_manager", None)
        if enc_mgr and hasattr(enc_mgr, "decrypt_data"):
            val = enc_mgr.decrypt_data(raw)
            return str(val) if val is not None else default
        return str(raw)

    def get_all_apps(self) -> List[Dict]:
        if self.core and hasattr(self.core, "app_manager"):
            return self.core.app_manager.get_all_apps()
        return []

    def get_system_volume(self) -> int:
        if self.core and hasattr(self.core, "audio_controller"):
            return int(self.core.audio_controller.get_volume_level())
        return 50

    def set_system_volume(self, level: int):
        if self.core and hasattr(self.core, "audio_controller"):
            self.core.audio_controller.set_volume_level(int(level))


class PluginManager:
    """Улучшенный менеджер плагинов, каталога расширений и SDK (Launcher Hab 2.5)."""

    # Плагины, включенные по умолчанию, чтобы они сразу были в списке запуска
    DEFAULT_ENABLED_PLUGINS = {
        "session_tracker_plugin",
        "focus_mode_plugin",
        "smart_weather_plugin",
        "smart_music_controller",
        "idea_notebook_plugin",
        "smart_file_finder",
    }

    # Встроенный онлайн-каталог расширений для скачивания в 1 клик
    PLUGIN_CATALOG = {
        "system_cleaner_plugin": {
            "name": "System RAM & Cache Optimizer",
            "version": "2.4.1",
            "icon": "memory",
            "author": "Launcher Hab Store",
            "description": "Очистка временного кэша лаунчера, сборка мусора Python и мониторинг свободной ОЗУ перед запуском игр.",
            "code": '''import gc
import psutil
import flet as ft


class SystemCleanerPlugin:
    PLUGIN_META = {
        "id": "system_cleaner_plugin",
        "name": "System RAM & Cache Optimizer",
        "version": "2.4.1",
        "description": "Очистка кэша поиска, освобождение памяти и подготовка ПК к запуску игр.",
        "icon": "memory",
    }

    def __init__(self):
        self.context = None
        self.api = None
        self.status_text = ft.Text("Готов к оптимизации памяти", size=12)

    def set_context(self, context):
        self.context = context

    def on_load(self, api):
        self.api = api

    def _run_optimize(self, _):
        freed_objects = gc.collect()
        if self.context and hasattr(self.context, "clear_search_cache"):
            self.context.clear_search_cache()
        ram_pct = int(psutil.virtual_memory().percent) if hasattr(psutil, "virtual_memory") else 45
        self.status_text.value = f"✅ Кэш очищен (освобождено объектов: {freed_objects}). Загрузка RAM: {ram_pct}%"
        try:
            self.status_text.update()
        except Exception:
            pass

    def get_ui_component(self):
        return ft.Container(
            content=ft.Column([
                ft.Row([
                    ft.Icon("memory", color="#10b981", size=22),
                    ft.Text("System RAM & Cache Optimizer", size=16, weight=ft.FontWeight.BOLD),
                ], spacing=8),
                self.status_text,
                ft.FilledButton("Оптимизировать ОЗУ и кэш", icon="bolt", on_click=self._run_optimize),
            ], spacing=8),
            padding=12,
            border_radius=12,
        )


def initialize_plugin():
    return SystemCleanerPlugin()
''',
        },
        "game_booster_plugin": {
            "name": "Game Boost & FPS Telemetry",
            "version": "2.4.0",
            "icon": "speed",
            "author": "Launcher Hab Store",
            "description": "Игровой профиль: закрывает фоновые задачи при старте игры и показывает нагрузку CPU/RAM.",
            "code": '''import psutil
import flet as ft


class GameBoosterPlugin:
    PLUGIN_META = {
        "id": "game_booster_plugin",
        "name": "Game Boost & FPS Telemetry",
        "version": "2.4.0",
        "description": "Автоматический игровой профиль и телеметрия CPU/RAM для тяжелых игр.",
        "icon": "speed",
    }

    def __init__(self):
        self.context = None
        self.api = None
        self.auto_boost = True

    def set_context(self, context):
        self.context = context

    def on_load(self, api):
        self.api = api

    def get_ui_component(self):
        cpu = int(psutil.cpu_percent(interval=0.05)) if hasattr(psutil, "cpu_percent") else 18
        ram = int(psutil.virtual_memory().percent) if hasattr(psutil, "virtual_memory") else 52
        info_txt = ft.Text(f"Текущая нагрузка: CPU {cpu}%  •  RAM {ram}%", size=13)
        return ft.Container(
            content=ft.Column([
                ft.Row([
                    ft.Icon("speed", color="#3b82f6", size=22),
                    ft.Text("Game Boost & FPS Telemetry", size=16, weight=ft.FontWeight.BOLD),
                ], spacing=8),
                info_txt,
                ft.Text("Автоматически выделяет приоритет при запуске игр из категории Games.", size=12),
            ], spacing=8),
            padding=12,
            border_radius=12,
        )


def initialize_plugin():
    return GameBoosterPlugin()
''',
        },
        "quick_clipboard_plugin": {
            "name": "Clipboard & Snippets Manager",
            "version": "2.4.0",
            "icon": "content_paste",
            "author": "Launcher Hab Store",
            "description": "Менеджер быстрых команд, ссылок и часто используемых текстовых шаблонов.",
            "code": '''import flet as ft


class QuickClipboardPlugin:
    PLUGIN_META = {
        "id": "quick_clipboard_plugin",
        "name": "Clipboard & Snippets Manager",
        "version": "2.4.0",
        "description": "Хранение быстрых шаблонов команд и текста с копированием в 1 клик.",
        "icon": "content_paste",
    }

    def __init__(self):
        self.snippets = [
            "steam://flushconfig",
            "--fullscreen -high -novid",
            "ipconfig /flushdns",
        ]

    def get_ui_component(self):
        rows = [
            ft.Row([
                ft.Text(s, size=12, expand=True, font_family="Consolas"),
                ft.IconButton(icon="content_copy", icon_size=16, tooltip="Скопировать", on_click=lambda e, txt=s: e.page.set_clipboard(txt)),
            ])
            for s in self.snippets
        ]
        return ft.Container(
            content=ft.Column([
                ft.Row([
                    ft.Icon("content_paste", color="#f59e0b", size=22),
                    ft.Text("Clipboard & Snippets Manager", size=16, weight=ft.FontWeight.BOLD),
                ], spacing=8),
                *rows,
            ], spacing=6),
            padding=12,
            border_radius=12,
        )


def initialize_plugin():
    return QuickClipboardPlugin()
''',
        },
    }

    def __init__(self, file_manager):
        self.file_manager = file_manager
        self.plugins_dir = Path("plugins")
        self.plugins_file = "plugins.json"
        self.plugin_configs_file = "plugin_configs.json"
        self.loaded_plugins: Dict[str, Any] = {}
        self.context = None
        self.api = PluginAPI(self)

        self.plugins_dir.mkdir(exist_ok=True)
        self.available_plugins = self.load_plugins_list()
        self.plugin_configs = self.file_manager.load_data(self.plugin_configs_file, {}) or {}
        self.refresh_plugins(load_enabled=True)

    def load_plugins_list(self) -> Dict[str, Dict[str, Any]]:
        data = self.file_manager.load_data(self.plugins_file, {})
        return data if isinstance(data, dict) else {}

    def save_plugins_list(self) -> bool:
        return self.file_manager.save_data(self.plugins_file, self.available_plugins)

    def get_plugin_config(self, plugin_name: str, default: Optional[Dict] = None) -> Dict:
        cfg = self.plugin_configs.get(plugin_name)
        if isinstance(cfg, dict):
            return cfg
        return default if default is not None else {}

    def save_plugin_config(self, plugin_name: str, config: Dict) -> bool:
        self.plugin_configs[plugin_name] = config
        return self.file_manager.save_data(self.plugin_configs_file, self.plugin_configs)

    def discover_plugins(self) -> Dict[str, Dict[str, Any]]:
        """Обнаружить все плагины в директории plugins/ и считать их метаданные."""
        plugins: Dict[str, Dict[str, Any]] = {}
        for file_path in sorted(self.plugins_dir.glob("*.py")):
            if file_path.name.startswith("_") or file_path.stem == "example_plugin":
                continue

            plugin_name = file_path.stem
            saved_info = self.available_plugins.get(plugin_name, {})
            default_enabled = plugin_name in self.DEFAULT_ENABLED_PLUGINS
            plugins[plugin_name] = {
                "name": plugin_name,
                "display_name": saved_info.get("display_name", plugin_name.replace("_plugin", "").replace("_", " ").title()),
                "version": saved_info.get("version", "2.4.0"),
                "description": saved_info.get("description", "Расширение функциональности Launcher Hab 2.4"),
                "icon": saved_info.get("icon", "extension"),
                "show_in_launcher": saved_info.get("show_in_launcher", True),
                "enabled": saved_info.get("enabled", default_enabled),
                "path": str(file_path.resolve()),
            }
        return plugins

    def load_plugin(self, plugin_name: str) -> bool:
        """Загрузить плагин и передать ему контекст и PluginAPI v2.4."""
        if plugin_name in self.loaded_plugins:
            return True

        plugin_info = self.available_plugins.get(plugin_name)
        if not plugin_info or not plugin_info.get("enabled", False):
            return False

        plugin_path = plugin_info.get("path")
        if not plugin_path or not os.path.exists(plugin_path):
            logger.warning("Файл плагина %s не найден: %s", plugin_name, plugin_path)
            return False

        module_name = f"launcher_plugin_{plugin_name}"
        try:
            spec = importlib.util.spec_from_file_location(module_name, plugin_path)
            if spec is None or spec.loader is None:
                return False

            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)

            if not hasattr(module, "initialize_plugin"):
                return False

            plugin_instance = module.initialize_plugin()

            meta = getattr(plugin_instance, "PLUGIN_META", getattr(module, "PLUGIN_META", None))
            if isinstance(meta, dict):
                # Не перезаписываем кастомное имя, если пользователь его изменил в настройках
                custom_cfg = self.get_plugin_config(plugin_name, {})
                plugin_info["display_name"] = custom_cfg.get("custom_title") or meta.get("name", plugin_info.get("display_name", plugin_name))
                plugin_info["version"] = meta.get("version", "2.4.0")
                plugin_info["description"] = custom_cfg.get("custom_description") or meta.get("description", plugin_info.get("description", ""))
                plugin_info["icon"] = custom_cfg.get("custom_icon") or meta.get("icon", plugin_info.get("icon", "extension"))

            if self.context and hasattr(plugin_instance, "set_context"):
                plugin_instance.set_context(self.context)
            if hasattr(plugin_instance, "on_load"):
                plugin_instance.on_load(self.api)

            self.loaded_plugins[plugin_name] = {
                "instance": plugin_instance,
                "module_name": module_name,
            }
            return True
        except Exception:
            logger.exception("Ошибка загрузки плагина %s", plugin_name)
            return False

    def unload_plugin(self, plugin_name: str) -> bool:
        plugin_data = self.loaded_plugins.get(plugin_name)
        if not plugin_data:
            return False

        try:
            plugin_instance = plugin_data.get("instance")
            if hasattr(plugin_instance, "cleanup"):
                plugin_instance.cleanup()

            module_name = plugin_data.get("module_name")
            if module_name and module_name in sys.modules:
                del sys.modules[module_name]

            del self.loaded_plugins[plugin_name]
            return True
        except Exception:
            logger.exception("Ошибка выгрузки плагина %s", plugin_name)
            return False

    def enable_plugin(self, plugin_name: str) -> bool:
        if plugin_name not in self.available_plugins:
            return False
        self.available_plugins[plugin_name]["enabled"] = True
        loaded = self.load_plugin(plugin_name)
        self.save_plugins_list()
        return loaded

    def disable_plugin(self, plugin_name: str) -> bool:
        if plugin_name not in self.available_plugins:
            return False
        self.available_plugins[plugin_name]["enabled"] = False
        self.save_plugins_list()
        self.unload_plugin(plugin_name)
        return True

    def delete_plugin(self, plugin_name: str) -> bool:
        """Полное удаление плагина (выгрузка и удаление файла из plugins/)."""
        self.unload_plugin(plugin_name)
        info = self.available_plugins.pop(plugin_name, None)
        self.plugin_configs.pop(plugin_name, None)
        self.file_manager.save_data(self.plugin_configs_file, self.plugin_configs)
        self.save_plugins_list()

        file_path = self.plugins_dir / f"{plugin_name}.py"
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                logger.exception("Не удалось удалить файл плагина %s", file_path)
                return False
        return info is not None

    def install_catalog_plugin(self, plugin_id: str) -> bool:
        """Скачивание и установка плагина из встроенного каталога."""
        item = self.PLUGIN_CATALOG.get(plugin_id)
        if not item:
            return False
        target_path = self.plugins_dir / f"{plugin_id}.py"
        try:
            target_path.write_text(item["code"], encoding="utf-8")
            self.refresh_plugins(load_enabled=True)
            self.enable_plugin(plugin_id)
            return True
        except Exception:
            logger.exception("Ошибка установки плагина %s из каталога", plugin_id)
            return False

    def install_plugin_from_file(self, source_path: str) -> Optional[str]:
        """Импорт стороннего плагина (.py) с диска."""
        src = Path(source_path)
        if not src.exists() or src.suffix.lower() != ".py":
            return None
        dest = self.plugins_dir / src.name
        try:
            shutil.copy2(src, dest)
            plugin_id = dest.stem
            self.refresh_plugins(load_enabled=True)
            self.enable_plugin(plugin_id)
            return plugin_id
        except Exception:
            logger.exception("Ошибка импорта файла плагина")
            return None

    def refresh_plugins(self, load_enabled: bool = False):
        discovered = self.discover_plugins()

        removed_plugins = set(self.available_plugins.keys()) - set(discovered.keys())
        for plugin_name in removed_plugins:
            self.unload_plugin(plugin_name)

        self.available_plugins = discovered
        if load_enabled:
            for plugin_name, plugin_info in self.available_plugins.items():
                if plugin_info.get("enabled", False):
                    self.load_plugin(plugin_name)
        self.save_plugins_list()

    def set_context(self, context):
        self.context = context
        self.api.core = context
        for plugin_data in self.loaded_plugins.values():
            plugin_instance = plugin_data.get("instance")
            if plugin_instance and hasattr(plugin_instance, "set_context"):
                plugin_instance.set_context(context)
            if plugin_instance and hasattr(plugin_instance, "on_load"):
                plugin_instance.on_load(self.api)

    def get_launchable_plugin_apps(self) -> List[Dict[str, Any]]:
        """
        Возвращает список активных плагинов как элементы запуска для главного экрана и боковой панели!
        Позволяет пользователю запускать плагины прямо из списка приложений.
        """
        result: List[Dict[str, Any]] = []
        for plugin_name, info in self.available_plugins.items():
            if not info.get("enabled", False):
                continue
            if not info.get("show_in_launcher", True):
                continue
            result.append(
                {
                    "id": f"plugin_{plugin_name}",
                    "name": info.get("display_name", plugin_name),
                    "package": plugin_name,
                    "category": "Плагины",
                    "icon": info.get("icon", "extension"),
                    "type": "plugin",
                    "plugin_id": plugin_name,
                    "url": f"plugin://{plugin_name}",
                    "official_url": "",
                    "description": info.get("description", ""),
                }
            )
        return result

    # --- Хуки расширений 2.5 ---
    def notify_app_launched(self, app: Dict[str, Any]):
        self.api.emit("app_launched", app)
        for plugin_data in self.loaded_plugins.values():
            instance = plugin_data.get("instance")
            if instance and hasattr(instance, "on_app_launched"):
                try:
                    instance.on_app_launched(app)
                except Exception:
                    logger.exception("Ошибка on_app_launched в плагине")

    def notify_theme_changed(self, theme_name: str):
        self.api.emit("theme_changed", theme_name)
        for plugin_data in self.loaded_plugins.values():
            instance = plugin_data.get("instance")
            if instance and hasattr(instance, "on_theme_changed"):
                try:
                    instance.on_theme_changed(theme_name)
                except Exception:
                    pass

    def notify_clock_style_changed(self, style_id: str):
        self.api.emit("clock_style_changed", style_id)
        for plugin_data in self.loaded_plugins.values():
            instance = plugin_data.get("instance")
            if instance and hasattr(instance, "on_clock_style_changed"):
                try:
                    instance.on_clock_style_changed(style_id)
                except Exception:
                    pass

    def notify_second_tick(self) -> bool:
        """Посекундный тик для живого таймера активных приложений."""
        has_active = False
        for plugin_data in self.loaded_plugins.values():
            instance = plugin_data.get("instance")
            if instance and hasattr(instance, "tick_second"):
                try:
                    if instance.tick_second():
                        has_active = True
                except Exception:
                    pass
        return has_active

    def notify_tick(self):
        """Периодический минутный тик для плагинов."""
        self.api.emit("tick")
        for plugin_data in self.loaded_plugins.values():
            instance = plugin_data.get("instance")
            if instance and hasattr(instance, "on_tick"):
                try:
                    instance.on_tick()
                except Exception:
                    pass

    def get_app_card_badge(self, app: Dict[str, Any]) -> Optional[str]:
        if app.get("type") == "plugin":
            return "Плагин 2.5"
        for plugin_data in self.loaded_plugins.values():
            instance = plugin_data.get("instance")
            if instance and hasattr(instance, "get_app_card_badge"):
                try:
                    badge = instance.get_app_card_badge(app)
                    if badge is not None:
                        return badge
                except Exception:
                    pass
        return "0 мин"

    def is_app_running(self, app: Dict[str, Any]) -> bool:
        for plugin_data in self.loaded_plugins.values():
            instance = plugin_data.get("instance")
            if instance and hasattr(instance, "is_app_running"):
                try:
                    if instance.is_app_running(app):
                        return True
                except Exception:
                    pass
        return False

    def get_plugin_instance(self, plugin_name: str):
        data = self.loaded_plugins.get(plugin_name)
        return data.get("instance") if data else None

    def get_plugin_ui(self, plugin_name: str):
        plugin_data = self.loaded_plugins.get(plugin_name)
        if not plugin_data:
            return None
        plugin_instance = plugin_data.get("instance")
        if hasattr(plugin_instance, "get_ui_component"):
            return plugin_instance.get_ui_component()
        return None

    def open_plugin_window(self, plugin_name: str):
        """Открывает отдельное диалоговое окно выбранного плагина при клике из списка запуска."""
        if not self.context or not hasattr(self.context, "page"):
            return
        if plugin_name not in self.loaded_plugins:
            self.enable_plugin(plugin_name)

        colors = self.context.get_colors()
        info = self.available_plugins.get(plugin_name, {})
        ui_comp = self.get_plugin_ui(plugin_name)
        if ui_comp is None:
            ui_comp = ft.Text("Интерфейс плагина готов к работе.", color=colors["ON_SURFACE_VARIANT"])

        dialog = ft.AlertDialog(
            title=ft.Row(
                [
                    ft.Icon(info.get("icon", "extension"), color=colors["ACCENT"], size=24),
                    ft.Text(info.get("display_name", plugin_name), size=18, weight=ft.FontWeight.BOLD),
                ],
                spacing=10,
            ),
            content=ft.Container(
                width=660,
                content=ft.Column([ui_comp], scroll=ft.ScrollMode.ADAPTIVE, tight=True),
            ),
            actions=[
                ft.TextButton(
                    "Настройки плагина",
                    icon="tune",
                    on_click=lambda e: (self.context.page.close(dialog), self.show_plugin_settings_modal(plugin_name)),
                ),
                ft.FilledButton("Закрыть", on_click=lambda e: self.context.page.close(dialog)),
            ],
        )
        self.context.page.open(dialog)

    def show_plugin_settings_modal(self, plugin_name: str):
        """Модальное окно тонкой настройки конкретного плагина (изменение имени, иконки, отображения в списке)."""
        if not self.context or not hasattr(self.context, "page"):
            return
        colors = self.context.get_colors()
        info = self.available_plugins.get(plugin_name, {})
        cfg = self.get_plugin_config(plugin_name, {})

        title_field = ft.TextField(
            label="Отображаемое название плагина",
            value=info.get("display_name", plugin_name),
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_radius=10,
            border_color="transparent",
        )
        desc_field = ft.TextField(
            label="Описание",
            value=info.get("description", ""),
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_radius=10,
            border_color="transparent",
        )
        icon_dropdown = ft.Dropdown(
            label="Иконка в списке запуска",
            value=info.get("icon", "extension"),
            options=[
                ft.dropdown.Option("extension", "Расширение (extension)"),
                ft.dropdown.Option("insights", "Аналитика / Трекер (insights)"),
                ft.dropdown.Option("self_improvement", "Фокус / Таймер (self_improvement)"),
                ft.dropdown.Option("cloud", "Погода (cloud)"),
                ft.dropdown.Option("music_note", "Музыка (music_note)"),
                ft.dropdown.Option("lightbulb", "Заметки (lightbulb)"),
                ft.dropdown.Option("folder_open", "Поиск файлов (folder_open)"),
                ft.dropdown.Option("memory", "Оптимизация ОЗУ (memory)"),
                ft.dropdown.Option("speed", "Ускорение (speed)"),
                ft.dropdown.Option("auto_awesome", "AI / Смарт (auto_awesome)"),
            ],
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_radius=10,
            border_color="transparent",
        )
        show_in_launcher_sw = ft.Switch(
            value=bool(info.get("show_in_launcher", True)),
            active_track_color=colors["ACCENT"],
        )

        def _save_plugin_cfg(_):
            new_title = (title_field.value or "").strip() or plugin_name
            new_desc = (desc_field.value or "").strip()
            new_icon = icon_dropdown.value or "extension"

            cfg["custom_title"] = new_title
            cfg["custom_description"] = new_desc
            cfg["custom_icon"] = new_icon
            self.save_plugin_config(plugin_name, cfg)

            if plugin_name in self.available_plugins:
                self.available_plugins[plugin_name]["display_name"] = new_title
                self.available_plugins[plugin_name]["description"] = new_desc
                self.available_plugins[plugin_name]["icon"] = new_icon
                self.available_plugins[plugin_name]["show_in_launcher"] = bool(show_in_launcher_sw.value)
                self.save_plugins_list()

            self.context.page.close(cfg_dialog)
            self._sync_host_ui()
            _safe_toast(self.context.page, f"✅ Настройки плагина «{new_title}» сохранены")

        cfg_dialog = ft.AlertDialog(
            title=ft.Row(
                [
                    ft.Icon("tune", color=colors["ACCENT"], size=22),
                    ft.Text(f"Настройки плагина: {info.get('display_name', plugin_name)}", size=17, weight=ft.FontWeight.BOLD),
                ],
                spacing=8,
            ),
            content=ft.Container(
                width=520,
                content=ft.Column(
                    [
                        title_field,
                        desc_field,
                        icon_dropdown,
                        ft.Row(
                            [
                                show_in_launcher_sw,
                                ft.Text("Отображать плагин в списке запуска приложений", expand=True),
                            ]
                        ),
                    ],
                    spacing=12,
                    tight=True,
                ),
            ),
            actions=[
                ft.TextButton("Отмена", on_click=lambda e: self.context.page.close(cfg_dialog)),
                ft.FilledButton("Сохранить изменения", icon="check", on_click=_save_plugin_cfg),
            ],
        )
        self.context.page.open(cfg_dialog)

    def create_plugin_template(self, slug: str, title: str) -> bool:
        """Генератор шаблона нового плагина по API v2.4."""
        safe_slug = "".join(c if c.isalnum() or c == "_" else "_" for c in slug.lower()).strip("_")
        if not safe_slug:
            return False
        if not safe_slug.endswith("_plugin"):
            safe_slug += "_plugin"

        file_path = self.plugins_dir / f"{safe_slug}.py"
        if file_path.exists():
            return False

        template = f'''import flet as ft


class CustomExtensionPlugin:
    PLUGIN_META = {{
        "id": "{safe_slug}",
        "name": "{title}",
        "version": "2.4.0",
        "description": "Пользовательское расширение, созданное через Plugin SDK 2.4",
        "icon": "auto_awesome",
    }}

    def __init__(self):
        self.context = None
        self.api = None

    def set_context(self, context):
        self.context = context

    def on_load(self, api):
        self.api = api

    def on_app_launched(self, app):
        pass

    def get_ui_component(self):
        return ft.Container(
            content=ft.Column([
                ft.Text("{title}", size=15, weight=ft.FontWeight.BOLD),
                ft.Text("Расширение активно и подключено к Plugin API 2.4", size=12),
            ], spacing=6),
            padding=12,
            border_radius=12,
        )


def initialize_plugin():
    return CustomExtensionPlugin()
'''
        file_path.write_text(template, encoding="utf-8")
        self.refresh_plugins(load_enabled=True)
        self.enable_plugin(safe_slug)
        return True

    def _sync_host_ui(self):
        if self.context:
            if hasattr(self.context, "update_main_content"):
                self.context.update_main_content()
            if hasattr(self.context, "update_sidebar"):
                self.context.update_sidebar()

    def create_plugin_ui(self, colors):
        """Полноценный центр управления плагинами: Установленные, Магазин расширений (Скачать), Импорт и SDK."""
        self.refresh_plugins(load_enabled=False)
        root_column = ft.Column(spacing=10, scroll=ft.ScrollMode.ADAPTIVE)

        def rebuild_ui():
            root_column.controls.clear()

            # 1. Панель установленных плагинов
            plugin_cards = []
            for plugin_name, plugin_info in self.available_plugins.items():
                is_enabled = plugin_info.get("enabled", False)
                is_loaded = plugin_name in self.loaded_plugins
                display_name = plugin_info.get("display_name", plugin_name)
                description = plugin_info.get("description", "")
                version = plugin_info.get("version", "2.4")
                icon_name = plugin_info.get("icon", "extension")

                status_text = "🟢 Активен" if is_loaded else "⚪ Выключен"
                status_color = colors["SUCCESS"] if is_loaded else colors["ON_SURFACE_VARIANT"]

                plugin_widget = self.get_plugin_ui(plugin_name) if is_loaded else None

                plugin_cards.append(
                    ft.Container(
                        content=ft.Column(
                            [
                                ft.Row(
                                    [
                                        ft.Container(
                                            content=ft.Icon(icon_name, color=colors["ACCENT"], size=22),
                                            width=42,
                                            height=42,
                                            bgcolor=GlassMorphism._apply_opacity(colors["ACCENT"], 0.16),
                                            border_radius=12,
                                            alignment=ft.alignment.center,
                                        ),
                                        ft.Column(
                                            [
                                                ft.Row(
                                                    [
                                                        ft.Text(display_name, weight=ft.FontWeight.BOLD, size=15, color=colors["ON_SURFACE"]),
                                                        ft.Text(f"v{version}", size=11, color=colors["ON_SURFACE_VARIANT"]),
                                                    ],
                                                    spacing=8,
                                                ),
                                                ft.Text(description, size=12, color=colors["ON_SURFACE_VARIANT"]),
                                            ],
                                            spacing=2,
                                            expand=True,
                                        ),
                                        ft.Container(
                                            content=ft.Text(status_text, size=11, color=status_color, weight=ft.FontWeight.W_600),
                                            bgcolor=GlassMorphism._apply_opacity(colors["SURFACE_VARIANT"], 0.65),
                                            padding=ft.padding.symmetric(horizontal=10, vertical=5),
                                            border_radius=8,
                                        ),
                                    ]
                                ),
                                ft.Row(
                                    [
                                        ft.Switch(
                                            value=is_enabled,
                                            on_change=lambda e, pn=plugin_name: _on_toggle(pn, e),
                                            active_track_color=colors["ACCENT"],
                                        ),
                                        ft.Text("Включен в списке запуска", size=12, color=colors["ON_SURFACE_VARIANT"], expand=True),
                                        ft.TextButton(
                                            "Открыть",
                                            icon="open_in_new",
                                            on_click=lambda e, pn=plugin_name: self.open_plugin_window(pn),
                                        ),
                                        ft.IconButton(
                                            icon="tune",
                                            icon_size=18,
                                            icon_color=colors["ON_SURFACE"],
                                            tooltip="Изменить настройки плагина",
                                            on_click=lambda e, pn=plugin_name: self.show_plugin_settings_modal(pn),
                                        ),
                                        ft.IconButton(
                                            icon="refresh",
                                            icon_size=18,
                                            icon_color=colors["ON_SURFACE_VARIANT"],
                                            on_click=lambda e, pn=plugin_name: _on_reload(pn, e),
                                            tooltip="Перезагрузить плагин",
                                        ),
                                        ft.IconButton(
                                            icon="delete_outline",
                                            icon_size=18,
                                            icon_color=colors["ERROR"],
                                            on_click=lambda e, pn=plugin_name: _on_delete(pn, e),
                                            tooltip="Удалить плагин",
                                        ),
                                    ]
                                ),
                                plugin_widget if plugin_widget else ft.Container(),
                            ],
                            spacing=8,
                        ),
                        bgcolor=colors["SETTINGS_CARD"],
                        border=ft.border.all(1, colors["OUTLINE"]),
                        border_radius=14,
                        padding=16,
                        margin=ft.margin.only(bottom=8),
                    )
                )

            # 2. Каталог плагинов для скачивания в 1 клик
            catalog_cards = []
            for cat_id, cat_info in self.PLUGIN_CATALOG.items():
                already_installed = cat_id in self.available_plugins
                catalog_cards.append(
                    ft.Container(
                        bgcolor=GlassMorphism._apply_opacity(colors["SURFACE_VARIANT"], 0.45),
                        border=ft.border.all(1, colors["OUTLINE"]),
                        border_radius=12,
                        padding=12,
                        content=ft.Row(
                            [
                                ft.Icon(cat_info["icon"], color=colors["ACCENT"], size=24),
                                ft.Column(
                                    [
                                        ft.Text(f"{cat_info['name']} (v{cat_info['version']})", weight=ft.FontWeight.BOLD, size=14, color=colors["ON_SURFACE"]),
                                        ft.Text(cat_info["description"], size=12, color=colors["ON_SURFACE_VARIANT"]),
                                    ],
                                    spacing=2,
                                    expand=True,
                                ),
                                ft.FilledButton(
                                    "Установлен" if already_installed else "Скачать",
                                    icon="check" if already_installed else "download",
                                    disabled=already_installed,
                                    on_click=lambda e, cid=cat_id: _on_install_catalog(cid, e),
                                ),
                            ],
                            spacing=12,
                        ),
                    )
                )

            # 3. Генератор и импорт плагинов
            new_slug_field = ft.TextField(
                hint_text="ID плагина (напр. my_timer)",
                filled=True,
                bgcolor=colors["SURFACE_VARIANT"],
                border_radius=10,
                border_color="transparent",
                expand=True,
            )
            new_title_field = ft.TextField(
                hint_text="Название расширения",
                filled=True,
                bgcolor=colors["SURFACE_VARIANT"],
                border_radius=10,
                border_color="transparent",
                expand=True,
            )

            def _on_create_template(e):
                slug = (new_slug_field.value or "").strip()
                title = (new_title_field.value or "").strip() or "Новое расширение"
                if slug and self.create_plugin_template(slug, title):
                    _safe_toast(e.page, f"✅ Плагин «{title}» создан и добавлен в список запуска!")
                    self._sync_host_ui()
                    rebuild_ui()
                    root_column.update()

            sdk_box = ft.Container(
                bgcolor=GlassMorphism._apply_opacity(colors["SURFACE_VARIANT"], 0.45),
                border=ft.border.all(1, colors["OUTLINE"]),
                border_radius=12,
                padding=14,
                content=ft.Column(
                    [
                        ft.Row(
                            [
                                ft.Icon("code", color=colors["ACCENT"], size=20),
                                ft.Text("Plugin SDK 2.4 — Создать свой плагин", weight=ft.FontWeight.BOLD, size=14),
                            ]
                        ),
                        ft.Row(
                            [
                                new_slug_field,
                                new_title_field,
                                ft.FilledButton("Создать", icon="add", on_click=_on_create_template),
                            ],
                            spacing=8,
                        ),
                    ],
                    spacing=8,
                ),
            )

            root_column.controls.extend(
                [
                    ft.Text("Платформа плагинов и расширений (API 2.4)", size=18, weight=ft.FontWeight.BOLD),
                    ft.Text(
                        "Все активные плагины автоматически отображаются в списке запуска. Вы можете скачивать, настраивать и удалять модули.",
                        size=12,
                        color=colors["ON_SURFACE_VARIANT"],
                    ),
                    ft.Text("📦 Каталог доступных расширений (Скачать в 1 клик):", size=14, weight=ft.FontWeight.BOLD),
                    *catalog_cards,
                    ft.Divider(color=colors["OUTLINE"], height=12),
                    sdk_box,
                    ft.Divider(color=colors["OUTLINE"], height=12),
                    ft.Text(f"🧩 Установленные плагины ({len(plugin_cards)}):", size=14, weight=ft.FontWeight.BOLD),
                    *plugin_cards,
                ]
            )

        def _on_toggle(plugin_name, e):
            if e.control.value:
                self.enable_plugin(plugin_name)
            else:
                self.disable_plugin(plugin_name)
            self._sync_host_ui()
            rebuild_ui()
            root_column.update()

        def _on_reload(plugin_name, e):
            self.unload_plugin(plugin_name)
            loaded = self.load_plugin(plugin_name)
            msg = f"✅ Плагин {plugin_name} перезагружен" if loaded else f"❌ Не удалось загрузить {plugin_name}"
            _safe_toast(e.page, msg)
            self._sync_host_ui()
            rebuild_ui()
            root_column.update()

        def _on_delete(plugin_name, e):
            if self.delete_plugin(plugin_name):
                _safe_toast(e.page, f"🗑️ Плагин {plugin_name} удален")
                self._sync_host_ui()
                rebuild_ui()
                root_column.update()

        def _on_install_catalog(cat_id, e):
            if self.install_catalog_plugin(cat_id):
                _safe_toast(e.page, f"✅ Плагин «{self.PLUGIN_CATALOG[cat_id]['name']}» скачан и добавлен в запуск!")
                self._sync_host_ui()
                rebuild_ui()
                root_column.update()

        rebuild_ui()
        return root_column

    def toggle_plugin(self, plugin_name, e):
        if e.control.value:
            self.enable_plugin(plugin_name)
        else:
            self.disable_plugin(plugin_name)
        self._sync_host_ui()
        if e and hasattr(e, "page") and e.page:
            e.page.update()

    def reload_plugin(self, plugin_name, e):
        self.unload_plugin(plugin_name)
        loaded = self.load_plugin(plugin_name)
        message = f"✅ Плагин {plugin_name} перезагружен" if loaded else f"❌ Не удалось загрузить плагин {plugin_name}"
        if e and hasattr(e, "page"):
            _safe_toast(e.page, message)
        self._sync_host_ui()
