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
      className="h-full w-full paper-card overflow-hidden flex flex-col select-none bg-card relative"
      style={{ pointerEvents: isStatic ? "none" : "auto" }}
    >
      {/* Hero band with orb + gradient */}
      <div
        className="relative px-5 pt-5 pb-4"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklab, ${orbColor} 14%, transparent) 0%, transparent 60%)`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="text-[9px] uppercase tracking-[0.14em] text-ink-3 font-semibold px-2 py-0.5 rounded-full bg-paper-2 border border-paper-3">
            {asset.category}
          </span>
          <div className="flex items-center gap-1 text-[10px] font-semibold text-moss-1 bg-moss-5 px-2 py-1 rounded-full border border-moss-4">
            <span className="w-1.5 h-1.5 rounded-full bg-moss-1" />
            ESG {esg.toFixed(1)}
          </div>
        </div>

        <div className="flex items-end gap-4 mt-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 20 }}
            className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 shadow-deep"
            style={{
              background: `radial-gradient(circle at 30% 30%, color-mix(in oklab, ${orbColor} 80%, white), ${orbColor})`,
            }}
          >
            <span className="text-paper text-[11px] font-bold tracking-tight">
              {asset.ticker.slice(0, 5)}
            </span>
          </motion.div>
          <div className="flex-1 min-w-0">
            <h3 className="font-value text-2xl text-ink leading-tight tracking-tight">
              {asset.name}
            </h3>
            <p className="font-value text-base text-ink-2 mt-0.5">
              {asset.current_price.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </p>
          </div>
        </div>

        <p className="text-[13px] text-ink-2 mt-4 line-clamp-3 leading-relaxed">
          {asset.description}
        </p>
      </div>

      <div className="mx-5 border-t border-dashed border-paper-3" />

      <div className="p-5 pt-4 flex-1 space-y-5 overflow-y-auto">
        {/* Carte d'identité */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-3 font-semibold mb-2">
            Carte d'identité
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            {asset.issuer && <IdRow label="Émetteur" value={asset.issuer} />}
            {asset.domicile && <IdRow label="Domicile" value={asset.domicile} />}
            {asset.currency && <IdRow label="Devise" value={asset.currency} />}
            {typeof asset.ter_pct === "number" && (
              <IdRow label="Frais (TER)" value={`${asset.ter_pct.toFixed(2)} %`} />
            )}
            {asset.dividend_policy && (
              <IdRow
                label="Dividendes"
                value={
                  asset.dividend_policy +
                  (asset.dividend_yield_pct ? ` · ${asset.dividend_yield_pct.toFixed(1)} %` : "")
                }
              />
            )}
            {typeof asset.risk_level === "number" && (
              <IdRow label="Risque" value={`${asset.risk_level}/7`} />
            )}
            {asset.inception_year && (
              <IdRow label="Créé en" value={asset.inception_year.toString()} />
            )}
            {asset.benchmark && asset.benchmark !== "—" && (
              <IdRow label="Indice" value={asset.benchmark} />
            )}
            {typeof asset.holdings_count === "number" && (
              <IdRow label="Lignes" value={asset.holdings_count.toLocaleString("fr-FR")} />
            )}
          </div>
        </div>

        {asset.top_holdings && asset.top_holdings.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-ink-3 font-semibold mb-2">
              Principales positions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {asset.top_holdings.map((h) => (
                <span
                  key={h}
                  className="text-[10px] bg-paper-2 text-ink-2 font-medium px-2 py-0.5 rounded-full border border-paper-3"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}

        {asset.sector_breakdown && asset.sector_breakdown.length > 1 && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-ink-3 font-semibold mb-2">
              Répartition sectorielle
            </p>
            <Breakdown items={asset.sector_breakdown} color="var(--moss-1)" />
          </div>
        )}

        {asset.geo_breakdown && asset.geo_breakdown.length > 1 && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-ink-3 font-semibold mb-2">
              Répartition géographique
            </p>
            <Breakdown items={asset.geo_breakdown} color="var(--sky)" />
          </div>
        )}

        {asset.exclusions && asset.exclusions.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-ink-3 font-semibold mb-2">
              Exclusions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {asset.exclusions.map((e) => (
                <span
                  key={e}
                  className="text-[10px] bg-rust/10 text-rust font-semibold px-2 py-0.5 rounded-full border border-rust/20"
                >
                  ⊘ {e}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-3 font-semibold mb-3">
            Si tu plantes 100 € ici
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            <ImpactStat value={esg.toFixed(1)} unit="/10" label="Impact ESG" tone="moss" />
            <ImpactStat value={`${(co2Per100 * 12).toFixed(1)}`} unit="kg" label="CO₂ évité/an" />
            <ImpactStat value={Math.round(kwhPer100 * 12).toString()} unit="kWh" label="Énergie verte/an" />
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[11px] text-ink-3 font-medium">Alignement ESG</span>
              <span className="text-xs font-bold text-moss-1">{esg.toFixed(1)}/10</span>
            </div>
            <div className="h-1.5 bg-paper-2 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${esg * 10}%` }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                className="h-full bg-moss-1 rounded-full"
              />
            </div>
          </div>
        </div>

        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {asset.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[10px] bg-moss-5 text-moss-1 font-semibold px-2 py-0.5 rounded-full capitalize border border-moss-4"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function IdRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-dashed border-paper-3 py-1">
      <span className="text-ink-3 font-medium">{label}</span>
      <span className="text-ink font-semibold text-right truncate">{value}</span>
    </div>
  );
}

function Breakdown({ items, color }: { items: { label: string; pct: number }[]; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 rounded-full overflow-hidden bg-paper-2 border border-paper-3">
        {items.map((it, i) => (
          <div
            key={it.label}
            style={{
              width: `${it.pct}%`,
              background: `color-mix(in oklab, ${color} ${100 - i * 12}%, white)`,
            }}
            title={`${it.label} ${it.pct}%`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {items.map((it, i) => (
          <div key={it.label} className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1.5 text-ink-2 truncate">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: `color-mix(in oklab, ${color} ${100 - i * 12}%, white)` }}
              />
              {it.label}
            </span>
            <span className="text-ink-3 font-semibold">{it.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImpactStat({
  value,
  unit,
  label,
  tone,
}: {
  value: string;
  unit?: string;
  label: string;
  tone?: "moss" | "default";
}) {
  return (
    <div className="bg-paper-2 rounded-xl p-2.5 text-center border border-paper-3">
      <p className={`font-value text-xl leading-none ${tone === "moss" ? "text-moss-1" : "text-ink"}`}>
        {value}
        {unit && <span className="text-[11px] text-ink-3 ml-0.5 font-sans">{unit}</span>}
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
