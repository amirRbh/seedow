/**
 * « Où va ton argent » — la répartition qui alimente le flux de la landing.
 *
 * Ce module ne fait qu'une chose : traduire des convictions (causes cochées,
 * secteurs refusés) en parts de portefeuille. Le composant, lui, se contente
 * de dessiner ce qu'on lui donne — aucun calcul dans le canvas (CLAUDE.md §3).
 *
 * ── Ce que ce schéma est, et n'est pas ───────────────────────────────────
 *
 * C'est une ILLUSTRATION DU MÉCANISME : cocher « climat » déplace le flux vers
 * ce qui finance le climat, refuser les fossiles le vide de cette destination.
 * Ce ne sont pas les parts d'un portefeuille réel, et l'écran le dit
 * explicitement (CLAUDE.md §1.3 — pas de sur-promesse). Les vraies allocations
 * sont calculées par `lib/portfolio/` à partir de données datées et sourcées.
 *
 * Le vocabulaire, lui, est celui du produit : les mêmes `CauseTag` et
 * `ExclusionTag` que le questionnaire d'onboarding, pour que le visiteur
 * retrouve exactement ces mots à l'étape suivante.
 */
import type { CauseTag, ExclusionTag } from "@/lib/portfolio/types";

export type FlowLaneId =
  | "renouvelable"
  | "renovation"
  | "vivant"
  | "social"
  | "diversifie"
  | "fossile"
  | "armement";

/**
 * Le token de couleur d'une destination — résolu au runtime depuis le CSS,
 * jamais écrit en dur : la bande sombre remappe déjà `--mint` & co sur leurs
 * variantes lumineuses (`.on-deep` dans styles.css), donc le même code marche
 * sur fond clair comme sur fond sombre.
 */
export type FlowLaneToken = "--mint" | "--ice" | "--volt" | "--ink-3" | "--alert" | "--solar";

export type FlowLane = {
  id: FlowLaneId;
  token: FlowLaneToken;
  /** Part de départ, avant toute conviction — elles totalisent 100. */
  base: number;
  /** La cause qui pousse le flux vers cette destination. */
  cause?: CauseTag;
  /** Le refus qui la vide entièrement. */
  exclusion?: ExclusionTag;
};

/**
 * Sept destinations : assez pour que le flux se lise, assez peu pour qu'on
 * puisse toutes les nommer à l'écran. « Industrie diversifiée » est le reste —
 * il absorbe ce qui n'est ni ciblé ni refusé, et c'est pour ça qu'il est gris.
 */
export const FLOW_LANES: readonly FlowLane[] = [
  { id: "renouvelable", token: "--mint", base: 14, cause: "climat" },
  { id: "renovation", token: "--mint", base: 11, cause: "climat" },
  { id: "vivant", token: "--ice", base: 8, cause: "biodiversite" },
  { id: "social", token: "--volt", base: 10, cause: "humain" },
  { id: "diversifie", token: "--ink-3", base: 39 },
  { id: "fossile", token: "--alert", base: 13, exclusion: "fossiles" },
  { id: "armement", token: "--solar", base: 5, exclusion: "armes" },
] as const;

/** Les causes proposées sur la landing — un sous-ensemble de l'onboarding. */
export const FLOW_CAUSES: readonly CauseTag[] = ["climat", "biodiversite", "humain"] as const;

/** Les refus proposés sur la landing. */
export const FLOW_EXCLUSIONS: readonly ExclusionTag[] = ["fossiles", "armes"] as const;

/**
 * Ce que cocher une cause fait au flux. 2,6 est choisi pour que le déplacement
 * se VOIE sans caricaturer : une cause cochée pèse nettement plus, sans vider
 * le reste du portefeuille — un portefeuille mono-thématique serait un
 * mensonge sur ce que fait le moteur d'allocation.
 */
const CAUSE_BOOST = 2.6;

export type FlowShare = {
  id: FlowLaneId;
  token: FlowLaneToken;
  /** Part en pourcent, entière ; les parts totalisent exactement 100. */
  share: number;
  /** Vrai quand la destination est refusée : elle est à 0, et on l'écrit. */
  excluded: boolean;
};

/**
 * Répartit 100 % entre les destinations selon les convictions cochées.
 *
 * Les parts sont arrondies à l'entier par plus fort reste, pour que la colonne
 * affichée totalise exactement 100 : trois arrondis indépendants donnaient
 * « 99 % » à l'écran, ce qui fait douter de tout le reste.
 */
export function computeFlowAllocation(
  causes: readonly CauseTag[],
  exclusions: readonly ExclusionTag[],
): FlowShare[] {
  const weights = FLOW_LANES.map((lane) => {
    if (lane.exclusion && exclusions.includes(lane.exclusion)) return 0;
    if (lane.cause && causes.includes(lane.cause)) return lane.base * CAUSE_BOOST;
    return lane.base;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  // Garde-fou : tout exclu est impossible (« diversifié » ne l'est jamais),
  // mais un total nul renverrait NaN plutôt qu'un écran vide honnête.
  if (total <= 0) {
    return FLOW_LANES.map((lane) => ({ id: lane.id, token: lane.token, share: 0, excluded: true }));
  }

  const exact = weights.map((w) => (w / total) * 100);
  const floored = exact.map(Math.floor);
  let remainder = 100 - floored.reduce((a, b) => a + b, 0);

  // Plus fort reste — les destinations à 0 (refusées) n'y participent pas.
  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .filter(({ index }) => weights[index] > 0)
    .sort((a, b) => b.frac - a.frac);

  for (const { index } of order) {
    if (remainder <= 0) break;
    floored[index] += 1;
    remainder -= 1;
  }

  return FLOW_LANES.map((lane, index) => ({
    id: lane.id,
    token: lane.token,
    share: floored[index],
    excluded: weights[index] === 0,
  }));
}
