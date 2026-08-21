/**
 * Éligibilité de l'univers — Étage 1 du Personal Investment Universe
 * (docs/ARCHITECTURE-PIU.md §5.2). Filtre BINAIRE, sans pondération : un actif
 * est éligible ou ne l'est pas. Le classement pondéré (Étage 2) vient après, via
 * le moteur de matching.
 *
 * Contrat de transparence (§1.2/§1.3, non négociable) : `available_eu` et
 * `share_class_of` sont NULL partout tant qu'aucune ingestion sourcée ne les a
 * renseignés. NULL = « inconnu, donc non affirmé » — on ne le traite JAMAIS comme
 * un « oui » ni comme un « non » silencieux :
 *   - une disponibilité CONFIRMÉE fausse (available_eu = false) bloque toujours ;
 *   - une disponibilité INCONNUE (null) est un AVERTISSEMENT, pas un blocage —
 *     sauf si l'utilisateur exige explicitement des actifs confirmés disponibles
 *     (`availableEuOnly`), auquel cas l'inconnu ne peut pas passer.
 *
 * Ainsi l'univers ne se vide pas artificiellement sur des colonnes encore vides,
 * et on ne présente jamais un actif non vérifié comme disponible.
 *
 * Fonctions PURES, aucune I/O. La forme d'entrée est un sous-ensemble minimal de
 * `assets` (pas de couplage au client Supabase).
 */

import type { ExclusionTag } from "@/lib/portfolio/types";

/** Couverture de nos données pour un actif (aligné sur esg/transparency). */
export type DataCoverage = "complete" | "partial" | "estimated";
const COVERAGE_RANK: Record<DataCoverage, number> = { estimated: 0, partial: 1, complete: 2 };

/** Sous-ensemble de `assets` nécessaire au jugement d'éligibilité. */
export interface EligibilityAsset {
  id: string;
  isActive: boolean;
  /** true = confirmé dispo UE, false = confirmé indispo, null = non vérifié. */
  availableEu: boolean | null;
  /** Non-null = cette ligne est une autre share-class d'un actif canonique. */
  shareClassOf: string | null;
  excludedSectors: ExclusionTag[];
  /** Couverture de nos données, si connue. */
  dataCoverage?: DataCoverage;
}

/** Critères de l'utilisateur (dérivés des préférences / contraintes). */
export interface EligibilityCriteria {
  exclusions: ExclusionTag[];
  /** N'accepter que les actifs CONFIRMÉS disponibles UE (inconnu → exclu). */
  availableEuOnly?: boolean;
  /** Masquer les share-classes non canoniques (dédup). Défaut : true. */
  requireCanonicalShareClass?: boolean;
  /** Couverture minimale exigée. Absent → aucun plancher de couverture. */
  minCoverage?: DataCoverage;
}

/** Motifs de (non-)éligibilité — ids stables, traduits côté UI. */
export type EligibilityReason =
  | "inactive"
  | "excluded_sector"
  | "not_available_eu" // disponibilité CONFIRMÉE négative
  | "availability_unknown" // disponibilité non vérifiée (null)
  | "non_canonical_share_class"
  | "insufficient_coverage";

export interface EligibilityResult {
  eligible: boolean;
  /** Motifs qui EXCLUENT l'actif (vide si éligible). */
  blockedBy: EligibilityReason[];
  /** Motifs signalés mais NON bloquants (ex. disponibilité inconnue tolérée). */
  warnings: EligibilityReason[];
}

/**
 * Juge l'éligibilité d'un actif pour un utilisateur. Ne décide jamais à partir
 * d'un `null` traité comme un booléen : l'inconnu est explicite.
 */
export function assessEligibility(
  asset: EligibilityAsset,
  criteria: EligibilityCriteria,
): EligibilityResult {
  const blockedBy: EligibilityReason[] = [];
  const warnings: EligibilityReason[] = [];
  const requireCanonical = criteria.requireCanonicalShareClass ?? true;

  if (!asset.isActive) blockedBy.push("inactive");

  // Exclusions dures : intersection non vide → bloqué.
  if (criteria.exclusions.length > 0) {
    const set = new Set(criteria.exclusions);
    if (asset.excludedSectors.some((s) => set.has(s))) blockedBy.push("excluded_sector");
  }

  // Disponibilité UE — traitement honnête du null.
  if (asset.availableEu === false) {
    blockedBy.push("not_available_eu");
  } else if (asset.availableEu === null) {
    if (criteria.availableEuOnly) blockedBy.push("availability_unknown");
    else warnings.push("availability_unknown");
  }

  // Déduplication des share-classes.
  if (asset.shareClassOf !== null) {
    if (requireCanonical) blockedBy.push("non_canonical_share_class");
    else warnings.push("non_canonical_share_class");
  }

  // Plancher de couverture, si exigé.
  if (criteria.minCoverage) {
    const have = asset.dataCoverage;
    if (have === undefined || COVERAGE_RANK[have] < COVERAGE_RANK[criteria.minCoverage]) {
      blockedBy.push("insufficient_coverage");
    }
  }

  return { eligible: blockedBy.length === 0, blockedBy, warnings };
}

/** Ne garde que les actifs éligibles selon les critères. */
export function filterEligible<T extends EligibilityAsset>(
  assets: T[],
  criteria: EligibilityCriteria,
): T[] {
  return assets.filter((a) => assessEligibility(a, criteria).eligible);
}

/**
 * Partitionne l'univers en éligibles / exclus (avec motif), pour un affichage
 * honnête : on montre COMBIEN d'actifs et POURQUOI certains sont écartés, plutôt
 * qu'un simple total sans dénominateur (§5.4 — jamais de compte sans base).
 */
export interface UniversePartition<T> {
  eligible: T[];
  excluded: { asset: T; reasons: EligibilityReason[] }[];
  /** Total analysé = eligible + excluded (le « sur N analysés »). */
  analyzed: number;
}

export function partitionUniverse<T extends EligibilityAsset>(
  assets: T[],
  criteria: EligibilityCriteria,
): UniversePartition<T> {
  const eligible: T[] = [];
  const excluded: { asset: T; reasons: EligibilityReason[] }[] = [];
  for (const asset of assets) {
    const res = assessEligibility(asset, criteria);
    if (res.eligible) eligible.push(asset);
    else excluded.push({ asset, reasons: res.blockedBy });
  }
  return { eligible, excluded, analyzed: assets.length };
}
