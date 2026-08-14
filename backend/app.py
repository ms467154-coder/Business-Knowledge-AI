"""FastAPI entry point for the production deterministic Business Knowledge AI RAG service."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from backend.graph import DeterministicRAGService
from backend.schemas import ChatRequest, ChatResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.rag_service = DeterministicRAGService()
    yield


app = FastAPI(
    title="Business Knowledge AI API",
    version="1.0.0",
    description="A fixed, non-agentic LangGraph RAG API grounded in OpenStax Introduction to Business.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def get_service(request: Request) -> DeterministicRAGService:
    service = getattr(request.app.state, "rag_service", None)
    if service is None:
        raise HTTPException(status_code=503, detail="The deterministic RAG service has not finished starting.")
    return service


@app.get("/api/health")
async def health(request: Request) -> dict:
    """Report service readiness and every honest model/retrieval preflight state."""
    return get_service(request).health()


@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, request: Request) -> ChatResponse:
    """Execute the fixed forward-only LangGraph pipeline for one business question."""
    try:
        return await get_service(request).chat(
            question=payload.question,
            top_k=payload.top_k,
            conversation_id=payload.conversation_id,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

