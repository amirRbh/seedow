import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getPortfolioHistory, type HistoryPoint } from "@/lib/portfolio/history.functions";

type Range = "1W" | "1M" | "3M" | "1Y" | "ALL";

const RANGES: { id: Range; label: string }[] = [
  { id: "1W", label: "1S" },
  { id: "1M", label: "1M" },
  { id: "3M", label: "3M" },
  { id: "1Y", label: "1A" },
  { id: "ALL", label: "Tout" },
];

const fmtEur = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

export function PortfolioHistoryChart() {
  const fetchHistory = useServerFn(getPortfolioHistory);
  const { activeId } = useUserPortfolios();
  const [range, setRange] = useState<Range>("3M");
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchHistory({ data: { range, portfolioId: activeId ?? undefined } })
      .then((res) => {
        if (cancelled) return;
        setPoints(res.points);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, fetchHistory, activeId]);

  const { first, last, deltaPct, deltaAbs, isUp, minY, maxY } = useMemo(() => {
    if (points.length === 0) {
      return {
        first: 0,
        last: 0,
        deltaPct: 0,
        deltaAbs: 0,
        isUp: true,
        minY: 0,
        maxY: 1,
      };
    }
    const f = points[0].value;
    const l = points[points.length - 1].value;
    const values = points.map((p) => p.value);
    const invested = points.map((p) => p.invested);
    const lo = Math.min(...values, ...invested);
    const hi = Math.max(...values, ...invested);
    const pad = (hi - lo) * 0.08 || 1;
    return {
      first: f,
      last: l,
      deltaAbs: l - f,
      deltaPct: f > 0 ? ((l - f) / f) * 100 : 0,
      isUp: l >= f,
      minY: lo - pad,
      maxY: hi + pad,
    };
  }, [points]);

  const stroke = isUp ? "var(--moss-1)" : "var(--bloom)";

  return (
    <div className="paper-card p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">
            Évolution
          </p>
          <p className="font-value text-2xl text-ink mt-0.5">
            {fmtEur(last)}
          </p>
          {points.length > 0 && (
            <p
              className={`text-[12px] font-semibold tabular-nums mt-0.5 ${
                isUp ? "text-moss-1" : "text-bloom"
              }`}
            >
              {isUp ? "+" : ""}
              {fmtEur(deltaAbs)} ({isUp ? "+" : ""}
              {deltaPct.toFixed(2)}%)
            </p>
          )}
        </div>
        <div className="flex gap-1 bg-paper-2 rounded-full p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                range === r.id
                  ? "bg-paper text-ink shadow-sm"
                  : "text-ink-3 hover:text-ink-2"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-44 -mx-2">
        {loading ? (
          <div className="h-full flex items-center justify-center text-[11px] text-ink-3">
            Chargement…
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-[11px] text-rust">
            {error}
          </div>
        ) : points.length < 2 ? (
          <div className="h-full flex items-center justify-center text-[11px] text-ink-3 text-center px-4">
            Pas encore assez de données historiques pour tracer une courbe.
            <br />
            La courbe apparaîtra dès que plusieurs jours de cotations seront disponibles.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={points}
              margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="phc-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--paper-3)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                tick={{ fontSize: 10, fill: "var(--ink-3)" }}
                axisLine={false}
                tickLine={false}
                minTickGap={32}
              />
              <YAxis
                domain={[minY, maxY]}
                hide
              />
              <Tooltip
                contentStyle={{
                  background: "var(--ink)",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 11,
                  padding: "8px 10px",
                }}
                labelStyle={{ color: "var(--paper-2)", marginBottom: 4 }}
                itemStyle={{ color: "var(--paper)" }}
                labelFormatter={(d: string) =>
                  new Date(d).toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                }
                formatter={(v: number, name) => [
                  fmtEur(v),
                  name === "value" ? "Valeur" : "Investi",
                ]}
              />
              <Line
                type="monotone"
                dataKey="invested"
                stroke="var(--ink-3)"
                strokeDasharray="3 3"
                strokeWidth={1}
                dot={false}
                activeDot={false}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={stroke}
                strokeWidth={2}
                fill="url(#phc-fill)"
                dot={false}
                activeDot={{ r: 3, fill: stroke }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {points.length >= 2 && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-paper-3 text-[10px] text-ink-3">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-0.5 inline-block"
              style={{ backgroundColor: stroke }}
            />
            Valeur
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-px inline-block border-t border-dashed border-ink-3" />
            Capital investi
          </span>
          <span className="ml-auto">
            {fmtDate(points[0].date)} → {fmtDate(points[points.length - 1].date)}
          </span>
        </div>
      )}
    </div>
  );
}
