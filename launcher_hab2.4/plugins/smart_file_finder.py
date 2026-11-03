from pathlib import Path
import flet as ft


class SmartFileFinder:
    PLUGIN_META = {
        "id": "smart_file_finder",
        "name": "Smart File Finder",
        "version": "2.4.0",
        "description": "Мгновенный поиск файлов и конфигов по рабочей папке прямо из лаунчера.",
        "icon": "folder_open",
    }

    def __init__(self):
        self.context = None
        self.api = None
        self.results = ft.Column(spacing=4)

    def set_context(self, context):
        self.context = context

    def on_load(self, api):
        self.api = api

    def search(self, e):
        query = (e.control.value or "").lower().strip()
        self.results.controls.clear()
        if not query:
            try:
                self.results.update()
            except Exception:
                pass
            return
        count = 0
        for path in Path(".").glob(f"**/*{query}*"):
            if path.is_file():
                self.results.controls.append(ft.Text(f"📄 {path}", size=12))
                count += 1
                if count >= 10:
                    break
        if count == 0:
            self.results.controls.append(ft.Text("Файлы не найдены", size=12, italic=True))
        try:
            self.results.update()
        except Exception:
            pass

    def get_ui_component(self):
        return ft.Container(
            content=ft.Column(
                [
                    ft.Row(
                        [
                            ft.Icon("folder_open", color="#38bdf8", size=22),
                            ft.Text("Smart File Finder", size=16, weight=ft.FontWeight.BOLD),
                        ],
                        spacing=8,
                    ),
                    ft.TextField(hint_text="Введите часть имени файла (например: settings, .py, .json)...", prefix_icon="search", on_change=self.search),
                    self.results,
                ],
                spacing=8,
            ),
            padding=12,
            border_radius=12,
        )


def initialize_plugin():
    return SmartFileFinder()