/**
 * Le grain élémentaire du scoring v2 : un SIGNAL.
 *
 * La v1 partait d'un score et cherchait ensuite comment le justifier. La v2 part
 * du fait documentaire et n'en tire un chiffre qu'ensuite. Un signal, c'est
 * exactement ce qu'un tiers pourrait revérifier avec les mêmes documents publics :
 * un document existe (ou n'existe pas) à une URL, à une date.
 *
 * Test de validation appliqué à tout signal candidat (spec §3.1) :
 *   « un tiers avec accès aux mêmes documents publics obtiendrait-il exactement
 *     le même résultat ? »
 * Si la réponse est non, le signal n'a pas sa place ici — il relève de
 * l'appréciation, et l'appréciation ne rapporte aucun point.
 *
 * ── Les trois statuts, et pourquoi le troisième n'est pas un zéro ──────────
 *
 *   publié       — la recherche a été menée, le document existe.
 *   absent       — la recherche a été menée, le fonds ne publie pas. C'est un
 *                  fait sur le FONDS : il coûte des points, à juste titre.
 *   non_vérifié  — la recherche n'a pas abouti (source injoignable, format non
 *                  exploitable). C'est un fait sur SEEDOW : il ne doit rien
 *                  coûter au fonds. D'où la règle d'abstention (§3.3) : un bloc
 *                  qui contient un `non_vérifié` n'est pas noté zéro, il n'est
 *                  pas noté du tout.
 *
 * Confondre les deux derniers, c'est faire payer au fonds les trous de collecte
 * de Seedow — exactement le reproche que la v1 s'attirait.
 */

/** Statut de collecte d'un signal. Voir l'en-tête : `absent` ≠ `non_verifie`. */
export type SignalStatus = "publie" | "absent" | "non_verifie";

/** Méthode d'obtention — tracée parce qu'elle conditionne la revue humaine. */
export type SignalMethod = "extraction_llm" | "saisie_manuelle" | "resolution_url";

/**
 * Un signal collecté, tel que la base le stocke et tel que la fiche l'affiche
 * (spec §9 — « chaque chiffre affiché doit pouvoir remonter à un objet de cette
 * forme. Si ce n'est pas le cas, il n'est pas affiché »).
 */
export interface TransparencySignal<Id extends string = string> {
  signal: Id;
  statut: SignalStatus;
  /**
   * Valeur portée par le signal quand il en porte une (bloc B : niveau de
   * précision de l'exclusion). `null` partout ailleurs, et pour tout signal qui
   * n'est pas `publie`.
   */
  valeur: string | null;
  source_url: string | null;
  source_document: string | null;
  /** Date de la DONNÉE (celle du document), pas de sa récupération. ISO `YYYY-MM-DD`. */
  date_donnee: string | null;
  /** Date de collecte par Seedow. ISO `YYYY-MM-DD`. */
  date_collecte: string | null;
  methode: SignalMethod | null;
}

/** Un signal résolu = la recherche a abouti, dans un sens ou dans l'autre. */
export function isResolved(s: Pick<TransparencySignal, "statut">): boolean {
  return s.statut !== "non_verifie";
}

/** Un signal publié ET daté — la seule forme qui alimente la fraîcheur (bloc D). */
export function publishedDate(s: TransparencySignal): string | null {
  return s.statut === "publie" ? (s.date_donnee ?? null) : null;
}

/**
 * Construit un signal `non_vérifié` — l'état par défaut de tout signal qu'aucune
 * collecte n'a encore touché. Rien n'est jamais supposé publié.
 */
export function unverified<Id extends string>(signal: Id): TransparencySignal<Id> {
  return {
    signal,
    statut: "non_verifie",
    valeur: null,
    source_url: null,
    source_document: null,
    date_donnee: null,
    date_collecte: null,
    methode: null,
  };
}

/** Parse une date ISO en ms UTC, ou `null` si elle n'est pas exploitable. */
export function parseIsoDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}
