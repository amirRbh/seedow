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
  esg_score: number;
  sfdr_article: number | null;
  expected_return: number;
  volatility: number;
  cause_exposure: Record<string, number>;
  excluded_sectors: ExclusionTag[];
  description: string | null;
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
  co2_avoided_tons: number;     // estimation per 10k€ invested
  by_class: Record<AssetClass, number>;
  by_region: Record<string, number>;
  diversification: number;      // 1 - HHI
}

export interface PortfolioResult {
  weights: PortfolioWeights;
  metrics: PortfolioMetrics;
  selected_assets: Asset[];
  excluded_count: number;       // assets removed by filter
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
