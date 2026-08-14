import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  FileText,
  Library,
  Loader2,
  Menu,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";

type Citation = {
  chunk_id: string;
  source_title: string;
  page: number | null;
  chapter: string | null;
  section: string | null;
  official_book_url: string | null;
};

type RetrievedDocument = {
  chunk_id: string;
  text: string;
  page: number | null;
  chapter: Record<string, unknown> | string | null;
  section: Record<string, unknown> | string | null;
  source: Record<string, unknown>;
  rank: number;
  bm25_score: number;
};

type ChatResponse = {
  conversation_id: string;
  question: string;
  rewritten_query: string | null;
  answer: string | null;
  answer_status: "generated" | "unavailable";
  citations: Citation[];
  retrieved_documents: RetrievedDocument[];
  reranked_documents: RetrievedDocument[];
  pipeline: "deterministic_langgraph_rag";
  retrieval: { status: "completed" | "unavailable"; detail: string };
  reranking: { status: "completed" | "unavailable"; detail: string };
  generation: { status: "completed" | "unavailable"; detail: string };
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse;
};

type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
};

const STARTER_QUESTIONS = [
  "What are the four functions of management?",
  "How does marketing create customer value?",
  "What is the difference between a sole proprietorship and a partnership?",
];

function createConversation(): Conversation {
  return {
    id: crypto.randomUUID(),
    title: "New conversation",
    messages: [],
  };
}

function displayValue(value: Record<string, unknown> | string | null | undefined) {
  if (!value) return "Not specified";
  if (typeof value === "string") return value;
  return String(value.title ?? value.name ?? value.label ?? "Not specified");
}

function conversationLabel(conversation: Conversation) {
  return conversation.title.length > 34
    ? `${conversation.title.slice(0, 34)}…`
    : conversation.title;
}

function SourceMeta({ citation }: { citation: Citation }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
      {citation.page !== null && <span>Page {citation.page}</span>}
      {citation.chapter && <><span aria-hidden="true">•</span><span>{citation.chapter}</span></>}
      {citation.section && <><span aria-hidden="true">•</span><span>{citation.section}</span></>}
    </div>
  );
}

