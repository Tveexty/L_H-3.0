"""
Luma Ai Nitrogen — Core Agent Brain
Assembles the System Persona, 3-Tier Memory (Short-Term + SQLite + Semantic RAG),
runs streaming OpenAI-compatible inference with multi-turn Function Calling,
and triggers asynchronous background Fact Extraction without blocking the UI.
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional

from .config import NitrogenConfig
from .llm_client import UniversalLLMClient
from .memory_manager import MemoryManager
from .tools import ToolRegistry

SYSTEM_PERSONA_PROMPT = """Ты — **Luma Ai Nitrogen**, встроенный интеллектуальный ассистент, программист и персональный помощник в Luma OS.

### Твоя идентичность и стиль:
- Отвечай чётко, умно, структурированно и без воды. Адаптируйся к языку и уровню пользователя (по умолчанию отвечай на русском).
- Помогай с любыми общими, техническими, учебными и бытовыми задачами, анализом текстов, планированием и написанием/отладкой/рефакторингом кода.
- Весь код оформляй в чистых блоках Markdown с указанием языка (например, ```python, ```ts, ```go, ```csharp).
- Если пользователь просит запланировать/посмотреть/удалить событие в календаре, узнать состояние ПК, прочитать файл или запомнить факт — смело используй доступные инструменты (Function Calling).
- Используй долговременную память естественно: помни имя, проекты, стек технологий и предпочтения пользователя, но не перечисляй память без необходимости.
"""


class LumaAiNitrogenAgent:
    """Orchestrates context assembly, streaming responses, tool execution, and background memory updates."""

    def __init__(
        self,
        config: NitrogenConfig,
        llm_client: UniversalLLMClient,
        memory: MemoryManager,
        tools: ToolRegistry,
    ) -> None:
        self.config = config
        self.llm = llm_client
        self.memory = memory
        self.tools = tools
        self._bg_tasks: set[asyncio.Task[Any]] = set()

    def _spawn_background(self, coro: Any) -> None:
        task = asyncio.create_task(coro)
        self._bg_tasks.add(task)
        task.add_done_callback(self._bg_tasks.discard)

    async def _build_messages(
        self,
        session_id: str,
        user_message: str,
        extra_context: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M (%A)")
        rag_block = await self.memory.build_rag_prompt_block(
            query=user_message,
            session_id=session_id,
            llm_client=self.llm,
        )

        system_parts = [SYSTEM_PERSONA_PROMPT, f"Текущее локальное время: {now_str}."]
        if rag_block:
            system_parts.append(rag_block)
        if extra_context and extra_context.strip():
            system_parts.append(f"Контекст активного окна Luma OS:\n{extra_context.strip()[:4000]}")

        messages: List[Dict[str, Any]] = [{"role": "system", "content": "\n\n".join(system_parts)}]

        # Tier 1: Short-term conversation history
        recent = self.memory.get_recent_messages(session_id, limit=self.config.short_term_window)
        for m in recent:
            role = m["role"] if m["role"] in ("user", "assistant", "system") else "user"
            messages.append({"role": role, "content": m["content"]})

        # Ensure latest user turn is at the end
        if not recent or recent[-1]["content"] != user_message or recent[-1]["role"] != "user":
            messages.append({"role": "user", "content": user_message})

        return messages

    async def stream_reply(
        self,
        user_message: str,
        session_id: Optional[str] = None,
        extra_context: Optional[str] = None,
        use_tools: Optional[bool] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream assistant response token-by-token, handling Function Calling loops transparently
        and scheduling background Fact Extraction upon completion.
        """
        sid = self.memory.ensure_session(session_id)
        await self.memory.save_message(sid, "user", user_message, llm_client=self.llm)

        yield {"type": "session", "session_id": sid, "model": self.config.model_name}

        messages = await self._build_messages(sid, user_message, extra_context=extra_context)
        tools_enabled = self.config.enable_tools if use_tools is None else use_tools
        tool_schemas = self.tools.openai_schemas() if tools_enabled else None

        full_reply_parts: List[str] = []
        max_tool_rounds = 4

        for _round in range(max_tool_rounds):
            pending_tool_calls: List[Dict[str, Any]] = []
            round_text: List[str] = []

            async for event in self.llm.stream_chat(messages=messages, tools=tool_schemas):
                ev_type = event.get("type")
                if ev_type == "token":
                    tok = str(event.get("text", ""))
                    if tok:
                        round_text.append(tok)
                        full_reply_parts.append(tok)
                        yield {"type": "token", "text": tok}
                elif ev_type == "tool_calls":
                    pending_tool_calls = list(event.get("calls") or [])

            if not pending_tool_calls:
                break

            # Append assistant tool call request & execute each requested tool
            messages.append(
                {
                    "role": "assistant",
                    "content": "".join(round_text) or None,
                    "tool_calls": pending_tool_calls,
                }
            )
            for tc in pending_tool_calls:
                fn = tc.get("function") or {}
                fn_name = str(fn.get("name", ""))
                fn_args = fn.get("arguments", "{}")
                yield {"type": "tool_start", "tool": fn_name, "arguments": fn_args}
                result = await self.tools.execute(fn_name, fn_args)
                yield {"type": "tool_result", "tool": fn_name, "result": result}
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": str(tc.get("id", "call_0")),
                        "name": fn_name,
                        "content": json.dumps(result, ensure_ascii=False),
                    }
                )

        final_reply = "".join(full_reply_parts).strip()
        if final_reply:
            await self.memory.save_message(
                sid,
                "assistant",
                final_reply,
                llm_client=self.llm,
                model=self.config.model_name,
            )
            # Trigger non-blocking background Fact Extractor
            self._spawn_background(
                self.memory.extract_and_upsert_facts(
                    llm_client=self.llm,
                    session_id=sid,
                    user_message=user_message,
                    assistant_message=final_reply,
                )
            )

        yield {
            "type": "done",
            "session_id": sid,
            "model": self.config.model_name,
            "reply": final_reply,
        }

    async def reply(
        self,
        user_message: str,
        session_id: Optional[str] = None,
        extra_context: Optional[str] = None,
        use_tools: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """Convenience non-streaming wrapper collecting the full streamed reply and tool traces."""
        sid = session_id or ""
        text_parts: List[str] = []
        tool_events: List[Dict[str, Any]] = []
        async for ev in self.stream_reply(
            user_message=user_message,
            session_id=session_id,
            extra_context=extra_context,
            use_tools=use_tools,
        ):
            t = ev.get("type")
            if t == "session":
                sid = str(ev.get("session_id", sid))
            elif t == "token":
                text_parts.append(str(ev.get("text", "")))
            elif t == "tool_result":
                tool_events.append({"tool": ev.get("tool"), "result": ev.get("result")})
        return {
            "ok": True,
            "session_id": sid,
            "model": self.config.model_name,
            "reply": "".join(text_parts).strip(),
            "tool_results": tool_events,
        }
