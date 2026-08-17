import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("available generation model configuration", () => {
  it("uses the supplied authorization and model configuration through FastAPI health", () => {
    const result = spawnSync(
      "python3",
      ["-m", "unittest", "backend.tests.test_generation_config"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: process.env,
      },
    );

    expect(result.status).toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("OK");
  });
});
