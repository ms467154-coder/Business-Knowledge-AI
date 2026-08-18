# Business Knowledge AI — Frontend and UI/UX Recommendation

## Recommendation in one sentence

Reposition the interface from a **generic AI chat app with source cards** into a **textbook research workspace** where the answer, the relevant OpenStax passage, and the learner's next action are visible as one coherent research flow.

## What already works

The current application is calm, legible, and credible. Its permanent conversation sidebar, short workspace header, source-grounded status, prompt starters, and generous writing area make the purpose clear. The product should preserve this restraint rather than becoming a visually noisy dashboard.

The central weakness is differentiation. The hero, cards, and composer use familiar AI-SaaS patterns, while the strongest product distinction—**traceable textbook evidence**—is not yet the dominant visual object. Source information currently reads as supporting metadata when it should feel like a first-class research artifact.

## Recommended product direction: “Research Desk”

Use a quiet editorial system inspired by a well-designed course reader rather than another chatbot. The visual language should combine a warm paper surface, deep ink text, a single institutional blue, and a secondary evergreen color for verified-source states. The interface should use chapter labels, page markers, small citation glyphs, and restrained margin rules as recurring motifs.

> The answer should feel like a concise study note, while the cited textbook passage should feel like the evidence placed beside it.

| Element | Current pattern | Recommended pattern |
| --- | --- | --- |
| Empty state | Generic headline and prompt cards | A “Begin a research note” panel with chapter-aware study prompts and a miniature source preview |
| Answer | Chat bubble plus source cards below | A two-column response: answer/study note on the left, evidence rail on the right |
| Citations | Repeated cards after the answer | Inline citation markers such as `[1]`, with a persistent expandable evidence rail |
| Sidebar | Conversation list only | Conversations plus compact “Recent chapters” and saved-source sections |
| Header | Product title, status, sparse metadata | Breadcrumb-like “OpenStax / Introduction to Business / Research desk”, model status, and source coverage badge |
| Composer | Standard large text area | A research prompt field with “Answer from textbook”, chapter filter, and a visible source-only toggle |

## Primary desktop layout

Use a three-zone layout at wide breakpoints. The left column remains the durable navigation rail. The center column becomes the conversation and writing surface. The right column becomes an **Evidence rail**, initially collapsed for a new conversation and expanded automatically after a response.

| Zone | Purpose | Key contents |
| --- | --- | --- |
| Navigation rail | Orientation and continuity | New research note, conversation history, recent chapters, saved citations, user preferences |
| Research canvas | The main learning flow | Question, concise answer, inline citations, follow-up suggestions, composer |
| Evidence rail | Trust and verification | Source count, chapter/page, excerpt, relevance ordering, “Open in OpenStax” link, copy citation action |

The evidence rail should never resemble model reasoning or agent activity. It should show only user-relevant retrieved textbook material and its provenance.

## Conversation interaction model

Each answer should use a clear, repeatable hierarchy:

1. **Direct answer** — two to four short paragraphs, with inline citation markers.
2. **Key takeaway** — a one-line study-memory cue, such as “Management is the process of planning, organizing, leading, and controlling.”
3. **Evidence** — citations visible in the right rail and accessible from inline markers.
4. **Study next** — two follow-up questions drawn from nearby textbook concepts, not generic chat suggestions.

This creates a learning loop: ask, understand, inspect evidence, and extend the topic.

## Source and citation experience

The citation UI is the most valuable differentiator and deserves more visual weight.

| Improvement | UX value |
| --- | --- |
| Inline numbered citations that scroll/focus the evidence rail | Connects each claim to a concrete passage without interrupting reading |
| Source header: `Introduction to Business · Ch. 6 · p. 252` | Gives provenance an immediate academic shape |
| Expandable 3–5 line excerpt | Lets users verify a claim before opening the full source |
| “Open official source” and “Copy citation” actions | Supports research and assignment workflows |
| Citation confidence shown as provenance, not a made-up score | Communicates trust without inventing relevance claims |
| Persistent source count near the answer title | Makes grounding visible at a glance |

Avoid presenting raw BM25 values to typical learners. A researcher mode can optionally expose “Retrieved passages” and technical statuses, but it should not be the default response experience.

## Empty-state redesign

Replace the three generic suggestion cards with a compact **Study Shelf** of chapter-aware entry points. Each card should show the question, its chapter, and a one-line learning objective.

Examples include:

| Study prompt | Chapter cue | Learning objective |
| --- | --- | --- |
| What are the four functions of management? | Management | Explain core managerial work |
| How does marketing create customer value? | Marketing | Connect value creation to exchange |
| Compare sole proprietorship and partnership. | Forms of business ownership | Distinguish ownership structures |

Use one featured card and two smaller adjacent cards instead of three identical cards. This gives the opening canvas an editorial focal point.

## Visual system

Adopt an intentionally limited design token set.

| Token | Recommendation |
| --- | --- |
| Canvas | Warm off-white `#F8F7F2` rather than cool gray |
| Primary ink | Near-black navy `#13213A` |
| Institutional accent | Cobalt `#1D4E9E` for calls to action and focus |
| Grounded-source accent | Evergreen `#167C5A` for verified source states |
| Evidence surface | Pale parchment `#FFFDF7` with a fine left rule |
| Display type | Editorial serif for major headings only, such as `Source Serif 4` |
| Interface type | `Inter` or `DM Sans` for controls and body copy |
| Corner language | 10–12 px radii; avoid large pill-shaped panels |
| Borders | Fine blue-gray rules, not repeated floating shadows |

This will separate the academic evidence layer from the interaction layer while retaining a modern product feel.

## Responsive behavior

On mobile, move the evidence rail into a bottom sheet opened by a fixed `Sources (5)` button below the answer. Keep inline citation markers tappable. Collapse the navigation rail into the existing menu, and pin the composer above the safe area. The response should remain answer-first; source review becomes a deliberate secondary action rather than a long, vertically repetitive card stack.

## Recommended delivery sequence

| Priority | Change | Expected user impact |
| --- | --- | --- |
| 1 | Introduce an answer + evidence-rail response layout | Makes grounded evidence the product’s visible differentiator |
| 2 | Rework citations into inline markers and focused source excerpts | Improves traceability and reduces card clutter |
| 3 | Establish the editorial visual tokens and typography hierarchy | Gives the product an ownable academic identity |
| 4 | Replace generic starters with chapter-aware Study Shelf cards | Improves onboarding and learning intent |
| 5 | Add saved citations and recent chapters to the sidebar | Supports repeated research use |
| 6 | Add a mobile evidence bottom sheet | Preserves source usability on small screens |

## Scope discipline

These recommendations require frontend changes only. They do not need agent behavior, retrieval changes, new ranking scores, or any alteration to OpenStax citations. The existing deterministic RAG API can support the proposed answer/evidence layout using its current `answer`, `citations`, `retrieved_documents`, and stage-status fields.
