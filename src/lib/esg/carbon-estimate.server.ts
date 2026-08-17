/**
 * Calcule et persiste l'estimation carbone bottom-up d'UN fonds à partir de sa
 * composition réelle (`fund_holdings`), pour servir de repli à
 * `assets.carbon_intensity_gco2e_per_eur` quand le fonds ne publie rien
 * lui-même (cf. lib/esg/carbon-engine.ts pour la méthodologie/priorité).
 *
 * I/O isolée (Supabase), logique de calcul 100% déléguée au moteur pur. Les
 * tables `issuer_emissions` / `sector_carbon_intensity` / `carbon_estimates`
 * ne sont pas encore dans les types Supabase auto-générés (régénérés après
 * migration) : accès via cast localisé, comme le reste du Data Engine.
 */

import type { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  estimateFundCarbonFromHoldings,
  GENERIC_SECTOR_KEY,
  type HoldingInput,
  type IssuerEmissionsRecord,
  type SectorBenchmark,
} from "./carbon-engine";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface HoldingRow {
  security_id: string | null;
  weight_pct: number | null;
}
interface SecurityRow {
  id: string;
  sector: string | null;
}
interface IssuerEmissionsRow {
  issuer_id: string;
  year: number;
  scope_1: number | null;
  scope_2: number | null;
  scope_3: number | null;
  revenue: number | null;
  evic: number | null;
  currency: string;
  data_quality: IssuerEmissionsRecord["dataQuality"];
  methodology: string | null;
  source: string;
}
interface SectorBenchmarkRow {
  sector: string;
  region: string;
  scope_1_2_intensity: number;
  currency: string;
  source: string;
  year: number;
}

/** Garde la ligne de l'année la plus récente pour chaque clé. */
function latestByKey<T extends { year: number }>(
  rows: T[],
  keyOf: (r: T) => string,
): Map<string, T> {
  const out = new Map<string, T>();
  for (const r of rows) {
    const k = keyOf(r);
    const prev = out.get(k);
    if (!prev || r.year > prev.year) out.set(k, r);
  }
  return out;
}

export interface FundCarbonComputation {
  assetId: string;
  intensityGco2ePerEur: number | null;
  coverage: number;
  sourcedCoverage: number;
  dataQuality: IssuerEmissionsRecord["dataQuality"];
  methodology: string;
  holdingsConsidered: number;
  holdingsCovered: number;
}

/**
 * Calcule (sans écrire) l'estimation carbone d'un fonds depuis sa dernière
 * composition connue. Retourne null si le fonds n'a aucune composition en base
 * (holdings jamais ingérés — pas un signal d'échec, juste rien à calculer).
 */
