import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { useFinancialGoals } from "@/hooks/useFinancialGoals";
import { computeBriefing } from "@/lib/portfolio/signals";
import { formatCurrency } from "@/lib/format";
import { useLang } from "@/hooks/useLang";
import { cn } from "@/lib/utils";

export function NextStepCard() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { portfolio } = useActivePortfolio();
  const valuation = usePortfolioValuation();
  const { goals } = useFinancialGoals();

  const card = useMemo(() => {
    if (!portfolio || portfolio.holdings.length === 0) {
      return {
        eyebrow: t("next_step.eyebrow"),
        title: t("next_step.first_invest_title"),
        detail: t("next_step.first_invest_detail"),
        to: "/discover" as const,
        cta: t("next_step.first_invest_cta"),
        tone: "gold" as const,
      };
    }

    const upcoming = goals
      .filter((g) => g.target_date)
      .sort((a, b) => a.target_date.localeCompare(b.target_date))[0];
    if (upcoming) {
      const months = Math.max(
        1,
        Math.round(
          (new Date(upcoming.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30),
        ),
      );
      if (months <= 36) {
        return {
          eyebrow: t("next_step.your_goal"),
          title: upcoming.name,
          detail: t("next_step.goal_detail", {
            amount: formatCurrency(upcoming.target_amount, lang),
            months,
          }),
          to: "/objectifs" as const,
          cta: t("next_step.follow_goal"),
          tone: "moss" as const,
        };
      }
    }

    const briefing = computeBriefing({
      portfolio,
      holdings: valuation.holdings,
      returnPct: valuation.returnPct,
    });
    const signal = briefing.signals[0];
    if (signal) {
      return {
        eyebrow: signal.label,
        title: signal.detail,
        detail: t("next_step.signal_detail"),
        to: "/ethi" as const,
        cta: t("next_step.talk_to_ethi"),
        tone: signal.tone === "rust" ? ("rust" as const) : ("neutral" as const),
      };
    }

    return null;
  }, [portfolio, goals, valuation.holdings, valuation.returnPct, t, lang]);

  if (!card) return null;

  const toneClasses = {
    gold: "border-gold/40 bg-gold/5",
    moss: "border-moss-1/30 bg-moss-5/40",
    rust: "border-rust/30 bg-[oklch(0.96_0.03_45)]",
    neutral: "border-paper-3 bg-paper-2",
  } as const;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="px-5 pt-6"
    >
      <Link
        to={card.to}
        className={cn(
          "block rounded-2xl border p-5 transition-colors hover:bg-paper-3/40",
          toneClasses[card.tone],
        )}
      >
        <p className="text-tag uppercase tracking-[0.2em] text-gold font-semibold mb-2">
          {card.eyebrow}
        </p>
        <p className="font-display text-lg text-ink leading-snug">{card.title}</p>
        <p className="text-label text-ink-2 mt-2 leading-relaxed">{card.detail}</p>
        <p className="mt-4 text-caption uppercase tracking-[0.18em] font-semibold text-ink inline-flex items-center gap-1.5">
          {card.cta}
          <svg
            viewBox="0 0 24 24"
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </p>
      </Link>
    </motion.section>
  );
}
