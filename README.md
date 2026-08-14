# Business Knowledge AI

## Phase 01 — Verified source-book acquisition

This project has acquired the official OpenStax edition of *Introduction to Business* as the proposed primary business-textbook source. The PDF was obtained from an OpenStax-hosted asset endpoint linked to the official OpenStax book record; no third-party, pirated, or paywall-bypassing source was used. The official preface states that the title is available free in web view and PDF through OpenStax. [1] [2]

| Field | Verified record |
| --- | --- |
| Title | *Introduction to Business* |
| Authors | Lawrence J. Gitman; Carl McDaniel; Amit Shah; Monique Reece; Linda Koffel; Bethann Talsma; James C. Hyatt |
| Publisher | OpenStax, Rice University |
| Official book record | [OpenStax — Introduction to Business][1] |
| Official content page | [OpenStax — Introduction][2] |
| Official PDF asset | [OpenStax-hosted PDF][3] |
| License | Creative Commons Attribution 4.0 International (**CC BY 4.0**) |
| Download date | 2026-08-14 |
| Local file | `data/raw/introduction-to-business-openstax.pdf` |
| File size | 55,198,256 bytes |
| SHA-256 | `46e718b187bad53055f60c74cc919acc411840c8531ef6033d6f21a7f1ba56b5` |

### Local source-file policy

The official PDF is retained locally at `data/raw/introduction-to-business-openstax.pdf` and is **intentionally excluded from Git**. At 55,198,256 bytes, it exceeds the repository upload limit; it has not been compressed, repackaged, or replaced with another copy to circumvent that limit. Its verified provenance, integrity hash, and official reacquisition location are preserved in [`data/raw/SOURCE.md`](data/raw/SOURCE.md). If the local file must be reacquired, use only the [official OpenStax book record][1] and [official OpenStax-hosted PDF][3].

### License and intended-use limitation

OpenStax identifies the textbook content as CC BY 4.0 and permits distribution, remixing, and adaptation with attribution to OpenStax and its contributors. [1] The official attribution section additionally states:

> “This book may not be used in the training of large language models or otherwise be ingested into large language models or generative AI offerings without OpenStax's permission.” [2]

Accordingly, **no BGE-M3 embeddings, vector index, LLM prompting, or generative-AI processing has been run on the textbook content**. Local PDF parsing and chunking artifacts were created in Phases 02–03 at the user’s request, but they must not be promoted into a RAG or generative-AI offering without explicit OpenStax permission. The OpenStax name, logos, and book covers are also excluded from the CC license. [2]

### Download validation

The downloaded file begins with the expected `%PDF-` signature. `pdfinfo` successfully read the document and reports the title *Introduction to Business*, 744 pages, and no encryption. A text-extraction check on interior pages succeeded and exposed the book’s title page and author list. These checks confirm that the saved asset is a readable PDF appropriate for later text-extraction work, subject to the licensing limitation above.

### Phase boundary

Phase 01 is limited to lawful source acquisition, verification, and documentation. No RAG component, notebook, embedding, vector index, FastAPI service, or frontend implementation has been added.

## Phase 02 — Document ingestion notebook

`notebooks/01_document_ingestion.ipynb` is an executed, notebook-first PyMuPDF workflow that loads the retained OpenStax PDF, reports its page count, extracts text page-by-page, shows raw and cleaned page samples, flags obvious extraction issues, and saves structured records under `data/processed/`. Each record retains `page_number`, detected `chapter`, detected `section`, `source`, `extracted_text`, `cleaned_text`, `quality_flags`, and extraction metrics.

| Processed artifact | Purpose |
| --- | --- |
| `data/processed/introduction_to_business_page_records.jsonl` | One structured, auditable page record per PDF page. |
| `data/processed/introduction_to_business_ingestion_summary.json` | Page coverage, record-count, quality-flag, source, and scope summary. |

