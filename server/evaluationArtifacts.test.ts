import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const processedDirectory = join(projectRoot, "data", "processed");

describe("Phase 14 source-grounded evaluation artifacts", () => {
  it("preserves direct OpenStax evidence and records only eligible BM25 metrics", () => {
    const notebook = JSON.parse(
      readFileSync(join(projectRoot, "notebooks", "13_evaluation.ipynb"), "utf8"),
    );
    const dataset = JSON.parse(
      readFileSync(
        join(processedDirectory, "introduction_to_business_evaluation_dataset.json"),
        "utf8",
      ),
    );
    const results = JSON.parse(
      readFileSync(
        join(processedDirectory, "introduction_to_business_evaluation_results.json"),
        "utf8",
      ),
    );
    const status = JSON.parse(
      readFileSync(
        join(processedDirectory, "introduction_to_business_evaluation_status.json"),
        "utf8",
      ),
    );

    expect(notebook.nbformat).toBe(4);
    expect(dataset.dataset_name).toBe("openstax_introduction_to_business_evidence_anchor_eval");
    expect(dataset.source_provenance_file).toBe("data/raw/SOURCE.md");
    expect(dataset.examples).toHaveLength(5);
    for (const example of dataset.examples) {
      expect(example.reference_answer).toBeNull();
      expect(example.source_evidence_anchor.quote.length).toBeGreaterThan(0);
      expect(example.source_evidence_anchor).toMatchObject({
        chunk_id: expect.any(String),
        official_source: expect.stringContaining("openstax.org"),
        page: expect.any(Number),
      });
    }

    expect(results.retrieval).toMatchObject({
      status: "partially_evaluated",
      eligible_variant: "bm25_sparse_baseline",
    });
    expect(results.retrieval.per_query).toHaveLength(15);
    expect(results.retrieval.macro_average).toEqual([
      expect.objectContaining({ k: 3, recall_at_k: 0.8, precision_at_k: 0.26666666666666666, mrr: 0.4666666666666666 }),
      expect.objectContaining({ k: 5, recall_at_k: 0.8, precision_at_k: 0.16, mrr: 0.4666666666666666 }),
      expect.objectContaining({ k: 8, recall_at_k: 0.8, precision_at_k: 0.1, mrr: 0.4666666666666666 }),
    ]);
    expect(results.generation.metrics).toMatchObject({
      faithfulness: { value: null, status: "not_evaluable" },
      answer_relevance: { value: null, status: "not_evaluable" },
      context_utilization: { value: null, status: "not_evaluable" },
    });
    expect(results.requested_variant_comparison).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ variant: "Dense RAG", retrieval_status: "not_evaluable" }),
        expect.objectContaining({ variant: "Hybrid RAG", retrieval_status: "not_evaluable" }),
        expect.objectContaining({ variant: "Hybrid + Reranking", retrieval_status: "not_evaluable" }),
        expect.objectContaining({ variant: "RAG + basic prompt", generation_status: "not_evaluable" }),
        expect.objectContaining({ variant: "RAG + prompt engineering", generation_status: "not_evaluable" }),
        expect.objectContaining({ variant: "Deterministic LangGraph RAG", retrieval_status: "partially_executed_bm25_only" }),
      ]),
    );

    expect(status).toMatchObject({
      phase: "14_evaluation",
      status: "partially_evaluated_real_bm25_only",
      dataset_status: "source_anchored_and_verified",
      retrieval_status: expect.stringContaining("15 executed runs"),
      generation_status: "not_evaluable_no_real_answers",
      ragas_package_detected: true,
      ragas_importable: false,
    });
    expect(existsSync(join(processedDirectory, "introduction_to_business_evaluation_bm25_metrics.png"))).toBe(true);

    const notebookCode = notebook.cells
      .filter((cell: { cell_type: string }) => cell.cell_type === "code")
      .flatMap((cell: { source: string[] }) => cell.source)
      .join("");
    const notebookMarkdown = notebook.cells
      .filter((cell: { cell_type: string }) => cell.cell_type === "markdown")
      .flatMap((cell: { source: string[] }) => cell.source)
      .join("");
    const notebookContent = `${notebookMarkdown}\n${notebookCode}`;
    expect(notebookContent).toContain("Recall at K");
    expect(notebookContent).toContain("Precision at K");
    expect(notebookContent).toContain("Ragas");
    expect(notebookCode).toContain("reference_answer");
  });
});
