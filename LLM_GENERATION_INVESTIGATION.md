# LLM Generation-Layer Investigation

## Scope

This investigation examined **only** the Qwen generation configuration, its deployment/runtime prerequisites, the live model catalog, and the separately stated OpenStax generative-AI condition. It did not modify document ingestion, chunking, embeddings, Qdrant, retrieval, hybrid retrieval, reranking, or citation behavior.

## Executive finding

The RAG graph reaches its fixed `generate_answer` node, but **no generation request is made**. `ExactQwenGenerator.generate()` returns `status: "unavailable"` at its preflight gate before it constructs or sends the HTTP request. The two operative blockers are: the exact `Qwen2.5-7B-Instruct` identifier is absent from the configured provider catalog, and `OPENSTAX_GENERATIVE_AI_PERMISSION_CONFIRMED` is unset. The unavailable message is therefore a deliberate, truthful safeguard rather than a Qdrant or retrieval failure.

| Question | Verified result |
| --- | --- |
| LLM provider/runtime | Server-side Manus Forge, OpenAI-compatible HTTP API only |
| Application model identifier | `Qwen2.5-7B-Instruct` |
| Provider URL/path | `${BUILT_IN_FORGE_API_URL}/v1/chat/completions` |
| Provider credentials | `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` are present; values were not exposed |
| Local inference adapter | None in the backend |
| Exact model in live provider catalog | No; exact-match check returned `false` |
| Provider HTTP error from generation | None: the request is intentionally not attempted while preflight blocks remain |
| Current result | `blocked_exact_model_or_permission_preflight` |

## Current generation path

`backend/graph.py` always constructs `ExactQwenGenerator` and invokes it at the fixed `generate_answer` node. In `backend/generation.py`, the generator first executes `Settings.generation_preflight()` and returns an unavailable result if that list is nonempty. Only with an empty list would it issue a POST to the Forge OpenAI-compatible endpoint with `model: "Qwen2.5-7B-Instruct"`, temperature `0.2`, and `max_tokens: 700`.

The relevant preflight logic in `backend/config.py` requires all of the following:

1. `OPENSTAX_GENERATIVE_AI_PERMISSION_CONFIRMED=true`;
2. `QWEN_2_5_7B_INSTRUCT_AVAILABLE=true`;
3. both built-in Forge provider environment variables present.

The first two flags are currently **unset**. In addition, the audited live Forge catalog contains Claude, Gemini, and GPT identifiers but no `Qwen2.5-7B-Instruct`; the exact match is false. The executed Phase 10 status artifact independently records `exact_model_available: false`, `matching_qwen_model_ids: []`, `model_invocation_executed: false`, and `status: "blocked_exact_model_or_permission_preflight"`.

> **Exact failure:** This is a preflight refusal, not a downstream model crash: `OpenStax generative-AI permission is not confirmed. The exact Qwen2.5-7B-Instruct model is not marked available for this deployment.`

## Local-inference feasibility

The deployed backend does **not** support local inference. `backend/requirements.txt` contains FastAPI, HTTPX, LangGraph, NumPy, BM25, and Uvicorn, but no vLLM, Ollama, llama.cpp binding, model server, or model download. The production Dockerfile installs only those dependencies and launches the Node process that supervises FastAPI; it neither downloads Qwen nor starts a model-serving process.

The live application hosting ceiling is 1 vCPU and 512 MB, with no GPU. The development sandbox also has no NVIDIA runtime or local serving executable. Although its Python environment happens to contain `torch`, `transformers`, and `accelerate`, that environment has roughly 1.9 GiB available memory, and those packages are not part of the production image. This is not a viable production location for the official 7.61B-parameter Qwen model. The Qwen model card instead documents Transformers, vLLM, SGLang, and compatible quantized local-app paths; it recommends vLLM for deployment. [1]

## Minimal supported fix

No safe generation-enabling change can be made in this deployment today. The minimum compliant route is:

