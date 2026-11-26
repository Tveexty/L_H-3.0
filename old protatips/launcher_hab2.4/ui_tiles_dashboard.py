#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Luma Beta 2.9 — Третье окно: Дашборд интерактивных плиток (ui_tiles_dashboard.py)
=================================================================================
Графический интерфейс на Flet в стилистике Windows Live Tiles / Android 15 Dashboards:
  - Сетка разноразмерных плиток:
      * [2x1 Широкая]  Системный монитор (CPU %, RAM %, Свободное место на диске)
      * [2x2 Большая]  Время, Аптайм, Погода (Offline-Safe) + Быстрый запуск избранных программ
      * [1x1 Компакт]  Аудио-контроллер (Управление громкостью + Mute через ядро)
      * [2x1 Широкая]  Быстрые заметки и чек-лист задач (UTF-8 JSON-кэш в ядре)
  - Стекломорфизм (Glassmorphism), мягкие тени, скругления 24px, акцентные прогресс-бары.
  - Фоновый поток опроса ядра каждые 1.5 секунды по JSON-RPC 2.0 (127.0.0.1:49215).
  - При закрытии окна процесс Flet полностью завершается (`os._exit(0)`) и освобождает ОЗУ,
    не роняя работающее фоновое ядро Luma Beta.
