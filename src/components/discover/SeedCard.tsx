import { motion } from "framer-motion";
import type { MockAsset } from "@/lib/mockGarden";

interface SeedCardProps {
  asset: MockAsset;
  static?: boolean;
}

export function SeedCard({ asset, static: isStatic }: SeedCardProps) {
  const esg = asset.overall_esg_score;
  const co2Per100 = asset.co2_factor_per_1k_eur * 0.1;
  const kwhPer100 = asset.energy_factor_per_1k_eur * 0.1;
  const orbColor = getOrbColor(asset.category, esg);

  return (
    <motion.div
      className="h-full w-full paper-card overflow-hidden flex flex-col select-none bg-card"
      style={{ pointerEvents: isStatic ? "none" : "auto" }}
    >
      <div className="p-5 pb-4">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: orbColor }}>
            <span className="text-paper text-sm font-bold tracking-tight">{asset.ticker.slice(0, 5)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">{asset.category}</p>
            <h3 className="font-value text-2xl text-ink mt-0.5 leading-tight">{asset.name}</h3>
            <p className="font-value text-xl text-ink-2 mt-1">
              {asset.current_price.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </p>
          </div>
        </div>

        <p className="text-sm text-ink-2 mt-4 line-clamp-3 leading-relaxed">{asset.description}</p>
      </div>

      <div className="mx-5 border-t border-dashed border-paper-3" />

      <div className="p-5 pt-4 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-3">Si tu plantes 100 € ici</p>

        <div className="grid grid-cols-3 gap-3">
          <ImpactStat value={esg.toFixed(1)} unit="/10" label="Impact ESG" />
          <ImpactStat value={`${(co2Per100 * 12).toFixed(1)}kg`} label="CO₂ évité/an" />
          <ImpactStat value={Math.round(kwhPer100 * 12).toString()} unit="kWh" label="Énergie verte/an" />
        </div>

        <div className="mt-5">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[11px] text-ink-3 font-medium">Alignement ESG</span>
            <span className="text-xs font-bold text-moss-1">{esg.toFixed(1)}/10</span>
          </div>
          <div className="h-2 bg-paper-2 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${esg * 10}%` }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className="h-full bg-moss-1 rounded-full"
            />
          </div>
        </div>

        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-5">
            {asset.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[10px] bg-moss-5 text-moss-1 font-semibold px-2 py-0.5 rounded-full capitalize">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ImpactStat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="bg-paper-2 rounded-xl p-2.5 text-center">
      <p className="font-value text-xl text-ink leading-none">
        {value}
        {unit && <span className="text-xs text-ink-3 ml-0.5">{unit}</span>}
      </p>
      <p className="text-[9px] mt-1.5 text-ink-3 font-medium leading-tight">{label}</p>
    </div>
  );
}

function getOrbColor(category: string, esg: number): string {
  const cat = category.toLowerCase();
  if (cat.includes("etf")) {
    if (esg >= 8.5) return "var(--moss-1)";
    if (esg >= 7) return "var(--moss-2)";
    return "var(--moss-3)";
  }
  if (cat.includes("oblig")) return "var(--sky)";
  if (esg >= 8) return "var(--bloom)";
  return "var(--moss-2)";
}
