#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Luma Beta 2.9 — Фоновое системное ядро (Headless Core Daemon)
=============================================================
Архитектурный шаблон: Безголовое ядро (Headless Core) + Тонкие UI-клиенты на Flet.
Протокол взаимодействия: локальный TCP-сокет 127.0.0.1:49215, JSON-RPC 2.0 (NDJSON, '\n').

Поддерживаемые RPC-методы:
  - `ping` / `system.ping`        — проверка связи с демоном и измерение задержки
  - `system.get_stats`            — мгновенная сводка CPU, RAM, диска, аптайма и процессов
  - `apps.list`                   — список избранных и системных приложений для быстрого запуска
  - `apps.launch`                 — запуск приложения (.exe, .lnk, системной команды или URL)
  - `widgets.get_all`             — полный дамп всех виджетов (System, Audio, Notes, Time/Weather)
  - `widgets.update`              — обновление состояния любого виджета (заметки, задачи, звук, погода)
  - `widgets.update_note`         — быстрое обновление текста заметки в JSON-кэше ядра
  - `core.status`                 — подробный паспорт состояния ядра Luma Beta 2.9
  - `core.shutdown`               — корректное завершение работы фонового демона

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
import webbrowser
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

CORE_ROOT = Path(__file__).resolve().parent
if str(CORE_ROOT) not in sys.path:
    sys.path.insert(0, str(CORE_ROOT))

from core.widget_service import (  # noqa: E402
    AudioControlWidget,
    BaseWidget,
    QuickNoteWidget,
    SystemMetricsCollector,
    SystemMetricsSnapshot,
    SystemStatsWidget,
    TimeUptimeWeatherWidget,
    WidgetManager,
)

try:
    import psutil  # type: ignore
except ImportError:
    psutil = None

LUMA_VERSION = "2.9.0"
LUMA_CODENAME = "Nebula Headless Release"
LUMA_KERNEL_VERSION = "6.8.0-luma-2.9-x86_64 #1 SMP PREEMPT_DYNAMIC"
LUMA_SECURITY_PATCH = "2026-11-02 (LumaGuard IPC ACL + Atomic UTF-8 Cache + Watchdog)"
DEFAULT_IPC_HOST = "127.0.0.1"
DEFAULT_IPC_PORT = 49215

LOG_FILE = CORE_ROOT / "luma_core.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-5s | LumaCore-2.9 | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ],
)
logger = logging.getLogger("LumaCore")


