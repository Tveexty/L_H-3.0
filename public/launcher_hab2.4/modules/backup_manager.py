# [file name]: backup_manager.py
import os
import zipfile
import shutil
from datetime import datetime


class BackupManager:
    """Менеджер резервного копирования и восстановления настроек"""

    def __init__(self, file_manager):
        self.file_manager = file_manager
        self.backup_dir = "backups"
        self.ensure_backup_dir()

    def ensure_backup_dir(self):
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir)

    def create_backup(self, include_data: bool = True) -> str:
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"launcher_backup_{timestamp}.zip"
            backup_path = os.path.join(self.backup_dir, backup_filename)

            settings_files = [
                "launcher_settings.json",
                "favorites.json",
                "manual_paths.json",
                "custom_apps.json",
                "custom_themes.json",
                "app_tags.json",
                "custom_hotkeys.json",
                "plugins.json",
                "search_history.json",
            ]

            with zipfile.ZipFile(backup_path, "w", zipfile.ZIP_DEFLATED) as zipf:
                for file in settings_files:
                    if os.path.exists(file):
                        zipf.write(file, f"settings/{file}")

                if include_data and os.path.exists("plugins"):
                    for root, _, files in os.walk("plugins"):
                        for file in files:
                            if file.endswith((".json", ".py", ".txt", ".md")):
                                file_path = os.path.join(root, file)
                                arcname = os.path.relpath(file_path, ".")
                                zipf.write(file_path, arcname)

            return backup_path
        except Exception as e:
            print(f"Ошибка создания резервной копии: {e}")
            return None

    def restore_backup(self, backup_path: str) -> bool:
        temp_dir = "temp_restore"
        try:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)

            with zipfile.ZipFile(backup_path, "r") as zipf:
                zipf.extractall(temp_dir)

            settings_dir = os.path.join(temp_dir, "settings")
            if os.path.exists(settings_dir):
                for file in os.listdir(settings_dir):
                    src_path = os.path.join(settings_dir, file)
                    if os.path.isfile(src_path):
                        shutil.copy2(src_path, file)

            restored_plugins = os.path.join(temp_dir, "plugins")
            if os.path.exists(restored_plugins):
                if os.path.exists("plugins"):
                    shutil.rmtree("plugins")
                shutil.copytree(restored_plugins, "plugins")
            return True
        except Exception as e:
            print(f"Ошибка восстановления бэкапа: {e}")
            return False
        finally:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)

    def get_backup_list(self) -> list:
        backups = []
        if os.path.exists(self.backup_dir):
            for file in os.listdir(self.backup_dir):
                if file.endswith('.zip') and file.startswith('launcher_backup_'):
                    file_path = os.path.join(self.backup_dir, file)
                    stat = os.stat(file_path)
                    backups.append({
                        'filename': file,
                        'path': file_path,
                        'size': stat.st_size,
                        'created': datetime.fromtimestamp(stat.st_ctime),
                        'modified': datetime.fromtimestamp(stat.st_mtime)
                    })

        backups.sort(key=lambda x: x['created'], reverse=True)
        return backups

    def delete_backup(self, backup_filename: str) -> bool:
        try:
            backup_path = os.path.join(self.backup_dir, backup_filename)
            if os.path.exists(backup_path):
                os.remove(backup_path)
                return True
        except Exception as e:
            print(f"Ошибка удаления резервной копии: {e}")
        return False

    def auto_backup(self):
        try:
            today = datetime.now().strftime("%Y%m%d")
            for backup in self.get_backup_list():
                if backup['created'].strftime("%Y%m%d") == today:
                    return
            self.create_backup()
        except Exception as e:
            print(f"Ошибка автоматического резервного копирования: {e}")