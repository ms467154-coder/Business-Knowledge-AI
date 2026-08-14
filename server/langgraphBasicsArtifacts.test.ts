import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const processedDirectory = join(projectRoot, "data", "processed");

describe("Phase 11 LangGraph fundamentals artifacts", () => {
  it("records real deterministic linear, conditional, and checkpoint graph execution without RAG or agents", () => {
    const notebook = JSON.parse(
      readFileSync(join(projectRoot, "notebooks", "10_langgraph_basics.ipynb"), "utf8"),
    );
    const results = JSON.parse(
      readFileSync(
        join(processedDirectory, "introduction_to_business_langgraph_basics_results.json"),
        "utf8",
      ),
    );
    const status = JSON.parse(
      readFileSync(
        join(processedDirectory, "introduction_to_business_langgraph_basics_status.json"),
        "utf8",
      ),
    );

    expect(notebook.nbformat).toBe(4);
    expect(results.concepts_demonstrated).toEqual([
      "State",
      "StateGraph",
      "Nodes",
      "Edges",
      "START",
      "END",
      "State updates",
      "Conditional edges",
      "Checkpointing / persistence",
    ]);
    expect(results.linear_example.topology).toBe("START -> node_a -> node_b -> node_c -> END");
    expect(results.linear_example.output).toEqual({
      message: "START -> node_a -> node_b -> node_c",
      total: 3,
      steps: ["node_a", "node_b", "node_c"],
    });
    expect(results.conditional_example.outputs.even_input).toMatchObject({
      route: "even_node",
      outcome: "8 is even.",
    });
    expect(results.conditional_example.outputs.odd_input).toMatchObject({
      route: "odd_node",
      outcome: "7 is odd.",
    });
    expect(results.checkpoint_example).toMatchObject({
      thread_id: "phase11-checkpoint-demo",
      output: { value: 12, history: ["doubled 6 to 12"] },
      persisted_state: { value: 12, history: ["doubled 6 to 12"] },
      checkpointer: "MemorySaver",
    });
    expect(results.checkpoint_example.snapshot_count).toBeGreaterThanOrEqual(2);

    expect(status.status).toBe("completed");
    expect(status.langgraph_installed).toBe(true);
    expect(status.notebook_executed).toBe(true);
    expect(status.linear_graph_executed).toBe(true);
    expect(status.conditional_graph_executed).toBe(true);
    expect(status.checkpoint_graph_executed).toBe(true);
    expect(status.rag_implemented).toBe(false);
    expect(status.llm_invocation_implemented).toBe(false);
    expect(status.tool_calling_implemented).toBe(false);
    expect(status.agentic_control_flow_implemented).toBe(false);

    const notebookCode = notebook.cells
      .filter((cell: { cell_type: string }) => cell.cell_type === "code")
      .flatMap((cell: { source: string[] }) => cell.source)
      .join("");
    expect(notebookCode).toContain("StateGraph");
    expect(notebookCode).toContain("add_conditional_edges");
    expect(notebookCode).toContain("MemorySaver");
    expect(notebookCode).not.toMatch(
      /create_react_agent|langgraph\.prebuilt|tool_choice|toolChoice|tools\s*=|Qdrant|BM25|FlagEmbedding/,
    );
  });
});
