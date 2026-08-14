# Phase 16 Service Restoration

## Reported symptom

The published chat workspace initially returned a `503` response stating that the deterministic FastAPI RAG service was unavailable.

## Corrective change

The Express host now supervises the FastAPI subprocess with explicit stdout/stderr forwarding, exit-code and signal diagnostics, duplicate-process protection, and a one-second restart after an unexpected termination. The service remains the same deterministic, non-agentic six-node RAG pipeline; no retrieval configuration, model, or generated content behavior was changed.

## Verification evidence

After the published correction, the production `GET /api/health` endpoint returned HTTP 200 and the production `POST /api/chat` endpoint returned HTTP 200 with real BM25 OpenStax passages for “What are the four functions of management?”. The published `/chat` page also accepted the same starter question and entered its normal “Retrieving grounded passages…” loading state rather than immediately displaying the prior unavailable-service error.

The browser verification completed successfully. The chat page presented its intentional **generated answer unavailable** message—because the exact Qwen model and OpenStax generative-AI permission remain unavailable—followed by five real OpenStax citation cards and five retrieved passages. In particular, the primary passage on page 252 identifies the four primary management functions as planning, organizing, leading, and controlling. This is the expected truthful behavior of the existing backend contract, not a service failure.
