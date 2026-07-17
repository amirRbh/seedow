import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { KPIFigure } from "@/components/ui/KPIFigure";
import { AnimatedFigure } from "@/components/ui/AnimatedFigure";
import { useLang } from "@/hooks/useLang";

interface ImpactRibbonProps {
  co2Avoided: number;
  treesEquivalent: number;
  energyFinanced: number;
  esgScore: number; // 0–10
}

/**
 * ImpactRibbon — version éditoriale sobre.
 * Fond papier + filet or, KPI signature ; remplace l'ancien gradient moss saturé.
 */
export function ImpactRibbon({
  co2Avoided,
  treesEquivalent,
  energyFinanced,
  esgScore,
}: ImpactRibbonProps) {
  const { t } = useTranslation();
  const { lang } = useLang();

  const co2Display = co2Avoided >= 1 ? co2Avoided : co2Avoided * 1000;
  const co2Unit = co2Avoided >= 1 ? t("impact_ribbon.tonnes") : t("impact_ribbon.kg");
  const energyLabel =
    energyFinanced >= 1000
      ? (energyFinanced / 1000).toFixed(1)
      : Math.round(energyFinanced).toString();
  const energyUnit = energyFinanced >= 1000 ? "MWh" : "kWh";

  const fmt = (v: number) =>
    v.toLocaleString(lang === "en" ? "en-US" : "fr-FR", {
      minimumFractionDigits: co2Avoided >= 1 ? 2 : 0,
      maximumFractionDigits: co2Avoided >= 1 ? 2 : 0,
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-paper-3 bg-paper paper-grain p-6"
    >
      <div className="gold-rule mb-5" aria-hidden />

      <p className="text-tag uppercase tracking-[0.22em] font-semibold text-gold">
        {t("impact_ribbon.real_impact")}
      </p>

      <p className="text-tag uppercase tracking-[0.22em] font-semibold text-ink-3 mt-4">
        {t("impact_ribbon.co2_label")}
      </p>
      <div className="mt-1 kpi-figure flex items-baseline gap-2 text-6xl leading-none">
        <AnimatedFigure value={co2Display} format={fmt} />
        <span className="text-lg font-medium tracking-normal text-ink-3 font-sans">{co2Unit}</span>
      </div>
      <p className="text-body-sm text-ink-2 mt-2">{t("impact_ribbon.co2_avoided_desc")}</p>
      <p className="mt-2 text-xs text-ink-3 leading-relaxed max-w-md">
        {t("impact_ribbon.explainer")}{" "}
        <Link
          to="/methodologie"
          className="underline underline-offset-2 hover:text-gold transition-colors"
        >
          {t("impact_ribbon.learn_more")}
        </Link>
      </p>

      <div className="gold-rule my-5" aria-hidden />

      <div className="grid grid-cols-3 gap-4">
        <KPIFigure
          value={Math.round(treesEquivalent).toLocaleString(lang === "en" ? "en-US" : "fr-FR")}
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
          value={esgScore.toFixed(1)}
          unit="/10"
          label={t("impact_ribbon.impact_score")}
          size="sm"
          accent
        />
      </div>
    </motion.div>
  );
}
