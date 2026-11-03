import time
import threading
import subprocess
import sys
import flet as ft


class FocusModePlugin:
    PLUGIN_META = {
        "id": "focus_mode_plugin",
        "name": "Focus Mode (Pomodoro)",
        "version": "2.4.0",
        "description": "Режим глубокой концентрации с таймером Pomodoro (25/45 мин) и блокировкой отвлекающих мессенджеров.",
        "icon": "self_improvement",
    }

    def __init__(self):
        self.context = None
        self.api = None
        self.running = False
        self.duration_mins = 25
        self.remaining = 25 * 60
        self.timer_text = ft.Text("25:00", size=28, weight=ft.FontWeight.BOLD)
        self.status_text = ft.Text("Готов к сессии фокуса", size=12)

    def set_context(self, context):
        self.context = context

    def on_load(self, api):
        self.api = api
        cfg = api.get_config("focus_mode_plugin", {"duration_mins": 25})
        self.duration_mins = int(cfg.get("duration_mins", 25))
        if not self.running:
            self.remaining = self.duration_mins * 60
            self.timer_text.value = f"{self.duration_mins:02d}:00"

    def _stop_distracting_apps(self):
        targets = ["discord", "telegram"]
        try:
            if sys.platform.startswith("win"):
                for app in targets:
                    subprocess.run(["taskkill", "/F", "/IM", f"{app}.exe"], capture_output=True, text=True)
            else:
                for app in targets:
                    subprocess.run(["pkill", "-f", app], capture_output=True, text=True)
        except Exception:
            pass

    def _run_timer(self):
        while self.running and self.remaining > 0:
            mins, secs = divmod(self.remaining, 60)
            self.timer_text.value = f"{mins:02d}:{secs:02d}"
            try:
                self.timer_text.update()
            except Exception:
                pass
            time.sleep(1)
            self.remaining -= 1
        if self.remaining <= 0:
            self.running = False
            self.status_text.value = "✅ Сессия фокуса завершена!"
            try:
                self.status_text.update()
            except Exception:
                pass

    def toggle_focus(self, _=None):
        self.running = not self.running
        self.status_text.value = "🔥 Режим фокуса активен" if self.running else "⏸ На паузе"
        try:
            self.status_text.update()
        except Exception:
            pass
        if self.running:
            self._stop_distracting_apps()
            threading.Thread(target=self._run_timer, daemon=True).start()

    def reset_focus(self, mins: int = 25):
        self.running = False
        self.duration_mins = mins
        self.remaining = mins * 60
        self.timer_text.value = f"{mins:02d}:00"
        self.status_text.value = f"Установлен таймер: {mins} мин"
        try:
            self.timer_text.update()
            self.status_text.update()
        except Exception:
            pass

    def get_ui_component(self):
        return ft.Container(
            content=ft.Column(
                [
                    ft.Row(
                        [
                            ft.Icon("self_improvement", color="#10b981", size=22),
                            ft.Text("Focus Mode (Pomodoro)", size=16, weight=ft.FontWeight.BOLD),
                        ],
                        spacing=8,
                    ),
                    self.timer_text,
                    self.status_text,
                    ft.Row(
                        [
                            ft.FilledButton("Старт / Пауза", icon="play_arrow", on_click=self.toggle_focus),
                            ft.OutlinedButton("25 мин", on_click=lambda e: self.reset_focus(25)),
                            ft.OutlinedButton("45 мин", on_click=lambda e: self.reset_focus(45)),
                        ],
                        spacing=8,
                    ),
                ],
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                spacing=8,
            ),
            padding=12,
            border_radius=12,
        )


def initialize_plugin():
    return FocusModePlugin()