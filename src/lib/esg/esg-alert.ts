/**
 * Détection d'une baisse significative de score ESG.
 *
 * Logique métier pure (hors composant) : compare le score courant d'un actif à
 * son score précédent et signale une baisse relative supérieure à un seuil
 * (20 % par défaut). Ne fabrique jamais de donnée — si le score précédent est
 * absent, aucune alerte n'est levée (cf. CLAUDE.md : chaque chiffre sourcé,
 * pas d'alarme gratuite).
 */

export interface EsgDropResult {
  /** `true` si la baisse relative atteint ou dépasse le seuil. */
  dropped: boolean;
  /** Baisse relative en points de pourcentage (ex. 25 pour −25 %). 0 sinon. */
  relativeDropPct: number;
}

export function detectEsgDrop(
  current: number,
  previous: number | null | undefined,
  thresholdPct = 20,
): EsgDropResult {
  if (
    previous == null ||
    !Number.isFinite(previous) ||
    previous <= 0 ||
    !Number.isFinite(current)
  ) {
    return { dropped: false, relativeDropPct: 0 };
  }
  const relativeDropPct = ((previous - current) / previous) * 100;
  if (relativeDropPct <= 0) {
    return { dropped: false, relativeDropPct: 0 };
  }
  return { dropped: relativeDropPct >= thresholdPct, relativeDropPct };
}
