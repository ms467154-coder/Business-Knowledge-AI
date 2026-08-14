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

## References

[1]: https://openstax.org/books/introduction-business/pages/preface "OpenStax — Introduction to Business: Preface"
[2]: https://openstax.org/books/introduction-business/pages/1-introduction "OpenStax — Introduction to Business: Chapter 1 Introduction"
[3]: https://assets.openstax.org/oscms-prodcms/media/documents/IntroductionToBusiness-OP_8D04gAa.pdf "OpenStax-hosted Introduction to Business PDF"
[4]: https://huggingface.co/BAAI/bge-m3 "BAAI/bge-m3 official model card"
[5]: https://github.com/qdrant/qdrant-client "Qdrant Python client — local mode"
[6]: https://qdrant.tech/documentation/manage-data/collections/ "Qdrant — Collections"
[7]: https://qdrant.tech/documentation/search/filtering/ "Qdrant — Filtering"
