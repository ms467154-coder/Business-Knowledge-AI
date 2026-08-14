import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const processedDirectory = join(projectRoot, "data", "processed");

describe("Phase 12 deterministic LangGraph RAG artifacts", () => {
  it("records a fixed forward graph over real BM25 results without agentic control flow", () => {
    const notebook = JSON.parse(
      readFileSync(join(projectRoot, "notebooks", "11_langgraph_rag.ipynb"), "utf8"),
    );
    const results = JSON.parse(
      readFileSync(
        join(processedDirectory, "introduction_to_business_langgraph_rag_results.json"),
        "utf8",
      ),
    );
    const status = JSON.parse(
      readFileSync(
        join(processedDirectory, "introduction_to_business_langgraph_rag_status.json"),
        "utf8",
      ),
    );

    const workflow = [
      "START",
      "process_query",
      "retrieve",
      "rerank",
      "build_prompt",
      "generate_answer",
      "format_response",
      "END",
    ];
    const stageNodes = workflow.slice(1, -1);

    expect(notebook.nbformat).toBe(4);
    expect(results.workflow).toEqual(workflow);
    expect(results.graph_type).toBe("fixed_forward_stategraph");
    expect(results.preflight).toMatchObject({
      retrieval_type: "BM25 only",
      bm25_artifact_real: true,
      dense_retrieval_ready: false,
      hybrid_retrieval_ready: false,
      reranking_ready: false,
      exact_model_available: false,
      openstax_generative_ai_permission_confirmed: false,
    });
    expect(results.executions).toHaveLength(2);

    for (const execution of results.executions) {
      expect(execution.retrieved_document_count).toBe(3);
      expect(execution.retrieved_chunk_ids).toHaveLength(3);
      expect(execution.reranked_document_count).toBe(0);
      expect(execution.answer).toBeNull();
      expect(execution.citation_count).toBe(0);
      expect(execution.response).toMatchObject({
        retrieval_status: "completed_real_bm25_top3",
        reranking_status: "blocked_missing_real_hybrid_candidates",
        generation_status: "blocked_exact_model_permission_or_context_preflight",
      });
      expect(execution.stage_trace.map((event: { node: string }) => event.node)).toEqual(stageNodes);
      expect(execution.checkpoint_snapshot_count).toBeGreaterThanOrEqual(2);
    }

    expect(status).toMatchObject({
      phase: "12_langgraph_rag",
      notebook_executed: true,
      fixed_workflow_executed: true,
      real_question_execution_count: 2,
      real_bm25_retrieval_executed: true,
      dense_retrieval_executed: false,
      hybrid_retrieval_executed: false,
      reranking_executed: false,
      exact_qwen_generation_executed: false,
      citations_generated: false,
      autonomous_agents_implemented: false,
      tool_calling_implemented: false,
      retrieval_loops_implemented: false,
      self_correction_loops_implemented: false,
      context_grading_implemented: false,
      agent_decisions_implemented: false,
    });
    expect(status.status).toBe("completed_with_verified_rerank_and_generation_limitations");
    expect(existsSync(join(projectRoot, results.graph_visualization.mermaid_path))).toBe(true);
    expect(existsSync(join(projectRoot, results.graph_visualization.png_path))).toBe(true);

    const notebookCode = notebook.cells
      .filter((cell: { cell_type: string }) => cell.cell_type === "code")
      .flatMap((cell: { source: string[] }) => cell.source)
      .join("");
    expect(notebookCode).toContain("StateGraph");
    expect(notebookCode).toContain('builder.add_edge("rerank", "build_prompt")');
    expect(notebookCode).toContain("MemorySaver");
    expect(notebookCode).not.toContain("add_conditional_edges");
    expect(notebookCode).not.toMatch(/create_react_agent|langgraph\.prebuilt|tool_choice|toolChoice/);
  });
});
