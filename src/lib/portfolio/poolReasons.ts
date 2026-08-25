/**
 * « Pourquoi ce fonds m'est montré ? » — les raisons, à la place du score.
 *
 * Le classement de `screenPool` produit une pertinence 0..100. Affichée nue et
 * triée par ordre décroissant, elle se lit comme un palmarès : le premier est
 * « le meilleur ». C'est faux, et c'est exactement ce que Seedow refuse d'être —
 * il classe un pool, il ne recommande pas un investissement.
 *
 * Ce module ne calcule RIEN de neuf. Il reprend les piliers que `screenPool` a
 * déjà séparés — alignement avec les convictions, note de durabilité sourcée,
 * frais, historique de marché — et les rend lisibles :
 *
 *   · un GROUPE, qui décrit le rapport du fonds aux convictions déclarées
 *     (« porte tes convictions », « à examiner »), jamais un rang ;
 *   · des RAISONS, ce qui plaide pour le fonds ;
 *   · des RÉSERVES, ce qui joue contre, ou ce qu'on ne sait pas.
 *
 * Trois règles tiennent le fichier :
 *
 *  1. **Le groupe ne réencode pas le classement.** Il dépend de ce que le fonds
 *     porte des convictions de l'utilisateur, pas de sa place dans la liste. Deux
 *     fonds voisins au classement peuvent tomber dans des groupes différents, et
 *     c'est le but : la liste cesse d'être un podium.
 *  2. **Une donnée absente devient une réserve, jamais un silence.** Pas
 *     d'historique de marché → on le dit. Note non sourcée → on le dit. On ne
 *     comble jamais avec une valeur de repli (CLAUDE.md §1.3).
 *  3. **Aucune phrase ici.** Uniquement des codes i18n stables et leurs
 *     variables, comme `plain-language` et `analyzePortfolio`.
 */

import type { CauseTag } from "./types";

/**
 * Au-dessus de ce seuil d'exposition (0..1), on considère que le fonds porte
 * réellement la conviction. En deçà, l'exposition est trop marginale pour être
 * annoncée à l'utilisateur comme une raison.
 */
export const CAUSE_EXPOSURE_FLOOR = 0.25;

/** Frais annuels (fraction) en deçà desquels le coût est un argument. */
const LOW_TER = 0.003;
/** Frais annuels (fraction) au-delà desquels le coût est une réserve. */
const HIGH_TER = 0.006;
/** Note de durabilité (0..100) au-dessus de laquelle elle plaide pour le fonds. */
const STRONG_SUSTAINABILITY = 65;

/**
 * Groupes d'affichage. Ce sont des CATÉGORIES, pas des rangs : elles disent le
 * rapport du fonds aux convictions déclarées, pas sa qualité d'investissement.
 */
export type PoolGroup =
  /** Porte la majorité des convictions déclarées. */
  | "carries_convictions"
  /** En porte une partie. */
  | "partial_match"
  /** Ne les porte pas, mais tient sur d'autres critères (frais, durabilité). */
  | "other_strengths"
  /** Trop peu de données pour dire quoi que ce soit de solide. */
  | "to_examine";

/** Une raison ou une réserve : un code i18n + ses variables. */
export interface PoolNote {
  code: string;
  vars?: Record<string, string | number>;
}

export interface PoolReasons {
  group: PoolGroup;
  /** Ce qui plaide pour ce fonds. Au plus 3 — au-delà, plus personne ne lit. */
  reasons: PoolNote[];
  /** Ce qui joue contre, ou ce qu'on ignore. Jamais masqué. */
  caveats: PoolNote[];
  /** Convictions de l'utilisateur réellement portées par ce fonds. */
  matchedCauses: CauseTag[];
}

/**
 * Entrée volontairement large : tous les champs sont optionnels, pour la même
 * raison que `AssetLayerSource`. Le pool serveur les fournit tous ; un modèle de
 * vue client n'en a qu'une partie, et doit pouvoir être décrit sans qu'on
 * invente ce qui lui manque.
 *
 * `undefined` = non chargé, on se tait. `null` = consulté et absent, on le dit.
 */
export interface PoolReasonInput {
  /** Convictions déclarées par l'utilisateur. Vide = aucune. */
  causes: CauseTag[];
  /** Exposition du fonds par cause (0..1), telle que portée par l'actif. */
  causeExposure?: Record<string, number> | null;
  /**
   * Convictions portées, quand l'appelant les connaît déjà sous forme de liste
   * (modèle de vue Découvrir : `themes`). Utilisé seulement si
   * `causeExposure` n'est pas fourni.
   */
  themes?: readonly string[] | null;
  /** Note de durabilité composite 0..100 (pilier ESG du classement). */
  sustainability?: number | null;
  /** Source de la note ESG. `null` = non sourcée, donc estimée maison. */
  esgSource?: string | null;
  /** Frais annuels courants, en fraction (0.002 = 0,20 %/an). */
  ter?: number | null;
  /** Nombre d'observations de cours ayant servi au modèle de risque. */
  statsObservations?: number | null;
  /** Sharpe réel, `null` quand l'historique ne permet pas de le calculer. */
  sharpe?: number | null;
}

const MAX_REASONS = 3;

