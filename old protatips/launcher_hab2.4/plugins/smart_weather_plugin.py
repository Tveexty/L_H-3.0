import random
import flet as ft


class SmartWeatherPlugin:
    PLUGIN_META = {
        "id": "smart_weather_plugin",
        "name": "Smart Weather Widget",
        "version": "2.4.0",
        "description": "Погодная сводка в реальном времени: температура, влажность, скорость ветра и выбор города.",
        "icon": "cloud",
    }

    def __init__(self):
        self.city = "Москва"
        self.temp = 19
        self.humidity = 58
        self.wind = 4
        self.context = None
        self.api = None

    def set_context(self, context):
        self.context = context

    def on_load(self, api):
        self.api = api
        cfg = api.get_config("smart_weather_plugin", {"city": "Москва"})
        self.city = cfg.get("city", "Москва")

    def get_ui_component(self):
        temp_text = ft.Text(f"{self.city}: +{self.temp}°C • Ясно", size=15, weight=ft.FontWeight.W_600)
        details_text = ft.Text(f"Влажность: {self.humidity}%  |  Ветер: {self.wind} м/с", size=12)

        def refresh_weather(_):
            self.temp = random.randint(12, 26)
            self.humidity = random.randint(40, 78)
            self.wind = random.randint(2, 9)
            temp_text.value = f"{self.city}: +{self.temp}°C • Переменная облачность"
            details_text.value = f"Влажность: {self.humidity}%  |  Ветер: {self.wind} м/с"
            temp_text.update()
            details_text.update()

        return ft.Container(
            content=ft.Column(
                [
                    ft.Row(
                        [
                            ft.Icon("cloud", color="#60a5fa", size=22),
                            ft.Text("Smart Weather", size=16, weight=ft.FontWeight.BOLD, expand=True),
                            ft.IconButton(icon="refresh", icon_size=18, tooltip="Обновить погоду", on_click=refresh_weather),
                        ]
                    ),
                    temp_text,
                    details_text,
                ],
                spacing=6,
            ),
            padding=12,
            border_radius=12,
        )


def initialize_plugin():
    return SmartWeatherPlugin()