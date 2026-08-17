"""The fixed, forward-only LangGraph implementation of the validated deterministic RAG workflow."""

from __future__ import annotations

import operator
from typing import Annotated, Any, TypedDict
from uuid import uuid4

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from backend.config import Settings
from backend.generation import ConfiguredLLMGenerator
from backend.retrieval import OpenStaxBM25Retriever
from backend.schemas import Citation, ChatResponse, RetrievedDocument, StateTransition


class RAGState(TypedDict, total=False):
    """Graph state is deliberately explicit and contains no agent planning or tool fields."""

    question: str
    rewritten_query: str | None
    top_k: int
    retrieved_documents: list[RetrievedDocument]
    reranked_documents: list[RetrievedDocument]
    prompt: str
    answer: str | None
    answer_status: str
    citations: list[Citation]
    retrieval_status: dict[str, str]
    reranking_status: dict[str, str]
    generation_status: dict[str, str]
    conversation_history: Annotated[list[dict[str, str]], operator.add]
    state_transitions: Annotated[list[StateTransition], operator.add]


def _transition(node: str, status: str, detail: str) -> list[StateTransition]:
    return [StateTransition(node=node, status=status, detail=detail)]


def _chapter_label(value: dict | str | None) -> str | None:
    if isinstance(value, dict):
        number, title = value.get("number"), value.get("title")
        return " ".join(str(part) for part in (number, title) if part is not None) or None
    return str(value) if value else None


def _section_label(value: dict | str | None) -> str | None:
    if isinstance(value, dict):
        number, title = value.get("number"), value.get("title")
        return " ".join(str(part) for part in (number, title) if part is not None) or None
    return str(value) if value else None


