import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { EthiBubble } from "@/components/ethi/EthiBubble";
import { EthiSuggestionChips, type SuggestionChip } from "@/components/ethi/EthiSuggestionChips";
import { SimulationForm, type SimulationFormValues } from "@/components/ethi/SimulationForm";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { supabase } from "@/integrations/supabase/client";

import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/hooks/useLang";
import { buildBriefing } from "@/lib/ethi/diagnostics";
import { runSimulation, formatSimulation } from "@/lib/ethi/simulation";

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
  const { t } = useTranslation();
  const { lang } = useLang();
  const { q } = Route.useSearch();
  const { user } = useAuth();
  const { portfolio, loading: pfLoading } = useActivePortfolio();
  const valuation = usePortfolioValuation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSim, setShowSim] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dataLoading = pfLoading || valuation.loading;
  const firstName =
    (user?.user_metadata?.display_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    (lang === "en" ? "there" : "toi");

  const valuationKey = `${valuation.currentValue}|${valuation.pnl}|${valuation.returnPct}|${valuation.hasQuotes}|${valuation.loading}`;
  const briefing = useMemo(() => {
    if (dataLoading) return null;
    return buildBriefing({ firstName, portfolio, valuation, lang });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoading, firstName, portfolio, valuationKey, lang]);

  useEffect(() => {
    const welcome = dataLoading ? "" : (briefing?.message ?? "");
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === "welcome" && prev[0].content === welcome) return prev;
      if (prev.length > 1) return prev; // don't wipe ongoing conversation
      return [{ id: "welcome", role: "assistant", content: welcome }];
    });
  }, [dataLoading, briefing]);

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
      const ctx = (() => {
        if (!portfolio || portfolio.holdings.length === 0) {
          return { hasPortfolio: false };
        }
        const m = portfolio.metrics;
        return {
          hasPortfolio: true,
          name: portfolio.name,
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
          aggregates: briefing?.aggregates ?? null,
          diagnostics: (briefing?.flags ?? []).map((f) => ({
            id: f.id,
            severity: f.severity,
            ...(f.data ?? {}),
          })),
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
          lang,
        }),
      });
      const json = (await res.json()) as { content?: string; error?: string };
      const reply = json.content ?? json.error ?? t("ethi.error_no_response");
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: t("ethi.error_connection") },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChip = (chip: SuggestionChip) => {
    if (chip.kind === "sim") {
      setShowSim(true);
      return;
    }
    if (chip.query) send(chip.query);
  };

  const handleSimSubmit = (values: SimulationFormValues) => {
    setShowSim(false);
    const out = runSimulation(values);
    const formatted = formatSimulation(values, out, lang);
    const summaryLine =
      lang === "en"
        ? `Simulate ${values.monthly}€/mo + ${values.initial}€ over ${values.years} years.`
        : `Simule ${values.monthly} €/mois + ${values.initial} € sur ${values.years} ans.`;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: summaryLine },
      { id: `a-${Date.now() + 1}`, role: "assistant", content: formatted },
    ]);
  };

  return (
    <div className="min-h-screen bg-ink text-paper flex flex-col">
      <header className="px-5 pt-6 pb-3 border-b border-paper/5 safe-area-top">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto w-full">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-moss-2 flex items-center justify-center flex-shrink-0">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-paper"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-tag uppercase tracking-wider text-paper/40 font-semibold">
                {t("ethi.your_advisor")}
              </p>
              <h1 className="font-value text-2xl">Ethi</h1>
            </div>
          </div>
          <Link
            to="/reglages"
            aria-label={t("ethi.settings")}
            className="flex items-center justify-center w-11 h-11 rounded-full border border-paper/15 text-paper/70 hover:text-paper hover:border-paper/40 transition-colors flex-shrink-0"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-[18px] h-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
          </Link>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 pb-44">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="rounded-2xl border border-paper/15 bg-paper/5 px-4 py-2.5 flex items-start gap-2 text-caption leading-snug text-paper/70">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0"
              aria-hidden
            />
            <span>{t("ethi.disclaimer")}</span>
          </div>
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
          {showSim && (
            <div className="mb-3">
              <SimulationForm onSubmit={handleSimSubmit} onCancel={() => setShowSim(false)} />
            </div>
          )}
          {!showSim && messages.length <= 1 && !isLoading && (
            <div className="mb-3">
              <EthiSuggestionChips
                onSelect={handleChip}
                hasGarden={(portfolio?.holdings.length ?? 0) > 0}
                chips={briefing?.chips}
              />
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 bg-paper/10 border border-paper/15 rounded-full px-4 py-2 backdrop-blur-xl"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("ethi.input_placeholder")}
              className="flex-1 bg-transparent outline-none text-sm text-paper placeholder:text-paper/40 py-2"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-11 h-11 rounded-full bg-moss-2 hover:bg-moss-1 text-paper flex items-center justify-center disabled:opacity-30 transition-colors"
              aria-label={t("ethi.send")}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
