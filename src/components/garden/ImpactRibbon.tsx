import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface ImpactRibbonProps {
  co2Avoided: number;
  treesEquivalent: number;
  energyFinanced: number;
  esgScore: number;
}

export function ImpactRibbon({ co2Avoided, treesEquivalent, energyFinanced, esgScore }: ImpactRibbonProps) {
  const { t } = useTranslation();
  const co2Label =
    co2Avoided >= 1 ? `${co2Avoided.toFixed(1)}` : `${(co2Avoided * 1000).toFixed(0)}`;
  const co2Unit = co2Avoided >= 1 ? t("impact_ribbon.tonnes") : t("impact_ribbon.kg");
  const energyLabel =
    energyFinanced >= 1000 ? `${(energyFinanced / 1000).toFixed(1)}` : `${Math.round(energyFinanced)}`;
  const energyUnit = energyFinanced >= 1000 ? "MWh" : "kWh";

  const secondary = [
    { value: Math.round(treesEquivalent).toString(), label: t("impact_ribbon.trees_label"), icon: "🌳" },
    { value: `${energyLabel} ${energyUnit}`, label: t("impact_ribbon.energy_label"), icon: "⚡" },
    { value: esgScore.toFixed(1), label: t("impact_ribbon.impact_score"), icon: "✨" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-moss-1 via-moss-2 to-moss-3 text-paper p-6"
    >
      {/* décor pastel */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-paper/10 pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-paper/8 pointer-events-none" />
      <div className="absolute top-1/2 right-8 w-20 h-20 rounded-full bg-paper/5 pointer-events-none" />

      <div className="relative">
        <p className="text-[10px] uppercase tracking-[0.18em] opacity-70 font-semibold">
          {t("impact_ribbon.real_impact")}
        </p>

        {/* Hero CO₂ */}
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-value text-6xl leading-none">{co2Label}</span>
          <span className="text-lg font-medium opacity-90">{co2Unit}</span>
        </div>
        <p className="text-[13px] opacity-80 mt-1.5">
          {t("impact_ribbon.co2_avoided_desc")}
        </p>

        {/* Métriques secondaires */}
        <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-paper/15">
          {secondary.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              className="text-left"
            >
              <div className="text-base mb-1" aria-hidden>{item.icon}</div>
              <p className="font-value text-xl leading-none tabular-nums">{item.value}</p>
              <p className="text-[10px] mt-1 opacity-70 leading-tight">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
