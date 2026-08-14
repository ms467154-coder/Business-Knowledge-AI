"""API and graph data contracts for the fixed deterministic RAG pipeline."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2_000, description="The user's business question.")
    conversation_id: str | None = Field(default=None, min_length=1, max_length=128)
    top_k: int = Field(default=5, ge=1, le=10)


class Citation(BaseModel):
    chunk_id: str
    source_title: str
    page: int | None = None
    chapter: str | None = None
    section: str | None = None
    official_book_url: str | None = None


class RetrievedDocument(BaseModel):
    chunk_id: str
    text: str
    page: int | None = None
    chapter: dict | str | None = None
    section: dict | str | None = None
    source: dict = Field(default_factory=dict)
    rank: int
    bm25_score: float


class StateTransition(BaseModel):
    node: Literal[
        "process_query",
        "retrieve",
        "rerank",
        "build_prompt",
        "generate_answer",
        "format_response",
    ]
    status: Literal["completed", "limited"]
    detail: str


class StageStatus(BaseModel):
    status: Literal["completed", "unavailable"]
    detail: str


class ChatResponse(BaseModel):
    conversation_id: str
    question: str
    rewritten_query: str | None = None
    answer: str | None = None
    answer_status: Literal["generated", "unavailable"]
    citations: list[Citation] = Field(default_factory=list)
    retrieved_documents: list[RetrievedDocument] = Field(default_factory=list)
    reranked_documents: list[RetrievedDocument] = Field(default_factory=list)
    pipeline: Literal["deterministic_langgraph_rag"]
    retrieval: StageStatus
    reranking: StageStatus
    generation: StageStatus
    state_transitions: list[StateTransition]

