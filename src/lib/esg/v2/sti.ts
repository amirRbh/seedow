/**
 * Indice de transparence Seedow — STI 2.0.
 *
 * ── Ce qui a été abandonné, et pourquoi ───────────────────────────────────
 *
 * Le score de durabilité 0–100 de la v1 est supprimé. Trois raisons, dans
 * l'ordre :
 *
 *  1. Il est indéfendable. Noter la durabilité d'un fonds suppose de mesurer un
 *     effet sur le monde. Seedow écrit lui-même qu'il ne mesure pas cet effet
 *     (`/methodologie`, §« ce que Seedow ne mesure pas »). Le score comblait ce
 *     vide par des estimations internes non publiées : la structure exacte du
 *     greenwashing que la marque dénonce.
 *  2. Il est perdu d'avance. Sur le terrain de la notation de durabilité, les
 *     concurrents ont des équipes d'analystes et des données propriétaires ;
 *     Seedow n'a que des documents publics.
 *  3. Il produit des classements toxiques. Tout agrégat unique finit par poser
 *     un ETF nucléaire au-dessus d'un ETF solaire, quelle que soit la
 *     pondération.
 *
 * ── Ce que le STI mesure à la place ───────────────────────────────────────
 *
 * Pas si un fonds est durable : **ce qu'il publie, et à quel niveau de
 * précision**. C'est un fait vérifiable par un tiers, indépendant de la
 * domiciliation, non attaquable, et personne ne le publie.
 *
 * Le renversement compte : un fonds qui ne publie pas son intensité carbone ne
 * dégrade plus la fiabilité de Seedow, il dégrade sa propre note. La limite de
 * données de Seedow cesse d'être un handicap masqué — elle devient le sujet.
 *
 * ── Ce que le STI NE mesure PAS ───────────────────────────────────────────
 *
 * La sévérité. Le bloc B note la PRÉCISION d'une déclaration d'exclusion, pas
 * son ambition : un fonds qui déclare explicitement ne pas exclure les fossiles
 * est plus transparent qu'un fonds silencieux, et le STI le dit. Cette phrase
 * doit rester lisible sur la page méthodologie, sinon la grille sera lue de
 * travers (spec §3.2, bloc B).
 *
 * Fonctions pures, sans I/O.
 */
import {
  isResolved,
  parseIsoDate,
  publishedDate,
  unverified,
  type TransparencySignal,
} from "./signal";

/** Version de la grille. Tout score publié la porte (spec §7, §8). */
export const STI_VERSION = "2.0";

export type StiBlockId = "A" | "B" | "C" | "D" | "E";

/** Les six secteurs évalués par le bloc B — liste fermée, alignée sur l'onboarding. */
export const STI_SECTORS = [
  "fossiles",
  "armement",
  "tabac",
  "jeux",
  "tests_animaux",
  "fast_fashion",
] as const;
export type StiSector = (typeof STI_SECTORS)[number];

/** Niveau de précision d'une exclusion déclarée (valeur du signal, bloc B). */
export type ExclusionPrecision = "seuil_quantifie" | "declare_sans_seuil";

export const STI_SIGNAL_IDS = [
  // ── Bloc A — documentation accessible (30 pts) ──
  "kid_public",
  "exclusion_policy_public",
  "esg_report_annual",
  "holdings_full_monthly",
  // ── Bloc B — précision des exclusions (25 pts, plafonné) ──
  "exclusion_fossiles",
  "exclusion_armement",
  "exclusion_tabac",
  "exclusion_jeux",
  "exclusion_tests_animaux",
  "exclusion_fast_fashion",
  // ── Bloc C — métriques d'impact publiées (25 pts) ──
  "carbon_scope_1_2",
  "carbon_scope_3",
  "carbon_coverage_rate",
  "pai_published",
  // ── Bloc E — vérification tierce (10 pts) ──
  "public_label",
  "third_party_audit",
] as const;
export type StiSignalId = (typeof STI_SIGNAL_IDS)[number];

/** Points d'un signal binaire (blocs A, C, E). */
const BINARY_POINTS: Record<Exclude<StiSignalId, `exclusion_${StiSector}`>, number> = {
  kid_public: 5,
  exclusion_policy_public: 10,
  esg_report_annual: 5,
  holdings_full_monthly: 10,
  carbon_scope_1_2: 10,
  carbon_scope_3: 5,
  carbon_coverage_rate: 5,
  pai_published: 5,
  public_label: 5,
  third_party_audit: 5,
};

/** Points du bloc B, par secteur et par niveau de précision. */
const EXCLUSION_POINTS: Record<ExclusionPrecision, number> = {
  seuil_quantifie: 4,
  declare_sans_seuil: 2,
};

/** Plafond du bloc B : 6 secteurs × 4 pts = 24 nominal, borné à 25 par la grille. */
const BLOCK_B_MAX = 25;

