/**
 * Couche « qualité des données » — le statut d'une donnée, dit une seule fois.
 *
 * Toute valeur affichée par Seedow porte l'un de ces cinq statuts. Ils ne se
 * remplacent pas l'un l'autre et l'interface ne doit JAMAIS présenter une
 * donnée estimée ou simulée comme vérifiée (CLAUDE.md §1.2–1.3).
 *
 *   VERIFIED    — publiée par une source primaire identifiée (émetteur, régulateur,
 *                 fournisseur de cours), datée, reprise sans transformation de fond.
 *   ESTIMATED   — calculée ou modélisée par Seedow à partir de données réelles
 *                 (ex. : intensité carbone estimée par secteur).
 *   SIMULATED   — construite pour illustrer un mécanisme (portefeuille de
 *                 démonstration, montants fictifs). Jamais une mesure.
 *   UNAVAILABLE — la donnée n'existe pas dans nos sources, ou n'a pas été
 *                 collectée. Jamais remplacée par zéro.
 *   STALE       — était vérifiée, mais sa date de référence dépasse la fenêtre de
 *                 fraîcheur de son jeu de données.
 *
 * Module PUR, sans dépendance UI.
 */

export type DataStatus = "VERIFIED" | "ESTIMATED" | "SIMULATED" | "UNAVAILABLE" | "STALE";

export const DATA_STATUSES: readonly DataStatus[] = [
  "VERIFIED",
  "ESTIMATED",
  "SIMULATED",
  "UNAVAILABLE",
  "STALE",
];

/**
 * Fenêtre de fraîcheur par nature de jeu de données, en jours. Au-delà, une
 * donnée vérifiée passe STALE : elle reste affichée, avec son âge.
 *
 * Les valeurs suivent le rythme de publication réel de chaque source :
 *   - cours de marché : quotidien → 5 jours (week-end + jour férié) ;
 *   - composition de fonds : publication quotidienne ou mensuelle → 45 jours ;
 *   - documents réglementaires (DIC, classification SFDR) : mise à jour au moins
 *     annuelle → 400 jours ;
 *   - données ESG émetteur : publication annuelle → 18 mois.
 */
export const FRESHNESS_DAYS = {
  market_price: 5,
  fund_holdings: 45,
  fund_exposure: 45,
  performance_history: 10,
  /** Séries publiées en fin de mois (ETF américains) : un mois de décalage est normal. */
  performance_history_monthly: 45,
  regulatory_document: 400,
  esg_issuer: 548,
  /** Indicateurs MSCI de fonds repris par l'émetteur : recalculés chaque mois par MSCI. */
  esg_fund_metrics: 120,
} as const;

export type DatasetKind = keyof typeof FRESHNESS_DAYS;

const DAY_MS = 86_400_000;

/** Âge en jours entiers d'une date ISO à `now`. `null` si la date est illisible. */
export function ageInDays(
  isoDate: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!isoDate) return null;
  const t = Date.parse(isoDate.length === 10 ? `${isoDate}T00:00:00Z` : isoDate);
  if (!Number.isFinite(t)) return null;
  return Math.floor((now.getTime() - t) / DAY_MS);
}

/**
 * Statut d'une donnée issue d'une source primaire : VERIFIED tant qu'elle est
 * dans sa fenêtre de fraîcheur, STALE ensuite, UNAVAILABLE sans valeur ou sans
 * date — une donnée non datée ne peut pas être dite vérifiée.
 */
export function primarySourceStatus(
  hasValue: boolean,
  asOf: string | null | undefined,
  kind: DatasetKind,
  now: Date = new Date(),
): DataStatus {
  if (!hasValue) return "UNAVAILABLE";
  const age = ageInDays(asOf, now);
  if (age === null) return "UNAVAILABLE";
  return age > FRESHNESS_DAYS[kind] ? "STALE" : "VERIFIED";
}

/**
 * Combine les statuts de plusieurs entrées en un statut de RÉSULTAT : un calcul
 * vaut ce que vaut son entrée la plus faible. Ordre de faiblesse :
 * UNAVAILABLE > SIMULATED > ESTIMATED > STALE > VERIFIED.
 *
 * Exemple : une exposition calculée sur un montant de démonstration (SIMULATED)
 * et une composition vérifiée reste SIMULATED — c'est le montant qui est fictif.
 */
export function weakestStatus(statuses: DataStatus[]): DataStatus {
  const rank: Record<DataStatus, number> = {
    VERIFIED: 0,
    STALE: 1,
    ESTIMATED: 2,
    SIMULATED: 3,
    UNAVAILABLE: 4,
  };
  if (statuses.length === 0) return "UNAVAILABLE";
  return statuses.reduce((w, s) => (rank[s] > rank[w] ? s : w), "VERIFIED" as DataStatus);
}

/**
 * Pont vers les états de preuve historiques de l'interface (`Provenance`) :
 * verified / modelled / disputed / unknown. SIMULATED et STALE n'y avaient pas
 * d'équivalent — ils ont désormais leur propre pastille (voir `DataStatusChip`).
 */
export function toProvenanceStatus(status: DataStatus): "verified" | "modelled" | "unknown" {
  if (status === "VERIFIED") return "verified";
  if (status === "ESTIMATED") return "modelled";
  return "unknown";
}
