import { motion } from "framer-motion";
import type { ActiveHolding } from "@/hooks/useActivePortfolio";

interface Props {
  holdings: ActiveHolding[];
  totalAmount: number;
}

const CLASS_LABELS: Record<string, string> = {
  equity_dev: "Actions développées",
  equity_em: "Actions émergentes",
  thematic: "Thématique",
  green_bond: "Obligation verte",
  social_bond: "Obligation sociale",
  sov_bond: "Souverain",
  reit: "Immobilier",
  commodity: "Matière première",
  cash: "Liquidités",
};

const CLASS_COLOR: Record<string, string> = {
  equity_dev: "var(--moss-1)",
  equity_em: "var(--moss-2)",
  thematic: "var(--bloom)",
  green_bond: "var(--moss-3)",
  social_bond: "var(--sky)",
  sov_bond: "var(--ink-2)",
  reit: "var(--gold)",
  commodity: "var(--rust)",
  cash: "var(--paper-3)",
};

export function AllocationBreakdown({ holdings, totalAmount }: Props) {
  if (holdings.length === 0) return null;

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
          <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Allocation</p>
          <p className="font-value text-2xl text-ink mt-0.5">
            {holdings.length} <span className="text-base text-ink-3">positions</span>
          </p>
        </div>
        <p className="text-[11px] text-ink-3">
          Total{" "}
          <span className="font-semibold text-ink">
            {totalAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
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
            style={{ backgroundColor: CLASS_COLOR[cls] ?? "var(--moss-2)" }}
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
              style={{ backgroundColor: CLASS_COLOR[cls] ?? "var(--moss-2)" }}
            />
            <span className="text-[11px] text-ink-2">
              {CLASS_LABELS[cls] ?? cls}
              <span className="text-ink-3 ml-1">{pct.toFixed(0)}%</span>
            </span>
          </div>
        ))}
      </div>

      {/* Holdings list */}
      <div className="border-t border-paper-3 pt-4 space-y-2.5">
        {holdings.map((h, i) => {
          const amount = (h.allocationPct / 100) * totalAmount;
          const color = CLASS_COLOR[h.category] ?? "var(--moss-2)";
          return (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  <span className="text-paper text-[9px] font-bold tracking-tight">
                    {h.ticker.slice(0, 4)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[13px] font-semibold text-ink truncate">{h.name}</p>
                    <p className="font-value text-sm text-ink flex-shrink-0">
                      {h.allocationPct.toFixed(1)}%
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-[10px] text-ink-3 truncate">
                      {CLASS_LABELS[h.category] ?? h.category}
                      {h.region && ` · ${h.region}`}
                      {" · ESG "}
                      <span className="text-moss-1 font-semibold">{h.esgScore.toFixed(0)}</span>
                    </p>
                    <p className="text-[10px] text-ink-3 flex-shrink-0">
                      {amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="h-1 mt-1.5 bg-paper-2 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${h.allocationPct}%` }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 + i * 0.04 }}
                      style={{ backgroundColor: color }}
                      className="h-full rounded-full"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
