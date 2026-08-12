/**
 * Validateurs de plausibilité pour les données ingérées (§11).
 *
 * Avant d'insérer une donnée dans la base canonique, on vérifie qu'elle est
 * plausible. Si elle ne l'est pas, on ne PUBLIE PAS automatiquement : on
 * renvoie `review_required` pour qu'un humain tranche. Fonctions pures.
 */

export type ValidationStatus = "valid" | "review_required" | "rejected";

export interface ValidationResult {
  status: ValidationStatus;
  /** Raison lisible (affichable dans le data-quality dashboard). */
  reason: string | null;
}

const ok: ValidationResult = { status: "valid", reason: null };

/** TER plausible : 0% ≤ TER ≤ 10%. Au-delà = erreur de parsing probable. */
export function validateTer(terFraction: number | null | undefined): ValidationResult {
  if (terFraction == null || !Number.isFinite(terFraction))
    return { status: "review_required", reason: "TER absent" };
  if (terFraction < 0 || terFraction > 0.1)
    return { status: "rejected", reason: `TER hors bornes (${(terFraction * 100).toFixed(2)}%)` };
  return ok;
}

/** Poids d'un holding plausible : 0% ≤ w ≤ 100%. */
export function validateWeight(weightPct: number | null | undefined): ValidationResult {
  if (weightPct == null || !Number.isFinite(weightPct))
    return { status: "review_required", reason: "poids absent" };
  if (weightPct < 0 || weightPct > 100)
    return { status: "rejected", reason: `poids hors bornes (${weightPct}%)` };
  return ok;
}

/**
 * Somme des poids d'un jeu de holdings ≈ 100% (§11). Les documents publics
 * couvrent souvent le top N seulement : on tolère une sous-couverture (somme
 * < 100) mais on rejette une somme > 100 + marge (double comptage / parsing).
 */
export function validateHoldingsSum(weightsPct: number[], tolerancePct = 2): ValidationResult {
  if (weightsPct.length === 0) return { status: "review_required", reason: "aucun holding" };
  const sum = weightsPct.reduce((a, w) => a + (Number.isFinite(w) ? w : 0), 0);
  if (sum > 100 + tolerancePct)
    return { status: "rejected", reason: `somme des poids = ${sum.toFixed(1)}% (> 100%)` };
  if (sum < 100 - tolerancePct)
    // Sous-couverture normale (top holdings publiés) → ne bloque pas, signale.
    return { status: "valid", reason: `couverture partielle (${sum.toFixed(1)}%)` };
  return ok;
}

/**
 * Cohérence d'une date de référence : ni dans le futur, ni absurdement vieille
 * (une donnée de holding sans date récente perd sa valeur — §12).
 */
export function validateReferenceDate(
  isoDate: string | null | undefined,
  now = new Date(),
  maxAgeDays = 400,
): ValidationResult {
  if (!isoDate) return { status: "review_required", reason: "date de référence absente" };
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return { status: "rejected", reason: "date illisible" };
  const ageDays = (now.getTime() - d.getTime()) / 86_400_000;
  if (ageDays < -1) return { status: "rejected", reason: "date dans le futur" };
  if (ageDays > maxAgeDays)
    return { status: "review_required", reason: `donnée ancienne (${Math.round(ageDays)} j)` };
  return ok;
}

/** Combine plusieurs résultats : le plus sévère l'emporte (rejected > review > valid). */
export function worstOf(results: ValidationResult[]): ValidationResult {
  const rank: Record<ValidationStatus, number> = { valid: 0, review_required: 1, rejected: 2 };
  let worst = ok;
  for (const r of results) if (rank[r.status] > rank[worst.status]) worst = r;
  return worst;
}
