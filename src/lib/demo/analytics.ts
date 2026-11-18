/**
 * Analyse d'un fonds de l'instantané — PURE, sans fonction serveur, pour être
 * partagée par les fonctions serveur (`demo.functions.ts`), l'API publique et
 * les tests. Tous les calculs passent par les moteurs de `lib/portfolio/`.
 */
import type { ThirdPartyFundEsg } from "@/lib/esg/framework";
import {
  performanceReport,
  rebaseForChart,
  type PerformanceReport,
  type SeriesPoint,
} from "@/lib/portfolio/performance";
import {
  benchmarkSeries,
  energySectorPct,
  fundSeries,
  snapshotStatus,
  snapshotThirdPartyEsg,
  type FundSnapshot,
  type SnapshotExposure,
} from "./snapshots";

export interface SnapshotFundSummary {
  isin: string;
  name: string;
  role: string;
  issuer: string;
  currency: string | null;
  benchmark: string | null;
  sfdrDeclared: string | null;
  ter: number | null;
  assetClass: string | null;
  domicile: string | null;
  holdingsCount: number | null;
  navAsOf: string | null;
  retrievedAt: string;
  sourceUrl: string;
  sourceLabel: string;
  status: ReturnType<typeof snapshotStatus>;
  energySectorPct: number | null;
  /** Indicateurs MSCI repris par l'émetteur — affichage attribué, jamais redistribués par l'API. */
  thirdPartyEsg: ThirdPartyFundEsg | null;
}

export function summarize(f: FundSnapshot): SnapshotFundSummary {
  return {
    isin: f.isin,
    name: f.name,
    role: f.role,
    issuer: f.issuer,
    currency: f.currency,
    benchmark: f.benchmark,
    sfdrDeclared: f.sfdrDeclared,
    ter: f.ter,
    assetClass: f.assetClass,
    domicile: f.domicile,
    holdingsCount: f.holdingsCount,
    navAsOf: f.navAsOf,
    retrievedAt: f.retrievedAt,
    sourceUrl: f.sourceUrl,
    sourceLabel: f.sourceLabel,
    status: snapshotStatus(f),
    energySectorPct: energySectorPct(f),
    thirdPartyEsg: snapshotThirdPartyEsg(f),
  };
}

export interface SnapshotFundAnalytics extends SnapshotFundSummary {
  performance: PerformanceReport;
  publishedReturns: FundSnapshot["publishedReturns"];
  publishedStdDev3y: number | null;
  chart: { fund: SeriesPoint[]; benchmark: SeriesPoint[] };
  sectorExposure: SnapshotExposure[];
  sectorAsOf: string | null;
  geographyExposure: SnapshotExposure[];
  geographyAsOf: string | null;
  currencyExposure: SnapshotExposure[];
  holdingsAsOf: string | null;
  holdingsLines: number;
  topHoldings: FundSnapshot["topHoldings"];
  topHoldingsWeightPct: number;
}

export function analyze(f: FundSnapshot): SnapshotFundAnalytics {
  const fund = fundSeries(f);
  const bench = benchmarkSeries(f);
  // Le graphique couvre 5 ans, rebasés à 100 le même jour pour les deux courbes.
  const end = fund.at(-1)?.date ?? "";
  const start = `${Number(end.slice(0, 4)) - 5}${end.slice(4)}`;
  const fundChart = fund.filter((p) => p.date >= start);
  const firstDate = fundChart[0]?.date;
  const benchChart = bench.filter((p) => firstDate && p.date >= firstDate);
  return {
    ...summarize(f),
    performance: performanceReport(fund, { benchmark: bench.length > 1 ? bench : null }),
    publishedReturns: f.publishedReturns,
    publishedStdDev3y: f.publishedStdDev3y,
    chart: {
      fund: rebaseForChart(fundChart, 180),
      benchmark: benchChart[0]?.date === firstDate ? rebaseForChart(benchChart, 180) : [],
    },
    sectorExposure: f.sectorExposure,
    sectorAsOf: f.sectorAsOf,
    geographyExposure: f.geographyExposure,
    geographyAsOf: f.geographyAsOf,
    currencyExposure: f.currencyExposure.slice(0, 8),
    holdingsAsOf: f.holdingsAsOf,
    holdingsLines: f.holdingsLines,
    topHoldings: f.topHoldings.slice(0, 10),
    topHoldingsWeightPct: f.topHoldingsWeightPct,
  };
}
