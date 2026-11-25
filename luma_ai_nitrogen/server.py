"""
Luma Ai Nitrogen — FastAPI REST + SSE Streaming + WebSocket Server
Connects cleanly to Luma OS React UI, Go LumaCore Kernel, or any C#/Desktop client.
Default bind: http://127.0.0.1:49225
"""

from __future__ import annotations

import json
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .agent import LumaAiNitrogenAgent
from .config import NitrogenConfig, PROVIDER_PRESETS, load_config
from .llm_client import UniversalLLMClient
from .memory_manager import MemoryManager
from .tools import ToolRegistry

config: NitrogenConfig = load_config()
memory = MemoryManager(config)
llm_client = UniversalLLMClient(config)
tools = ToolRegistry(config, memory)
agent = LumaAiNitrogenAgent(config, llm_client, memory, tools)

app = FastAPI(
    title="Luma Ai Nitrogen API",
    version="1.6.3",
    description="Универсальный ИИ-ассистент Luma Ai Nitrogen с OpenAI-совместимым стримингом, Function Calling и трёхуровневой SQLite+RAG памятью.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: Optional[str] = None
    extra_context: Optional[str] = None
    use_tools: Optional[bool] = None


class ConfigUpdateRequest(BaseModel):
    preset: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    model_name: Optional[str] = None
    embed_model: Optional[str] = None
    temperature: Optional[float] = None
    short_term_window: Optional[int] = None
    auto_extract_facts: Optional[bool] = None
    enable_tools: Optional[bool] = None


class FactCreateRequest(BaseModel):
    category: str = "general"
    key: str = ""
    content: str = Field(..., min_length=2)
    importance: float = 0.85


@app.get("/api/health")
async def health() -> Dict[str, Any]:
    llm_status = await llm_client.check_health()
    return {
        "ok": True,
        "name": "Luma Ai Nitrogen",
        "version": "1.6.3",
        "llm": llm_status,
        "memory": memory.get_stats(),
        "tools_count": len(tools.list_tools()),
    }


@app.get("/api/config")
async def get_config() -> Dict[str, Any]:
    return {"ok": True, "config": config.to_public_dict()}


@app.post("/api/config")
async def update_config(req: ConfigUpdateRequest) -> Dict[str, Any]:
    if req.preset and req.preset in PROVIDER_PRESETS:
        p = PROVIDER_PRESETS[req.preset]
        config.base_url = p["base_url"]
        if p["api_key"]:
            config.api_key = p["api_key"]
        config.model_name = p["model_name"]
        config.embed_model = p["embed_model"]

    if req.base_url is not None and req.base_url.strip():
        config.base_url = req.base_url.strip().rstrip("/")
    if req.api_key is not None:
        config.api_key = req.api_key.strip()
    if req.model_name is not None and req.model_name.strip():
        config.model_name = req.model_name.strip()
    if req.embed_model is not None:
        config.embed_model = req.embed_model.strip()
    if req.temperature is not None:
        config.temperature = max(0.0, min(1.5, float(req.temperature)))
    if req.short_term_window is not None:
        config.short_term_window = max(6, min(128, int(req.short_term_window)))
    if req.auto_extract_facts is not None:
        config.auto_extract_facts = bool(req.auto_extract_facts)
    if req.enable_tools is not None:
        config.enable_tools = bool(req.enable_tools)

    config.save()
    return {"ok": True, "config": config.to_public_dict()}


@app.post("/api/chat")
async def chat_sync(req: ChatRequest) -> Dict[str, Any]:
    try:
        return await agent.reply(
            user_message=req.message,
            session_id=req.session_id,
            extra_context=req.extra_context,
            use_tools=req.use_tools,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}") from exc


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest) -> StreamingResponse:
    async def event_generator():
        try:
            async for ev in agent.stream_reply(
                user_message=req.message,
                session_id=req.session_id,
                extra_context=req.extra_context,
                use_tools=req.use_tools,
            ):
                yield f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'error': str(exc)}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.websocket("/ws/chat")
async def websocket_chat(ws: WebSocket) -> None:
    await ws.accept()
    try:
        while True:
            raw = await ws.receive_text()
            try:
                req = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "error": "Invalid JSON payload"})
                continue
            msg = str(req.get("message", "")).strip()
            if not msg:
                await ws.send_json({"type": "error", "error": "Empty message"})
                continue
            try:
                async for ev in agent.stream_reply(
                    user_message=msg,
                    session_id=req.get("session_id"),
                    extra_context=req.get("extra_context"),
                    use_tools=req.get("use_tools"),
                ):
                    await ws.send_json(ev)
            except Exception as exc:
                await ws.send_json({"type": "error", "error": str(exc)})
    except WebSocketDisconnect:
        return


@app.get("/api/sessions")
async def get_sessions(limit: int = 50) -> Dict[str, Any]:
    return {"ok": True, "sessions": memory.list_sessions(limit=limit)}


@app.get("/api/sessions/{session_id}/messages")
async def get_session_messages(session_id: str, limit: int = 100) -> Dict[str, Any]:
    return {"ok": True, "session_id": session_id, "messages": memory.get_recent_messages(session_id, limit=limit)}


@app.get("/api/memory/stats")
async def memory_stats() -> Dict[str, Any]:
    return {"ok": True, "stats": memory.get_stats()}


@app.get("/api/memory/facts")
async def list_memory_facts(active_only: bool = True, limit: int = 200) -> Dict[str, Any]:
    return {"ok": True, "facts": memory.list_facts(active_only=active_only, limit=limit), "stats": memory.get_stats()}


@app.post("/api/memory/facts")
async def add_memory_fact(req: FactCreateRequest) -> Dict[str, Any]:
    res = await memory.upsert_fact(
        category=req.category,
        fact_key=req.key,
        content=req.content,
        importance=req.importance,
        llm_client=llm_client,
    )
    return {"ok": True, "result": res, "stats": memory.get_stats()}


@app.delete("/api/memory/facts/{fact_id}")
async def delete_memory_fact(fact_id: str) -> Dict[str, Any]:
    removed = memory.delete_fact(fact_id)
    return {"ok": removed, "stats": memory.get_stats()}


@app.get("/api/memory/search")
async def search_memory_endpoint(q: str, top_k: int = 10) -> Dict[str, Any]:
    res = await memory.semantic_search(q, llm_client=llm_client, top_k_facts=top_k, top_k_chunks=top_k)
    return {"ok": True, **res}


@app.get("/api/tools")
async def list_registered_tools() -> Dict[str, Any]:
    return {"ok": True, "tools": tools.list_tools()}
