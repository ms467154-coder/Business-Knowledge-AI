"""Guarded exact-Qwen generation for the deterministic pipeline; no fallback model exists."""

from __future__ import annotations

import os
from dataclasses import dataclass

import httpx

from backend.config import Settings


@dataclass(frozen=True)
class GenerationResult:
    answer: str | None
    status: str
    detail: str


class ExactQwenGenerator:
    """Call only Qwen2.5-7B-Instruct after explicit permission and availability preflights pass."""

    def __init__(self, settings: Settings):
        self._settings = settings

    async def generate(self, prompt: str) -> GenerationResult:
        blocks = self._settings.generation_preflight()
        if blocks:
            return GenerationResult(answer=None, status="unavailable", detail=" ".join(blocks))

        base_url = os.environ["BUILT_IN_FORGE_API_URL"].rstrip("/")
        url = f"{base_url}/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {os.environ['BUILT_IN_FORGE_API_KEY']}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._settings.qwen_model,
            "messages": [
                {
                    "role": "system",
                    "content": "You answer only from the supplied OpenStax context. Do not use tools or external knowledge.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 700,
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        body = response.json()
        content = body["choices"][0]["message"].get("content")
        if not content:
            return GenerationResult(answer=None, status="unavailable", detail="Qwen returned no textual content.")
        return GenerationResult(answer=str(content), status="generated", detail="Exact Qwen2.5-7B-Instruct completed the grounded response.")