const BLOCK_SIGNALS: Record<StiBlockId, readonly StiSignalId[]> = {
  A: ["kid_public", "exclusion_policy_public", "esg_report_annual", "holdings_full_monthly"],
  B: STI_SECTORS.map((s) => `exclusion_${s}` as StiSignalId),
  C: ["carbon_scope_1_2", "carbon_scope_3", "carbon_coverage_rate", "pai_published"],
  // Le bloc D ne se collecte pas : il se DÉDUIT des dates des blocs A et C.
  D: [],
  E: ["public_label", "third_party_audit"],
};

/** Points maximum de chaque bloc — la grille publiée, en un seul endroit. */
export const BLOCK_MAX: Record<StiBlockId, number> = { A: 30, B: BLOCK_B_MAX, C: 25, D: 10, E: 10 };

// ── Bloc D — barème de fraîcheur, en mois ──
const FRESHNESS_TIERS: { maxMonths: number; points: number }[] = [
  { maxMonths: 3, points: 10 },
  { maxMonths: 6, points: 6 },
  { maxMonths: 12, points: 3 },
];
const DAYS_PER_MONTH = 30.44;

export interface StiBlockResult {
  id: StiBlockId;
  /** Points obtenus. `0` quand le bloc est évalué et que rien n'est publié. */
  earned: number;
  /** Points maximum du bloc tels que la grille les publie. */
  max: number;
  /**
   * `false` quand la source n'a pas pu être atteinte : le bloc est alors NUL,
   * pas zéro (spec §3.3). Il sort du calcul et le reste est reproportionné.
   */
  evaluable: boolean;
  /** Signaux du bloc restés `non_vérifié`, nommés un par un (spec §7). */
  unverifiedSignals: StiSignalId[];
}

export type StiLabel = "elevee" | "correcte" | "partielle" | "faible" | "non_notable";

export interface StiResult {
  version: typeof STI_VERSION;
  /** 0–100 reproportionné sur les blocs évalués, ou `null` si non publiable. */
  score: number | null;
  label: StiLabel;
  blocks: StiBlockResult[];
  blocksEvaluated: number;
  /** Toujours 5 — affiché tel quel (« calculé sur 4 blocs sur 5 »). */
  blocksTotal: number;
  /**
   * `false` → la fiche affiche « Documentation insuffisante pour être noté »,
   * sans chiffre. Un score absent n'est pas un mauvais score.
   */
  publishable: boolean;
  /** Tous les signaux `non_vérifié`, tous blocs confondus (spec §7). */
  unverifiedSignals: StiSignalId[];
  /** Date de la donnée la plus ANCIENNE utilisée (spec §7). */
  oldestDataDate: string | null;
  /** Date de la donnée la plus récente — l'entrée du bloc D. */
  freshestDataDate: string | null;
}

/** Condition de publication (spec §3.3) : 4 blocs sur 5, dont A et B. */
const MIN_EVALUABLE_BLOCKS = 4;
const MANDATORY_BLOCKS: StiBlockId[] = ["A", "B"];

type SignalMap = Map<string, TransparencySignal<string>>;

function toMap(signals: readonly TransparencySignal<string>[]): SignalMap {
  const map: SignalMap = new Map();
  for (const s of signals) map.set(s.signal, s);
  return map;
}

function get(map: SignalMap, id: StiSignalId): TransparencySignal<string> {
  return map.get(id) ?? unverified(id);
}

/** Points d'un signal binaire : publié = son barème, absent = 0. */
function binaryPoints(map: SignalMap, id: StiSignalId): number {
  const s = get(map, id);
  if (s.statut !== "publie") return 0;
  return BINARY_POINTS[id as keyof typeof BINARY_POINTS] ?? 0;
}

/**
 * Bloc B — on note ce que la déclaration DIT, pas ce qu'elle vaut. Une valeur
 * inconnue sur un signal publié se lit comme une déclaration sans seuil : le
 * document existe, sa précision n'a simplement pas pu être qualifiée plus haut.
 */
function exclusionPoints(map: SignalMap, sector: StiSector): number {
  const s = get(map, `exclusion_${sector}` as StiSignalId);
  if (s.statut !== "publie") return 0;
  const precision: ExclusionPrecision =
    s.valeur === "seuil_quantifie" ? "seuil_quantifie" : "declare_sans_seuil";
  return EXCLUSION_POINTS[precision];
}

function unverifiedIn(map: SignalMap, block: StiBlockId): StiSignalId[] {
  return BLOCK_SIGNALS[block].filter((id) => !isResolved(get(map, id)));
}

/**
 * Bloc D — ancienneté de la donnée publiée la plus récente parmi A et C.
 *
 * Deux cas à ne pas confondre : aucune date parce que rien n'a été cherché (le
 * bloc devient non évaluable, comme les autres) et aucune date parce que les
 * documents publiés ne sont pas datés (0 point : c'est un défaut du fonds).
 */
