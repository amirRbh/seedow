// Domain types for the portfolio construction engine

export type AssetClass =
  | "equity_dev"
  | "equity_em"
  | "thematic"
  | "green_bond"
  | "social_bond"
  | "sov_bond"
  | "reit"
  | "commodity"
  | "cash";

export type CauseTag =
  | "climat"
  | "biodiversite"
  | "humain"
  | "egalite"
  | "tech"
  | "circulaire";

export type ExclusionTag =
  | "fossiles"
  | "armes"
  | "tabac"
  | "jeux"
  | "animaux"
  | "fast-fashion";

export interface Asset {
  id: string;
  ticker: string;
  name: string;
  asset_class: AssetClass;
  region: string | null;
  ter: number;
  esg_score: number;          // global aggregate (0–100), back-compat
  env_score: number | null;   // pillar E (0–100), nullable → falls back to esg_score
  social_score: number | null;
  governance_score: number | null;
  esg_score_source: string | null;  // MSCI, Sustainalytics, Yahoo, manual...
  carbon_intensity_gco2e_per_eur: number | null;  // gCO2e per € invested per year
  carbon_intensity_source: string | null;
  carbon_intensity_updated_at: string | null;     // ISO timestamp
  sfdr_article: number | null;
  expected_return: number;
  volatility: number;
  cause_exposure: Record<string, number>;
  excluded_sectors: ExclusionTag[];
  description: string | null;
}

/**
 * Pillar weights used when computing a composite ESG score.
 * Defaults follow common SFDR practice (40/40/20). Active causes shift weight
 * towards the relevant pillar — see causeToPillarWeights().
 */
export interface PillarWeights {
  env: number;        // 0..1
  social: number;     // 0..1
  governance: number; // 0..1
}

export const DEFAULT_PILLAR_WEIGHTS: PillarWeights = {
  env: 0.4,
  social: 0.4,
  governance: 0.2,
};

/**
 * Map active causes onto pillar weight shifts.
 * - Climat / biodiversité → boost E
 * - Humain / égalité      → boost S
 * - Tech / circulaire     → neutre (légère faveur G)
 *
 * The result is renormalised so weights always sum to 1.
 */
export function causeToPillarWeights(causes: CauseTag[]): PillarWeights {
  if (causes.length === 0) return { ...DEFAULT_PILLAR_WEIGHTS };
  let env = DEFAULT_PILLAR_WEIGHTS.env;
  let social = DEFAULT_PILLAR_WEIGHTS.social;
  let governance = DEFAULT_PILLAR_WEIGHTS.governance;
  const STEP = 0.1;
  for (const c of causes) {
    if (c === "climat" || c === "biodiversite") env += STEP;
    else if (c === "humain" || c === "egalite") social += STEP;
    else if (c === "tech" || c === "circulaire") governance += STEP * 0.5;
  }
  const sum = env + social + governance;
  return { env: env / sum, social: social / sum, governance: governance / sum };
}

/**
 * Composite ESG score from pillar scores.
 * If any pillar is missing on the asset, falls back to the aggregate esg_score
 * for that pillar only (so partial data degrades gracefully).
 */
export function compositeEsgScore(asset: Asset, w: PillarWeights): number {
  const e = asset.env_score ?? asset.esg_score;
  const s = asset.social_score ?? asset.esg_score;
  const g = asset.governance_score ?? asset.esg_score;
  return w.env * e + w.social * s + w.governance * g;
}

export interface PortfolioParams {
  causes: CauseTag[];
  cause_intensity: Partial<Record<CauseTag, number>>; // 0..1
  exclusions: ExclusionTag[];
  risk_target: number;          // annualised vol target, e.g. 0.10
  horizon_years: number;
  initial_amount: number;
}

export interface PortfolioWeights {
  [assetId: string]: number;    // sums to 1
}

export interface PortfolioMetrics {
  expected_return: number;
  volatility: number;
  sharpe: number;
  esg_score: number;
  ter: number;
  co2_avoided_tons: number;     // heuristic estimate (per 10k€ invested)
  // Real carbon footprint when per-asset intensity data is available.
  // null if no asset in the selection has a carbon_intensity_gco2e_per_eur value.
  carbon_intensity_gco2e_per_eur: number | null;  // weighted, gCO2e per € per year
  carbon_intensity_coverage: number;              // 0..1, share of weight with real data
  by_class: Record<AssetClass, number>;
  by_region: Record<string, number>;
  diversification: number;      // 1 - HHI
}

export interface PortfolioResult {
  weights: PortfolioWeights;
  metrics: PortfolioMetrics;
  selected_assets: Asset[];
  excluded_count: number;       // assets removed by filter
  esg_floor_relaxed: boolean;   // true if QP couldn't satisfy MIN_PORTFOLIO_ESG
  methodology_version: string;
}

// Default risk targets per horizon goal
export const DEFAULT_RISK_BY_HORIZON: Record<number, number> = {
  1: 0.04,   // 1y
  3: 0.06,   // 1-3y
  5: 0.09,   // 5y
  10: 0.11,  // 10y
  20: 0.14,  // 20y+
};

// Asset-class bounds per risk profile (min, max share of portfolio)
export interface ClassBounds {
  min: number;
  max: number;
}

export function getClassBounds(riskTarget: number): Record<AssetClass, ClassBounds> {
  // Defensive (low risk) → bonds-heavy
  if (riskTarget <= 0.05) {
    return {
      equity_dev: { min: 0.05, max: 0.20 },
      equity_em: { min: 0.0, max: 0.05 },
      thematic: { min: 0.0, max: 0.05 },
      green_bond: { min: 0.20, max: 0.45 },
      social_bond: { min: 0.05, max: 0.20 },
      sov_bond: { min: 0.20, max: 0.40 },
      reit: { min: 0.0, max: 0.05 },
      commodity: { min: 0.0, max: 0.05 },
      cash: { min: 0.05, max: 0.20 },
    };
  }
  // Balanced
  if (riskTarget <= 0.09) {
    return {
      equity_dev: { min: 0.20, max: 0.45 },
      equity_em: { min: 0.0, max: 0.10 },
      thematic: { min: 0.05, max: 0.20 },
      green_bond: { min: 0.10, max: 0.30 },
      social_bond: { min: 0.0, max: 0.15 },
      sov_bond: { min: 0.05, max: 0.25 },
      reit: { min: 0.0, max: 0.10 },
      commodity: { min: 0.0, max: 0.08 },
      cash: { min: 0.0, max: 0.10 },
    };
  }
  // Dynamic (high risk) → equity-heavy
  return {
    equity_dev: { min: 0.30, max: 0.60 },
    equity_em: { min: 0.05, max: 0.20 },
    thematic: { min: 0.10, max: 0.35 },
    green_bond: { min: 0.05, max: 0.20 },
    social_bond: { min: 0.0, max: 0.10 },
    sov_bond: { min: 0.0, max: 0.15 },
    reit: { min: 0.0, max: 0.15 },
    commodity: { min: 0.0, max: 0.10 },
    cash: { min: 0.0, max: 0.05 },
  };
}

// Per-line max weight (no concentration)
export const MAX_SINGLE_WEIGHT = 0.25;
// Min ESG score the portfolio must achieve
export const MIN_PORTFOLIO_ESG = 70;
