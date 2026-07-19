import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { computeBriefing, type BriefingSignal } from "@/lib/portfolio/signals";
import { rebalancePortfolio } from "@/lib/portfolio/server.functions";
import { EASE_REVEAL } from "@/lib/motion";
import { callAuthed } from "@/lib/authedServerFn";
import { GoldRuleReveal } from "@/components/ui/GoldRuleReveal";
import { formatDate } from "@/lib/format";
import { useLang } from "@/hooks/useLang";
import { cn } from "@/lib/utils";

const TONE: Record<BriefingSignal["tone"], string> = {
  gold: "border-gold/40 text-ink bg-gold/5 hover:bg-gold/10",
  highlight: "border-highlight-1/40 text-highlight-1 bg-highlight-5/40 hover:bg-highlight-5/60",
  rust: "border-rust/30 text-rust bg-alert-tint hover:bg-alert-tint/70",
  neutral: "border-paper-3 text-ink-2 bg-paper-2 hover:bg-paper-3",
};

export function EthiBriefing() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { portfolio } = useActivePortfolio();
  const { holdings, returnPct, refresh: refreshValuation } = usePortfolioValuation();
  const rebalance = useServerFn(rebalancePortfolio);
  const [rebalancing, setRebalancing] = useState(false);

  const briefing = useMemo(
    () => computeBriefing({ portfolio, holdings, returnPct }),
    [portfolio, holdings, returnPct],
  );

  const date = formatDate(new Date(), lang, { day: "numeric", month: "long" });

  if (!portfolio) return null;

  const handleRebalance = async () => {
    setRebalancing(true);
    try {
      await callAuthed(rebalance, { portfolio_id: portfolio.id });
      refreshValuation();
      toast.success(t("ethi_briefing.rebalance_done"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setRebalancing(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_REVEAL }}
      className="px-5 pt-6"
    >
      <article className="paper-card p-5 md:p-6">
        <header className="flex items-center justify-between gap-3">
          <p className="eyebrow">
            {t("ethi_briefing.edition_of", { date })} <span className="text-ink-3 mx-1.5">·</span>{" "}
            Ethi
          </p>
          <Link
            to="/ethi"
            search={{} as never}
            className="text-tag uppercase tracking-[0.18em] font-semibold text-ink-3 hover:text-ink transition-colors"
          >
            {t("ethi_briefing.talk_to_ethi")}
          </Link>
        </header>

        <p className="mt-4 font-display text-lg md:text-xl text-ink leading-snug max-w-2xl">
          {briefing.headline}
        </p>

        <GoldRuleReveal className="mt-5" />

        {briefing.signals.length > 0 && (
          <div className="mt-5">
            <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-semibold mb-3">
              {t("ethi_briefing.signals", {
                count: briefing.signals.length,
                defaultValue: `${briefing.signals.length} signals`,
              })}
            </p>
            <div className="flex flex-wrap gap-2">
              {briefing.signals.map((s, i) =>
                s.kind === "drift" ? (
                  <button
                    key={`${s.kind}-${i}`}
                    type="button"
                    disabled={rebalancing}
                    onClick={handleRebalance}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-2 rounded-full border text-label font-medium transition-colors disabled:opacity-50",
                      TONE[s.tone],
                    )}
                  >
                    <span className="font-semibold uppercase tracking-wider text-tag opacity-80">
                      {rebalancing
                        ? t("ethi_briefing.rebalancing")
                        : t("ethi_briefing.rebalance_cta")}
                    </span>
                    <span className="opacity-90">{s.detail}</span>
                  </button>
                ) : (
                  <Link
                    key={`${s.kind}-${i}`}
                    to="/ethi"
                    search={{ q: s.prompt } as never}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-2 rounded-full border text-label font-medium transition-colors",
                      TONE[s.tone],
                    )}
                  >
                    <span className="font-semibold uppercase tracking-wider text-tag opacity-80">
                      {s.label}
                    </span>
                    <span className="opacity-90">{s.detail}</span>
                  </Link>
                ),
              )}
            </div>
          </div>
        )}
      </article>
    </motion.section>
  );
}
