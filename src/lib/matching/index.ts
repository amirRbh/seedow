/**
 * Moteur de matching — API publique (pivot PIU, §6).
 *
 * Assemble signaux (`signals.ts`) + agrégation (`aggregate.ts`) pour classer
 * l'univers selon les préférences PONDÉRÉES de l'utilisateur. Le score n'est
 * jamais « le jugement de Seedow » : c'est le résultat du filtre de l'utilisateur
 * appliqué à des données que Seedow mesure et source. Pur, sans I/O, sans UI.
 *
 * North star : Seedow ne dit pas quoi acheter — il classe ce qui correspond à ce
 * que l'utilisateur a dit, et explique pourquoi, trous compris.
 */

import type { DimensionWeights, RiskTolerance } from "@/lib/preferences/model";
import { aggregateMatch, type AggregateOptions } from "./aggregate";
import { computeAssetSignals } from "./signals";
import type { MatchAssetInput, MatchContext, MatchResult } from "./types";

export * from "./types";
export { aggregateMatch } from "./aggregate";
export { computeAssetSignals } from "./signals";
export {
  DIMENSION_SPECS,
  MATCHING_METHODOLOGY_VERSION,
  calibrateMonotoneThreshold,
  percentile,
} from "./dimensions";

/**
 * Cible de risque (SRRI 1..7) dérivée de la tolérance DÉCLARÉE. Distincte de
 * l'objectif (faiblesse n°8 de l'audit). Non renseignée → null : `risk_fit`
 * restera alors non couverte plutôt que d'inventer une cible.
 */
export function riskToleranceToTargetLevel(tolerance: RiskTolerance | null): number | null {
  switch (tolerance) {
    case "prudent":
      return 3;
    case "equilibre":
      return 4;
    case "dynamique":
      return 5.5;
    default:
      return null;
  }
}

/** Matche un actif contre des préférences pondérées. */
export function matchAsset(
  asset: MatchAssetInput,
  weights: DimensionWeights,
  context: MatchContext,
  opts?: AggregateOptions,
): MatchResult {
  const signals = computeAssetSignals(asset, context);
  return aggregateMatch(asset.id, signals, weights, opts);
}

export interface UniverseMatch {
  /** Actifs scorables, meilleure correspondance d'abord. */
  ranked: MatchResult[];
  /**
   * Actifs dont la couverture est sous le plancher : NON classés par
   * correspondance (on ne classe pas ce qu'on ne peut pas mesurer), triés par
   * couverture décroissante pour signaler lesquels sont « presque évaluables ».
   */
  unscored: MatchResult[];
  /** Total analysé = ranked + unscored (le « sur N analysés », §5.4). */
  analyzed: number;
}

/**
 * Classe un univers. Les scorables sont triés par score décroissant ; les non
 * scorables sont mis à part (jamais mélangés à un rang de correspondance qu'ils
 * n'ont pas). En cas d'égalité de score, la couverture départage (plus sûr
 * d'abord) — on ne prétend pas départager au-delà de ce que la donnée permet.
 */
export function matchUniverse(
  assets: MatchAssetInput[],
  weights: DimensionWeights,
  context: MatchContext,
  opts?: AggregateOptions,
): UniverseMatch {
  const ranked: MatchResult[] = [];
  const unscored: MatchResult[] = [];
  for (const asset of assets) {
    const res = matchAsset(asset, weights, context, opts);
    (res.scorable ? ranked : unscored).push(res);
  }
  ranked.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.coverage - a.coverage);
  unscored.sort((a, b) => b.coverage - a.coverage);
  return { ranked, unscored, analyzed: assets.length };
}
