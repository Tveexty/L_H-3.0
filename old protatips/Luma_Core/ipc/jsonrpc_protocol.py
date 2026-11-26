# -*- coding: utf-8 -*-
"""
Luma Beta — Протокол JSON-RPC 2.0 (Luma_Core/ipc/jsonrpc_protocol.py)
Константы кодов ошибок и вспомогательные конструкторы пакетов JSON-RPC 2.0.
"""

from typing import Any, Dict, Optional
import json

PARSE_ERROR = -32700
INVALID_REQUEST = -32600
METHOD_NOT_FOUND = -32601
INVALID_PARAMS = -32602
INTERNAL_ERROR = -32603


def build_request(method: str, params: Optional[Dict[str, Any]] = None, req_id: int = 1) -> str:
    payload: Dict[str, Any] = {
        "jsonrpc": "2.0",
        "method": method,
        "id": req_id,
    }
    if params is not None:
        payload["params"] = params
    return json.dumps(payload, ensure_ascii=False)


def build_response(result: Any, req_id: Any = 1) -> str:
    return json.dumps(
        {
            "jsonrpc": "2.0",
            "result": result,
            "id": req_id,
        },
        ensure_ascii=False,
    )
