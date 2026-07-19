import type { ActivePortfolioMetrics } from "@/hooks/useActivePortfolio";
import { useTranslation } from "react-i18next";
import { useViewMode } from "@/hooks/useViewMode";
import { useLang } from "@/hooks/useLang";
import { formatNumber, formatPercent } from "@/lib/format";
import { MetricLabel } from "@/components/ui/MetricLabel";

interface Props {
  metrics: ActivePortfolioMetrics | null;
}

type Tone = "highlight" | "ink" | "bloom" | "peach" | "sky";

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
  const { lang } = useLang();
  if (!metrics) return null;

  const items: Item[] = [
    {
      label: t("portfolio_metrics.expected_perf"),
      hint: t("portfolio_metrics.expected_perf_hint"),
      value: formatPercent(metrics.expected_return, lang, 1),
      sub: t("portfolio_metrics.per_year"),
      tone: "highlight",
    },
    {
      label: t("portfolio_metrics.impact_score"),
      hint: t("portfolio_metrics.impact_score_hint"),
      value: formatNumber(metrics.esg_score, lang, { maximumFractionDigits: 0 }),
      sub: t("portfolio_metrics.out_of_100"),
      tone: "bloom",
    },
    {
      label: t("portfolio_metrics.co2_avoided"),
      hint: t("portfolio_metrics.co2_hint"),
      value: `${formatNumber(metrics.co2_avoided_tons, lang, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}t`,
      sub: t("portfolio_metrics.per_10k"),
      tone: "highlight",
    },
    {
      label: t("portfolio_metrics.possible_variations"),
      hint: t("portfolio_metrics.volatility_hint"),
      value: formatPercent(metrics.volatility, lang, 1),
      sub: t("portfolio_metrics.per_year"),
      tone: "peach",
      expertOnly: true,
    },
    {
      label: t("portfolio_metrics.return_quality"),
      hint: t("portfolio_metrics.sharpe_hint"),
      value: formatNumber(metrics.sharpe, lang, { maximumFractionDigits: 2, minimumFractionDigits: 2 }),
      sub: t("portfolio_metrics.sharpe"),
      tone: "sky",
      expertOnly: true,
    },
    {
      label: t("portfolio_metrics.annual_fees"),
      hint: t("portfolio_metrics.ter_hint"),
      value: formatPercent(metrics.ter, lang, 2),
      sub: t("portfolio_metrics.per_year"),
      tone: "ink",
      expertOnly: true,
    },
  ];

  const visible = isSimple ? items.filter((i) => !i.expertOnly) : items;

  const toneClasses: Record<Tone, { text: string; bg: string; border: string }> = {
    highlight: { text: "text-highlight-1", bg: "bg-highlight-5", border: "border-highlight-4" },
    bloom: {
      text: "text-bloom",
      bg: "bg-bloom-tint",
      border: "border-bloom-tint-border",
    },
    peach: {
      text: "text-rust",
      bg: "bg-alert-tint",
      border: "border-alert-tint-border",
    },
    sky: {
      text: "text-sky",
      bg: "bg-sky-tint",
      border: "border-sky-tint-border",
    },
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
            <div className="text-tag uppercase tracking-wider text-ink-3 font-semibold leading-tight">
              <MetricLabel label={it.label} hint={it.hint} />
            </div>
            <p className={`font-value text-2xl mt-2 leading-none ${c.text}`}>{it.value}</p>
            <p className="text-tag text-ink-3 mt-1.5">{it.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
