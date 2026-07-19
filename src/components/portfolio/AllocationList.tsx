import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatPercent } from "@/lib/format";

export interface AllocationHolding {
  id: string;
  ticker: string;
  name: string;
  allocationPct: number;
  performancePct: number;
  esgScore: number;
  category: string;
}

interface AllocationListProps {
  holdings: AllocationHolding[];
  maxSlots?: number;
  onHoldingClick?: (holding: AllocationHolding) => void;
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
export function AllocationList({
  holdings,
  onHoldingClick,
  onEmptySlotClick,
}: AllocationListProps) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(
    () => [...holdings].sort((a, b) => b.allocationPct - a.allocationPct),
    [holdings],
  );

  const top = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const visible = expanded ? sorted : top;

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-tag uppercase tracking-[0.12em] text-ink-3 font-medium">
          {t("allocation_list.allocation_title", { count: holdings.length })}
        </p>
        {rest.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-caption text-ink-2 hover:text-ink underline-offset-2 hover:underline"
          >
            {expanded
              ? t("allocation_list.show_less")
              : t("allocation_list.show_all", { count: holdings.length })}
          </button>
        )}
      </div>

      {/* Barre stack pastel */}
      <div className="flex w-full h-2 rounded-full overflow-hidden bg-paper-2 mb-3">
        {sorted.map((h, i) => (
          <motion.div
            key={h.id}
            initial={{ width: 0 }}
            animate={{ width: `${h.allocationPct}%` }}
            transition={{ delay: 0.1 + i * 0.03, duration: 0.5, ease: "easeOut" }}
            style={{ backgroundColor: colorFor(h.category) }}
            title={`${h.ticker} · ${h.allocationPct.toFixed(1)}%`}
          />
        ))}
      </div>

      <ul className="space-y-1">
        {visible.map((holding, i) => (
          <motion.li
            key={holding.id}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.25 }}
            onClick={() => onHoldingClick?.(holding)}
            className="flex items-center gap-2.5 py-1.5 cursor-pointer group"
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: colorFor(holding.category) }}
            />
            <span className="font-value text-label text-ink tracking-tight w-14 flex-shrink-0">
              {holding.ticker}
            </span>
            <span className="text-caption text-ink-3 truncate flex-1">{holding.name}</span>
            <span className="text-label font-medium tabular-nums text-ink w-12 text-right flex-shrink-0">
              {formatPercent(holding.allocationPct / 100, lang, 1)}
            </span>
          </motion.li>
        ))}

        {!expanded && rest.length > 0 && (
          <li className="flex items-center gap-2.5 py-1.5 text-caption text-ink-3">
            <span className="w-2 h-2 rounded-full bg-paper-3 flex-shrink-0" />
            <span className="flex-1">
              {t("allocation_list.other_positions", { count: rest.length })}
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
          <span className="text-caption tracking-tight">{t("allocation_list.add_position")}</span>
          <span className="text-tag uppercase tracking-[0.12em]">
            {t("allocation_list.explore")}
          </span>
        </li>
      </ul>
    </div>
  );
}
