/**
 * Backtest walk-forward hors échantillon — la brique qui manquait pour pouvoir
 * défendre un « rendement attendu » devant un comité d'investissement.
 *
 * Principe (out-of-sample, sans look-ahead) : à chaque date de rebalancement t,
 * on estime le modèle de risque (μ, Σ) UNIQUEMENT sur l'historique antérieur à t
 * (fenêtre glissante), on construit le portefeuille avec ce modèle, puis on
 * mesure sa performance RÉELLE sur la période suivante — jamais avec des données
 * postérieures à la décision. C'est la seule façon honnête de comparer une
 * stratégie à un naïf 1/N (DeMiguel, Garlappi & Uppal 2009, RFS : le 1/N bat
 * souvent la moyenne-variance hors échantillon — d'où l'obligation de le montrer).
 *
 * Le 1/N est calculé sur l'univers APRÈS exclusions (les exclusions éthiques ne
 * sont pas de l'optimisation, elles ne se négocient pas — cf. CLAUDE.md §1), pour
 * que la comparaison isole l'effet de l'optimisation, pas celui de l'éthique.
 *
 * Fonctions pures, sans dépendance DB/UI : testables et réutilisables côté
 * serveur (server function dédiée) comme dans un script d'évaluation.
 */
import type { Asset, PortfolioParams } from "./types";
import { buildPortfolio } from "./engine";
import { buildRiskModel, type PricePoint } from "@/lib/market/risk-model";

const TRADING_DAYS_PER_YEAR = 252;

export interface BacktestConfig {
  /** Fenêtre glissante d'estimation, en jours de bourse (ex. 252 = ~1 an). */
  estimationWindow: number;
  /** Fréquence de rebalancement, en jours de bourse (ex. 63 = ~trimestriel). */
  rebalanceEvery: number;
  /** Taux sans risque annualisé pour le Sharpe réalisé (défaut 0.025). */
  riskFreeRate?: number;
}

export interface StrategyPerformance {
  /** Rendement annualisé géométrique (CAGR). */
  annualizedReturn: number;
  /** Volatilité annualisée des rendements quotidiens réalisés. */
  annualizedVol: number;
  /** Sharpe réalisé = (CAGR − rf) / vol. */
  sharpe: number;
  /** Drawdown maximal (perte pic-à-creux), valeur ∈ [0,1]. */
  maxDrawdown: number;
  /** Valeur finale d'1 € investi à t₀. */
  finalValue: number;
  /** Nombre de rebalancements effectués. */
  rebalances: number;
}

export interface StrategyResult {
  /** Courbe de capital (base 1 à t₀), un point par date OOS. */
  curve: number[];
  perf: StrategyPerformance;
}

export interface BacktestResult {
  /** Axe de dates de la fenêtre hors échantillon. */
  dates: string[];
  seedow: StrategyResult;
  equalWeight: StrategyResult;
  /** Optionnel : proxy de référence (ex. ETF MSCI World) si une série est fournie. */
  benchmark?: StrategyResult;
}

/** Drawdown maximal d'une courbe de capital, ∈ [0,1]. */
export function computeMaxDrawdown(curve: number[]): number {
  let peak = -Infinity;
  let maxDd = 0;
  for (const v of curve) {
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = (peak - v) / peak;
      if (dd > maxDd) maxDd = dd;
    }
  }
  return maxDd;
}

/**
 * Résume une série de rendements quotidiens réalisés en métriques annualisées.
 * `dailyReturns` : rendements simples (pas log) période à période.
 */
export function summarizePerformance(
  dailyReturns: number[],
  riskFreeRate = 0.025,
): { perf: StrategyPerformance; curve: number[] } {
  const curve: number[] = [1];
  for (const r of dailyReturns) curve.push(curve[curve.length - 1] * (1 + r));
  const finalValue = curve[curve.length - 1];
  const nDays = dailyReturns.length;

  // CAGR à partir de la valeur finale et du nombre de jours de bourse.
  const years = nDays / TRADING_DAYS_PER_YEAR;
  const annualizedReturn = years > 0 && finalValue > 0 ? finalValue ** (1 / years) - 1 : 0;

  // Volatilité annualisée (écart-type échantillon des rendements quotidiens).
  const mean = nDays > 0 ? dailyReturns.reduce((s, r) => s + r, 0) / nDays : 0;
  const variance =
    nDays > 1 ? dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (nDays - 1) : 0;
  const annualizedVol = Math.sqrt(variance * TRADING_DAYS_PER_YEAR);

  // Seuil epsilon : une volatilité numériquement nulle (rendements constants,
  // bruit flottant ~1e-19) ne doit pas produire un Sharpe aberrant.
  const VOL_EPS = 1e-9;
  const sharpe = annualizedVol > VOL_EPS ? (annualizedReturn - riskFreeRate) / annualizedVol : 0;

  return {
    curve,
    perf: {
      annualizedReturn,
      annualizedVol,
      sharpe,
      maxDrawdown: computeMaxDrawdown(curve),
      finalValue,
      rebalances: 0,
    },
  };
}

/** Rendements simples datés d'une série de prix (close/close − 1), triés par date. */
function simpleReturns(prices: PricePoint[]): Map<string, number> {
  const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date));
  const out = new Map<string, number>();
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].close;
    const cur = sorted[i].close;
    if (prev > 0 && cur > 0) out.set(sorted[i].date, cur / prev - 1);
  }
  return out;
}

/**
 * Rendement quotidien d'un portefeuille à poids cibles constants sur la période,
 * robuste aux trous : on renormalise les poids sur les actifs qui ont un
 * rendement disponible ce jour-là.
 */
