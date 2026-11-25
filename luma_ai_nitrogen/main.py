"""
Entry point to launch the Luma Ai Nitrogen FastAPI server.
Run: python -m luma_ai_nitrogen.main
"""

from __future__ import annotations

import uvicorn

from .config import load_config


def main() -> None:
    cfg = load_config()
    print(f"[Luma Ai Nitrogen] Starting API on http://{cfg.server_host}:{cfg.server_port}")
    print(f"[Luma Ai Nitrogen] Provider: {cfg.base_url} | Model: {cfg.model_name}")
    print(f"[Luma Ai Nitrogen] 3-Tier Memory DB: {cfg.db_path}")
    uvicorn.run(
        "luma_ai_nitrogen.server:app",
        host=cfg.server_host,
        port=cfg.server_port,
        reload=False,
        log_level="info",
    )


if __name__ == "__main__":
    main()
