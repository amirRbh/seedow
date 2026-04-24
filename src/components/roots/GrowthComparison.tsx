import { motion } from "framer-motion";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

interface GrowthComparisonProps {
  currentValue: number;
  invested: number;
  gain: number;
  returnPct: number;
  lastUpdated?: string | null;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "Aucune donnée de marché";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `il y a ${days} j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function GrowthComparison({ currentValue, invested, gain, returnPct, lastUpdated, onRefresh, refreshing }: GrowthComparisonProps) {
  const isGrowing = gain >= 0;
  const max = Math.max(currentValue, invested, 1);
  const investedPct = (invested / max) * 100;
  const valuePct = (currentValue / max) * 100;
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Ta croissance</p>
          <p className="font-value text-3xl text-ink mt-1">
            {isGrowing ? "+" : ""}
            {gain.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </p>
        </div>
        <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${isGrowing ? "bg-moss-5 text-moss-1" : "bg-[oklch(0.93_0.05_45)] text-rust"}`}>
          {isGrowing ? "+" : ""}
          {returnPct.toFixed(1)} %
        </div>
      </div>

      <div className="mt-5 space-y-3.5">
        <BarRow label="Graines plantées" value={invested.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 })} pct={investedPct} color="bg-paper-3" delay={0} />
        <BarRow label="Valeur cultivée" value={currentValue.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 })} pct={valuePct} color={isGrowing ? "bg-moss-1" : "bg-rust"} delay={0.15} />
      </div>

      {(onRefresh || lastUpdated !== undefined) && (
        <div className="mt-4 pt-3 border-t border-paper-2 flex items-center justify-between gap-3">
          <p className="text-[11px] text-ink-3">
            <span className="text-ink-3">Mis à jour </span>
            <span className="font-medium text-ink-2">{formatRelative(lastUpdated)}</span>
          </p>
          {onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-2 hover:text-ink px-2.5 py-1 rounded-full border border-paper-3 hover:border-ink-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Recalculer la croissance"
            >
              <RefreshCw className={`w-3 h-3 ${busy ? "animate-spin" : ""}`} />
              {busy ? "Mise à jour…" : "Recalculer"}
            </button>
          )}
        </div>
      )}
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
