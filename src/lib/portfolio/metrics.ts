import type {
  Asset,
  PortfolioWeights,
  PortfolioMetrics,
  AssetClass,
  PillarWeights,
} from "./types";
import { DEFAULT_PILLAR_WEIGHTS, compositeEsgScore } from "./types";

export function computeMetrics(
  assets: Asset[],
  weights: PortfolioWeights,
  covariance: number[][],
  expectedReturns: number[],
  pillarWeights: PillarWeights = DEFAULT_PILLAR_WEIGHTS,
): PortfolioMetrics {
  const idx = new Map(assets.map((a, i) => [a.id, i]));

  let portfolioReturn = 0;
  let portfolioTER = 0;
  let portfolioESG = 0;
  let portfolioCO2 = 0;
  // Real carbon footprint — weighted average of per-asset intensity, only over
  // assets that actually have a value. Coverage = share of weight with real data.
  let carbonNumerator = 0;
  let carbonCoverage = 0;

  for (const id in weights) {
    const i = idx.get(id);
    if (i === undefined) continue;
    const w = weights[id];
    const a = assets[i];
    portfolioReturn += w * expectedReturns[i];
    portfolioTER += w * a.ter;
    // Composite ESG: pillar-weighted, with per-pillar fallback to global esg_score
    const composite = compositeEsgScore(a, pillarWeights);
    portfolioESG += w * composite;
    // CO2 heuristic — kept until per-asset carbon_intensity is available in DB.
    // Documented as an indicative estimate, not a regulatory figure.
    const esgDelta = Math.max(0, composite - 50);
    portfolioCO2 += w * esgDelta * 0.04;
    // Real carbon intensity, when available
    if (a.carbon_intensity_gco2e_per_eur != null) {
      carbonNumerator += w * a.carbon_intensity_gco2e_per_eur;
      carbonCoverage += w;
    }
  }

  // Portfolio variance: wᵀΣw
  let variance = 0;
  for (const idA in weights) {
    const i = idx.get(idA);
    if (i === undefined) continue;
    for (const idB in weights) {
      const j = idx.get(idB);
      if (j === undefined) continue;
      variance += weights[idA] * weights[idB] * covariance[i][j];
    }
  }
  const vol = Math.sqrt(Math.max(0, variance));

  const riskFreeRate = 0.025;
  const sharpe = vol > 0 ? (portfolioReturn - portfolioTER - riskFreeRate) / vol : 0;

  const byClass: Record<AssetClass, number> = {
    equity_dev: 0, equity_em: 0, thematic: 0,
    green_bond: 0, social_bond: 0, sov_bond: 0,
    reit: 0, commodity: 0, cash: 0,
  };
  const byRegion: Record<string, number> = {};

  for (const id in weights) {
    const i = idx.get(id);
    if (i === undefined) continue;
    const a = assets[i];
    byClass[a.asset_class] += weights[id];
    const r = a.region ?? "world";
    byRegion[r] = (byRegion[r] ?? 0) + weights[id];
  }

  let hhi = 0;
  for (const id in weights) hhi += weights[id] * weights[id];
  const diversification = 1 - hhi;

  // Rescale carbon to per-€ figure on covered assets only (intensive measure).
  const realCarbon = carbonCoverage > 0 ? carbonNumerator / carbonCoverage : null;

  return {
    expected_return: portfolioReturn,
    volatility: vol,
    sharpe,
    esg_score: portfolioESG,
    ter: portfolioTER,
    co2_avoided_tons: portfolioCO2,
    carbon_intensity_gco2e_per_eur: realCarbon,
    carbon_intensity_coverage: carbonCoverage,
    by_class: byClass,
    by_region: byRegion,
    diversification,
  };
}
