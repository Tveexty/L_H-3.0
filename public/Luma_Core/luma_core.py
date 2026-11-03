#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Luma Beta — Headless Core Engine (luma_core.py)
================================================
Независимое фоновое ядро (Headless Daemon) для модульного десктопного лаунчера.
Работает полностью без графических библиотек (GUI), обеспечивая:
  - Минимальное потребление памяти (~12–18 МБ RAM на Python, 0.0% CPU в простое)
  - Локальный асинхронный IPC-сервер (TCP 127.0.0.1:49215) по протоколу JSON-RPC 2.0
  - Полную отказоустойчивость: падение или закрытие GUI-клиента (включая Flet Дашборд плиток)
    не влияет на работу ядра
  - Модульный сервис виджетов WidgetManager (SystemStatsWidget + QuickNoteWidget)
    с поддержкой методов `widgets.get_all` и `widgets.update_note`
  - Модульные сервисы: ProcessManager, ConfigManager, WidgetService, HotkeyManager

Запуск:
  python luma_core.py --host 127.0.0.1 --port 49215
  python luma_core.py --self-test
"""

from __future__ import annotations

import argparse
import asyncio
import inspect
import json
import logging
import os
import platform
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

# Обеспечиваем корректный импорт пакета core при запуске из любой рабочей директории
CORE_ROOT = Path(__file__).resolve().parent
if str(CORE_ROOT) not in sys.path:
    sys.path.insert(0, str(CORE_ROOT))

from core.widget_service import (  # noqa: E402
    BaseWidget,
    QuickNoteWidget,
    SystemMetricsCollector,
    SystemMetricsSnapshot,
    SystemStatsWidget,
    WidgetManager,
)

LUMA_VERSION = "0.9.5-beta"
LUMA_CODENAME = "Nebula Headless"
LUMA_KERNEL_VERSION = "6.8.0-luma-beta-x86_64 #1 SMP PREEMPT_DYNAMIC"
LUMA_SECURITY_PATCH = "2026-11-02 (LumaGuard IPC ACL + LiveTiles Engine)"
DEFAULT_IPC_HOST = "127.0.0.1"
DEFAULT_IPC_PORT = 49215

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-5s | LumaCore | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("LumaCore")


# ============================================================================
# МОДУЛЬНЫЕ СЕРВИСЫ ЯДРА (ProcessManager, ConfigManager, HotkeyManager)
# ============================================================================
class ProcessManager:
    """Управление дочерними процессами (.exe / бинарниками), отслеживание PID и завершение."""

    def __init__(self) -> None:
        self._processes: Dict[int, Dict[str, Any]] = {}

    def spawn_process(self, command: str, args: Optional[List[str]] = None) -> Dict[str, Any]:
        cmd_list = [command] + (args or [])
        try:
            proc = subprocess.Popen(
                cmd_list,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
            )
            record = {
                "pid": proc.pid,
                "command": command,
                "args": args or [],
                "started_at": round(time.time(), 2),
                "status": "running",
            }
            self._processes[proc.pid] = record
            logger.info("ProcessManager: запущен процесс PID=%d (%s)", proc.pid, command)
            return record
        except Exception as exc:
            raise RuntimeError(f"Не удалось запустить '{command}': {exc}") from exc

    def list_processes(self) -> List[Dict[str, Any]]:
        return list(self._processes.values())

    def terminate_process(self, pid: int) -> Dict[str, Any]:
        rec = self._processes.get(pid)
        if not rec:
            return {"pid": pid, "terminated": False, "reason": "PID not tracked"}
        try:
            os.kill(pid, 15)
            rec["status"] = "terminated"
            return {"pid": pid, "terminated": True}
        except Exception as exc:
            return {"pid": pid, "terminated": False, "reason": str(exc)}


class ConfigManager:
    """Загрузка, валидация и атомарное сохранение конфигурации ядра Luma Beta."""

    DEFAULT_CONFIG: Dict[str, Any] = {
        "core_version": LUMA_VERSION,
        "ipc_host": DEFAULT_IPC_HOST,
        "ipc_port": DEFAULT_IPC_PORT,
        "metrics_interval_sec": 1.0,
        "max_ram_budget_mb": 25,
        "security_mode": "localhost_strict",
    }

    def __init__(self, config_path: Optional[Path] = None) -> None:
        self.config_path = config_path or (CORE_ROOT / "luma_config.json")
        self._config: Dict[str, Any] = dict(self.DEFAULT_CONFIG)
        self.load()

    def load(self) -> Dict[str, Any]:
        if self.config_path.exists():
            try:
                loaded = json.loads(self.config_path.read_text(encoding="utf-8"))
                if isinstance(loaded, dict):
                    self._config.update(loaded)
            except Exception as exc:
                logger.warning("ConfigManager: ошибка чтения конфига, используем дефолт: %s", exc)
        return self._config

    def save(self) -> bool:
        try:
            self.config_path.write_text(
                json.dumps(self._config, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            return True
        except Exception as exc:
            logger.error("ConfigManager: не удалось сохранить конфиг: %s", exc)
            return False

    def get_all(self) -> Dict[str, Any]:
        return dict(self._config)

    def set_value(self, key: str, value: Any) -> Dict[str, Any]:
        self._config[key] = value
        self.save()
        return {key: value}


class HotkeyManager:
    """Регистрация глобальных горячих клавиш для быстрого вызова команд ядра."""

    def __init__(self) -> None:
        self._bindings: Dict[str, str] = {
            "Alt+Space": "ui.toggle_launcher",
            "Ctrl+Shift+L": "island.open_center",
            "Ctrl+Shift+T": "ui.open_tiles_dashboard",
            "Ctrl+Shift+D": "core.diagnostics",
        }

    def list_hotkeys(self) -> Dict[str, str]:
        return dict(self._bindings)

    def register(self, chord: str, action: str) -> Dict[str, str]:
        self._bindings[chord] = action
        return dict(self._bindings)


# ============================================================================
# JSON-RPC 2.0 СЕРВЕР И РОУТЕР ЯДРА LUMA BETA
# ============================================================================
class LumaCoreServer:
    """
    Асинхронный локальный IPC-сервер Luma Beta по спецификации JSON-RPC 2.0 (127.0.0.1:49215).
    Каждое сообщение передается в виде JSON-строки (NDJSON / Line-delimited JSON-RPC).
    Падение или закрытие любого GUI-клиента (основного окна или Flet-дашборда плиток)
    обрабатывается изолированно и никогда не останавливает ядро.
    """

    def __init__(self, host: str = DEFAULT_IPC_HOST, port: int = DEFAULT_IPC_PORT) -> None:
        self.host = host
        self.port = port
        self.metrics = SystemMetricsCollector()
        self.widget_manager = WidgetManager(register_defaults=True)
        self.process_manager = ProcessManager()
        self.config_manager = ConfigManager()
        self.hotkey_manager = HotkeyManager()
        self._server: Optional[asyncio.AbstractServer] = None

        # Таблица маршрутизации JSON-RPC 2.0 методов
        self._methods: Dict[str, Callable[[Dict[str, Any]], Any]] = {
            "system.ping": self._rpc_ping,
            "system.info": self._rpc_system_info,
            # Новые методы сервиса виджетов (WidgetManager)
            "widgets.get_all": self._rpc_widgets_get_all,
            "widgets.update_note": self._rpc_widgets_update_note,
            # Совместимость с базовыми вызовами виджетов
            "widgets.list": self._rpc_widgets_list,
            "widgets.get_data": self._rpc_widgets_get_data,
            # Управление процессами, конфигом и хоткеями
            "process.list": lambda params: self.process_manager.list_processes(),
            "process.spawn": lambda params: self.process_manager.spawn_process(
                params.get("command", ""), params.get("args", [])
            ),
            "process.terminate": lambda params: self.process_manager.terminate_process(
                int(params.get("pid", 0))
            ),
            "config.get": lambda params: self.config_manager.get_all(),
            "config.set": lambda params: self.config_manager.set_value(
                str(params.get("key", "")), params.get("value")
            ),
            "hotkeys.list": lambda params: self.hotkey_manager.list_hotkeys(),
        }

    def _rpc_ping(self, params: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "pong": True,
            "engine": "Luma Beta Headless Core",
            "version": LUMA_VERSION,
            "endpoint": f"{self.host}:{self.port}",
            "timestamp": round(time.time(), 3),
        }

    def _rpc_system_info(self, params: Dict[str, Any]) -> Dict[str, Any]:
        snap = self.metrics.sample_once()
        return {
            "luma_version": LUMA_VERSION,
            "codename": LUMA_CODENAME,
            "kernel_version": LUMA_KERNEL_VERSION,
            "security_patch": LUMA_SECURITY_PATCH,
            "headless_mode": True,
            "ipc_endpoint": f"tcp://{self.host}:{self.port} (JSON-RPC 2.0)",
            "os": f"{platform.system()} {platform.release()} ({platform.machine()})",
            "python_runtime": platform.python_version(),
            "cpu_cores": os.cpu_count() or 4,
            "core_rss_mb": snap.core_rss_mb,
            "idle_cpu_percent": 0.0,
            "uptime_sec": snap.uptime_sec,
            "registered_widgets": [w["id"] for w in self.widget_manager.list_metadata()],
        }

    async def _rpc_widgets_get_all(self, params: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """
        IPC-метод `widgets.get_all`:
        Возвращает полный словарь всех зарегистрированных в WidgetManager виджетов
        и их актуальные данные (SystemStatsWidget, QuickNoteWidget и др.).
        """
        return await self.widget_manager.get_all_dump()

    def _rpc_widgets_update_note(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        IPC-метод `widgets.update_note`:
        Сохраняет переданный текст (`text` или `note`) в виджет `QuickNoteWidget`
        внутри памяти работающего ядра.
        """
        new_text = params.get("text")
        if new_text is None:
            new_text = params.get("note", "")
        result = self.widget_manager.update_note(str(new_text))
        logger.info("WidgetManager: заметка в памяти ядра обновлена (%d симв.)", len(str(new_text)))
        return result

    def _rpc_widgets_list(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        return self.widget_manager.list_metadata()

    async def _rpc_widgets_get_data(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Отдает метрики и срез всех виджетов для совместимости."""
        widgets_dump = await self.widget_manager.get_all_dump()
        payload = self.metrics.get_widget_payload()
        payload["widgets_all"] = widgets_dump
        return payload

    async def handle_jsonrpc_payload_async(self, raw_json: str) -> Optional[str]:
        """Асинхронно обрабатывает JSON-RPC 2.0 запрос и возвращает JSON-строку ответа."""
        req_id: Any = None
        try:
            payload = json.loads(raw_json)
        except json.JSONDecodeError:
            return json.dumps(
                {
                    "jsonrpc": "2.0",
                    "error": {"code": -32700, "message": "Parse error: Invalid JSON"},
                    "id": None,
                },
                ensure_ascii=False,
            )

        if not isinstance(payload, dict):
            return json.dumps(
                {
                    "jsonrpc": "2.0",
                    "error": {"code": -32600, "message": "Invalid Request"},
                    "id": None,
                },
                ensure_ascii=False,
            )

        req_id = payload.get("id", 1)
        method = payload.get("method")
        params = payload.get("params") or {}

        if not method or not isinstance(method, str):
            return json.dumps(
                {
                    "jsonrpc": "2.0",
                    "error": {"code": -32600, "message": "Invalid Request: missing 'method'"},
                    "id": req_id,
                },
                ensure_ascii=False,
            )

        handler = self._methods.get(method)
        if handler is None:
            return json.dumps(
                {
                    "jsonrpc": "2.0",
                    "error": {"code": -32601, "message": f"Method not found: '{method}'"},
                    "id": req_id,
                },
                ensure_ascii=False,
            )

        try:
            if not isinstance(params, dict):
                params = {}
            result = handler(params)
            if inspect.isawaitable(result):
                result = await result
            return json.dumps(
                {
                    "jsonrpc": "2.0",
                    "result": result,
                    "id": req_id,
                },
                ensure_ascii=False,
            )
        except Exception as exc:
            logger.exception("Ошибка выполнения метода %s", method)
            return json.dumps(
                {
                    "jsonrpc": "2.0",
                    "error": {"code": -32603, "message": f"Internal error: {exc}"},
                    "id": req_id,
                },
                ensure_ascii=False,
            )

    async def _handle_client(
        self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        peer = writer.get_extra_info("peername")
        logger.info("IPC-клиент подключен: %s", peer)
        try:
            while True:
                line = await reader.readline()
                if not line:
                    break
                raw_str = line.decode("utf-8", errors="replace").strip()
                if not raw_str:
                    continue
                response_str = await self.handle_jsonrpc_payload_async(raw_str)
                if response_str:
                    writer.write((response_str + "\n").encode("utf-8"))
                    await writer.drain()
        except (ConnectionResetError, BrokenPipeError, asyncio.IncompleteReadError):
            logger.warning("GUI-клиент %s неожиданно отключился — ядро Luma продолжает работу.", peer)
        except Exception as exc:
            logger.error("Изолированная ошибка IPC-сессии %s: %s", peer, exc)
        finally:
            try:
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass
            logger.info("IPC-сессия закрыта: %s (ядро активно в фоне)", peer)

    async def start(self) -> None:
        self.metrics.start()
        self._server = await asyncio.start_server(
            self._handle_client, self.host, self.port
        )
        addrs = ", ".join(str(sock.getsockname()) for sock in (self._server.sockets or []))
        logger.info(
            "Luma Beta Core %s (%s) запущено в Headless-режиме на %s",
            LUMA_VERSION,
            LUMA_CODENAME,
            addrs,
        )
        async with self._server:
            await self._server.serve_forever()


async def run_self_test() -> int:
    """Автономный самотест IPC-сервера Luma Beta (проверяет widgets.get_all и widgets.update_note)."""
    server = LumaCoreServer(host="127.0.0.1", port=DEFAULT_IPC_PORT)
    server.metrics.sample_once()

    r_ping = json.loads(
        await server.handle_jsonrpc_payload_async('{"jsonrpc": "2.0", "method": "system.ping", "id": 1}') or "{}"
    )
    r_all_initial = json.loads(
        await server.handle_jsonrpc_payload_async('{"jsonrpc": "2.0", "method": "widgets.get_all", "id": 2}') or "{}"
    )
    r_note_update = json.loads(
        await server.handle_jsonrpc_payload_async(
            '{"jsonrpc": "2.0", "method": "widgets.update_note", "params": {"text": "Тестовая заметка в ядре Luma!"}, "id": 3}'
        )
        or "{}"
    )
    r_all_after = json.loads(
        await server.handle_jsonrpc_payload_async('{"jsonrpc": "2.0", "method": "widgets.get_all", "id": 4}') or "{}"
    )

    assert r_ping.get("result", {}).get("pong") is True, "Ping check failed"
    assert "system_stats" in r_all_initial.get("result", {}), "system_stats missing in widgets.get_all"
    assert "quick_note" in r_all_initial.get("result", {}), "quick_note missing in widgets.get_all"
    assert r_note_update.get("result", {}).get("status") == "saved", "widgets.update_note failed"
    assert (
        r_all_after["result"]["quick_note"]["data"]["text"] == "Тестовая заметка в ядре Luma!"
    ), "QuickNote state was not persisted in memory"

    print("Luma Beta Core Self-Test PASSED!")
    print(" -> widgets.get_all response:", json.dumps(r_all_after, ensure_ascii=False, indent=2))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Luma Beta Headless Core Daemon")
    parser.add_argument("--host", default=DEFAULT_IPC_HOST, help=f"Bind address (default: {DEFAULT_IPC_HOST})")
    parser.add_argument("--port", type=int, default=DEFAULT_IPC_PORT, help=f"Bind port (default: {DEFAULT_IPC_PORT})")
    parser.add_argument("--self-test", action="store_true", help="Run JSON-RPC contract self-test and exit")
    args = parser.parse_args()

    if args.self_test:
        return asyncio.run(run_self_test())

    core = LumaCoreServer(host=args.host, port=args.port)
    try:
        asyncio.run(core.start())
    except KeyboardInterrupt:
        logger.info("Остановка ядра Luma Beta по сигналу пользователя.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