class DeterministicRAGService:
    """A fixed six-node graph: process → retrieve → rerank → prompt → generate → format."""

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or Settings()
        self.retriever = OpenStaxBM25Retriever(self.settings.chunks_path)
        self.generator = ConfiguredLLMGenerator(self.settings)
        self.graph = self._build_graph()

    def _build_graph(self):
        builder = StateGraph(RAGState)
        builder.add_node("process_query", self._process_query)
        builder.add_node("retrieve", self._retrieve)
        builder.add_node("rerank", self._rerank)
        builder.add_node("build_prompt", self._build_prompt)
        builder.add_node("generate_answer", self._generate_answer)
        builder.add_node("format_response", self._format_response)
        builder.add_edge(START, "process_query")
        builder.add_edge("process_query", "retrieve")
        builder.add_edge("retrieve", "rerank")
        builder.add_edge("rerank", "build_prompt")
        builder.add_edge("build_prompt", "generate_answer")
        builder.add_edge("generate_answer", "format_response")
        builder.add_edge("format_response", END)
        return builder.compile(checkpointer=MemorySaver())

    def _process_query(self, state: RAGState) -> dict[str, Any]:
        question = state["question"].strip()
        return {
            "question": question,
            "rewritten_query": None,
            "conversation_history": [{"role": "user", "content": question}],
            "state_transitions": _transition("process_query", "completed", "Validated the user question; query rewriting is intentionally disabled."),
        }

    def _retrieve(self, state: RAGState) -> dict[str, Any]:
        query = state.get("rewritten_query") or state["question"]
        documents = self.retriever.search(query, state["top_k"])
        dense_blocks = self.settings.dense_retrieval_preflight()
        detail = (
            "Executed the validated OpenStax BM25 retrieval path. Dense retrieval and reciprocal-rank fusion are unavailable: "
            + " ".join(dense_blocks)
            if dense_blocks
            else "Executed the validated deterministic hybrid retrieval path."
        )
        return {
            "retrieved_documents": documents,
            "retrieval_status": {"status": "completed", "detail": detail},
            "state_transitions": _transition("retrieve", "completed", detail),
        }

    def _rerank(self, state: RAGState) -> dict[str, Any]:
        blocks = self.settings.reranking_preflight()
        if blocks:
            detail = "Reranking was not executed; the original BM25 ordering is retained for prompt construction. " + " ".join(blocks)
            return {
                "reranked_documents": [],
                "reranking_status": {"status": "unavailable", "detail": detail},
                "state_transitions": _transition("rerank", "limited", detail),
            }
        raise RuntimeError("A completed reranking artifact is required before enabling the exact production reranker adapter.")

    def _build_prompt(self, state: RAGState) -> dict[str, Any]:
        documents = state.get("reranked_documents") or state.get("retrieved_documents", [])
        context_blocks = [
            f"[Source {document.rank} | chunk={document.chunk_id} | page={document.page}]\n{document.text}"
            for document in documents
        ]
        history = state.get("conversation_history", [])
        history_text = "\n".join(f"{turn['role']}: {turn['content']}" for turn in history[-6:]) or "(none)"
        prompt = (
            "Answer in the user's language. Use only the retrieved OpenStax context below. "
            "Do not make unsupported claims. If the context is insufficient, say so. Cite the source labels used.\n\n"
            "Conversation history (context for pronouns only; not documentary evidence):\n"
            f"{history_text}\n\nRetrieved OpenStax context (the only documentary evidence):\n"
            + "\n\n".join(context_blocks)
            + f"\n\nQuestion: {state['question']}"
        )
        detail = f"Built a grounded prompt from {len(documents)} retrieved OpenStax chunks; conversation history remains separate from document context."
        return {
            "prompt": prompt,
            "state_transitions": _transition("build_prompt", "completed", detail),
        }

    async def _generate_answer(self, state: RAGState) -> dict[str, Any]:
        result = await self.generator.generate(state["prompt"])
        status = "completed" if result.status == "generated" else "unavailable"
        return {
            "answer": result.answer,
            "answer_status": result.status,
            "generation_status": {"status": result.status, "detail": result.detail},
            "conversation_history": ([{"role": "assistant", "content": result.answer}] if result.answer else []),
            "state_transitions": _transition("generate_answer", "completed" if result.answer else "limited", result.detail),
        }

    def _format_response(self, state: RAGState) -> dict[str, Any]:
        documents = state.get("reranked_documents") or state.get("retrieved_documents", [])
        citations = [
            Citation(
                chunk_id=document.chunk_id,
                source_title=str(document.source.get("title", "Introduction to Business")),
                page=document.page,
                chapter=_chapter_label(document.chapter),
                section=_section_label(document.section),
                official_book_url=document.source.get("official_book_url"),
            )
            for document in documents
        ]
        return {
            "citations": citations,
            "state_transitions": _transition("format_response", "completed", f"Formatted {len(citations)} provenance-preserving citations."),
        }

    async def chat(self, question: str, top_k: int, conversation_id: str | None = None) -> ChatResponse:
        thread_id = conversation_id or str(uuid4())
        graph_config = {"configurable": {"thread_id": thread_id}}
        state = await self.graph.ainvoke(
            {"question": question, "top_k": min(top_k, self.settings.max_top_k), "conversation_history": [], "state_transitions": []},
            config=graph_config,
        )
        return ChatResponse(
            conversation_id=thread_id,
            question=state["question"],
            rewritten_query=state.get("rewritten_query"),
            answer=state.get("answer"),
            answer_status=state.get("answer_status", "unavailable"),
            citations=state.get("citations", []),
            retrieved_documents=state.get("retrieved_documents", []),
            reranked_documents=state.get("reranked_documents", []),
            pipeline="deterministic_langgraph_rag",
            retrieval=state["retrieval_status"],
            reranking=state["reranking_status"],
            generation=state["generation_status"],
            state_transitions=state.get("state_transitions", [])[-6:],
        )

    def health(self) -> dict[str, Any]:
        return {
            "status": "ok",
            "pipeline": "deterministic_langgraph_rag",
            "agentic": False,
            "tool_calling": False,
            "retrieval": {
                "bm25": "ready",
                "dense_hybrid": "ready" if not self.settings.dense_retrieval_preflight() else "unavailable",
                "detail": self.settings.dense_retrieval_preflight(),
            },
            "reranking": {
                "status": "ready" if not self.settings.reranking_preflight() else "unavailable",
                "detail": self.settings.reranking_preflight(),
            },
            "generation": {
            "model": self.settings.generation_model,
                "status": "ready" if not self.settings.generation_preflight() else "unavailable",
                "detail": self.settings.generation_preflight(),
            },
        }
