/**
 * Moteur de performance HISTORIQUE — fonctions pures, testées.
 *
 * Il mesure ce qui s'est passé sur une série de valeurs (VL ou « croissance de
 * 10 000 » d'un fonds, dividendes réinvestis). Il ne prévoit rien : une
 * performance passée n'est pas un rendement attendu, et rien ici ne sert à
 * construire une espérance de rendement (CLAUDE.md §1.1, §1.3).
 *
 * Conventions, documentées une fois :
 *   - Rendements périodiques SIMPLES : r_t = P_t / P_{t-1} − 1.
 *   - Rendement annualisé (CAGR) sur durée CALENDAIRE réelle :
 *       (P_fin / P_début)^(365,25 / jours) − 1.
 *   - Volatilité annualisée AFFICHÉE : écart-type ÉCHANTILLON (n−1) des
 *     rendements MENSUELS (fins de mois) × √12 — la convention des émetteurs.
 *     Contrôlée au centième contre l'écart-type 3 ans publié par l'émetteur
 *     (`performance.test.ts`). La volatilité sur rendements quotidiens × √252
 *     reste calculée (`dailyVolatility`) : elle réagit plus vite, mais n'est
 *     pas comparable aux fiches des fonds.
 *   - Perte maximale (max drawdown) : plus forte baisse d'un plus-haut à un
 *     plus-bas ultérieur, en fraction négative.
 *   - Fenêtre glissante N ans : valeur au dernier point ≤ (date de fin − N ans).
 *     Si la série commence APRÈS ce point, la fenêtre est NON CALCULABLE
 *     (`null`) — jamais raccourcie en silence.
 *   - Ratio de Sharpe : uniquement si un taux sans risque est FOURNI. Sans lui,
 *     `null` — un Sharpe à taux nul présenté comme un Sharpe serait faux.
 */

export interface SeriesPoint {
  date: string; // AAAA-MM-JJ
  value: number;
}

export const TRADING_DAYS_PER_YEAR = 252;
const DAY_MS = 86_400_000;

function toTime(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

/** Retire les points invalides et trie par date croissante (dédoublonne par date). */
export function cleanSeries(points: SeriesPoint[]): SeriesPoint[] {
  const byDate = new Map<string, number>();
  for (const p of points) {
    if (Number.isFinite(p.value) && p.value > 0 && Number.isFinite(toTime(p.date))) {
      byDate.set(p.date, p.value);
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, value]) => ({ date, value }));
}

/** Rendements simples successifs. Longueur = n − 1. */
export function simpleReturns(series: SeriesPoint[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < series.length; i++) out.push(series[i].value / series[i - 1].value - 1);
  return out;
}

/** Rendement cumulé entre le premier et le dernier point. `null` si < 2 points. */
export function cumulativeReturn(series: SeriesPoint[]): number | null {
  if (series.length < 2) return null;
  return series[series.length - 1].value / series[0].value - 1;
}

/** Durée calendaire en années (365,25 j) entre le premier et le dernier point. */
export function yearsBetween(start: string, end: string): number {
  return (toTime(end) - toTime(start)) / DAY_MS / 365.25;
}

/** CAGR. `null` si moins de 2 points ou durée nulle. */
export function annualizedReturn(series: SeriesPoint[]): number | null {
  if (series.length < 2) return null;
  const years = yearsBetween(series[0].date, series[series.length - 1].date);
  if (years <= 0) return null;
  const growth = series[series.length - 1].value / series[0].value;
  return growth ** (1 / years) - 1;
}

/** Écart-type échantillon (n − 1). `null` si moins de 2 valeurs. */
export function sampleStdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Volatilité annualisée. `periodsPerYear` = 252 pour des points quotidiens de
 * bourse. Exige au moins 20 rendements : en dessous, l'estimation n'a pas de sens.
 */
export function annualizedVolatility(
  series: SeriesPoint[],
  periodsPerYear: number = TRADING_DAYS_PER_YEAR,
): number | null {
  const r = simpleReturns(series);
  if (r.length < 20) return null;
  const sd = sampleStdDev(r);
  return sd === null ? null : sd * Math.sqrt(periodsPerYear);
}

/** Dernier point de chaque mois calendaire (ordre chronologique). */
export function monthEndSeries(series: SeriesPoint[]): SeriesPoint[] {
  const byMonth = new Map<string, SeriesPoint>();
  for (const p of series) byMonth.set(p.date.slice(0, 7), p);
  return [...byMonth.values()];
}

/**
 * Volatilité annualisée sur rendements MENSUELS (fins de mois) × √12 — la
 * convention des émetteurs et des agences de notation de fonds pour l'écart-type
 * 3 ans. Exige 12 rendements mensuels au moins.
 */
export function annualizedMonthlyVolatility(series: SeriesPoint[]): number | null {
  const months = monthEndSeries(series);
  const r = simpleReturns(months);
  if (r.length < 12) return null;
  const sd = sampleStdDev(r);
  return sd === null ? null : sd * Math.sqrt(12);
}

