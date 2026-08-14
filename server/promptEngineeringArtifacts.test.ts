import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const processedDirectory = join(projectRoot, "data", "processed");

describe("Phase 09 prompt-engineering artifacts", () => {
  it("keeps eight grounded prompt designs tied to real BM25 context without a substitute model", () => {
    const notebook = JSON.parse(
      readFileSync(join(projectRoot, "notebooks", "08_prompt_engineering.ipynb"), "utf8"),
    );
    const results = JSON.parse(
      readFileSync(
        join(processedDirectory, "introduction_to_business_prompt_engineering_results.json"),
        "utf8",
      ),
    );
    const status = JSON.parse(
      readFileSync(
        join(processedDirectory, "introduction_to_business_prompt_engineering_status.json"),
        "utf8",
      ),
    );

    expect(notebook.nbformat).toBe(4);
    expect(results.required_model).toBe("Qwen2.5-7B-Instruct");
    expect(results.retrieval_context.source_artifact).toBe(
      "data/processed/introduction_to_business_bm25_retrieval_results.json",
    );
    expect(results.retrieval_context.chunks).toHaveLength(3);
    expect(results.experiments.map((entry: { technique: string }) => entry.technique)).toEqual([
      "Basic prompt",
      "Role prompting",
      "Explicit constraints",
      "Grounded prompting",
      "Few-shot prompting",
      "Citation prompting",
      "Query rewriting",
      "Query decomposition",
    ]);

    for (const experiment of results.experiments) {
      expect(experiment.prompt).toContain("Use only the retrieved context below as evidence.");
      expect(experiment.prompt).toContain("Insufficient information in the retrieved context.");
      expect(experiment.generation_status).toBe("not_generated_preflight_blocked");
      expect(experiment.model).toBeNull();
    }

    expect(status.retrieved_context_is_real).toBe(true);
    expect(status.retrieval_type).toBe("BM25 only");
    expect(status.exact_model_available).toBe(false);
    expect(status.openstax_generative_ai_permission_confirmed).toBe(false);
    expect(status.generated_answer_count).toBe(0);
    expect(status.no_model_substitution).toBe(true);
    expect(status.no_fabricated_answers).toBe(true);
    expect(status.langgraph_implemented).toBe(false);
    expect(status.agentic_control_flow_implemented).toBe(false);

    const notebookCode = notebook.cells
      .filter((cell: { cell_type: string }) => cell.cell_type === "code")
      .flatMap((cell: { source: string[] }) => cell.source)
      .join("");
    expect(notebookCode).not.toMatch(/(?:from|import)\s+langgraph|StateGraph/);
  });
});
