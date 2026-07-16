/**
 * Modèle de risque — rendement attendu, volatilité et covariance annualisés,
 * calculés à partir de l'historique réel de prix (`asset_prices`, alimenté par
 * le refresh Yahoo). Remplace les valeurs figées saisies au seed par des
 * statistiques recalculables à partir du marché réel.
 *
 * Méthodologie : rendements log quotidiens sur les clôtures, annualisés sur
 * une base de 252 jours de bourse. Variance/covariance avec correction de
 * Bessel (n-1). Un actif avec un historique trop court (< MIN_OBSERVATIONS
 * rendements) est ignoré plutôt que d'écraser une valeur existante avec une
 * estimation non fiable — voir buildRiskModel.
 */

export interface PricePoint {
  date: string; // YYYY-MM-DD
  close: number;
}

export interface AssetRiskStats {
  expectedReturn: number; // annualisé
  volatility: number; // annualisé
  observations: number;
}

export interface RiskModelResult {
  /** assetId -> stats, uniquement pour les actifs avec assez d'historique. */
  stats: Map<string, AssetRiskStats>;
  /** "idA|idB" -> covariance annualisée. Symétrique (idA|idB et idB|idA présents) + diagonale (idA|idA = variance). */
  covariance: Map<string, number>;
  /** Ids ignorés faute d'historique suffisant. */
  skipped: string[];
}

export const MIN_OBSERVATIONS = 40;
const TRADING_DAYS_PER_YEAR = 252;
// Garde-fou contre un tick de prix aberrant (split non ajusté, erreur fournisseur) :
// un rendement log quotidien > 50% en valeur absolue est écarté plutôt que
// de contaminer toute l'estimation.
const MAX_ABS_DAILY_LOG_RETURN = 0.5;

interface DatedReturn {
  date: string;
  ret: number;
}

export function computeLogReturns(prices: PricePoint[]): DatedReturn[] {
  const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date));
  const returns: DatedReturn[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].close;
    const cur = sorted[i].close;
    if (!(prev > 0) || !(cur > 0)) continue;
    const ret = Math.log(cur / prev);
    if (!Number.isFinite(ret) || Math.abs(ret) > MAX_ABS_DAILY_LOG_RETURN) continue;
    returns.push({ date: sorted[i].date, ret });
  }
  return returns;
}

function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function sampleVariance(xs: number[], m = mean(xs)): number {
  if (xs.length < 2) return 0;
  const sumSq = xs.reduce((s, x) => s + (x - m) ** 2, 0);
  return sumSq / (xs.length - 1);
}

export function computeAssetRiskStats(prices: PricePoint[]): AssetRiskStats | null {
  const returns = computeLogReturns(prices).map((r) => r.ret);
  if (returns.length < MIN_OBSERVATIONS) return null;
  const m = mean(returns);
  const variance = sampleVariance(returns, m);
  return {
    expectedReturn: m * TRADING_DAYS_PER_YEAR,
    volatility: Math.sqrt(variance * TRADING_DAYS_PER_YEAR),
    observations: returns.length,
  };
}

export function computePairwiseCovariance(
  pricesA: PricePoint[],
  pricesB: PricePoint[],
): { covariance: number; observations: number } | null {
  const retA = computeLogReturns(pricesA);
  const retB = computeLogReturns(pricesB);
  const byDateB = new Map(retB.map((r) => [r.date, r.ret]));

  const xs: number[] = [];
  const ys: number[] = [];
  for (const a of retA) {
    const b = byDateB.get(a.date);
    if (b !== undefined) {
      xs.push(a.ret);
      ys.push(b);
    }
  }
  if (xs.length < MIN_OBSERVATIONS) return null;

  const meanX = mean(xs);
  const meanY = mean(ys);
  let sum = 0;
  for (let i = 0; i < xs.length; i++) sum += (xs[i] - meanX) * (ys[i] - meanY);
  const cov = sum / (xs.length - 1);
  return { covariance: cov * TRADING_DAYS_PER_YEAR, observations: xs.length };
}

/**
 * Construit le modèle de risque complet pour un ensemble d'actifs.
 * Un actif sans historique suffisant est absent de `stats` et de `covariance`
 * (diagonale incluse) et listé dans `skipped` — à l'appelant de décider de
 * conserver l'ancienne valeur DB pour ces actifs plutôt que de l'écraser.
 */
export function buildRiskModel(pricesByAsset: Map<string, PricePoint[]>): RiskModelResult {
  const stats = new Map<string, AssetRiskStats>();
  const skipped: string[] = [];

  for (const [id, prices] of pricesByAsset) {
    const s = computeAssetRiskStats(prices);
    if (s) stats.set(id, s);
    else skipped.push(id);
  }

  const covariance = new Map<string, number>();
  const ids = Array.from(stats.keys());
  for (let i = 0; i < ids.length; i++) {
    const idA = ids[i];
    const varA = stats.get(idA)!.volatility ** 2;
    covariance.set(`${idA}|${idA}`, varA);
    for (let j = i + 1; j < ids.length; j++) {
      const idB = ids[j];
      const result = computePairwiseCovariance(pricesByAsset.get(idA)!, pricesByAsset.get(idB)!);
      if (!result) continue;
      covariance.set(`${idA}|${idB}`, result.covariance);
      covariance.set(`${idB}|${idA}`, result.covariance);
    }
  }

  return { stats, covariance, skipped };
}