/** Convictions de l'utilisateur que ce fonds porte réellement. */
export function matchedCauses(input: PoolReasonInput): CauseTag[] {
  if (input.causes.length === 0) return [];
  if (input.causeExposure != null) {
    return input.causes.filter((c) => {
      const exposure = input.causeExposure?.[c];
      return typeof exposure === "number" && exposure >= CAUSE_EXPOSURE_FLOOR;
    });
  }
  if (input.themes != null) {
    const set = new Set(input.themes);
    return input.causes.filter((c) => set.has(c));
  }
  return [];
}

/**
 * Le groupe d'affichage. Il répond à « qu'est-ce que ce fonds a à voir avec ce
 * que j'ai déclaré ? », jamais à « est-il meilleur que le suivant ? ».
 *
 * Sans conviction déclarée, il n'y a rien à mettre en rapport : tous les fonds
 * documentés tombent dans `other_strengths`, et seuls ceux dont les données sont
 * trop minces passent en `to_examine`.
 */
function group(input: PoolReasonInput, matched: CauseTag[], documented: boolean): PoolGroup {
  if (!documented) return "to_examine";
  if (input.causes.length === 0) return "other_strengths";
  if (matched.length === 0) return "other_strengths";
  return matched.length * 2 >= input.causes.length ? "carries_convictions" : "partial_match";
}

/**
 * Un fonds est « documenté » dès qu'on sait dire quelque chose de vérifiable de
 * lui : une note sourcée, ou un historique de marché réel. Sans l'un ni l'autre,
 * tout ce qu'on afficherait serait une estimation maison présentée comme un fait.
 */
function isDocumented(input: PoolReasonInput): boolean {
  return isSourced(input) || hasHistory(input);
}

/**
 * Une note ESG n'est un argument que si elle vient d'un fournisseur. Estimée
 * maison (`seedow-internal*`), elle reste honnête mais ne prouve rien : on ne la
 * présente jamais comme une mesure externe.
 */
function isSourced(input: PoolReasonInput): boolean {
  return (
    typeof input.esgSource === "string" &&
    input.esgSource.trim() !== "" &&
    !input.esgSource.startsWith("seedow-internal")
  );
}

/**
 * Historique de marché réel. `undefined` des deux côtés = on n'a pas demandé, on
 * ne conclut pas ; un Sharpe nul ou zéro observation = l'historique manque.
 */
function hasHistory(input: PoolReasonInput): boolean {
  if (input.sharpe != null) return true;
  return (input.statsObservations ?? 0) > 0;
}

/**
 * Traduit un fonds du pool en raisons lisibles. Fonction pure : aucune requête,
 * aucun texte, aucun effet de bord.
 */
export function poolReasons(input: PoolReasonInput): PoolReasons {
  const matched = matchedCauses(input);
  const documented = isDocumented(input);

  const reasons: PoolNote[] = [];
  const caveats: PoolNote[] = [];

  // 1. Les convictions d'abord : c'est la question que l'utilisateur a posée.
  if (matched.length > 0) {
    reasons.push({
      code: "pool_reasons.reason.carries_causes",
      vars: { count: matched.length, total: input.causes.length },
    });
  } else if (input.causes.length > 0) {
    caveats.push({ code: "pool_reasons.caveat.no_cause_match" });
  }

  // 2. La durabilité — nommée pour ce qu'elle est, et seulement si elle est
  //    attribuable. Une note estimée maison n'est pas un argument, c'est une
  //    réserve : on ne la fait pas passer pour une mesure externe.
  const sourced = isSourced(input);
  if (sourced && input.sustainability != null && input.sustainability >= STRONG_SUSTAINABILITY) {
    reasons.push({
      code: "pool_reasons.reason.sustainability",
      vars: { score: Math.round(input.sustainability) },
    });
  } else if (input.esgSource !== undefined && !sourced) {
    // La source a été consultée et n'est pas externe : on le dit. Si le champ
    // n'a pas été chargé (`undefined`), on se tait plutôt que de conclure.
    caveats.push({ code: "pool_reasons.caveat.esg_estimated" });
  }

  // 3. Les frais — le seul chiffre qu'un débutant peut vérifier lui-même, et le
  //    seul dont l'effet est certain.
  if (input.ter != null && Number.isFinite(input.ter)) {
    if (input.ter <= LOW_TER) {
      reasons.push({
        code: "pool_reasons.reason.low_fees",
        vars: { euros: Math.round(input.ter * 1000) },
      });
    } else if (input.ter >= HIGH_TER) {
      caveats.push({
        code: "pool_reasons.caveat.high_fees",
        vars: { euros: Math.round(input.ter * 1000) },
      });
    }
  }

  // 4. L'historique de marché. Son absence n'est pas un défaut du fonds : c'est
  //    une limite de ce que Seedow peut en dire. On la formule comme telle.
  if ((input.statsObservations !== undefined || input.sharpe !== undefined) && !hasHistory(input)) {
    caveats.push({ code: "pool_reasons.caveat.no_history" });
  }

  return {
    group: group(input, matched, documented),
    reasons: reasons.slice(0, MAX_REASONS),
    caveats,
    matchedCauses: matched,
  };
}
