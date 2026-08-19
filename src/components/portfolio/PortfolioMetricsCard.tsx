import type { ActivePortfolioMetrics } from "@/hooks/useActivePortfolio";
import { useTranslation } from "react-i18next";
import { useViewMode } from "@/hooks/useViewMode";
import { useLang } from "@/hooks/useLang";
import { motion } from "framer-motion";
import { formatNumber, formatPercent } from "@/lib/format";
import { buildPortfolioImpact } from "@/lib/impact/portfolioImpact";
import { MetricLabel } from "@/components/ui/MetricLabel";
import { SourceLink } from "@/components/discover/TransparencyBadges";
import { Link } from "@tanstack/react-router";
import { DURATION, EASE_REVEAL } from "@/lib/motion";

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
  anchor?: string;
}

export function PortfolioMetricsCard({ metrics }: Props) {
  const { t } = useTranslation();
  const { isSimple } = useViewMode();
  const { lang } = useLang();
  if (!metrics) return null;

  // Intensité carbone RÉELLE vs indice (WACI émetteurs), indépendante du montant.
  // On ne fabrique plus de « CO₂ évité » dérivé du score ESG (méthodo §0/§6) :
  // soit on a une donnée réelle avec couverture suffisante, soit « en cours de mesure ».
  const impact = buildPortfolioImpact(metrics, 0);
  const carbonDelta = impact.intensity?.vsBenchmarkDeltaPct ?? null;

  // N1 — traçabilité ESG : on affiche la part du score réellement mesurée (vs
  // estimée par catégorie) directement sur la tuile, jamais reléguée (§1.2).
  // Absent/null sur les portefeuilles générés avant N1 → on retombe sur « sur 100 ».
  const esgSourced = metrics.esg_sourced_share;
  const esgProvenanceSub =
    typeof esgSourced === "number" && Number.isFinite(esgSourced)
      ? esgSourced > 0
        ? t("portfolio_metrics.esg_measured", { pct: Math.round(esgSourced * 100) })
        : t("portfolio_metrics.esg_estimated")
      : t("portfolio_metrics.out_of_100");

  const items: Item[] = [
    {
      label: t("portfolio_metrics.expected_perf"),
      anchor: "metric-return",
      hint: t("portfolio_metrics.expected_perf_hint"),
      value: formatPercent(metrics.expected_return, lang, 1),
      sub: t("portfolio_metrics.per_year"),
      tone: "highlight",
    },
    {
      label: t("portfolio_metrics.impact_score"),
      anchor: "metric-esg",
      hint: t("portfolio_metrics.impact_score_hint"),
      value: formatNumber(metrics.esg_score, lang, { maximumFractionDigits: 0 }),
      sub: esgProvenanceSub,
      tone: "bloom",
    },
    {
      label: t("portfolio_metrics.carbon_intensity"),
      anchor: "metric-carbon-intensity",
      hint: t("portfolio_metrics.carbon_intensity_hint"),
      value:
        carbonDelta != null
          ? `${carbonDelta >= 0 ? "−" : "+"}${formatPercent(Math.abs(carbonDelta), lang, 0)}`
          : "—",
      sub: carbonDelta != null ? t("portfolio_metrics.vs_msci") : t("portfolio_metrics.measuring"),
      tone: "highlight",
    },
    {
      label: t("portfolio_metrics.possible_variations"),
      anchor: "metric-volatility",
      hint: t("portfolio_metrics.volatility_hint"),
      value: formatPercent(metrics.volatility, lang, 1),
      sub: t("portfolio_metrics.per_year"),
      tone: "peach",
      expertOnly: true,
    },
    {
      label: t("portfolio_metrics.return_quality"),
      anchor: "metric-sharpe",
      hint: t("portfolio_metrics.sharpe_hint"),
      value: formatNumber(metrics.sharpe, lang, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }),
      sub: t("portfolio_metrics.sharpe"),
      tone: "sky",
      expertOnly: true,
    },
    {
      label: t("portfolio_metrics.annual_fees"),
      anchor: "metric-fees",
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
    <div className="space-y-2">
      <div className="grid gap-2.5 grid-cols-3">
        {visible.map((it, i) => {
          const c = toneClasses[it.tone];
          return (
            <motion.div
              key={it.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.base, ease: EASE_REVEAL, delay: i * 0.05 }}
              className={`rounded-xl p-3 border ${c.bg} ${c.border} relative overflow-visible`}
            >
              <div className="text-tag uppercase tracking-wider text-ink-3 font-mono leading-tight">
                <MetricLabel label={it.label} hint={it.hint} />
              </div>
              <p className={`font-value text-2xl mt-2 leading-none ${c.text}`}>{it.value}</p>
              <p className="text-tag text-ink-3 mt-1.5 flex items-center justify-between gap-1">
                <span>{it.sub}</span>
                {it.anchor && (
                  <Link
                    to="/methodologie"
                    hash={it.anchor}
                    className="text-ink-3 hover:text-ink underline decoration-dotted underline-offset-2 shrink-0"
                    aria-label={t("transparency.source_link")}
                  >
                    ?
                  </Link>
                )}
              </p>
            </motion.div>
          );
        })}
      </div>
      {/* Traçabilité : chaque KPI ESG affiché doit être remontable à sa méthodo. */}
      <SourceLink className="mt-0.5" />
    </div>
  );
}
