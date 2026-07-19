import { motion } from "framer-motion";
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { KPIFigure } from "@/components/ui/KPIFigure";
import { AnimatedFigure } from "@/components/ui/AnimatedFigure";
import { useLang } from "@/hooks/useLang";
import { EASE_REVEAL } from "@/lib/motion";

/**
 * ImpactHero — second pilier narratif du dashboard, dédié à l'impact nature.
 * Traitement éditorial Institutional White : papier, filet or, KPI signature.
 */
export function ImpactHero() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { portfolio } = useActivePortfolio();
  const valuation = usePortfolioValuation();

  const data = useMemo(() => {
    if (!portfolio) return null;
    const totalInvested = valuation.totalInvested || portfolio.initial_amount || 0;
    if (totalInvested <= 0) return null;
    const co2Tons = portfolio.metrics?.co2_avoided_tons
      ? (portfolio.metrics.co2_avoided_tons * Math.max(totalInvested, 1)) / 10000
      : 0;
    const trees = Math.round(co2Tons * 45);
    const energy = Math.round(totalInvested / 5); // kWh — même heuristique que /portfolio
    const esg = portfolio.metrics?.esg_score ?? 0;
    return { co2Tons, trees, energy, esg };
  }, [portfolio, valuation.totalInvested]);

  if (!portfolio || !data) return null;

  const co2Display = data.co2Tons >= 1 ? data.co2Tons : data.co2Tons * 1000;
  const co2Unit = data.co2Tons >= 1 ? t("impact_ribbon.tonnes") : t("impact_ribbon.kg");

  // Équivalence concrète — déterministe, hydration-safe
  const equivalence =
    data.co2Tons >= 1
      ? t("impact_hero.equivalence_trips", { count: Math.max(1, Math.round(data.co2Tons * 6)) })
      : t("impact_hero.equivalence_trees", { count: Math.max(1, data.trees) });

  const energyLabel =
    data.energy >= 1000 ? (data.energy / 1000).toFixed(1) : Math.round(data.energy).toString();
  const energyUnit = data.energy >= 1000 ? "MWh" : "kWh";

  const fmt = (v: number) =>
    v.toLocaleString(lang === "en" ? "en-US" : "fr-FR", {
      minimumFractionDigits: data.co2Tons >= 1 ? 2 : 0,
      maximumFractionDigits: data.co2Tons >= 1 ? 2 : 0,
    });

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_REVEAL }}
      className="px-5 pt-8"
    >
      <article className="relative overflow-hidden rounded-3xl border border-paper-3 bg-paper paper-grain p-6 md:p-8">
        {/* Filet or en tête */}
        <div className="gold-rule mb-5" aria-hidden />

        <header className="flex items-baseline justify-between gap-3">
          <p className="text-tag uppercase tracking-[0.22em] font-semibold text-gold">
            <span className="opacity-70">N° 02 ·</span> {t("impact_hero.eyebrow")}
          </p>
          <Link
            to="/methodologie"
            className="text-tag uppercase tracking-[0.18em] font-semibold text-ink-3 hover:text-ink transition-colors"
          >
            {t("impact_hero.see_methodology")}
          </Link>
        </header>

        {/* Hero CO₂ */}
        <div className="mt-6">
          <p className="text-tag uppercase tracking-[0.22em] font-semibold text-ink-3 mb-3">
            {t("impact_hero.co2_label")}
          </p>
          <div className="kpi-figure flex items-baseline gap-3 text-7xl md:text-8xl leading-none">
            <AnimatedFigure value={co2Display} format={fmt} />
            <span className="text-2xl md:text-3xl font-medium tracking-normal text-ink-3 font-sans">
              {co2Unit}
            </span>
          </div>
          <p className="mt-4 font-display text-base md:text-lg text-ink-2 max-w-md leading-snug">
            {t("impact_hero.headline")}
          </p>
          <p className="mt-2 text-xs text-ink-3 italic">{equivalence}</p>
          <p className="mt-3 text-xs text-ink-3 leading-relaxed max-w-md">
            {t("impact_hero.explainer")}{" "}
            <Link
              to="/methodologie"
              className="underline underline-offset-2 hover:text-gold transition-colors"
            >
              {t("impact_hero.learn_more")}
            </Link>
          </p>
        </div>

        {/* Filet or */}
        <div className="gold-rule my-6" aria-hidden />

        {/* Bandeau mini-KPI */}
        <div className="grid grid-cols-3 gap-4">
          <KPIFigure
            value={data.trees.toLocaleString(lang === "en" ? "en-US" : "fr-FR")}
            label={t("impact_ribbon.trees_label")}
            size="sm"
          />
          <KPIFigure
            value={energyLabel}
            unit={energyUnit}
            label={t("impact_ribbon.energy_label")}
            size="sm"
          />
          <KPIFigure
            value={data.esg.toFixed(0)}
            unit="/100"
            label={t("impact_hero.impact_score_label")}
            size="sm"
            accent
          />
        </div>

        <div className="mt-6 flex items-center justify-end">
          <Link
            to="/portfolio"
            className="text-caption uppercase tracking-[0.18em] font-semibold text-ink hover:text-gold transition-colors inline-flex items-center gap-2"
          >
            {t("impact_hero.see_detail")}
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </article>
    </motion.section>
  );
}