Phase 02 contains **only** PDF extraction, conservative text cleanup, quality checks, contextual metadata detection, and structured-record persistence. It does not implement embeddings, Qdrant, sparse retrieval, reranking, LLM calls, LangGraph, prompting, or query functionality.

## Phase 03 — Recursive chunking notebook

`notebooks/02_chunking.ipynb` reads the Phase 02 page records and uses LangChain `RecursiveCharacterTextSplitter` while keeping chunking within a single source page. It visibly compares three practical configurations: compact (500 characters / 75 overlap), balanced (900 / 150), and broad-context (1,400 / 200). The preliminary balanced configuration was selected as a documented context-versus-fragmentation trade-off, not from downstream retrieval or generation evaluation.

| Processed artifact | Purpose |
| --- | --- |
| `data/processed/introduction_to_business_chunks.jsonl` | 3,018 reusable final chunks, each with `chunk_id`, `text`, `source`, `page`, `chapter`, and `section`. |
| `data/processed/introduction_to_business_chunking_summary.json` | Compared configuration metrics, selected configuration, chunk counts, and scope boundary. |

Phase 03 is limited to recursive text chunking and provenance preservation. It does not implement embeddings, Qdrant, retrieval, BM25, reranking, LLM calls, or LangGraph.

## Phase 04 — BGE-M3 embedding notebook

`notebooks/03_embeddings.ipynb` contains the real dense-embedding implementation for the exact `BAAI/bge-m3` model. It loads the Phase 03 chunks, retains every source field, batches text with `BGEM3FlagModel`, validates the expected 1,024-dimensional dense vectors, and applies explicit L2 normalization before persistence. The BAAI model card documents this API and dimensionality. [4]

| Artifact | Current verified state |
| --- | --- |
| `notebooks/03_embeddings.ipynb` | Executed. The visible preflight, batching, dimension checks, normalization code, sample-display logic, and no-substitution path are present. |
| `data/processed/introduction_to_business_bge_m3_embedding_status.json` | Saved with `blocked_by_resource_preflight`; it records that no embeddings were generated. |
| `data/processed/introduction_to_business_bge_m3_embeddings.jsonl` | Intentionally absent. It will be created only after the exact model successfully loads and produces real vectors. |

The official model endpoint was accessible, but the official `pytorch_model.bin` is 2,271,145,830 bytes. The executed preflight found 1,818,836,992 bytes of available memory and requires at least 4,542,291,660 bytes for safe loading with runtime headroom. It therefore did not download or load a model that the current environment could not safely execute. **No substitute model and no fabricated embedding vector were used.**

Phase 04 does not implement Qdrant, a vector store, retrieval, BM25, reranking, LLM calls, or LangGraph. To generate the reusable embeddings artifact, rerun the notebook in a sufficiently provisioned environment after confirming the OpenStax permission required for the intended AI use.

## Phase 05 — Qdrant indexing notebook

`notebooks/04_qdrant_indexing.ipynb` contains a real in-memory Qdrant indexing path that runs only when Phase 04 has produced an actual `BAAI/bge-m3` embedding artifact. It derives the collection vector dimension from the artifact, requires the expected 1,024-dimensional dense vector, configures cosine distance, upserts deterministic UUIDv5 point IDs, and stores `chunk_id`, `text`, `source`, `page`, `chapter`, and `section` in the payload. It then reports collection statistics, scrolls a chapter metadata filter, and re-upserts the same points to verify that the count remains stable. Qdrant documents local client use, collection configuration, point upserts, and payload filtering. [5] [6] [7]

| Artifact | Current verified state |
| --- | --- |
| `notebooks/04_qdrant_indexing.ipynb` | Executed. It visibly includes the real Qdrant path and strict preflight. |
| `data/processed/introduction_to_business_qdrant_indexing_status.json` | Saved with `blocked_missing_real_embeddings`. |
| In-memory collection | Intentionally not created: Phase 04 has no real BGE-M3 vectors. |

