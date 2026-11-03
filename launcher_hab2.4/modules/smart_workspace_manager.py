import os
import subprocess
import sys
from typing import Dict, List

from .logger import get_logger

logger = get_logger(__name__)


class SmartWorkspaceManager:
    """Управление пресетами умных рабочих пространств."""

    def __init__(self, file_manager, app_manager):
        self.file_manager = file_manager
        self.app_manager = app_manager
        self.file_name = "smart_workspaces.json"
        self.hotkeys_file = "workspace_hotkeys.json"
        self.presets = self._load_presets()
        self.hotkeys = self.file_manager.load_data(self.hotkeys_file, {}) or {}

    def _default_presets(self) -> List[Dict]:
        return [
            {
                "id": "gaming",
                "name": "Игровой режим",
                "close_processes": ["chrome", "browser", "discordcanary"],
                "launch_apps": ["discord", "steam"],
            },
            {
                "id": "dev",
                "name": "Режим разработчика",
                "close_processes": [],
                "launch_apps": ["code", "git-bash", "cmd"],
            },
            {
                "id": "focus",
                "name": "Фокус",
                "close_processes": ["discord", "steam"],
                "launch_apps": ["code", "notion"],
            },
        ]

    def _load_presets(self) -> List[Dict]:
        data = self.file_manager.load_data(self.file_name, None)
        if isinstance(data, list) and data:
            return data
        presets = self._default_presets()
        self.file_manager.save_data(self.file_name, presets)
        return presets

    def save_presets(self):
        self.file_manager.save_data(self.file_name, self.presets)
        self.file_manager.save_data(self.hotkeys_file, self.hotkeys)

    def set_hotkey(self, preset_id: str, combo: str):
        self.hotkeys[preset_id] = combo.lower().strip()
        self.save_presets()

    def add_preset(self, preset: Dict):
        self.presets.append(preset)
        self.save_presets()

    def update_preset(self, preset_id: str, updates: Dict):
        for preset in self.presets:
            if preset.get("id") == preset_id:
                preset.update(updates)
                self.save_presets()
                return True
        return False

    def delete_preset(self, preset_id: str):
        self.presets = [p for p in self.presets if p.get("id") != preset_id]
        if preset_id in self.hotkeys:
            del self.hotkeys[preset_id]
        self.save_presets()

    def _kill_process(self, process_name: str):
        try:
            if sys.platform == "win32":
                subprocess.run(["taskkill", "/F", "/IM", f"{process_name}.exe"], capture_output=True)
            else:
                subprocess.run(["pkill", "-f", process_name], capture_output=True)
            logger.info("Процесс завершён: %s", process_name)
        except Exception:
            logger.exception("Не удалось завершить процесс: %s", process_name)

    def _launch_by_key(self, app_key: str):
        app_key = app_key.lower().strip()
        all_apps = self.app_manager.all_apps + self.app_manager.custom_apps + self.app_manager.favorite_apps

        for app in all_apps:
            package = str(app.get("package", "")).lower()
            name = str(app.get("name", "")).lower()
            if app_key in {package, name}:
                self.app_manager.launch_app(app)
                logger.info("Запуск из workspace: %s", app.get("name"))
                return True

        # fallback: запустить как команду
        try:
            if sys.platform == "win32":
                os.system(f"start {app_key}")
            else:
                subprocess.Popen([app_key])
            logger.info("Запуск команды workspace: %s", app_key)
            return True
        except Exception:
            logger.exception("Не удалось запустить: %s", app_key)
            return False

    def run_preset(self, preset_id: str) -> Dict:
        preset = next((p for p in self.presets if p.get("id") == preset_id), None)
        if not preset:
            return {"success": False, "message": "Пресет не найден"}

        for proc in preset.get("close_processes", []):
            self._kill_process(proc)

        launched = 0
        for app_key in preset.get("launch_apps", []):
            if self._launch_by_key(app_key):
                launched += 1

        return {
            "success": True,
            "message": f"Пресет '{preset.get('name', preset_id)}' применён. Запущено: {launched}",
        }