import { motion } from "framer-motion";
import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";

export interface GardenPlant {
  id: string;
  ticker: string;
  name: string;
  allocationPct: number;
  performancePct: number;
  esgScore: number;
  category: string;
}

interface GardenVisualizationProps {
  plants: GardenPlant[];
  maxSlots?: number;
  onPlantClick?: (plant: GardenPlant) => void;
  onEmptySlotClick?: () => void;
}

/**
 * Institutional allocation view — fine horizontal bars, tabular numerals.
 * Inspired by Bloomberg / Lombard Odier holdings tables.
 */
export function GardenVisualization({
  plants,
  onPlantClick,
  onEmptySlotClick,
}: GardenVisualizationProps) {
  const navigate = useNavigate();

  const sorted = useMemo(
    () => [...plants].sort((a, b) => b.allocationPct - a.allocationPct),
    [plants],
  );

  const maxAlloc = Math.max(...sorted.map((p) => p.allocationPct), 1);

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between border-b border-paper-3 pb-2 mb-1">
        <p className="text-[10px] uppercase tracking-[0.12em] text-ink-3 font-medium">
          Allocation
        </p>
        <p className="text-[10px] uppercase tracking-[0.12em] text-ink-3 font-medium">
          Perf.
        </p>
      </div>

      <ul className="divide-y divide-paper-3">
        {sorted.map((plant, i) => {
          const widthPct = (plant.allocationPct / maxAlloc) * 100;
          const isPositive = plant.performancePct >= 0;
          return (
            <motion.li
              key={plant.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              onClick={() => onPlantClick?.(plant)}
              className="group py-3 cursor-pointer"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="font-value text-[13px] text-ink tracking-tight">
                    {plant.ticker}
                  </span>
                  <span className="text-[11px] text-ink-3 truncate">
                    {plant.name}
                  </span>
                </div>
                <span
                  className={`text-[12px] font-medium tabular-nums flex-shrink-0 ${
                    isPositive ? "text-moss-1" : "text-rust"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {plant.performancePct.toFixed(2)}%
                </span>
              </div>

              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-px bg-paper-3 relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{ delay: 0.15 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                    className="absolute inset-y-0 left-0 bg-ink"
                    style={{ height: "1px", marginTop: "0px" }}
                  />
                </div>
                <span className="text-[10px] text-ink-3 tabular-nums w-10 text-right">
                  {plant.allocationPct.toFixed(1)}%
                </span>
              </div>
            </motion.li>
          );
        })}

        <li
          onClick={() => (onEmptySlotClick ? onEmptySlotClick() : navigate({ to: "/discover" }))}
          className="py-3 cursor-pointer text-ink-3 hover:text-ink transition-colors flex items-center justify-between"
        >
          <span className="text-[12px] tracking-tight">+ Ajouter une position</span>
          <span className="text-[10px] uppercase tracking-[0.12em]">Explorer</span>
        </li>
      </ul>
    </div>
  );
}