The Qdrant Python client is installed for the notebook’s real-indexing path, but the executed notebook detected that `introduction_to_business_bge_m3_embeddings.jsonl` does not exist and that Phase 04 recorded `embeddings_generated: false`. It therefore created **no collection, no points, and no substitute vectors**. Rerunning the notebook after real Phase 04 output exists will complete the collection-statistics, metadata-filter, and duplicate-free re-indexing checks.

Phase 05 remains limited to collection-management verification; it does not implement user-query retrieval, BM25, hybrid search, reranking, LLM calls, or LangGraph.

## Phase 06 — Basic dense retrieval notebook

`notebooks/05_basic_retrieval.ipynb` contains the real dense-only retrieval workflow: sample business questions are encoded using the exact `BAAI/bge-m3` model, L2-normalized, searched against a reconstructed in-memory Qdrant cosine collection, and compared at Top-K values of 3, 5, and 8. When real artifacts are present, the notebook visibly reports the score, text, page, chapter, section, source, and chunk ID for every returned result, then creates a manual relevance, coverage, citation-metadata, and redundancy review worksheet.

| Artifact | Current verified state |
| --- | --- |
| `notebooks/05_basic_retrieval.ipynb` | Executed. It includes the full real BGE-M3 → Qdrant → Top-K path, the sample question set, K experiments, and no-fabrication preflight. |
| `data/processed/introduction_to_business_basic_retrieval_status.json` | Saved with `blocked_missing_real_bge_m3_embeddings`. |
| `data/processed/introduction_to_business_basic_retrieval_results.json` | Intentionally absent. It will be written only after real query embeddings and Qdrant scores are produced. |

The executed preflight confirmed the existing Phase 04 and Phase 05 limitations: there is no real BGE-M3 embedding artifact and therefore no eligible Qdrant collection. The notebook consequently created **no query vectors, no search scores, no Top-K chunks, and no fabricated quality assessment**. After exact BGE-M3 embeddings are generated in a suitable environment, rerun this notebook to perform the documented experiments and manual review.

Phase 06 does not implement BM25, sparse or hybrid retrieval, result fusion, reranking, LLM calls, answer generation, or LangGraph.

## Phase 07 — Hybrid retrieval notebook

`notebooks/06_hybrid_retrieval.ipynb` implements the candidate-generation design requested for dense BGE-M3/Qdrant retrieval, BM25 sparse retrieval, and deterministic reciprocal-rank fusion (RRF). It runs the sparse path over the real Phase 03 chunk corpus and is prepared to execute the exact dense and fused paths only when a real BGE-M3 embedding artifact becomes available. RRF combines retrieval-list ranks through `1 / (60 + rank)` and does not perform learned reranking.

| Path | Executed state | Evidence |
| --- | --- | --- |
| BM25 only | Completed on 3,018 real chunks | 15 runs across five business questions and K values of 3, 5, and 8 are saved in `data/processed/introduction_to_business_bm25_retrieval_results.json`. Each result retains score, text, source, page, chapter, and section. |
| Dense only | Blocked | Phase 04 has not produced real 1,024-dimensional BGE-M3 vectors, so no Qdrant scores were fabricated. |
| Hybrid (RRF) | Blocked | Fusion will run only after valid dense results and BM25 results both exist; no synthetic candidate set was created. |

For example, the executed BM25 result set for “What role do businesses play in an economy?” retrieved a textbook chunk from page 193, Chapter 5, Section 5.4 with score `20.1628`; the result text directly discusses small businesses’ contribution to U.S. economic output. The notebook prints comparable text-and-score views for every test question at K=5 and persists all K=3, 5, and 8 result sets for manual review.

