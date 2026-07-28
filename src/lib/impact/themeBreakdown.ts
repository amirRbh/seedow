/**
 * Répartition d'un portefeuille par thème (climat, biodiversité, humain,
 * égalité, tech, circulaire). Fonction PURE : agrège les `causeExposure`
 * déclarés sur chaque holding pondérés par leur poids d'allocation.
 *
 * Aucune invention : si un actif n'a aucune exposition déclarée, il n'entre
 * dans aucun thème (il alimente la part « non classé »). C'est intentionnel —
 * on préfère une part honnête « non classé » à un thème par défaut inventé.
 */
import type { CauseTag } from "@/lib/portfolio/types";

export interface ThemeSlice {
  cause: CauseTag;
  /** Poids relatif du thème dans le portefeuille, en % (0..100). */
  pct: number;
}

export interface ThemeBreakdown {
  /** Thèmes triés desc par poids, seuls ceux > 0 sont inclus. */
  slices: ThemeSlice[];
  /** Part du portefeuille non rattachable à un thème (0..100). */
  unclassifiedPct: number;
  /** Nombre de holdings pris en compte. */
  holdingsCount: number;
}

interface HoldingLike {
  allocationPct: number; // 0..100
  causeExposure: Partial<Record<CauseTag, number>>;
}

const ALL_CAUSES: CauseTag[] = [
  "climat",
  "biodiversite",
  "humain",
  "egalite",
  "tech",
  "circulaire",
];

/**
 * Agrège la répartition par thème.
 *
 * Pour chaque holding, on normalise `causeExposure` de sorte que la somme des
 * expositions vaille 1 (si non nulle), puis on multiplie par le poids du
 * holding. Un holding sans exposition alimente la part « non classé ».
 */
export function buildThemeBreakdown(holdings: HoldingLike[]): ThemeBreakdown {
  const totals: Record<CauseTag, number> = {
    climat: 0,
    biodiversite: 0,
    humain: 0,
    egalite: 0,
    tech: 0,
    circulaire: 0,
  };
  let unclassified = 0;

  for (const h of holdings) {
    const w = Number.isFinite(h.allocationPct) ? Math.max(0, h.allocationPct) : 0;
    if (w <= 0) continue;

    let sum = 0;
    for (const c of ALL_CAUSES) {
      const v = h.causeExposure?.[c];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) sum += v;
    }

    if (sum <= 0) {
      unclassified += w;
      continue;
    }

    for (const c of ALL_CAUSES) {
      const v = h.causeExposure?.[c];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        totals[c] += (v / sum) * w;
      }
    }
  }

  const slices: ThemeSlice[] = ALL_CAUSES.map((cause) => ({ cause, pct: totals[cause] }))
    .filter((s) => s.pct > 0.05) // < 0.05 % = bruit d'arrondi, on l'ignore
    .sort((a, b) => b.pct - a.pct);

  return {
    slices,
    unclassifiedPct: unclassified,
    holdingsCount: holdings.filter((h) => h.allocationPct > 0).length,
  };
}