export async function computeFundCarbonEstimate(
  client: typeof supabaseAdmin,
  assetId: string,
): Promise<FundCarbonComputation | null> {
  const c = client as any;

  const { data: holdingRows, error: hErr } = await c
    .from("fund_latest_holdings")
    .select("security_id, weight_pct")
    .eq("asset_id", assetId);
  if (hErr) throw new Error(`fund_latest_holdings: ${hErr.message}`);
  const holdings = (holdingRows ?? []) as HoldingRow[];
  if (holdings.length === 0) return null;

  const securityIds = [
    ...new Set(holdings.map((h) => h.security_id).filter((v): v is string => !!v)),
  ];

  const [securitiesRes, emissionsRes, sectorRes] = await Promise.all([
    securityIds.length > 0
      ? c.from("securities").select("id, sector").in("id", securityIds)
      : Promise.resolve({ data: [] as SecurityRow[], error: null }),
    securityIds.length > 0
      ? c
          .from("issuer_emissions")
          .select(
            "issuer_id, year, scope_1, scope_2, scope_3, revenue, evic, currency, data_quality, methodology, source",
          )
          .in("issuer_id", securityIds)
      : Promise.resolve({ data: [] as IssuerEmissionsRow[], error: null }),
    c
      .from("sector_carbon_intensity")
      .select("sector, region, scope_1_2_intensity, currency, source, year"),
  ]);
  if (securitiesRes.error) throw new Error(`securities: ${securitiesRes.error.message}`);
  if (emissionsRes.error) throw new Error(`issuer_emissions: ${emissionsRes.error.message}`);
  if (sectorRes.error) throw new Error(`sector_carbon_intensity: ${sectorRes.error.message}`);

  const sectorBySecurity = new Map<string, string | null>(
    ((securitiesRes.data ?? []) as SecurityRow[]).map((s) => [s.id, s.sector]),
  );

  const emissionsByIssuer = new Map<string, IssuerEmissionsRecord>();
  for (const [issuerId, row] of latestByKey(
    (emissionsRes.data ?? []) as IssuerEmissionsRow[],
    (r) => r.issuer_id,
  )) {
    emissionsByIssuer.set(issuerId, {
      issuerId,
      year: row.year,
      scope1Tco2e: row.scope_1,
      scope2Tco2e: row.scope_2,
      scope3Tco2e: row.scope_3,
      revenue: row.revenue,
      evic: row.evic,
      currency: row.currency,
      dataQuality: row.data_quality,
      methodology: row.methodology,
      source: row.source,
    });
  }

  const sectorBenchmarks = new Map<string, SectorBenchmark>();
  for (const [key, row] of latestByKey(
    (sectorRes.data ?? []) as SectorBenchmarkRow[],
    (r) => `${r.sector}|${r.region}`,
  )) {
    sectorBenchmarks.set(key === `${GENERIC_SECTOR_KEY}|world` ? GENERIC_SECTOR_KEY : key, {
      sector: row.sector,
      region: row.region,
      scope12IntensityPerMEur: row.scope_1_2_intensity,
      currency: row.currency,
      source: row.source,
      year: row.year,
    });
  }

  const holdingInputs: HoldingInput[] = holdings.map((h) => ({
    securityId: h.security_id,
    weightPct: h.weight_pct ?? 0,
    sector: h.security_id ? (sectorBySecurity.get(h.security_id) ?? null) : null,
    region: null, // cf. carbon-engine.ts : pas de mapping pays→région fiable pour l'instant
  }));

  const est = estimateFundCarbonFromHoldings(holdingInputs, emissionsByIssuer, sectorBenchmarks);

  return {
    assetId,
    intensityGco2ePerEur: est.intensityGco2ePerEur,
    coverage: est.coverage,
    sourcedCoverage: est.sourcedCoverage,
    dataQuality: est.dataQuality,
    methodology: est.methodology,
    holdingsConsidered: est.holdingsConsidered,
    holdingsCovered: est.holdingsCovered,
  };
}

/** Calcule ET persiste (upsert) dans `carbon_estimates`. No-op si pas de holdings. */
export async function computeAndPersistFundCarbonEstimate(
  client: typeof supabaseAdmin,
  assetId: string,
): Promise<FundCarbonComputation | null> {
  const result = await computeFundCarbonEstimate(client, assetId);
  if (!result) return null;

  const c = client as any;
  const { error } = await c.from("carbon_estimates").upsert(
    {
      asset_id: assetId,
      as_of: new Date().toISOString().slice(0, 10),
      scope: "scope_1_2",
      intensity_gco2e_per_eur: result.intensityGco2ePerEur,
      coverage: result.coverage,
      sourced_coverage: result.sourcedCoverage,
      data_quality: result.dataQuality,
      methodology: result.methodology,
      holdings_considered: result.holdingsConsidered,
      holdings_covered: result.holdingsCovered,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "asset_id,as_of,scope" },
  );
  if (error) throw new Error(`carbon_estimates upsert: ${error.message}`);
  return result;
}

/* eslint-enable @typescript-eslint/no-explicit-any */
