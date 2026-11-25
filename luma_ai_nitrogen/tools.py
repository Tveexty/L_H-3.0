"""
Luma Ai Nitrogen — Extensible Function Calling / Tools Registry
Integrates directly with LumaCore OS (127.0.0.1:49216): Calendar, System Telemetry & Actions,
Luma Office Studio, Luma Обвести для поиска (Lens), Local Files, Safe Commands, Memory & Web Search.
"""

from __future__ import annotations

import asyncio
import json
import subprocess
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Awaitable, Callable, Dict, List, Optional

try:
    import httpx
except ImportError:  # pragma: no cover
    httpx = None  # type: ignore[assignment]

from .config import NitrogenConfig
from .memory_manager import MemoryManager

ToolHandler = Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]]


@dataclass
class RegisteredTool:
    name: str
    description: str
    parameters: Dict[str, Any]
    handler: ToolHandler

    def to_openai_schema(self) -> Dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


class ToolRegistry:
    """Extensible tool catalog for Luma Ai Nitrogen Function Calling."""

    def __init__(self, config: NitrogenConfig, memory: MemoryManager) -> None:
        self.config = config
        self.memory = memory
        self._tools: Dict[str, RegisteredTool] = {}
        self._register_builtin_tools()

    def register(
        self,
        name: str,
        description: str,
        parameters: Dict[str, Any],
        handler: ToolHandler,
    ) -> None:
        self._tools[name] = RegisteredTool(
            name=name,
            description=description,
            parameters=parameters,
            handler=handler,
        )

    def openai_schemas(self) -> List[Dict[str, Any]]:
        return [t.to_openai_schema() for t in self._tools.values()]

    def list_tools(self) -> List[Dict[str, str]]:
        return [{"name": t.name, "description": t.description} for t in self._tools.values()]

    async def execute(self, name: str, raw_arguments: str | Dict[str, Any]) -> Dict[str, Any]:
        tool = self._tools.get(name)
        if not tool:
            return {"ok": False, "error": f"Unknown tool: {name}"}
        if isinstance(raw_arguments, str):
            try:
                args = json.loads(raw_arguments) if raw_arguments.strip() else {}
            except json.JSONDecodeError:
                args = {}
        else:
            args = dict(raw_arguments or {})
        try:
            return await tool.handler(args)
        except Exception as exc:
            return {"ok": False, "error": str(exc)}

    async def _kernel_request(
        self,
        method: str,
        path: str,
        payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        url = f"{self.config.luma_kernel_url.rstrip('/')}/{path.lstrip('/')}"
        if httpx is not None:
            async with httpx.AsyncClient(timeout=8.0) as client:
                if method.upper() == "GET":
                    r = await client.get(url)
                elif method.upper() == "DELETE":
                    r = await client.delete(url)
                else:
                    r = await client.post(url, json=payload or {})
                r.raise_for_status()
                return r.json()

        def _sync_req() -> Dict[str, Any]:
            data = json.dumps(payload or {}).encode("utf-8") if method.upper() in ("POST", "PUT") else None
            headers = {"Content-Type": "application/json"} if data is not None else {}
            req = urllib.request.Request(url, data=data, headers=headers, method=method.upper())
            with urllib.request.urlopen(req, timeout=8.0) as resp:
                return json.loads(resp.read().decode("utf-8"))

        return await asyncio.to_thread(_sync_req)

    def _register_builtin_tools(self) -> None:
        # 1. System Telemetry (LumaCore OS)
        async def _get_telemetry(_: Dict[str, Any]) -> Dict[str, Any]:
            try:
                data = await self._kernel_request("GET", "/api/kernel/telemetry")
                return {
                    "ok": True,
                    "cpu_percent": data.get("cpu_percent"),
                    "ram_used_gb": data.get("ram_used_gb"),
                    "ram_total_gb": data.get("ram_total_gb"),
                    "battery_percent": data.get("battery_percent"),
                    "battery_charging": data.get("battery_charging"),
                    "hostname": data.get("hostname"),
                    "os_name": data.get("os_name"),
                }
            except Exception as exc:
                return {"ok": False, "error": f"LumaCore недоступен: {exc}"}

        self.register(
            name="get_system_telemetry",
            description="Получить живую телеметрию ПК из ядра LumaCore (CPU, RAM, батарея, ОС).",
            parameters={"type": "object", "properties": {}, "required": []},
            handler=_get_telemetry,
        )

        # 2. Calendar List Events
        async def _cal_list(args: Dict[str, Any]) -> Dict[str, Any]:
            date_filter = str(args.get("date", "")).strip()
            path = f"/api/kernel/calendar/events?date={date_filter}" if date_filter else "/api/kernel/calendar/events"
            return await self._kernel_request("GET", path)

        self.register(
            name="calendar_list_events",
            description="Прочитать события и задачи из Календаря Luma OS (все или за конкретную дату YYYY-MM-DD).",
            parameters={
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "Опционально дата в формате YYYY-MM-DD"},
                },
                "required": [],
            },
            handler=_cal_list,
        )

        # 3. Calendar Create Event
        async def _cal_create(args: Dict[str, Any]) -> Dict[str, Any]:
            return await self._kernel_request(
                "POST",
                "/api/kernel/calendar/events",
                {
                    "title": str(args.get("title", "Событие")).strip(),
                    "date": str(args.get("date", "")).strip(),
                    "time": str(args.get("time", "12:00")).strip(),
                    "note": str(args.get("note", "")).strip(),
                    "category": str(args.get("category", "work")).strip(),
                    "priority": str(args.get("priority", "normal")).strip(),
                },
            )

        self.register(
            name="calendar_create_event",
            description="Создать новое событие или напоминание в Календаре Luma OS.",
            parameters={
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Название события"},
                    "date": {"type": "string", "description": "Дата YYYY-MM-DD"},
                    "time": {"type": "string", "description": "Время HH:MM"},
                    "note": {"type": "string", "description": "Описание/заметка"},
                    "category": {"type": "string", "enum": ["work", "meeting", "personal", "deadline", "health"]},
                    "priority": {"type": "string", "enum": ["normal", "important", "urgent"]},
                },
                "required": ["title", "date"],
            },
            handler=_cal_create,
        )

        # 4. Calendar Delete Event
        async def _cal_delete(args: Dict[str, Any]) -> Dict[str, Any]:
            ev_id = str(args.get("id", "")).strip()
            return await self._kernel_request("DELETE", f"/api/kernel/calendar/events?id={ev_id}")

        self.register(
            name="calendar_delete_event",
            description="Удалить событие из Календаря Luma OS по его ID.",
            parameters={
                "type": "object",
                "properties": {"id": {"type": "string", "description": "ID события"}},
                "required": ["id"],
            },
            handler=_cal_delete,
        )

        # 5. Memory Remember Fact
        async def _remember(args: Dict[str, Any]) -> Dict[str, Any]:
            return await self.memory.upsert_fact(
                category=str(args.get("category", "general")),
                fact_key=str(args.get("key", "")),
                content=str(args.get("content", "")),
                importance=float(args.get("importance", 0.85)),
            )

        self.register(
            name="remember_fact",
            description="Явно сохранить важный долговременный факт о пользователе, проекте или предпочтениях.",
            parameters={
                "type": "object",
                "properties": {
                    "category": {"type": "string", "enum": ["identity", "preferences", "projects", "tech_stack", "habits", "events", "solved_tasks", "general"]},
                    "key": {"type": "string", "description": "Ключ факта для предотвращения дублей"},
                    "content": {"type": "string", "description": "Текст факта"},
                    "importance": {"type": "number", "description": "Важность от 0.1 до 1.0"},
                },
                "required": ["content"],
            },
            handler=_remember,
        )

        # 6. Memory Semantic Search
        async def _search_mem(args: Dict[str, Any]) -> Dict[str, Any]:
            q = str(args.get("query", "")).strip()
            return {"ok": True, **(await self.memory.semantic_search(q))}

        self.register(
            name="search_memory",
            description="Выполнить семантический поиск по долговременной памяти и истории прошлых диалогов.",
            parameters={
                "type": "object",
                "properties": {"query": {"type": "string", "description": "Поисковый запрос"}},
                "required": ["query"],
            },
            handler=_search_mem,
        )

        # 7. Read Local File (safe bounded read)
        async def _read_file(args: Dict[str, Any]) -> Dict[str, Any]:
            p = Path(str(args.get("path", "")).strip()).expanduser()
            if not p.exists() or not p.is_file():
                return {"ok": False, "error": f"Файл не найден: {p}"}
            raw = p.read_text(encoding="utf-8", errors="replace")[:16000]
            return {"ok": True, "path": str(p), "content": raw, "truncated": p.stat().st_size > 16000}

        self.register(
            name="read_local_file",
            description="Прочитать содержимое текстового файла или исходного кода на компьютере пользователя.",
            parameters={
                "type": "object",
                "properties": {"path": {"type": "string", "description": "Путь к файлу"}},
                "required": ["path"],
            },
            handler=_read_file,
        )

        # 8. List Directory
        async def _list_dir(args: Dict[str, Any]) -> Dict[str, Any]:
            p = Path(str(args.get("path", "~")).strip() or "~").expanduser()
            if not p.exists() or not p.is_dir():
                return {"ok": False, "error": f"Папка не найдена: {p}"}
            entries = []
            for child in sorted(p.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))[:80]:
                entries.append({"name": child.name, "is_dir": child.is_dir()})
            return {"ok": True, "path": str(p), "entries": entries}

        self.register(
            name="list_directory",
            description="Показать список файлов и папок в указанной директории.",
            parameters={
                "type": "object",
                "properties": {"path": {"type": "string", "description": "Путь к папке (по умолчанию ~)"}},
                "required": [],
            },
            handler=_list_dir,
        )

        # 9. Safe System Command (read-only diagnostics allowlist)
        async def _run_safe_cmd(args: Dict[str, Any]) -> Dict[str, Any]:
            cmd = str(args.get("command", "")).strip()
            allowed_prefixes = ("python", "node", "go version", "git status", "git log", "ping ", "ipconfig", "whoami", "hostname", "date")
            if not any(cmd.lower().startswith(pref) for pref in allowed_prefixes):
                return {"ok": False, "error": "Разрешены только безопасные диагностические команды."}

            def _exec() -> Dict[str, Any]:
                proc = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=8)
                return {
                    "ok": proc.returncode == 0,
                    "exit_code": proc.returncode,
                    "stdout": proc.stdout[:4000],
                    "stderr": proc.stderr[:1000],
                }

            return await asyncio.to_thread(_exec)

        self.register(
            name="run_safe_command",
            description="Выполнить безопасную диагностическую команду (git status, python --version, ping и т.д.).",
            parameters={
                "type": "object",
                "properties": {"command": {"type": "string"}},
                "required": ["command"],
            },
            handler=_run_safe_cmd,
        )

        # 10. Luma OS System Control (Volume, Screenshot, Optimize, Lens)
        async def _system_control(args: Dict[str, Any]) -> Dict[str, Any]:
            action = str(args.get("action", "")).strip().lower()
            if action == "volume":
                lvl = max(0, min(100, int(args.get("value", 50))))
                return await self._kernel_request("POST", "/api/kernel/audio", {"volume": lvl, "mute": lvl == 0})
            if action == "screenshot":
                return await self._kernel_request("POST", "/api/kernel/capture/screenshot", {})
            if action == "optimize_ram":
                return await self._kernel_request("POST", "/api/kernel/optimize", {})
            return {"ok": False, "error": f"Неизвестное действие системы: {action}"}

        self.register(
            name="system_control",
            description="Управлять системой Luma OS: изменить громкость (volume), сделать скриншот (screenshot), очистить RAM (optimize_ram).",
            parameters={
                "type": "object",
                "properties": {
                    "action": {"type": "string", "enum": ["volume", "screenshot", "optimize_ram"]},
                    "value": {"type": "number", "description": "Значение громкости 0..100 (для action=volume)"},
                },
                "required": ["action"],
            },
            handler=_system_control,
        )
