import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";
import { useLang } from "@/hooks/useLang";
import { formatCurrency, formatDate } from "@/lib/format";
import { Area, AreaChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getPortfolioHistory, type HistoryPoint } from "@/lib/portfolio/history.functions";
import {
  AREA_DOWN,
  AREA_UP,
  CHART_AXIS,
  CHART_LINE,
  CHART_REFERENCE,
  CHART_TOOLTIP_STYLE,
  ChartAreaDefs,
} from "@/components/ui/chart-theme";
import { Provenance } from "@/components/ui/Provenance";

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

  const { first, last, deltaPct, deltaAbs, isUp, minY, maxY, investedNow } = useMemo(() => {
    if (points.length === 0) {
      return {
        first: 0,
        last: 0,
        deltaPct: 0,
        deltaAbs: 0,
        isUp: true,
        minY: 0,
        maxY: 1,
        investedNow: 0,
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
      investedNow: points[points.length - 1].invested,
    };
  }, [points]);

  // Lecture en clair : la valeur d'aujourd'hui (aire colorée) vs les dépôts
  // (ligne pointillée) — le "so what" du graphe pour un débutant.
  const gainVsDeposit = last - investedNow;
  const plainReadingKey =
    Math.abs(gainVsDeposit) < 0.005
      ? "portfolio.history_chart.plain_reading_flat"
      : gainVsDeposit > 0
        ? "portfolio.history_chart.plain_reading_up"
        : "portfolio.history_chart.plain_reading_down";

  // Encre pour la hausse, vermillon pour la baisse : le signe est aussi
  // écrit (+/−), la couleur ne porte jamais seule l'information.
  const stroke = isUp ? "var(--color-mint)" : "var(--color-alert)";
  const area = isUp ? AREA_UP : AREA_DOWN;

  return (
    <div className="paper-card p-6">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <p className="stamp">{t("portfolio.history_chart.title")}</p>
          <p className="font-value text-[32px] leading-none text-ink mt-2">{fmtEur(last)}</p>
          {points.length > 0 && (
            <p className={`chip mt-3 ${isUp ? "chip--up" : "chip--down"}`}>
              {isUp ? "+" : ""}
              {fmtEur(deltaAbs)} ({isUp ? "+" : ""}
              {deltaPct.toFixed(2)}%)
            </p>
          )}
        </div>
        <div className="segmented">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              aria-pressed={range === r.id}
              data-active={range === r.id}
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
              <ChartAreaDefs />
              <XAxis dataKey="date" tickFormatter={fmtDate} minTickGap={48} {...CHART_AXIS} />
              <YAxis domain={[minY, maxY]} hide />
              <Tooltip
                cursor={{ stroke: "var(--color-ink-3)", strokeWidth: 1, strokeDasharray: "2 3" }}
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={{ color: "var(--color-ink-3)", marginBottom: 4 }}
                itemStyle={{ color: "var(--color-ink)" }}
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
              <Line type="monotone" dataKey="invested" {...CHART_REFERENCE} activeDot={false} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={stroke}
                fill={`url(#${area})`}
                {...CHART_LINE}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {points.length >= 2 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 stamp">
          <span className="flex items-center gap-2">
            <span
              className="w-3.5 h-[2.5px] rounded-full inline-block"
              style={{ backgroundColor: stroke }}
            />
            {t("portfolio.history_chart.value")}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3.5 inline-block border-t-2 border-dashed border-ink-3" />
            {t("portfolio.history_chart.invested_legend")}
          </span>
        </div>
      )}

      {points.length >= 2 && (
        <>
          <p className="text-body-sm text-ink-2 leading-relaxed mt-3">
            {t(plainReadingKey, {
              invested: fmtEur(investedNow),
              value: fmtEur(last),
              gain: fmtEur(Math.abs(gainVsDeposit)),
            })}
          </p>
          {/* Aucun graphique sans sa provenance (DA V2 §4.5). */}
          <Provenance
            className="mt-3"
            status="verified"
            source="Yahoo Finance"
            asOf={points[points.length - 1].date}
            note={`${fmtDate(points[0].date)} → ${fmtDate(points[points.length - 1].date)}`}
          />
        </>
      )}
    </div>
  );
}
