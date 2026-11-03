import flet as ft


class SmartMusicController:
    PLUGIN_META = {
        "id": "smart_music_controller",
        "name": "Smart Music Controller",
        "version": "2.4.0",
        "description": "Быстрое управление медиа-плеером, переключение треков и синхронизация с системной громкостью.",
        "icon": "music_note",
    }

    def __init__(self):
        self.context = None
        self.api = None
        self.current_track = ft.Text("Трек: Synthwave Focus Mix", size=13, weight=ft.FontWeight.W_500)
        self.status = ft.Text("Статус: готов к воспроизведению", size=12)
        self.volume = 65

    def set_context(self, context):
        self.context = context
        if context and hasattr(context, "audio_controller"):
            try:
                self.volume = int(context.audio_controller.get_volume_level())
            except Exception:
                pass

    def on_load(self, api):
        self.api = api

    def _set_track(self, name: str):
        self.current_track.value = f"Трек: {name}"
        self.status.value = "Статус: воспроизведение ▶"
        try:
            self.current_track.update()
            self.status.update()
        except Exception:
            pass

    def _toggle_pause(self, _):
        if "пауза" in self.status.value:
            self.status.value = "Статус: воспроизведение ▶"
        else:
            self.status.value = "Статус: пауза ⏸"
        try:
            self.status.update()
        except Exception:
            pass

    def _on_volume_change(self, e):
        self.volume = int(e.control.value)
        if self.context and hasattr(self.context, "audio_controller"):
            try:
                self.context.audio_controller.set_volume_level(self.volume)
            except Exception:
                pass

    def get_ui_component(self):
        return ft.Container(
            content=ft.Column(
                [
                    ft.Row(
                        [
                            ft.Icon("music_note", color="#c084fc", size=22),
                            ft.Text("Smart Music Controller", size=16, weight=ft.FontWeight.BOLD),
                        ],
                        spacing=8,
                    ),
                    self.current_track,
                    self.status,
                    ft.Row(
                        [
                            ft.IconButton(icon="skip_previous", on_click=lambda e: self._set_track("Deep Work Lo-Fi #1")),
                            ft.IconButton(icon="play_arrow", on_click=lambda e: self._set_track("Cyberpunk Ambient Mix")),
                            ft.IconButton(icon="pause", on_click=self._toggle_pause),
                            ft.IconButton(icon="skip_next", on_click=lambda e: self._set_track("Night Coding Synth")),
                        ],
                        tight=True,
                    ),
                    ft.Row(
                        [
                            ft.Icon("volume_up", size=16),
                            ft.Slider(
                                min=0,
                                max=100,
                                value=self.volume,
                                divisions=20,
                                label="{value}%",
                                on_change=self._on_volume_change,
                                expand=True,
                            ),
                        ]
                    ),
                ],
                spacing=6,
            ),
            padding=12,
            border_radius=12,
        )


def initialize_plugin():
    return SmartMusicController()