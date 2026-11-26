# [file name]: app_manager.py
import os
import subprocess
import sys
import webbrowser
try:
    import winreg
except ImportError:
    winreg = None
import uuid
from .file_manager import FileManager

class AppManager:
    def __init__(self):
        self.file_manager = FileManager()
        self.all_apps = self.load_base_apps()
        self.custom_apps = self.file_manager.load_data('custom_apps.json', [])
        self.favorite_apps = self.file_manager.load_data('favorites.json', [])
        self.manual_paths = self.file_manager.load_data('manual_paths.json', {})
        
        # Загружаем теги и заметки для приложений
        self.app_tags = self.file_manager.load_data('app_tags.json', {})
        
        # Если избранные не загружены, используем стандартные
        if not self.favorite_apps:
            self.favorite_apps = [
                {"name": "Steam", "package": "steam", "category": "Games", "icon": "sports_esports", "url": "steam://", "type": "app", "official_url": "https://store.steampowered.com/about/", "id": str(uuid.uuid4())},
                {"name": "Chrome", "package": "chrome", "category": "Browser", "icon": "web", "url": "https://google.com", "type": "web", "official_url": "https://www.google.com/chrome/", "id": str(uuid.uuid4())},
                {"name": "Telegram", "package": "telegram", "category": "Social", "icon": "chat", "url": "tg://", "type": "app", "official_url": "https://desktop.telegram.org/", "id": str(uuid.uuid4())},
                {"name": "VK", "package": "vk", "category": "Social", "icon": "groups", "url": "https://vk.com", "type": "web", "official_url": "https://vk.com", "id": str(uuid.uuid4())},
            ]
            self.save_favorites()
        
        # Добавляем уникальные ID к существующим избранным если их нет
        for fav in self.favorite_apps:
            if "id" not in fav:
                fav["id"] = str(uuid.uuid4())
        self.save_favorites()
    
    def is_duplicate_favorite(self, app):
        """Проверяет, является ли приложение дубликатом в избранном"""
        for favorite in self.favorite_apps:
            if (favorite["name"] == app["name"] and 
                favorite["url"] == app["url"] and 
                favorite["type"] == app["type"]):
                return True
        return False
    
    def get_similar_favorites(self, app):
        """Находит похожие приложения в избранном"""
        similar = []
        for favorite in self.favorite_apps:
            if (favorite["name"] == app["name"] or 
                favorite["url"] == app["url"]):
                similar.append(favorite)
        return similar
    
    def add_to_favorites(self, app):
        """Добавить приложение в избранное"""
        if len(self.favorite_apps) >= 10:
            return False, "Максимум 10 приложений в избранном"
        
        # Проверяем на полное дублирование
        if self.is_duplicate_favorite(app):
            return False, "Это приложение уже в избранном"
        
        # Создаем копию приложения с уникальным ID
        favorite_app = app.copy()
        favorite_app["id"] = str(uuid.uuid4())
        
        # Добавляем в избранное
        self.favorite_apps.append(favorite_app)
        self.save_favorites()
        return True, f"{app['name']} добавлено в избранное"
    
    def remove_from_favorites_by_id(self, favorite_id):
        """Удалить приложение из избранного по ID"""
        for favorite in self.favorite_apps:
            if favorite.get("id") == favorite_id:
                self.favorite_apps.remove(favorite)
                self.save_favorites()
                return True, f"{favorite['name']} удалено из избранного"
        return False, "Не найдено в избранном"
    
    def remove_from_favorites(self, app):
        """Удалить приложение из избранного (совместимость со старым кодом)"""
        # Используем ID если есть, иначе ищем по содержимому
        if "id" in app:
            return self.remove_from_favorites_by_id(app["id"])
        else:
            if app in self.favorite_apps:
                self.favorite_apps.remove(app)
                self.save_favorites()
                return True, f"{app['name']} удалено из избранного"
        return False, "Не найдено в избранном"

    def get_app_tags(self, app):
        """Получить теги и заметки для приложения"""
        package = app["package"]
        if package in self.app_tags:
            return self.app_tags[package]
        return {"tags": "", "notes": ""}
    
    def save_app_tags(self, app, tags, notes):
        """Сохранить теги и заметки для приложения"""
        package = app["package"]
        self.app_tags[package] = {
            "tags": tags,
            "notes": notes
        }
        self.file_manager.save_data('app_tags.json', self.app_tags)
    
    def search_apps_by_tags(self, query):
        """Поиск приложений по тегам"""
        query = query.lower().strip()
        if not query:
            return []
        
        results = []
        for app in self.get_all_apps():
            tags_info = self.get_app_tags(app)
            tags = tags_info.get("tags", "").lower()
            notes = tags_info.get("notes", "").lower()
            
            if query in tags or query in notes:
                results.append(app)
        
        return results

    def load_base_apps(self):
        return [
            # Браузеры
            {"name": "Chrome", "package": "chrome", "category": "Browser", "icon": "web", "url": "https://google.com", "type": "web", "official_url": "https://www.google.com/chrome/"},
            {"name": "Firefox", "package": "firefox", "category": "Browser", "icon": "web", "url": "https://mozilla.org", "type": "web", "official_url": "https://www.mozilla.org/firefox/"},
            {"name": "Edge", "package": "msedge", "category": "Browser", "icon": "web", "url": "https://microsoft.com", "type": "web", "official_url": "https://www.microsoft.com/edge"},
            {"name": "Opera", "package": "opera", "category": "Browser", "icon": "web", "url": "https://opera.com", "type": "web", "official_url": "https://www.opera.com/"},
            {"name": "Yandex Browser", "package": "yandex", "category": "Browser", "icon": "web", "url": "https://yandex.ru", "type": "web", "official_url": "https://browser.yandex.ru/"},
            
            # Медиа и музыка
            {"name": "VLC", "package": "vlc", "category": "Media", "icon": "play_arrow", "url": "vlc://", "type": "app", "official_url": "https://www.videolan.org/vlc/"},
            {"name": "YouTube", "package": "youtube", "category": "Media", "icon": "play_arrow", "url": "https://youtube.com", "type": "web", "official_url": "https://www.youtube.com"},
            {"name": "VK Музыка", "package": "vkmusic", "category": "Music", "icon": "music_note", "url": "https://vk.com/music", "type": "web", "official_url": "https://vk.com/music"},
            {"name": "Яндекс Музыка", "package": "yandexmusic", "category": "Music", "icon": "music_note", "url": "https://music.yandex.ru", "type": "web", "official_url": "https://music.yandex.ru"},
            
            # Социальные сети и мессенджеры
            {"name": "Telegram", "package": "telegram", "category": "Social", "icon": "chat", "url": "tg://", "type": "app", "official_url": "https://desktop.telegram.org/"},
            {"name": "WhatsApp", "package": "whatsapp", "category": "Social", "icon": "chat", "url": "whatsapp://", "type": "app", "official_url": "https://www.whatsapp.com/download/"},
            {"name": "VK", "package": "vk", "category": "Social", "icon": "groups", "url": "https://vk.com", "type": "web", "official_url": "https://vk.com"},
            {"name": "Одноклассники", "package": "ok", "category": "Social", "icon": "groups", "url": "https://ok.ru", "type": "web", "official_url": "https://ok.ru"},
            
            # Игры
            {"name": "Steam", "package": "steam", "category": "Games", "icon": "sports_esports", "url": "steam://", "type": "app", "official_url": "https://store.steampowered.com/about/"},
            {"name": "VK Игры", "package": "vkgames", "category": "Games", "icon": "sports_esports", "url": "https://games.vk.com", "type": "web", "official_url": "https://games.vk.com"},
            {"name": "Яндекс Игры", "package": "yandexgames", "category": "Games", "icon": "sports_esports", "url": "https://yandex.ru/games", "type": "web", "official_url": "https://yandex.ru/games"},
            
            # Системные приложения
            {"name": "Калькулятор", "package": "calc", "category": "System", "icon": "calculate", "url": "calc", "type": "system", "official_url": ""},
            {"name": "Блокнот", "package": "notepad", "category": "System", "icon": "notes", "url": "notepad", "type": "system", "official_url": ""},
            {"name": "Проводник", "package": "explorer", "category": "System", "icon": "folder", "url": "explorer", "type": "system", "official_url": ""},
            {"name": "Paint", "package": "paint", "category": "System", "icon": "brush", "url": "mspaint", "type": "system", "official_url": ""},
            {"name": "Настройки", "package": "settings", "category": "System", "icon": "settings", "url": "ms-settings:", "type": "system", "official_url": ""},
            {"name": "Диспетчер задач", "package": "taskmgr", "category": "System", "icon": "monitor_heart", "url": "taskmgr", "type": "system", "official_url": ""},
            {"name": "Панель управления", "package": "control", "category": "System", "icon": "tune", "url": "control", "type": "system", "official_url": ""},
            {"name": "Командная строка", "package": "cmd", "category": "System", "icon": "terminal", "url": "cmd", "type": "system", "official_url": ""},
            
            # Офисные приложения
            {"name": "Word", "package": "winword", "category": "Office", "icon": "article", "url": "winword", "type": "app", "official_url": "https://www.microsoft.com/microsoft-365/word"},
            {"name": "Excel", "package": "excel", "category": "Office", "icon": "table_chart", "url": "excel", "type": "app", "official_url": "https://www.microsoft.com/microsoft-365/excel"},
            {"name": "PowerPoint", "package": "powerpoint", "category": "Office", "icon": "slideshow", "url": "powerpnt", "type": "app", "official_url": "https://www.microsoft.com/microsoft-365/powerpoint"},
            
            # Российские сервисы
            {"name": "Яндекс Диск", "package": "yandexdisk", "category": "Cloud", "icon": "cloud", "url": "https://disk.yandex.ru", "type": "web", "official_url": "https://disk.yandex.ru"},
            {"name": "VK Cloud", "package": "vkcloud", "category": "Cloud", "icon": "cloud", "url": "https://mcs.mail.ru", "type": "web", "official_url": "https://mcs.mail.ru"},
            {"name": "СберЗдоровье", "package": "sberhealth", "category": "Health", "icon": "medical_services", "url": "https://sberhealth.ru", "type": "web", "official_url": "https://sberhealth.ru"},
            {"name": "Госуслуги", "package": "gosuslugi", "category": "Government", "icon": "verified_user", "url": "https://gosuslugi.ru", "type": "web", "official_url": "https://gosuslugi.ru"},
        ]
    
    def is_app_installed(self, app):
        """Проверка, установлено ли приложение"""
        if app["type"] in ["web", "system"]:
            return True
        
        if app["package"] in self.manual_paths:
            return os.path.exists(self.manual_paths[app["package"]])
        
        try:
            if sys.platform == "win32":
                result = subprocess.run(f"where {app['package']}", 
                                      shell=True, capture_output=True, text=True, timeout=5,
                                      creationflags=subprocess.CREATE_NO_WINDOW)
                if result.returncode == 0:
                    return True
                
                # Проверка по известным путям
                app_checks = self._get_app_checks()
                if app["package"] in app_checks:
                    for path in app_checks[app["package"]]:
                        if os.path.exists(path):
                            self.manual_paths[app["package"]] = path
                            self.save_manual_paths()
                            return True
                
                # Проверка в реестре
                if self._check_registry(app):
                    return True
                
                return False
            else:
                result = subprocess.run(f"which {app['package']}", shell=True, capture_output=True, text=True, timeout=5)
                return result.returncode == 0
        except Exception as e:
            print(f"Ошибка проверки установки приложения {app['name']}: {e}")
            return False
    
    def _get_app_checks(self):
        """Получить пути для проверки приложений"""
        return {
            "chrome": [
                os.path.expandvars("%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"),
                os.path.expandvars("%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"),
                os.path.expandvars("%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"),
            ],
            "firefox": [
                os.path.expandvars("%ProgramFiles%\\Mozilla Firefox\\firefox.exe"),
                os.path.expandvars("%ProgramFiles(x86)%\\Mozilla Firefox\\firefox.exe"),
            ],
            "msedge": [
                os.path.expandvars("%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"),
                os.path.expandvars("%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"),
            ],
            "opera": [
                os.path.expandvars("%ProgramFiles%\\Opera\\launcher.exe"),
                os.path.expandvars("%ProgramFiles(x86)%\\Opera\\launcher.exe"),
                os.path.expandvars("%AppData%\\Opera Software\\Opera Stable\\launcher.exe"),
            ],
            "yandex": [
                os.path.expandvars("%ProgramFiles%\\Yandex\\YandexBrowser\\browser.exe"),
                os.path.expandvars("%ProgramFiles(x86)%\\Yandex\\YandexBrowser\\browser.exe"),
                os.path.expandvars("%LocalAppData%\\Yandex\\YandexBrowser\\Application\\browser.exe"),
            ],
            "steam": [
                os.path.expandvars("%ProgramFiles%\\Steam\\steam.exe"),
                os.path.expandvars("%ProgramFiles(x86)%\\Steam\\steam.exe"),
            ],
            "winword": [
                os.path.expandvars("%ProgramFiles%\\Microsoft Office\\root\\Office16\\WINWORD.EXE"),
                os.path.expandvars("%ProgramFiles(x86)%\\Microsoft Office\\root\\Office16\\WINWORD.EXE"),
                os.path.expandvars("%ProgramFiles%\\Microsoft Office\\Office16\\WINWORD.EXE"),
                os.path.expandvars("%ProgramFiles(x86)%\\Microsoft Office\\Office16\\WINWORD.EXE"),
            ],
            "excel": [
                os.path.expandvars("%ProgramFiles%\\Microsoft Office\\root\\Office16\\EXCEL.EXE"),
                os.path.expandvars("%ProgramFiles(x86)%\\Microsoft Office\\root\\Office16\\EXCEL.EXE"),
                os.path.expandvars("%ProgramFiles%\\Microsoft Office\\Office16\\EXCEL.EXE"),
                os.path.expandvars("%ProgramFiles(x86)%\\Microsoft Office\\Office16\\EXCEL.EXE"),
            ],
            "powerpoint": [
                os.path.expandvars("%ProgramFiles%\\Microsoft Office\\root\\Office16\\POWERPNT.EXE"),
                os.path.expandvars("%ProgramFiles(x86)%\\Microsoft Office\\root\\Office16\\POWERPNT.EXE"),
                os.path.expandvars("%ProgramFiles%\\Microsoft Office\\Office16\\POWERPNT.EXE"),
                os.path.expandvars("%ProgramFiles(x86)%\\Microsoft Office\\Office16\\POWERPNT.EXE"),
            ],
            "telegram": [
                os.path.expandvars("%AppData%\\Telegram Desktop\\Telegram.exe"),
                os.path.expandvars("%LocalAppData%\\Programs\\Telegram\\Telegram.exe"),
            ],
            "whatsapp": [
                os.path.expandvars("%LocalAppData%\\WhatsApp\\WhatsApp.exe"),
                os.path.expandvars("%ProgramFiles%\\WhatsApp\\WhatsApp.exe"),
            ],
            "vlc": [
                os.path.expandvars("%ProgramFiles%\\VideoLAN\\VLC\\vlc.exe"),
                os.path.expandvars("%ProgramFiles(x86)%\\VideoLAN\\VLC\\vlc.exe"),
            ]
        }
    
    def _check_registry(self, app):
        """Проверка приложения в реестре Windows"""
        if winreg is None:
            return False
        try:
            registry_paths = [
                (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths"),
                (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths"),
                (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths"),
            ]
            
            for root, path in registry_paths:
                try:
                    key_path = f"{path}\\{app['package']}.exe"
                    with winreg.OpenKey(root, key_path) as reg_key:
                        value, _ = winreg.QueryValueEx(reg_key, "")
                        if os.path.exists(value):
                            self.manual_paths[app["package"]] = value
                            self.save_manual_paths()
                            return True
                except:
                    continue
        except:
            pass
        return False
    
    def launch_app(self, app):
        """Запуск приложения"""
        try:
            if not self.is_app_installed(app):
                return False, "Приложение не установлено"
            
            if app["type"] == "web":
                webbrowser.open(app["url"])
            elif app["type"] == "system":
                if sys.platform == "win32":
                    if app["url"] == "ms-settings:":
                        os.system("start ms-settings:")
                    else:
                        os.system(f"start {app['url']}")
                else:
                    subprocess.Popen([app["url"]])
            else:
                if app["package"] in self.manual_paths:
                    subprocess.Popen([self.manual_paths[app["package"]]])
                else:
                    if sys.platform == "win32":
                        os.system(f"start {app['url']}")
            
            return True, f"Запуск {app['name']}"
        except Exception as e:
            return False, f"Ошибка запуска: {str(e)}"
    
    def save_favorites(self):
        """Сохранить избранное"""
        self.file_manager.save_data('favorites.json', self.favorite_apps)
    
    def save_manual_paths(self):
        """Сохранить ручные пути"""
        self.file_manager.save_data('manual_paths.json', self.manual_paths)
    
    def save_custom_apps(self):
        """Сохранить кастомные приложения"""
        self.file_manager.save_data('custom_apps.json', self.custom_apps)
    
    def add_custom_app(self, app_data):
        """Добавить кастомное приложение"""
        new_app = {
            "name": app_data["name"],
            "package": f"custom_{len(self.custom_apps)}",
            "category": app_data["category"],
            "icon": app_data["icon"],
            "url": app_data["url"],
            "type": "web" if app_data["url"].startswith("http") else "app",
            "official_url": app_data["url"] if app_data["url"].startswith("http") else ""
        }
        self.custom_apps.append(new_app)
        self.save_custom_apps()
        return new_app
    
    def remove_custom_app(self, app):
        """Удалить кастомное приложение"""
        if app in self.custom_apps:
            self.custom_apps.remove(app)
            self.save_custom_apps()
            
            # Удаляем из избранного если есть
            for favorite in self.favorite_apps[:]:
                if (favorite["name"] == app["name"] and 
                    favorite["url"] == app["url"] and 
                    favorite["type"] == app["type"]):
                    self.favorite_apps.remove(favorite)
            self.save_favorites()
            
            return True
        return False

    def get_all_apps(self):
        """Получить все приложения"""
        return self.all_apps + self.custom_apps

    def search_apps(self, query):
        """Поиск приложений"""
        query = query.lower().strip()
        if not query:
            return self.get_all_apps()
        
        return [app for app in self.get_all_apps() 
                if query in app["name"].lower() or query in app["category"].lower()]

    def get_apps_by_category(self, category):
        """Получить приложения по категории"""
        return [app for app in self.get_all_apps() if app["category"] == category]

    def get_apps_by_type(self, app_type):
        """Получить приложения по типу"""
        return [app for app in self.get_all_apps() if app["type"] == app_type]

    def invalidate_search_cache(self):
        """Сбросить кэш поиска (вызывается при изменении списка приложений)"""
        # Этот метод будет вызываться из UIManagerCore при изменении списка приложений
        # Реальная логика инвалидации находится в SearchCache в cache_manager.py
        pass
