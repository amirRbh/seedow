import { motion } from "framer-motion";
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { computeBriefing, type BriefingSignal } from "@/lib/portfolio/signals";
import { GoldRuleReveal } from "@/components/ui/GoldRuleReveal";
import { formatDate } from "@/lib/format";
import { useLang } from "@/hooks/useLang";
import { cn } from "@/lib/utils";

const TONE: Record<BriefingSignal["tone"], string> = {
  gold: "border-gold/40 text-ink bg-gold/5 hover:bg-gold/10",
  moss: "border-moss-1/40 text-moss-1 bg-moss-5/40 hover:bg-moss-5/60",
  rust: "border-rust/30 text-rust bg-[oklch(0.95_0.03_45)] hover:bg-[oklch(0.93_0.04_45)]",
  neutral: "border-paper-3 text-ink-2 bg-paper-2 hover:bg-paper-3",
};

export function EthiBriefing() {
  const { t } = useTranslation();
  const lang = useLang();
  const { portfolio } = useActivePortfolio();
  const { holdings, returnPct } = usePortfolioValuation();

  const briefing = useMemo(
    () => computeBriefing({ portfolio, holdings, returnPct }),
    [portfolio, holdings, returnPct],
  );

  const date = formatDate(new Date(), lang, { day: "numeric", month: "long" });

  if (!portfolio) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="px-5 pt-6"
    >
      <article className="paper-card p-5 md:p-6">
        <header className="flex items-center justify-between gap-3">
          <p className="eyebrow">
            {t("ethi_briefing.edition_of", { date })} <span className="text-ink-3 mx-1.5">·</span> Ethi
          </p>
          <Link
            to="/ethi"
            className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink-3 hover:text-ink transition-colors"
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
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-semibold mb-3">
              {t("ethi_briefing.signals", { count: briefing.signals.length, defaultValue: `${briefing.signals.length} signals` })}
            </p>
            <div className="flex flex-wrap gap-2">
              {briefing.signals.map((s, i) => (
                <Link
                  key={`${s.kind}-${i}`}
                  to="/ethi"
                  search={{ q: s.prompt } as never}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-2 rounded-full border text-[12px] font-medium transition-colors",
                    TONE[s.tone],
                  )}
                >
                  <span className="font-semibold uppercase tracking-wider text-[9px] opacity-80">
                    {s.label}
                  </span>
                  <span className="opacity-90">{s.detail}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </motion.section>
  );
}
