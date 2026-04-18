import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { EthiBubble } from "@/components/ethi/EthiBubble";
import { EthiSuggestionChips } from "@/components/ethi/EthiSuggestionChips";
import { MOCK_HOLDINGS, MOCK_PORTFOLIO, MOCK_USER_NAME } from "@/lib/mockGarden";

export const Route = createFileRoute("/ethi")({
  validateSearch: (s: Record<string, unknown>) => ({ intent: (s.intent as string | undefined) ?? undefined }),
  component: Ethi,
});

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function Ethi() {
  const { intent } = Route.useSearch();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasGarden = MOCK_HOLDINGS.length > 0;
    const gain = MOCK_PORTFOLIO.total_value - MOCK_PORTFOLIO.total_invested;
    let greeting = `Salut ${MOCK_USER_NAME} ! 🌱 `;
    if (intent === "rebalance") {
      greeting += `Tu veux que je regarde la répartition de ton jardin et te propose un rééquilibrage ? Je peux analyser tes ${MOCK_HOLDINGS.length} plantes et suggérer des ajustements.`;
    } else if (!hasGarden) {
      greeting += `Ton jardin n'a pas encore été planté. Tu veux qu'on le fasse ensemble ?`;
    } else if (gain > 0) {
      greeting += `Ton jardin a bien grandi (**+${gain.toFixed(0)} €**). On regarde comment l'entretenir ?`;
    } else {
      greeting += `Comment je peux t'aider aujourd'hui ?`;
    }
    setMessages([{ id: "welcome", role: "assistant", content: greeting }]);
  }, [intent]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const send = async (content: string) => {
    const text = content.trim();
    if (!text || isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ethi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const json = (await res.json()) as { content?: string; error?: string };
      const reply = json.content ?? json.error ?? "Désolée, je n'arrive pas à répondre.";
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", content: "Désolée, problème de connexion." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-paper flex flex-col">
      <header className="px-5 pt-6 pb-3 border-b border-paper/5 safe-area-top">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto w-full">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-moss-2 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-paper" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-paper/40 font-semibold">Ton conseiller jardin</p>
              <h1 className="font-value text-2xl">Ethi</h1>
            </div>
          </div>
          <Link
            to="/reglages"
            aria-label="Réglages"
            className="flex items-center justify-center w-9 h-9 rounded-full border border-paper/15 text-paper/70 hover:text-paper hover:border-paper/40 transition-colors flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
          </Link>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 pb-44">
        <div className="max-w-lg mx-auto space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <EthiBubble key={m.id} role={m.role} content={m.content} />
            ))}
            {isLoading && <EthiBubble key="typing" role="assistant" content="" typing />}
          </AnimatePresence>
        </div>
      </div>

      <div className="fixed bottom-[88px] left-0 right-0 z-30 px-5 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          {messages.length <= 1 && !isLoading && (
            <div className="mb-3">
              <EthiSuggestionChips onSelect={send} hasGarden={MOCK_HOLDINGS.length > 0} />
            </div>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 bg-paper/10 border border-paper/15 rounded-full px-4 py-2 backdrop-blur-xl"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Demande quelque chose à Ethi…"
              className="flex-1 bg-transparent outline-none text-sm text-paper placeholder:text-paper/40 py-2"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-9 h-9 rounded-full bg-moss-2 hover:bg-moss-1 text-paper flex items-center justify-center disabled:opacity-30 transition-colors"
              aria-label="Envoyer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
