"""
Luma Ai Nitrogen — 3-Tier Aggressive Persistent Memory Manager
  Tier 1: Short-Term Context Window (last N messages in active session)
  Tier 2: Long-Term SQLite WAL History (all sessions, timestamps, messages & extracted code snippets)
  Tier 3: Semantic Vector Store (float32 BLOB embeddings + cosine similarity RAG + Background Fact Extractor
          with automatic deduplication and superseding of outdated facts)
"""

from __future__ import annotations

import array
import json
import math
import os
import re
import sqlite3
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from .config import NitrogenConfig
from .llm_client import UniversalLLMClient, local_semantic_embedding

_CODE_BLOCK_RE = re.compile(r"```([a-zA-Z0-9_+#.-]*)\n(.*?)```", re.DOTALL)

# Deterministic heuristic fact patterns (Russian & English) as zero-latency backup when LLM extractor is unavailable
_HEURISTIC_FACT_PATTERNS: List[Tuple[str, str, re.Pattern[str]]] = [
    ("identity", "user_name", re.compile(r"(?:меня зовут|моё имя|мое имя|my name is|i am called)\s+([A-Za-zА-Яа-яЁё0-9_-]{2,32})", re.IGNORECASE)),
    ("identity", "user_city", re.compile(r"(?:я живу в|мой город|я из|i live in|from city)\s+([A-Za-zА-Яа-яЁё\s-]{2,40})", re.IGNORECASE)),
    ("tech_stack", "programming_languages", re.compile(r"(?:пишу на|использую стек|мой стек|работаю с|i code in|my stack is)\s+([^.!?\n]{3,90})", re.IGNORECASE)),
    ("projects", "active_project", re.compile(r"(?:мой проект|делаю проект|разрабатываю|working on project)\s+([^.!?\n]{3,90})", re.IGNORECASE)),
    ("preferences", "user_preference", re.compile(r"(?:я люблю|мне нравится|предпочитаю|не люблю|i prefer|i like)\s+([^.!?\n]{3,90})", re.IGNORECASE)),
    ("habits", "user_habit", re.compile(r"(?:обычно я|каждый день я|моя привычка|usually i)\s+([^.!?\n]{3,90})", re.IGNORECASE)),
    ("general", "explicit_memory", re.compile(r"(?:запомни(?:,?\s*что)?|remember(?:\s+that)?)\s+([^.\n]{3,180})", re.IGNORECASE)),
]


def _pack_vector(vec: List[float]) -> bytes:
    arr = array.array("f", (float(x) for x in vec))
    return arr.tobytes()


def _unpack_vector(blob: bytes) -> array.array:
    arr = array.array("f")
    arr.frombytes(blob)
    return arr


def cosine_similarity(v1: List[float] | array.array, v2: List[float] | array.array) -> float:
    if not v1 or not v2:
        return 0.0
    n = min(len(v1), len(v2))
    dot = 0.0
    n1 = 0.0
    n2 = 0.0
    for i in range(n):
        a = v1[i]
        b = v2[i]
        dot += a * b
        n1 += a * a
        n2 += b * b
    if n1 <= 1e-12 or n2 <= 1e-12:
        return 0.0
    return dot / math.sqrt(n1 * n2)


