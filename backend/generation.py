"""Guarded configured-model generation for the deterministic pipeline."""

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


class ConfiguredLLMGenerator:
    """Invoke the authorized, configured server-side model through the Forge chat API."""

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
        payload: dict[str, object] = {
            "model": self._settings.generation_model,
            "messages": [
                {
                    "role": "system",
                    "content": "You answer only from the supplied OpenStax context. Do not use tools or external knowledge.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
        if self._settings.generation_model.startswith("gpt-"):
            payload["max_completion_tokens"] = 700
        else:
            payload["max_tokens"] = 700
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
        except httpx.HTTPError as error:
            return GenerationResult(
                answer=None,
                status="unavailable",
                detail=f"The configured generation provider request failed: {type(error).__name__}.",
            )
        body = response.json()
        content = body["choices"][0]["message"].get("content")
        if not content:
            return GenerationResult(
                answer=None,
                status="unavailable",
                detail=f"{self._settings.generation_model} returned no textual content.",
            )
        return GenerationResult(
            answer=str(content),
            status="generated",
            detail=f"{self._settings.generation_model} completed the grounded response.",
        )
