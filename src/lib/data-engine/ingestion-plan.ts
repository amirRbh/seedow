/**
 * Planification d'ingestion (Blueprint moat — Phases B2 & B3).
 *
 * Décide QUELS fonds ré-ingérer en priorité, pour faire grandir le Socle là où
 * ça compte le plus — sans jamais fabriquer de donnée (on planifie le travail,
 * on ne l'invente pas). Combine trois forces :
 *   - la DEMANDE réelle (§6 couverture pilotée par l'usage : `fund_requests`),
 *   - la FRAÎCHEUR (§12 : une donnée périmée perd sa valeur),
 *   - le MANQUE de complétude (combler les trous en premier).
 *
 * Fonctions pures, sans I/O : l'appelant (cron `refresh-market-data`, hook
 * d'ingestion) fournit les candidats lus en base et exécute la file résultante.
 */

export type IngestionReason =
  | "never_ingested"
  | "no_source"
  | "stale"
  | "incomplete"
  | "high_demand";

export interface IngestionCandidate {
  assetId: string;
  isin: string | null;
  /** Nombre de demandes/mises en watchlist agrégées (signal de demande). */
  demandCount: number;
  /** Score de complétude 0..100 (cf. completeness.ts), null si jamais calculé. */
  completeness: number | null;
  /** Dernière mise à jour de données (ISO), null si jamais ingéré. */
  lastUpdated: string | null;
  /** Une source canonique est-elle attachée ? */
  hasSource: boolean;
}

export interface IngestionPlanItem {
  assetId: string;
  isin: string | null;
  /** Score de priorité (plus haut = ingérer plus tôt). */
  priority: number;
  reasons: IngestionReason[];
  /** Ancienneté en jours, ou null si jamais ingéré. */
  staleDays: number | null;
}

export interface IngestionPlanOptions {
  now?: Date;
  /** Au-delà, une donnée est considérée périmée (défaut 30 j, cf. quality.ts). */
  staleDays?: number;
  /** Tronque la file à N éléments (0 = pas de limite). */
  limit?: number;
}

// ── Poids des forces (documentés, pas de nombre magique). ──
const W_DEMAND = 8; // par demande (plafonné)
const DEMAND_CAP = 10; // au-delà, la demande n'ajoute plus (évite la saturation)
const W_STALE = 1; // par jour au-delà du seuil de fraîcheur
const STALE_CAP = 180; // plafonne l'ancienneté prise en compte
const W_INCOMPLETE = 1.5; // par point de complétude manquant
const BOOST_NEVER = 400; // jamais ingéré : priorité forte (le Socle est vide pour lui)
const BOOST_NO_SOURCE = 250; // pas de source canonique : à sourcer d'urgence

/** Récapitulatif d'une file d'ingestion : total + décompte par raison. Pur,
 *  destiné au journal cron (`cron_run_log.details`) pour un suivi daté. */
export function summarizePlan(items: readonly IngestionPlanItem[]): {
  total: number;
  byReason: Record<IngestionReason, number>;
} {
  const byReason: Record<IngestionReason, number> = {
    never_ingested: 0,
    no_source: 0,
    stale: 0,
    incomplete: 0,
    high_demand: 0,
  };
  for (const it of items) for (const r of it.reasons) byReason[r] += 1;
  return { total: items.length, byReason };
}

/** Ancienneté en jours d'une date ISO, ou null si absente/illisible. */
export function computeStaleDays(lastUpdated: string | null, now: Date): number | null {
  if (!lastUpdated) return null;
  const t = new Date(lastUpdated).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, (now.getTime() - t) / 86_400_000);
}

/** Score de priorité d'un candidat + ses raisons. Pur et déterministe. */
export function scoreCandidate(
  c: IngestionCandidate,
  opts: { now: Date; staleDays: number },
): IngestionPlanItem {
  const reasons: IngestionReason[] = [];
  let priority = 0;

  const staleDays = computeStaleDays(c.lastUpdated, opts.now);

  if (staleDays == null) {
    priority += BOOST_NEVER;
    reasons.push("never_ingested");
  } else if (staleDays > opts.staleDays) {
    priority += Math.min(staleDays - opts.staleDays, STALE_CAP) * W_STALE;
    reasons.push("stale");
  }

  if (!c.hasSource) {
    priority += BOOST_NO_SOURCE;
    reasons.push("no_source");
  }

  const completeness = c.completeness == null ? 0 : Math.min(100, Math.max(0, c.completeness));
  const gap = 100 - completeness;
  if (gap > 0) {
    priority += gap * W_INCOMPLETE;
    if (gap >= 20) reasons.push("incomplete");
  }

  const demand = Math.max(0, Math.min(c.demandCount, DEMAND_CAP));
  if (demand > 0) {
    priority += demand * W_DEMAND;
    reasons.push("high_demand");
  }

  return { assetId: c.assetId, isin: c.isin, priority, reasons, staleDays };
}

/**
 * Construit la file d'ingestion, triée par priorité décroissante (départages
 * stables par assetId pour un ordre déterministe). Ne mute pas l'entrée.
 */
export function planIngestion(
  candidates: readonly IngestionCandidate[],
  opts: IngestionPlanOptions = {},
): IngestionPlanItem[] {
  const now = opts.now ?? new Date();
  const staleDays = opts.staleDays ?? 30;
  const limit = opts.limit ?? 0;

  const items = candidates
    .map((c) => scoreCandidate(c, { now, staleDays }))
    .sort((a, b) => b.priority - a.priority || a.assetId.localeCompare(b.assetId));

  return limit > 0 ? items.slice(0, limit) : items;
}

/** Sous-ensemble d'un `IngestionPlanItem` tel que journalisé dans
 *  `cron_run_log.details.top` (voir hook `recompute-ingestion-plan`). */
export interface PlanBacklogEntry {
  isin: string | null;
  priority: number;
}

/**
 * Referme la boucle planification → exécution : extrait, dans l'ordre de
 * priorité déjà trié, les ISIN valides et uniques du backlog journalisé par le
 * cron `recompute-ingestion-plan`, jusqu'à `limit`. Pur — l'appelant (script
 * d'ingestion) reste seul responsable de lire `cron_run_log` et d'exécuter
 * l'ingestion réelle pour ces ISIN.
 */
export function backlogIsins(top: readonly PlanBacklogEntry[], limit: number): string[] {
  const out: string[] = [];
  for (const entry of top) {
    if (out.length >= limit) break;
    if (entry.isin && !out.includes(entry.isin)) out.push(entry.isin);
  }
  return out;
}
