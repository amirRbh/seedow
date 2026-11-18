/**
 * Adaptateur de l'instantané de démonstration (`src/content/demo/fund-snapshots.json`)
 * vers les moteurs purs — performance, exposition, cadre ESG.
 *
 * Deux natures de données coexistent ici, et ne se mélangent pas :
 *   - les données des FONDS (composition, expositions, historique, SFDR déclaré,
 *     frais) : publiées par l'émetteur, datées, sourcées → VERIFIED tant
 *     qu'elles sont fraîches, STALE ensuite ;
 *   - les MONTANTS du portefeuille de démonstration : fictifs → SIMULATED.
 *
 * Module PUR : le JSON est fourni par l'appelant (fonction serveur).
 */
import { primarySourceStatus, type DataStatus } from "@/lib/data/status";
import type { Position } from "@/lib/portfolio/exposure";
import { securityKey } from "@/lib/portfolio/exposure";
import type { SeriesPoint } from "@/lib/portfolio/performance";

export interface SnapshotExposure {
  label: string;
  weightPct: number;
}

export interface FundSnapshot {
  role: string;
  isin: string;
  name: string;
  issuer: string;
  sourceUrl: string;
  sourceLabel: string;
  retrievedAt: string;
  navAsOf: string | null;
  currency: string | null;
  benchmark: string | null;
  sfdrDeclared: string | null;
  ter: number | null;
  domicile: string | null;
  assetClass: string | null;
  launchDate: string | null;
  holdingsCount: number | null;
  publishedStdDev3y: number | null;
  publishedReturns: {
    asOf: string | null;
    fund: Partial<Record<string, number>>;
    benchmark: Partial<Record<string, number>>;
  };
  sectorExposure: SnapshotExposure[];
  sectorAsOf: string | null;
  geographyExposure: SnapshotExposure[];
  geographyAsOf: string | null;
  currencyExposure: SnapshotExposure[];
  holdingsAsOf: string | null;
  holdingsLines: number;
  holdingsTotalWeightPct: number;
  topHoldingsWeightPct: number;
  topHoldings: {
    ticker: string | null;
    name: string;
    sector: string | null;
    currency: string | null;
    weightPct: number;
  }[];
  history: { dates: string[]; fund: number[]; benchmark: (number | null)[] };
}

export interface SnapshotFile {
  generatedAt: string;
  funds: FundSnapshot[];
}

/**
 * Portefeuille de DÉMONSTRATION — les montants sont fictifs et le restent.
 * Ils illustrent une allocation diversifiée courante (actions monde, part
 * ISR, émergents, thématique, obligations courtes). Ce n'est une
 * recommandation pour personne (CLAUDE.md §1.1).
 */
export const DEMO_PORTFOLIO: { role: string; amount: number }[] = [
  { role: "core_world", amount: 4000 },
  { role: "world_sri", amount: 2000 },
  { role: "emerging", amount: 1500 },
  { role: "clean_energy", amount: 1000 },
  { role: "treasury", amount: 1500 },
];

export const DEMO_CURRENCY = "EUR";

export function fundSeries(f: FundSnapshot): SeriesPoint[] {
  return f.history.dates.map((date, i) => ({ date, value: f.history.fund[i] }));
}

export function benchmarkSeries(f: FundSnapshot): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  f.history.dates.forEach((date, i) => {
    const v = f.history.benchmark[i];
    if (v != null) out.push({ date, value: v });
  });
  return out;
}

/** Une position du moteur d'exposition, à partir d'un fonds de l'instantané. */
export function snapshotToPosition(f: FundSnapshot, marketValue: number): Position {
  return {
    id: f.isin,
    label: f.name,
    kind: "fund",
    marketValue,
    assetClass: f.assetClass,
    ter: f.ter,
    composition: {
      sector: f.sectorExposure,
      geography: f.geographyExposure,
      currency: f.currencyExposure,
      holdings: f.topHoldings.map((h) => ({
        key: securityKey({ ticker: h.ticker, name: h.name }),
        name: h.name,
        sector: h.sector,
        weightPct: h.weightPct,
      })),
    },
  };
}

/** Statut des données d'un fonds de l'instantané, selon leur âge. */
export function snapshotStatus(f: FundSnapshot, now: Date = new Date()): {
  holdings: DataStatus;
  exposure: DataStatus;
  performance: DataStatus;
  regulatory: DataStatus;
} {
  return {
    holdings: primarySourceStatus(f.topHoldings.length > 0, f.holdingsAsOf, "fund_holdings", now),
    exposure: primarySourceStatus(f.sectorExposure.length > 0, f.sectorAsOf, "fund_exposure", now),
    performance: primarySourceStatus(
      f.history.dates.length > 1,
      f.history.dates.at(-1) ?? null,
      "performance_history",
      now,
    ),
    regulatory: primarySourceStatus(f.sfdrDeclared != null, f.navAsOf, "regulatory_document", now),
  };
}

/** Part du secteur Énergie (GICS) publiée par l'émetteur, ou `null`. */
export function energySectorPct(f: FundSnapshot): number | null {
  if (f.sectorExposure.length === 0) return null;
  return f.sectorExposure.find((s) => s.label.toLowerCase() === "energy")?.weightPct ?? 0;
}
