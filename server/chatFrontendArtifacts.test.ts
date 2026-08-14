import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const chatPage = readFileSync(resolve(projectRoot, "client/src/pages/Chat.tsx"), "utf8");
const app = readFileSync(resolve(projectRoot, "client/src/App.tsx"), "utf8");

describe("Phase 16 grounded chat frontend", () => {
  it("uses the FastAPI chat proxy directly with the required request contract", () => {
    expect(chatPage).toContain('fetch("/api/chat"');
    expect(chatPage).toContain("method: \"POST\"");
    expect(chatPage).toContain("top_k: 5");
    expect(chatPage).toContain("conversation_id: activeConversation.id");
  });

  it("preserves honest unavailable-answer and provenance-oriented UI states", () => {
    expect(chatPage).toContain("A generated answer is unavailable");
    expect(chatPage).toContain("Source citations");
    expect(chatPage).toContain("Retrieved textbook passages");
    expect(chatPage).toContain("OpenStax Introduction to Business");
    expect(chatPage).toContain("Request unavailable.");
  });

  it("provides sidebar history, a new-conversation action, and a chat route", () => {
    expect(chatPage).toContain("New conversation");
    expect(chatPage).toContain("Your conversations");
    expect(chatPage).toContain("lg:hidden");
    expect(app).toContain('path={"/chat"} component={Chat}');
    expect(app).toContain('path={"/"} component={Chat}');
  });
});
