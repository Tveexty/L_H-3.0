#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Launcher Hub 2.9 + Luma Beta Core — Главная точка входа (launcher_hab2.4/main.py)
=================================================================================
Обеспечивает:
  1. Независимость путей (`assets_dir` и рабочая директория определяются относительно `main.py`,
     поэтому запуск работает из любой папки терминала или VS Code).
  2. Бесшовную интеграцию с фоновым ядром Luma Beta (`127.0.0.1:49215`) через `IPCClient`:
     если ядро еще не запущено — автоматически поднимает его в скрытом процессе (`CREATE_NO_WINDOW`).
  3. Полную защиту от падений интерфейса (`try/except` с логированием).
"""

from __future__ import annotations

import os
import sys
import threading
from pathlib import Path

# 1. Фиксируем рабочую директорию и пути импорта независимо от точки вызова скрипта
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

try:
    os.chdir(BASE_DIR)
except Exception:
    pass

ASSETS_DIR = BASE_DIR / "assets"
ASSETS_DIR.mkdir(parents=True, exist_ok=True)

import flet as ft  # noqa: E402
from modules.ipc_client import IPCClient  # noqa: E402
from modules.logger import get_logger  # noqa: E402
from modules.ui_manager_core import UIManagerCore  # noqa: E402

logger = get_logger(__name__)


def _bootstrap_luma_core_async(ipc_client: IPCClient) -> None:
    """В фоновом потоке проверяет связь с ядром 127.0.0.1:49215 и запускает его при необходимости."""

    def _worker() -> None:
        try:
            started = ipc_client.ensure_core_running()
            if started:
                logger.info("Luma Beta 2.9 Core активно на %s:%d", ipc_client.host, ipc_client.port)
            else:
                logger.warning("Работаем в автономном режиме UI (ядро Luma Beta не обнаружено).")
        except Exception as exc:
            logger.error("Ошибка инициализации IPCClient: %s", exc)

    threading.Thread(target=_worker, daemon=True).start()


def main(page: ft.Page) -> None:
    page.title = "Launcher Hub 2.9 • Luma Beta Edition"
    try:
        ipc_client = IPCClient()
        _bootstrap_luma_core_async(ipc_client)

        ui_manager = UIManagerCore(page)
        ui_manager.ipc_client = ipc_client
        ui_manager.initialize_ui()
    except Exception as exc:
        logger.exception("Критическая ошибка при инициализации UI")
        page.add(
            ft.Container(
                padding=24,
                border_radius=16,
                bgcolor="#1E293B",
                content=ft.Column(
                    spacing=10,
                    controls=[
                        ft.Text("Ошибка запуска интерфейса Launcher Hub 2.9", size=20, color="#F43F5E", weight="bold"),
                        ft.Text(f"Детали: {exc}", size=13, color="#E2E8F0", selectable=True),
                        ft.FilledButton(
                            "Повторить инициализацию",
                            on_click=lambda _: (page.controls.clear(), main(page)),
                        ),
                    ],
                ),
            )
        )


if __name__ == "__main__":
    ft.app(target=main, assets_dir=str(ASSETS_DIR))
