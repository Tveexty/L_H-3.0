"""
Luma Ai Nitrogen — Configuration Module
Universal OpenAI-compatible LLM settings (default: local Ollama Qwen 2.5 3B / Llama 3.2 3B),
aggressive 3-tier persistent memory settings (no disk quota limit), and LumaCore OS bridge config.
"""

from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Dict, List


def _load_dotenv_file(dotenv_path: Path) -> None:
    """Lightweight .env loader (works with or without python-dotenv installed)."""
    if not dotenv_path.exists():
        return
    try:
        for raw_line in dotenv_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = val
    except OSError:
        pass


def default_data_dir() -> Path:
    """Resolve persistent data directory for SQLite + vector store (grows freely to 100+ MB)."""
    env_dir = os.environ.get("LUMA_AI_DATA_DIR", "").strip()
    if env_dir:
        p = Path(env_dir).expanduser().resolve()
    elif os.name == "nt":
        appdata = os.environ.get("APPDATA") or str(Path.home())
        p = Path(appdata) / "LumaOS" / "LumaAiNitrogen"
    else:
        xdg = os.environ.get("XDG_DATA_HOME") or str(Path.home() / ".local" / "share")
        p = Path(xdg) / "LumaOS" / "LumaAiNitrogen"
    p.mkdir(parents=True, exist_ok=True)
    return p


PROVIDER_PRESETS: Dict[str, Dict[str, str]] = {
    "ollama_qwen": {
        "name": "Ollama (Qwen 2.5 3B · Local)",
        "base_url": "http://127.0.0.1:11434/v1",
        "api_key": "ollama",
        "model_name": "qwen2.5:3b",
        "embed_model": "nomic-embed-text",
    },
    "ollama_llama": {
        "name": "Ollama (Llama 3.2 3B · Local)",
        "base_url": "http://127.0.0.1:11434/v1",
        "api_key": "ollama",
        "model_name": "llama3.2:3b",
        "embed_model": "nomic-embed-text",
    },
    "lmstudio": {
        "name": "LM Studio (Local)",
        "base_url": "http://127.0.0.1:1234/v1",
        "api_key": "lm-studio",
        "model_name": "qwen2.5-3b-instruct",
        "embed_model": "text-embedding-nomic-embed-text-v1.5",
    },
    "gemini": {
        "name": "Google Gemini (Native SSE /v1beta)",
        "base_url": "https://generativelanguage.googleapis.com/v1beta",
        "api_key": "",
        "model_name": "gemini-2.5-flash",
        "embed_model": "",
    },
    "gemini_flash_lite": {
        "name": "Google Gemini (OpenAI-compat /v1beta/openai)",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
        "api_key": "",
        "model_name": "gemini-2.5-flash-lite",
        "embed_model": "text-embedding-004",
    },
    "groq": {
        "name": "Groq Cloud",
        "base_url": "https://api.groq.com/openai/v1",
        "api_key": "",
        "model_name": "llama-3.1-8b-instant",
        "embed_model": "",
    },
    "openrouter": {
        "name": "OpenRouter",
        "base_url": "https://openrouter.ai/api/v1",
        "api_key": "",
        "model_name": "google/gemini-2.0-flash-lite-001",
        "embed_model": "",
    },
}


@dataclass
class NitrogenConfig:
    # Universal OpenAI-compatible LLM settings (default: local Ollama Qwen 2.5 3B)
    base_url: str = "http://127.0.0.1:11434/v1"
    api_key: str = "ollama"
    model_name: str = "qwen2.5:3b"
    fallback_models: List[str] = field(default_factory=lambda: ["llama3.2:3b", "qwen2.5:1.5b"])
    embed_model: str = "nomic-embed-text"
    temperature: float = 0.55
    max_tokens: int = 2048
    request_timeout_sec: float = 90.0

    # 3-Tier Aggressive Persistent Memory (no disk size cap — easily scales past 100+ MB)
    data_dir: str = ""
    sqlite_filename: str = "luma_ai_nitrogen_memory.db"
    short_term_window: int = 28
    rag_top_k_facts: int = 12
    rag_top_k_chunks: int = 8
    vector_dim: int = 384
    fact_dedup_threshold: float = 0.86
    auto_extract_facts: bool = True

    # Luma OS Kernel Bridge (Calendar, System Telemetry, Office Studio, Luma Lens)
    luma_kernel_url: str = "http://127.0.0.1:49216"
    server_host: str = "127.0.0.1"
    server_port: int = 49225
    enable_tools: bool = True

    def __post_init__(self) -> None:
        if not self.data_dir:
            self.data_dir = str(default_data_dir())
        Path(self.data_dir).mkdir(parents=True, exist_ok=True)

    @property
    def db_path(self) -> Path:
        return Path(self.data_dir) / self.sqlite_filename

    @property
    def config_file_path(self) -> Path:
        return Path(self.data_dir) / "nitrogen_config.json"

    def save(self) -> None:
        self.config_file_path.parent.mkdir(parents=True, exist_ok=True)
        self.config_file_path.write_text(
            json.dumps(asdict(self), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def to_public_dict(self) -> Dict[str, object]:
        data = asdict(self)
        data["db_path"] = str(self.db_path)
        data["presets"] = PROVIDER_PRESETS
        return data


def load_config(project_dir: Path | None = None) -> NitrogenConfig:
    """Load config from .env, persisted JSON, and environment overrides."""
    base_dir = project_dir or Path(__file__).resolve().parent
    _load_dotenv_file(base_dir / ".env")

    cfg = NitrogenConfig()
    if cfg.config_file_path.exists():
        try:
            saved = json.loads(cfg.config_file_path.read_text(encoding="utf-8"))
            if isinstance(saved, dict):
                for field_name in asdict(cfg).keys():
                    if field_name in saved and saved[field_name] is not None:
                        setattr(cfg, field_name, saved[field_name])
        except (OSError, json.JSONDecodeError):
            pass

    # Explicit environment variables always win
    if os.environ.get("BASE_URL"):
        cfg.base_url = os.environ["BASE_URL"].strip().rstrip("/")
    if os.environ.get("API_KEY"):
        cfg.api_key = os.environ["API_KEY"].strip()
    if os.environ.get("MODEL_NAME"):
        cfg.model_name = os.environ["MODEL_NAME"].strip()
    if os.environ.get("EMBED_MODEL"):
        cfg.embed_model = os.environ["EMBED_MODEL"].strip()
    if os.environ.get("LUMA_KERNEL_URL"):
        cfg.luma_kernel_url = os.environ["LUMA_KERNEL_URL"].strip().rstrip("/")
    if os.environ.get("NITROGEN_HOST"):
        cfg.server_host = os.environ["NITROGEN_HOST"].strip()
    if os.environ.get("NITROGEN_PORT"):
        try:
            cfg.server_port = int(os.environ["NITROGEN_PORT"])
        except ValueError:
            pass
    if os.environ.get("SHORT_TERM_WINDOW"):
        try:
            cfg.short_term_window = max(6, int(os.environ["SHORT_TERM_WINDOW"]))
        except ValueError:
            pass
    if os.environ.get("TEMPERATURE"):
        try:
            cfg.temperature = float(os.environ["TEMPERATURE"])
        except ValueError:
            pass

    Path(cfg.data_dir).mkdir(parents=True, exist_ok=True)
    return cfg
