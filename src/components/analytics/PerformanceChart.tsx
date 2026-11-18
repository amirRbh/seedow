import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_AXIS } from "@/components/ui/chart-theme";
import { useLang } from "@/hooks/useLang";
import { formatDate } from "@/lib/format";
import type { SeriesPoint } from "@/lib/portfolio/performance";

/**
 * Deux courbes rebasées à 100 le même jour : la série étudiée et sa
 * référence (indice). Aucune grille ; l'axe des dates reste discret. Les
 * valeurs sont lisibles au survol ET reprises dans le tableau de performance
 * à côté — le graphique n'est jamais la seule source d'un chiffre.
 */
export function PerformanceChart({
  series,
  reference,
  seriesLabel,
  referenceLabel,
  ariaLabel,
}: {
  series: SeriesPoint[];
  reference?: SeriesPoint[];
  seriesLabel: string;
  referenceLabel?: string;
  ariaLabel: string;
}) {
  const { lang } = useLang();
  const { t } = useTranslation();
  const data = useMemo(() => {
    const ref = new Map((reference ?? []).map((p) => [p.date, p.value]));
    return series.map((p) => ({ date: p.date, a: p.value, b: ref.get(p.date) ?? null }));
  }, [series, reference]);
  // Une graduation par année : le premier point de chaque année civile.
  const yearTicks = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of series) {
      const y = p.date.slice(0, 4);
      if (!seen.has(y)) {
        seen.add(y);
        out.push(p.date);
      }
    }
    return out.slice(1);
  }, [series]);

  if (series.length < 2) {
    return <p className="text-body-sm text-ink-3">{t("fin.perf.no_history")}</p>;
  }

  return (
    <figure aria-label={ariaLabel} className="w-full">
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="date"
              {...CHART_AXIS}
              ticks={yearTicks}
              interval={0}
              tickFormatter={(d: string) => d.slice(0, 4)}
            />
            <YAxis {...CHART_AXIS} width={36} domain={["auto", "auto"]} tickFormatter={(v: number) => v.toFixed(0)} />
            <Tooltip
              cursor={{ stroke: "var(--color-ink-3)", strokeDasharray: "3 3" }}
              contentStyle={{
                borderRadius: 14,
                border: "none",
                background: "var(--color-paper)",
                boxShadow: "var(--shadow-soft)",
                fontSize: 13,
              }}
              labelFormatter={(d: string) => formatDate(d, lang, { day: "numeric", month: "short", year: "numeric" })}
              formatter={(value: number, key: string) => [
                value.toFixed(1),
                key === "a" ? seriesLabel : (referenceLabel ?? ""),
              ]}
            />
            {reference && reference.length > 1 && (
              <Line
                type="monotone"
                dataKey="b"
                stroke="var(--color-ink-3)"
                strokeWidth={1.6}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}
            <Line
              type="monotone"
              dataKey="a"
              stroke="var(--color-mint)"
              strokeWidth={2.4}
              strokeLinecap="round"
              dot={false}
              animationDuration={900}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-caption text-ink-2">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-[3px] w-5 rounded-full bg-mint" />
          {seriesLabel}
        </span>
        {reference && reference.length > 1 && referenceLabel && (
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="h-0 w-5 border-t-2 border-dashed border-ink-3" />
            {referenceLabel}
          </span>
        )}
        <span className="text-ink-3">{t("fin.perf.rebased")}</span>
      </figcaption>
    </figure>
  );
}
