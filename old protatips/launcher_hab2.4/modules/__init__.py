# [file name]: __init__.py
from .theme_manager import ThemeManager
from .app_manager import AppManager
from .file_manager import FileManager
from .encryption_manager import EncryptionManager
from .system_monitor import SystemMonitor
from .glass_morphism import GlassMorphism
from .ui_manager_core import UIManagerCore
from .ui_panels import UIPanels
from .ui_dialogs import UIDialogs
from .backup_manager import BackupManager
from .cache_manager import CacheManager, SearchCache
from .smart_workspace_manager import SmartWorkspaceManager

# Условный импорт плагинов и аудио контроллера
try:
    from .plugin_manager import PluginManager
except ImportError:
    class PluginManager:
        def __init__(self, file_manager):
            self.file_manager = file_manager
        
        def create_plugin_ui(self, colors):
            import flet as ft
            return ft.Container(content=ft.Text("Плагины недоступны"))

try:
    from .audio_controller import AudioController
except ImportError:
    class AudioController:
        def __init__(self):
            pass
        
        def create_compact_audio_ui(self, colors):
            import flet as ft
            return ft.Container(content=ft.Text("Аудио контроллер недоступен"))

__all__ = [
    'ThemeManager',
    'AppManager', 
    'FileManager',
    'EncryptionManager',
    'SystemMonitor',
    'GlassMorphism',
    'UIManagerCore',
    'UIPanels',
    'UIDialogs',
    'PluginManager',
    'AudioController',
    'BackupManager',
    'CacheManager',
    'SearchCache',
    'SmartWorkspaceManager'
]