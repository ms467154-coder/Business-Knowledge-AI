# Contributing to Business Knowledge AI

Thank you for improving a source-grounded research application. The project values **provenance, reproducibility, clarity, and honest availability states** over unsupported claims or simulated retrieval results.

## Development workflow

1. Start from an up-to-date branch and install the JavaScript and Python dependencies described in the README.
2. Keep changes focused. Frontend changes must not alter the FastAPI contract; retrieval and generation changes must preserve citation metadata.
3. Run `pnpm test` and `pnpm check` before opening a pull request.
4. Describe the user-visible behavior, test evidence, and any source-data implications in the pull request.

## Grounding rules

Do not fabricate source text, retrieval scores, model outputs, citations, evaluation results, or model availability. When a required model or artifact is unavailable, return and document an explicit unavailable state.

The OpenStax source PDF is excluded from Git. Do not add the PDF, provider keys, `.env` files, generated runtime logs, or large build outputs to commits.

## Pull-request expectations

Pull requests should preserve the deterministic pipeline unless a proposed architectural change has been explicitly reviewed. UI changes should retain keyboard access, responsive behavior, loading/error states, and the evidence presentation supplied by the API.
