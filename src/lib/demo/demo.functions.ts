/**
 * Fonctions serveur de l'instantané de démonstration.
 *
 * Le fichier JSON (≈ 320 Ko) n'est importé QUE côté serveur, dans les
 * handlers : le client ne reçoit que des résultats compacts (métriques,
 * séries sous-échantillonnées, expositions). Tous les calculs passent par les
 * moteurs purs et testés de `lib/portfolio/` — aucun chiffre n'est calculé ici
 * à la main.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { computePortfolioExposure, type LookThroughHolding } from "@/lib/portfolio/exposure";
import {
  blendSeries,
  performanceReport,
  rebaseForChart,
  type PerformanceReport,
  type SeriesPoint,
} from "@/lib/portfolio/performance";
import {
  analyze,
  summarize,
  type SnapshotFundAnalytics,
  type SnapshotFundSummary,
} from "./analytics";
import type { DataStatus } from "@/lib/data/status";
import type { ThirdPartyFundEsg } from "@/lib/esg/framework";
import {
  benchmarkSeries,
  DEMO_CURRENCY,
  DEMO_PORTFOLIO,
  energySectorPct,
  fundSeries,
  snapshotStatus,
  snapshotThirdPartyEsg,
  snapshotToPosition,
  type FundSnapshot,
  type SnapshotExposure,
  type SnapshotFile,
} from "./snapshots";

async function loadSnapshots(): Promise<SnapshotFile> {
  const mod = await import("@/content/demo/fund-snapshots.json");
  return (mod.default ?? mod) as SnapshotFile;
}

export type { SnapshotFundAnalytics, SnapshotFundSummary } from "./analytics";

/** Liste des fonds de l'instantané (identité et statuts, sans séries). */
export const listSnapshotFunds = createServerFn({ method: "GET" }).handler(async () => {
  const data = await loadSnapshots();
  return { generatedAt: data.generatedAt, funds: data.funds.map(summarize) };
});

/** Analyse complète d'un fonds de l'instantané, par ISIN. `null` s'il n'y figure pas. */
export const getSnapshotFund = createServerFn({ method: "GET" })
  .validator((input: string) =>
    z
      .string()
      .trim()
      .regex(/^[A-Z]{2}[A-Z0-9]{9}\d$/i)
      .parse(input)
      .toUpperCase(),
  )
  .handler(async ({ data: isin }): Promise<SnapshotFundAnalytics | null> => {
    const snapshots = await loadSnapshots();
    const f = snapshots.funds.find((x) => x.isin === isin);
    return f ? analyze(f) : null;
  });

/** Les fonds de l'instantané, analysés — pour l'API publique et le rapport (lecture serveur). */
export async function analyzeAllSnapshotFunds(): Promise<{
  generatedAt: string;
  funds: SnapshotFundAnalytics[];
}> {
  const snapshots = await loadSnapshots();
  return { generatedAt: snapshots.generatedAt, funds: snapshots.funds.map(analyze) };
}

/** Plusieurs fonds à la fois — pour la démonstration et le comparateur (8 au plus). */
export const getSnapshotFunds = createServerFn({ method: "GET" })
  .validator((input: string[]) =>
    z
      .array(
        z
          .string()
          .trim()
          .regex(/^[A-Z]{2}[A-Z0-9]{9}\d$/i),
      )
      .max(8)
      .parse(input)
      .map((s) => s.toUpperCase()),
  )
  .handler(async ({ data: isins }): Promise<SnapshotFundAnalytics[]> => {
    const snapshots = await loadSnapshots();
    return snapshots.funds.filter((f) => isins.includes(f.isin)).map(analyze);
  });

export interface DemoPortfolioResult {
  currency: string;
  amountsStatus: DataStatus;
  positions: (SnapshotFundSummary & {
    amount: number;
    weightPct: number;
    annualized3y: number | null;
    volatility3y: number | null;
  })[];
  exposure: Omit<ReturnType<typeof computePortfolioExposure>, "holdings"> & {
    holdings: LookThroughHolding[];
    holdingsTotal: number;
  };
  /** Simulation à poids constants — jamais une performance réalisée. */
  simulated: { report: PerformanceReport; chart: SeriesPoint[]; seriesCurrency: string | null };
  sources: {
    name: string;
    isin: string;
    sourceUrl: string;
    retrievedAt: string;
    navAsOf: string | null;
  }[];
}

