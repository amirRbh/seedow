import type { ActivePortfolioMetrics } from "@/hooks/useActivePortfolio";
import { useTranslation } from "react-i18next";
import { useViewMode } from "@/hooks/useViewMode";
import { MetricLabel } from "@/components/ui/MetricLabel";

interface Props {
  metrics: ActivePortfolioMetrics | null;
}

type Tone = "moss" | "ink" | "bloom" | "peach" | "sky";

interface Item {
  label: string;
  hint: string;
  value: string;
  sub: string;
  tone: Tone;
  expertOnly?: boolean;
}

export function PortfolioMetricsCard({ metrics }: Props) {
  const { t } = useTranslation();
  const { isSimple } = useViewMode();
  if (!metrics) return null;

  const items: Item[] = [
    {
      label: t("portfolio_metrics.expected_perf"),
      hint: t("portfolio_metrics.expected_perf_hint"),
      value: `${(metrics.expected_return * 100).toFixed(1)}%`,
      sub: t("portfolio_metrics.per_year"),
      tone: "moss",
    },
    {
      label: t("portfolio_metrics.impact_score"),
      hint: t("portfolio_metrics.impact_score_hint"),
      value: `${metrics.esg_score.toFixed(0)}`,
      sub: t("portfolio_metrics.out_of_100"),
      tone: "bloom",
    },
    {
      label: t("portfolio_metrics.co2_avoided"),
      hint: t("portfolio_metrics.co2_hint"),
      value: `${metrics.co2_avoided_tons.toFixed(2)}t`,
      sub: t("portfolio_metrics.per_10k"),
      tone: "moss",
    },
    {
      label: t("portfolio_metrics.possible_variations"),
      hint: t("portfolio_metrics.volatility_hint"),
      value: `${(metrics.volatility * 100).toFixed(1)}%`,
      sub: t("portfolio_metrics.per_year"),
      tone: "peach",
      expertOnly: true,
    },
    {
      label: t("portfolio_metrics.return_quality"),
      hint: t("portfolio_metrics.sharpe_hint"),
      value: metrics.sharpe.toFixed(2),
      sub: t("portfolio_metrics.sharpe"),
      tone: "sky",
      expertOnly: true,
    },
    {
      label: t("portfolio_metrics.annual_fees"),
      hint: t("portfolio_metrics.ter_hint"),
      value: `${(metrics.ter * 100).toFixed(2)}%`,
      sub: t("portfolio_metrics.per_year"),
      tone: "ink",
      expertOnly: true,
    },
  ];

  const visible = isSimple ? items.filter((i) => !i.expertOnly) : items;

  const toneClasses: Record<Tone, { text: string; bg: string; border: string }> = {
    moss: { text: "text-moss-1", bg: "bg-moss-5", border: "border-moss-4" },
    bloom: { text: "text-bloom", bg: "bg-[oklch(0.96_0.04_310)]", border: "border-[oklch(0.88_0.07_310)]" },
    peach: { text: "text-rust", bg: "bg-[oklch(0.96_0.04_45)]", border: "border-[oklch(0.88_0.07_45)]" },
    sky: { text: "text-sky", bg: "bg-[oklch(0.96_0.03_230)]", border: "border-[oklch(0.88_0.06_230)]" },
    ink: { text: "text-ink", bg: "bg-paper-2", border: "border-paper-3" },
  };

  return (
    <div className={`grid gap-2.5 ${isSimple ? "grid-cols-3" : "grid-cols-3"}`}>
      {visible.map((it) => {
        const c = toneClasses[it.tone];
        return (
          <div
            key={it.label}
            className={`rounded-xl p-3 border ${c.bg} ${c.border} relative overflow-visible`}
          >
            <div className="text-[9px] uppercase tracking-wider text-ink-3 font-semibold leading-tight">
              <MetricLabel label={it.label} hint={it.hint} />
            </div>
            <p className={`font-value text-2xl mt-2 leading-none ${c.text}`}>{it.value}</p>
            <p className="text-[10px] text-ink-3 mt-1.5">{it.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
