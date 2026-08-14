"""Runtime configuration and verified-artifact capability checks for the FastAPI service."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"


def read_json(path: Path) -> dict[str, Any]:
    """Return a JSON mapping, or an empty mapping if an optional status file is absent."""
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    return value if isinstance(value, dict) else {}


def env_is_true(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes"}


@dataclass(frozen=True)
class Settings:
    """Settings intentionally keep unavailable model stages disabled rather than substituting models."""

    project_root: Path = PROJECT_ROOT
    processed_dir: Path = PROCESSED_DIR
    qwen_model: str = "Qwen2.5-7B-Instruct"
    default_top_k: int = 5
    max_top_k: int = 10

    @property
    def chunks_path(self) -> Path:
        return self.processed_dir / "introduction_to_business_chunks.jsonl"

    @property
    def hybrid_status(self) -> dict[str, Any]:
        return read_json(self.processed_dir / "introduction_to_business_hybrid_retrieval_status.json")

    @property
    def reranking_status(self) -> dict[str, Any]:
        return read_json(self.processed_dir / "introduction_to_business_reranking_status.json")

    @property
    def generation_status(self) -> dict[str, Any]:
        return read_json(self.processed_dir / "introduction_to_business_llm_generation_status.json")

    def generation_preflight(self) -> list[str]:
        """Return explicit blocks; no alternate generation model is ever selected."""
        blocks: list[str] = []
        if not env_is_true("OPENSTAX_GENERATIVE_AI_PERMISSION_CONFIRMED"):
            blocks.append("OpenStax generative-AI permission is not confirmed.")
        if not env_is_true("QWEN_2_5_7B_INSTRUCT_AVAILABLE"):
            blocks.append("The exact Qwen2.5-7B-Instruct model is not marked available for this deployment.")
        if not os.getenv("BUILT_IN_FORGE_API_URL") or not os.getenv("BUILT_IN_FORGE_API_KEY"):
            blocks.append("The server-side built-in LLM credentials are unavailable.")
        return blocks

    def dense_retrieval_preflight(self) -> list[str]:
        status = self.hybrid_status
        if status.get("status") == "completed":
            return []
        reason = status.get("reason") or status.get("overall_status") or "No completed real BGE-M3 dense retrieval artifact exists."
        return [str(reason)]

    def reranking_preflight(self) -> list[str]:
        status = self.reranking_status
        if status.get("status") == "completed":
            return []
        reason = status.get("reason") or status.get("overall_status") or "No completed real reranking artifact exists."
        return [str(reason)]

