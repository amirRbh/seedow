import type { Asset, AssetClass, CauseTag, ExclusionTag } from "../types";

export interface AssetOverrides {
  id?: string;
  ticker?: string;
  name?: string;
  asset_class?: AssetClass;
  region?: string | null;
  ter?: number;
  esg_score?: number;
  env_score?: number | null;
  social_score?: number | null;
  governance_score?: number | null;
  esg_score_source?: string | null;
  carbon_intensity_gco2e_per_eur?: number | null;
  carbon_intensity_source?: string | null;
  carbon_intensity_updated_at?: string | null;
  sfdr_article?: number | null;
  expected_return?: number;
  volatility?: number;
  cause_exposure?: Record<string, number>;
  excluded_sectors?: ExclusionTag[];
  description?: string | null;
}

let counter = 0;

export function makeAsset(overrides: AssetOverrides = {}): Asset {
  const id = overrides.id ?? `asset-${++counter}`;
  return {
    id,
    ticker: overrides.ticker ?? id.toUpperCase(),
    name: overrides.name ?? `Asset ${id}`,
    asset_class: overrides.asset_class ?? "equity_dev",
    region: overrides.region ?? "world",
    ter: overrides.ter ?? 0.002,
    esg_score: overrides.esg_score ?? 75,
    env_score: overrides.env_score ?? null,
    social_score: overrides.social_score ?? null,
    governance_score: overrides.governance_score ?? null,
    esg_score_source: overrides.esg_score_source ?? "manual",
    carbon_intensity_gco2e_per_eur: overrides.carbon_intensity_gco2e_per_eur ?? null,
    carbon_intensity_source: overrides.carbon_intensity_source ?? null,
    carbon_intensity_updated_at: overrides.carbon_intensity_updated_at ?? null,
    sfdr_article: overrides.sfdr_article ?? null,
    expected_return: overrides.expected_return ?? 0.06,
    volatility: overrides.volatility ?? 0.15,
    cause_exposure: overrides.cause_exposure ?? {},
    excluded_sectors: overrides.excluded_sectors ?? [],
    description: overrides.description ?? null,
  };
}

/**
 * Build a diagonal covariance matrix from an asset list (uncorrelated).
 * Diagonal = volatility². Deterministic and well-conditioned.
 */
export function diagonalCovariance(assets: Asset[]): number[][] {
  const n = assets.length;
  const cov: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array<number>(n).fill(0);
    row[i] = assets[i].volatility * assets[i].volatility;
    cov.push(row);
  }
  return cov;
}

/** Sparse covariance Map keyed by "idA|idB" — matches engine.buildCovariance. */
export function diagonalCovMap(assets: Asset[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of assets) {
    m.set(`${a.id}|${a.id}`, a.volatility * a.volatility);
  }
  return m;
}

export function defaultParams(overrides: Partial<import("../types").PortfolioParams> = {}) {
  return {
    causes: [] as CauseTag[],
    cause_intensity: {} as Partial<Record<CauseTag, number>>,
    exclusions: [] as ExclusionTag[],
    risk_target: 0.09,
    horizon_years: 10,
    initial_amount: 10000,
    ...overrides,
  };
}

/** Build a diverse universe hitting every asset class at least once. */
export function balancedUniverse(): Asset[] {
  const classes: AssetClass[] = [
    "equity_dev",
    "equity_em",
    "thematic",
    "green_bond",
    "corporate_bond",
    "social_bond",
    "sov_bond",
    "reit",
    "commodity",
    "cash",
  ];
  const out: Asset[] = [];
  for (const cls of classes) {
    // 5 assets per class → best-in-class keeps top 50% (indices 2,3,4)
    for (let i = 0; i < 5; i++) {
      out.push(
        makeAsset({
          id: `${cls}-${i}`,
          asset_class: cls,
          esg_score: 70 + i * 3, // 70..82
          env_score: 70 + i * 3,
          social_score: 70 + i * 3,
          governance_score: 70 + i * 3,
          expected_return: 0.05 + i * 0.005,
          volatility: 0.12 + i * 0.01,
        }),
      );
    }
  }
  return out;
}
