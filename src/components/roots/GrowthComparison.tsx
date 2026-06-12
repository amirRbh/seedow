import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { usePortfolioHistory } from "@/hooks/usePortfolioHistory";

interface GrowthComparisonProps {
  currentValue: number;
  invested: number;
  gain: number;
  returnPct: number;
  lastUpdated?: string | null;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
}

type Range = 30 | 90 | 365;



const eur = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function GrowthComparison({ currentValue, invested, gain, returnPct, lastUpdated, onRefresh, refreshing }: GrowthComparisonProps) {
  const { t } = useTranslation();
  const isGrowing = gain >= 0;
  const formatRelative = (iso: string | null | undefined): string => {
    if (!iso) return t("growth_comparison.no_data");
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "< 1 min";
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}j`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };
  const [range, setRange] = useState<Range>(90);
  const { points, loading: histLoading, hasHistory } = usePortfolioHistory(invested, range);
  const [localBusy, setLocalBusy] = useState(false);
  const busy = refreshing || localBusy;

  const handleRefresh = async () => {
    if (!onRefresh || busy) return;
    setLocalBusy(true);
    try {
      await onRefresh();
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <div className="paper-card p-5">
      {/* Header : gain principal */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">{t("growth_comparison.your_growth")}</p>
          <p className="font-value text-3xl text-ink mt-1">
            {isGrowing ? "+" : ""}
            {gain.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </p>
          <p className="text-[11px] text-ink-3 mt-0.5">{t("growth_comparison.since_first_deposit")}</p>
        </div>
        <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${isGrowing ? "bg-moss-5 text-moss-1" : "bg-[oklch(0.93_0.05_45)] text-rust"}`}>
          {isGrowing ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isGrowing ? "+" : ""}
          {returnPct.toFixed(1)} %
        </div>
      </div>

      {/* Mini-graph d'historique */}
      <div className="mt-4">
        <Sparkline points={points} invested={invested} isGrowing={isGrowing} loading={histLoading} hasHistory={hasHistory} t={t} />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1">
            {([30, 90, 365] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-full transition-colors ${
                  range === r ? "bg-ink text-paper" : "text-ink-3 hover:text-ink-2"
                }`}
              >
                {r === 30 ? "1M" : r === 90 ? "3M" : "1A"}
              </button>
            ))}
          </div>
          {hasHistory && points.length > 0 && (
            <p className="text-[10px] text-ink-3">
              {new Date(points[0].date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} → {t("growth_comparison.today")}
            </p>
          )}
        </div>
      </div>

      {/* Détails montants — libellés clairs */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <AmountTile
          label={t("growth_comparison.amount_invested")}
          hint={t("growth_comparison.what_deposited")}
          value={eur(invested)}
        />
        <AmountTile
          label={t("growth_comparison.current_value")}
          hint={t("growth_comparison.market_value")}
          value={eur(currentValue)}
          accent={isGrowing ? "moss" : "rust"}
        />
      </div>

      {(onRefresh || lastUpdated !== undefined) && (
        <div className="mt-4 pt-3 border-t border-paper-2 flex items-center justify-between gap-3">
          <p className="text-[11px] text-ink-3">
            <span className="text-ink-3">{t("growth_comparison.updated")}</span>
            <span className="font-medium text-ink-2">{formatRelative(lastUpdated)}</span>
          </p>
          {onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-2 hover:text-ink px-2.5 py-1 rounded-full border border-paper-3 hover:border-ink-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t("growth_comparison.aria_recalculate")}
            >
              <RefreshCw className={`w-3 h-3 ${busy ? "animate-spin" : ""}`} />
              {busy ? t("growth_comparison.updating") : t("growth_comparison.recalculate")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AmountTile({
  label,
  hint,
  value,
  accent,
}: {
  label: string;
  hint: string;
  value: string;
  accent?: "moss" | "rust";
}) {
  const accentClass =
    accent === "moss" ? "text-moss-1" : accent === "rust" ? "text-rust" : "text-ink";
  return (
    <div className="rounded-lg border border-paper-2 bg-paper-1/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">{label}</p>
      <p className={`font-value text-lg mt-1 ${accentClass}`}>{value}</p>
      <p className="text-[10px] text-ink-3 mt-0.5">{hint}</p>
    </div>
  );
}

function Sparkline({
  points,
  invested,
  isGrowing,
  loading,
  hasHistory,
  t,
}: {
  points: { date: string; value: number }[];
  invested: number;
  isGrowing: boolean;
  loading: boolean;
  hasHistory: boolean;
  t: (k: string) => string;
}) {
  const W = 320;
  const H = 64;
  const PAD = 2;

  const path = useMemo(() => {
    if (points.length < 2) return { line: "", area: "", baselineY: H / 2, lastX: 0, lastY: H / 2 };
    const values = points.map((p) => p.value);
    const min = Math.min(...values, invested);
    const max = Math.max(...values, invested);
    const span = max - min || 1;
    const xStep = (W - PAD * 2) / (points.length - 1);
    const yOf = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);
    const baselineY = yOf(invested);
    let line = "";
    points.forEach((p, i) => {
      const x = PAD + i * xStep;
      const y = yOf(p.value);
      line += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
    });
    const lastX = PAD + (points.length - 1) * xStep;
    const lastY = yOf(points[points.length - 1].value);
    const area = `${line} L${lastX.toFixed(1)},${H} L${PAD},${H} Z`;
    return { line, area, baselineY, lastX, lastY };
  }, [points, invested]);

  if (loading) {
    return (
      <div className="h-16 rounded-md bg-paper-2/50 animate-pulse" aria-hidden />
    );
  }
  if (!hasHistory) {
    return (
      <div className="h-16 rounded-md border border-dashed border-paper-3 flex items-center justify-center">
        <p className="text-[11px] text-ink-3">{t("growth_comparison.building_history")}</p>
      </div>
    );
  }

  const stroke = isGrowing ? "var(--moss-1, oklch(0.55 0.12 150))" : "var(--rust, oklch(0.55 0.15 30))";
  const fill = isGrowing ? "oklch(0.55 0.12 150 / 0.12)" : "oklch(0.55 0.15 30 / 0.12)";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none" role="img" aria-label={t("growth_comparison.chart_aria")}>
      {/* baseline = montant investi */}
      <line
        x1={0}
        x2={W}
        y1={path.baselineY}
        y2={path.baselineY}
        stroke="currentColor"
        strokeDasharray="2 3"
        strokeWidth={0.5}
        className="text-ink-3/50"
      />
      <motion.path
        d={path.area}
        fill={fill}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      />
      <motion.path
        d={path.line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      />
      <circle cx={path.lastX} cy={path.lastY} r={2.5} fill={stroke} />
    </svg>
  );
}
