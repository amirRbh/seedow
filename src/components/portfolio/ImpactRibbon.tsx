import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { KPIFigure } from "@/components/ui/KPIFigure";
import { AnimatedFigure } from "@/components/ui/AnimatedFigure";
import { useLang } from "@/hooks/useLang";
import type { PortfolioImpactView } from "@/lib/impact/portfolioImpact";

interface ImpactRibbonProps {
  /** Vue d'impact honnête (cf. lib/impact/portfolioImpact). */
  impact: PortfolioImpactView;
  /** Score ESG sur 10 (échelle de la page portefeuille). */
  esgScore10: number;
}

/**
 * ImpactRibbon — bloc impact de la page portefeuille.
 *
 * Comme ImpactHero, n'affiche un chiffre carbone que s'il est réellement mesuré.
 * Fini l'heuristique inventée (arbres = co2×45, énergie = montant/5) : elle est
 * remplacée par l'empreinte financée réelle ou un état honnête « en cours de mesure ».
 */
export function ImpactRibbon({ impact, esgScore10 }: ImpactRibbonProps) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const numLocale = lang === "en" ? "en-US" : "fr-FR";

  const kg = impact.financedEmissionsKgPerYear;
  const inTonnes = kg != null && kg >= 1000;
  const footprintValue = kg == null ? 0 : inTonnes ? kg / 1000 : kg;
  const footprintUnit = inTonnes ? "t" : "kg";

  const fmt = (v: number) =>
    v.toLocaleString(numLocale, {
      minimumFractionDigits: inTonnes ? 2 : 0,
      maximumFractionDigits: inTonnes ? 2 : 0,
    });

  const carEquiv = impact.presentation.show
    ? impact.presentation.equivalences.find((e) => e.factorId === "car_km")
    : undefined;
  const coveragePct = Math.round(impact.coverage * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-paper-3 bg-paper paper-grain p-6"
    >
      <div className="gold-rule mb-5" aria-hidden />

      <p className="text-tag uppercase tracking-[0.22em] font-semibold text-gold">
        {impact.measured
          ? t("impact_hero.eyebrow")
          : impact.intensity
            ? t("impact_hero.intensity_eyebrow")
            : t("impact_hero.not_measured_eyebrow")}
      </p>

      {impact.measured ? (
        <>
          <p className="text-tag uppercase tracking-[0.22em] font-semibold text-ink-3 mt-4">
            {t("impact_hero.footprint_label")}
          </p>
          <div className="mt-1 kpi-figure flex items-baseline gap-2 text-6xl leading-none">
            <AnimatedFigure value={footprintValue} format={fmt} />
            <span className="text-lg font-medium tracking-normal text-ink-3 font-sans">
              {footprintUnit} CO₂e{t("impact_hero.per_year")}
            </span>
          </div>
          {carEquiv && (
            <p className="mt-2 text-xs text-ink-3 italic">
              {t("impact_hero.equivalence_prefix")}{" "}
              {Math.round(Math.abs(carEquiv.value)).toLocaleString(numLocale)}{" "}
              {t("impact.equiv.car_km")} · {carEquiv.source} {carEquiv.asOf}
            </p>
          )}
          <p className="mt-2 text-xs text-ink-3 leading-relaxed max-w-md">
            {t("impact_hero.coverage_line", { coverage: coveragePct })} —{" "}
            {t("impact_hero.explainer")}{" "}
            <Link
              to="/methodologie"
              className="underline underline-offset-2 hover:text-gold transition-colors"
            >
              {t("impact_hero.learn_more")}
            </Link>
          </p>
        </>
      ) : impact.intensity ? (
        <>
          <p className="text-tag uppercase tracking-[0.22em] font-semibold text-ink-3 mt-4">
            {t("impact_hero.intensity_label")}
          </p>
          <div className="mt-1 kpi-figure flex items-baseline gap-2 text-6xl leading-none">
            <AnimatedFigure
              value={impact.intensity.waci}
              format={(v) => v.toLocaleString(numLocale, { maximumFractionDigits: 0 })}
            />
            <span className="text-lg font-medium tracking-normal text-ink-3 font-sans">
              {t("impact_hero.intensity_unit")}
            </span>
          </div>
          {impact.intensity.vsBenchmarkDeltaPct != null && (
            <div
              className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                impact.intensity.cleaner
                  ? "bg-highlight-5 text-highlight-1"
                  : "bg-alert-tint text-rust"
              }`}
            >
              {t(
                impact.intensity.cleaner
                  ? "impact_hero.vs_benchmark_cleaner"
                  : "impact_hero.vs_benchmark_dirtier",
                { pct: Math.round(Math.abs(impact.intensity.vsBenchmarkDeltaPct) * 100) },
              )}
            </div>
          )}
          <p className="mt-2 text-xs text-ink-3 leading-relaxed max-w-md">
            {t("impact_hero.intensity_coverage_line", {
              coverage: Math.round(impact.intensity.coverage * 100),
            })}{" "}
            — {t("impact_hero.intensity_explainer")}{" "}
            <Link
              to="/methodologie"
              className="underline underline-offset-2 hover:text-gold transition-colors"
            >
              {t("impact_hero.learn_more")}
            </Link>
          </p>
        </>
      ) : (
        <>
          <p className="text-tag uppercase tracking-[0.22em] font-semibold text-ink-3 mt-4">
            {t("impact_hero.not_measured_label")}
          </p>
          <div className="mt-1 kpi-figure flex items-baseline gap-2 text-6xl leading-none">
            <AnimatedFigure value={esgScore10} format={(v) => v.toFixed(1)} />
            <span className="text-lg font-medium tracking-normal text-ink-3 font-sans">/10</span>
          </div>
          <p className="mt-2 text-xs text-ink-3 leading-relaxed max-w-md">
            {t("impact_hero.not_measured_note")}{" "}
            <Link
              to="/methodologie"
              className="underline underline-offset-2 hover:text-gold transition-colors"
            >
              {t("impact_hero.learn_more")}
            </Link>
          </p>
        </>
      )}

      <div className="gold-rule my-5" aria-hidden />

      <div className="grid grid-cols-3 gap-4">
        <KPIFigure
          value={esgScore10.toFixed(1)}
          unit="/10"
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
        ) : impact.intensity ? (
          <>
            <KPIFigure
              value={impact.intensity.waci.toLocaleString(numLocale, { maximumFractionDigits: 0 })}
              unit={t("impact_hero.intensity_unit")}
              label={t("impact_hero.intensity_label")}
              size="sm"
            />
            <KPIFigure
              value={Math.round(impact.intensity.coverage * 100).toString()}
              unit="%"
              label={t("impact_hero.coverage_label")}
              size="sm"
            />
          </>
        ) : (
          <div className="col-span-2 flex items-center">
            <p className="text-xs text-ink-3 leading-relaxed">{t("impact.reason.no_data")}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
