import uuid
import flet as ft


class WorkspaceDialogMixin:
    def show_workspace_manager(self, e=None):
        colors = self.core.get_colors()
        cards = []

        def run_preset(preset_id):
            self.core.run_workspace_preset(preset_id)

        for preset in self.core.smart_workspace_manager.presets:
            hotkey = self.core.smart_workspace_manager.hotkeys.get(preset.get("id"), "не назначено")
            cards.append(
                ft.Container(
                    bgcolor=colors["SETTINGS_CARD"],
                    border_radius=12,
                    padding=12,
                    content=ft.Column([
                        ft.Row([
                            ft.Text(preset.get("name", "Preset"), weight=ft.FontWeight.BOLD, expand=True),
                            ft.Text(f"Hotkey: {hotkey}", size=11, color=colors["ON_SURFACE_VARIANT"]),
                        ]),
                        ft.Text(f"Закрыть: {', '.join(preset.get('close_processes', [])) or '—'}", size=11, color=colors["ON_SURFACE_VARIANT"]),
                        ft.Text(f"Запустить: {', '.join(preset.get('launch_apps', [])) or '—'}", size=11, color=colors["ON_SURFACE_VARIANT"]),
                        ft.Row([
                            ft.FilledButton("Запустить", on_click=lambda e, pid=preset.get("id"): run_preset(pid)),
                            ft.TextButton("Редактировать", on_click=lambda e, p=preset: self._show_workspace_edit_dialog(p)),
                            ft.TextButton("Удалить", on_click=lambda e, pid=preset.get("id"): self._delete_workspace(pid)),
                        ])
                    ], spacing=6),
                )
            )

        dialog = ft.AlertDialog(
            title=ft.Text("Smart Workspace"),
            content=ft.Container(
                width=700,
                height=520,
                content=ft.Column([
                    ft.Text("Быстрые пресеты: игровой, разработка и свои сценарии", size=12, color=colors["ON_SURFACE_VARIANT"]),
                    ft.Row([
                        ft.FilledButton("Новый пресет", icon="add", on_click=lambda e: self._show_workspace_edit_dialog(None)),
                        ft.TextButton("Обновить", on_click=lambda e: self.show_workspace_manager()),
                    ]),
                    ft.Container(height=6),
                    ft.Column(cards, scroll=ft.ScrollMode.ADAPTIVE),
                ]),
            ),
            actions=[ft.TextButton("Закрыть", on_click=lambda e: self.core.page.close(dialog))],
        )
        self.core.page.open(dialog)

    def _delete_workspace(self, preset_id: str):
        self.core.smart_workspace_manager.delete_preset(preset_id)
        self.show_workspace_manager()

    def _show_workspace_edit_dialog(self, preset):
        colors = self.core.get_colors()
        preset = preset or {"id": str(uuid.uuid4())[:8], "name": "Новый пресет", "close_processes": [], "launch_apps": []}

        name_field = ft.TextField(label="Название", value=preset.get("name", ""), filled=True, bgcolor=colors["SURFACE_VARIANT"])
        close_field = ft.TextField(label="Процессы для закрытия (через запятую)", value=", ".join(preset.get("close_processes", [])), filled=True, bgcolor=colors["SURFACE_VARIANT"])
        launch_field = ft.TextField(label="Приложения для запуска (через запятую)", value=", ".join(preset.get("launch_apps", [])), filled=True, bgcolor=colors["SURFACE_VARIANT"])
        hotkey_field = ft.TextField(label="Горячая клавиша (пример: ctrl+alt+g)", value=self.core.smart_workspace_manager.hotkeys.get(preset.get("id"), ""), filled=True, bgcolor=colors["SURFACE_VARIANT"])

        def save(_):
            data = {
                "id": preset.get("id"),
                "name": name_field.value.strip() or "Preset",
                "close_processes": [x.strip() for x in close_field.value.split(",") if x.strip()],
                "launch_apps": [x.strip() for x in launch_field.value.split(",") if x.strip()],
            }
            exists = any(p.get("id") == data["id"] for p in self.core.smart_workspace_manager.presets)
            if exists:
                self.core.smart_workspace_manager.update_preset(data["id"], data)
            else:
                self.core.smart_workspace_manager.add_preset(data)
            if hotkey_field.value.strip():
                self.core.smart_workspace_manager.set_hotkey(data["id"], hotkey_field.value)
            self.core.page.close(edit_dialog)
            self.show_workspace_manager()

        edit_dialog = ft.AlertDialog(
            title=ft.Text("Редактирование пресета"),
            content=ft.Container(width=560, content=ft.Column([name_field, close_field, launch_field, hotkey_field], tight=True)),
            actions=[
                ft.TextButton("Отмена", on_click=lambda e: self.core.page.close(edit_dialog)),
                ft.FilledButton("Сохранить", on_click=save),
            ],
        )
        self.core.page.open(edit_dialog)