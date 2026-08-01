/**
 * Levier « exposition climat » — simulation d'impact actionnable (audit
 * .lovable/plan.md §12). L'utilisateur augmente virtuellement l'exposition
 * climat de son portefeuille ; on estime l'effet sur le WACI (intensité
 * carbone) et la volatilité.
 *
 * MÉTHODE (une phrase, affichée à l'écran) : interpolation linéaire entre le
 * WACI/volatilité RÉELS du portefeuille et ceux de sa ligne détenue la moins
 * intensive en carbone — 0 % = portefeuille actuel, 100 % = poids
 * entièrement basculé vers cette ligne.
 *
 * C'est une ESTIMATION explicitement étiquetée comme telle, construite à
 * partir de deux points de données réels (jamais un chiffre inventé). Si le
 * portefeuille n'a pas de WACI/volatilité mesurés, ou aucune ligne réelle
 * plus propre que la moyenne, le levier est indisponible — on ne fabrique
 * rien (CLAUDE.md §1.2).
 */

export interface LeverHolding {
  /** Poids de la ligne dans le portefeuille (0..1). */
  weight: number;
  /** WACI réel de la ligne (tCO₂e/M$ de CA), ou null si non renseigné. */
  waci: number | null;
  /** Volatilité annualisée réelle de la ligne, ou null si non renseignée. */
  volatility: number | null;
}

export interface LeverInputs {
  /** WACI pondéré réel du portefeuille, ou null si non mesuré. */
  currentWaci: number | null;
  /** Part du portefeuille couverte par un WACI réel (0..1). */
  waciCoverage: number;
  /** Volatilité annualisée réelle du portefeuille, ou null si non mesurée. */
  currentVolatility: number | null;
  /** Lignes réelles du portefeuille, avec leur WACI/volatilité si connus. */
  holdings: readonly LeverHolding[];
  /** Curseur d'exposition climat supplémentaire, en % (0..100). */
  exposureIncreasePct: number;
}

export interface LeverEstimate {
  available: true;
  exposureIncreasePct: number;
  estimatedWaci: number;
  estimatedVolatility: number;
  /** WACI de la ligne de référence (la plus propre réellement détenue). */
  referenceWaci: number;
  /** Volatilité de la ligne de référence. */
  referenceVolatility: number;
  method: "linear_interpolation_to_cleanest_holding";
}

export type LeverResult = LeverEstimate | { available: false };

const MIN_WACI_COVERAGE = 0.5;

/** Estime l'effet du curseur climat, ou signale que la donnée manque. */
export function estimateClimateExposureLever(input: LeverInputs): LeverResult {
  const x = Math.max(0, Math.min(100, input.exposureIncreasePct));

  if (
    input.currentWaci == null ||
    !Number.isFinite(input.currentWaci) ||
    input.currentVolatility == null ||
    !Number.isFinite(input.currentVolatility) ||
    !Number.isFinite(input.waciCoverage) ||
    input.waciCoverage < MIN_WACI_COVERAGE
  ) {
    return { available: false };
  }

  const candidates = input.holdings.filter(
    (h): h is LeverHolding & { waci: number; volatility: number } =>
      h.weight > 0 &&
      h.waci != null &&
      Number.isFinite(h.waci) &&
      h.volatility != null &&
      Number.isFinite(h.volatility),
  );
  if (candidates.length === 0) return { available: false };

  const cleanest = candidates.reduce((best, h) => (h.waci < best.waci ? h : best));
  // Rien à simuler si la ligne "la plus propre" détenue n'est pas réellement
  // plus propre que la moyenne du portefeuille.
  if (cleanest.waci >= input.currentWaci) return { available: false };

  const t = x / 100;
  const estimatedWaci = input.currentWaci + t * (cleanest.waci - input.currentWaci);
  const estimatedVolatility =
    input.currentVolatility + t * (cleanest.volatility - input.currentVolatility);

  return {
    available: true,
    exposureIncreasePct: x,
    estimatedWaci,
    estimatedVolatility,
    referenceWaci: cleanest.waci,
    referenceVolatility: cleanest.volatility,
    method: "linear_interpolation_to_cleanest_holding",
  };
}