| Artifact | Current verified state |
| --- | --- |
| `notebooks/06_hybrid_retrieval.ipynb` | Executed. It contains actual BM25 execution, exact dense/Qdrant code, RRF fusion logic, provenance-rich result displays, and manual review criteria. |
| `data/processed/introduction_to_business_bm25_retrieval_results.json` | Saved with real BM25 chunks and scores. |
| `data/processed/introduction_to_business_hybrid_retrieval_status.json` | Saved with `BM25 completed`, while exact dense and hybrid paths are `blocked_missing_real_bge_m3_embeddings`. |
| `data/processed/introduction_to_business_hybrid_retrieval_results.json` | Intentionally absent until real dense vectors can be searched and fused. |

Phase 07 does not implement reranking, LLM calls, answer generation, LangGraph, query rewriting, or agentic control flow.

## Phase 08 — BGE reranking notebook

`notebooks/07_reranking.ipynb` contains the exact cross-encoder reranking path for `BAAI/bge-reranker-v2-m3`. The official BGE documentation identifies it as a 568M multilingual cross-encoder and demonstrates `FlagReranker.compute_score` with normalized query-passage relevance scores. [8] The notebook loads only Phase 07’s real hybrid candidates, takes Top-N = 12 candidate chunks, batches query-passage scoring, preserves every candidate’s source fields, compares original hybrid rank with reranked rank, and selects Top-K = 5 final-context chunks.

| Artifact | Current verified state |
| --- | --- |
| `notebooks/07_reranking.ipynb` | Executed. It includes the exact BGE reranker, batched scoring path, rank-change display, final-context selection, and strict hybrid-candidate preflight. |
| `data/processed/introduction_to_business_reranking_status.json` | Saved with `blocked_missing_real_hybrid_candidates`; it records `FlagEmbedding` 1.4.0 and `reranking_performed: false`. |
| `data/processed/introduction_to_business_reranked_contexts.json` | Intentionally absent. It will be written only after real BGE-M3/Qdrant/BM25 fused candidate runs are available. |

The executed preflight found no Phase 07 hybrid-results artifact because Phase 04 has not generated real BGE-M3 vectors. Accordingly, the notebook created **no candidate ordering, no reranker score, and no final context**. It did not substitute sparse-only BM25 candidates for a hybrid candidate set and did not fabricate an example of changed ordering.

Phase 08 does not implement LLM generation, prompt construction, answer generation, LangGraph, or agentic control flow.

## Phase 09 — Grounded prompt-engineering notebook

`notebooks/08_prompt_engineering.ipynb` is an executed, notebook-first prompt-engineering experiment for the requested exact generator identifier, `Qwen2.5-7B-Instruct`. It loads only the real Phase 07 BM25 Top-3 context run associated with the project’s business-foundations question. That context preserves the retrieved chunk IDs, pages, chapter and section metadata, and BM25 scores. Because Phase 07 has no dense BGE-M3 results, the notebook does not describe the context as hybrid or reranked and does not manufacture either artifact.

| Artifact | Current verified state |
| --- | --- |
| `notebooks/08_prompt_engineering.ipynb` | Executed. It displays the real retrieved context and prepares basic, role, explicit-constraint, grounded, few-shot, citation, query-rewriting, and query-decomposition prompt variants. Every variant contains the same evidence-only rule, abstention condition, and chunk/page citation requirement. |
| `data/processed/introduction_to_business_prompt_engineering_results.json` | Saved. It retains the exact prompt designs, real BM25 context metadata, technique trade-offs, and an explicit non-generation record for each of the eight techniques. |
| `data/processed/introduction_to_business_prompt_engineering_status.json` | Saved with `blocked_exact_model_or_permission_preflight`; it records zero generated answers, no model substitution, and no LangGraph or agentic control flow. |

