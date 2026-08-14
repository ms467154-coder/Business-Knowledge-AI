# Phase 16 — React Frontend

The primary React route now provides a **source-grounded Business Knowledge AI chat workspace** for the deterministic FastAPI RAG service. The interface uses a purpose-built chat shell rather than the generic template chat component because the product needs to render textbook-specific citations, retrieved passages, honest unavailable-answer states, and frontend-only conversation history.

## Implemented experience

The workspace includes a desktop conversation sidebar with a new-conversation action and in-memory history, plus a mobile drawer. The main chat thread distinguishes user messages from the application response, shows an inline retrieval state, surfaces request errors, and calls `POST /api/chat` directly through the existing Express proxy. Each request sends the active `conversation_id` and `top_k: 5`.

When FastAPI reports `answer_status: "unavailable"`, the interface does not manufacture prose. It instead displays the backend-provided availability detail alongside its real citation cards and retrieved OpenStax passages. Citation cards identify the book, page, chapter, section, and official OpenStax URL when supplied by the service.

## Verification record

| Check | Result |
| --- | --- |
| TypeScript compilation | Passed with `pnpm check` |
| Rendered UI behavior suite | Passed: 3 tests covering API send/loading, unavailable-answer citations and passages, conversation-history label, and request error handling |
| Complete automated test suite | Passed: 10 files and 14 tests |
| Desktop render | Verified at `/chat` with sidebar, research starters, grounded-input treatment, and source badge |
| Live API conversation | Verified by sending “What are the four functions of management?”; the UI showed the honest unavailable-answer notice, five real OpenStax citation cards, and five retrieved textbook passages |
| Mobile render | Verified at 390 × 844; sidebar collapses to a menu control and the conversation workspace remains legible |

The live answer-unavailable response correctly reported that **OpenStax generative-AI permission is not confirmed** and that the exact **Qwen2.5-7B-Instruct** model is not available for this deployment. BM25 retrieval remained available and the UI exposed its verified sources without claiming a generated answer.

## Scope boundary

Phase 16 adds no autonomous agents, tool-calling UI, retrieval loops, or model substitutions. The UI presents the existing fixed, deterministic LangGraph-backed response contract only.

[OpenStax Introduction to Business](https://openstax.org/details/books/introduction-business)
