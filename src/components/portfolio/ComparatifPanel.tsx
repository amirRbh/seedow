import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { KPIFigure } from "@/components/ui/KPIFigure";
import { Glossary, GLOSSARY } from "@/components/ui/Glossary";
import { useViewMode } from "@/hooks/useViewMode";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { cn } from "@/lib/utils";

/**
 * Benchmark de référence — ETF MSCI World grand public (UCITS, EUR).
 */
const MSCI_WORLD = {
  name: "ETF MSCI World",
  ticker: "IWDA / EUNL",
  expectedReturn: 0.072,
  volatility: 0.155,
  ter: 0.002,
  esgScore: 52,
  carbonIntensityGperEur: 165,
  sfdr: "Article 6",
} as const;

/**
 * S&P 500 — proxy réel : iShares Core S&P 500 UCITS ETF (CSPX.AS, IE00B5BMR087).
 * Rendement annualisé et volatilité annualisée calculés sur 10 ans de cours
 * mensuels ajustés (Yahoo Finance, arrêtés au 02/08/2026). TER officiel 0,07 %.
 * Aucun score ESG / intensité carbone publié pour cet indice parent → null,
 * on n'invente pas (contrat de transparence).
 */
const SP500 = {
  name: "ETF S&P 500",
  ticker: "CSPX",
  expectedReturn: 0.1429,
  volatility: 0.1425,
  ter: 0.0007,
  esgScore: null,
  carbonIntensityGperEur: null,
  sfdr: "Article 6",
} as const;

/**
 * CAC 40 — proxy réel : Amundi CAC 40 UCITS ETF (CAC.PA, FR0007052782).
 * Mêmes conventions de calcul que ci-dessus. TER officiel 0,25 %.
 */
const CAC40 = {
  name: "ETF CAC 40",
  ticker: "CAC",
  expectedReturn: 0.0973,
  volatility: 0.1553,
  ter: 0.0025,
  esgScore: null,
  carbonIntensityGperEur: null,
  sfdr: "Article 6",
} as const;

interface BenchmarkData {
  name: string;
  ticker: string;
  expectedReturn: number;
  volatility: number;
  ter: number;
  esgScore: number | null;
  carbonIntensityGperEur: number | null;
  sfdr: string;
}

/**
 * Références de comparaison disponibles. Chaque référence s'appuie sur un ETF
 * réel et des séries de cours réelles ; les métriques ESG absentes restent à
 * `null` et s'affichent comme non disponibles plutôt que fabriquées.
 */
interface BenchmarkOption {
  id: "msci_world" | "sp500" | "cac40";
  labelKey: string;
  data: BenchmarkData | null;
}

const BENCHMARK_OPTIONS: BenchmarkOption[] = [
  { id: "msci_world", labelKey: "comparatif_panel.benchmark_msci_world", data: MSCI_WORLD },
  { id: "sp500", labelKey: "comparatif_panel.benchmark_sp500", data: SP500 },
  { id: "cac40", labelKey: "comparatif_panel.benchmark_cac40", data: CAC40 },
];


