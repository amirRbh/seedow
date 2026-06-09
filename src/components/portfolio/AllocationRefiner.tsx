import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { simulateTradeoffs } from "@/lib/portfolio/tradeoffs.functions";
import {
  trackTradeoff,
  type TradeoffLever,
} from "@/lib/preferences/tracking";
import { cn } from "@/lib/utils";

interface Holding {
  id: string;
  ticker: string;
  name: string;
  asset_class: string;
  weight: number;
}

interface Snapshot {
  expected_return: number;
  volatility: number;
  esg_score: number;
  ter: number;
  by_class: Record<string, number>;
  top_holdings: Holding[];
}

interface Row {
  lever: string;
  leverLabel: string;
  altLabel: string;
  costBps: number;
  esgDelta: number;
  volDelta: number;
  alt: Snapshot;
}

interface Props {
  portfolioId: string;
}

const CLASS_LABELS: Record<string, string> = {
  equity_dev: "Actions développées",
  equity_em: "Actions émergentes",
  thematic: "Thématiques",
  green_bond: "Obligations vertes",
  social_bond: "Obligations sociales",
  sov_bond: "Obligations souveraines",
  reit: "Immobilier",
  commodity: "Matières premières",
  cash: "Liquidités",
};

export function AllocationRefiner({ portfolioId }: Props) {
  const simulate = useServerFn(simulateTradeoffs);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<Snapshot | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [decided, setDecided] = useState<Record<string, "accepted" | "rejected">>({});
  const [expanded, setExpanded] = useState<string | null>(null);

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
    setDecided((p) => ({ ...p, [`${row.lever}|${row.altLabel}`]: accepted ? "accepted" : "rejected" }));
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
          const isOpen = expanded === key;
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
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-3">
                    {row.leverLabel}
                  </p>
                  <p className="text-[13px] text-ink mt-1 truncate">vs {row.altLabel}</p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={cn(
                      "text-[15px] font-semibold tabular-nums",
                      row.costBps > 0 ? "text-rust" : "text-moss-2",
                    )}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {row.costBps > 0
                      ? `−${row.costBps} bps`
                      : row.costBps < 0
                        ? `+${Math.abs(row.costBps)} bps`
                        : "0 bps"}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-ink-3 mt-0.5">
                    {row.costBps > 0
                      ? "rendement annuel perdu"
                      : row.costBps < 0
                        ? "rendement annuel gagné"
                        : "impact neutre"}
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
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : key)}
                  className="ml-auto text-[10px] font-semibold uppercase tracking-[0.14em] text-gold hover:text-ink transition-colors"
                >
                  {isOpen ? "Masquer avant / après" : "Voir avant / après"}
                </button>
              </div>

              {isOpen && <BeforeAfter baseline={baseline} alt={row.alt} altLabel={row.altLabel} />}

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

function BeforeAfter({
  baseline,
  alt,
  altLabel,
}: {
  baseline: Snapshot;
  alt: Snapshot;
  altLabel: string;
}) {
  const metrics: Array<{ label: string; before: string; after: string; deltaLabel: string; positive: boolean | null }> = [
    metricRow("Rendement attendu", baseline.expected_return * 100, alt.expected_return * 100, "%", 2, true),
    metricRow("Volatilité", baseline.volatility * 100, alt.volatility * 100, "%", 2, false),
    metricRow("Score ESG", baseline.esg_score, alt.esg_score, "/100", 1, true),
    metricRow("Frais (TER)", baseline.ter * 100, alt.ter * 100, "%", 2, false),
  ];

  const classes = Array.from(
    new Set([...Object.keys(baseline.by_class), ...Object.keys(alt.by_class)]),
  )
    .map((k) => ({
      key: k,
      label: CLASS_LABELS[k] ?? k,
      before: baseline.by_class[k] ?? 0,
      after: alt.by_class[k] ?? 0,
    }))
    .filter((r) => r.before > 0.005 || r.after > 0.005)
    .sort((a, b) => Math.max(b.before, b.after) - Math.max(a.before, a.after));

  const baseTickers = new Set(baseline.top_holdings.map((h) => h.id));
  const altTickers = new Set(alt.top_holdings.map((h) => h.id));

  return (
    <div className="border-t border-paper-3 pt-4 mt-1 space-y-4">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-baseline">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-3">Avant — actuel</p>
        <span className="text-[10px] text-ink-3">vs</span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold text-right">Après — {altLabel}</p>
      </div>

      <table className="w-full text-[12px]">
        <tbody>
          {metrics.map((m) => (
            <tr key={m.label} className="border-b border-paper-3 last:border-0">
              <td className="py-1.5 text-ink-3 text-[11px]">{m.label}</td>
              <td className="py-1.5 text-right tabular-nums text-ink">{m.before}</td>
              <td className="py-1.5 text-center text-ink-3">→</td>
              <td className="py-1.5 text-right tabular-nums text-ink">{m.after}</td>
              <td
                className={cn(
                  "py-1.5 pl-3 text-right tabular-nums text-[11px] w-20",
                  m.positive === null
                    ? "text-ink-3"
                    : m.positive
                      ? "text-moss-2"
                      : "text-rust",
                )}
              >
                {m.deltaLabel}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-3 mb-2">
          Répartition par classe
        </p>
        <ul className="space-y-1.5">
          {classes.map((c) => (
            <li key={c.key} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center text-[11px]">
              <span className="text-ink truncate">{c.label}</span>
              <span className="tabular-nums text-ink-3">{(c.before * 100).toFixed(1)}%</span>
              <span className="tabular-nums text-gold w-12 text-right">
                → {(c.after * 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-3 mb-2">
            Top positions — avant
          </p>
          <ul className="space-y-1">
            {baseline.top_holdings.map((h) => (
              <li
                key={h.id}
                className={cn(
                  "flex justify-between gap-2 text-[11px]",
                  !altTickers.has(h.id) && "text-rust",
                )}
                title={h.name}
              >
                <span className="truncate">{h.ticker}</span>
                <span className="tabular-nums">{(h.weight * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold mb-2">
            Top positions — après
          </p>
          <ul className="space-y-1">
            {alt.top_holdings.map((h) => (
              <li
                key={h.id}
                className={cn(
                  "flex justify-between gap-2 text-[11px]",
                  !baseTickers.has(h.id) && "text-moss-2",
                )}
                title={h.name}
              >
                <span className="truncate">{h.ticker}</span>
                <span className="tabular-nums">{(h.weight * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-[10px] text-ink-3 leading-relaxed">
        <span className="text-rust">Rouge</span> = positions qui disparaîtraient.{" "}
        <span className="text-moss-2">Vert</span> = nouvelles positions introduites.
      </p>
    </div>
  );
}

function metricRow(
  label: string,
  before: number,
  after: number,
  unit: string,
  digits: number,
  higherIsBetter: boolean,
) {
  const delta = after - before;
  const fmt = (v: number) => `${v.toFixed(digits)} ${unit}`;
  const sign = delta >= 0 ? "+" : "";
  const positive =
    Math.abs(delta) < Math.pow(10, -digits) / 2
      ? null
      : higherIsBetter
        ? delta > 0
        : delta < 0;
  return {
    label,
    before: fmt(before),
    after: fmt(after),
    deltaLabel: `${sign}${delta.toFixed(digits)} ${unit}`,
    positive,
  };
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
