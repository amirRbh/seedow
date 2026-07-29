import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { useLang } from "@/hooks/useLang";
import { EASE_REVEAL } from "@/lib/motion";
import { buildThemeBreakdown } from "@/lib/impact/themeBreakdown";
import { buildPortfolioImpact } from "@/lib/impact/portfolioImpact";
import { buildConvictions } from "@/lib/impact/narrative";
import { SignalLine } from "@/components/impact/shared";

/**
 * ImpactMoment — la porte d'entrée émotionnelle de l'impact, sur le dashboard.
 *
 * Remplace la barre froide de 3 KPI (ancien ImpactStack). On mène par une phrase
 * humaine — « ton argent finance N entreprises, au service de M convictions » — puis
 * LE fait le plus porteur de sens (intensité vs ETF Monde, empreinte mesurée, ou
 * score ESG), et un aperçu des convictions dominantes. Tout est RÉEL : rien n'est
 * affiché qui ne soit établi par la composition du portefeuille (CLAUDE.md §1.2).
 */
export function ImpactMoment() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { portfolio } = useActivePortfolio();
  const valuation = usePortfolioValuation();
  const numLocale = lang === "en" ? "en-US" : "fr-FR";

  const model = useMemo(() => {
    if (!portfolio) return null;
    const holdings = portfolio.holdings ?? [];
    if (holdings.length === 0) return null;
    const breakdown = buildThemeBreakdown(holdings);
    const convictions = buildConvictions(holdings, breakdown);
    const invested = valuation.totalInvested || portfolio.initial_amount || 0;
    const impact = portfolio.metrics ? buildPortfolioImpact(portfolio.metrics, invested) : null;
    return { holdings, convictions, impact };
  }, [portfolio, valuation.totalInvested]);

  if (!portfolio || !model || !model.impact) return null;

  const { holdings, convictions, impact } = model;
  const top = convictions.convictions.slice(0, 3);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_REVEAL }}
      className="px-5 pt-6"
    >
      <Link
        to="/portfolio"
        search={{ tab: "impact" }}
        className="group block rounded-3xl border border-paper-3 bg-paper paper-grain p-5 transition-colors hover:border-ink-3 md:p-6"
        aria-label={t("impact_moment.aria")}
      >
        {/* En-tête : statut live + accès */}
        <header className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ink-3">
              {t("impact_moment.eyebrow")}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3 transition-colors group-hover:text-ink">
            {t("impact_moment.cta")}
            <svg
              viewBox="0 0 24 24"
              className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </span>
        </header>

        {/* Phrase d'ouverture — ce que ton argent fait, en toutes lettres */}
        <p className="mt-4 text-balance text-lg font-medium leading-snug tracking-[-0.01em] text-ink md:text-xl">
          {convictions.themesCount > 0
            ? t("impact_moment.headline", {
                companies: t("impact_common.companies", { count: holdings.length }),
                convictions: t("impact_common.convictions", { count: convictions.themesCount }),
              })
            : t("impact_moment.headline_no_themes", {
                companies: t("impact_common.companies", { count: holdings.length }),
              })}
        </p>

        {/* Le signal le plus porteur de sens (réel + sourcé) */}
        <div className="mt-4">
          <SignalLine impact={impact} numLocale={numLocale} />
        </div>

        {/* Aperçu des convictions dominantes */}
        {top.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {top.map((c) => (
              <span
                key={c.cause}
                className="inline-flex items-center gap-1.5 rounded-full border border-paper-3 bg-paper-2 px-2.5 py-1"
              >
                <span className="text-[11px] font-medium text-ink">
                  {t(`impact_living.cause.${c.cause}`)}
                </span>
                <span className="font-mono text-[10px] font-semibold tabular-nums text-ink-3">
                  {Math.round(c.pct)}%
                </span>
              </span>
            ))}
          </div>
        )}
      </Link>
    </motion.section>
  );
}
