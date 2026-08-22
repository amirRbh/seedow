/**
 * Moteur WHAT-IF (pivot PIU, §10). Répond à « et si je remplaçais A par B ? » —
 * PAS à « quel est le meilleur ? » (cette question n'a pas de réponse, et Seedow
 * ne fait jamais semblant d'en avoir une).
 *
 * La règle de langage (§10.3) est encodée dans la STRUCTURE, pas laissée à l'UI :
 *  - on sépare `improvements` et `regressions` — toute comparaison expose ce qui
 *    s'améliore ET ce qui se dégrade, dans la même réponse ;
 *  - `selectCandidates` renvoie PLUSIEURS alternatives comparables (jamais UNE
 *    seule mise en avant : une alternative unique = une recommandation) ;
 *  - aucun champ « meilleur / recommandé » n'existe : le moteur ne classe pas les
 *    alternatives comme supérieures, il décrit des compromis.
 *
 * Comparaison au niveau des dimensions de matching (satisfaction), sur les seules
 * dimensions COUVERTES chez les deux actifs — on ne compare pas ce qu'on ne
 * mesure pas des deux côtés. Fonctions PURES, aucune I/O.
 */

import type { MatchDimension } from "@/lib/preferences/dimensions";
import type { MatchBand, MatchResult } from "@/lib/matching/types";

export interface DimensionDelta {
  dimension: MatchDimension;
  currentSat: number;
  altSat: number;
  /** altSat − currentSat, ∈ [−1, 1]. */
  delta: number;
  direction: "up" | "down" | "flat";
}

export interface WhatIfComparison {
  currentId: string;
  altId: string;
  /** Vrai si les deux actifs sont scorables et partagent ≥ 1 dimension couverte. */
  comparable: boolean;
  bandChange: { from: MatchBand; to: MatchBand };
  /** alt.coverage − current.coverage (variation de confiance). */
  coverageDelta: number;
  /** Dimensions où B fait MIEUX (delta > seuil), plus fort écart d'abord. */
  improvements: DimensionDelta[];
  /** Dimensions où B fait MOINS BIEN, plus fort écart d'abord. */
  regressions: DimensionDelta[];
  /** Dimensions inchangées (|delta| ≤ seuil). */
  unchanged: DimensionDelta[];
}

const FLAT_EPS = 0.02;

function satByDimension(result: MatchResult): Map<MatchDimension, number> {
  const m = new Map<MatchDimension, number>();
  for (const c of result.contributions) m.set(c.dimension, c.satisfaction);
  return m;
}

/**
 * Compare l'actif COURANT à une ALTERNATIVE sur leurs dimensions communément
 * couvertes. Bidirectionnel par construction : `improvements` et `regressions`
 * sont tous deux renseignés.
 */
export function compareAssets(current: MatchResult, alt: MatchResult): WhatIfComparison {
  const curSat = satByDimension(current);
  const altSat = satByDimension(alt);

  const improvements: DimensionDelta[] = [];
  const regressions: DimensionDelta[] = [];
  const unchanged: DimensionDelta[] = [];

  for (const [dim, cs] of curSat) {
    const as = altSat.get(dim);
    if (as === undefined) continue; // non couvert des deux côtés → non comparable
    const delta = as - cs;
    const d: DimensionDelta = {
      dimension: dim,
      currentSat: cs,
      altSat: as,
      delta,
      direction: delta > FLAT_EPS ? "up" : delta < -FLAT_EPS ? "down" : "flat",
    };
    if (d.direction === "up") improvements.push(d);
    else if (d.direction === "down") regressions.push(d);
    else unchanged.push(d);
  }

  const byMagnitude = (a: DimensionDelta, b: DimensionDelta) =>
    Math.abs(b.delta) - Math.abs(a.delta);
  improvements.sort(byMagnitude);
  regressions.sort(byMagnitude);

  const comparable =
    current.scorable &&
    alt.scorable &&
    improvements.length + regressions.length + unchanged.length > 0;

  return {
    currentId: current.assetId,
    altId: alt.assetId,
    comparable,
    bandChange: { from: current.band, to: alt.band },
    coverageDelta: alt.coverage - current.coverage,
    improvements,
    regressions,
    unchanged,
  };
}

export interface CandidatePoolItem {
  id: string;
  assetClass: string;
  /** Score de correspondance (0..1) si scorable, sinon null. */
  matchScore: number | null;
}

/**
 * Sélectionne des alternatives COMPARABLES : même classe d'actif (une
 * substitution doit jouer le même rôle, §10.2), en excluant l'actif courant,
 * classées par correspondance décroissante. On renvoie jusqu'à `limit`
 * candidats — l'appelant exige d'en afficher ≥ 2 (jamais une seule).
 */
export function selectCandidates(
  currentId: string,
  currentClass: string,
  pool: CandidatePoolItem[],
  limit = 3,
): CandidatePoolItem[] {
  return pool
    .filter((c) => c.id !== currentId && c.assetClass === currentClass && c.matchScore != null)
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    .slice(0, limit);
}
