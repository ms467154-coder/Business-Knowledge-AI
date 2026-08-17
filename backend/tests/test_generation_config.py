"""Generation configuration checks that exercise FastAPI's health endpoint."""

import os
import unittest

from fastapi.testclient import TestClient

from backend.app import app


class AvailableGenerationConfigurationTests(unittest.TestCase):
    def test_health_uses_authorized_available_model_configuration(self) -> None:
        self.assertEqual(os.environ.get("OPENSTAX_GENERATIVE_AI_PERMISSION_CONFIRMED"), "true")
        self.assertEqual(os.environ.get("RAG_GENERATION_MODEL"), "gpt-5-mini")
        with TestClient(app) as client:
            response = client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["generation"]["model"], "gpt-5-mini")
        self.assertEqual(payload["generation"]["status"], "ready")
