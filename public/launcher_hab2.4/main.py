# [file name]: main.py
import flet as ft
from modules.ui_manager_core import UIManagerCore
from modules.logger import get_logger

logger = get_logger(__name__)

def main(page: ft.Page):
    try:
        ui_manager = UIManagerCore(page)
        ui_manager.initialize_ui()
    except Exception as e:
        logger.exception("Ошибка при инициализации UI")
        page.add(
            ft.Text("Ошибка запуска приложения", size=20, color="red"),
            ft.Text(f"Детали: {str(e)}", size=14),
            ft.FilledButton("Закрыть приложение", on_click=lambda e: print("Приложение закрыто"))
        )

if __name__ == "__main__":
    ft.app(target=main, assets_dir="assets")