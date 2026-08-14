import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const processedDirectory = join(projectRoot, "data", "processed");

describe("Phase 10 LLM-generation artifacts", () => {
  it("keeps the exact Qwen pathway grounded in real BM25 context without fabricated output", () => {
    const notebook = JSON.parse(
      readFileSync(join(projectRoot, "notebooks", "09_llm_generation.ipynb"), "utf8"),
    );
    const results = JSON.parse(
      readFileSync(
        join(processedDirectory, "introduction_to_business_llm_generation_results.json"),
        "utf8",
      ),
    );
    const status = JSON.parse(
      readFileSync(
        join(processedDirectory, "introduction_to_business_llm_generation_status.json"),
        "utf8",
      ),
    );

    expect(notebook.nbformat).toBe(4);
    expect(results.required_model).toBe("Qwen2.5-7B-Instruct");
    expect(results.retrieval_context.source_artifact).toBe(
      "data/processed/introduction_to_business_bm25_retrieval_results.json",
    );
    expect(results.retrieval_context.retrieval_type).toBe("BM25 only");
    expect(results.retrieval_context.source_references).toHaveLength(3);
    expect(results.experiments).toHaveLength(3);
    expect(results.experiments.map((experiment: { temperature: number }) => experiment.temperature)).toEqual([
      0.0,
      0.3,
      0.7,
    ]);
    expect(results.experiments.map((experiment: { max_tokens: number }) => experiment.max_tokens)).toEqual([
      180,
      320,
      480,
    ]);

    for (const experiment of results.experiments) {
      expect(experiment.user_prompt).toContain("Retrieved context:");
      expect(experiment.user_prompt).toContain("openstax-introduction-business-p0193-c001");
      expect(experiment.generation_status).toBe("not_generated_preflight_blocked");
      expect(experiment.answer).toMatch(/^NOT GENERATED —/);
      expect(experiment.model).toBeNull();
      expect(experiment.citation_audit.citation_count).toBe(0);
    }

    expect(results.system_prompt).toContain("Use only the retrieved context supplied in the user message.");
    expect(results.system_prompt).toContain("Insufficient information in the retrieved context.");
    expect(status.exact_model_available).toBe(false);
    expect(status.openstax_generative_ai_permission_confirmed).toBe(false);
    expect(status.model_invocation_implemented).toBe(true);
    expect(status.model_invocation_executed).toBe(false);
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
    expect(notebookCode).not.toMatch(/tools\s*=|tool_choice|toolChoice/);
  });
});
