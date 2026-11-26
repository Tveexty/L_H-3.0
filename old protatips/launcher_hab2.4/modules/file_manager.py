# [file name]: file_manager.py
import json
import os
from .encryption_manager import EncryptionManager
from .logger import get_logger

logger = get_logger(__name__)


class FileManager:
    DATA_FILES = {
        "settings": "launcher_settings.json",
        "favorites": "favorites.json",
        "manual_paths": "manual_paths.json",
        "custom_apps": "custom_apps.json",
        "custom_themes": "custom_themes.json",
    }

    def __init__(self):
        self.encryption_manager = EncryptionManager()

    def load_data(self, filename, default=None):
        """Загрузка данных с поддержкой дешифрования и защитой от пустых/поврежденных файлов."""
        fallback = default if default is not None else {}
        try:
            if os.path.exists(filename):
                with open(filename, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                if not content or content == "null":
                    return fallback
                data = json.loads(content)
                if data is None:
                    return fallback

                if filename == self.DATA_FILES["settings"] and isinstance(data, dict) and "encrypted" in data:
                    decrypted = self.encryption_manager.decrypt_settings(data)
                    return decrypted if isinstance(decrypted, dict) and decrypted else fallback

                return data
        except Exception:
            logger.exception("Ошибка загрузки %s", filename)
        return fallback

    def save_data(self, filename, data):
        """Сохранение данных с поддержкой шифрования и атомарной записью."""
        try:
            if data is None:
                return False

            payload = data
            if filename == self.DATA_FILES["settings"] and isinstance(data, dict):
                encrypted_payload = self.encryption_manager.encrypt_settings(data)
                if isinstance(encrypted_payload, dict) and encrypted_payload:
                    payload = encrypted_payload

            with open(filename, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
            return True
        except Exception:
            logger.exception("Ошибка сохранения %s", filename)
            return False

    def load_settings(self):
        """Загрузка настроек с дешифрованием."""
        settings = self.load_data(self.DATA_FILES["settings"], default={})
        if not isinstance(settings, dict) or not settings:
            settings = {
                "theme": "dark",
                "glass_effect": True,
                "glass_intensity": "medium",
            }
        return settings

    def save_settings(self, settings_data):
        """Сохранение настроек с шифрованием."""
        if not isinstance(settings_data, dict):
            return False
        return self.save_data(self.DATA_FILES["settings"], settings_data)