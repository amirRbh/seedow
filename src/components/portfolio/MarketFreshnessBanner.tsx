import { useMemo, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { triggerMarketRefresh } from "@/lib/market/refresh.functions";

interface Props {
  latestQuoteAt: string | null;
  hasQuotes: boolean;
  onRefreshed?: () => void;
}

/**
 * Détecte la fraîcheur des prix.
 * - fresh : < 36h (cron quotidien, week-end laissé tranquille)
 * - stale : 36h–5j
 * - critical : > 5j ou pas de quote
 */
function computeStaleness(latestQuoteAt: string | null, hasQuotes: boolean) {
  if (!hasQuotes || !latestQuoteAt) return "critical" as const;
  const ageMs = Date.now() - new Date(latestQuoteAt).getTime();
  const hours = ageMs / (1000 * 60 * 60);
  // Skip weekends: if we're Monday morning, last quote on Friday is fine
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon
  const weekendBuffer = day === 1 || day === 0 ? 48 : 0;
  if (hours <= 36 + weekendBuffer) return "fresh" as const;
  if (hours <= 120) return "stale" as const;
  return "critical" as const;
}

export function MarketFreshnessBanner({ latestQuoteAt, hasQuotes, onRefreshed }: Props) {
  const refresh = useServerFn(triggerMarketRefresh);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const staleness = useMemo(
    () => computeStaleness(latestQuoteAt, hasQuotes),
    [latestQuoteAt, hasQuotes],
  );

  if (staleness === "fresh") return null;

  const isCritical = staleness === "critical";
  const tone = isCritical
    ? "border-rust/40 bg-[oklch(0.97_0.02_45)] text-rust"
    : "border-paper-3 bg-paper-2 text-ink-2";

  const ageLabel = latestQuoteAt
    ? new Date(latestQuoteAt).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "jamais";

  const onClick = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await refresh();
      setMsg(`${res.ok} actif(s) mis à jour.`);
      onRefreshed?.();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erreur de rafraîchissement");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`mx-5 mt-3 rounded-lg border ${tone} p-3 flex items-start gap-2.5`}>
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium">
          {isCritical ? "Prix de marché obsolètes" : "Prix de marché un peu anciens"}
        </p>
        <p className="text-[11px] opacity-80 mt-0.5">
          Dernière mise à jour&nbsp;: {ageLabel}
          {msg && ` · ${msg}`}
        </p>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="text-[11px] font-medium px-2.5 py-1 rounded border border-current/30 hover:bg-current/5 transition-colors flex items-center gap-1 disabled:opacity-50 flex-shrink-0"
      >
        <RefreshCw className={`w-3 h-3 ${busy ? "animate-spin" : ""}`} />
        Rafraîchir
      </button>
    </div>
  );
}
