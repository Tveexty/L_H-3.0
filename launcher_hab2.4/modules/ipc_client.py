#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Единый модуль межпроцессной связи IPCClient (modules/ipc_client.py)
===================================================================
Связывает графические клиенты (Launcher Hub 2.9 и Дашборд плиток Flet)
с независимым фоновым ядром Luma Beta по TCP-сокету 127.0.0.1:49215 (JSON-RPC 2.0).

Возможности:
  - Автоматическая проверка и скрытый автозапуск ядра (`ensure_core_running`)
    через `subprocess.Popen` с флагом `CREATE_NO_WINDOW` на Windows.
  - Потокобезопасные вызовы всех методов JSON-RPC 2.0 (`ping`, `system.get_stats`,
    `apps.launch`, `apps.list`, `widgets.get_all`, `widgets.update`, `core.status`, `core.shutdown`).
  - Запуск Третьего окна (`ui_tiles_dashboard.py`) отдельным независимым процессом.
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
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("LauncherHub.IPCClient")

DEFAULT_IPC_HOST = "127.0.0.1"
DEFAULT_IPC_PORT = 49215


class IPCClient:
    """Единый клиент JSON-RPC 2.0 для связи UI с фоновым ядром Luma Beta 2.9."""

    def __init__(
        self,
        host: str = DEFAULT_IPC_HOST,
        port: int = DEFAULT_IPC_PORT,
        timeout: float = 1.5,
        auto_start_core: bool = True,
    ) -> None:
        self.host = host
        self.port = port
        self.timeout = timeout
        self.auto_start_core = auto_start_core
        self._req_id = 0
        self._lock = threading.Lock()
        self.last_latency_ms: float = 0.0
        self.is_connected: bool = False

    def _find_luma_core_script(self) -> Optional[Path]:
        """Ищет скрипт `luma_core.py` независимо от текущей рабочей директории."""
        this_file = Path(__file__).resolve()
        candidates = [
            this_file.parent.parent.parent / "Luma_Core" / "luma_core.py",
            this_file.parent.parent / "Luma_Core" / "luma_core.py",
            this_file.parent.parent / "luma_core.py",
            Path.cwd() / "Luma_Core" / "luma_core.py",
            Path.cwd().parent / "Luma_Core" / "luma_core.py",
        ]
        for candidate in candidates:
            if candidate.exists() and candidate.is_file():
                return candidate
        return None

    def _find_tiles_dashboard_script(self) -> Optional[Path]:
        """Ищет скрипт Третьего окна `ui_tiles_dashboard.py`."""
        this_file = Path(__file__).resolve()
        candidates = [
            this_file.parent.parent / "ui_tiles_dashboard.py",
            this_file.parent.parent.parent / "Luma_Core" / "ui_tiles_dashboard.py",
            Path.cwd() / "ui_tiles_dashboard.py",
            Path.cwd() / "Luma_Core" / "ui_tiles_dashboard.py",
        ]
        for candidate in candidates:
            if candidate.exists() and candidate.is_file():
                return candidate
        return None

    def is_core_alive(self) -> bool:
        """Быстрая проверка доступности сокета 127.0.0.1:49215."""
        try:
            res = self.call("ping", auto_spawn=False)
            ok = bool(res.get("pong") or res.get("status") == "online")
            self.is_connected = ok
            return ok
        except Exception:
            self.is_connected = False
            return False

    def ensure_core_running(self) -> bool:
        """
        Проверяет, запущено ли фоновое ядро Luma Beta на 127.0.0.1:49215.
        Если нет — автоматически запускает `luma_core.py` в скрытом процессе
        (с флагом `CREATE_NO_WINDOW` на Windows).
        """
        if self.is_core_alive():
            return True

        core_script = self._find_luma_core_script()
        if core_script is None:
            logger.warning("IPCClient: файл luma_core.py не найден для автозапуска.")
            return False

        try:
            creation_flags = 0
            if platform.system() == "Windows":
                create_no_window = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)
                detached_process = getattr(subprocess, "DETACHED_PROCESS", 0x00000008)
                creation_flags = create_no_window | detached_process

            cmd = [
                sys.executable,
                str(core_script),
                "--host",
                self.host,
                "--port",
                str(self.port),
            ]
            subprocess.Popen(
                cmd,
                cwd=str(core_script.parent),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
                creationflags=creation_flags,
                start_new_session=(platform.system() != "Windows"),
            )
            logger.info("IPCClient: фоновое ядро Luma Beta запущено (%s)", core_script)

            # Ожидаем готовности TCP-сокета до 2.0 секунд
            for _ in range(20):
                time.sleep(0.1)
                if self.is_core_alive():
                    return True
        except Exception as exc:
            logger.error("IPCClient: не удалось автоматически запустить ядро Luma Beta: %s", exc)

        return False

    def call_raw(
        self,
        method: str,
        params: Optional[Dict[str, Any]] = None,
        auto_spawn: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """
        Выполняет JSON-RPC 2.0 запрос к 127.0.0.1:49215 и возвращает полный ответ
        вместе с измеренной задержкой `latency_ms`.
        """
        should_spawn = self.auto_start_core if auto_spawn is None else auto_spawn

        with self._lock:
            self._req_id += 1
            req_id = self._req_id

        request_obj = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {},
            "id": req_id,
        }
        raw_bytes = (json.dumps(request_obj, ensure_ascii=False) + "\n").encode("utf-8")

        for attempt in range(2):
            try:
                t0 = time.perf_counter()
                with socket.create_connection((self.host, self.port), timeout=self.timeout) as sock:
                    sock.sendall(raw_bytes)
                    buffer = b""
                    while b"\n" not in buffer:
                        chunk = sock.recv(16384)
                        if not chunk:
                            break
                        buffer += chunk

                latency_ms = round((time.perf_counter() - t0) * 1000.0, 2)
                self.last_latency_ms = latency_ms
                self.is_connected = True

                if not buffer:
                    raise ConnectionError("Пустой ответ от сокета Luma Beta")

                parsed = json.loads(buffer.decode("utf-8", errors="replace").strip())
                if "error" in parsed and parsed["error"]:
                    err_msg = parsed["error"].get("message", "Unknown JSON-RPC Error")
                    raise RuntimeError(err_msg)

                return {
                    "jsonrpc": "2.0",
                    "result": parsed.get("result", {}),
                    "id": parsed.get("id", req_id),
                    "latency_ms": latency_ms,
                }
            except Exception as exc:
                self.is_connected = False
                if attempt == 0 and should_spawn and method != "core.shutdown":
                    if self.ensure_core_running():
                        continue
                raise ConnectionError(f"IPC ({self.host}:{self.port}) недоступен: {exc}") from exc

        raise ConnectionError(f"Не удалось выполнить метод {method}")

    def call(
        self,
        method: str,
        params: Optional[Dict[str, Any]] = None,
        auto_spawn: Optional[bool] = None,
    ) -> Any:
        """Возвращает поле `result` из ответа JSON-RPC 2.0."""
        resp = self.call_raw(method=method, params=params, auto_spawn=auto_spawn)
        return resp.get("result", {})

    # ------------------------------------------------------------------------
    # Удобные высокоуровневые методы для UI
    # ------------------------------------------------------------------------
    def ping(self) -> Dict[str, Any]:
        return self.call("ping")

    def get_system_stats(self) -> Dict[str, Any]:
        return self.call("system.get_stats")

    def get_all_widgets(self) -> Dict[str, Dict[str, Any]]:
        return self.call("widgets.get_all")

    def update_widget(self, widget_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        payload = {"widget_id": widget_id, **data}
        return self.call("widgets.update", payload)

    def update_note(self, text: str) -> Dict[str, Any]:
        return self.call("widgets.update_note", {"text": text})

    def list_apps(self) -> List[Dict[str, Any]]:
        res = self.call("apps.list")
        return res if isinstance(res, list) else []

    def launch_app(self, app_id: str = "", command: str = "", name: str = "") -> Dict[str, Any]:
        return self.call("apps.launch", {"app_id": app_id, "command": command, "name": name})

    def get_core_status(self) -> Dict[str, Any]:
        return self.call("core.status")

    def shutdown_core(self) -> Dict[str, Any]:
        return self.call("core.shutdown", auto_spawn=False)

    def launch_tiles_dashboard(self) -> bool:
        """Запускает Третье окно (`ui_tiles_dashboard.py`) отдельным процессом Flet."""
        self.ensure_core_running()
        script = self._find_tiles_dashboard_script()
        if script is None:
            logger.error("Не найден скрипт ui_tiles_dashboard.py")
            return False
        try:
            subprocess.Popen(
                [sys.executable, str(script)],
                cwd=str(script.parent),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
            )
            return True
        except Exception as exc:
            logger.error("Ошибка запуска ui_tiles_dashboard.py: %s", exc)
            return False
