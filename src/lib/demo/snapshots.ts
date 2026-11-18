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
import type {
  WorkbookBusinessInvolvement,
  WorkbookSustainability,
} from "@/lib/data-engine/ishares-workbook";
import type { ThirdPartyFundEsg } from "@/lib/esg/framework";
import type { Position } from "@/lib/portfolio/exposure";
import { securityKey } from "@/lib/portfolio/exposure";
import { seriesFrequency, type SeriesPoint } from "@/lib/portfolio/performance";

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
  /** Indicateurs MSCI publiés par l'émetteur (ETF américains), sinon absents ou `null`. */
  sustainability?: WorkbookSustainability | null;
  businessInvolvement?: WorkbookBusinessInvolvement | null;
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

/** Indicateurs MSCI repris par l'émetteur, au format du cadre ESG — `null` s'il n'en publie pas. */
export function snapshotThirdPartyEsg(f: {
  issuer: string;
  sourceUrl: string;
  sustainability?: WorkbookSustainability | null;
  businessInvolvement?: WorkbookBusinessInvolvement | null;
}): ThirdPartyFundEsg | null {
  if (!f.sustainability && !f.businessInvolvement) return null;
  return {
    provider: "MSCI ESG Research",
    publishedBy: f.issuer,
    sourceUrl: f.sourceUrl,
    sustainability: f.sustainability ?? null,
    businessInvolvement: f.businessInvolvement ?? null,
  };
}

/** Statut des données d'un fonds de l'instantané, selon leur âge. */
export function snapshotStatus(
  f: FundSnapshot,
  now: Date = new Date(),
): {
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
      seriesFrequency(fundSeries(f)) === "monthly"
        ? "performance_history_monthly"
        : "performance_history",
      now,
    ),
    regulatory: primarySourceStatus(f.sfdrDeclared != null, f.navAsOf, "regulatory_document", now),
  };
}

/** Les onze secteurs GICS, sous les libellés des émetteurs (« Communication » côté américain). */
const GICS_SECTORS = new Set([
  "energy",
  "materials",
  "industrials",
  "consumer discretionary",
  "consumer staples",
  "health care",
  "financials",
  "information technology",
  "communication",
  "communication services",
  "utilities",
  "real estate",
]);

/** Sous-industries GICS du secteur Énergie (pétrole, gaz, charbon), y compris les regroupements d'émetteur. */
const ENERGY_SUB_INDUSTRY = /oil & gas|integrated oil|coal & consumable fuels/i;

/**
 * Part du secteur Énergie (GICS) publiée par l'émetteur, ou `null`.
 *
 * Deux granularités existent : par SECTEUR (« Energy ») ou par SOUS-INDUSTRIE
 * (« Oil & Gas Refining & Marketing & Transportation », typique des ETF
 * thématiques). Dans le second cas, on additionne les sous-industries du
 * secteur Énergie. Une répartition publiée est complète : l'absence d'une
 * ligne Énergie vaut 0 (fonds d'État compris). Aucune répartition → `null`.
 */
export function energySectorPct(f: Pick<FundSnapshot, "sectorExposure">): number | null {
  const rows = f.sectorExposure.filter((s) => !/cash|derivative|other/i.test(s.label));
  if (rows.length === 0) return null;
  if (rows.some((s) => GICS_SECTORS.has(s.label.toLowerCase())))
    return rows.find((s) => s.label.toLowerCase() === "energy")?.weightPct ?? 0;
  const energy = rows.filter((s) => ENERGY_SUB_INDUSTRY.test(s.label));
  // Sous-industries : la répartition est complète, une absence vaut donc 0.
  return Math.round(energy.reduce((sum, s) => sum + s.weightPct, 0) * 100) / 100;
}
