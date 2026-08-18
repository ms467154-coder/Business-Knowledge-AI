# Vermillion Ledger Implementation Record

## Approved direction

The user selected **Option E — Vermillion Ledger** as the approved visual direction for Business Knowledge AI. The resulting interface treats a chat response as a source-grounded research note rather than as a generic chat bubble. Its visual language uses warm paper surfaces, vermilion rules, editorial serif typography, catalog numbering, and a persistent evidence register.

## Implemented scope

| Area | Implementation |
| --- | --- |
| Visual system | Global light-theme tokens now use ivory paper, ink, and vermilion. `Cormorant Garamond` supports editorial display typography, while `Source Sans 3` supports readable UI and body copy. |
| Workspace | The desktop layout has a Research Index, editorial research-answer canvas, and Evidence Register. The mobile layout converts the index into an accessible drawer while retaining the inquiry and evidence flow. |
| Grounded-chat behavior | The existing `POST /api/chat` request payload remains unchanged. Generated, unavailable, pending, citation, passage, and request-error states are presented through the new layout without fabricating content. |
| Source traceability | API-provided citations remain outbound links to the official OpenStax source. Retrieved passages retain rank, page, and chapter context in the Evidence Register. |
| Conversation behavior | New inquiries, conversation history, current-question reuse, keyboard submission, and loading-state input locking are retained. |

## Verification

The redesign was reviewed in desktop and 390 px mobile layouts. The full Vitest regression suite passed with **11 test files and 16 tests**, and TypeScript completed with no errors. The focused UI suite includes explicit coverage of the Vermillion Ledger initial research workspace alongside loading, unavailable-answer, citation, retrieved-passage, and request-error behavior.

## Preserved boundaries

No backend, FastAPI route, deterministic LangGraph sequence, BM25 retrieval, reranking behavior, citation architecture, OpenStax source data, or data model was modified. This change is limited to the frontend presentation layer, its typography/theme configuration, and UI tests.
