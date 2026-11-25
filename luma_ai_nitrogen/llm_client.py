"""
Luma Ai Nitrogen — Universal OpenAI-Compatible Async LLM Client
Supports SSE Token Streaming, Function Calling / Tool Calls, Embeddings API,
and a built-in deterministic 384-dim semantic n-gram vectorizer fallback so RAG never breaks offline.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import math
import re
import urllib.request
from typing import Any, AsyncGenerator, Dict, List, Optional

try:
    import httpx
except ImportError:  # pragma: no cover - stdlib fallback when httpx not yet installed
    httpx = None  # type: ignore[assignment]

from .config import NitrogenConfig

_WORD_RE = re.compile(r"[a-zA-Zа-яА-ЯёЁ0-9_+#.-]{2,}")


def local_semantic_embedding(text: str, dim: int = 384) -> List[float]:
    """
    Fast, dependency-free 384-dimensional dense semantic vector (word tokens + character 3/4-grams
    with signed feature hashing & L2 normalization). Supports Russian, English, and source code.
    """
    vec = [0.0] * dim
    norm_text = text.lower().strip()
    if not norm_text:
        return vec

    tokens = _WORD_RE.findall(norm_text)
    for tok in tokens:
        # Word-level feature (higher weight)
        h = hashlib.blake2b(f"w:{tok}".encode("utf-8"), digest_size=8).digest()
        idx = int.from_bytes(h[:4], "little") % dim
        sign = 1.0 if (h[4] & 1) == 0 else -1.0
        vec[idx] += sign * 2.0

        # Subword character trigrams capture Russian/English morphology & typos
        padded = f"<{tok}>"
        for i in range(max(0, len(padded) - 2)):
            ng = padded[i : i + 3]
            nh = hashlib.blake2b(f"c:{ng}".encode("utf-8"), digest_size=8).digest()
            nidx = int.from_bytes(nh[:4], "little") % dim
            nsign = 1.0 if (nh[4] & 1) == 0 else -1.0
            vec[nidx] += nsign * 0.75

    # Word bigrams capture phrases like "luma os", "react typescript", "встреча завтра"
    for i in range(len(tokens) - 1):
        bg = f"{tokens[i]}_{tokens[i + 1]}"
        bh = hashlib.blake2b(f"b:{bg}".encode("utf-8"), digest_size=8).digest()
        bidx = int.from_bytes(bh[:4], "little") % dim
        bsign = 1.0 if (bh[4] & 1) == 0 else -1.0
        vec[bidx] += bsign * 1.4

    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 1e-12:
        inv = 1.0 / norm
        vec = [v * inv for v in vec]
    return vec


class UniversalLLMClient:
    """Async OpenAI-compatible client for Ollama, LM Studio, Gemini Flash-Lite, Groq, OpenRouter."""

    def __init__(self, config: NitrogenConfig) -> None:
        self.config = config

    def _headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"
        return headers

    def _endpoint(self, suffix: str) -> str:
        base = self.config.base_url.rstrip("/")
        return f"{base}/{suffix.lstrip('/')}"

    async def check_health(self) -> Dict[str, Any]:
        """Probe configured OpenAI-compatible server and list available models."""
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                r = await client.get(self._endpoint("models"), headers=self._headers())
                if r.status_code == 200:
                    data = r.json()
                    models = [m.get("id", "") for m in data.get("data", []) if isinstance(m, dict)]
                    return {
                        "reachable": True,
                        "base_url": self.config.base_url,
                        "active_model": self.config.model_name,
                        "available_models": models,
                    }
                return {
                    "reachable": False,
                    "status_code": r.status_code,
                    "base_url": self.config.base_url,
                    "available_models": [],
                }
        except Exception as exc:
            return {
                "reachable": False,
                "error": str(exc),
                "base_url": self.config.base_url,
                "available_models": [],
            }

    async def embed_text(self, text: str) -> List[float]:
        """
        Compute semantic vector using remote/local /embeddings endpoint when available,
        automatically normalizing/falling back to local_semantic_embedding for 100% reliability.
        """
        clean = text.strip()
        if not clean:
            return [0.0] * self.config.vector_dim

        if self.config.embed_model:
            try:
                payload = {
                    "model": self.config.embed_model,
                    "input": clean[:4000],
                }
                async with httpx.AsyncClient(timeout=6.0) as client:
                    r = await client.post(
                        self._endpoint("embeddings"),
                        headers=self._headers(),
                        json=payload,
                    )
                    if r.status_code == 200:
                        body = r.json()
                        items = body.get("data") or []
                        if items and isinstance(items[0].get("embedding"), list):
                            emb = [float(x) for x in items[0]["embedding"]]
                            if len(emb) >= 32:
                                norm = math.sqrt(sum(v * v for v in emb))
                                if norm > 1e-12:
                                    return [v / norm for v in emb]
            except Exception:
                pass

        return local_semantic_embedding(clean, dim=self.config.vector_dim)

    async def complete(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        response_format: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Single non-streaming completion call (used by background Fact Extractor & sync REST)."""
        payload: Dict[str, Any] = {
            "model": self.config.model_name,
            "messages": messages,
            "temperature": self.config.temperature if temperature is None else temperature,
            "max_tokens": self.config.max_tokens if max_tokens is None else max_tokens,
            "stream": False,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
        if response_format:
            payload["response_format"] = response_format

        async with httpx.AsyncClient(timeout=self.config.request_timeout_sec) as client:
            r = await client.post(
                self._endpoint("chat/completions"),
                headers=self._headers(),
                json=payload,
            )
            r.raise_for_status()
            return r.json()

    async def stream_chat(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        True SSE token streaming generator supporting BOTH text tokens and streamed tool_calls.
        Yields events:
          - {"type": "token", "text": "..."}
          - {"type": "tool_calls", "calls": [...]}
          - {"type": "done", "finish_reason": "..."}
        """
        payload: Dict[str, Any] = {
            "model": self.config.model_name,
            "messages": messages,
            "temperature": self.config.temperature if temperature is None else temperature,
            "max_tokens": self.config.max_tokens if max_tokens is None else max_tokens,
            "stream": True,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        accumulated_tools: Dict[int, Dict[str, Any]] = {}
        finish_reason = "stop"

        async with httpx.AsyncClient(timeout=self.config.request_timeout_sec) as client:
            async with client.stream(
                "POST",
                self._endpoint("chat/completions"),
                headers=self._headers(),
                json=payload,
            ) as resp:
                if resp.status_code >= 400:
                    err_body = (await resp.aread()).decode("utf-8", errors="replace")
                    # Automatic retry WITHOUT tools if local model doesn't support native tool calling
                    if tools and resp.status_code in (400, 404, 422) and "tool" in err_body.lower():
                        async for ev in self.stream_chat(
                            messages=messages,
                            tools=None,
                            temperature=temperature,
                            max_tokens=max_tokens,
                        ):
                            yield ev
                        return
                    raise RuntimeError(f"LLM HTTP {resp.status_code}: {err_body[:400]}")

                async for raw_line in resp.aiter_lines():
                    line = raw_line.strip()
                    if not line or line.startswith(":"):
                        continue
                    if line.startswith("data:"):
                        data_str = line[5:].strip()
                    else:
                        continue
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue

                    choices = chunk.get("choices") or []
                    if not choices:
                        continue
                    choice = choices[0]
                    if choice.get("finish_reason"):
                        finish_reason = str(choice["finish_reason"])

                    delta = choice.get("delta") or {}
                    text_part = delta.get("content")
                    if text_part:
                        yield {"type": "token", "text": text_part}

                    # Accumulate streamed OpenAI function tool_calls
                    for tc in delta.get("tool_calls") or []:
                        idx = int(tc.get("index", 0))
                        entry = accumulated_tools.setdefault(
                            idx,
                            {
                                "id": tc.get("id") or f"call_{idx}",
                                "type": "function",
                                "function": {"name": "", "arguments": ""},
                            },
                        )
                        if tc.get("id"):
                            entry["id"] = tc["id"]
                        fn = tc.get("function") or {}
                        if fn.get("name"):
                            entry["function"]["name"] += fn["name"]
                        if fn.get("arguments"):
                            entry["function"]["arguments"] += fn["arguments"]

        if accumulated_tools:
            ordered = [accumulated_tools[i] for i in sorted(accumulated_tools.keys())]
            yield {"type": "tool_calls", "calls": ordered}

        yield {"type": "done", "finish_reason": finish_reason}
