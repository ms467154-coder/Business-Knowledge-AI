# Phase 16 — Generated-Answer Verification

## Verification request

The requested generated-answer capability may be enabled only when both the **exact required model** and the textbook's **generative-AI authorization** are confirmed. A Creative Commons reuse license alone does not remove a separate, explicit restriction on generative-AI ingestion.

| Prerequisite | Verification method | Result |
| --- | --- | --- |
| Exact model: `Qwen2.5-7B-Instruct` | Live built-in model catalog queried on 2026-08-14 | **Not available**. The exact identifier was absent. |
| OpenStax authorization for this use | Official textbook attribution and licensing pages | **Not verified**. The book attribution states that the book may not be used to train, ingest into, or otherwise support large language models or generative-AI offerings without OpenStax permission. |

### Auditable catalog result

The live project catalog returned these identifiers on 2026-08-14:

```text
claude-haiku-4-5
claude-opus-4-6
claude-opus-4-7
claude-sonnet-4-6
gemini-3-flash-preview
gemini-3.1-pro-preview
gpt-5
gpt-5-mini
gpt-5-nano
gpt-5.5
```

The exact-match check for `Qwen2.5-7B-Instruct` returned `false`. No model was substituted.

## Outcome

Generated answers must remain intentionally unavailable. Enabling them without the exact model or an explicit OpenStax authorization would contradict the project's model requirement and the textbook's stated condition. BM25 retrieval, citations, and source-passage display remain verified and available.

After the FastAPI readiness correction was published, production verification returned HTTP 200 for both `GET /api/health` and `POST /api/chat` on the first probe. The health payload reported BM25 as ready and generation as unavailable; the chat payload reported `answer_status: "unavailable"` with real citations and retrieval results. The unavailable state therefore remains a verified authorization/model safeguard rather than an availability error.

## Official sources

- [OpenStax — Introduction to Business book details and CC BY 4.0 license](https://openstax.org/details/books/introduction-business)
- [OpenStax — Introduction to Business attribution and generative-AI permission condition](https://openstax.org/books/introduction-business/pages/1-introduction)
