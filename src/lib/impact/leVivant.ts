/**
 * Le Vivant — modèle génératif de l'« organisme d'impact ».
 *
 * Fonction PURE, sans dépendance UI/DB, testable isolément. Elle transforme la
 * composition RÉELLE d'un portefeuille (répartition par thème + qualité ESG des
 * lignes) en une structure d'organisme : une branche par conviction, des graines
 * proportionnelles au poids, une vitalité dérivée du score ESG réel.
 *
 * Deux garde-fous de marque (CLAUDE.md §1.2, §1.3) :
 *  - Aucune donnée inventée : une branche n'existe que si le thème pèse vraiment
 *    dans le portefeuille ; la part « non classée » est représentée honnêtement.
 *  - Rien n'est aléatoire au sens « faux » : la forme est DÉTERMINISTE (seed dérivé
 *    de l'id du portefeuille), donc stable dans le temps et unique par utilisateur.
 *
 * Le rendu (canvas, couleurs, animation) est une responsabilité du composant
 * `LeVivant.tsx` ; ce module ne décrit que la structure.
 */
import type { CauseTag } from "@/lib/portfolio/types";
import type { ThemeBreakdown } from "@/lib/impact/themeBreakdown";

export type BranchKind = CauseTag | "unclassified";

export interface OrganismBranch {
  kind: BranchKind;
  /** Part de l'organisme occupée par la branche (0..1, somme des branches = 1). */
  weight: number;
  /** Santé de la branche (0..1), dérivée du score ESG réel des lignes du thème. */
  vitality: number;
  /** Nombre de graines à dessiner (entier ≥ 1). */
  seedCount: number;
  /** Angle de départ de la branche en radians (déterministe). */
  angle: number;
  /** Longueur relative de la branche (0..1). */
  reach: number;
}

export interface Organism {
  /** Graine déterministe dérivée de l'id du portefeuille. */
  seed: number;
  branches: OrganismBranch[];
  /** Nombre total de graines vivantes de l'organisme. */
  totalSeeds: number;
  /** Vitalité globale (0..1), moyenne pondérée des branches. */
  vitality: number;
}

export interface OrganismHolding {
  allocationPct: number; // 0..100
  esgScore: number; // 0..100
  causeExposure: Partial<Record<CauseTag, number>>;
}

export interface OrganismInput {
  portfolioId: string;
  breakdown: ThemeBreakdown;
  holdings: OrganismHolding[];
  /** Nombre de graines de base réparti entre les branches. Défaut : 22. */
  baseSeeds?: number;
}

const ALL_CAUSES: CauseTag[] = [
  "climat",
  "biodiversite",
  "humain",
  "egalite",
  "tech",
  "circulaire",
];

const BASE_SEEDS_DEFAULT = 22;
const MAX_SEEDS_PER_BRANCH = 9;
/** En-deçà, la part « non classée » n'ouvre pas de branche (bruit d'arrondi). */
const UNCLASSIFIED_MIN_PCT = 4;