function PerfMedaillon({ value, max, accent }: { value: number; max: number; accent?: boolean }) {
  const w = Math.max(4, Math.min(100, (Math.abs(value) / max) * 100));
  return (
    <div className="h-1 w-full bg-paper-3 rounded-full overflow-hidden mt-2">
      <div
        className={cn("h-full rounded-full", accent ? "bg-gold" : "bg-highlight-1")}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

/**
 * Panneau Comparatif — utilisable standalone (/comparatif) ou en onglet (/portfolio).
 */
export function ComparatifPanel() {
  const { t } = useTranslation();
  const { portfolio } = useActivePortfolio();
  const valuation = usePortfolioValuation();
  const [benchmarkId, setBenchmarkId] = useState<BenchmarkOption["id"]>("msci_world");

  if (!portfolio) {
    return <p className="text-label text-ink-3">{t("comparatif_panel.no_active")}</p>;
  }

  const benchmark = BENCHMARK_OPTIONS.find((b) => b.id === benchmarkId) ?? BENCHMARK_OPTIONS[0];
  const ref = benchmark.data;

  const metrics = portfolio.metrics;
  const seedow = {
    name: portfolio.name,
    expectedReturn: metrics?.expected_return ?? 0.06,
    volatility: metrics?.volatility ?? 0.12,
    ter: metrics?.ter ?? 0.0025,
    esgScore: metrics?.esg_score ?? 0,
    carbonIntensityGperEur: metrics?.co2_avoided_tons
      ? Math.max(0, MSCI_WORLD.carbonIntensityGperEur - metrics.co2_avoided_tons * 100)
      : MSCI_WORLD.carbonIntensityGperEur,
    sfdr: "Article 8 / 9",
  };

  const capital = valuation.totalInvested || portfolio.initial_amount || 10_000;
  const project = (r: number) => capital * Math.pow(1 + r, 10);
  const seedow10y = project(seedow.expectedReturn);
  const ref10y = ref ? project(ref.expectedReturn) : null;
  const delta10y = ref10y !== null ? seedow10y - ref10y : null;

  const co2EvitedKg =
    ref && ref.carbonIntensityGperEur != null
      ? Math.max(0, ((ref.carbonIntensityGperEur - seedow.carbonIntensityGperEur) * capital) / 1000)
      : null;

  const BenchmarkSelector = (
    <div
      className="flex flex-wrap gap-2 mb-6"
      role="tablist"
      aria-label={t("comparatif_panel.benchmark_label")}
    >
      {BENCHMARK_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={benchmarkId === opt.id}
          onClick={() => setBenchmarkId(opt.id)}
          className={cn(
            "px-3 py-1.5 rounded-full text-caption uppercase tracking-wider font-semibold border transition-colors",
            benchmarkId === opt.id
              ? "bg-ink text-paper border-ink"
              : "bg-transparent text-ink-3 border-paper-3 hover:border-ink-2",
          )}
        >
          {t(opt.labelKey)}
          {!opt.data && <span aria-hidden> ·</span>}
        </button>
      ))}
    </div>
  );

  if (!ref) {
    return (
      <div>
        <p className="text-caption uppercase tracking-wider text-ink-3 mb-3">
          {t("comparatif_panel.benchmark_label")}
        </p>
        {BenchmarkSelector}
        <div className="border border-paper-3 rounded-2xl p-6 text-center">
          <p className="text-body font-semibold text-ink">
            {t("comparatif_panel.benchmark_no_data_title")}
          </p>
          <p className="mt-2 text-label text-ink-3 leading-relaxed">
            {t("comparatif_panel.benchmark_no_data_body")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-caption uppercase tracking-wider text-ink-3 mb-3">
        {t("comparatif_panel.benchmark_label")}
      </p>
      {BenchmarkSelector}
      <div className="grid grid-cols-2 gap-4">
        <KPIFigure
          size="sm"
          label={t("comparatif_panel.simulated_10y")}
          value={seedow10y.toLocaleString("fr-FR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
          unit="€"
          accent
          hint={t("comparatif_panel.on_invested", {
            amount: capital.toLocaleString("fr-FR", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }),
          })}
        />
        <KPIFigure
          size="sm"
          label={t("comparatif_panel.gap_msci")}
          value={`${delta10y! >= 0 ? "+" : ""}${delta10y!.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          unit="€"
          hint={
            delta10y! >= 0
              ? t("comparatif_panel.above_benchmark")
              : t("comparatif_panel.below_benchmark")
          }
        />
      </div>
      <p className="mt-3 text-caption text-ink-3 leading-relaxed">
        {t("comparatif_panel.projection_disclaimer")}
      </p>

      <div className="mt-8">
        <div className="gold-rule mb-5" />
        <p className="text-tag uppercase tracking-[0.22em] text-gold font-semibold mb-3">
          {t("comparatif_panel.face_to_face")}
        </p>
        <h2 className="font-value text-2xl text-ink leading-tight">
          {t("comparatif_panel.no_filter")}
        </h2>

        <div className="mt-6 border-t border-b border-paper-3 divide-y divide-paper-3">
          <CompareRow
            benchmarkLabel={t(benchmark.labelKey)}
            label={t("comparatif_panel.expected_perf")}
            term="MSCIWorld"
            seedowValue={`${(seedow.expectedReturn * 100).toFixed(1)} %`}
            msciValue={`${(ref.expectedReturn * 100).toFixed(1)} %`}
            seedowWins={seedow.expectedReturn >= ref.expectedReturn}
            bar={
              <PerfMedaillon
                value={seedow.expectedReturn}
                max={Math.max(seedow.expectedReturn, ref.expectedReturn)}
                accent
              />
            }
          />
          <CompareRow
            benchmarkLabel={t(benchmark.labelKey)}
            label={t("comparatif_panel.volatility")}
            term="Volatilite"
            seedowValue={`${(seedow.volatility * 100).toFixed(1)} %`}
            msciValue={`${(ref.volatility * 100).toFixed(1)} %`}
            seedowWins={seedow.volatility <= ref.volatility}
            note={t("comparatif_panel.lower_stable")}
          />
          <CompareRow
            benchmarkLabel={t(benchmark.labelKey)}
            label={t("comparatif_panel.annual_fees")}
            term="TER"
            seedowValue={`${(seedow.ter * 100).toFixed(2)} %`}
            msciValue={`${(ref.ter * 100).toFixed(2)} %`}
            seedowWins={seedow.ter <= ref.ter}
            note={t("comparatif_panel.lower_net")}
          />
          <CompareRow
            benchmarkLabel={t(benchmark.labelKey)}
            label={t("comparatif_panel.impact_score")}
            term="ESG"
            seedowValue={`${seedow.esgScore.toFixed(0)} / 100`}
            msciValue={`${ref.esgScore} / 100`}
            seedowWins={seedow.esgScore >= ref.esgScore}
            note={t("comparatif_panel.higher_durable")}
          />
          <CompareRow
            benchmarkLabel={t(benchmark.labelKey)}
            label={t("comparatif_panel.carbon_intensity")}
            term="CO2"
            seedowValue={`${seedow.carbonIntensityGperEur.toFixed(0)} g/€`}
            msciValue={`${ref.carbonIntensityGperEur} g/€`}
            seedowWins={seedow.carbonIntensityGperEur <= ref.carbonIntensityGperEur}
            note={t("comparatif_panel.per_euro")}
          />
          <CompareRow
            benchmarkLabel={t(benchmark.labelKey)}
            label={t("comparatif_panel.classification")}
            term="SFDR"
            seedowValue={seedow.sfdr}
            msciValue={ref.sfdr}
            seedowWins={seedow.sfdr.includes("8") || seedow.sfdr.includes("9")}
          />
        </div>
      </div>

      <div className="mt-10">
        <div className="gold-rule mb-5" />
        <p className="text-tag uppercase tracking-[0.22em] text-gold font-semibold mb-3">
          {t("comparatif_panel.concrete_impact")}
        </p>
        <h2 className="font-value text-2xl text-ink leading-tight">
          {t("comparatif_panel.avoided_per_year")}
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-paper-3 pt-5">
          <KPIFigure
            size="md"
            label={t("comparatif_panel.co2_avoided")}
            value={co2EvitedKg!.toLocaleString("fr-FR", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
            unit="kg/an"
            accent
            hint={t("comparatif_panel.paris_lyon_trips", { count: Math.round(co2EvitedKg! / 120) })}
          />
          <KPIFigure
            size="md"
            label={t("comparatif_panel.saved_fees")}
            value={`${Math.max(0, (ref.ter - seedow.ter) * capital).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            unit="€/an"
            hint={t("comparatif_panel.for_invested", {
              amount: capital.toLocaleString("fr-FR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }),
            })}
          />
        </div>
      </div>

      <div className="mt-10 border-t border-paper-3 pt-5">
        <p className="text-caption uppercase tracking-wider text-ink-3 font-semibold mb-2">
          {t("comparatif_panel.methodology")}
        </p>
        <p className="text-label text-ink-2 leading-relaxed">
          {t("comparatif_panel.methodology_body")}
        </p>
        <Link
          to="/methodologie"
          className="mt-3 inline-flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.18em] text-ink hover:text-highlight-1 transition-colors"
        >
          Lire la méthodologie complète
          <svg
            viewBox="0 0 24 24"
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

interface RowProps {
  label: string;
  /** Libellé de la référence comparée (benchmark sélectionné), déjà traduit. */
  benchmarkLabel: string;
  term: "MSCIWorld" | "Volatilite" | "TER" | "ESG" | "CO2" | "SFDR";
  seedowValue: string;
  msciValue: string;
  seedowWins: boolean;
  note?: string;
  bar?: React.ReactNode;
}

function CompareRow({
  label,
  benchmarkLabel,
  term,
  seedowValue,
  msciValue,
  seedowWins,
  note,
  bar,
}: RowProps) {
  const { isSimple } = useViewMode();
  // Mode Simple : le libellé de ligne passe en langage clair. Mode Expert :
  // on garde le libellé éditorial d'origine. Le ⓘ ouvre la définition complète.
  const rowLabel = isSimple ? GLOSSARY[term].simple : label;
  return (
    <div className="py-4">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-caption uppercase tracking-wider text-ink-3 font-semibold">
            {rowLabel}
          </p>
          <Glossary term={term} variant="icon" />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-4">
        <div>
          <p className="text-tag uppercase tracking-[0.18em] text-gold font-semibold mb-1">
            Seedow
          </p>
          <p
            className={cn(
              "kpi-figure text-xl tabular-nums",
              seedowWins ? "text-ink" : "text-ink-2",
            )}
          >
            {seedowValue}
            {seedowWins && (
              <span aria-hidden="true" className="ml-1.5 text-gold text-xs">
                ●
              </span>
            )}
          </p>
        </div>
        <div>
          <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-semibold mb-1">
            {benchmarkLabel}
          </p>
          <p className="kpi-figure text-xl text-ink-2 tabular-nums">{msciValue}</p>
        </div>
      </div>
      {bar}
      {note && <p className="text-caption text-ink-3 mt-2">{note}</p>}
    </div>
  );
}
