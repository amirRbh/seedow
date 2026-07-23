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

// ─────────────────────────────────────────────────────────────────────────────
// Robustesse statistique — deux estimateurs « institutionnels » remplacent les
// estimateurs bruts, pour que le modèle de risque tienne devant un comité quant :
//
//  1. Rendements attendus : shrinkage de James-Stein / Bayes-Stein vers la
//     moyenne transversale. La moyenne historique annualisée est l'estimateur le
//     plus bruité connu du rendement espéré (Merton 1980) et déstabilise
//     notoirement l'optimisation moyenne-variance (Michaud 1989). On la ramène
//     vers la moyenne commune d'autant plus fort que le signal (la dispersion
//     entre actifs) est faible devant le bruit d'estimation — estimateur qui
//     domine le maximum de vraisemblance (James & Stein 1961 ; Jorion 1986, JFQA).
//
//  2. Covariance : shrinkage de Ledoit-Wolf de la matrice de CORRÉLATION vers une
//     cible à corrélation constante (Ledoit & Wolf 2004, J. Portfolio Mgmt), puis
//     rééchelonnage par les volatilités plein-historique. La covariance
//     échantillon est mal conditionnée dès que le nombre d'actifs approche le
//     nombre d'observations ; le shrinkage la régularise et stabilise fortement
//     les poids sortant de l'optimiseur.
// ─────────────────────────────────────────────────────────────────────────────

/** James-Stein exige au moins 3 séries pour dominer le MLE. */
export const RETURN_SHRINKAGE_MIN_ASSETS = 3;

/**
 * Shrinkage de James-Stein des rendements attendus vers la moyenne transversale.
 *
 * μ̂ᵢ = μ̄ + (1 − w)·(μᵢ − μ̄),  avec w = min(1, (N−2)·moy(SEᵢ²) / Σ(μᵢ − μ̄)²).
 *
 * SEᵢ² = variance d'estimation de la moyenne annualisée = 252·σ²ᵢ/Tᵢ
 * (car Var(252·m) = 252²·σ²_quotidien/T = 252·σ²_annuel/T). Quand le signal
 * (dispersion) est faible devant le bruit, w→1 et tout est ramené vers μ̄.
 *
 * Renvoie une NOUVELLE Map ; la moyenne transversale est préservée (invariant
 * testable). En dessous de RETURN_SHRINKAGE_MIN_ASSETS actifs, renvoie une copie
 * inchangée (le shrinkage n'a pas de sens).
 */
export function shrinkExpectedReturns(
  stats: Map<string, AssetRiskStats>,
): Map<string, AssetRiskStats> {
  const ids = Array.from(stats.keys());
  const n = ids.length;
  if (n < RETURN_SHRINKAGE_MIN_ASSETS) return new Map(stats);

  const mus = ids.map((id) => stats.get(id)!.expectedReturn);
  const grand = mean(mus);

  const se2 = ids.map((id) => {
    const s = stats.get(id)!;
    return s.observations > 0 ? (TRADING_DAYS_PER_YEAR * s.volatility ** 2) / s.observations : 0;
  });
  const avgSe2 = mean(se2);
  const dispersion = mus.reduce((acc, m) => acc + (m - grand) ** 2, 0);

  const w = dispersion > 0 ? Math.min(1, ((n - 2) * avgSe2) / dispersion) : 1;

  const out = new Map<string, AssetRiskStats>();
  ids.forEach((id, i) => {
    const s = stats.get(id)!;
    out.set(id, { ...s, expectedReturn: grand + (1 - w) * (mus[i] - grand) });
  });
  return out;
}

/** Aligne les rendements des `ids` sur leurs dates communes (intersection). */
function alignReturns(returnsByAsset: Map<string, DatedReturn[]>, ids: string[]): number[][] {
  const maps = ids.map(
    (id) => new Map((returnsByAsset.get(id) ?? []).map((r) => [r.date, r.ret] as const)),
  );
  if (maps.length === 0) return [];
  let commonDates = Array.from(maps[0].keys());
  for (let i = 1; i < maps.length; i++) {
    const m = maps[i];
    commonDates = commonDates.filter((d) => m.has(d));
  }
  commonDates.sort();
  return maps.map((m) => commonDates.map((d) => m.get(d)!));
}

function identityCorrelation(n: number): number[][] {
  const R = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) R[i][i] = 1;
  return R;
}

export interface LedoitWolfResult {
  /** Intensité de shrinkage retenue δ ∈ [0,1] (0 = corrélation échantillon pure). */
  delta: number;
  /** Corrélation moyenne hors-diagonale r̄ (cible du shrinkage). */
  avgCorrelation: number;
  /** Matrice de corrélation shrinkée vers la corrélation constante. */
  shrunkCorrelation: number[][];
}

/**
 * Shrinkage de Ledoit-Wolf vers une corrélation constante, sur rendements
 * standardisés (variance unitaire), donc directement sur la matrice de
 * corrélation (Sᵢᵢ = 1). Calcule l'intensité optimale δ = max(0, min(1, κ/T))
 * avec κ = (π − ρ)/γ (Ledoit & Wolf 2004, cible corrélation constante).
 *
 * n < 2 ou T < MIN_OBSERVATIONS : identité de corrélation, δ = 0 (pas assez de
 * données pour estimer un shrinkage fiable).
 */
