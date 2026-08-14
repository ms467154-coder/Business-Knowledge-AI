import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const processedDirectory = join(projectRoot, "data", "processed");

describe("Phase 13 deterministic checkpointed-memory artifacts", () => {
  it("persists two dialogue turns while keeping document context separate and empty", () => {
    const notebook = JSON.parse(
      readFileSync(join(projectRoot, "notebooks", "12_memory.ipynb"), "utf8"),
    );
    const results = JSON.parse(
      readFileSync(
        join(processedDirectory, "introduction_to_business_memory_results.json"),
        "utf8",
      ),
    );
    const status = JSON.parse(
      readFileSync(
        join(processedDirectory, "introduction_to_business_memory_status.json"),
        "utf8",
      ),
    );

    expect(notebook.nbformat).toBe(4);
    expect(results.graph_topology).toEqual(["START", "respond", "END"]);
    expect(results.thread_id).toBe("phase13-memory-demo");
    expect(results.state_field_boundaries).toMatchObject({
      conversation_history: expect.stringContaining("Checkpointed"),
      retrieved_document_context: expect.stringContaining("Separate"),
    });
    expect(results.question_1).toMatchObject({
      conversation_history_count: 1,
      retrieved_document_context_count: 0,
      answer_basis: "current_turn_instruction",
    });
    expect(results.question_2).toMatchObject({
      conversation_history_count: 2,
      retrieved_document_context_count: 0,
      answer_basis: "checkpointed_conversation_history",
      contextual_follow_up_correct: true,
    });
    expect(results.checkpointing).toMatchObject({
      checkpointer: "MemorySaver",
      persisted_history_count: 2,
      persisted_document_context_count: 0,
    });
    expect(results.checkpointing.snapshot_count).toBeGreaterThanOrEqual(4);
    expect(results.retrieved_document_context).toMatchObject({
      provided: false,
      count: 0,
      read_by_memory_node: false,
    });

    expect(status).toMatchObject({
      phase: "13_memory",
      status: "completed",
      notebook_executed: true,
      langgraph_checkpointing_executed: true,
      same_thread_two_turns_executed: true,
      contextual_follow_up_correct: true,
      conversation_history_separate_from_retrieved_document_context: true,
      retrieved_document_context_count: 0,
      retrieval_implemented: false,
      rag_implemented: false,
      llm_invocation_implemented: false,
      tool_calling_implemented: false,
      autonomous_agents_implemented: false,
      agentic_control_flow_implemented: false,
      retrieval_loops_implemented: false,
      self_correction_loops_implemented: false,
    });

    const notebookCode = notebook.cells
      .filter((cell: { cell_type: string }) => cell.cell_type === "code")
      .flatMap((cell: { source: string[] }) => cell.source)
      .join("");
    expect(notebookCode).toContain("MemorySaver");
    expect(notebookCode).toContain("conversation_history");
    expect(notebookCode).toContain("retrieved_document_context");
    expect(notebookCode).toContain('builder.add_edge(START, "respond")');
    expect(notebookCode).not.toContain("add_conditional_edges");
    expect(notebookCode).not.toMatch(/create_react_agent|langgraph\.prebuilt/);
  });
});
