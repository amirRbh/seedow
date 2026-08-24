import type { Asset, PortfolioWeights, PortfolioMetrics, AssetClass, PillarWeights } from "./types";
import { DEFAULT_PILLAR_WEIGHTS, compositeEsgScore, isEsgSourced } from "./types";
import { sumWeights } from "./weights";
import { CARBON_QUALITY_RANK, type CarbonDataQuality } from "@/lib/esg/carbon-engine";

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
  // Part du poids dont le score ESG est réellement sourcé (fournisseur externe)
  // plutôt qu'estimé maison — honnêteté §1.2, jamais un estimé présenté en mesuré.
  let esgSourcedWeight = 0;
  let esgTotalWeight = 0;
  // Real carbon footprint — weighted average of per-asset intensity, only over
  // assets that actually have a value. Coverage = share of weight with real data.
  let carbonNumerator = 0;
  let carbonCoverage = 0;
  // Part de la couverture carbone qui est directement sourcée (measured/reported)
  // plutôt qu'estimée bottom-up, et palier le moins bon parmi les actifs couverts
  // (label honnête du portefeuille — cf. lib/esg/carbon-engine.ts).
  let carbonSourcedNumerator = 0;
  let carbonWorstQuality: CarbonDataQuality | null = null;
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
    esgTotalWeight += w;
    if (isEsgSourced(a)) esgSourcedWeight += w;
    // Real carbon intensity, when available
    if (a.carbon_intensity_gco2e_per_eur != null) {
      carbonNumerator += w * a.carbon_intensity_gco2e_per_eur;
      carbonCoverage += w;
      // Legacy assets with a value but no explicit quality predate this engine
      // and always came from a direct fund-level disclosure → treat as measured.
      const quality = a.carbon_data_quality ?? "measured";
      const sourcedRatio = a.carbon_sourced_ratio ?? 1;
      carbonSourcedNumerator += w * sourcedRatio;
      if (
        carbonWorstQuality == null ||
        CARBON_QUALITY_RANK[quality] > CARBON_QUALITY_RANK[carbonWorstQuality]
      ) {
        carbonWorstQuality = quality;
      }
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

  // Part réellement placée : les poids ne somment plus forcément à 1 depuis que
  // Seedow enregistre la composition telle qu'elle est saisie. Ce qui reste est
  // du liquide non attribué.
  const allocated = sumWeights(weights);

  // Diversification et score ESG sont des MOYENNES : elles se lisent sur la part
  // allouée, pas sur le montant total. Sans cette normalisation, ne placer que
  // 10 % sur une seule ligne passerait pour un portefeuille parfaitement
  // diversifié, et la part non attribuée pèserait un score ESG de 0 qu'aucune
  // donnée ne justifie. À 100 % alloué, le calcul est inchangé.
  let hhi = 0;
  if (allocated > 0) {
    for (const id in weights) {
      const share = weights[id] / allocated;
      hhi += share * share;
    }
  }
  const diversification = allocated > 0 ? 1 - hhi : 0;

  // Rescale carbon to per-€ figure on covered assets only (intensive measure).
  const realCarbon = carbonCoverage > 0 ? carbonNumerator / carbonCoverage : null;
  const waci = waciCoverage > 0 ? waciNumerator / waciCoverage : null;

  return {
    expected_return: portfolioReturn,
    volatility: vol,
    sharpe,
    esg_score: esgTotalWeight > 0 ? portfolioESG / esgTotalWeight : 0,
    esg_sourced_share: esgTotalWeight > 0 ? esgSourcedWeight / esgTotalWeight : null,
    ter: portfolioTER,
    carbon_intensity_gco2e_per_eur: realCarbon,
    carbon_intensity_coverage: carbonCoverage,
    carbon_sourced_share: carbonCoverage > 0 ? carbonSourcedNumerator / carbonCoverage : null,
    carbon_data_quality: carbonWorstQuality,
    waci_tco2e_per_musd_sales: waci,
    waci_coverage: waciCoverage,
    by_class: byClass,
    by_region: byRegion,
    diversification,
    allocated_share: allocated,
  };
}
