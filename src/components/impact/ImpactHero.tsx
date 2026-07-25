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
import { buildPortfolioImpact } from "@/lib/impact/portfolioImpact";

/**
 * ImpactHero — pilier « impact nature » du dashboard.
 *
 * Ne présente un chiffre carbone QUE s'il est réellement mesuré (données
 * émetteurs, cf. lib/impact/portfolioImpact). Sinon, état honnête : score ESG
 * réel + mention « en cours de mesure ». Aucune heuristique inventée (plus
 * d'« arbres équivalents » ni d'« énergie = montant/5 »).
 */
export function ImpactHero() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { portfolio } = useActivePortfolio();
  const valuation = usePortfolioValuation();
  const numLocale = lang === "en" ? "en-US" : "fr-FR";

  const impact = useMemo(() => {
    if (!portfolio?.metrics) return null;
    const totalInvested = valuation.totalInvested || portfolio.initial_amount || 0;
    if (totalInvested <= 0) return null;
    return buildPortfolioImpact(portfolio.metrics, totalInvested);
  }, [portfolio, valuation.totalInvested]);

  if (!portfolio || !impact) return null;

  const kg = impact.financedEmissionsKgPerYear;
  const inTonnes = kg != null && kg >= 1000;
  const footprintValue = kg == null ? 0 : inTonnes ? kg / 1000 : kg;
  const footprintUnit = inTonnes ? "t" : "kg";

  const fmt = (v: number) =>
    v.toLocaleString(numLocale, {
      minimumFractionDigits: inTonnes ? 2 : 0,
      maximumFractionDigits: inTonnes ? 2 : 0,
    });

  // Équivalence concrète — uniquement si la donnée est mesurée ET assez couverte.
  const carEquiv = impact.presentation.show
    ? impact.presentation.equivalences.find((e) => e.factorId === "car_km")
    : undefined;

  const coveragePct = Math.round(impact.coverage * 100);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_REVEAL }}
      className="px-5 pt-8"
    >
      <article className="relative overflow-hidden rounded-3xl border border-paper-3 bg-paper paper-grain p-6 md:p-8">
        <div className="gold-rule mb-5" aria-hidden />

        <header className="flex items-baseline justify-between gap-3">
          <p className="text-tag uppercase tracking-[0.22em] font-semibold text-gold">
            <span className="opacity-70">N° 02 ·</span>{" "}
            {impact.measured ? t("impact_hero.eyebrow") : t("impact_hero.not_measured_eyebrow")}
          </p>
          <Link
            to="/methodologie"
            className="text-tag uppercase tracking-[0.18em] font-semibold text-ink-3 hover:text-ink transition-colors"
          >
            {t("impact_hero.see_methodology")}
          </Link>
        </header>

        {impact.measured ? (
          <div className="mt-6">
            <p className="text-tag uppercase tracking-[0.22em] font-semibold text-ink-3 mb-3">
              {t("impact_hero.footprint_label")}
            </p>
            <div className="kpi-figure flex items-baseline gap-3 text-7xl md:text-8xl leading-none">
              <AnimatedFigure value={footprintValue} format={fmt} />
              <span className="text-2xl md:text-3xl font-medium tracking-normal text-ink-3 font-sans">
                {footprintUnit} CO₂e{t("impact_hero.per_year")}
              </span>
            </div>
            <p className="mt-4 font-display text-base md:text-lg text-ink-2 max-w-md leading-snug">
              {t("impact_hero.footprint_headline")}
            </p>
            {carEquiv && (
              <p className="mt-2 text-xs text-ink-3 italic">
                {t("impact_hero.equivalence_prefix")}{" "}
                {Math.round(Math.abs(carEquiv.value)).toLocaleString(numLocale)}{" "}
                {t("impact.equiv.car_km")} · {carEquiv.source} {carEquiv.asOf}
              </p>
            )}
            <p className="mt-3 text-xs text-ink-3 leading-relaxed max-w-md">
              {t("impact_hero.coverage_line", { coverage: coveragePct })} — {t("impact_hero.explainer")}{" "}
              <Link
                to="/methodologie"
                className="underline underline-offset-2 hover:text-gold transition-colors"
              >
                {t("impact_hero.learn_more")}
              </Link>
            </p>
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-tag uppercase tracking-[0.22em] font-semibold text-ink-3 mb-3">
              {t("impact_hero.not_measured_label")}
            </p>
            <div className="kpi-figure flex items-baseline gap-3 text-7xl md:text-8xl leading-none">
              <AnimatedFigure value={impact.esgScore} format={(v) => v.toFixed(0)} />
              <span className="text-2xl md:text-3xl font-medium tracking-normal text-ink-3 font-sans">
                /100
              </span>
            </div>
            <p className="mt-4 font-display text-base md:text-lg text-ink-2 max-w-md leading-snug">
              {t("impact_hero.not_measured_headline")}
            </p>
            <p className="mt-3 text-xs text-ink-3 leading-relaxed max-w-md">
              {t("impact_hero.not_measured_note")}{" "}
              <Link
                to="/methodologie"
                className="underline underline-offset-2 hover:text-gold transition-colors"
              >
                {t("impact_hero.learn_more")}
              </Link>
            </p>
          </div>
        )}

        <div className="gold-rule my-6" aria-hidden />

        <div className="grid grid-cols-3 gap-4">
          <KPIFigure
            value={impact.esgScore.toFixed(0)}
            unit="/100"
            label={t("impact_hero.impact_score_label")}
            size="sm"
            accent
          />
          {impact.measured && impact.intensityGco2ePerEur != null ? (
            <>
              <KPIFigure
                value={impact.intensityGco2ePerEur.toLocaleString(numLocale, {
                  maximumFractionDigits: 1,
                })}
                unit="gCO₂e/€"
                label={t("impact_hero.intensity_label")}
                size="sm"
              />
              <KPIFigure
                value={coveragePct.toString()}
                unit="%"
                label={t("impact_hero.coverage_label")}
                size="sm"
              />
            </>
          ) : (
            <div className="col-span-2 flex items-center">
              <p className="text-xs text-ink-3 leading-relaxed">
                {t("impact.reason.no_data")}
              </p>
            </div>
          )}
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
