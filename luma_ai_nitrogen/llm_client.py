"""
Luma Ai Nitrogen — Universal OpenAI-Compatible Async LLM Client
Supports SSE Token Streaming, Function Calling / Tool Calls, Embeddings API,
and a built-in deterministic 384-dim semantic n-gram vectorizer fallback so RAG never breaks offline.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import math
import re
import urllib.parse
import urllib.request
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple

try:
    import httpx
except ImportError:  # pragma: no cover - stdlib fallback when httpx not yet installed
    httpx = None  # type: ignore[assignment]

from .config import NitrogenConfig

logger = logging.getLogger("luma_ai_nitrogen.llm")

_WORD_RE = re.compile(r"[a-zA-Zа-яА-ЯёЁ0-9_+#.-]{2,}")
_MODEL_PREFIX_RE = re.compile(r"^(?:models/)+", re.IGNORECASE)


def sanitize_gemini_model_id(model_name: str) -> str:
    """Strip accidental leading `models/` prefixes or trailing `:generateContent` suffixes."""
    clean = (model_name or "").strip().strip("/")
    clean = _MODEL_PREFIX_RE.sub("", clean)
    if ":" in clean and clean.lower().startswith("gemini"):
        clean = clean.split(":", 1)[0].strip()
    return clean


def mask_url_secret(raw_url: str) -> str:
    """Return URL safe for logging with API key query parameter masked."""
    try:
        parts = urllib.parse.urlsplit(raw_url)
        if not parts.query:
            return raw_url
        qs = urllib.parse.parse_qsl(parts.query, keep_blank_values=True)
        masked_qs = [
            (k, "***" if k.lower() in ("key", "api_key", "apikey", "token") else v)
            for k, v in qs
        ]
        return urllib.parse.urlunsplit(
            (parts.scheme, parts.netloc, parts.path, urllib.parse.urlencode(masked_qs), parts.fragment)
        )
    except Exception:
        return re.sub(r"([?&](?:key|api_key|apikey)=)[^&]+", r"\1***", raw_url, flags=re.IGNORECASE)


def format_http_error_detail(
    status_code: int,
    reason_phrase: str,
    body_text: str,
    model_name: str,
    sanitized_url: str,
) -> str:
    """Always extract a meaningful diagnostic string from non-200 LLM HTTP responses."""
    raw = (body_text or "").strip()
    detail = ""
    if raw:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list) and parsed and isinstance(parsed[0], dict):
                parsed = parsed[0]
            if isinstance(parsed, dict):
                err = parsed.get("error")
                if isinstance(err, dict):
                    msg = str(err.get("message") or "").strip()
                    st = str(err.get("status") or "").strip()
                    if msg and st:
                        detail = f"{msg} [{st}]"
                    elif msg:
                        detail = msg
                elif isinstance(err, str) and err.strip():
                    detail = err.strip()
                elif isinstance(parsed.get("message"), str) and parsed["message"].strip():
                    detail = parsed["message"].strip()
        except Exception:
            pass
        if not detail:
            compact = re.sub(r"<[^>]+>", " ", raw)
            compact = re.sub(r"\s+", " ", compact).strip()
            detail = compact[:420]
    if not detail:
        rp = f" {reason_phrase}" if reason_phrase else ""
        detail = f"пустой ответ сервера ({status_code}{rp}) — проверьте URL {sanitized_url} и модель {model_name}"
    return f"HTTP {status_code} ({model_name}): {detail}"


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
    """Async Universal LLM client for Ollama, LM Studio, Google Gemini (native & OpenAI-compat), Groq, OpenRouter."""

    def __init__(self, config: NitrogenConfig) -> None:
        self.config = config

    def _is_gemini_host(self) -> bool:
        return "generativelanguage.googleapis.com" in (self.config.base_url or "").lower()

    def _is_native_gemini(self) -> bool:
        base = (self.config.base_url or "").strip().rstrip("/").lower()
        return self._is_gemini_host() and "/openai" not in base and not base.endswith("/chat/completions")

    def _clean_model_name(self) -> str:
        raw = (self.config.model_name or "").strip()
        if self._is_gemini_host() or raw.lower().startswith("models/gemini"):
            return sanitize_gemini_model_id(raw) or "gemini-2.5-flash"
        return raw

    def _resolve_chat_endpoint(self, stream: bool) -> Tuple[str, bool]:
        """
        Return (full_url, is_native_gemini).
        - Native Gemini SSE:  https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={apiKey}
        - Native Gemini REST: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}
        - OpenAI-compatible:  https://generativelanguage.googleapis.com/v1beta/openai/chat/completions (or any provider /chat/completions)
        """
        base = (self.config.base_url or "").strip().rstrip("/")
        model = self._clean_model_name()

        if self._is_native_gemini():
            # Strip accidental trailing /models or /models/{id} from base URL
            base = re.sub(r"/models(?:/[^/]+)?$", "", base, flags=re.IGNORECASE)
            if not re.search(r"/v1(?:beta|alpha)?$", base, flags=re.IGNORECASE):
                base = f"{base}/v1beta"
            action = "streamGenerateContent" if stream else "generateContent"
            key_q = urllib.parse.quote(self.config.api_key or "", safe="")
            if stream:
                return f"{base}/models/{model}:{action}?alt=sse&key={key_q}", True
            return f"{base}/models/{model}:{action}?key={key_q}", True

        if base.lower().endswith("/chat/completions"):
            return base, False
        return f"{base}/chat/completions", False

    def _headers(self, native_gemini: bool = False) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.config.api_key and not native_gemini:
            headers["Authorization"] = f"Bearer {self.config.api_key}"
        return headers

    def _endpoint(self, suffix: str) -> str:
        base = self.config.base_url.rstrip("/")
        clean_suffix = suffix.lstrip("/")
        if base.lower().endswith("/" + clean_suffix.lower()):
            return base
        return f"{base}/{clean_suffix}"

    @staticmethod
    def _to_native_gemini_payload(
        messages: List[Dict[str, Any]],
        temperature: float,
        max_tokens: int,
    ) -> Dict[str, Any]:
        sys_parts: List[str] = []
        contents: List[Dict[str, Any]] = []
        for m in messages:
            role = str(m.get("role") or "user").lower()
            text = str(m.get("content") or "")
            if not text.strip():
                continue
            if role == "system":
                sys_parts.append(text)
            else:
                g_role = "model" if role in ("assistant", "model") else "user"
                contents.append({"role": g_role, "parts": [{"text": text}]})
        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        if sys_parts:
            payload["system_instruction"] = {"parts": [{"text": "\n\n".join(sys_parts)}]}
        return payload

    async def check_health(self) -> Dict[str, Any]:
        """Probe configured OpenAI-compatible or native Gemini server and list available models."""
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                if self._is_native_gemini():
                    base = re.sub(r"/models(?:/[^/]+)?$", "", self.config.base_url.rstrip("/"), flags=re.IGNORECASE)
                    if not re.search(r"/v1(?:beta|alpha)?$", base, flags=re.IGNORECASE):
                        base = f"{base}/v1beta"
                    url = f"{base}/models?key={urllib.parse.quote(self.config.api_key or '', safe='')}"
                    r = await client.get(url, headers=self._headers(native_gemini=True))
                    if r.status_code == 200:
                        data = r.json()
                        models = [
                            sanitize_gemini_model_id(str(m.get("name", "")))
                            for m in data.get("models", [])
                            if isinstance(m, dict)
                        ]
                        return {
                            "reachable": True,
                            "base_url": self.config.base_url,
                            "active_model": self._clean_model_name(),
                            "available_models": models,
                        }
                    return {
                        "reachable": False,
                        "status_code": r.status_code,
                        "error": format_http_error_detail(
                            r.status_code, r.reason_phrase or "", r.text, self._clean_model_name(), mask_url_secret(url)
                        ),
                        "base_url": self.config.base_url,
                        "available_models": [],
                    }

                r = await client.get(self._endpoint("models"), headers=self._headers())
                if r.status_code == 200:
                    data = r.json()
                    models = [m.get("id", "") for m in data.get("data", []) if isinstance(m, dict)]
                    return {
                        "reachable": True,
                        "base_url": self.config.base_url,
                        "active_model": self._clean_model_name(),
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

        if self.config.embed_model and not self._is_native_gemini():
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
        model = self._clean_model_name()
        temp = self.config.temperature if temperature is None else temperature
        max_tok = self.config.max_tokens if max_tokens is None else max_tokens
        endpoint, is_native_gemini = self._resolve_chat_endpoint(stream=False)
        sanitized_url = mask_url_secret(endpoint)
        logger.info("[LumaAiNitrogen] POST %s (model=%s, native_gemini=%s)", sanitized_url, model, is_native_gemini)

        if is_native_gemini:
            payload = self._to_native_gemini_payload(messages, temp, max_tok)
            async with httpx.AsyncClient(timeout=self.config.request_timeout_sec) as client:
                r = await client.post(endpoint, headers=self._headers(native_gemini=True), json=payload)
                if r.status_code >= 400:
                    raise RuntimeError(
                        format_http_error_detail(r.status_code, r.reason_phrase or "", r.text, model, sanitized_url)
                    )
                data = r.json()
                text_parts: List[str] = []
                for cand in data.get("candidates") or []:
                    for part in (cand.get("content") or {}).get("parts") or []:
                        if part.get("text"):
                            text_parts.append(str(part["text"]))
                return {
                    "choices": [{"message": {"role": "assistant", "content": "".join(text_parts)}, "finish_reason": "stop"}],
                    "model": model,
                }

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temp,
            "max_tokens": max_tok,
            "stream": False,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
        if response_format:
            payload["response_format"] = response_format

        async with httpx.AsyncClient(timeout=self.config.request_timeout_sec) as client:
            r = await client.post(endpoint, headers=self._headers(), json=payload)
            if r.status_code >= 400:
                raise RuntimeError(
                    format_http_error_detail(r.status_code, r.reason_phrase or "", r.text, model, sanitized_url)
                )
            return r.json()

    async def stream_chat(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        True SSE token streaming generator supporting native Gemini SSE AND OpenAI-compatible SSE
        (including streamed tool_calls).
        Yields events:
          - {"type": "token", "text": "..."}
          - {"type": "tool_calls", "calls": [...]}
          - {"type": "done", "finish_reason": "..."}
        """
        model = self._clean_model_name()
        temp = self.config.temperature if temperature is None else temperature
        max_tok = self.config.max_tokens if max_tokens is None else max_tokens
        endpoint, is_native_gemini = self._resolve_chat_endpoint(stream=True)
        sanitized_url = mask_url_secret(endpoint)
        logger.info("[LumaAiNitrogen][SSE] POST %s (model=%s, native_gemini=%s)", sanitized_url, model, is_native_gemini)

        if is_native_gemini:
            payload = self._to_native_gemini_payload(messages, temp, max_tok)
            headers = self._headers(native_gemini=True)
            headers["Accept"] = "text/event-stream"
            async with httpx.AsyncClient(timeout=self.config.request_timeout_sec) as client:
                async with client.stream("POST", endpoint, headers=headers, json=payload) as resp:
                    if resp.status_code != 200:
                        err_body = (await resp.aread()).decode("utf-8", errors="replace")
                        raise RuntimeError(
                            format_http_error_detail(
                                resp.status_code, resp.reason_phrase or "", err_body, model, sanitized_url
                            )
                        )
                    async for raw_line in resp.aiter_lines():
                        line = raw_line.strip()
                        if not line or not line.startswith("data:"):
                            continue
                        data_str = line[5:].strip()
                        if not data_str or data_str == "[DONE]":
                            continue
                        try:
                            chunk = json.loads(data_str)
                        except json.JSONDecodeError:
                            continue
                        if isinstance(chunk, dict) and chunk.get("error"):
                            err = chunk["error"]
                            msg = err.get("message") if isinstance(err, dict) else str(err)
                            raise RuntimeError(f"Gemini ({model}): {msg}")
                        for cand in chunk.get("candidates") or []:
                            for part in (cand.get("content") or {}).get("parts") or []:
                                text_part = part.get("text")
                                if text_part:
                                    yield {"type": "token", "text": str(text_part)}
            yield {"type": "done", "finish_reason": "stop"}
            return

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temp,
            "max_tokens": max_tok,
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
                endpoint,
                headers=self._headers(),
                json=payload,
            ) as resp:
                if resp.status_code != 200:
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
                    raise RuntimeError(
                        format_http_error_detail(
                            resp.status_code, resp.reason_phrase or "", err_body, model, sanitized_url
                        )
                    )

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

