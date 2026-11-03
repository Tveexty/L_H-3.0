import flet as ft
from pathlib import Path
from datetime import datetime


class IdeaNotebookPlugin:
    PLUGIN_META = {
        "id": "idea_notebook_plugin",
        "name": "Idea Notebook",
        "version": "2.4.0",
        "description": "Быстрые заметки и идеи прямо в лаунчере с сохранением в файл и историей записей.",
        "icon": "lightbulb",
    }

    def __init__(self):
        self.file = Path("idea_notes.txt")
        self.context = None
        self.api = None
        self.notes_column = ft.Column(spacing=6)

    def set_context(self, context):
        self.context = context

    def on_load(self, api):
        self.api = api

    def _load_recent_notes(self):
        self.notes_column.controls.clear()
        if self.file.exists():
            try:
                lines = [ln.strip() for ln in self.file.read_text(encoding="utf-8").splitlines() if ln.strip()]
                for ln in reversed(lines[-8:]):
                    self.notes_column.controls.append(ft.Text(f"• {ln}", size=12))
            except Exception:
                pass
        if not self.notes_column.controls:
            self.notes_column.controls.append(ft.Text("Пока нет сохраненных идей", size=12, italic=True))

    def save_idea(self, textfield, page):
        idea = (textfield.value or "").strip()
        if not idea:
            return
        with self.file.open("a", encoding="utf-8") as f:
            f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {idea}\n")
        textfield.value = ""
        self._load_recent_notes()
        try:
            textfield.update()
            self.notes_column.update()
            sb = ft.SnackBar(content=ft.Text("✅ Идея сохранена в idea_notes.txt"), action="OK")
            if hasattr(page, "open"):
                page.open(sb)
            else:
                page.snack_bar = sb
                sb.open = True
                page.update()
        except Exception:
            pass

    def get_ui_component(self):
        self._load_recent_notes()
        field = ft.TextField(hint_text="Введите новую идею или заметку...", expand=True)
        return ft.Container(
            content=ft.Column(
                [
                    ft.Row(
                        [
                            ft.Icon("lightbulb", color="#fbbf24", size=20),
                            ft.Text("Idea Notebook 2.4", size=16, weight=ft.FontWeight.BOLD),
                        ],
                        spacing=8,
                    ),
                    ft.Row(
                        [
                            field,
                            ft.FilledButton("Сохранить", icon="save", on_click=lambda e: self.save_idea(field, e.page)),
                        ],
                        spacing=8,
                    ),
                    ft.Text("Последние записи (Ctrl + Alt + N):", size=12, weight=ft.FontWeight.W_500),
                    self.notes_column,
                ],
                spacing=8,
            ),
            padding=12,
            border_radius=12,
        )


def initialize_plugin():
    return IdeaNotebookPlugin()