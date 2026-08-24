/**
 * Allocateurs « risk-based » sans estimation de rendement attendu (X1, NEXT).
 *
 * Motivation (audit méthodo V2, faiblesse n°9) : la moyenne historique de μ est
 * l'estimateur le plus bruité qui soit (Merton 1980) et déstabilise
 * l'optimisation moyenne-variance (Michaud 1989). Sur ~2 ans d'historique et un
 * univers étroit, une MVO même shrinkée reste sur-paramétrée. Le risk-parity ne
 * dépend QUE de la covariance (pas de μ) → plus robuste et plus facile à
 * défendre devant un comité.
 *
 * Deux allocateurs, PURS, sans I/O :
 *   1. inverseVolatilityWeights — « naive risk parity » (w ∝ 1/σᵢ). Trivialement
 *      correct, exact quand les corrélations sont égales.
 *   2. riskParityWeights — Equal Risk Contribution (ERC) complet, long-only, via
 *      cyclical coordinate descent (Griveau-Billion, Richard & Roncalli 2013).
 *      Chaque actif contribue à parts égales au risque total du portefeuille.
 *
 * Ces fonctions ne sont PAS encore câblées dans le moteur par défaut
 * (`engine.ts` reste sur Markowitz) : elles constituent la brique validée d'un
 * futur chemin A/B, à activer derrière un flag après backtest (roadmap L1).
 */

/** Contribution au risque de chaque actif : RCᵢ = wᵢ·(Σw)ᵢ / (wᵀΣw). Somme = 1. */
export function riskContributions(weights: number[], covariance: number[][]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const sigmaW = matVec(covariance, weights);
  let variance = 0;
  for (let i = 0; i < n; i++) variance += weights[i] * sigmaW[i];
  if (variance <= 0) return new Array(n).fill(0);
  return weights.map((w, i) => (w * sigmaW[i]) / variance);
}

/**
 * Pondérations inverse-volatilité (naive risk parity) : wᵢ ∝ 1/σᵢ, normalisées.
 * `variances` = diagonale de Σ (σᵢ²). Un actif de variance ≤ 0 est ignoré
 * (poids 0). Renvoie des poids sommant à 1 (ou vecteur nul si tout est dégénéré).
 */
export function inverseVolatilityWeights(variances: number[]): number[] {
  const inv = variances.map((v) => (v > 0 && Number.isFinite(v) ? 1 / Math.sqrt(v) : 0));
  const sum = inv.reduce((a, x) => a + x, 0);
  if (sum <= 0) return variances.map(() => 0);
  return inv.map((x) => x / sum);
}

export interface RiskParityOptions {
  /** Budget de risque cible par actif (défaut : équipondéré 1/n). Somme = 1. */
  budgets?: number[];
  maxIter?: number;
  /** Tolérance de convergence sur la dispersion des contributions relatives. */
  tol?: number;
}

/**
 * Equal Risk Contribution (long-only) par cyclical coordinate descent.
 *
 * À chaque balayage, pour chaque i, on résout le poids qui égalise sa
 * contribution au budget bᵢ, à volatilité de portefeuille σₚ courante :
 *   Σᵢᵢ·wᵢ² + βᵢ·wᵢ − bᵢ·σₚ² = 0,  βᵢ = Σ_{j≠i} Σᵢⱼ·wⱼ
 *   → wᵢ = (−βᵢ + √(βᵢ² + 4·Σᵢᵢ·bᵢ·σₚ²)) / (2·Σᵢᵢ)   (racine positive)
 * Puis renormalisation à Σw = 1. Converge pour toute Σ semi-définie positive
 * (Griveau-Billion et al. 2013). Initialisé à l'inverse-vol.
 *
 * Cas dégénérés : n = 0 → [] ; une diagonale ≤ 0 (variance nulle/absente) est
 * bornée par un epsilon pour ne pas diviser par zéro (jamais de poids infini).
 */
export function riskParityWeights(covariance: number[][], opts: RiskParityOptions = {}): number[] {
  const n = covariance.length;
  if (n === 0) return [];
  if (n === 1) return [1];

  const budgets = opts.budgets ?? new Array(n).fill(1 / n);
  const maxIter = opts.maxIter ?? 500;
  const tol = opts.tol ?? 1e-8;
  const EPS = 1e-12;

  const diag = covariance.map((row, i) => Math.max(row[i], EPS));
  // Initialisation inverse-vol (bon point de départ, accélère la convergence).
  let w = inverseVolatilityWeights(diag.map((d) => d));
  if (w.every((x) => x === 0)) w = new Array(n).fill(1 / n);

  for (let iter = 0; iter < maxIter; iter++) {
    const sigmaW = matVec(covariance, w);
    let variance = 0;
    for (let i = 0; i < n; i++) variance += w[i] * sigmaW[i];
    const sigmaP2 = Math.max(variance, EPS);

    let maxDelta = 0;
    for (let i = 0; i < n; i++) {
      // βᵢ = (Σw)ᵢ − Σᵢᵢ·wᵢ  (part du produit hors i).
      const beta = sigmaW[i] - diag[i] * w[i];
      const a = diag[i];
      const disc = beta * beta + 4 * a * budgets[i] * sigmaP2;
      const wi = (-beta + Math.sqrt(Math.max(disc, 0))) / (2 * a);
      const newWi = wi > 0 && Number.isFinite(wi) ? wi : 0;
      maxDelta = Math.max(maxDelta, Math.abs(newWi - w[i]));
      // Mise à jour immédiate (coordinate descent) + recalcul de Σw incrémental.
      const dw = newWi - w[i];
      if (dw !== 0) {
        for (let k = 0; k < n; k++) sigmaW[k] += covariance[k][i] * dw;
      }
      w[i] = newWi;
    }

    // Pas de renormalisation intra-boucle : le CCD converge vers son échelle
    // naturelle (wᵢ·(Σw)ᵢ = bᵢ·σₚ²), on normalise seulement à la fin.
    if (maxDelta < tol) break;
  }

  const total = w.reduce((acc, x) => acc + x, 0);
  return total > 0 ? w.map((x) => x / total) : new Array(n).fill(1 / n);
}

/** Produit matrice·vecteur. */
function matVec(m: number[][], v: number[]): number[] {
  const n = v.length;
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += m[i][j] * v[j];
    out[i] = s;
  }
  return out;
}