function portfolioDayReturn(
  weights: Record<string, number>,
  returnsByAsset: Map<string, Map<string, number>>,
  date: string,
): number | null {
  let wSum = 0;
  let acc = 0;
  for (const id in weights) {
    const r = returnsByAsset.get(id)?.get(date);
    if (r === undefined || !Number.isFinite(r)) continue;
    wSum += weights[id];
    acc += weights[id] * r;
  }
  if (wSum <= 0) return null;
  return acc / wSum; // renormalisé sur les actifs disponibles
}

export interface RunBacktestInput {
  universe: Asset[];
  pricesByAsset: Map<string, PricePoint[]>;
  params: PortfolioParams;
  config: BacktestConfig;
  /** Série de prix d'un indice de référence (ex. MSCI World), optionnelle. */
  benchmarkPrices?: PricePoint[];
}

/**
 * Exécute le backtest walk-forward. Renvoie les courbes et métriques réalisées
 * pour la stratégie Seedow, le 1/N (post-exclusions) et, si fourni, un benchmark.
 *
 * Sans look-ahead : les poids appliqués sur [t, t+Δ) proviennent d'un modèle
 * estimé sur (t−fenêtre, t]. Les premières `estimationWindow` dates servent de
 * warmup et ne comptent pas dans la performance.
 */
export function runBacktest(input: RunBacktestInput): BacktestResult {
  const { universe, pricesByAsset, params, config } = input;
  const riskFree = config.riskFreeRate ?? 0.025;

  // Axe de dates commun = union triée des dates de prix de l'univers.
  const dateSet = new Set<string>();
  for (const prices of pricesByAsset.values()) for (const p of prices) dateSet.add(p.date);
  const axis = Array.from(dateSet).sort();

  // Pré-calcule les rendements simples datés par actif (pour la valorisation)
  // et par actif un accès rapide au sous-historique (pour l'estimation).
  const returnsByAsset = new Map<string, Map<string, number>>();
  const sortedPricesByAsset = new Map<string, PricePoint[]>();
  for (const [id, prices] of pricesByAsset) {
    returnsByAsset.set(id, simpleReturns(prices));
    sortedPricesByAsset.set(
      id,
      [...prices].sort((a, b) => a.date.localeCompare(b.date)),
    );
  }

  // 1/N sur l'univers après exclusions dures uniquement.
  const exclusionSet = new Set(params.exclusions);
  const equalWeightPool = universe.filter(
    (a) => !a.excluded_sectors.some((s) => exclusionSet.has(s)),
  );
  const equalWeights: Record<string, number> = {};
  for (const a of equalWeightPool) equalWeights[a.id] = 1 / Math.max(1, equalWeightPool.length);

  const benchmarkReturns = input.benchmarkPrices ? simpleReturns(input.benchmarkPrices) : null;

  const startIdx = config.estimationWindow;
  const oosDates: string[] = [];
  const seedowDaily: number[] = [];
  const eqDaily: number[] = [];
  const benchDaily: number[] = [];

  let currentWeights: Record<string, number> = {};
  let rebalances = 0;

  for (let i = startIdx; i < axis.length; i++) {
    const date = axis[i];

    // Rebalancement : recalcul du modèle sur la fenêtre antérieure à `date`.
    if ((i - startIdx) % config.rebalanceEvery === 0) {
      const windowStart = axis[Math.max(0, i - config.estimationWindow)];
      const windowPrices = new Map<string, PricePoint[]>();
      for (const [id, prices] of sortedPricesByAsset) {
        const slice = prices.filter((p) => p.date >= windowStart && p.date < date);
        if (slice.length > 0) windowPrices.set(id, slice);
      }
      const risk = buildRiskModel(windowPrices);
      // Clone l'univers avec les μ/σ estimés sur la fenêtre ; un actif sans
      // stats fiables garde ses valeurs (mais sera rarement sélectionné).
      const dynamicUniverse: Asset[] = universe.map((a) => {
        const s = risk.stats.get(a.id);
        return s ? { ...a, expected_return: s.expectedReturn, volatility: s.volatility } : a;
      });
      const built = buildPortfolio({
        universe: dynamicUniverse,
        covariance: risk.covariance,
        params,
      });
      if (Object.keys(built.weights).length > 0) {
        currentWeights = built.weights;
        rebalances++;
      }
    }

    // Valorisation du jour (rendement réalisé, hors look-ahead).
    const rSeedow = portfolioDayReturn(currentWeights, returnsByAsset, date);
    const rEq = portfolioDayReturn(equalWeights, returnsByAsset, date);
    if (rSeedow === null && rEq === null) continue;

    oosDates.push(date);
    seedowDaily.push(rSeedow ?? 0);
    eqDaily.push(rEq ?? 0);
    if (benchmarkReturns) benchDaily.push(benchmarkReturns.get(date) ?? 0);
  }

  const seedow = summarizePerformance(seedowDaily, riskFree);
  seedow.perf.rebalances = rebalances;
  const equalWeight = summarizePerformance(eqDaily, riskFree);

  const result: BacktestResult = {
    dates: oosDates,
    seedow: { curve: seedow.curve, perf: seedow.perf },
    equalWeight: { curve: equalWeight.curve, perf: equalWeight.perf },
  };

  if (benchmarkReturns && benchDaily.length > 0) {
    const bench = summarizePerformance(benchDaily, riskFree);
    result.benchmark = { curve: bench.curve, perf: bench.perf };
  }

  return result;
}
