# Available Model Replacement — Readiness Record

## Live provider verification

The live server-side Forge catalog was queried on 2026-08-17. The available instruction-capable candidates included `gpt-5-mini`, `gpt-5`, `gpt-5.5`, Claude, and Gemini model families. `Qwen2.5-7B-Instruct` was absent.

`gpt-5-mini` is the selected replacement candidate because it is available in the live catalog, supports the existing OpenAI Chat Completions-compatible provider interface, accepts separate system and user messages, and is the provider guidance's low-cost, fast general-purpose instruction model. No model alias or simulated LLM was used. [1]

| Verification | Result |
| --- | --- |
| Live catalog includes `gpt-5-mini` | Yes |
| Live catalog includes `Qwen2.5-7B-Instruct` | No |
| Live non-textbook provider invocation | Succeeded |
| Returned model identifier | `gpt-5-mini` |
| Returned content | `provider generation verified` |
| Existing prompt/citation interface | Compatible; it already uses OpenAI-style `system` and `user` messages |

## Required authorization gate

The project is still configured to require `OPENSTAX_GENERATIVE_AI_PERMISSION_CONFIRMED=true` before sending retrieved textbook context to any model. The official OpenStax attribution text contains a separate condition requiring OpenStax permission before the book is used to train, ingest into, or otherwise support LLMs or generative-AI offerings. [2] This condition is independent of the model-selection question.

Accordingly, the selected `gpt-5-mini` replacement has **not yet been wired into the production generation node**, and no OpenStax retrieved passage has been sent to an LLM. The requested actual grounded-generation test cannot be performed until the user supplies an authoritative permission basis or written OpenStax authorization. This preserves the application's no-fabrication and permission safeguards.

## Planned generation-only change after authorization

When authorization is provided, the minimal code change will be limited to `backend/config.py`, `backend/generation.py`, `backend/graph.py`, and `backend/tests/test_app.py`. The model will be a `RAG_GENERATION_MODEL` configuration setting defaulting to `gpt-5-mini`; the existing prompt, deterministic graph, retrieval output, and citation formatter will remain unchanged.

## References

[1] [Manus Built-in LLM Model Guidance](https://help.manus.im/)

[2] [OpenStax Introduction to Business attribution section](https://openstax.org/books/introduction-business/pages/1-introduction)
