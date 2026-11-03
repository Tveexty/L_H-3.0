#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестовый IPC-клиент для проверки ядра Luma Beta (Luma_Core/test_ipc_client.py).
Подключается к 127.0.0.1:49215 (или поднимает временный сокет, если демон еще не запущен)
и проверяет методы JSON-RPC 2.0:
  1. {"jsonrpc": "2.0", "method": "system.ping", "id": 1}
  2. {"jsonrpc": "2.0", "method": "widgets.get_all", "id": 2}
  3. {"jsonrpc": "2.0", "method": "widgets.update_note", "params": {"text": "..."}, "id": 3}
  4. {"jsonrpc": "2.0", "method": "widgets.get_all", "id": 4}
"""

import asyncio
import json
from luma_core import DEFAULT_IPC_HOST, DEFAULT_IPC_PORT, LumaCoreServer


async def run_client_requests(host: str, port: int) -> None:
    reader, writer = await asyncio.open_connection(host, port)
    requests = [
        {"jsonrpc": "2.0", "method": "system.ping", "id": 1},
        {"jsonrpc": "2.0", "method": "widgets.get_all", "id": 2},
        {
            "jsonrpc": "2.0",
            "method": "widgets.update_note",
            "params": {"text": "Обновленная заметка через IPC JSON-RPC 2.0!"},
            "id": 3,
        },
        {"jsonrpc": "2.0", "method": "widgets.get_all", "id": 4},
    ]

    for req_obj in requests:
        raw_req = json.dumps(req_obj, ensure_ascii=False)
        print(f"\n[CLIENT -> CORE] {raw_req}")
        writer.write((raw_req + "\n").encode("utf-8"))
        await writer.drain()
        resp_line = await reader.readline()
        parsed = json.loads(resp_line.decode("utf-8"))
        print(f"[CORE -> CLIENT] {json.dumps(parsed, ensure_ascii=False, indent=2)}")

    writer.close()
    await writer.wait_closed()


async def main() -> None:
    try:
        # Пробуем подключиться к уже запущенному ядру на 127.0.0.1:49215
        await run_client_requests(DEFAULT_IPC_HOST, DEFAULT_IPC_PORT)
    except OSError:
        # Если демон не запущен отдельно — поднимаем встроенный экземпляр для теста
        server = LumaCoreServer(host=DEFAULT_IPC_HOST, port=DEFAULT_IPC_PORT)
        server.metrics.start()
        tcp_srv = await asyncio.start_server(server._handle_client, DEFAULT_IPC_HOST, DEFAULT_IPC_PORT)
        async with tcp_srv:
            await run_client_requests(DEFAULT_IPC_HOST, DEFAULT_IPC_PORT)
        await server.metrics.stop()


if __name__ == "__main__":
    asyncio.run(main())