/** Hash déterministe (FNV-1a 32 bits) d'une chaîne → entier non signé. */
export function hashSeed(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** PRNG mulberry32 : déterministe, reproductible, suffisant pour de la forme. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Vitalité moyenne des lignes exposées à une cause donnée, pondérée par le poids
 * de la ligne × son intensité sur cette cause. Retourne null si aucune donnée.
 */
function causeVitality(holdings: OrganismHolding[], cause: CauseTag): number | null {
  let wSum = 0;
  let esgSum = 0;
  for (const h of holdings) {
    const alloc = Number.isFinite(h.allocationPct) ? Math.max(0, h.allocationPct) : 0;
    const exp = h.causeExposure?.[cause];
    if (alloc <= 0 || typeof exp !== "number" || !Number.isFinite(exp) || exp <= 0) continue;
    const esg = Number.isFinite(h.esgScore) ? Math.max(0, Math.min(100, h.esgScore)) : 0;
    const w = alloc * exp;
    wSum += w;
    esgSum += w * esg;
  }
  if (wSum <= 0) return null;
  return Math.max(0, Math.min(1, esgSum / wSum / 100));
}

/** Vitalité moyenne de tout le portefeuille (repli quand une cause n'a pas de donnée). */
function overallVitality(holdings: OrganismHolding[]): number {
  let wSum = 0;
  let esgSum = 0;
  for (const h of holdings) {
    const alloc = Number.isFinite(h.allocationPct) ? Math.max(0, h.allocationPct) : 0;
    if (alloc <= 0) continue;
    const esg = Number.isFinite(h.esgScore) ? Math.max(0, Math.min(100, h.esgScore)) : 0;
    wSum += alloc;
    esgSum += alloc * esg;
  }
  if (wSum <= 0) return 0.5;
  return Math.max(0, Math.min(1, esgSum / wSum / 100));
}

/**
 * Construit l'organisme d'un portefeuille.
 *
 * @param input Composition réelle (répartition par thème + lignes + id).
 * @returns Structure déterministe prête à être rendue.
 */
export function buildOrganism(input: OrganismInput): Organism {
  const seed = hashSeed(input.portfolioId || "seedow");
  const rand = mulberry32(seed);
  const baseSeeds = input.baseSeeds ?? BASE_SEEDS_DEFAULT;
  const fallbackVitality = overallVitality(input.holdings);

  // Branches candidates : chaque thème présent + la part non classée si notable.
  type Cand = { kind: BranchKind; weightPct: number; vitality: number };
  const cands: Cand[] = [];

  for (const slice of input.breakdown.slices) {
    if (slice.pct <= 0) continue;
    const v = causeVitality(input.holdings, slice.cause);
    cands.push({
      kind: slice.cause,
      weightPct: slice.pct,
      vitality: v ?? fallbackVitality,
    });
  }

  if (input.breakdown.unclassifiedPct >= UNCLASSIFIED_MIN_PCT) {
    cands.push({
      kind: "unclassified",
      weightPct: input.breakdown.unclassifiedPct,
      // Une part non classée est neutre : ni saine ni malade, juste inconnue.
      vitality: 0.5,
    });
  }

  const totalPct = cands.reduce((s, c) => s + c.weightPct, 0);

  // Portefeuille sans aucune exposition exploitable : organisme en germination.
  if (cands.length === 0 || totalPct <= 0) {
    return { seed, branches: [], totalSeeds: 0, vitality: fallbackVitality };
  }

  const maxPct = Math.max(...cands.map((c) => c.weightPct));
  // Répartition angulaire sur un éventail vers le haut, du plus lourd au centre.
  const n = cands.length;
  const spread = Math.PI * 0.86; // ~155°

  const branches: OrganismBranch[] = cands.map((c, i) => {
    const weight = c.weightPct / totalPct;
    const seedCount = Math.max(1, Math.min(MAX_SEEDS_PER_BRANCH, Math.round(weight * baseSeeds)));
    // Angle de base réparti régulièrement, plus un léger décalage déterministe.
    const base = -Math.PI / 2 + (i - (n - 1) / 2) * (spread / Math.max(1, n));
    const jitter = (rand() - 0.5) * 0.18;
    const reach = 0.62 + 0.38 * (c.weightPct / maxPct);
    return {
      kind: c.kind,
      weight,
      vitality: Math.max(0, Math.min(1, c.vitality)),
      seedCount,
      angle: base + jitter,
      reach: Math.max(0, Math.min(1, reach)),
    };
  });

  const totalSeeds = branches.reduce((s, b) => s + b.seedCount, 0);
  const vitality = branches.reduce((s, b) => s + b.vitality * b.weight, 0);

  return { seed, branches, totalSeeds, vitality: Math.max(0, Math.min(1, vitality)) };
}

/** Ordre canonique des causes (utile pour un affichage stable ailleurs). */
export const ORGANISM_CAUSE_ORDER = ALL_CAUSES;
