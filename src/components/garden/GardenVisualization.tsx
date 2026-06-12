import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatPercent } from "@/lib/format";

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

// Couleurs pastel par catégorie pour la barre stack
const CATEGORY_COLORS: Record<string, string> = {
  equity_dev: "oklch(0.78 0.10 145)",
  equity_em: "oklch(0.80 0.11 80)",
  thematic: "oklch(0.78 0.12 200)",
  green_bond: "oklch(0.82 0.09 160)",
  social_bond: "oklch(0.80 0.10 30)",
  sov_bond: "oklch(0.85 0.05 250)",
  reit: "oklch(0.80 0.10 50)",
  commodity: "oklch(0.82 0.08 90)",
  cash: "oklch(0.88 0.03 240)",
};

const colorFor = (cat: string) => CATEGORY_COLORS[cat] ?? "oklch(0.85 0.05 200)";

/**
 * Vue compacte : barre stack + top 3, "voir plus" pour le reste.
 */
export function GardenVisualization({
  plants,
  onPlantClick,
  onEmptySlotClick,
}: GardenVisualizationProps) {
  const { t } = useTranslation();
  const { lang } = useLang();
  onPlantClick,
  onEmptySlotClick,
}: GardenVisualizationProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(
    () => [...plants].sort((a, b) => b.allocationPct - a.allocationPct),
    [plants],
  );

  const top = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const visible = expanded ? sorted : top;

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[10px] uppercase tracking-[0.12em] text-ink-3 font-medium">
          {t("garden_viz:allocation_title", { count: plants.length })}
        </p>
        {rest.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[11px] text-ink-2 hover:text-ink underline-offset-2 hover:underline"
          >
            {expanded ? t("garden_viz:show_less") : t("garden_viz:show_all", { count: plants.length })}
          </button>
        )}
      </div>

      {/* Barre stack pastel */}
      <div className="flex w-full h-2 rounded-full overflow-hidden bg-paper-2 mb-3">
        {sorted.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ width: 0 }}
            animate={{ width: `${p.allocationPct}%` }}
            transition={{ delay: 0.1 + i * 0.03, duration: 0.5, ease: "easeOut" }}
            style={{ backgroundColor: colorFor(p.category) }}
            title={`${p.ticker} · ${p.allocationPct.toFixed(1)}%`}
          />
        ))}
      </div>

      <ul className="space-y-1">
        {visible.map((plant, i) => (
          <motion.li
            key={plant.id}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.25 }}
            onClick={() => onPlantClick?.(plant)}
            className="flex items-center gap-2.5 py-1.5 cursor-pointer group"
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: colorFor(plant.category) }}
            />
            <span className="font-value text-[12px] text-ink tracking-tight w-14 flex-shrink-0">
              {plant.ticker}
            </span>
            <span className="text-[11px] text-ink-3 truncate flex-1">{plant.name}</span>
            <span className="text-[12px] font-medium tabular-nums text-ink w-12 text-right flex-shrink-0">
              {formatPercent(plant.allocationPct / 100, lang, 1)}
            </span>
          </motion.li>
        ))}

        {!expanded && rest.length > 0 && (
          <li className="flex items-center gap-2.5 py-1.5 text-[11px] text-ink-3">
            <span className="w-2 h-2 rounded-full bg-paper-3 flex-shrink-0" />
            <span className="flex-1">
              {t("garden_viz:other_positions", { count: rest.length })}
            </span>
            <span className="tabular-nums w-12 text-right">
              {formatPercent(rest.reduce((s, p) => s + p.allocationPct, 0) / 100, lang, 1)}
            </span>
          </li>
        )}

        <li
          onClick={() => (onEmptySlotClick ? onEmptySlotClick() : navigate({ to: "/discover" }))}
          className="pt-2 mt-1 border-t border-paper-3 cursor-pointer text-ink-3 hover:text-ink transition-colors flex items-center justify-between"
        >
          <span className="text-[11px] tracking-tight">{t("garden_viz:add_position")}</span>
          <span className="text-[10px] uppercase tracking-[0.12em]">{t("garden_viz:explore")}</span>
        </li>
      </ul>
    </div>
  );
}