function freshnessPoints(freshestMs: number | null, nowMs: number): number {
  if (freshestMs == null) return 0;
  const months = (nowMs - freshestMs) / (DAYS_PER_MONTH * 86_400_000);
  if (months < 0) return FRESHNESS_TIERS[0].points; // date future : on ne pénalise pas
  for (const tier of FRESHNESS_TIERS) if (months <= tier.maxMonths) return tier.points;
  return 0;
}

export function stiLabel(score: number | null): StiLabel {
  if (score == null || !Number.isFinite(score)) return "non_notable";
  if (score >= 80) return "elevee";
  if (score >= 60) return "correcte";
  if (score >= 40) return "partielle";
  return "faible";
}

export interface ComputeStiOptions {
  /** Date de référence pour la fraîcheur (injectée pour rendre les tests stables). */
  now?: Date;
}

/**
 * Calcule le STI d'un fonds à partir de ses signaux collectés.
 *
 * Un bloc est ÉVALUABLE quand tous ses signaux ont été résolus (`publié` ou
 * `absent`). Un seul `non_vérifié` suffit à le rendre nul : mieux vaut publier
 * « calculé sur 4 blocs sur 5 » qu'un chiffre qui mélange un fait et un trou de
 * collecte.
 */
export function computeSti(
  signals: readonly TransparencySignal<string>[],
  options: ComputeStiOptions = {},
): StiResult {
  const map = toMap(signals);
  const nowMs = (options.now ?? new Date()).getTime();

  // ── Dates, lues sur les seuls signaux publiés des blocs A et C ──
  const datedMs: number[] = [];
  for (const id of [...BLOCK_SIGNALS.A, ...BLOCK_SIGNALS.C]) {
    const ms = parseIsoDate(publishedDate(get(map, id)));
    if (ms != null) datedMs.push(ms);
  }
  const freshestMs = datedMs.length ? Math.max(...datedMs) : null;
  const oldestMs = datedMs.length ? Math.min(...datedMs) : null;
  const iso = (ms: number | null) => (ms == null ? null : new Date(ms).toISOString().slice(0, 10));

  const earned: Record<StiBlockId, number> = {
    A: BLOCK_SIGNALS.A.reduce((acc, id) => acc + binaryPoints(map, id), 0),
    B: Math.min(
      BLOCK_B_MAX,
      STI_SECTORS.reduce((acc, s) => acc + exclusionPoints(map, s), 0),
    ),
    C: BLOCK_SIGNALS.C.reduce((acc, id) => acc + binaryPoints(map, id), 0),
    D: freshnessPoints(freshestMs, nowMs),
    E: BLOCK_SIGNALS.E.reduce((acc, id) => acc + binaryPoints(map, id), 0),
  };

  const blocks: StiBlockResult[] = (["A", "B", "C", "D", "E"] as StiBlockId[]).map((id) => {
    const unverifiedSignals = unverifiedIn(map, id);
    // Le bloc D n'a pas de signal propre : il est évaluable dès qu'un bloc source
    // (A ou C) l'est, sinon il n'y a rien à dater.
    const evaluable =
      id === "D"
        ? unverifiedIn(map, "A").length === 0 || unverifiedIn(map, "C").length === 0
        : unverifiedSignals.length === 0;
    return { id, earned: earned[id], max: BLOCK_MAX[id], evaluable, unverifiedSignals };
  });

  const evaluated = blocks.filter((b) => b.evaluable);
  const mandatoryOk = MANDATORY_BLOCKS.every(
    (id) => blocks.find((b) => b.id === id)?.evaluable === true,
  );
  const publishable = evaluated.length >= MIN_EVALUABLE_BLOCKS && mandatoryOk;

  const availableMax = evaluated.reduce((acc, b) => acc + b.max, 0);
  const rawScore = evaluated.reduce((acc, b) => acc + b.earned, 0);
  // Reproportionné sur les blocs évalués (spec §3.3) — jamais sur 100 en
  // faisant comme si un bloc non vérifié valait zéro.
  const score =
    publishable && availableMax > 0 ? Math.round((100 * rawScore) / availableMax) : null;

  return {
    version: STI_VERSION,
    score,
    label: stiLabel(score),
    blocks,
    blocksEvaluated: evaluated.length,
    blocksTotal: blocks.length,
    publishable,
    unverifiedSignals: blocks.flatMap((b) => b.unverifiedSignals),
    oldestDataDate: iso(oldestMs),
    freshestDataDate: iso(freshestMs),
  };
}

/** Le bloc auquel appartient un signal — utile pour l'affichage groupé. */
export function blockOf(signal: StiSignalId): StiBlockId {
  for (const id of ["A", "B", "C", "E"] as StiBlockId[]) {
    if (BLOCK_SIGNALS[id].includes(signal)) return id;
  }
  return "D";
}