export function ledoitWolfConstantCorrelation(matrix: number[][]): LedoitWolfResult {
  const n = matrix.length;
  const T = n > 0 ? matrix[0].length : 0;
  if (n < 2 || T < MIN_OBSERVATIONS) {
    return { delta: 0, avgCorrelation: 0, shrunkCorrelation: identityCorrelation(n) };
  }

  // Standardisation z_it = (x_it − m_i)/sd_i (sd échantillon en 1/T).
  const z: number[][] = matrix.map((row) => {
    const m = mean(row);
    const sd = Math.sqrt(row.reduce((a, x) => a + (x - m) ** 2, 0) / T) || 1;
    return row.map((x) => (x - m) / sd);
  });

  // Corrélation échantillon R.
  const R: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    R[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      let s = 0;
      for (let t = 0; t < T; t++) s += z[i][t] * z[j][t];
      const rij = s / T;
      R[i][j] = rij;
      R[j][i] = rij;
    }
  }

  // r̄ = corrélation moyenne hors-diagonale.
  let sumR = 0;
  let cnt = 0;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      sumR += R[i][j];
      cnt++;
    }
  const rBar = cnt > 0 ? sumR / cnt : 0;

  // π, ρ, γ (données standardisées : Sᵢᵢ = 1).
  let pi = 0;
  let rho = 0;
  let gamma = 0;
  for (let i = 0; i < n; i++) {
    let piii = 0;
    for (let t = 0; t < T; t++) piii += (z[i][t] * z[i][t] - 1) ** 2;
    piii /= T;
    pi += piii;
    rho += piii; // Σ π_ii
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const rij = R[i][j];
      let piij = 0;
      let tii = 0;
      let tjj = 0;
      for (let t = 0; t < T; t++) {
        const cross = z[i][t] * z[j][t] - rij;
        piij += cross ** 2;
        tii += (z[i][t] * z[i][t] - 1) * cross;
        tjj += (z[j][t] * z[j][t] - 1) * cross;
      }
      piij /= T;
      tii /= T;
      tjj /= T;
      pi += piij;
      gamma += (rBar - rij) ** 2;
      rho += (rBar / 2) * (tii + tjj);
    }
  }

  let delta = 0;
  if (gamma > 1e-12) {
    delta = Math.max(0, Math.min(1, (pi - rho) / gamma / T));
  }

  const shrunk: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    shrunk[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const v = delta * rBar + (1 - delta) * R[i][j];
      shrunk[i][j] = v;
      shrunk[j][i] = v;
    }
  }
  return { delta, avgCorrelation: rBar, shrunkCorrelation: shrunk };
}

export interface RiskModelDiagnostics {
  /** Intensité de shrinkage de covariance appliquée (0 si repli pairwise). */
  covarianceShrinkage: number;
  /** Corrélation moyenne estimée (cible du shrinkage). */
  avgCorrelation: number;
  /** Nombre d'observations de la fenêtre commune utilisée pour la corrélation. */
  commonObservations: number;
}

export interface RiskModelResultV2 extends RiskModelResult {
  diagnostics: RiskModelDiagnostics;
}

/**
 * Construit le modèle de risque complet pour un ensemble d'actifs.
 *
 * Rendements attendus shrinkés (James-Stein) ; covariance = corrélation shrinkée
 * (Ledoit-Wolf) rééchelonnée par les volatilités plein-historique, avec repli
 * sur la covariance pairwise pour les actifs hors de la fenêtre commune
 * (historique hétérogène). La diagonale reste exactement la variance
 * plein-historique. Un actif sans historique suffisant est absent de `stats` et
 * de `covariance` (diagonale incluse) et listé dans `skipped`.
 */
export function buildRiskModel(pricesByAsset: Map<string, PricePoint[]>): RiskModelResultV2 {
  const rawStats = new Map<string, AssetRiskStats>();
  const skipped: string[] = [];
  const returnsByAsset = new Map<string, DatedReturn[]>();

  for (const [id, prices] of pricesByAsset) {
    returnsByAsset.set(id, computeLogReturns(prices));
    const s = computeAssetRiskStats(prices);
    if (s) rawStats.set(id, s);
    else skipped.push(id);
  }

  // 1. Shrinkage des rendements attendus.
  const stats = shrinkExpectedReturns(rawStats);
  const ids = Array.from(stats.keys());

  // 2. Covariance.
  const covariance = new Map<string, number>();
  for (const id of ids) {
    covariance.set(`${id}|${id}`, stats.get(id)!.volatility ** 2);
  }

  const matrix = alignReturns(returnsByAsset, ids);
  const commonT = matrix.length > 0 ? matrix[0].length : 0;
  const lw = ledoitWolfConstantCorrelation(matrix);
  const alignedUsable = ids.length >= 2 && commonT >= MIN_OBSERVATIONS;

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const idA = ids[i];
      const idB = ids[j];
      let cov: number | null = null;
      if (alignedUsable) {
        cov = lw.shrunkCorrelation[i][j] * stats.get(idA)!.volatility * stats.get(idB)!.volatility;
      } else {
        const pw = computePairwiseCovariance(pricesByAsset.get(idA)!, pricesByAsset.get(idB)!);
        if (pw) cov = pw.covariance;
      }
      if (cov == null) continue;
      covariance.set(`${idA}|${idB}`, cov);
      covariance.set(`${idB}|${idA}`, cov);
    }
  }

  return {
    stats,
    covariance,
    skipped,
    diagnostics: {
      covarianceShrinkage: alignedUsable ? lw.delta : 0,
      avgCorrelation: alignedUsable ? lw.avgCorrelation : 0,
      commonObservations: commonT,
    },
  };
}
