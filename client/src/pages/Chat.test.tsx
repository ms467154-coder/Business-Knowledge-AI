/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("streamdown", () => ({
  Streamdown: ({ children }: { children: string }) => <>{children}</>,
}));

import Chat from "./Chat";

const question = "What are the four functions of management?";

const unavailableResponse = {
  conversation_id: "conversation-1",
  question,
  rewritten_query: null,
  answer: null,
  answer_status: "unavailable" as const,
  citations: [
    {
      chunk_id: "chunk-252",
      source_title: "Introduction to Business",
      page: 252,
      chapter: "6 Management and Leadership in Today's Organizations",
      section: "6.2 Planning",
      official_book_url: "https://openstax.org/details/books/introduction-business",
    },
  ],
  retrieved_documents: [
    {
      chunk_id: "chunk-252",
      text: "The four primary functions of managers are planning, organizing, leading, and controlling.",
      page: 252,
      chapter: "Management and Leadership in Today's Organizations",
      section: "Planning",
      source: { title: "Introduction to Business" },
      rank: 1,
      bm25_score: 10.2,
    },
  ],
  reranked_documents: [],
  pipeline: "deterministic_langgraph_rag" as const,
  retrieval: { status: "completed" as const, detail: "BM25 retrieval completed." },
  reranking: { status: "unavailable" as const, detail: "Reranking is unavailable." },
  generation: { status: "unavailable" as const, detail: "The exact generation model is unavailable." },
};

describe("grounded Chat workspace", () => {
  let idCounter = 0;

  beforeEach(() => {
    idCounter = 0;
    vi.stubGlobal("crypto", { randomUUID: () => `conversation-${++idCounter}` });
    vi.stubGlobal("fetch", vi.fn());
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the Vermillion Ledger source-first research workspace before an inquiry", () => {
    render(<Chat />);

    expect(screen.getByText("Vermillion Ledger")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ask the textbook. Trace the evidence." })).toBeInTheDocument();
    expect(screen.getByText("Evidence register")).toBeInTheDocument();
    expect(screen.getByText("Your conversations")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "New conversation" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Evidence appears after an inquiry")).toBeInTheDocument();
  });

  it("shows loading, an honest unavailable answer, real citations, and retrieved passages from the API", async () => {
    const user = userEvent.setup();
    let resolveResponse: (response: Response) => void = () => undefined;
    vi.mocked(fetch).mockImplementationOnce(
      () => new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
    );
    render(<Chat />);

    await user.type(screen.getByRole("textbox", { name: "Business question" }), question);
    await user.click(screen.getByRole("button", { name: "Send question" }));

    expect(await screen.findByText("Searching the textbook")).toBeInTheDocument();
    resolveResponse(new Response(JSON.stringify(unavailableResponse), { status: 200 }));
    expect(await screen.findByText("A generated answer is unavailable")).toBeInTheDocument();
    expect(screen.getByText(/The exact generation model is unavailable/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Source citations" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Introduction to Business/ })).toHaveAttribute("href", "https://openstax.org/details/books/introduction-business");
    expect(screen.getByRole("heading", { name: "Retrieved textbook passages" })).toBeInTheDocument();
    expect(screen.getByText(/planning, organizing, leading, and controlling/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /What are the four functions of man/ })).toBeInTheDocument();

    expect(fetch).toHaveBeenCalledWith("/api/chat", expect.objectContaining({ method: "POST" }));
    const call = vi.mocked(fetch).mock.calls[0];
    const request = call?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({ question, top_k: 5, conversation_id: "conversation-1" });
  });

  it("keeps the workspace responsive while retrieval is pending", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}));
    render(<Chat />);

    await user.type(screen.getByRole("textbox", { name: "Business question" }), question);
    await user.click(screen.getByRole("button", { name: "Send question" }));

    expect(screen.getByText("Searching the textbook")).toBeInTheDocument();
    expect(screen.getByText("Retrieving grounded passages…")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Business question" })).toBeDisabled();
  });

  it("surfaces a request error without fabricating a textbook response", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockRejectedValueOnce(new Error("The FastAPI service is offline."));
    render(<Chat />);

    await user.type(screen.getByRole("textbox", { name: "Business question" }), question);
    await user.click(screen.getByRole("button", { name: "Send question" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Request unavailable. The FastAPI service is offline.");
    expect(screen.queryByRole("heading", { name: "Source citations" })).not.toBeInTheDocument();
  });
});