export interface Drawdown {
  /** Perte maximale, fraction négative (−0,25 = −25 %). 0 si la série ne baisse jamais. */
  depth: number;
  peakDate: string | null;
  troughDate: string | null;
  /** Date à laquelle le plus-haut précédent est retrouvé, `null` si pas encore. */
  recoveryDate: string | null;
}

export function maxDrawdown(series: SeriesPoint[]): Drawdown | null {
  if (series.length < 2) return null;
  let peak = series[0];
  let worst: Drawdown = { depth: 0, peakDate: null, troughDate: null, recoveryDate: null };
  let worstPeakValue = 0;
  for (const p of series) {
    if (p.value > peak.value) peak = p;
    const dd = p.value / peak.value - 1;
    if (dd < worst.depth) {
      worst = { depth: dd, peakDate: peak.date, troughDate: p.date, recoveryDate: null };
      worstPeakValue = peak.value;
    }
  }
  if (worst.troughDate) {
    const after = series.find((p) => p.date > worst.troughDate! && p.value >= worstPeakValue);
    worst.recoveryDate = after?.date ?? null;
  }
  return worst;
}

/** Date ISO décalée de `years` années calendaires (29 février → 28 février). */
export function shiftYears(date: string, years: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y - years, m - 1, d));
  if (target.getUTCMonth() !== m - 1) target.setUTCDate(0);
  return target.toISOString().slice(0, 10);
}

/**
 * Sous-série couvrant les `years` dernières années jusqu'à `endDate` (inclus).
 * Point de départ = dernier point dont la date ≤ (fin − N ans). `null` si la
 * série ne remonte pas assez loin : la fenêtre n'est pas calculable.
 */
export function trailingWindow(
  series: SeriesPoint[],
  years: number,
  endDate?: string,
): SeriesPoint[] | null {
  if (series.length < 2) return null;
  const end = endDate ?? series[series.length - 1].date;
  const startTarget = shiftYears(end, years);
  let startIdx = -1;
  for (let i = 0; i < series.length; i++) {
    if (series[i].date <= startTarget) startIdx = i;
    else break;
  }
  if (startIdx < 0) return null; // la série commence après le début de la fenêtre
  let endIdx = -1;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].date <= end) {
      endIdx = i;
      break;
    }
  }
  if (endIdx <= startIdx) return null;
  return series.slice(startIdx, endIdx + 1);
}

/** Sharpe = (rendement annualisé − taux sans risque) / volatilité. `null` sans taux fourni. */
export function sharpeRatio(
  annualReturn: number | null,
  annualVol: number | null,
  riskFreeRate: number | null | undefined,
): number | null {
  if (annualReturn === null || annualVol === null || riskFreeRate == null) return null;
  if (annualVol <= 0) return null;
  return (annualReturn - riskFreeRate) / annualVol;
}

/** Aligne deux séries sur leurs dates communes. */
export function alignSeries(
  a: SeriesPoint[],
  b: SeriesPoint[],
): { a: SeriesPoint[]; b: SeriesPoint[] } {
  const bByDate = new Map(b.map((p) => [p.date, p.value]));
  const outA: SeriesPoint[] = [];
  const outB: SeriesPoint[] = [];
  for (const p of a) {
    const v = bByDate.get(p.date);
    if (v !== undefined) {
      outA.push(p);
      outB.push({ date: p.date, value: v });
    }
  }
  return { a: outA, b: outB };
}

/**
 * Écart de suivi (tracking error) annualisé : écart-type des différences de
 * rendements quotidiens fonds − indice, × √252. Mesure à quel point le fonds
 * s'écarte de son indice, pas s'il fait « mieux ».
 */