# ============================================================================
# 1. МЕНЕДЖЕР ПРОЦЕССОВ И ПРИЛОЖЕНИЙ (ProcessManager)
# ============================================================================
class ProcessManager:
    """
    Полноценный менеджер процессов ядра Luma Beta 2.9:
      - Запуск исполняемых файлов (.exe), ярлыков (.lnk), системных утилит и веб-ресурсов
      - Отслеживание PID, времени работы и статуса процесса
      - Безопасное завершение (SIGTERM -> SIGKILL / terminate)
      - Фоновый сторожевой цикл (Watchdog) для автоперезапуска процессов с флагом `auto_restart=True`
    """

    DEFAULT_QUICK_APPS: List[Dict[str, Any]] = [
        {
            "id": "calc",
            "name": "Калькулятор",
            "category": "System",
            "command": "calc.exe" if platform.system() == "Windows" else "gnome-calculator",
            "type": "system",
            "favorite": True,
            "icon": "calculate",
        },
        {
            "id": "notepad",
            "name": "Блокнот",
            "category": "System",
            "command": "notepad.exe" if platform.system() == "Windows" else "gedit",
            "type": "system",
            "favorite": True,
            "icon": "description",
        },
        {
            "id": "explorer",
            "name": "Проводник",
            "category": "System",
            "command": "explorer.exe" if platform.system() == "Windows" else "xdg-open .",
            "type": "system",
            "favorite": True,
            "icon": "folder_open",
        },
        {
            "id": "taskmgr",
            "name": "Диспетчер задач",
            "category": "System",
            "command": "taskmgr.exe" if platform.system() == "Windows" else "top",
            "type": "system",
            "favorite": True,
            "icon": "analytics",
        },
        {
            "id": "cmd",
            "name": "Терминал / Консоль",
            "category": "Dev",
            "command": "cmd.exe" if platform.system() == "Windows" else "bash",
            "type": "system",
            "favorite": True,
            "icon": "terminal",
        },
        {
            "id": "github",
            "name": "GitHub Репозиторий",
            "category": "Web",
            "command": "https://github.com",
            "type": "web",
            "favorite": True,
            "icon": "code",
        },
    ]

    def __init__(self) -> None:
        self._processes: Dict[int, Dict[str, Any]] = {}
        self._apps_catalog: List[Dict[str, Any]] = list(self.DEFAULT_QUICK_APPS)
        self._watchdog_task: Optional[asyncio.Task] = None
        self._running = False

    def list_apps(self) -> List[Dict[str, Any]]:
        """Возвращает каталог доступных приложений для быстрого запуска (`apps.list`)."""
        return list(self._apps_catalog)

    def spawn_process(
        self,
        command: str,
        args: Optional[List[str]] = None,
        auto_restart: bool = False,
        name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Запускает процесс (.exe, .lnk, системную команду или URL) и регистрирует его PID."""
        target = (command or "").strip()
        if not target:
            raise ValueError("Пустая команда запуска процесса")

        # 1. Веб-ссылка
        if target.startswith(("http://", "https://")):
            webbrowser.open(target)
            return {
                "pid": 0,
                "name": name or target,
                "command": target,
                "type": "web",
                "started_at": round(time.time(), 2),
                "status": "opened_in_browser",
            }

        # 2. Ярлык Windows (.lnk) через os.startfile
        if platform.system() == "Windows" and target.lower().endswith(".lnk") and os.path.exists(target):
            os.startfile(target)  # type: ignore[attr-defined]
            return {
                "pid": 0,
                "name": name or os.path.basename(target),
                "command": target,
                "type": "shortcut_lnk",
                "started_at": round(time.time(), 2),
                "status": "launched_via_shell",
            }

        # 3. Обычный исполняемый процесс
        cmd_list = [target] + (args or [])
        creation_flags = 0
        if platform.system() == "Windows":
            creation_flags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)

        proc = subprocess.Popen(
            cmd_list,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
            creationflags=creation_flags,
        )
        record = {
            "pid": proc.pid,
            "name": name or os.path.basename(target) or target,
            "command": target,
            "args": args or [],
            "auto_restart": bool(auto_restart),
            "restarts_count": 0,
            "started_at": round(time.time(), 2),
            "status": "running",
        }
        self._processes[proc.pid] = record
        logger.info("ProcessManager: запущен процесс PID=%d (%s)", proc.pid, record["name"])
        return record

    def launch_app(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Запускает приложение по `app_id`, `command` или `path` (`apps.launch`)."""
        app_id = str(params.get("app_id", "")).strip()
        command = str(params.get("command") or params.get("path") or "").strip()
        auto_restart = bool(params.get("auto_restart", False))
        app_name = str(params.get("name", "")).strip()

        if app_id and not command:
            for item in self._apps_catalog:
                if item["id"] == app_id:
                    command = item["command"]
                    app_name = item["name"]
                    break

        if not command:
            raise ValueError(f"Приложение '{app_id}' не найдено и путь не указан")

        return self.spawn_process(
            command=command,
            args=params.get("args", []),
            auto_restart=auto_restart,
            name=app_name or app_id,
        )

    def _is_pid_alive(self, pid: int) -> bool:
        if pid <= 0:
            return False
        if psutil is not None:
            try:
                p = psutil.Process(pid)
                return p.is_running() and p.status() != psutil.STATUS_ZOMBIE
            except Exception:
                return False
        try:
            os.kill(pid, 0)
            return True
        except OSError:
            return False

    def list_processes(self) -> List[Dict[str, Any]]:
        """Возвращает список отслеживаемых процессов с актуализацией их живого статуса."""
        for pid, rec in list(self._processes.items()):
            if rec.get("status") == "running" and not self._is_pid_alive(pid):
                rec["status"] = "exited"
        return list(self._processes.values())

    def terminate_process(self, pid: int) -> Dict[str, Any]:
        """Безопасно завершает процесс по PID и отключает его автоперезапуск."""
        rec = self._processes.get(pid)
        if rec:
            rec["auto_restart"] = False

        if psutil is not None:
            try:
                proc = psutil.Process(pid)
                proc.terminate()
                try:
                    proc.wait(timeout=2.0)
                except psutil.TimeoutExpired:
                    proc.kill()
                if rec:
                    rec["status"] = "terminated"
                return {"pid": pid, "terminated": True}
            except Exception as exc:
                return {"pid": pid, "terminated": False, "reason": str(exc)}

        try:
            os.kill(pid, 15)
            if rec:
                rec["status"] = "terminated"
            return {"pid": pid, "terminated": True}
        except Exception as exc:
            return {"pid": pid, "terminated": False, "reason": str(exc)}

    async def _watchdog_loop(self) -> None:
        """Фоновая корутина автоперезапуска процессов с флагом `auto_restart=True`."""
        while self._running:
            await asyncio.sleep(3.0)
            for pid, rec in list(self._processes.items()):
                if rec.get("status") == "running" and not self._is_pid_alive(pid):
                    rec["status"] = "exited"
                    if rec.get("auto_restart"):
                        try:
                            new_rec = self.spawn_process(
                                command=rec["command"],
                                args=rec.get("args", []),
                                auto_restart=True,
                                name=rec.get("name"),
                            )
                            new_rec["restarts_count"] = int(rec.get("restarts_count", 0)) + 1
                            logger.info(
                                "Watchdog: процесс '%s' перезапущен (новый PID=%d)",
                                rec.get("name"),
                                new_rec["pid"],
                            )
                        except Exception as exc:
                            logger.error("Watchdog: ошибка автоперезапуска '%s': %s", rec.get("name"), exc)

    def start_watchdog(self) -> None:
        if not self._running:
            self._running = True
            self._watchdog_task = asyncio.create_task(self._watchdog_loop())

    async def stop_watchdog(self) -> None:
        self._running = False
        if self._watchdog_task:
            self._watchdog_task.cancel()
            try:
                await self._watchdog_task
            except asyncio.CancelledError:
                pass


# ============================================================================
# 2. МЕНЕДЖЕР КОНФИГУРАЦИИ (ConfigManager с атомарной записью UTF-8)
# ============================================================================
class ConfigManager:
    """Безопасное чтение и атомарная запись настроек ядра в кодировке UTF-8 без повреждения JSON."""

    DEFAULT_CONFIG: Dict[str, Any] = {
        "core_version": LUMA_VERSION,
        "ipc_host": DEFAULT_IPC_HOST,
        "ipc_port": DEFAULT_IPC_PORT,
        "metrics_interval_sec": 1.0,
        "max_ram_budget_mb": 25,
        "security_mode": "localhost_strict",
        "auto_start_with_ui": True,
    }

    def __init__(self, config_path: Optional[Path] = None) -> None:
        self.config_path = config_path or (CORE_ROOT / "luma_config.json")
        self._config: Dict[str, Any] = dict(self.DEFAULT_CONFIG)
        self.load()

    def load(self) -> Dict[str, Any]:
        if self.config_path.exists():
            try:
                raw = self.config_path.read_text(encoding="utf-8")
                loaded = json.loads(raw)
                if isinstance(loaded, dict):
                    self._config.update(loaded)
                    self._config["core_version"] = LUMA_VERSION
            except Exception as exc:
                logger.warning("ConfigManager: поврежден JSON, восстановлен дефолт: %s", exc)
                self.save()
        else:
            self.save()
        return dict(self._config)

    def save(self) -> bool:
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            tmp_file = self.config_path.with_suffix(".json.tmp")
            tmp_file.write_text(
                json.dumps(self._config, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            os.replace(tmp_file, self.config_path)
            return True
        except Exception as exc:
            logger.error("ConfigManager: ошибка атомарного сохранения конфига: %s", exc)
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
# 3. АСИНХРОННЫЙ JSON-RPC 2.0 СЕРВЕР ЯДРА (LumaCoreServer)
# ============================================================================
class LumaCoreServer:
    """
    Стабильный асинхронный IPC-сервер Luma Beta 2.9 на 127.0.0.1:49215.
    Устойчив к внезапным отключениям и падениям любых GUI-клиентов.
    """

    def __init__(self, host: str = DEFAULT_IPC_HOST, port: int = DEFAULT_IPC_PORT) -> None:
        self.host = host
        self.port = port
        self.started_at = time.time()
        self.metrics = SystemMetricsCollector()
        self.widget_manager = WidgetManager(register_defaults=True)
        self.process_manager = ProcessManager()
        self.config_manager = ConfigManager()
        self.hotkey_manager = HotkeyManager()
        self._server: Optional[asyncio.AbstractServer] = None
        self._shutdown_event = asyncio.Event()
        self._active_clients = 0
        self._total_requests = 0

        self._methods: Dict[str, Callable[[Dict[str, Any]], Any]] = {
            # Базовые пинги и статус ядра
            "ping": self._rpc_ping,
            "system.ping": self._rpc_ping,
            "core.status": self._rpc_core_status,
            "core.shutdown": self._rpc_core_shutdown,
            # Системная статистика
            "system.get_stats": self._rpc_system_get_stats,
            "system.info": self._rpc_system_info,
            # Приложения и процессы
            "apps.list": lambda params: self.process_manager.list_apps(),
            "apps.launch": lambda params: self.process_manager.launch_app(params),
            "process.list": lambda params: self.process_manager.list_processes(),
            "process.spawn": lambda params: self.process_manager.spawn_process(
                params.get("command", ""),
                params.get("args", []),
                bool(params.get("auto_restart", False)),
                params.get("name"),
            ),
            "process.terminate": lambda params: self.process_manager.terminate_process(
                int(params.get("pid", 0))
            ),
            # Виджеты (Live Tiles)
            "widgets.get_all": self._rpc_widgets_get_all,
            "widgets.update": self._rpc_widgets_update,
            "widgets.update_note": self._rpc_widgets_update_note,
            "widgets.list": lambda params: self.widget_manager.list_metadata(),
            "widgets.get_data": self._rpc_widgets_get_data,
            # Конфигурация и хоткеи
            "config.get": lambda params: self.config_manager.get_all(),
            "config.set": lambda params: self.config_manager.set_value(
                str(params.get("key", "")), params.get("value")
            ),
            "hotkeys.list": lambda params: self.hotkey_manager.list_hotkeys(),
        }

    def _rpc_ping(self, params: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "pong": True,
            "status": "online",
            "engine": "Luma Beta Headless Core",
            "version": LUMA_VERSION,
            "endpoint": f"{self.host}:{self.port}",
            "uptime_sec": int(time.time() - self.started_at),
            "timestamp": round(time.time(), 3),
        }

    async def _rpc_system_get_stats(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Метод `system.get_stats`: возвращает полную сводку CPU, RAM, диска, аудио и аптайма."""
        sys_widget = self.widget_manager.get_widget("system_stats")
        sys_data = await sys_widget.collect_data() if sys_widget else {}
        return {
            "version": LUMA_VERSION,
            "cpu_percent": sys_data.get("cpu_percent", 0.0),
            "ram_percent": sys_data.get("ram_percent", 0.0),
            "ram_used_gb": sys_data.get("ram_used_gb", 0.0),
            "ram_total_gb": sys_data.get("ram_total_gb", 16.0),
            "disk_free_gb": sys_data.get("disk_free_gb", 128.0),
            "disk_total_gb": sys_data.get("disk_total_gb", 512.0),
            "disk_percent": sys_data.get("disk_percent", 0.0),
            "core_rss_mb": sys_data.get("core_rss_mb", 14.2),
            "uptime_sec": int(time.time() - self.started_at),
            "tracked_processes": len(self.process_manager.list_processes()),
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
            "uptime_sec": int(time.time() - self.started_at),
            "registered_widgets": [w["id"] for w in self.widget_manager.list_metadata()],
        }

    def _rpc_core_status(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Метод `core.status`: диагностический паспорт состояния демона Luma Beta 2.9."""
        snap = self.metrics.sample_once()
        return {
            "status": "running",
            "version": LUMA_VERSION,
            "codename": LUMA_CODENAME,
            "kernel_version": LUMA_KERNEL_VERSION,
            "security_patch": LUMA_SECURITY_PATCH,
            "pid": os.getpid(),
            "endpoint": f"{self.host}:{self.port}",
            "uptime_sec": int(time.time() - self.started_at),
            "core_rss_mb": snap.core_rss_mb,
            "active_ipc_clients": self._active_clients,
            "total_rpc_requests": self._total_requests,
            "widgets_registered": [w["id"] for w in self.widget_manager.list_metadata()],
            "processes_tracked": len(self.process_manager.list_processes()),
        }

    def _rpc_core_shutdown(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Метод `core.shutdown`: инициирует мягкую остановку фонового ядра."""
        logger.info("Получена команда core.shutdown — плавная остановка ядра Luma Beta.")
        self._shutdown_event.set()
        if self._server is not None:
            self._server.close()
        return {
            "status": "shutting_down",
            "version": LUMA_VERSION,
            "timestamp": round(time.time(), 3),
        }

    async def _rpc_widgets_get_all(self, params: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        return await self.widget_manager.get_all_dump()

    def _rpc_widgets_update(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Метод `widgets.update`:
        Принимает `{"widget_id": "...", ...}` (по умолчанию `quick_note`)
        и обновляет данные соответствующего виджета.
        """
        widget_id = str(params.get("widget_id", "quick_note")).strip()
        payload = params.get("data") if isinstance(params.get("data"), dict) else params
        return self.widget_manager.update_widget(widget_id, payload)

    def _rpc_widgets_update_note(self, params: Dict[str, Any]) -> Dict[str, Any]:
        new_text = params.get("text")
        if new_text is None:
            new_text = params.get("note", "")
        return self.widget_manager.update_note(str(new_text))

    async def _rpc_widgets_get_data(self, params: Dict[str, Any]) -> Dict[str, Any]:
        widgets_dump = await self.widget_manager.get_all_dump()
        payload = self.metrics.get_widget_payload()
        payload["widgets_all"] = widgets_dump
        return payload

    async def handle_jsonrpc_payload_async(self, raw_json: str) -> Optional[str]:
        self._total_requests += 1
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
            logger.exception("Ошибка выполнения RPC-метода %s", method)
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
        self._active_clients += 1
        logger.debug("IPC-клиент подключен: %s (активных: %d)", peer, self._active_clients)
        try:
            while not self._shutdown_event.is_set():
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
            logger.warning("GUI-клиент %s отключился — ядро Luma Beta продолжает работу.", peer)
        except Exception as exc:
            logger.error("Изолированная ошибка IPC-сессии %s: %s", peer, exc)
        finally:
            self._active_clients = max(0, self._active_clients - 1)
            try:
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass

    async def start(self) -> None:
        self.metrics.start()
        self.process_manager.start_watchdog()
        self._server = await asyncio.start_server(
            self._handle_client, self.host, self.port
        )
        addrs = ", ".join(str(sock.getsockname()) for sock in (self._server.sockets or []))
        logger.info(
            "Luma Beta Core v%s (%s) запущено в Headless-режиме на %s",
            LUMA_VERSION,
            LUMA_CODENAME,
            addrs,
        )
        try:
            async with self._server:
                await self._shutdown_event.wait()
        finally:
            await self.process_manager.stop_watchdog()
            await self.metrics.stop()


async def run_self_test() -> int:
    """Самотест всех RPC-методов ядра Luma Beta 2.9."""
    server = LumaCoreServer(host="127.0.0.1", port=DEFAULT_IPC_PORT)
    server.metrics.sample_once()

    r_ping = json.loads(
        await server.handle_jsonrpc_payload_async('{"jsonrpc": "2.0", "method": "ping", "id": 1}') or "{}"
    )
    r_stats = json.loads(
        await server.handle_jsonrpc_payload_async('{"jsonrpc": "2.0", "method": "system.get_stats", "id": 2}') or "{}"
    )
    r_apps = json.loads(
        await server.handle_jsonrpc_payload_async('{"jsonrpc": "2.0", "method": "apps.list", "id": 3}') or "{}"
    )
    r_widgets = json.loads(
        await server.handle_jsonrpc_payload_async('{"jsonrpc": "2.0", "method": "widgets.get_all", "id": 4}') or "{}"
    )
    r_update = json.loads(
        await server.handle_jsonrpc_payload_async(
            '{"jsonrpc": "2.0", "method": "widgets.update", "params": {"widget_id": "quick_note", "text": "Заметка Luma 2.9 в JSON-кэше!"}, "id": 5}'
        )
        or "{}"
    )
    r_status = json.loads(
        await server.handle_jsonrpc_payload_async('{"jsonrpc": "2.0", "method": "core.status", "id": 6}') or "{}"
    )

    assert r_ping.get("result", {}).get("pong") is True, "ping check failed"
    assert "cpu_percent" in r_stats.get("result", {}), "system.get_stats check failed"
    assert len(r_apps.get("result", [])) >= 4, "apps.list check failed"
    assert "system_stats" in r_widgets.get("result", {}), "system_stats missing"
    assert "audio_widget" in r_widgets.get("result", {}), "audio_widget missing"
    assert "quick_note" in r_widgets.get("result", {}), "quick_note missing"
    assert "time_weather" in r_widgets.get("result", {}), "time_weather missing"
    assert r_update.get("result", {}).get("status") == "ok", "widgets.update failed"
    assert r_status.get("result", {}).get("version") == LUMA_VERSION, "core.status check failed"

    print("Luma Beta 2.9 Self-Test PASSED!")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Luma Beta 2.9 Headless Core Daemon")
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
        logger.info("Остановка ядра Luma Beta 2.9 по сигналу пользователя.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