class MemoryManager:
    """SQLite WAL + Float32 Vector RAG + Automated Background Fact Extractor (no disk space cap)."""

    def __init__(self, config: NitrogenConfig) -> None:
        self.config = config
        self.db_path = config.db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=15.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    model TEXT DEFAULT '',
                    created_at REAL NOT NULL,
                    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_messages_session_time ON messages(session_id, created_at);

                CREATE TABLE IF NOT EXISTS code_snippets (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    message_id TEXT NOT NULL,
                    language TEXT NOT NULL,
                    code TEXT NOT NULL,
                    summary TEXT DEFAULT '',
                    created_at REAL NOT NULL,
                    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_snippets_lang ON code_snippets(language, created_at);

                CREATE TABLE IF NOT EXISTS facts (
                    id TEXT PRIMARY KEY,
                    category TEXT NOT NULL,
                    fact_key TEXT NOT NULL,
                    content TEXT NOT NULL,
                    importance REAL NOT NULL DEFAULT 0.7,
                    source_session TEXT DEFAULT '',
                    active INTEGER NOT NULL DEFAULT 1,
                    superseded_by TEXT DEFAULT '',
                    vector_dim INTEGER NOT NULL,
                    embedding BLOB NOT NULL,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_facts_active_cat ON facts(active, category);
                CREATE INDEX IF NOT EXISTS idx_facts_key ON facts(fact_key, active);

                CREATE TABLE IF NOT EXISTS semantic_chunks (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    message_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    text TEXT NOT NULL,
                    vector_dim INTEGER NOT NULL,
                    embedding BLOB NOT NULL,
                    created_at REAL NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_chunks_time ON semantic_chunks(created_at);
                """
            )

    # ==================== TIER 1 & 2: SESSIONS, MESSAGES & CODE ARCHIVE ====================

    def ensure_session(self, session_id: Optional[str] = None, title: str = "Новый диалог") -> str:
        sid = (session_id or "").strip() or f"sess_{uuid.uuid4().hex[:12]}"
        now = time.time()
        with self._connect() as conn:
            row = conn.execute("SELECT id FROM sessions WHERE id = ?", (sid,)).fetchone()
            if not row:
                conn.execute(
                    "INSERT INTO sessions(id, title, created_at, updated_at) VALUES(?, ?, ?, ?)",
                    (sid, title[:96], now, now),
                )
        return sid

    def list_sessions(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT s.id, s.title, s.created_at, s.updated_at,
                       COUNT(m.id) AS message_count
                FROM sessions s
                LEFT JOIN messages m ON m.session_id = s.id
                GROUP BY s.id
                ORDER BY s.updated_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(r) for r in rows]

    def get_recent_messages(self, session_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Tier 1: Short-term context window for current conversation."""
        win = limit or self.config.short_term_window
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT id, role, content, model, created_at
                FROM messages
                WHERE session_id = ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (session_id, win),
            ).fetchall()
        items = [dict(r) for r in reversed(rows)]
        return items

    async def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        llm_client: Optional[UniversalLLMClient] = None,
        model: str = "",
    ) -> str:
        """Tier 2 + 3: Persist full message, archive code blocks, and index semantic chunk vector."""
        sid = self.ensure_session(session_id, title=(content.strip()[:60] or "Диалог"))
        mid = f"msg_{uuid.uuid4().hex[:14]}"
        now = time.time()

        with self._connect() as conn:
            conn.execute(
                "INSERT INTO messages(id, session_id, role, content, model, created_at) VALUES(?, ?, ?, ?, ?, ?)",
                (mid, sid, role, content, model, now),
            )
            # Auto-title first user message
            if role == "user":
                cnt = conn.execute("SELECT COUNT(*) FROM messages WHERE session_id = ?", (sid,)).fetchone()[0]
                if cnt <= 2:
                    clean_title = " ".join(content.strip().split())[:72]
                    if clean_title:
                        conn.execute("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?", (clean_title, now, sid))
                else:
                    conn.execute("UPDATE sessions SET updated_at = ? WHERE id = ?", (now, sid))
            else:
                conn.execute("UPDATE sessions SET updated_at = ? WHERE id = ?", (now, sid))

            # Archive every fenced code block into code_snippets table
            for m in _CODE_BLOCK_RE.finditer(content):
                lang = (m.group(1) or "text").strip().lower() or "text"
                code = m.group(2).strip()
                if len(code) >= 8:
                    conn.execute(
                        """
                        INSERT INTO code_snippets(id, session_id, message_id, language, code, summary, created_at)
                        VALUES(?, ?, ?, ?, ?, ?, ?)
                        """,
                        (f"code_{uuid.uuid4().hex[:12]}", sid, mid, lang, code, content[:120], now),
                    )

        # Tier 3: Index message into semantic vector chunks (chunk long messages into overlapping 900-char slices)
        stripped = content.strip()
        if len(stripped) >= 18:
            step = 750
            chunk_size = 950
            slices = [stripped[i : i + chunk_size] for i in range(0, len(stripped), step)]
            for sl in slices[:12]:
                vec = await llm_client.embed_text(sl) if llm_client else local_semantic_embedding(sl, self.config.vector_dim)
                with self._connect() as conn:
                    conn.execute(
                        """
                        INSERT INTO semantic_chunks(id, session_id, message_id, role, text, vector_dim, embedding, created_at)
                        VALUES(?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (f"chk_{uuid.uuid4().hex[:12]}", sid, mid, role, sl, len(vec), _pack_vector(vec), now),
                    )
        return mid

    # ==================== TIER 3: SEMANTIC VECTOR STORE & FACT UPSERT ====================

    async def upsert_fact(
        self,
        category: str,
        fact_key: str,
        content: str,
        importance: float = 0.75,
        source_session: str = "",
        llm_client: Optional[UniversalLLMClient] = None,
    ) -> Dict[str, Any]:
        """
        Save or intelligently update a long-term semantic fact.
        Deduplicates by exact fact_key OR vector cosine similarity >= fact_dedup_threshold,
        marking superseded outdated facts cleanly without losing audit history.
        """
        clean_content = " ".join(content.strip().split())
        if len(clean_content) < 3:
            return {"status": "ignored"}

        cat = (category or "general").strip().lower()[:32]
        key = re.sub(r"[^a-zA-Z0-9а-яА-ЯёЁ_.-]+", "_", (fact_key or clean_content[:40]).strip().lower()).strip("_")[:64]
        vec = await llm_client.embed_text(f"{cat}: {clean_content}") if llm_client else local_semantic_embedding(
            f"{cat}: {clean_content}", self.config.vector_dim
        )
        now = time.time()
        new_id = f"fact_{uuid.uuid4().hex[:12]}"

        with self._connect() as conn:
            existing_rows = conn.execute(
                "SELECT id, category, fact_key, content, vector_dim, embedding FROM facts WHERE active = 1"
            ).fetchall()

            duplicate_id: Optional[str] = None
            superseded_ids: List[str] = []

            for row in existing_rows:
                row_content = str(row["content"])
                if row_content.lower() == clean_content.lower():
                    duplicate_id = str(row["id"])
                    break

                # Same explicit key -> supersede old value with fresh fact!
                if key and str(row["fact_key"]) == key and key not in ("general", "user_preference", "solved_task"):
                    superseded_ids.append(str(row["id"]))
                    continue

                if int(row["vector_dim"]) == len(vec):
                    sim = cosine_similarity(vec, _unpack_vector(row["embedding"]))
                    if sim >= 0.94:
                        duplicate_id = str(row["id"])
                        break
                    if sim >= self.config.fact_dedup_threshold and str(row["category"]) == cat:
                        superseded_ids.append(str(row["id"]))

            if duplicate_id:
                conn.execute(
                    "UPDATE facts SET updated_at = ?, importance = MAX(importance, ?) WHERE id = ?",
                    (now, float(importance), duplicate_id),
                )
                return {"id": duplicate_id, "status": "refreshed", "content": clean_content}

            for old_id in superseded_ids:
                conn.execute(
                    "UPDATE facts SET active = 0, superseded_by = ?, updated_at = ? WHERE id = ?",
                    (new_id, now, old_id),
                )

            conn.execute(
                """
                INSERT INTO facts(id, category, fact_key, content, importance, source_session, active, superseded_by, vector_dim, embedding, created_at, updated_at)
                VALUES(?, ?, ?, ?, ?, ?, 1, '', ?, ?, ?, ?)
                """,
                (new_id, cat, key, clean_content, float(importance), source_session, len(vec), _pack_vector(vec), now, now),
            )

        return {
            "id": new_id,
            "status": "updated" if superseded_ids else "created",
            "superseded": len(superseded_ids),
            "category": cat,
            "fact_key": key,
            "content": clean_content,
        }

    def list_facts(self, active_only: bool = True, limit: int = 200) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            q = (
                "SELECT id, category, fact_key, content, importance, source_session, active, created_at, updated_at "
                "FROM facts "
                + ("WHERE active = 1 " if active_only else "")
                + "ORDER BY updated_at DESC LIMIT ?"
            )
            rows = conn.execute(q, (limit,)).fetchall()
        return [dict(r) for r in rows]

    def delete_fact(self, fact_id: str) -> bool:
        with self._connect() as conn:
            if fact_id == "all":
                conn.execute("DELETE FROM facts")
                conn.execute("DELETE FROM semantic_chunks")
                return True
            cur = conn.execute("DELETE FROM facts WHERE id = ?", (fact_id,))
            return cur.rowcount > 0

    async def semantic_search(
        self,
        query: str,
        llm_client: Optional[UniversalLLMClient] = None,
        top_k_facts: Optional[int] = None,
        top_k_chunks: Optional[int] = None,
        exclude_session_recent: Optional[str] = None,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Search both semantic facts and past conversation chunks via dense cosine similarity."""
        k_facts = top_k_facts or self.config.rag_top_k_facts
        k_chunks = top_k_chunks or self.config.rag_top_k_chunks
        q_vec_primary = (
            await llm_client.embed_text(query)
            if llm_client
            else local_semantic_embedding(query, self.config.vector_dim)
        )
        q_vec_local = local_semantic_embedding(query, self.config.vector_dim)

        scored_facts: List[Tuple[float, Dict[str, Any]]] = []
        scored_chunks: List[Tuple[float, Dict[str, Any]]] = []

        with self._connect() as conn:
            f_rows = conn.execute(
                "SELECT id, category, fact_key, content, importance, vector_dim, embedding, updated_at "
                "FROM facts WHERE active = 1"
            ).fetchall()
            for r in f_rows:
                dim = int(r["vector_dim"])
                qv = q_vec_primary if dim == len(q_vec_primary) else (q_vec_local if dim == len(q_vec_local) else None)
                sim = cosine_similarity(qv, _unpack_vector(r["embedding"])) if qv is not None else 0.0
                # Cross-lingual concept match + high-importance profile boost so core facts always surface
                q_low = query.lower()
                cat_low = str(r["category"]).lower()
                key_low = str(r["fact_key"]).lower()
                concept_boost = 0.0
                if cat_low == "tech_stack" and any(w in q_low for w in ("стек", "stack", "язык", "пишу", "tech", "фреймворк", "framework")):
                    concept_boost = 0.35
                elif cat_low == "identity" and any(w in q_low for w in ("имя", "зовут", "кто я", "город", "name", "who am i", "city")):
                    concept_boost = 0.35
                elif cat_low == "projects" and any(w in q_low for w in ("проект", "project", "делаю", "приложен", "luma")):
                    concept_boost = 0.30
                elif cat_low == "preferences" and any(w in q_low for w in ("любл", "нрав", "предпочит", "prefer", "like", "стиль")):
                    concept_boost = 0.28
                elif key_low and key_low in q_low:
                    concept_boost = 0.25

                profile_bonus = 0.14 * float(r["importance"]) if cat_low in ("identity", "preferences", "tech_stack", "projects") else 0.0
                score = sim + concept_boost + profile_bonus
                if score >= 0.11:
                    scored_facts.append(
                        (
                            score,
                            {
                                "id": r["id"],
                                "category": r["category"],
                                "fact_key": r["fact_key"],
                                "content": r["content"],
                                "score": round(score, 4),
                            },
                        )
                    )

            c_rows = conn.execute(
                "SELECT id, session_id, role, text, vector_dim, embedding, created_at "
                "FROM semantic_chunks ORDER BY created_at DESC LIMIT 4000"
            ).fetchall()
            for r in c_rows:
                if exclude_session_recent and str(r["session_id"]) == exclude_session_recent:
                    continue
                dim = int(r["vector_dim"])
                qv = q_vec_primary if dim == len(q_vec_primary) else (q_vec_local if dim == len(q_vec_local) else None)
                if qv is None:
                    continue
                sim = cosine_similarity(qv, _unpack_vector(r["embedding"]))
                if sim >= 0.22:
                    dt_label = datetime.fromtimestamp(float(r["created_at"]), tz=timezone.utc).strftime("%Y-%m-%d")
                    scored_chunks.append(
                        (
                            sim,
                            {
                                "id": r["id"],
                                "session_id": r["session_id"],
                                "role": r["role"],
                                "text": r["text"],
                                "date": dt_label,
                                "score": round(sim, 4),
                            },
                        )
                    )

        scored_facts.sort(key=lambda x: x[0], reverse=True)
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        return {
            "facts": [item for _, item in scored_facts[:k_facts]],
            "chunks": [item for _, item in scored_chunks[:k_chunks]],
        }

    async def build_rag_prompt_block(
        self,
        query: str,
        session_id: str,
        llm_client: Optional[UniversalLLMClient] = None,
    ) -> str:
        """Assemble relevant facts & cross-session fragments to inject silently into system prompt."""
        found = await self.semantic_search(
            query=query,
            llm_client=llm_client,
            exclude_session_recent=session_id,
        )
        parts: List[str] = []
        if found["facts"]:
            lines = [f"- [{f['category']}] {f['content']}" for f in found["facts"]]
            parts.append("Долговременные факты о пользователе (используй естественно, не перечисляй без спроса):\n" + "\n".join(lines))
        if found["chunks"]:
            lines = [f"- ({c['date']} · {c['role']}): {c['text'][:240]}" for c in found["chunks"][:5]]
            parts.append("Релевантные фрагменты прошлых переписок:\n" + "\n".join(lines))
        return "\n\n".join(parts)

    # ==================== BACKGROUND FACT EXTRACTOR ====================

    async def extract_and_upsert_facts(
        self,
        llm_client: UniversalLLMClient,
        session_id: str,
        user_message: str,
        assistant_message: str,
    ) -> List[Dict[str, Any]]:
        """
        Runs asynchronously in the background after every meaningful user message.
        Uses LLM structured JSON extraction + deterministic heuristic backup so facts are never lost.
        """
        saved: List[Dict[str, Any]] = []
        clean_user = user_message.strip()
        if len(clean_user) < 8:
            return saved

        # 1. Fast heuristic extraction (instant, zero failure rate)
        for cat, key, pat in _HEURISTIC_FACT_PATTERNS:
            for m in pat.finditer(clean_user):
                val = m.group(1).strip(" ,.;:!?\"'")
                if len(val) >= 2:
                    res = await self.upsert_fact(
                        category=cat,
                        fact_key=key,
                        content=f"{key.replace('_', ' ')}: {val}" if cat == "identity" else val,
                        importance=0.88 if cat in ("identity", "tech_stack", "projects") else 0.72,
                        source_session=session_id,
                        llm_client=llm_client,
                    )
                    saved.append(res)

        if not self.config.auto_extract_facts:
            return saved

        # 2. Intelligent LLM Fact Extractor (discovers subtle preferences, solved tasks, events, habits)
        extractor_prompt = (
            "Ты фоновый модуль извлечения долговременной памяти для Luma Ai Nitrogen.\n"
            "Проанализируй реплику пользователя и выдели ТОЛЬКО действительно важные факты, которые стоит запомнить надолго: "
            "имя, город, проекты, стек технологий, предпочтения, привычки, важные события/дедлайны, решённые задачи.\n"
            "Если ничего важного запоминать не нужно (обычный вопрос или приветствие), верни пустой массив [].\n"
            'Верни СТРОГО валидный JSON-массив объектов формата: '
            '[{"category":"identity|preferences|projects|tech_stack|habits|events|solved_tasks",'
            '"key":"короткий_ключ_латиницей","content":"краткий точный факт","importance":0.8}]'
        )
        try:
            resp = await llm_client.complete(
                messages=[
                    {"role": "system", "content": extractor_prompt},
                    {
                        "role": "user",
                        "content": f"Сообщение пользователя:\n{clean_user[:1600]}\n\nКонтекст ответа:\n{assistant_message[:600]}",
                    },
                ],
                temperature=0.1,
                max_tokens=450,
            )
            raw_text = (
                (resp.get("choices") or [{}])[0].get("message", {}).get("content", "")
            ).strip()
            match = re.search(r"\[.*\]", raw_text, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
                if isinstance(parsed, list):
                    for item in parsed[:6]:
                        if not isinstance(item, dict):
                            continue
                        content_val = str(item.get("content", "")).strip()
                        if len(content_val) < 4:
                            continue
                        res = await self.upsert_fact(
                            category=str(item.get("category", "general")),
                            fact_key=str(item.get("key", "")),
                            content=content_val,
                            importance=float(item.get("importance", 0.75)),
                            source_session=session_id,
                            llm_client=llm_client,
                        )
                        saved.append(res)
        except Exception:
            # Heuristic results already persisted; never crash background task
            pass

        return saved

    def get_stats(self) -> Dict[str, Any]:
        db_bytes = self.db_path.stat().st_size if self.db_path.exists() else 0
        wal_path = self.db_path.with_suffix(self.db_path.suffix + "-wal")
        if wal_path.exists():
            db_bytes += wal_path.stat().st_size
        with self._connect() as conn:
            sessions = conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
            messages = conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
            facts = conn.execute("SELECT COUNT(*) FROM facts WHERE active = 1").fetchone()[0]
            archived_facts = conn.execute("SELECT COUNT(*) FROM facts WHERE active = 0").fetchone()[0]
            chunks = conn.execute("SELECT COUNT(*) FROM semantic_chunks").fetchone()[0]
            snippets = conn.execute("SELECT COUNT(*) FROM code_snippets").fetchone()[0]
        return {
            "db_path": str(self.db_path),
            "size_bytes": db_bytes,
            "size_mb": round(db_bytes / (1024 * 1024), 3),
            "sessions": sessions,
            "messages": messages,
            "active_facts": facts,
            "superseded_facts": archived_facts,
            "semantic_chunks": chunks,
            "code_snippets": snippets,
        }
