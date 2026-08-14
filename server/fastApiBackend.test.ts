import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("FastAPI deterministic RAG backend", () => {
  it("passes its endpoint contract tests without enabling an agentic path", () => {
    const result = spawnSync("python3", ["-m", "unittest", "backend.tests.test_app"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
    });
    expect(result.status).toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("OK");
  });
});