The executed preflight queried the live sandbox model catalog and found no matching `Qwen2.5-7B-Instruct` identifier. It also found that explicit OpenStax generative-AI permission was not confirmed. The textbook’s attribution notice prohibits its ingestion into a generative-AI offering without OpenStax permission. [2] The notebook therefore did not send any textbook context to an LLM, did not substitute another model, and did not fabricate example answers, citation outputs, rewritten queries, or decomposed subquestions. It instead displays the truthful `NOT GENERATED` outcome beside every designed prompt.

The notebook includes the real, single-pass exact-model invocation path behind both preflight checks. After explicit OpenStax permission is confirmed and `Qwen2.5-7B-Instruct` is present in the live model catalog, rerunning the notebook unchanged will produce auditable output for the eight prompt techniques. Phase 09 does not implement LangGraph, an agent, tool calling, autonomous retrieval, or a self-correcting loop.

## Phase 10 — Grounded Qwen generation notebook

`notebooks/09_llm_generation.ipynb` is an executed, notebook-first implementation of the requested single-pass generation stage: **retrieved context + grounded prompt → `Qwen2.5-7B-Instruct` → cited answer**. It reuses only the real Phase 07 BM25 Top-3 context for the business-foundations question and keeps its chunk IDs and page provenance. The notebook does not represent that context as dense, hybrid, or reranked, because those upstream artifacts have not been validly generated.

| Artifact | Current verified state |
| --- | --- |
| `notebooks/09_llm_generation.ipynb` | Executed. It defines the exact Qwen invocation and experiments with temperatures `0.0`, `0.3`, and `0.7`; maximum token budgets `180`, `320`, and `480`; and concise-paragraph, evidence-bullet, and claim-to-evidence prompt structures. Each prompt requires the user’s language, retrieved-context-only claims, explicit insufficiency statements, and `[chunk_id, p. page]` citations. |
| `data/processed/introduction_to_business_llm_generation_results.json` | Saved. It retains real BM25 context provenance, the full prompt/parameter matrix, and one truthful non-generation record per experiment. |
| `data/processed/introduction_to_business_llm_generation_status.json` | Saved with `blocked_exact_model_or_permission_preflight`; it records `model_invocation_implemented: true`, `model_invocation_executed: false`, `generated_answer_count: 0`, no model substitution, and no LangGraph or agentic control flow. |

The executed preflight again found no `Qwen2.5-7B-Instruct` identifier in the live sandbox catalog and no explicit OpenStax generative-AI permission confirmation. OpenStax’s attribution notice prohibits ingesting the textbook into a generative-AI offering without that permission. [2] Consequently, the notebook did not transmit textbook context to a model, substitute a different model, fabricate a generated answer or citation, or claim observed differences among the temperature, token, or prompt-structure conditions. It displays the real fixed invocation pathway plus `NOT GENERATED` records instead.

After both conditions are satisfied, rerun the notebook unchanged to obtain exact-model, evidence-grounded output and inspect its automated citation format audit plus manual grounding review requirement. Phase 10 deliberately does not implement LangGraph, tool calling, autonomous agents, self-correcting retrieval, or multi-stage agentic control flow.

## References

[1]: https://openstax.org/books/introduction-business/pages/preface "OpenStax — Introduction to Business: Preface"
[2]: https://openstax.org/books/introduction-business/pages/1-introduction "OpenStax — Introduction to Business: Chapter 1 Introduction"
[3]: https://assets.openstax.org/oscms-prodcms/media/documents/IntroductionToBusiness-OP_8D04gAa.pdf "OpenStax-hosted Introduction to Business PDF"
[4]: https://huggingface.co/BAAI/bge-m3 "BAAI/bge-m3 official model card"
[5]: https://github.com/qdrant/qdrant-client "Qdrant Python client — local mode"
[6]: https://qdrant.tech/documentation/manage-data/collections/ "Qdrant — Collections"
[7]: https://qdrant.tech/documentation/search/filtering/ "Qdrant — Filtering"
[8]: https://bge-model.com/tutorial/5_Reranking/5.2.html "BGE — Reranker tutorial"
