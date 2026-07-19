import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ActiveHolding } from "@/hooks/useActivePortfolio";
import type { ValuedHolding } from "@/hooks/usePortfolioValuation";
import { HoldingDetailSheet } from "./HoldingDetailSheet";

interface Props {
  holdings: ActiveHolding[];
  totalAmount: number;
  valuedHoldings?: ValuedHolding[];
}

const CLASS_LABELS: Record<string, string> = {
  equity_dev: "Grandes entreprises",
  equity_em: "Marchés émergents",
  thematic: "Thématique impact",
  green_bond: "Obligations vertes",
  social_bond: "Obligations sociales",
  sov_bond: "Obligations d'État",
  reit: "Immobilier durable",
  commodity: "Matières premières",
  cash: "Réserve sécurisée",
};

const CLASS_COLOR: Record<string, string> = {
  equity_dev: "var(--highlight-1)",
  equity_em: "var(--highlight-2)",
  thematic: "var(--bloom)",
  green_bond: "var(--highlight-3)",
  social_bond: "var(--sky)",
  sov_bond: "var(--ink-2)",
  reit: "var(--gold)",
  commodity: "var(--peach)",
  cash: "var(--paper-3)",
};

export function AllocationBreakdown({ holdings, totalAmount, valuedHoldings }: Props) {
  const [selected, setSelected] = useState<ActiveHolding | null>(null);

  if (holdings.length === 0) return null;

  // Index valued holdings by asset id for quick lookup
  const valuedById = new Map<string, ValuedHolding>();
  for (const v of valuedHoldings ?? []) {
    valuedById.set(v.asset_id, v);
  }

  // Movers: assets with a non-null return today (sorted by |returnPct|)
  const movers = (valuedHoldings ?? [])
    .filter((v) => v.currentPrice != null && v.entryPrice != null && Math.abs(v.returnPct) > 0.01)
    .sort((a, b) => Math.abs(b.returnPct) - Math.abs(a.returnPct))
    .slice(0, 3);

  // Group by class for the stacked bar
  const byClass = new Map<string, number>();
  for (const h of holdings) {
    byClass.set(h.category, (byClass.get(h.category) ?? 0) + h.allocationPct);
  }
  const classBreakdown = Array.from(byClass.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="paper-card p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="text-tag uppercase tracking-wider text-ink-3 font-semibold">Allocation</p>
          <p className="font-value text-2xl text-ink mt-0.5">
            {holdings.length} <span className="text-base text-ink-3">positions</span>
          </p>
        </div>
        <p className="text-caption text-ink-3">
          Total{" "}
          <span className="font-semibold text-ink">
            {totalAmount.toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </p>
      </div>

      {/* Stacked bar by asset class */}
      <div className="mb-2 h-3 w-full bg-paper-2 rounded-full overflow-hidden flex">
        {classBreakdown.map(([cls, pct], i) => (
          <motion.div
            key={cls}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
            style={{ backgroundColor: CLASS_COLOR[cls] ?? "var(--highlight-2)" }}
            className="h-full"
            title={`${CLASS_LABELS[cls] ?? cls} · ${pct.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Class legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-5">
        {classBreakdown.map(([cls, pct]) => (
          <div key={cls} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: CLASS_COLOR[cls] ?? "var(--highlight-2)" }}
            />
            <span className="text-caption text-ink-2">
              {CLASS_LABELS[cls] ?? cls}
              <span className="text-ink-3 ml-1">{pct.toFixed(0)}%</span>
            </span>
          </div>
        ))}
      </div>

      {/* Movers — actifs dont le prix a évolué */}
      {movers.length > 0 && (
        <div className="border-t border-paper-3 pt-4 mb-4">
          <p className="text-tag uppercase tracking-wider text-ink-3 font-semibold mb-2">
            Mouvements notables
          </p>
          <div className="flex flex-wrap gap-2">
            {movers.map((m) => {
              const up = m.returnPct >= 0;
              const target = holdings.find((h) => h.id === m.asset_id);
              if (!target) return null;
              return (
                <button
                  key={m.asset_id}
                  onClick={() => setSelected(target)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-caption transition-colors ${
                    up
                      ? "border-highlight-1/30 bg-highlight-1/5 text-highlight-1 hover:bg-highlight-1/10"
                      : "border-bloom/30 bg-bloom/5 text-bloom hover:bg-bloom/10"
                  }`}
                >
                  {up ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  <span className="font-value font-semibold">{m.ticker}</span>
                  <span className="tabular-nums">
                    {up ? "+" : ""}
                    {m.returnPct.toFixed(2)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Holdings list */}
      <div className="border-t border-paper-3 pt-4 space-y-2.5">
        {holdings.map((h, i) => {
          const amount = (h.allocationPct / 100) * totalAmount;
          const color = CLASS_COLOR[h.category] ?? "var(--highlight-2)";
          const valued = valuedById.get(h.id);
          const hasMove =
            valued?.currentPrice != null &&
            valued?.entryPrice != null &&
            Math.abs(valued.returnPct) > 0.01;
          const up = (valued?.returnPct ?? 0) >= 0;
          return (
            <motion.button
              key={h.id}
              type="button"
              onClick={() => setSelected(h)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group w-full text-left rounded-lg -mx-2 px-2 py-1.5 hover:bg-paper-2/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  <span className="text-paper text-tag font-bold tracking-tight">
                    {h.ticker.slice(0, 4)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-body-sm font-semibold text-ink truncate">{h.name}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hasMove && (
                        <span
                          className={`flex items-center gap-0.5 text-caption font-semibold tabular-nums ${
                            up ? "text-highlight-1" : "text-bloom"
                          }`}
                        >
                          {up ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {up ? "+" : ""}
                          {valued!.returnPct.toFixed(2)}%
                        </span>
                      )}
                      <p className="font-value text-sm text-ink">{h.allocationPct.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-tag text-ink-3 truncate">
                      {CLASS_LABELS[h.category] ?? h.category}
                      {h.region && ` · ${h.region}`}
                      {" · ESG "}
                      <span className="text-highlight-1 font-semibold">{h.esgScore.toFixed(0)}</span>
                    </p>
                    <p className="text-tag text-ink-3 flex-shrink-0">
                      {amount.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="h-1 mt-1.5 bg-paper-2 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${h.allocationPct}%` }}
                      transition={{
                        duration: 0.9,
                        ease: [0.22, 1, 0.36, 1],
                        delay: 0.2 + i * 0.04,
                      }}
                      style={{ backgroundColor: color }}
                      className="h-full rounded-full"
                    />
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <HoldingDetailSheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        holding={selected}
        valued={selected ? (valuedById.get(selected.id) ?? null) : null}
      />
    </div>
  );
}