export function trackingError(fund: SeriesPoint[], benchmark: SeriesPoint[]): number | null {
  const { a, b } = alignSeries(fund, benchmark);
  const ra = simpleReturns(a);
  const rb = simpleReturns(b);
  if (ra.length < 20) return null;
  const diff = ra.map((r, i) => r - rb[i]);
  const sd = sampleStdDev(diff);
  return sd === null ? null : sd * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

export interface WindowMetrics {
  years: number;
  /** `false` quand la série ne couvre pas la fenêtre : tous les champs sont alors `null`. */
  available: boolean;
  startDate: string | null;
  endDate: string | null;
  cumulativeReturn: number | null;
  annualizedReturn: number | null;
  /** Rendements mensuels × √12 (convention émetteur). */
  annualizedVolatility: number | null;
  /** Rendements quotidiens × √252. */
  dailyVolatility: number | null;
  maxDrawdown: number | null;
  benchmarkAnnualizedReturn: number | null;
  /** Rendement annualisé du fonds − celui de l'indice, en points de fraction. */
  excessAnnualizedReturn: number | null;
  trackingError: number | null;
  sharpe: number | null;
  observations: number;
}

export interface PerformanceReport {
  firstDate: string | null;
  lastDate: string | null;
  observations: number;
  windows: WindowMetrics[];
  /** Plus forte perte sur toute la série fournie. */
  fullPeriodDrawdown: Drawdown | null;
  riskFreeRate: number | null;
}

/**
 * Rapport de performance sur les fenêtres demandées (1, 3, 5 ans par défaut),
 * avec comparaison à l'indice quand une série d'indice est fournie.
 */
export function performanceReport(
  fundSeries: SeriesPoint[],
  options: {
    benchmark?: SeriesPoint[] | null;
    windows?: number[];
    riskFreeRate?: number | null;
    endDate?: string;
  } = {},
): PerformanceReport {
  const fund = cleanSeries(fundSeries);
  const bench = options.benchmark ? cleanSeries(options.benchmark) : null;
  const rf = options.riskFreeRate ?? null;
  const windows = (options.windows ?? [1, 3, 5]).map((years): WindowMetrics => {
    const w = trailingWindow(fund, years, options.endDate);
    if (!w) {
      return {
        years,
        available: false,
        startDate: null,
        endDate: null,
        cumulativeReturn: null,
        annualizedReturn: null,
        annualizedVolatility: null,
        dailyVolatility: null,
        maxDrawdown: null,
        benchmarkAnnualizedReturn: null,
        excessAnnualizedReturn: null,
        trackingError: null,
        sharpe: null,
        observations: 0,
      };
    }
    const ann = annualizedReturn(w);
    const vol = annualizedMonthlyVolatility(w);
    let benchAnn: number | null = null;
    let te: number | null = null;
    if (bench) {
      const bw = bench.filter((p) => p.date >= w[0].date && p.date <= w[w.length - 1].date);
      // L'indice doit couvrir la MÊME fenêtre, aux mêmes bornes.
      if (bw.length > 1 && bw[0].date === w[0].date && bw[bw.length - 1].date === w[w.length - 1].date) {
        benchAnn = annualizedReturn(bw);
        te = trackingError(w, bw);
      }
    }
    return {
      years,
      available: true,
      startDate: w[0].date,
      endDate: w[w.length - 1].date,
      cumulativeReturn: cumulativeReturn(w),
      annualizedReturn: ann,
      annualizedVolatility: vol,
      dailyVolatility: annualizedVolatility(w),
      maxDrawdown: maxDrawdown(w)?.depth ?? null,
      benchmarkAnnualizedReturn: benchAnn,
      excessAnnualizedReturn: ann !== null && benchAnn !== null ? ann - benchAnn : null,
      trackingError: te,
      sharpe: sharpeRatio(ann, vol, rf),
      observations: w.length,
    };
  });
  return {
    firstDate: fund[0]?.date ?? null,
    lastDate: fund[fund.length - 1]?.date ?? null,
    observations: fund.length,
    windows,
    fullPeriodDrawdown: maxDrawdown(fund),
    riskFreeRate: rf,
  };
}

/**
 * Série rebasée à 100 au premier point, sous-échantillonnée à `maxPoints` pour
 * l'affichage. Le dernier point est toujours conservé : la courbe se termine sur
 * la vraie valeur, pas sur un point intermédiaire.
 */
export function rebaseForChart(series: SeriesPoint[], maxPoints = 260): SeriesPoint[] {
  const clean = cleanSeries(series);
  if (clean.length === 0) return [];
  const base = clean[0].value;
  const step = Math.max(1, Math.ceil(clean.length / maxPoints));
  const out: SeriesPoint[] = [];
  for (let i = 0; i < clean.length; i += step) out.push({ date: clean[i].date, value: (clean[i].value / base) * 100 });
  const last = clean[clean.length - 1];
  if (out[out.length - 1].date !== last.date) out.push({ date: last.date, value: (last.value / base) * 100 });
  return out;
}

/**
 * SIMULATION historique d'un panier à poids CONSTANTS, rééquilibré à chaque
 * observation commune : r_p(t) = Σ w_i × r_i(t). Les poids sont normalisés à 1.
 *
 * Ce n'est pas une performance réalisée : aucun investisseur n'a détenu ce
 * panier, et le rééquilibrage quotidien n'a ni coût ni fiscalité ici. Toute
 * interface qui l'affiche doit l'écrire (statut SIMULATED). Les séries sont
 * alignées sur leurs dates COMMUNES uniquement — aucun prix n'est interpolé.
 */
export function blendSeries(
  series: SeriesPoint[][],
  weights: number[],
  base = 100,
): SeriesPoint[] {
  if (series.length === 0 || series.length !== weights.length) return [];
  const totalW = weights.reduce((s, w) => s + (w > 0 ? w : 0), 0);
  if (totalW <= 0) return [];
  const w = weights.map((x) => (x > 0 ? x / totalW : 0));
  const cleaned = series.map(cleanSeries);
  const maps = cleaned.map((sr) => new Map(sr.map((p) => [p.date, p.value])));
  const common = cleaned[0].map((p) => p.date).filter((d) => maps.every((m) => m.has(d)));
  if (common.length === 0) return [];
  const out: SeriesPoint[] = [{ date: common[0], value: base }];
  for (let i = 1; i < common.length; i++) {
    const prev = common[i - 1];
    const cur = common[i];
    let r = 0;
    for (let k = 0; k < maps.length; k++) r += w[k] * (maps[k].get(cur)! / maps[k].get(prev)! - 1);
    out.push({ date: cur, value: out[i - 1].value * (1 + r) });
  }
  return out;
}