function SidebarContent({
  conversations,
  activeConversationId,
  onSelect,
  onNew,
  onClose,
}: {
  conversations: Conversation[];
  activeConversationId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="border-b border-slate-200/80 px-4 pb-5 pt-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#0b3d91] text-white shadow-[0_6px_16px_rgba(11,61,145,0.22)]">
              <BookOpen className="size-[18px]" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[-0.02em] text-slate-900">Business Knowledge AI</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">OpenStax research assistant</p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" className="size-8 text-slate-500 lg:hidden" onClick={onClose} aria-label="Close conversations">
              <X className="size-4" />
            </Button>
          )}
        </div>
        <Button className="h-10 w-full justify-start gap-2 rounded-xl bg-[#0b3d91] px-3 text-sm font-medium hover:bg-[#082f72]" onClick={onNew}>
          <Plus className="size-4" aria-hidden="true" />
          New conversation
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Your conversations</p>
        <nav aria-label="Conversation history" className="space-y-1">
          {conversations.map((conversation) => {
            const isActive = conversation.id === activeConversationId;
            return (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm transition-colors",
                  isActive ? "bg-blue-50 font-medium text-[#0b3d91]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <MessageSquare className={cn("size-4 shrink-0", isActive ? "text-[#0b3d91]" : "text-slate-400")} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{conversationLabel(conversation)}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="m-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5">
        <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-[#0b3d91]">
          <Library className="size-4" aria-hidden="true" />
          Grounded source
        </div>
        <p className="text-xs leading-5 text-slate-600">Answers and sources are drawn from <span className="font-medium">OpenStax Introduction to Business</span>.</p>
      </div>
    </>
  );
}

function AssistantResponse({ response }: { response: ChatResponse }) {
  const citationRows = response.citations;
  const documents = response.reranked_documents.length > 0 ? response.reranked_documents : response.retrieved_documents;

  return (
    <div className="space-y-3">
      {response.answer_status === "generated" && response.answer ? (
        <div className="prose prose-sm max-w-none prose-p:leading-7 prose-a:text-[#0b3d91] prose-strong:text-slate-900">
          <Streamdown>{response.answer}</Streamdown>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-950">
          <div className="flex items-start gap-2.5">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <p className="font-semibold">A generated answer is unavailable</p>
              <p className="mt-1 leading-6 text-amber-900/85">{response.generation.detail} The retrieved textbook passages below remain available for review.</p>
            </div>
          </div>
        </div>
      )}

      {citationRows.length > 0 && (
        <section aria-labelledby="citation-heading" className="pt-1">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="size-3.5 text-[#0b3d91]" aria-hidden="true" />
            <h3 id="citation-heading" className="text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">Source citations</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {citationRows.map((citation, index) => (
              <a
                key={`${citation.chunk_id}-${index}`}
                href={citation.official_book_url || "https://openstax.org/details/books/introduction-business"}
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl border border-slate-200 bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b3d91]"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <span className="line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{citation.source_title}</span>
                  <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-[#0b3d91]" aria-hidden="true" />
                </div>
                <SourceMeta citation={citation} />
              </a>
            ))}
          </div>
        </section>
      )}

      {documents.length > 0 && (
        <section aria-labelledby="passage-heading" className="pt-1">
          <div className="mb-2 flex items-center gap-2">
            <Search className="size-3.5 text-[#0b3d91]" aria-hidden="true" />
            <h3 id="passage-heading" className="text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">Retrieved textbook passages</h3>
          </div>
          <div className="space-y-2">
            {documents.map((document) => (
              <article key={document.chunk_id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span className="font-semibold text-[#0b3d91]">Source {document.rank}</span>
                  {document.page !== null && <><span aria-hidden="true">•</span><span>Page {document.page}</span></>}
                  <span aria-hidden="true">•</span><span>{displayValue(document.chapter)}</span>
                  <span aria-hidden="true">•</span><span>{displayValue(document.section)}</span>
                </div>
                <p className="line-clamp-4 text-sm leading-6 text-slate-700">{document.text}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>(() => [createConversation()]);
  const [activeConversationId, setActiveConversationId] = useState(() => conversations[0]?.id ?? "");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0],
    [activeConversationId, conversations],
  );

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeConversation?.messages.length, isLoading]);

  const updateActiveConversation = (updater: (conversation: Conversation) => Conversation) => {
    setConversations((current) => current.map((conversation) => conversation.id === activeConversationId ? updater(conversation) : conversation));
  };

  const handleNewConversation = () => {
    const nextConversation = createConversation();
    setConversations((current) => [nextConversation, ...current]);
    setActiveConversationId(nextConversation.id);
    setInput("");
    setErrorMessage(null);
    setIsSidebarOpen(false);
  };

  const sendQuestion = async (question: string) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isLoading || !activeConversation) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmedQuestion };
    updateActiveConversation((conversation) => ({
      ...conversation,
      title: conversation.messages.length === 0 ? trimmedQuestion : conversation.title,
      messages: [...conversation.messages, userMessage],
    }));
    setInput("");
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion, top_k: 5, conversation_id: activeConversation.id }),
      });

      const payload = await response.json().catch(() => null) as ChatResponse | { detail?: string } | null;
      if (!response.ok || !payload || !("answer_status" in payload)) {
        const detail = payload && "detail" in payload && typeof payload.detail === "string" ? payload.detail : "The textbook service could not process that question.";
        throw new Error(detail);
      }

      updateActiveConversation((conversation) => ({
        ...conversation,
        messages: [...conversation.messages, { id: crypto.randomUUID(), role: "assistant", content: payload.answer ?? "", response: payload }],
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The textbook service could not be reached. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendQuestion(input);
  };

  const messages = activeConversation?.messages ?? [];

  return (
    <div className="min-h-[100dvh] bg-[#f7f9fc] text-slate-900">
      <div className="flex min-h-[100dvh]">
        <aside className="hidden w-[300px] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <SidebarContent conversations={conversations} activeConversationId={activeConversationId} onSelect={setActiveConversationId} onNew={handleNewConversation} />
        </aside>

        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Conversation history">
            <button className="absolute inset-0 bg-slate-950/35" aria-label="Close conversations" onClick={() => setIsSidebarOpen(false)} />
            <aside className="relative flex h-full w-[min(88vw,330px)] flex-col bg-white shadow-2xl">
              <SidebarContent conversations={conversations} activeConversationId={activeConversationId} onSelect={(id) => { setActiveConversationId(id); setIsSidebarOpen(false); }} onNew={handleNewConversation} onClose={() => setIsSidebarOpen(false)} />
            </aside>
          </div>
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="ghost" size="icon" className="size-9 text-slate-600 lg:hidden" onClick={() => setIsSidebarOpen(true)} aria-label="Open conversations">
                <Menu className="size-5" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-sm font-semibold tracking-[-0.01em] text-slate-900 sm:text-base">Textbook research workspace</h1>
                  <span className="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700 sm:inline">BM25 ready</span>
                </div>
                <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">Deterministic retrieval from OpenStax Introduction to Business</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
              <span className="hidden sm:inline">Source-grounded</span>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-4xl px-4 pb-6 pt-8 sm:px-7 sm:pt-12 lg:px-10">
                {messages.length === 0 ? (
                  <section className="mx-auto max-w-3xl py-5 sm:py-10">
                    <div className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-blue-100 text-[#0b3d91]">
                      <Sparkles className="size-5" aria-hidden="true" />
                    </div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#0b3d91]">Business Knowledge AI</p>
                    <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.045em] text-slate-900 sm:text-4xl">Explore business concepts with the textbook at hand.</h2>
                    <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600">Ask a question and review the OpenStax passages used to support the response. When a generated answer is unavailable, you will still see the real retrieved textbook sources.</p>
                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                      {STARTER_QUESTIONS.map((question) => (
                        <button key={question} onClick={() => void sendQuestion(question)} disabled={isLoading} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b3d91]">
                          <span className="block text-sm font-medium leading-5 text-slate-700 group-hover:text-[#0b3d91]">{question}</span>
                          <span className="mt-3 flex items-center gap-1 text-xs font-medium text-[#0b3d91]">Explore source <ChevronRight className="size-3.5" aria-hidden="true" /></span>
                        </button>
                      ))}
                    </div>
                  </section>
                ) : (
                  <div className="space-y-7">
                    {messages.map((message) => (
                      <div key={message.id} className={cn("flex gap-3 sm:gap-4", message.role === "user" ? "justify-end" : "justify-start")}>
                        {message.role === "assistant" && (
                          <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-[#0b3d91]">
                            <BookOpen className="size-4" aria-hidden="true" />
                          </div>
                        )}
                        <div className={cn("min-w-0", message.role === "user" ? "max-w-[85%] sm:max-w-[70%]" : "max-w-3xl flex-1")}>
                          <p className={cn("mb-1.5 text-xs font-semibold", message.role === "user" ? "text-right text-slate-500" : "text-[#0b3d91]")}>{message.role === "user" ? "You" : "Business Knowledge AI"}</p>
                          {message.role === "user" ? (
                            <div className="rounded-2xl rounded-tr-md bg-[#0b3d91] px-4 py-3 text-sm leading-6 text-white shadow-[0_4px_12px_rgba(11,61,145,0.16)]">{message.content}</div>
                          ) : message.response ? (
                            <AssistantResponse response={message.response} />
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3 sm:gap-4">
                        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-[#0b3d91]">
                          <BookOpen className="size-4" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="mb-1.5 text-xs font-semibold text-[#0b3d91]">Searching the textbook</p>
                          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-600">
                            <Loader2 className="size-4 animate-spin text-[#0b3d91]" aria-hidden="true" />
                            Retrieving grounded passages…
                          </div>
                        </div>
                      </div>
                    )}
                    {errorMessage && (
                      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-800">
                        <div className="flex items-start gap-2.5"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p><span className="font-semibold">Request unavailable.</span> {errorMessage}</p></div>
                      </div>
                    )}
                  </div>
                )}
                <div ref={messageEndRef} />
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-7 lg:px-10">
              <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
                <div className="rounded-2xl border border-slate-300 bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.06)] focus-within:border-[#0b3d91] focus-within:ring-4 focus-within:ring-blue-100">
                  <Textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendQuestion(input); } }} placeholder="Ask a business question about the OpenStax textbook…" aria-label="Business question" rows={1} className="min-h-12 max-h-32 resize-none border-0 bg-transparent px-3 py-2.5 text-[15px] leading-6 shadow-none focus-visible:ring-0" disabled={isLoading} />
                  <div className="flex items-center justify-between gap-3 px-1 pb-1">
                    <p className="pl-2 text-[11px] leading-4 text-slate-500">Enter to send <span className="hidden sm:inline">• Shift + Enter for a new line</span></p>
                    <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="size-9 rounded-xl bg-[#0b3d91] shadow-none hover:bg-[#082f72]" aria-label="Send question">
                      {isLoading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-center text-[11px] leading-4 text-slate-500">This workspace only reports what the deterministic textbook pipeline returns; it does not invent answers or sources.</p>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