1. **Obtain and retain written OpenStax permission** for the intended LLM ingestion/generative use. Do not set `OPENSTAX_GENERATIVE_AI_PERMISSION_CONFIRMED=true` beforehand.
2. **Provide an inference endpoint serving the exact Qwen artifact** `Qwen/Qwen2.5-7B-Instruct`. The official Qwen documentation demonstrates `vllm serve Qwen/Qwen2.5-7B-Instruct` and an OpenAI-compatible `/v1/chat/completions` API. [1][2]
3. **Host that endpoint on GPU-capable infrastructure outside this 512 MB WebDev runtime** or use a provider that demonstrably serves that exact artifact. A model alias is acceptable only when the deployment record proves it resolves to the same Qwen2.5-7B-Instruct weights; no alternate model may be substituted.
4. **Add server-side secrets** `QWEN_INFERENCE_BASE_URL` and `QWEN_INFERENCE_API_KEY` for that endpoint, and keep them out of the browser.
5. **Make the small, generation-only code change** below, then add contract tests that assert the configured endpoint receives the exact model identifier and that a provider failure remains explicit rather than producing invented prose.

### Minimal remote-endpoint code change

| File | Required change |
| --- | --- |
| `backend/config.py` | Add validated settings for `QWEN_INFERENCE_BASE_URL` and `QWEN_INFERENCE_API_KEY`; require them in `generation_preflight()` once Qwen generation is enabled. Preserve the exact model setting. |
| `backend/generation.py` | Replace the hard-coded Forge base URL/key with the new Qwen endpoint/key, then POST the existing OpenAI-compatible payload to `${QWEN_INFERENCE_BASE_URL}/v1/chat/completions`. Preserve `model: "Qwen2.5-7B-Instruct"` unless the serving endpoint requires the canonical `Qwen/Qwen2.5-7B-Instruct` name; if it does, record the endpoint alias as resolving to the same exact artifact. |
| `backend/tests/test_app.py` | Add success, unavailable, and upstream-provider-error contract coverage with a mocked Qwen endpoint. |
| Project secret configuration | Add the two Qwen endpoint secrets through the project secret manager, plus the two affirmative preflight flags only after the conditions above are evidenced. |

This remote-provider route requires **no change** to retrieval, citations, or the LangGraph node sequence. It also needs no Dockerfile or Python dependency change because HTTPX already calls OpenAI-compatible APIs.

### Self-hosted alternative

For self-hosting, provision a GPU-capable server and run the Qwen-documented vLLM service using the exact artifact. Then apply the same `config.py` and `generation.py` endpoint change above. In that case, `backend/requirements.txt` and the Dockerfile in this WebDev application should remain unchanged—the inference server belongs on the GPU host. Embedding vLLM and the model into this production container is not a supported minimal solution because the current hosting resource ceiling cannot run it.

## Separate OpenStax authorization finding

The official OpenStax book page identifies *Introduction to Business* as CC BY 4.0. [3] The book's own online attribution section separately states that the book may not be used to train large language models or otherwise be ingested into LLMs or generative-AI offerings without OpenStax permission. [4] The CC BY deed also notes that other rights may limit a use even when the license grants reuse rights. [5]

This report does **not** provide a legal interpretation of the interaction between those statements. Operationally, the explicit condition on the official book page means the project has no evidence to set the authorization flag true. Written permission from OpenStax is required before enabling generation on this corpus.

## Files inspected

| File | Purpose in investigation |
| --- | --- |
| `backend/generation.py` | Exact-Qwen HTTP invocation and preflight-return behavior |
| `backend/config.py` | Model identifier and the three preflight conditions |
| `backend/graph.py` | Fixed generation-node orchestration and API status exposure |
| `server/_core/llm.ts` | Forge API-only helper and live catalog endpoint |
| `backend/requirements.txt` | Absence of local-inference runtime dependencies |
| `Dockerfile` | Absence of Qwen weights, model server, or GPU runtime |
| `data/processed/introduction_to_business_llm_generation_status.json` | Executed Phase 10 blocker evidence |

## Sources

[1] [Official Qwen model card: Qwen/Qwen2.5-7B-Instruct](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct)

[2] [Official Qwen vLLM deployment guide](https://qwen.readthedocs.io/en/v2.5/deployment/vllm.html)

[3] [OpenStax: Introduction to Business book details and license](https://openstax.org/details/books/introduction-business)

[4] [OpenStax: Introduction to Business attribution section](https://openstax.org/books/introduction-business/pages/1-introduction)

[5] [Creative Commons Attribution 4.0 deed](https://creativecommons.org/licenses/by/4.0/)