/** Le portefeuille de démonstration, analysé de bout en bout. */
export const getDemoPortfolio = createServerFn({ method: "GET" }).handler(
  async (): Promise<DemoPortfolioResult> => {
    const snapshots = await loadSnapshots();
    const lines = DEMO_PORTFOLIO.map((l) => ({
      ...l,
      fund: snapshots.funds.find((f) => f.role === l.role),
    })).filter((l): l is typeof l & { fund: FundSnapshot } => l.fund !== undefined);
    const total = lines.reduce((s, l) => s + l.amount, 0);

    const exposure = computePortfolioExposure(
      lines.map((l) => snapshotToPosition(l.fund, l.amount)),
    );

    const series = lines.map((l) => fundSeries(l.fund));
    const blended = blendSeries(
      series,
      lines.map((l) => l.amount),
    );
    const report = performanceReport(blended);
    const end = blended.at(-1)?.date ?? "";
    const start = `${Number(end.slice(0, 4)) - 5}${end.slice(4)}`;

    return {
      currency: DEMO_CURRENCY,
      amountsStatus: "SIMULATED",
      positions: lines.map((l) => {
        const r = performanceReport(fundSeries(l.fund), { windows: [3] }).windows[0];
        return {
          ...summarize(l.fund),
          amount: l.amount,
          weightPct: total > 0 ? (l.amount / total) * 100 : 0,
          annualized3y: r.annualizedReturn,
          volatility3y: r.annualizedVolatility,
        };
      }),
      exposure: {
        ...exposure,
        holdings: exposure.holdings.slice(0, 15),
        holdingsTotal: exposure.holdings.length,
      },
      simulated: {
        report,
        chart: rebaseForChart(
          blended.filter((p) => p.date >= start),
          180,
        ),
        seriesCurrency: lines[0]?.fund.currency ?? null,
      },
      sources: lines.map((l) => ({
        name: l.fund.name,
        isin: l.fund.isin,
        sourceUrl: l.fund.sourceUrl,
        retrievedAt: l.fund.retrievedAt,
        navAsOf: l.fund.navAsOf,
      })),
    };
  },
);

/**
 * Trois faits de la page d'accueil, lus dans le document officiel d'un ETF
 * Monde très répandu. Ils remplacent des « statistiques » non sourcées : ici,
 * chaque chiffre a son émetteur, son document et sa date.
 */
export const getLandingFacts = createServerFn({ method: "GET" }).handler(async () => {
  const snapshots = await loadSnapshots();
  const f = snapshots.funds.find((x) => x.role === "core_world");
  if (!f) return null;
  return {
    fundName: f.name,
    isin: f.isin,
    holdingsCount: f.holdingsCount,
    usPct: f.geographyExposure.find((g) => g.label === "United States")?.weightPct ?? null,
    energyPct: energySectorPct(f),
    asOf: f.geographyAsOf ?? f.navAsOf,
    sourceUrl: f.sourceUrl,
  };
});

const positionInput = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(200),
  isin: z.string().max(12).nullable(),
  value: z.number().finite().nonnegative(),
  ter: z.number().finite().min(0).max(0.1).nullable(),
  assetClass: z.string().max(64).nullable(),
});

/**
 * Exposition look-through des positions RÉELLES d'un utilisateur. Seule la
 * composition publique des fonds est lue ici (aucune donnée personnelle n'est
 * persistée ni journalisée) : un fonds dont la composition n'est pas connue
 * reste une position entière, comptée dans la part « non ventilée ».
 */
export const analyzePositionsExposure = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.array(positionInput).max(50).parse(input))
  .handler(async ({ data: positions }) => {
    const snapshots = await loadSnapshots();
    const byIsin = new Map(snapshots.funds.map((f) => [f.isin, f]));
    const matched: string[] = [];
    const exposure = computePortfolioExposure(
      positions.map((p) => {
        const snap = p.isin ? byIsin.get(p.isin.toUpperCase()) : undefined;
        if (snap) {
          matched.push(p.id);
          return {
            ...snapshotToPosition(snap, p.value),
            id: p.id,
            label: p.label,
            ter: p.ter ?? snap.ter,
          };
        }
        return {
          id: p.id,
          label: p.label,
          kind: "fund" as const,
          marketValue: p.value,
          assetClass: p.assetClass,
          ter: p.ter,
          composition: null,
        };
      }),
    );
    return {
      exposure: {
        ...exposure,
        holdings: exposure.holdings.slice(0, 12),
        holdingsTotal: exposure.holdings.length,
      },
      matchedPositions: matched,
      generatedAt: snapshots.generatedAt,
    };
  });
