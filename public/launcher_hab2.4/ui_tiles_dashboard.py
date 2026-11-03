#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Luma Beta — Третье окно: Дашборд живых плиток на Flet (ui_tiles_dashboard.py)
=============================================================================
Отдельный графический клиентский процесс (GUI Client), который:
  1. При запуске подключается к независимому ядру Luma Beta по сокету 127.0.0.1:49215
     через протокол JSON-RPC 2.0 (`widgets.get_all`, `widgets.update_note`, `system.ping`).
  2. Отрисовывает полученные от WidgetManager виджеты в виде разноразмерных карточек
     в стиле Windows Live Tiles / Android 15 Dashboard (скругленные углы, градиенты,
     прогресс-бары).
  3. Периодически (каждую 1 секунду) опрашивает ядро для живого обновления CPU, RAM и диска.
  4. При закрытии окна полностью завершает клиентский процесс Flet (`os._exit(0)`),
     оставляя фоновое ядро `luma_core.py` непрерывно работать в фоне.

Запуск:
  1) Сначала запустите ядро:   python luma_core.py
  2) Затем откройте дашборд:   python ui_tiles_dashboard.py
"""

from __future__ import annotations

import json
import os
import socket
import sys
import threading
import time
from datetime import datetime
from typing import Any, Dict, Optional

import flet as ft

IPC_HOST = "127.0.0.1"
IPC_PORT = 49215
POLL_INTERVAL_SEC = 1.0

# Совместимость иконок между Flet 0.24 (ft.icons) и Flet 0.25+ (ft.Icons)
ICONS = getattr(ft, "Icons", getattr(ft, "icons", None))


def _icon(name: str, fallback: str = "widgets"):
    if ICONS is None:
        return None
    return getattr(ICONS, name, getattr(ICONS, name.lower(), getattr(ICONS, fallback, None)))


# ============================================================================
# IPC-КЛИЕНТ JSON-RPC 2.0 (TCP 127.0.0.1:49215)
# ============================================================================
class LumaIpcClient:
    """
    Легковесный синхронный/потокобезопасный JSON-RPC 2.0 клиент для связи
    процесса Flet с фоновым ядром Luma Beta (127.0.0.1:49215).
    """

    def __init__(self, host: str = IPC_HOST, port: int = IPC_PORT, timeout: float = 1.5) -> None:
        self.host = host
        self.port = port
        self.timeout = timeout
        self._req_id = 0
        self._lock = threading.Lock()

    def call(self, method: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Отправляет JSON-RPC 2.0 запрос в ядро и возвращает распарсенный ответ."""
        with self._lock:
            self._req_id += 1
            req_id = self._req_id

        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {},
            "id": req_id,
        }
        raw_message = (json.dumps(payload, ensure_ascii=False) + "\n").encode("utf-8")

        t0 = time.perf_counter()
        with socket.create_connection((self.host, self.port), timeout=self.timeout) as sock:
            sock.sendall(raw_message)
            buffer = b""
            while b"\n" not in buffer:
                chunk = sock.recv(8192)
                if not chunk:
                    break
                buffer += chunk

        latency_ms = round((time.perf_counter() - t0) * 1000.0, 2)
        if not buffer:
            raise ConnectionError("Пустой ответ от ядра Luma Beta")

        response = json.loads(buffer.decode("utf-8", errors="replace").strip())
        if "error" in response and response["error"]:
            raise RuntimeError(response["error"].get("message", "JSON-RPC Error"))

        return {
            "result": response.get("result", {}),
            "latency_ms": latency_ms,
            "id": response.get("id", req_id),
        }


