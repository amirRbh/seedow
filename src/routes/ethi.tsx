import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { EthiBubble } from "@/components/ethi/EthiBubble";
import { EthiSuggestionChips } from "@/components/ethi/EthiSuggestionChips";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { supabase } from "@/integrations/supabase/client";

import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/ethi")({
  validateSearch: (s: Record<string, unknown>) => ({
    intent: (s.intent as string | undefined) ?? undefined,
    q: (s.q as string | undefined) ?? undefined,
  }),
  component: Ethi,
});

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function Ethi() {
  const { intent, q } = Route.useSearch();
  const { user } = useAuth();
  const { portfolio, loading: pfLoading } = useActivePortfolio();
  const depositsTotal = 0;
  const depLoading = false;
  const valuation = usePortfolioValuation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dataLoading = pfLoading || depLoading;
  const firstName =
    (user?.user_metadata?.display_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "toi";

  useEffect(() => {
    if (dataLoading) {
      setMessages([{ id: "welcome", role: "assistant", content: "" }]);
      return;
    }
    const hasGarden = (portfolio?.holdings?.length ?? 0) > 0;
    const invested = depositsTotal;
    const pnl = valuation.pnl;
    const pnlStr = `${pnl >= 0 ? "+" : ""}${pnl.toFixed(0)} €`;
    let greeting = "";
    if (intent === "rebalance") {
      greeting = hasGarden
        ? `Hop ${firstName} — on rééquilibre ? Je passe en revue tes **${portfolio!.holdings.length} lignes** et je te dis quoi ajuster.`
        : `Hop ${firstName} — pas encore de portefeuille à rééquilibrer. On en construit un ?`;
    } else if (!hasGarden) {
      greeting = `Salut ${firstName} ✨ Ton portefeuille n'est pas encore créé. Dis-moi ce qui compte pour toi, je le compose en 2 min.`;
    } else if (invested > 0 && valuation.hasQuotes) {
      greeting = `${firstName}, ton portefeuille tourne sur **${invested.toFixed(0)} €** investis, **${portfolio!.holdings.length} lignes** et un P&L de **${pnlStr}** 📈. On regarde la suite ?`;
    } else if (invested > 0) {
      greeting = `${firstName}, ton portefeuille tourne sur **${invested.toFixed(0)} €** investis et **${portfolio!.holdings.length} lignes**. On regarde la suite ?`;
    } else {
      greeting = `Salut ${firstName} ✨ Ton portefeuille est prêt mais pas encore alimenté. On programme un premier versement ?`;
    }
    setMessages([{ id: "welcome", role: "assistant", content: greeting }]);
  }, [intent, dataLoading, portfolio, depositsTotal, firstName, valuation.pnl, valuation.hasQuotes]);

  // Pré-remplit l'input quand la page est ouverte avec ?q=... (depuis le briefing).
  useEffect(() => {
    if (q && q.trim().length > 0) setInput(q);
  }, [q]);

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
      // Build a compact portfolio context to ground Ethi's answers.
      const ctx = (() => {
        if (!portfolio || portfolio.holdings.length === 0) {
          return { hasPortfolio: false, invested: depositsTotal };
        }
        const m = portfolio.metrics;
        return {
          hasPortfolio: true,
          name: portfolio.name,
          invested: Number(depositsTotal.toFixed(2)),
          currentValue: Number(valuation.currentValue.toFixed(2)),
          pnl: Number(valuation.pnl.toFixed(2)),
          returnPct: Number(valuation.returnPct.toFixed(2)),
          hasQuotes: valuation.hasQuotes,
          metrics: m
            ? {
                expectedReturnPct: +(m.expected_return * 100).toFixed(2),
                volatilityPct: +(m.volatility * 100).toFixed(2),
                sharpe: +m.sharpe.toFixed(2),
                esgScore: +m.esg_score.toFixed(0),
                terPct: +(m.ter * 100).toFixed(2),
                co2AvoidedTons: +m.co2_avoided_tons.toFixed(2),
              }
            : null,
          holdings: portfolio.holdings.map((h) => ({
            ticker: h.ticker,
            name: h.name,
            category: h.category,
            allocationPct: +h.allocationPct.toFixed(1),
            esgScore: +h.esgScore.toFixed(0),
            region: h.region,
          })),
        };
      })();

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/ethi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          context: ctx,
        }),
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
              <p className="text-[10px] uppercase tracking-wider text-paper/40 font-semibold">Ton conseiller</p>
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
              <EthiSuggestionChips onSelect={send} hasGarden={(portfolio?.holdings.length ?? 0) > 0} />
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
