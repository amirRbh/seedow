import { motion } from "framer-motion";

interface GrowthComparisonProps {
  currentValue: number;
  invested: number;
  gain: number;
  returnPct: number;
}

export function GrowthComparison({ currentValue, invested, gain, returnPct }: GrowthComparisonProps) {
  const isGrowing = gain >= 0;
  const max = Math.max(currentValue, invested, 1);
  const investedPct = (invested / max) * 100;
  const valuePct = (currentValue / max) * 100;

  return (
    <div className="paper-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Ta croissance</p>
          <p className="font-value text-3xl text-ink mt-1">
            {isGrowing ? "+" : ""}
            {gain.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
          </p>
        </div>
        <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${isGrowing ? "bg-moss-5 text-moss-1" : "bg-[oklch(0.93_0.05_45)] text-rust"}`}>
          {isGrowing ? "+" : ""}
          {returnPct.toFixed(1)} %
        </div>
      </div>

      <div className="mt-5 space-y-3.5">
        <BarRow label="Graines plantées" value={invested.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })} pct={investedPct} color="bg-paper-3" delay={0} />
        <BarRow label="Valeur cultivée" value={currentValue.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })} pct={valuePct} color={isGrowing ? "bg-moss-1" : "bg-rust"} delay={0.15} />
      </div>
    </div>
  );
}

function BarRow({ label, value, pct, color, delay }: { label: string; value: string; pct: number; color: string; delay: number }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs text-ink-3 font-medium">{label}</span>
        <span className="text-sm font-semibold text-ink">{value}</span>
      </div>
      <div className="h-2 bg-paper-2 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay }} className={`h-full rounded-full ${color}`} />
      </div>
    </div>
  );
}