# ============================================================================
# ГЛАВНЫЙ КЛАСС ТРЕТЬЕГО ОКНА — ДАШБОРД ПЛИТОК (Windows Live Tiles / Android)
# ============================================================================
class LumaTilesDashboardApp:
    def __init__(self, page: ft.Page) -> None:
        self.page = page
        self.ipc = LumaIpcClient(IPC_HOST, IPC_PORT)
        self.running = True
        self.poll_count = 0
        self.note_dirty = False

        self._configure_window()
        self._build_ui()
        self._start_polling_thread()

    def _configure_window(self) -> None:
        self.page.title = "Luma Beta — Live Tiles Dashboard (127.0.0.1:49215)"
        self.page.bgcolor = "#090D16"
        self.page.padding = 24
        self.page.theme_mode = ft.ThemeMode.DARK

        # Поддержка как нового API page.window.*, так и page.window_* (Flet 0.24)
        if hasattr(self.page, "window") and self.page.window is not None:
            try:
                self.page.window.width = 980
                self.page.window.height = 680
                self.page.window.min_width = 820
                self.page.window.min_height = 560
                self.page.window.prevent_close = False
                self.page.window.on_event = self._on_window_event
            except Exception:
                pass
        try:
            self.page.window_width = 980
            self.page.window_height = 680
            self.page.on_window_event = self._on_window_event
        except Exception:
            pass

    def _terminate_gui_only(self, *_args: Any) -> None:
        """
        Полностью завершает графический процесс Flet, оставляя фоновое ядро
        `luma_core.py` работать в фоне без разрыва его состояния.
        """
        self.running = False
        try:
            if hasattr(self.page, "window") and hasattr(self.page.window, "destroy"):
                self.page.window.destroy()
            elif hasattr(self.page, "window_destroy"):
                self.page.window_destroy()
        except Exception:
            pass
        os._exit(0)

    def _on_window_event(self, e: Any) -> None:
        event_data = getattr(e, "data", "")
        if event_data in ("close", "terminate", "unload"):
            self._terminate_gui_only()

    def _build_ui(self) -> None:
        self.status_dot = ft.Container(
            width=10,
            height=10,
            border_radius=5,
            bgcolor="#10B981",
        )
        self.status_text = ft.Text(
            f"Подключено к Luma Core ({IPC_HOST}:{IPC_PORT})",
            size=12,
            color="#A7F3D0",
            weight="w600",
        )
        self.latency_badge = ft.Text(
            "IPC RTT: -- ms",
            size=11,
            color="#94A3B8",
        )

        # ---- ПЛИТКА 1 (Размер 2x1): SystemStatsWidget (CPU / RAM / Диск) ----
        self.tile_stats_title = ft.Text(
            "Системные ресурсы (CPU / RAM / Диск)",
            size=16,
            weight="bold",
            color="#F8FAFC",
        )
        self.cpu_value_text = ft.Text("--%", size=30, weight="bold", color="#38BDF8")
        self.cpu_bar = ft.ProgressBar(value=0.0, color="#38BDF8", bgcolor="#1E293B", height=8)
        self.cpu_sub_text = ft.Text("Нагрузка процессора", size=11, color="#94A3B8")

        self.ram_value_text = ft.Text("--%", size=30, weight="bold", color="#A855F7")
        self.ram_bar = ft.ProgressBar(value=0.0, color="#A855F7", bgcolor="#1E293B", height=8)
        self.ram_sub_text = ft.Text("ОЗУ: -- / -- ГБ", size=11, color="#94A3B8")

        self.disk_value_text = ft.Text("-- ГБ", size=30, weight="bold", color="#10B981")
        self.disk_bar = ft.ProgressBar(value=0.0, color="#10B981", bgcolor="#1E293B", height=8)
        self.disk_sub_text = ft.Text("Свободно на диске", size=11, color="#94A3B8")

        self.core_footprint_text = ft.Text(
            "Потребление ядра Luma: ~14.2 МБ RAM • Uptime: 0 с",
            size=11,
            color="#64748B",
        )

        system_stats_tile = ft.Container(
            padding=22,
            border_radius=24,
            bgcolor="#111827",
            border=ft.border.all(1, "#1E293B"),
            content=ft.Column(
                spacing=16,
                controls=[
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Row(
                                spacing=10,
                                controls=[
                                    ft.Container(
                                        width=36,
                                        height=36,
                                        border_radius=12,
                                        bgcolor="#0284C7",
                                        alignment=ft.alignment.center,
                                        content=ft.Icon(_icon("SPEED", "speed"), color="#FFFFFF", size=20),
                                    ),
                                    ft.Column(
                                        spacing=2,
                                        controls=[
                                            self.tile_stats_title,
                                            ft.Text(
                                                "Виджет: SystemStatsWidget • Плитка 2x1 (Live Telemetry)",
                                                size=11,
                                                color="#64748B",
                                            ),
                                        ],
                                    ),
                                ],
                            ),
                            ft.Container(
                                padding=ft.padding.symmetric(horizontal=10, vertical=4),
                                border_radius=10,
                                bgcolor="#0F172A",
                                border=ft.border.all(1, "#1E293B"),
                                content=ft.Text("2x1 WIDE TILE", size=10, color="#38BDF8", weight="bold"),
                            ),
                        ],
                    ),
                    ft.Row(
                        spacing=16,
                        controls=[
                            ft.Container(
                                expand=1,
                                padding=16,
                                border_radius=18,
                                bgcolor="#0B1120",
                                border=ft.border.all(1, "#1E293B"),
                                content=ft.Column(
                                    spacing=8,
                                    controls=[
                                        ft.Row(
                                            alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                                            controls=[
                                                ft.Text("CPU LOAD", size=11, color="#38BDF8", weight="bold"),
                                                ft.Icon(_icon("MEMORY", "memory"), color="#38BDF8", size=16),
                                            ],
                                        ),
                                        self.cpu_value_text,
                                        self.cpu_bar,
                                        self.cpu_sub_text,
                                    ],
                                ),
                            ),
                            ft.Container(
                                expand=1,
                                padding=16,
                                border_radius=18,
                                bgcolor="#0B1120",
                                border=ft.border.all(1, "#1E293B"),
                                content=ft.Column(
                                    spacing=8,
                                    controls=[
                                        ft.Row(
                                            alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                                            controls=[
                                                ft.Text("RAM USAGE", size=11, color="#A855F7", weight="bold"),
                                                ft.Icon(_icon("STORAGE", "storage"), color="#A855F7", size=16),
                                            ],
                                        ),
                                        self.ram_value_text,
                                        self.ram_bar,
                                        self.ram_sub_text,
                                    ],
                                ),
                            ),
                            ft.Container(
                                expand=1,
                                padding=16,
                                border_radius=18,
                                bgcolor="#0B1120",
                                border=ft.border.all(1, "#1E293B"),
                                content=ft.Column(
                                    spacing=8,
                                    controls=[
                                        ft.Row(
                                            alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                                            controls=[
                                                ft.Text("DISK FREE", size=11, color="#10B981", weight="bold"),
                                                ft.Icon(_icon("FOLDER_OPEN", "folder"), color="#10B981", size=16),
                                            ],
                                        ),
                                        self.disk_value_text,
                                        self.disk_bar,
                                        self.disk_sub_text,
                                    ],
                                ),
                            ),
                        ],
                    ),
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            self.core_footprint_text,
                            ft.Text("Опрос: каждые 1.0 сек по JSON-RPC 2.0", size=11, color="#475569"),
                        ],
                    ),
                ],
            ),
        )

        # ---- ПЛИТКА 2 (Размер 1x1): QuickNoteWidget (Заметка в памяти ядра) ----
        self.note_title_text = ft.Text(
            "Быстрая заметка (Память ядра)",
            size=15,
            weight="bold",
            color="#F8FAFC",
        )
        self.note_meta_text = ft.Text(
            "Ревизия #1 • Хранится в ОЗУ демона Luma",
            size=11,
            color="#F59E0B",
        )
        self.note_input = ft.TextField(
            multiline=True,
            min_lines=4,
            max_lines=5,
            hint_text="Введите заметку — она сохранится в памяти ядра Luma Beta...",
            bgcolor="#0B1120",
            border_color="#334155",
            focused_border_color="#F59E0B",
            border_radius=14,
            text_size=13,
            color="#F1F5F9",
            on_change=self._on_note_edited,
        )
        self.note_save_status = ft.Text(
            "Синхронизировано с ядром",
            size=11,
            color="#10B981",
        )

        quick_note_tile = ft.Container(
            expand=3,
            padding=20,
            border_radius=24,
            bgcolor="#111827",
            border=ft.border.all(1, "#1E293B"),
            content=ft.Column(
                spacing=12,
                controls=[
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Row(
                                spacing=10,
                                controls=[
                                    ft.Container(
                                        width=34,
                                        height=34,
                                        border_radius=10,
                                        bgcolor="#D97706",
                                        alignment=ft.alignment.center,
                                        content=ft.Icon(_icon("EDIT_NOTE", "edit"), color="#FFFFFF", size=19),
                                    ),
                                    ft.Column(
                                        spacing=2,
                                        controls=[
                                            self.note_title_text,
                                            self.note_meta_text,
                                        ],
                                    ),
                                ],
                            ),
                            ft.Container(
                                padding=ft.padding.symmetric(horizontal=9, vertical=4),
                                border_radius=10,
                                bgcolor="#0F172A",
                                border=ft.border.all(1, "#1E293B"),
                                content=ft.Text("1x1 NOTE TILE", size=10, color="#F59E0B", weight="bold"),
                            ),
                        ],
                    ),
                    self.note_input,
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            self.note_save_status,
                            ft.ElevatedButton(
                                text="Сохранить в ядро (IPC)",
                                icon=_icon("SAVE", "save"),
                                bgcolor="#D97706",
                                color="#FFFFFF",
                                on_click=self._save_note_to_core,
                            ),
                        ],
                    ),
                ],
            ),
        )

        # ---- ПЛИТКА 3 (Размер 1x1): Управление IPC и Демонстрация отказоустойчивости ----
        self.ipc_counter_text = ft.Text("Пакеты JSON-RPC: 0", size=13, color="#E2E8F0", weight="w600")
        self.last_sync_text = ft.Text("Последний ответ: --:--:--", size=12, color="#94A3B8")

        ipc_control_tile = ft.Container(
            expand=2,
            padding=20,
            border_radius=24,
            bgcolor="#111827",
            border=ft.border.all(1, "#1E293B"),
            content=ft.Column(
                spacing=12,
                controls=[
                    ft.Row(
                        spacing=10,
                        controls=[
                            ft.Container(
                                width=34,
                                height=34,
                                border_radius=10,
                                bgcolor="#4F46E5",
                                alignment=ft.alignment.center,
                                content=ft.Icon(_icon("HUB", "hub"), color="#FFFFFF", size=18),
                            ),
                            ft.Column(
                                spacing=2,
                                controls=[
                                    ft.Text("IPC-Мост Luma Beta", size=15, weight="bold", color="#F8FAFC"),
                                    ft.Text("JSON-RPC 2.0 • 127.0.0.1:49215", size=11, color="#818CF8"),
                                ],
                            ),
                        ],
                    ),
                    ft.Container(
                        padding=12,
                        border_radius=14,
                        bgcolor="#0B1120",
                        border=ft.border.all(1, "#1E293B"),
                        content=ft.Column(
                            spacing=6,
                            controls=[
                                self.ipc_counter_text,
                                self.last_sync_text,
                                ft.Text(
                                    "Закрытие этого окна завершит только Flet-процесс. Заметка и метрики останутся в памяти ядра.",
                                    size=11,
                                    color="#64748B",
                                ),
                            ],
                        ),
                    ),
                    ft.Row(
                        spacing=8,
                        controls=[
                            ft.OutlinedButton(
                                text="Обновить",
                                icon=_icon("REFRESH", "refresh"),
                                on_click=lambda _: self._poll_once(),
                            ),
                            ft.ElevatedButton(
                                text="Выход (Ядро в фоне)",
                                icon=_icon("POWER_SETTINGS_NEW", "close"),
                                bgcolor="#E11D48",
                                color="#FFFFFF",
                                on_click=self._terminate_gui_only,
                            ),
                        ],
                    ),
                ],
            ),
        )

        # ---- ШАПКА ДАШБОРДА ----
        header = ft.Container(
            padding=ft.padding.symmetric(horizontal=20, vertical=14),
            border_radius=20,
            bgcolor="#111827",
            border=ft.border.all(1, "#1E293B"),
            content=ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Row(
                        spacing=12,
                        controls=[
                            ft.Container(
                                width=40,
                                height=40,
                                border_radius=12,
                                bgcolor="#2563EB",
                                alignment=ft.alignment.center,
                                content=ft.Icon(_icon("DASHBOARD_CUSTOMIZE", "dashboard"), color="#FFFFFF", size=22),
                            ),
                            ft.Column(
                                spacing=2,
                                controls=[
                                    ft.Text(
                                        "Luma Beta — Дашборд живых плиток (Третье окно)",
                                        size=17,
                                        weight="bold",
                                        color="#F8FAFC",
                                    ),
                                    ft.Text(
                                        "Независимый Flet-клиент • Протокол JSON-RPC 2.0 (widgets.get_all / widgets.update_note)",
                                        size=11,
                                        color="#94A3B8",
                                    ),
                                ],
                            ),
                        ],
                    ),
                    ft.Container(
                        padding=ft.padding.symmetric(horizontal=12, vertical=8),
                        border_radius=14,
                        bgcolor="#0B1120",
                        border=ft.border.all(1, "#1E293B"),
                        content=ft.Row(
                            spacing=8,
                            controls=[
                                self.status_dot,
                                self.status_text,
                                ft.Text("•", color="#475569"),
                                self.latency_badge,
                            ],
                        ),
                    ),
                ],
            ),
        )

        self.page.add(
            ft.Column(
                spacing=18,
                expand=True,
                controls=[
                    header,
                    system_stats_tile,
                    ft.Row(
                        spacing=18,
                        controls=[
                            quick_note_tile,
                            ipc_control_tile,
                        ],
                    ),
                ],
            )
        )

    def _on_note_edited(self, _e: Any) -> None:
        self.note_dirty = True
        self.note_save_status.value = "Есть несохраненные изменения (нажмите «Сохранить в ядро»)"
        self.note_save_status.color = "#F59E0B"
        self.page.update()

    def _save_note_to_core(self, _e: Any) -> None:
        text_to_save = self.note_input.value or ""
        try:
            resp = self.ipc.call("widgets.update_note", {"text": text_to_save})
            note_info = resp.get("result", {}).get("note", {})
            rev = note_info.get("revision", 1)
            self.note_dirty = False
            self.note_meta_text.value = f"Ревизия #{rev} • Сохранено в памяти ядра ({len(text_to_save)} симв.)"
            self.note_save_status.value = f"Сохранено в ядро ({resp['latency_ms']} ms)"
            self.note_save_status.color = "#10B981"
        except Exception as exc:
            self.note_save_status.value = f"Ошибка сохранения: {exc}"
            self.note_save_status.color = "#F43F5E"
        self.page.update()

    def _poll_once(self) -> None:
        """Выполняет один запрос `widgets.get_all` к ядру Luma Beta и обновляет карточки."""
        try:
            resp = self.ipc.call("widgets.get_all")
            widgets = resp.get("result", {})
            latency = resp.get("latency_ms", 0.0)
            self.poll_count += 1

            self.status_dot.bgcolor = "#10B981"
            self.status_text.value = f"Онлайн: {IPC_HOST}:{IPC_PORT}"
            self.status_text.color = "#A7F3D0"
            self.latency_badge.value = f"RTT: {latency} ms"
            self.ipc_counter_text.value = f"Пакеты JSON-RPC: {self.poll_count}"
            self.last_sync_text.value = f"Последний ответ: {datetime.now().strftime('%H:%M:%S')}"

            # 1. Обновляем плитку SystemStatsWidget
            sys_widget = widgets.get("system_stats", {})
            sys_data = sys_widget.get("data", {})
            if sys_data:
                cpu_pct = float(sys_data.get("cpu_percent", 0.0))
                ram_pct = float(sys_data.get("ram_percent", 0.0))
                ram_used = sys_data.get("ram_used_gb", 0.0)
                ram_total = sys_data.get("ram_total_gb", 16.0)
                disk_free = sys_data.get("disk_free_gb", 0.0)
                disk_total = sys_data.get("disk_total_gb", 512.0)
                disk_pct = float(sys_data.get("disk_percent", 0.0))
                core_rss = sys_data.get("core_rss_mb", 14.2)
                uptime = sys_data.get("uptime_sec", 0)

                self.tile_stats_title.value = sys_widget.get("title", "Системные ресурсы")
                self.cpu_value_text.value = f"{cpu_pct:.1f}%"
                self.cpu_bar.value = max(0.0, min(1.0, cpu_pct / 100.0))
                self.cpu_sub_text.value = "Нормальная нагрузка" if cpu_pct < 75 else "Высокая нагрузка ЦП!"

                self.ram_value_text.value = f"{ram_pct:.1f}%"
                self.ram_bar.value = max(0.0, min(1.0, ram_pct / 100.0))
                self.ram_sub_text.value = f"Занято: {ram_used} / {ram_total} ГБ"

                self.disk_value_text.value = f"{disk_free} ГБ"
                self.disk_bar.value = max(0.0, min(1.0, disk_pct / 100.0))
                self.disk_sub_text.value = f"Свободно из {disk_total} ГБ ({100.0 - disk_pct:.1f}%)"

                self.core_footprint_text.value = (
                    f"Потребление ядра Luma: {core_rss} МБ RAM • Uptime демона: {uptime} сек"
                )

            # 2. Обновляем плитку QuickNoteWidget (если пользователь сейчас не печатает текст)
            note_widget = widgets.get("quick_note", {})
            note_data = note_widget.get("data", {})
            if note_data and not self.note_dirty:
                server_text = str(note_data.get("text", ""))
                rev = note_data.get("revision", 1)
                if self.note_input.value != server_text:
                    self.note_input.value = server_text
                self.note_title_text.value = note_widget.get("title", "Быстрая заметка (Память ядра)")
                self.note_meta_text.value = (
                    f"Ревизия #{rev} • В памяти ядра ({note_data.get('char_count', len(server_text))} симв.)"
                )

        except Exception as exc:
            self.status_dot.bgcolor = "#F43F5E"
            self.status_text.value = f"Ожидание ядра ({IPC_HOST}:{IPC_PORT})..."
            self.status_text.color = "#FDA4AF"
            self.latency_badge.value = "Офлайн"
            self.last_sync_text.value = f"Ошибка IPC: {exc}"

        try:
            self.page.update()
        except Exception:
            pass

    def _start_polling_thread(self) -> None:
        """Фоновый daemon-поток опроса ядра каждую 1 секунду."""

        def _loop() -> None:
            while self.running:
                self._poll_once()
                time.sleep(POLL_INTERVAL_SEC)

        thread = threading.Thread(target=_loop, daemon=True)
        thread.start()


def main(page: ft.Page) -> None:
    LumaTilesDashboardApp(page)


if __name__ == "__main__":
    ft.app(target=main)
