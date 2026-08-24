/**
 * Moteur d'allocation « parts d'un tout » — les poids somment TOUJOURS à 100 %.
 *
 * Problème corrigé : des curseurs indépendants (0..100 chacun) laissaient le
 * total dériver (110 %, 70 %…) et le % affiché par ligne ne correspondait pas à
 * la part réelle du portefeuille (recalculée seulement à l'enregistrement) —
 * l'ajustement « se faisait mal » et n'était pas intuitif.
 *
 * Ici, éditer une ligne rééquilibre les autres proportionnellement : ce qu'on
 * voit est ce qu'on obtient. Fonctions PURES (aucune dépendance UI), testables.
 *
 * `pct` est exprimé en points de pourcentage (0..100).
 */

export interface Weighted {
  id: string;
  pct: number;
}

const clamp100 = (v: number): number => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));

/** Renormalise les lignes pour que la somme fasse exactement 100 (proportionnel ;
 *  réparti à parts égales si la somme est nulle). Ignore les poids négatifs. */
export function normalizeTo100<T extends Weighted>(rows: T[]): T[] {
  if (rows.length === 0) return rows;
  const sum = rows.reduce((s, r) => s + Math.max(0, r.pct), 0);
  if (sum <= 0) {
    const eq = 100 / rows.length;
    return rows.map((r) => ({ ...r, pct: eq }));
  }
  return rows.map((r) => ({ ...r, pct: (Math.max(0, r.pct) / sum) * 100 }));
}

/**
 * Fixe la part de la ligne `id` à `value` (0..100) et répartit le reste
 * (100 − value) sur les AUTRES lignes, proportionnellement à leurs parts
 * courantes (à parts égales si elles sont toutes à 0). Le total reste 100.
 */
export function setShare<T extends Weighted>(rows: T[], id: string, value: number): T[] {
  const v = clamp100(value);
  const others = rows.filter((r) => r.id !== id);
  if (others.length === 0) {
    // Une seule ligne : elle porte tout le portefeuille.
    return rows.map((r) => (r.id === id ? { ...r, pct: 100 } : r));
  }
  const remaining = 100 - v;
  const othersSum = others.reduce((s, r) => s + Math.max(0, r.pct), 0);
  return rows.map((r) => {
    if (r.id === id) return { ...r, pct: v };
    if (othersSum <= 0) return { ...r, pct: remaining / others.length };
    return { ...r, pct: (Math.max(0, r.pct) / othersSum) * remaining };
  });
}

/** Retire la ligne `id` puis renormalise le reste à 100. */
export function removeShare<T extends Weighted>(rows: T[], id: string): T[] {
  return normalizeTo100(rows.filter((r) => r.id !== id));
}

/**
 * Ajoute une ligne en lui donnant une part équitable (1/n du nouveau total) et
 * en réduisant les autres pour tenir 100, tout en conservant leurs proportions
 * relatives. Ajout d'une ligne déjà présente : sans effet.
 */
export function addBalanced<T extends Weighted>(rows: T[], row: T): T[] {
  if (rows.some((r) => r.id === row.id)) return rows;
  const n = rows.length + 1;
  const share = 100 / n;
  const othersSum = rows.reduce((s, r) => s + Math.max(0, r.pct), 0);
  const scaled = rows.map((r) => ({
    ...r,
    pct:
      othersSum > 0
        ? (Math.max(0, r.pct) / othersSum) * (100 - share)
        : (100 - share) / rows.length,
  }));
  return [...scaled, { ...row, pct: share }];
}

/** Somme des parts — vaut 100 (au epsilon flottant près) après toute opération ci-dessus. */
export function totalPct<T extends Weighted>(rows: T[]): number {
  return rows.reduce((s, r) => s + r.pct, 0);
}
