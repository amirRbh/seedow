/**
 * Mécanique « Demander l'analyse » (§27) — logique pure.
 *
 * Quand un utilisateur cherche un fonds que Seedow ne connaît pas encore, on
 * n'affiche pas « aucun résultat » : on enregistre la demande pour piloter la
 * couverture par l'usage réel (§6 couverture pilotée par l'utilisation, §27).
 * Ce module normalise la saisie ; l'écriture en base est dans
 * `fund-request.functions.ts`.
 */

import { parseQuery } from "./search";
import { toCanonicalIsin } from "./isin";

export type FundRequestStatus = "requested" | "queued" | "added" | "rejected";

export interface NormalizedFundRequest {
  /** Requête nettoyée (trim, espaces compactés), telle que saisie. */
  query: string;
  /** ISIN canonique si la requête EST un ISIN valide, sinon null. */
  isin: string | null;
}

/** Longueur max d'une requête stockée (garde-fou anti-abus). */
export const MAX_QUERY_LEN = 120;

/**
 * Normalise une requête de demande de fonds. Renvoie null si la requête est
 * vide ou trop courte (< 2 caractères utiles) — on ne stocke pas de bruit.
 */
export function normalizeFundRequest(rawQuery: string): NormalizedFundRequest | null {
  const query = rawQuery.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LEN);
  if (query.length < 2) return null;
  const parsed = parseQuery(query);
  const isin = parsed.kind === "isin" ? toCanonicalIsin(parsed.isin) : null;
  return { query, isin };
}
