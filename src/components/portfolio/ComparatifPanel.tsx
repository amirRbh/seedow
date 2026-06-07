import { Link } from "@tanstack/react-router";
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
  const { portfolio } = useActivePortfolio();
  const valuation = usePortfolioValuation();

  if (!portfolio) {
    return <p className="text-[12px] text-ink-3">Aucun portefeuille actif.</p>;
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
          label="Capital simulé à 10 ans"
          value={seedow10y.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          unit="€"
          accent
          hint={`Sur ${capital.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} € investis`}
        />
        <KPIFigure
          size="sm"
          label="Écart vs MSCI World"
          value={`${delta10y >= 0 ? "+" : ""}${delta10y.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          unit="€"
          hint={delta10y >= 0 ? "Au-dessus du benchmark" : "En-dessous du benchmark"}
        />
      </div>

      <div className="mt-8">
        <div className="gold-rule mb-5" />
        <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">Face à face</p>
        <h2 className="font-value text-2xl text-ink leading-tight">Les chiffres, sans filtre</h2>

        <div className="mt-6 border-t border-b border-paper-3 divide-y divide-paper-3">
          <CompareRow
            label="Performance attendue"
            term="MSCIWorld"
            seedowValue={`${(seedow.expectedReturn * 100).toFixed(1)} %`}
            msciValue={`${(MSCI_WORLD.expectedReturn * 100).toFixed(1)} %`}
            seedowWins={seedow.expectedReturn >= MSCI_WORLD.expectedReturn}
            bar={<PerfMedaillon value={seedow.expectedReturn} max={Math.max(seedow.expectedReturn, MSCI_WORLD.expectedReturn)} accent />}
          />
          <CompareRow
            label="Volatilité"
            term="Volatilite"
            seedowValue={`${(seedow.volatility * 100).toFixed(1)} %`}
            msciValue={`${(MSCI_WORLD.volatility * 100).toFixed(1)} %`}
            seedowWins={seedow.volatility <= MSCI_WORLD.volatility}
            note="Plus bas = parcours plus stable"
          />
          <CompareRow
            label="Frais annuels"
            term="TER"
            seedowValue={`${(seedow.ter * 100).toFixed(2)} %`}
            msciValue={`${(MSCI_WORLD.ter * 100).toFixed(2)} %`}
            seedowWins={seedow.ter <= MSCI_WORLD.ter}
            note="Plus bas = plus de rendement net"
          />
          <CompareRow
            label="Score d'impact"
            term="ESG"
            seedowValue={`${seedow.esgScore.toFixed(0)} / 100`}
            msciValue={`${MSCI_WORLD.esgScore} / 100`}
            seedowWins={seedow.esgScore >= MSCI_WORLD.esgScore}
            note="Plus haut = pratiques plus durables"
          />
          <CompareRow
            label="Intensité carbone"
            term="CO2"
            seedowValue={`${seedow.carbonIntensityGperEur.toFixed(0)} g/€`}
            msciValue={`${MSCI_WORLD.carbonIntensityGperEur} g/€`}
            seedowWins={seedow.carbonIntensityGperEur <= MSCI_WORLD.carbonIntensityGperEur}
            note="Émissions par euro investi"
          />
          <CompareRow
            label="Classification"
            term="SFDR"
            seedowValue={seedow.sfdr}
            msciValue={MSCI_WORLD.sfdr}
            seedowWins={seedow.sfdr.includes("8") || seedow.sfdr.includes("9")}
          />
        </div>
      </div>

      <div className="mt-10">
        <div className="gold-rule mb-5" />
        <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">Impact concret</p>
        <h2 className="font-value text-2xl text-ink leading-tight">Ce que tu évites chaque année</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-paper-3 pt-5">
          <KPIFigure
            size="md"
            label="CO₂ évité"
            value={co2EvitedKg.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            unit="kg/an"
            accent
            hint={`≈ ${Math.round(co2EvitedKg / 120)} trajets Paris→Lyon en voiture`}
          />
          <KPIFigure
            size="md"
            label="Frais économisés"
            value={`${Math.max(0, (MSCI_WORLD.ter - seedow.ter) * capital).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            unit="€/an"
            hint={`Pour ${capital.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} € investis`}
          />
        </div>
      </div>

      <div className="mt-10 border-t border-paper-3 pt-5">
        <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">Méthodologie</p>
        <p className="text-[12px] text-ink-2 leading-relaxed">
          Le benchmark utilise les caractéristiques moyennes d'un ETF{" "}
          <Glossary term="MSCIWorld">MSCI World</Glossary> UCITS (IWDA / EUNL) : performance
          annualisée long terme de 7,2 % (net dividendes), volatilité 15,5 %,{" "}
          <Glossary term="TER">TER</Glossary> 0,20 %, score MSCI ESG ~52, intensité carbone
          165 gCO₂e par euro investi.
        </p>
        <Link
          to="/methodologie"
          className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink hover:text-moss-1 transition-colors"
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
          <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">{label}</p>
          <Glossary term={term} variant="icon" />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-gold font-semibold mb-1">Toi</p>
          <p className={cn("kpi-figure text-xl tabular-nums", seedowWins ? "text-ink" : "text-ink-2")}>
            {seedowValue}
            {seedowWins && <span aria-hidden="true" className="ml-1.5 text-gold text-xs">●</span>}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-semibold mb-1">MSCI World</p>
          <p className="kpi-figure text-xl text-ink-2 tabular-nums">{msciValue}</p>
        </div>
      </div>
      {bar}
      {note && <p className="text-[11px] text-ink-3 mt-2">{note}</p>}
    </div>
  );
}
