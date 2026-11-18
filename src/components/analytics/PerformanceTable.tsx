import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatPercent } from "@/lib/format";
import type { PerformanceReport } from "@/lib/portfolio/performance";
import { cn } from "@/lib/utils";

/**
 * Les fenêtres 1 / 3 / 5 ans, en tableau. Une fenêtre que la série ne couvre
 * pas est écrite « non calculable », jamais raccourcie. Le signe est écrit
 * (+ / −) : la couleur ne fait que le doubler.
 */
export function PerformanceTable({
  report,
  showBenchmark = true,
}: {
  report: PerformanceReport;
  showBenchmark?: boolean;
}) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const pct = (v: number | null, signed = true) =>
    v === null ? "—" : `${signed && v > 0 ? "+" : ""}${formatPercent(v, lang, 1)}`;
  const hasBench =
    showBenchmark && report.windows.some((w) => w.benchmarkAnnualizedReturn !== null);

  const rows: {
    key: string;
    label: string;
    render: (w: PerformanceReport["windows"][number]) => string;
    tone?: boolean;
  }[] = [
    {
      key: "cum",
      label: t("fin.perf.cumulative"),
      render: (w) => pct(w.cumulativeReturn),
      tone: true,
    },
    {
      key: "ann",
      label: t("fin.perf.annualized"),
      render: (w) => pct(w.annualizedReturn),
      tone: true,
    },
    ...(hasBench
      ? [
          {
            key: "bench",
            label: t("fin.perf.benchmark_annualized"),
            render: (w: PerformanceReport["windows"][number]) => pct(w.benchmarkAnnualizedReturn),
          },
          {
            key: "excess",
            label: t("fin.perf.excess"),
            render: (w: PerformanceReport["windows"][number]) => pct(w.excessAnnualizedReturn),
            tone: true,
          },
        ]
      : []),
    {
      key: "vol",
      label: t("fin.perf.volatility"),
      render: (w) => pct(w.annualizedVolatility, false),
    },
    { key: "mdd", label: t("fin.perf.max_drawdown"), render: (w) => pct(w.maxDrawdown) },
  ];

  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate border-spacing-x-1 text-left">
        <caption className="sr-only">{t("fin.perf.table_caption")}</caption>
        <thead>
          <tr>
            <th scope="col" className="pb-2 text-caption font-semibold text-ink-3">
              {t("fin.perf.window")}
            </th>
            {report.windows.map((w) => (
              <th
                key={w.years}
                scope="col"
                className="pb-2 text-right text-label font-bold text-ink"
              >
                {t("fin.perf.years", { count: w.years })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th
                scope="row"
                className="border-t border-paper-3 py-2.5 pr-2 text-label font-medium text-ink-2"
              >
                {row.label}
              </th>
              {report.windows.map((w) => {
                const text = w.available ? row.render(w) : t("fin.perf.not_computable");
                const v =
                  row.key === "cum"
                    ? w.cumulativeReturn
                    : row.key === "ann"
                      ? w.annualizedReturn
                      : row.key === "excess"
                        ? w.excessAnnualizedReturn
                        : null;
                return (
                  <td
                    key={w.years}
                    className={cn(
                      "border-t border-paper-3 py-2.5 text-right font-value text-body-sm tabular-nums",
                      !w.available && "font-sans text-caption font-medium text-ink-3",
                      w.available && row.tone && v !== null && v < 0 && "text-alert-ink",
                      w.available && row.tone && v !== null && v > 0 && "text-mint-ink",
                    )}
                  >
                    {text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {report.frequency === "monthly" && (
        <p className="mt-3 px-1 text-caption text-ink-3">{t("fin.perf.monthly_note")}</p>
      )}
    </div>
  );
}
