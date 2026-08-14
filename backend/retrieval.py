"""Deterministic OpenStax BM25 retrieval reused from the validated hybrid-retrieval notebook."""

from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np
from rank_bm25 import BM25Okapi

from backend.schemas import RetrievedDocument


REQUIRED_FIELDS = {"chunk_id", "text", "source", "page", "chapter", "section"}


def tokenize(text: str) -> list[str]:
    """Match the exact tokenization used by notebooks/06_hybrid_retrieval.ipynb."""
    return re.findall(r"[a-z0-9]+", text.lower())


class OpenStaxBM25Retriever:
    """A read-only BM25 retriever over the provenance-preserving chunk artifact."""

    def __init__(self, chunks_path: Path):
        if not chunks_path.exists():
            raise FileNotFoundError(f"Chunk artifact is required but missing: {chunks_path}")
        with chunks_path.open("r", encoding="utf-8") as handle:
            self._records = [json.loads(line) for line in handle if line.strip()]
        if not self._records:
            raise ValueError("The chunk artifact contains no records.")
        for record in self._records:
            missing = REQUIRED_FIELDS.difference(record)
            if missing:
                raise ValueError(f"Chunk record lacks required provenance fields: {sorted(missing)}")
        tokenized = [tokenize(record["text"]) for record in self._records]
        if any(not tokens for tokens in tokenized):
            raise ValueError("At least one OpenStax chunk tokenized to an empty document.")
        self._bm25 = BM25Okapi(tokenized)

    def search(self, question: str, top_k: int) -> list[RetrievedDocument]:
        scores = self._bm25.get_scores(tokenize(question))
        indices = np.argsort(scores)[::-1][:top_k]
        return [
            RetrievedDocument(
                chunk_id=str(record["chunk_id"]),
                text=str(record["text"]),
                page=record.get("page"),
                chapter=record.get("chapter"),
                section=record.get("section"),
                source=record.get("source") or {},
                rank=rank,
                bm25_score=float(scores[int(index)]),
            )
            for rank, index in enumerate(indices, start=1)
            for record in [self._records[int(index)]]
        ]

