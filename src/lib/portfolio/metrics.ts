import type { Asset, PortfolioWeights, PortfolioMetrics, AssetClass, PillarWeights } from "./types";
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
  // Real carbon footprint — weighted average of per-asset intensity, only over
  // assets that actually have a value. Coverage = share of weight with real data.
  let carbonNumerator = 0;
  let carbonCoverage = 0;
  // WACI (tCO2e/M$ CA) — même logique : moyenne pondérée sur la part couverte.
  let waciNumerator = 0;
  let waciCoverage = 0;

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
    // Real carbon intensity, when available
    if (a.carbon_intensity_gco2e_per_eur != null) {
      carbonNumerator += w * a.carbon_intensity_gco2e_per_eur;
      carbonCoverage += w;
    }
    // WACI émetteurs (données MSCI réelles), quand disponible
    if (a.waci_tco2e_per_musd_sales != null) {
      waciNumerator += w * a.waci_tco2e_per_musd_sales;
      waciCoverage += w;
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
    equity_dev: 0,
    equity_em: 0,
    thematic: 0,
    green_bond: 0,
    corporate_bond: 0,
    social_bond: 0,
    sov_bond: 0,
    reit: 0,
    commodity: 0,
    cash: 0,
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
  const waci = waciCoverage > 0 ? waciNumerator / waciCoverage : null;

  return {
    expected_return: portfolioReturn,
    volatility: vol,
    sharpe,
    esg_score: portfolioESG,
    ter: portfolioTER,
    carbon_intensity_gco2e_per_eur: realCarbon,
    carbon_intensity_coverage: carbonCoverage,
    waci_tco2e_per_musd_sales: waci,
    waci_coverage: waciCoverage,
    by_class: byClass,
    by_region: byRegion,
    diversification,
  };
}
