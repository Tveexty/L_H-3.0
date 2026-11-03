#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Единый модуль связи IPCClient для пакета Luma_Core (Luma_Core/ipc/ipc_client.py).
"""

from __future__ import annotations

import json
import logging
import platform
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("LumaCore.IPCClient")

DEFAULT_IPC_HOST = "127.0.0.1"
DEFAULT_IPC_PORT = 49215


class IPCClient:
    """Потокобезопасный клиент JSON-RPC 2.0 к сокету 127.0.0.1:49215 с автозапуском ядра."""

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
        this_file = Path(__file__).resolve()
        candidates = [
            this_file.parent.parent / "luma_core.py",
            Path.cwd() / "Luma_Core" / "luma_core.py",
            Path.cwd() / "luma_core.py",
        ]
        for candidate in candidates:
            if candidate.exists() and candidate.is_file():
                return candidate
        return None

    def is_core_alive(self) -> bool:
        try:
            res = self.call("ping", auto_spawn=False)
            ok = bool(res.get("pong") or res.get("status") == "online")
            self.is_connected = ok
            return ok
        except Exception:
            self.is_connected = False
            return False

    def ensure_core_running(self) -> bool:
        if self.is_core_alive():
            return True

        core_script = self._find_luma_core_script()
        if core_script is None:
            return False

        try:
            creation_flags = 0
            if platform.system() == "Windows":
                create_no_window = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)
                detached_process = getattr(subprocess, "DETACHED_PROCESS", 0x00000008)
                creation_flags = create_no_window | detached_process

            subprocess.Popen(
                [sys.executable, str(core_script), "--host", self.host, "--port", str(self.port)],
                cwd=str(core_script.parent),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
                creationflags=creation_flags,
                start_new_session=(platform.system() != "Windows"),
            )
            for _ in range(20):
                time.sleep(0.1)
                if self.is_core_alive():
                    return True
        except Exception as exc:
            logger.error("Ошибка автозапуска Luma Core: %s", exc)
        return False

    def call_raw(
        self,
        method: str,
        params: Optional[Dict[str, Any]] = None,
        auto_spawn: Optional[bool] = None,
    ) -> Dict[str, Any]:
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
                    raise ConnectionError("Пустой ответ от ядра Luma Beta")

                parsed = json.loads(buffer.decode("utf-8", errors="replace").strip())
                if "error" in parsed and parsed["error"]:
                    raise RuntimeError(parsed["error"].get("message", "JSON-RPC Error"))

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
        return self.call_raw(method=method, params=params, auto_spawn=auto_spawn).get("result", {})