"""

from __future__ import annotations

import json
import logging
import os
import platform
import socket
import subprocess
import sys
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import flet as ft

IPC_HOST = "127.0.0.1"
IPC_PORT = 49215
POLL_INTERVAL_SEC = 1.5

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-5s | TilesDashboard | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("TilesDashboard")

ICONS = getattr(ft, "Icons", getattr(ft, "icons", None))


def _icon(name: str, fallback: str = "widgets"):
    if ICONS is None:
        return name.lower()
    return getattr(ICONS, name, getattr(ICONS, name.lower(), getattr(ICONS, fallback, name.lower())))


class DashboardIPCClient:
    """Клиент JSON-RPC 2.0 к 127.0.0.1:49215 с автоматическим скрытым запуском ядра."""

    def __init__(self, host: str = IPC_HOST, port: int = IPC_PORT, timeout: float = 1.5) -> None:
        self.host = host
        self.port = port
        self.timeout = timeout
        self._req_id = 0
        self._lock = threading.Lock()

    def _find_core_script(self) -> Optional[Path]:
        here = Path(__file__).resolve().parent
        candidates = [
            here / "luma_core.py",
            here / "Luma_Core" / "luma_core.py",
            here.parent / "Luma_Core" / "luma_core.py",
            Path.cwd() / "Luma_Core" / "luma_core.py",
        ]
        for c in candidates:
            if c.exists() and c.is_file():
                return c
        return None

    def ensure_core_running(self) -> bool:
        try:
            self.call("ping", auto_spawn=False)
            return True
        except Exception:
            pass

        script = self._find_core_script()
        if script is None:
            return False

        try:
            flags = 0
            if platform.system() == "Windows":
                flags = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000) | getattr(
                    subprocess, "DETACHED_PROCESS", 0x00000008
                )
            subprocess.Popen(
                [sys.executable, str(script), "--host", self.host, "--port", str(self.port)],
                cwd=str(script.parent),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
                creationflags=flags,
                start_new_session=(platform.system() != "Windows"),
            )
            for _ in range(18):
                time.sleep(0.1)
                try:
                    self.call("ping", auto_spawn=False)
                    return True
                except Exception:
                    continue
        except Exception as exc:
            logger.error("Не удалось запустить luma_core.py: %s", exc)
        return False

    def call(
        self,
        method: str,
        params: Optional[Dict[str, Any]] = None,
        auto_spawn: bool = True,
    ) -> Dict[str, Any]:
        with self._lock:
            self._req_id += 1
            req_id = self._req_id

        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {},
            "id": req_id,
        }
        raw = (json.dumps(payload, ensure_ascii=False) + "\n").encode("utf-8")

        for attempt in range(2):
            try:
                t0 = time.perf_counter()
                with socket.create_connection((self.host, self.port), timeout=self.timeout) as sock:
                    sock.sendall(raw)
                    buf = b""
                    while b"\n" not in buf:
                        chunk = sock.recv(16384)
                        if not chunk:
                            break
                        buf += chunk
                latency_ms = round((time.perf_counter() - t0) * 1000.0, 2)
                if not buf:
                    raise ConnectionError("Пустой ответ от ядра")
                parsed = json.loads(buf.decode("utf-8", errors="replace").strip())
                if "error" in parsed and parsed["error"]:
                    raise RuntimeError(parsed["error"].get("message", "RPC Error"))
                return {
                    "result": parsed.get("result", {}),
                    "latency_ms": latency_ms,
                    "id": parsed.get("id", req_id),
                }
            except Exception as exc:
                if attempt == 0 and auto_spawn:
                    if self.ensure_core_running():
                        continue
                raise ConnectionError(str(exc)) from exc
        raise ConnectionError("IPC недоступен")


class LumaTilesDashboardApp:
    def __init__(self, page: ft.Page) -> None:
        self.page = page
        self.ipc = DashboardIPCClient(IPC_HOST, IPC_PORT)
        self.running = True
        self.poll_count = 0
        self.note_dirty = False
        self.quick_apps: List[Dict[str, Any]] = []

        self.ipc.ensure_core_running()
        self._configure_window()
        self._build_ui()
        self._load_quick_apps()
        self._start_polling_thread()

    def _configure_window(self) -> None:
        self.page.title = "Luma Beta 2.9 — Live Tiles Dashboard (127.0.0.1:49215)"
        self.page.bgcolor = "#070B14"
        self.page.padding = 20
        self.page.theme_mode = ft.ThemeMode.DARK

        if hasattr(self.page, "window") and self.page.window is not None:
            try:
                self.page.window.width = 1120
                self.page.window.height = 760
                self.page.window.min_width = 920
                self.page.window.min_height = 640
                self.page.window.prevent_close = False
                self.page.window.on_event = self._on_window_event
            except Exception:
                pass
        try:
            self.page.window_width = 1120
            self.page.window_height = 760
            self.page.on_window_event = self._on_window_event
        except Exception:
            pass

    def _terminate_gui_only(self, *_args: Any) -> None:
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
        if getattr(e, "data", "") in ("close", "terminate", "unload"):
            self._terminate_gui_only()

    def _glass_tile(
        self,
        content: ft.Control,
        border_color: str = "#1E293B",
        glow_color: str = "#0F172A",
        expand: Optional[int] = None,
    ) -> ft.Container:
        return ft.Container(
            expand=expand,
            padding=20,
            border_radius=24,
            bgcolor="#111827",
            border=ft.border.all(1.2, border_color),
            shadow=ft.BoxShadow(
                spread_radius=0,
                blur_radius=24,
                color=glow_color,
                offset=ft.Offset(0, 8),
            ),
            content=content,
        )

    def _build_ui(self) -> None:
        self.status_dot = ft.Container(width=10, height=10, border_radius=5, bgcolor="#10B981")
        self.status_text = ft.Text(
            f"Luma Core 2.9 Онлайн ({IPC_HOST}:{IPC_PORT})",
            size=12,
            color="#A7F3D0",
            weight="w600",
        )
        self.latency_badge = ft.Text("RTT: -- ms", size=11, color="#94A3B8")

        self.cpu_value_text = ft.Text("--%", size=28, weight="bold", color="#38BDF8")
        self.cpu_bar = ft.ProgressBar(value=0.0, color="#38BDF8", bgcolor="#1E293B", height=8)
        self.cpu_sub_text = ft.Text("Нагрузка ЦП", size=11, color="#94A3B8")

        self.ram_value_text = ft.Text("--%", size=28, weight="bold", color="#A855F7")
        self.ram_bar = ft.ProgressBar(value=0.0, color="#A855F7", bgcolor="#1E293B", height=8)
        self.ram_sub_text = ft.Text("ОЗУ: -- / -- ГБ", size=11, color="#94A3B8")

        self.disk_value_text = ft.Text("-- ГБ", size=28, weight="bold", color="#10B981")
        self.disk_bar = ft.ProgressBar(value=0.0, color="#10B981", bgcolor="#1E293B", height=8)
        self.disk_sub_text = ft.Text("Свободно на диске", size=11, color="#94A3B8")

        self.core_footprint_text = ft.Text(
            "Память ядра Luma: ~14.2 МБ RAM • Uptime: 0 с",
            size=11,
            color="#64748B",
        )

        tile_system_2x1 = self._glass_tile(
            expand=3,
            border_color="#1E3A5F",
            glow_color="#0B192C",
            content=ft.Column(
                spacing=14,
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
                                        spacing=1,
                                        controls=[
                                            ft.Text(
                                                "Системный монитор (CPU / RAM / Диски)",
                                                size=15,
                                                weight="bold",
                                                color="#F8FAFC",
                                            ),
                                            ft.Text(
                                                "SystemStatsWidget • Живая телеметрия ядра",
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
                                border=ft.border.all(1, "#0284C7"),
                                content=ft.Text("2x1 WIDE TILE", size=10, color="#38BDF8", weight="bold"),
                            ),
                        ],
                    ),
                    ft.Row(
                        spacing=12,
                        controls=[
                            ft.Container(
                                expand=1,
                                padding=14,
                                border_radius=16,
                                bgcolor="#0B1120",
                                border=ft.border.all(1, "#1E293B"),
                                content=ft.Column(
                                    spacing=6,
                                    controls=[
                                        ft.Text("CPU LOAD", size=10, color="#38BDF8", weight="bold"),
                                        self.cpu_value_text,
                                        self.cpu_bar,
                                        self.cpu_sub_text,
                                    ],
                                ),
                            ),
                            ft.Container(
                                expand=1,
                                padding=14,
                                border_radius=16,
                                bgcolor="#0B1120",
                                border=ft.border.all(1, "#1E293B"),
                                content=ft.Column(
                                    spacing=6,
                                    controls=[
                                        ft.Text("RAM USAGE", size=10, color="#A855F7", weight="bold"),
                                        self.ram_value_text,
                                        self.ram_bar,
                                        self.ram_sub_text,
                                    ],
                                ),
                            ),
                            ft.Container(
                                expand=1,
                                padding=14,
                                border_radius=16,
                                bgcolor="#0B1120",
                                border=ft.border.all(1, "#1E293B"),
                                content=ft.Column(
                                    spacing=6,
                                    controls=[
                                        ft.Text("DISK FREE", size=10, color="#10B981", weight="bold"),
                                        self.disk_value_text,
                                        self.disk_bar,
                                        self.disk_sub_text,
                                    ],
                                ),
                            ),
                        ],
                    ),
                    self.core_footprint_text,
                ],
            ),
        )

        self.audio_vol_text = ft.Text("68%", size=26, weight="bold", color="#EC4899")
        self.audio_device_text = ft.Text("System Master Audio (WASAPI)", size=11, color="#94A3B8")
        self.audio_mute_btn = ft.ElevatedButton(
            text="Звук ВКЛ",
            icon=_icon("VOLUME_UP", "volume_up"),
            bgcolor="#BE185D",
            color="#FFFFFF",
            on_click=self._toggle_audio_mute,
        )
        self.audio_slider = ft.Slider(
            min=0,
            max=100,
            divisions=20,
            value=68,
            active_color="#EC4899",
            on_change_end=self._on_audio_slider_change,
        )

        tile_audio_1x1 = self._glass_tile(
            expand=2,
            border_color="#4C1D95",
            glow_color="#1E1035",
            content=ft.Column(
                spacing=10,
                controls=[
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Row(
                                spacing=8,
                                controls=[
                                    ft.Container(
                                        width=34,
                                        height=34,
                                        border_radius=10,
                                        bgcolor="#DB2777",
                                        alignment=ft.alignment.center,
                                        content=ft.Icon(_icon("VOLUME_UP", "volume_up"), color="#FFFFFF", size=18),
                                    ),
                                    ft.Column(
                                        spacing=1,
                                        controls=[
                                            ft.Text("Аудио-микшер ядра", size=14, weight="bold", color="#F8FAFC"),
                                            self.audio_device_text,
                                        ],
                                    ),
                                ],
                            ),
                            ft.Container(
                                padding=ft.padding.symmetric(horizontal=8, vertical=3),
                                border_radius=8,
                                bgcolor="#0F172A",
                                border=ft.border.all(1, "#DB2777"),
                                content=ft.Text("1x1 COMPACT", size=10, color="#F472B6", weight="bold"),
                            ),
                        ],
                    ),
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            self.audio_vol_text,
                            self.audio_mute_btn,
                        ],
                    ),
                    self.audio_slider,
                    ft.Text("Синхронизация через widgets.update (audio_widget)", size=10, color="#64748B"),
                ],
            ),
        )

        self.clock_big_text = ft.Text(datetime.now().strftime("%H:%M:%S"), size=32, weight="bold", color="#F8FAFC")
        self.date_sub_text = ft.Text(datetime.now().strftime("%d.%m.%Y • Понедельник"), size=12, color="#38BDF8")
        self.uptime_info_text = ft.Text("Uptime ОС: -- • Uptime ядра: --", size=11, color="#94A3B8")
        self.weather_info_text = ft.Text("☀️ Москва: +19°C • Переменная облачность (Offline-Safe)", size=12, color="#A7F3D0")
        self.quick_apps_wrap = ft.Row(spacing=8, run_spacing=8, wrap=True)
        self.launch_status_text = ft.Text("Нажмите на плитку программы для запуска через ядро (apps.launch)", size=11, color="#64748B")

        tile_weather_apps_2x2 = self._glass_tile(
            expand=3,
            border_color="#065F46",
            glow_color="#052E24",
            content=ft.Column(
                spacing=12,
                controls=[
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Column(
                                spacing=2,
                                controls=[
                                    self.clock_big_text,
                                    self.date_sub_text,
                                    self.uptime_info_text,
                                ],
                            ),
                            ft.Column(
                                horizontal_alignment=ft.CrossAxisAlignment.END,
                                spacing=4,
                                controls=[
                                    ft.Container(
                                        padding=ft.padding.symmetric(horizontal=10, vertical=4),
                                        border_radius=10,
                                        bgcolor="#0F172A",
                                        border=ft.border.all(1, "#10B981"),
                                        content=ft.Text("2x2 LARGE TILE", size=10, color="#34D399", weight="bold"),
                                    ),
                                    self.weather_info_text,
                                ],
                            ),
                        ],
                    ),
                    ft.Divider(height=1, color="#1E293B"),
                    ft.Text("🚀 Быстрый запуск избранных программ (IPC apps.launch):", size=12, weight="bold", color="#E2E8F0"),
                    self.quick_apps_wrap,
                    self.launch_status_text,
                ],
            ),
        )

        self.note_meta_text = ft.Text("Ревизия #1 • JSON-кэш UTF-8 (luma_notes_cache.json)", size=11, color="#F59E0B")
        self.note_input = ft.TextField(
            multiline=True,
            min_lines=4,
            max_lines=5,
            hint_text="Введите быструю заметку — она атомарно сохранится в JSON-кэше ядра...",
            bgcolor="#0B1120",
            border_color="#334155",
            focused_border_color="#F59E0B",
            border_radius=14,
            text_size=13,
            color="#F1F5F9",
            on_change=self._on_note_edited,
        )
        self.note_save_status = ft.Text("Синхронизировано с JSON-кэшем ядра", size=11, color="#10B981")

        tile_notes_2x1 = self._glass_tile(
            expand=2,
            border_color="#78350F",
            glow_color="#271306",
            content=ft.Column(
                spacing=10,
                controls=[
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Row(
                                spacing=8,
                                controls=[
                                    ft.Container(
                                        width=34,
                                        height=34,
                                        border_radius=10,
                                        bgcolor="#D97706",
                                        alignment=ft.alignment.center,
                                        content=ft.Icon(_icon("EDIT_NOTE", "edit"), color="#FFFFFF", size=18),
                                    ),
                                    ft.Column(
                                        spacing=1,
                                        controls=[
                                            ft.Text("Быстрые заметки (Кэш ядра)", size=14, weight="bold", color="#F8FAFC"),
                                            self.note_meta_text,
                                        ],
                                    ),
                                ],
                            ),
                            ft.Container(
                                padding=ft.padding.symmetric(horizontal=8, vertical=3),
                                border_radius=8,
                                bgcolor="#0F172A",
                                border=ft.border.all(1, "#F59E0B"),
                                content=ft.Text("2x1 NOTE TILE", size=10, color="#FBBF24", weight="bold"),
                            ),
                        ],
                    ),
                    self.note_input,
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            self.note_save_status,
                            ft.ElevatedButton(
                                text="Сохранить в ядро",
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

        header = ft.Container(
            padding=ft.padding.symmetric(horizontal=20, vertical=12),
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
                                spacing=1,
                                controls=[
                                    ft.Text(
                                        "Launcher Hub 2.9 • Luma Beta Live Tiles Dashboard",
                                        size=16,
                                        weight="bold",
                                        color="#F8FAFC",
                                    ),
                                    ft.Text(
                                        "Стекломорфизм • Плитки 1x1 / 2x1 / 2x2 • JSON-RPC 2.0 (127.0.0.1:49215)",
                                        size=11,
                                        color="#94A3B8",
                                    ),
                                ],
                            ),
                        ],
                    ),
                    ft.Row(
                        spacing=12,
                        controls=[
                            ft.Container(
                                padding=ft.padding.symmetric(horizontal=12, vertical=7),
                                border_radius=12,
                                bgcolor="#0B1120",
                                border=ft.border.all(1, "#1E293B"),
                                content=ft.Row(
                                    spacing=8,
                                    controls=[self.status_dot, self.status_text, ft.Text("•", color="#475569"), self.latency_badge],
                                ),
                            ),
                            ft.ElevatedButton(
                                text="Закрыть дашборд (Ядро в фоне)",
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

        self.page.add(
            ft.Column(
                spacing=16,
                expand=True,
                scroll=ft.ScrollMode.ADAPTIVE,
                controls=[
                    header,
                    ft.Row(spacing=16, controls=[tile_system_2x1, tile_audio_1x1]),
                    ft.Row(spacing=16, controls=[tile_weather_apps_2x2, tile_notes_2x1]),
                ],
            )
        )

    def _load_quick_apps(self) -> None:
        try:
            resp = self.ipc.call("apps.list")
            apps = resp.get("result", [])
            if isinstance(apps, list):
                self.quick_apps = apps
                self._rebuild_quick_apps_buttons()
        except Exception as exc:
            logger.debug("Не удалось загрузить apps.list: %s", exc)

    def _rebuild_quick_apps_buttons(self) -> None:
        self.quick_apps_wrap.controls.clear()
        for app in self.quick_apps:
            app_id = str(app.get("id", ""))
            app_name = str(app.get("name", app_id))
            self.quick_apps_wrap.controls.append(
                ft.ElevatedButton(
                    text=app_name,
                    icon=_icon("ROCKET_LAUNCH", "play_arrow"),
                    bgcolor="#1E293B",
                    color="#38BDF8",
                    on_click=lambda _e, aid=app_id, aname=app_name: self._launch_quick_app(aid, aname),
                )
            )

    def _launch_quick_app(self, app_id: str, app_name: str) -> None:
        try:
            res = self.ipc.call("apps.launch", {"app_id": app_id, "name": app_name})
            info = res.get("result", {})
            self.launch_status_text.value = f"✅ Запущено через ядро Luma: {app_name} (статус: {info.get('status', 'ok')})"
            self.launch_status_text.color = "#10B981"
        except Exception as exc:
            self.launch_status_text.value = f"❌ Ошибка запуска {app_name}: {exc}"
            self.launch_status_text.color = "#F43F5E"
        self.page.update()

    def _toggle_audio_mute(self, _e: Any) -> None:
        try:
            res = self.ipc.call("widgets.update", {"widget_id": "audio_widget", "toggle_mute": True})
            st = res.get("result", {}).get("state", {})
            muted = bool(st.get("muted", False))
            self.audio_mute_btn.text = "БЕЗ ЗВУКА (MUTE)" if muted else "Звук ВКЛ"
            self.audio_mute_btn.bgcolor = "#64748B" if muted else "#BE185D"
            self.page.update()
        except Exception as exc:
            logger.error("Ошибка переключения Mute: %s", exc)

    def _on_audio_slider_change(self, e: Any) -> None:
        val = int(float(e.control.value or 0))
        try:
            self.ipc.call("widgets.update", {"widget_id": "audio_widget", "volume": val})
            self.audio_vol_text.value = f"{val}%"
            self.page.update()
        except Exception as exc:
            logger.error("Ошибка изменения громкости: %s", exc)

    def _on_note_edited(self, _e: Any) -> None:
        self.note_dirty = True
        self.note_save_status.value = "Не сохранено — нажмите «Сохранить в ядро»"
        self.note_save_status.color = "#F59E0B"
        self.page.update()

    def _save_note_to_core(self, _e: Any) -> None:
        text_val = self.note_input.value or ""
        try:
            resp = self.ipc.call("widgets.update", {"widget_id": "quick_note", "text": text_val})
            st = resp.get("result", {}).get("state", {})
            rev = st.get("revision", 1)
            self.note_dirty = False
            self.note_meta_text.value = f"Ревизия #{rev} • Сохранено в UTF-8 JSON-кэш ({len(text_val)} симв.)"
            self.note_save_status.value = f"Сохранено в ядро ({resp['latency_ms']} ms)"
            self.note_save_status.color = "#10B981"
        except Exception as exc:
            self.note_save_status.value = f"Ошибка сохранения: {exc}"
            self.note_save_status.color = "#F43F5E"
        self.page.update()

    def _poll_once(self) -> None:
        try:
            resp = self.ipc.call("widgets.get_all")
            widgets = resp.get("result", {})
            latency = resp.get("latency_ms", 0.0)
            self.poll_count += 1

            self.status_dot.bgcolor = "#10B981"
            self.status_text.value = f"Luma Core 2.9 Онлайн ({IPC_HOST}:{IPC_PORT})"
            self.latency_badge.value = f"RTT: {latency} ms"

            sys_data = widgets.get("system_stats", {}).get("data", {})
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

                self.cpu_value_text.value = f"{cpu_pct:.1f}%"
                self.cpu_bar.value = max(0.0, min(1.0, cpu_pct / 100.0))
                self.ram_value_text.value = f"{ram_pct:.1f}%"
                self.ram_bar.value = max(0.0, min(1.0, ram_pct / 100.0))
                self.ram_sub_text.value = f"ОЗУ: {ram_used} / {ram_total} ГБ"
                self.disk_value_text.value = f"{disk_free} ГБ"
                self.disk_bar.value = max(0.0, min(1.0, disk_pct / 100.0))
                self.disk_sub_text.value = f"Свободно из {disk_total} ГБ"
                self.core_footprint_text.value = (
                    f"Потребление ядра Luma: {core_rss} МБ RAM • Uptime демона: {uptime} сек • Опросов: {self.poll_count}"
                )

            audio_data = widgets.get("audio_widget", {}).get("data", {})
            if audio_data:
                vol = int(audio_data.get("volume", 68))
                muted = bool(audio_data.get("muted", False))
                self.audio_vol_text.value = "MUTE" if muted else f"{vol}%"
                self.audio_slider.value = vol
                self.audio_mute_btn.text = "БЕЗ ЗВУКА (MUTE)" if muted else "Звук ВКЛ"
                self.audio_mute_btn.bgcolor = "#64748B" if muted else "#BE185D"

            tw_data = widgets.get("time_weather", {}).get("data", {})
            if tw_data:
                self.clock_big_text.value = str(tw_data.get("time_str", datetime.now().strftime("%H:%M:%S")))
                self.date_sub_text.value = f"{tw_data.get('date_str', '')} • {tw_data.get('weekday', '')}"
                self.uptime_info_text.value = (
                    f"Uptime ОС: {tw_data.get('os_uptime_human', '--')} • Uptime ядра: {tw_data.get('core_uptime_human', '--')}"
                )
                w = tw_data.get("weather", {})
                if isinstance(w, dict):
                    self.weather_info_text.value = (
                        f"☀️ {w.get('city', 'Москва')}: +{w.get('temp_c', 19)}°C • {w.get('condition', '')} (Влажн. {w.get('humidity', 50)}%)"
                    )

            note_data = widgets.get("quick_note", {}).get("data", {})
            if note_data and not self.note_dirty:
                server_text = str(note_data.get("text", ""))
                rev = note_data.get("revision", 1)
                if self.note_input.value != server_text:
                    self.note_input.value = server_text
                self.note_meta_text.value = f"Ревизия #{rev} • В JSON-кэше ядра ({len(server_text)} симв.)"

        except Exception as exc:
            self.status_dot.bgcolor = "#F43F5E"
            self.status_text.value = f"Переподключение к ядру ({IPC_HOST}:{IPC_PORT})..."
            self.latency_badge.value = f"Офлайн ({exc})"

        try:
            self.page.update()
        except Exception:
            pass

    def _start_polling_thread(self) -> None:
        def _loop() -> None:
            while self.running:
                self._poll_once()
                time.sleep(POLL_INTERVAL_SEC)

        threading.Thread(target=_loop, daemon=True).start()


def main(page: ft.Page) -> None:
    LumaTilesDashboardApp(page)


if __name__ == "__main__":
    ft.app(target=main)
