"""Contract tests for the production FastAPI backend using only real processed OpenStax artifacts."""

import unittest

from fastapi.testclient import TestClient

from backend.app import app


class FastApiContractTests(unittest.TestCase):
    def test_health_reports_honest_component_readiness(self) -> None:
        with TestClient(app) as client:
            response = client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["pipeline"], "deterministic_langgraph_rag")
        self.assertFalse(payload["agentic"])
        self.assertFalse(payload["tool_calling"])
        self.assertEqual(payload["retrieval"]["bm25"], "ready")
        self.assertEqual(payload["generation"]["model"], "gpt-5-mini")
        self.assertEqual(payload["generation"]["status"], "ready")

    def test_chat_runs_fixed_graph_and_returns_real_bm25_citations(self) -> None:
        with TestClient(app) as client:
            response = client.post(
                "/api/chat",
                json={"question": "What is a small business?", "top_k": 3, "conversation_id": "phase15-test-thread"},
            )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["pipeline"], "deterministic_langgraph_rag")
        self.assertEqual(payload["answer_status"], "generated")
        self.assertIsInstance(payload["answer"], str)
        self.assertTrue(payload["answer"].strip())
        self.assertEqual(payload["retrieval"]["status"], "completed")
        self.assertEqual(payload["reranking"]["status"], "unavailable")
        self.assertEqual(payload["generation"]["status"], "generated")
        self.assertEqual(len(payload["retrieved_documents"]), 3)
        self.assertEqual(len(payload["citations"]), 3)
        self.assertEqual(
            [transition["node"] for transition in payload["state_transitions"]],
            ["process_query", "retrieve", "rerank", "build_prompt", "generate_answer", "format_response"],
        )
