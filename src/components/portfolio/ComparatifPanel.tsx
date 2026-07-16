import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { KPIFigure } from "@/components/ui/KPIFigure";
import { Glossary } from "@/components/ui/Glossary";
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
  ter: 0.0020,
  esgScore: 52,
  carbonIntensityGperEur: 165,
  sfdr: "Article 6",
} as const;

function PerfMedaillon({ value, max, accent }: { value: number; max: number; accent?: boolean }) {
  const w = Math.max(4, Math.min(100, (Math.abs(value) / max) * 100));
  return (
    <div className="h-1 w-full bg-paper-3 rounded-full overflow-hidden mt-2">
      <div
        className={cn("h-full rounded-full", accent ? "bg-gold" : "bg-moss-1")}
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

  if (!portfolio) {
    return <p className="text-label text-ink-3">{t("comparatif_panel.no_active")}</p>;
  }

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
  const msci10y = project(MSCI_WORLD.expectedReturn);
  const delta10y = seedow10y - msci10y;

  const co2EvitedKg = Math.max(
    0,
    ((MSCI_WORLD.carbonIntensityGperEur - seedow.carbonIntensityGperEur) * capital) / 1000,
  );

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <KPIFigure
          size="sm"
          label={t("comparatif_panel.simulated_10y")}
          value={seedow10y.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          unit="€"
          accent
          hint={t("comparatif_panel.on_invested", { amount: capital.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) })}
        />
        <KPIFigure
          size="sm"
          label={t("comparatif_panel.gap_msci")}
          value={`${delta10y >= 0 ? "+" : ""}${delta10y.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          unit="€"
          hint={delta10y >= 0 ? t("comparatif_panel.above_benchmark") : t("comparatif_panel.below_benchmark")}
        />
      </div>
      <p className="mt-3 text-caption text-ink-3 leading-relaxed">
        {t("comparatif_panel.projection_disclaimer")}
      </p>

      <div className="mt-8">
        <div className="gold-rule mb-5" />
        <p className="text-tag uppercase tracking-[0.22em] text-gold font-semibold mb-3">{t("comparatif_panel.face_to_face")}</p>
        <h2 className="font-value text-2xl text-ink leading-tight">{t("comparatif_panel.no_filter")}</h2>

        <div className="mt-6 border-t border-b border-paper-3 divide-y divide-paper-3">
          <CompareRow
            label={t("comparatif_panel.expected_perf")}
            term="MSCIWorld"
            seedowValue={`${(seedow.expectedReturn * 100).toFixed(1)} %`}
            msciValue={`${(MSCI_WORLD.expectedReturn * 100).toFixed(1)} %`}
            seedowWins={seedow.expectedReturn >= MSCI_WORLD.expectedReturn}
            bar={<PerfMedaillon value={seedow.expectedReturn} max={Math.max(seedow.expectedReturn, MSCI_WORLD.expectedReturn)} accent />}
          />
          <CompareRow
            label={t("comparatif_panel.volatility")}
            term="Volatilite"
            seedowValue={`${(seedow.volatility * 100).toFixed(1)} %`}
            msciValue={`${(MSCI_WORLD.volatility * 100).toFixed(1)} %`}
            seedowWins={seedow.volatility <= MSCI_WORLD.volatility}
            note={t("comparatif_panel.lower_stable")}
          />
          <CompareRow
            label={t("comparatif_panel.annual_fees")}
            term="TER"
            seedowValue={`${(seedow.ter * 100).toFixed(2)} %`}
            msciValue={`${(MSCI_WORLD.ter * 100).toFixed(2)} %`}
            seedowWins={seedow.ter <= MSCI_WORLD.ter}
            note={t("comparatif_panel.lower_net")}
          />
          <CompareRow
            label={t("comparatif_panel.impact_score")}
            term="ESG"
            seedowValue={`${seedow.esgScore.toFixed(0)} / 100`}
            msciValue={`${MSCI_WORLD.esgScore} / 100`}
            seedowWins={seedow.esgScore >= MSCI_WORLD.esgScore}
            note={t("comparatif_panel.higher_durable")}
          />
          <CompareRow
            label={t("comparatif_panel.carbon_intensity")}
            term="CO2"
            seedowValue={`${seedow.carbonIntensityGperEur.toFixed(0)} g/€`}
            msciValue={`${MSCI_WORLD.carbonIntensityGperEur} g/€`}
            seedowWins={seedow.carbonIntensityGperEur <= MSCI_WORLD.carbonIntensityGperEur}
            note={t("comparatif_panel.per_euro")}
          />
          <CompareRow
            label={t("comparatif_panel.classification")}
            term="SFDR"
            seedowValue={seedow.sfdr}
            msciValue={MSCI_WORLD.sfdr}
            seedowWins={seedow.sfdr.includes("8") || seedow.sfdr.includes("9")}
          />
        </div>
      </div>

      <div className="mt-10">
        <div className="gold-rule mb-5" />
        <p className="text-tag uppercase tracking-[0.22em] text-gold font-semibold mb-3">{t("comparatif_panel.concrete_impact")}</p>
        <h2 className="font-value text-2xl text-ink leading-tight">{t("comparatif_panel.avoided_per_year")}</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-paper-3 pt-5">
          <KPIFigure
            size="md"
            label={t("comparatif_panel.co2_avoided")}
            value={co2EvitedKg.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            unit="kg/an"
            accent
            hint={t("comparatif_panel.paris_lyon_trips", { count: Math.round(co2EvitedKg / 120) })}
          />
          <KPIFigure
            size="md"
            label={t("comparatif_panel.saved_fees")}
            value={`${Math.max(0, (MSCI_WORLD.ter - seedow.ter) * capital).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            unit="€/an"
            hint={t("comparatif_panel.for_invested", { amount: capital.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) })}
          />
        </div>
      </div>

      <div className="mt-10 border-t border-paper-3 pt-5">
        <p className="text-caption uppercase tracking-wider text-ink-3 font-semibold mb-2">{t("comparatif_panel.methodology")}</p>
        <p className="text-label text-ink-2 leading-relaxed">
          {t("comparatif_panel.methodology_body")}
        </p>
        <Link
          to="/methodologie"
          className="mt-3 inline-flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.18em] text-ink hover:text-moss-1 transition-colors"
        >
          Lire la méthodologie complète
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

interface RowProps {
  label: string;
  term: "MSCIWorld" | "Volatilite" | "TER" | "ESG" | "CO2" | "SFDR";
  seedowValue: string;
  msciValue: string;
  seedowWins: boolean;
  note?: string;
  bar?: React.ReactNode;
}

function CompareRow({ label, term, seedowValue, msciValue, seedowWins, note, bar }: RowProps) {
  return (
    <div className="py-4">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-caption uppercase tracking-wider text-ink-3 font-semibold">{label}</p>
          <Glossary term={term} variant="icon" />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-4">
        <div>
          <p className="text-tag uppercase tracking-[0.18em] text-gold font-semibold mb-1">Seedow</p>
          <p className={cn("kpi-figure text-xl tabular-nums", seedowWins ? "text-ink" : "text-ink-2")}>
            {seedowValue}
            {seedowWins && <span aria-hidden="true" className="ml-1.5 text-gold text-xs">●</span>}
          </p>
        </div>
        <div>
          <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-semibold mb-1">MSCI World</p>
          <p className="kpi-figure text-xl text-ink-2 tabular-nums">{msciValue}</p>
        </div>
      </div>
      {bar}
      {note && <p className="text-caption text-ink-3 mt-2">{note}</p>}
    </div>
  );
}
