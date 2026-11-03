import flet as ft


class ExamplePlugin:
    def get_ui_component(self):
        return ft.Container(content=ft.Text("Example plugin ready"), padding=10)


def initialize_plugin():
    return ExamplePlugin()