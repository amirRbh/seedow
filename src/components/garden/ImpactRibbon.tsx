import { motion } from "framer-motion";

interface ImpactRibbonProps {
  co2Avoided: number;
  treesEquivalent: number;
  energyFinanced: number;
  esgScore: number;
}

export function ImpactRibbon({ co2Avoided, treesEquivalent, energyFinanced, esgScore }: ImpactRibbonProps) {
  const items = [
    { value: co2Avoided >= 1 ? `${co2Avoided.toFixed(1)}t` : `${(co2Avoided * 1000).toFixed(0)}kg`, label: "CO₂ évité" },
    { value: Math.round(treesEquivalent).toString(), label: "Arbres éq." },
    { value: energyFinanced >= 1000 ? `${(energyFinanced / 1000).toFixed(1)}MWh` : `${Math.round(energyFinanced)}kWh`, label: "Énergie verte" },
    { value: esgScore.toFixed(1), label: "Score impact" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative overflow-hidden rounded-2xl bg-ink text-paper p-5">
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-moss-2/15 pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-moss-3/10 pointer-events-none" />

      <p className="text-[10px] uppercase tracking-wider opacity-50 font-semibold relative">Ton impact cultivé</p>

      <div className="grid grid-cols-4 gap-1 mt-3 relative">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            className={`text-center ${i > 0 ? "border-l border-paper/10" : ""}`}
          >
            <p className="font-value text-2xl leading-none">{item.value}</p>
            <p className="text-[9px] mt-1.5 opacity-50 uppercase tracking-wide">{item.label}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
