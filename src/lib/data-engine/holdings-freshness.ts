/**
 * Âge d'une composition — et ce qu'on a le droit d'en dire.
 *
 * Un fonds publie sa composition à date fixe. Entre deux publications, ce que
 * Seedow affiche décrit le passé : plus le décalage grandit, moins la phrase
 * « voici ce que ton argent finance » est vraie au présent.
 *
 * Ce module ne cache pas ce décalage, il le nomme. Les seuils sont ici et
 * nulle part ailleurs : un écran qui invente son propre « c'est récent »
 * finirait par contredire un autre écran.
 *
 * `unknown` n'est pas un quatrième palier d'ancienneté : c'est l'absence de
 * composition. On ne dit pas d'un fonds sans données que ses données sont
 * vieilles — on dit qu'on ne les a pas.
 */

/** Frontière haute de « récent » : la plupart des émetteurs publient au mois. */
export const FRESH_MAX_DAYS = 90;
/** Au-delà, la composition mérite d'être actualisée avant d'être commentée. */
export const STALE_MAX_DAYS = 180;

export type HoldingsFreshness = "fresh" | "aging" | "stale" | "unknown";

/**
 * Palier de fraîcheur d'une composition datée `asOf` (ISO `YYYY-MM-DD`).
 *
 * Une date absente ou illisible rend `unknown` : on ne devine pas l'âge d'une
 * donnée dont on ignore la date. Une date dans le futur est traitée comme
 * récente plutôt que rejetée — un décalage de fuseau ne doit pas transformer
 * une composition du jour en donnée suspecte.
 */
export function holdingsFreshness(
  asOf: string | null | undefined,
  now = new Date(),
): HoldingsFreshness {
  if (!asOf) return "unknown";
  const d = new Date(asOf);
  if (Number.isNaN(d.getTime())) return "unknown";
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days <= FRESH_MAX_DAYS) return "fresh";
  if (days <= STALE_MAX_DAYS) return "aging";
  return "stale";
}

/** Nombre de jours écoulés depuis la publication, ou `null` si indatable. */
export function holdingsAgeDays(asOf: string | null | undefined, now = new Date()): number | null {
  if (!asOf) return null;
  const d = new Date(asOf);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86_400_000));
}
