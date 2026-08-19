import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatPercent } from "@/lib/format";
import { EASE_REVEAL } from "@/lib/motion";
import { ESGAlertBadge } from "@/components/portfolio/ESGAlertBadge";

export interface AllocationHolding {
  id: string;
  ticker: string;
  name: string;
  allocationPct: number;
  performancePct: number;
  esgScore: number;
  category: string;
  /** Score ESG précédent connu — sert à signaler une baisse significative.
   *  Optionnel : absent tant que l'historique ESG n'est pas en base. */
  previousEsgScore?: number | null;
}

interface AllocationListProps {
  holdings: AllocationHolding[];
  maxSlots?: number;
  onHoldingClick?: (holding: AllocationHolding) => void;
  onEmptySlotClick?: () => void;
}

/**
 * DA V2 : la barre d'allocation n'est plus une rangée de pastels — c'est une
 * réglure imprimée. Chaque classe d'actif a une densité d'encre, et une classe
 * sur deux est hachurée : la trame double la valeur, donc l'information ne
 * repose jamais sur la seule couleur (CLAUDE.md §4, DA V2 §4.5).
 */
const CATEGORY_INK: Record<string, { mix: number; hatch: boolean }> = {
  equity_dev: { mix: 100, hatch: false },
  equity_em: { mix: 82, hatch: true },
  thematic: { mix: 68, hatch: false },
  green_bond: { mix: 55, hatch: true },
  social_bond: { mix: 44, hatch: false },
  sov_bond: { mix: 34, hatch: true },
  reit: { mix: 26, hatch: false },
  commodity: { mix: 20, hatch: true },
  cash: { mix: 14, hatch: false },
};

const inkFor = (cat: string) => CATEGORY_INK[cat] ?? { mix: 48, hatch: false };
const colorFor = (cat: string) =>
  `color-mix(in srgb, var(--color-ink) ${inkFor(cat).mix}%, var(--color-paper))`;

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
      <div className="flex items-baseline justify-between mb-2.5">
        <p className="stamp">{t("allocation_list.allocation_title", { count: holdings.length })}</p>
        {rest.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="stamp text-ice-ink underline underline-offset-2 hover:no-underline"
          >
            {expanded
              ? t("allocation_list.show_less")
              : t("allocation_list.show_all", { count: holdings.length })}
          </button>
        )}
      </div>

      {/* Réglure d'allocation — densités d'encre + hachures, coins vifs. */}
      <div className="flex w-full h-[10px] overflow-hidden bg-paper-2 border-y border-paper-3 mb-3.5">
        {sorted.map((h, i) => (
          <motion.div
            key={h.id}
            initial={{ width: 0 }}
            animate={{ width: `${h.allocationPct}%` }}
            transition={{ delay: 0.1 + i * 0.03, duration: 0.5, ease: EASE_REVEAL }}
            style={{ backgroundColor: colorFor(h.category) }}
            title={`${h.ticker} · ${h.allocationPct.toFixed(1)}%`}
          >
            {inkFor(h.category).hatch && (
              <span
                aria-hidden
                className="hatch block h-full w-full text-paper"
                style={{ opacity: 0.85 }}
              />
            )}
          </motion.div>
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
              aria-hidden
              className="w-2.5 h-2.5 flex-shrink-0 border border-paper-3 overflow-hidden"
              style={{ backgroundColor: colorFor(holding.category) }}
            >
              {inkFor(holding.category).hatch && (
                <span className="hatch block h-full w-full text-paper" style={{ opacity: 0.85 }} />
              )}
            </span>
            {/* Nom lisible d'abord (le débutant ne connaît pas les tickers) ;
                le code technique devient une métadonnée mono. */}
            <span className="text-label font-medium text-ink truncate flex-1 inline-flex items-center gap-1.5 min-w-0">
              <span className="truncate">{holding.name}</span>
              <ESGAlertBadge
                assetName={holding.name}
                esgScore={holding.esgScore}
                previousEsgScore={holding.previousEsgScore}
              />
            </span>
            <span className="stamp flex-shrink-0">{holding.ticker}</span>
            <span className="font-value text-label text-ink w-14 text-right flex-shrink-0">
              {formatPercent(holding.allocationPct / 100, lang, 1)}
            </span>
          </motion.li>
        ))}

        {!expanded && rest.length > 0 && (
          <li className="flex items-center gap-2.5 py-1.5 text-body-sm text-ink-3">
            <span aria-hidden className="w-2.5 h-2.5 bg-paper-3 flex-shrink-0" />
            <span className="flex-1">
              {t("allocation_list.other_positions", { count: rest.length })}
            </span>
            <span className="font-value text-label w-14 text-right">
              {formatPercent(rest.reduce((s, p) => s + p.allocationPct, 0) / 100, lang, 1)}
            </span>
          </li>
        )}

        <li
          onClick={() => (onEmptySlotClick ? onEmptySlotClick() : navigate({ to: "/discover" }))}
          className="pt-2.5 mt-1.5 border-t border-ink cursor-pointer text-ink-3 hover:text-ink transition-colors flex items-center justify-between"
        >
          <span className="text-body-sm">{t("allocation_list.add_position")}</span>
          <span className="stamp">{t("allocation_list.explore")}</span>
        </li>
      </ul>
    </div>
  );
}
