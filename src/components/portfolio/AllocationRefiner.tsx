import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { simulateTradeoffs } from "@/lib/portfolio/tradeoffs.functions";
import {
  trackTradeoff,
  type TradeoffLever,
} from "@/lib/preferences/tracking";
import { cn } from "@/lib/utils";

interface Row {
  lever: string;
  leverLabel: string;
  altLabel: string;
  costBps: number;
  esgDelta: number;
  volDelta: number;
}

interface Baseline {
  expected_return: number;
  volatility: number;
  esg_score: number;
}

interface Props {
  portfolioId: string;
}

/**
 * Phase 1.2 — Écran "Affine ton allocation".
 *
 * Coût soft post-onboarding : on n'affiche le bps qu'ICI, après que le
 * portefeuille existe. L'utilisateur garde ou lève chaque contrainte ;
 * chaque clic est tracé via `trackTradeoff` (lever, costBps, accepted).
 */
export function AllocationRefiner({ portfolioId }: Props) {
  const simulate = useServerFn(simulateTradeoffs);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [decided, setDecided] = useState<Record<string, "accepted" | "rejected">>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    simulate({ data: { portfolioId } })
      .then((res) => {
        if (cancelled) return;
        setBaseline(res.baseline);
        setRows(res.rows);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Simulation indisponible.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [portfolioId, simulate]);

  const handleDecision = (row: Row, accepted: boolean) => {
    setDecided((prev) => ({ ...prev, [`${row.lever}|${row.altLabel}`]: accepted ? "accepted" : "rejected" }));
    void trackTradeoff({
      lever: row.lever as TradeoffLever,
      leverValue: row.altLabel,
      costBps: row.costBps,
      esgDelta: row.esgDelta,
      volDelta: row.volDelta,
      accepted,
      portfolioId,
      context: { source: "allocation_refiner" },
    });
  };

  if (loading) {
    return (
      <div className="border border-paper-3 rounded p-6 text-center">
        <p className="text-[12px] text-ink-3">Mesure du coût de tes arbitrages…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="border border-paper-3 rounded p-6">
        <p className="text-[12px] text-ink-3">{error}</p>
      </div>
    );
  }
  if (!baseline || rows.length === 0) {
    return (
      <div className="border border-paper-3 rounded p-6">
        <p className="text-[12px] text-ink-3">Aucun arbitrage notable détecté sur ce portefeuille.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">Phase préférence</p>
        <h2 className="text-lg font-semibold text-ink leading-tight">Affine ton allocation</h2>
        <p className="text-[12px] text-ink-2 leading-relaxed">
          Chaque contrainte que tu poses a un coût mesurable. Garde-la si elle compte plus que le rendement
          qu'elle te coûte, lève-la sinon. Tes choix nourrissent notre modèle.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3 border-y border-paper-3 py-3">
        <Figure label="Rendement attendu" value={`${(baseline.expected_return * 100).toFixed(2)} %`} />
        <Figure label="Volatilité" value={`${(baseline.volatility * 100).toFixed(2)} %`} />
        <Figure label="Score ESG" value={`${baseline.esg_score.toFixed(1)} / 100`} />
      </div>

      <ul className="space-y-3">
        {rows.map((row) => {
          const key = `${row.lever}|${row.altLabel}`;
          const decision = decided[key];
          const positive = row.costBps > 0;
          return (
            <li
              key={key}
              className={cn(
                "border border-paper-3 rounded p-4 space-y-3 transition-colors",
                decision === "accepted" && "border-gold/60 bg-gold/5",
                decision === "rejected" && "border-paper-3 bg-paper-2/50 opacity-80",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-3">
                    {row.leverLabel}
                  </p>
                  <p className="text-[13px] text-ink mt-1">vs {row.altLabel}</p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={cn(
                      "text-[15px] font-semibold tabular-nums",
                      positive ? "text-ink" : "text-ink-3",
                    )}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {positive ? "−" : "+"}
                    {Math.abs(row.costBps)} bps
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-ink-3 mt-0.5">
                    rendement annuel
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-3">
                <span>
                  ESG&nbsp;
                  <span className="text-ink">
                    {row.esgDelta >= 0 ? "+" : ""}
                    {row.esgDelta.toFixed(1)} pt
                  </span>
                </span>
                <span>
                  Volatilité&nbsp;
                  <span className="text-ink">
                    {row.volDelta >= 0 ? "+" : ""}
                    {row.volDelta.toFixed(2)} pt
                  </span>
                </span>
              </div>

              {!decision ? (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDecision(row, true)}
                    className="flex-1 h-9 px-3 rounded border border-ink bg-ink text-paper text-[11px] font-semibold uppercase tracking-[0.14em] hover:bg-ink/90 transition-colors"
                  >
                    Garder
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(row, false)}
                    className="flex-1 h-9 px-3 rounded border border-paper-3 text-ink text-[11px] font-semibold uppercase tracking-[0.14em] hover:bg-paper-2 transition-colors"
                  >
                    Lever
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-ink-3 italic">
                  {decision === "accepted"
                    ? "Conservé. Arbitrage accepté."
                    : "Marqué à lever. On t'aidera à recalculer."}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-3">{label}</p>
      <p className="text-[15px] font-semibold text-ink mt-1 tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </p>
    </div>
  );
}
