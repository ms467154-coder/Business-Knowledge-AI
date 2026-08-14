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

Accordingly, **no RAG ingestion, indexing, embedding, or model-prompting work has been performed**. The planned RAG system would entail ingestion into a generative-AI offering, so explicit permission from OpenStax is required before proceeding with later phases using this book. The OpenStax name, logos, and book covers are also excluded from the CC license. [2]

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

## References

[1]: https://openstax.org/books/introduction-business/pages/preface "OpenStax — Introduction to Business: Preface"
[2]: https://openstax.org/books/introduction-business/pages/1-introduction "OpenStax — Introduction to Business: Chapter 1 Introduction"
[3]: https://assets.openstax.org/oscms-prodcms/media/documents/IntroductionToBusiness-OP_8D04gAa.pdf "OpenStax-hosted Introduction to Business PDF"
