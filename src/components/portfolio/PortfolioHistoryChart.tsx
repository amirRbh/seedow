import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";
import { useLang } from "@/hooks/useLang";
import { formatCurrency, formatDate } from "@/lib/format";
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

export function PortfolioHistoryChart() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const fetchHistory = useServerFn(getPortfolioHistory);
  const { activeId } = useUserPortfolios();
  const [range, setRange] = useState<Range>("3M");
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const RANGES: { id: Range; label: string }[] = [
    { id: "1W", label: t("portfolio.history_chart.range_1w") },
    { id: "1M", label: t("portfolio.history_chart.range_1m") },
    { id: "3M", label: t("portfolio.history_chart.range_3m") },
    { id: "1Y", label: t("portfolio.history_chart.range_1y") },
    { id: "ALL", label: t("portfolio.history_chart.range_all") },
  ];

  const fmtEur = (n: number) => formatCurrency(n, lang);
  const fmtDate = (iso: string) => formatDate(iso, lang, { day: "2-digit", month: "short" });

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
        setError(e instanceof Error ? e.message : t("portfolio.history_chart.load_error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, fetchHistory, activeId, t]);

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

  const stroke = isUp ? "var(--highlight-1)" : "var(--bloom)";

  return (
    <div className="paper-card p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p className="text-tag uppercase tracking-wider text-ink-3 font-semibold">
            {t("portfolio.history_chart.title")}
          </p>
          <p className="font-value text-2xl text-ink mt-0.5">{fmtEur(last)}</p>
          {points.length > 0 && (
            <p
              className={`text-label font-semibold tabular-nums mt-0.5 ${
                isUp ? "text-highlight-1" : "text-bloom"
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
              className={`text-caption font-medium px-2.5 py-1 rounded-full transition-colors ${
                range === r.id ? "bg-paper text-ink shadow-sm" : "text-ink-3 hover:text-ink-2"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-44 -mx-2">
        {loading ? (
          <div className="h-full flex items-center justify-center text-caption text-ink-3">
            {t("portfolio.history_chart.loading")}
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-caption text-rust">
            {error}
          </div>
        ) : points.length < 2 ? (
          <div className="h-full flex items-center justify-center text-caption text-ink-3 text-center px-4">
            {t("portfolio.history_chart.empty_title")}
            <br />
            {t("portfolio.history_chart.empty_desc")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
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
              <YAxis domain={[minY, maxY]} hide />
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
                  formatDate(d, lang, {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                }
                formatter={(v: number, name) => [
                  fmtEur(v),
                  name === "value"
                    ? t("portfolio.history_chart.value")
                    : t("portfolio.history_chart.invested_tooltip"),
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
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-paper-3 text-tag text-ink-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 inline-block" style={{ backgroundColor: stroke }} />
            {t("portfolio.history_chart.value")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-px inline-block border-t border-dashed border-ink-3" />
            {t("portfolio.history_chart.invested_legend")}
          </span>
          <span className="ml-auto">
            {fmtDate(points[0].date)} → {fmtDate(points[points.length - 1].date)}
          </span>
        </div>
      )}
    </div>
  );
}
