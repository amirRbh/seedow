/**
 * Persistance des observations dans la base canonique (§3/§24).
 *
 *   Observation[] → data_observations (ledger de provenance)
 *                 → assets (colonnes canoniques, pour les valeurs publiables)
 *
 * La logique de mapping est PURE et testée. L'I/O Supabase est isolée derrière
 * l'interface `ObservationWriter` (adaptateur fourni côté serveur), pour que le
 * chemin d'écriture soit testable sans réseau. On n'écrase jamais une colonne
 * canonique avec une valeur rejetée à la validation (§11), et chaque écriture
 * canonique embarque sa provenance (source + date), comme `ingest.functions`.
 */

import type { Observation } from "./connectors/types";
import { publishableObservations } from "./engine";

/** Ligne prête à insérer dans `data_observations`. */
export interface ObservationRow {
  asset_id: string;
  field: string;
  value_text: string | null;
  value_num: number | null;
  source_id: string | null;
  source_url: string | null;
  reference_date: string | null;
  retrieved_at: string;
  confidence: string;
  method: string | null;
  validation_status: string;
}

/** Mappe une observation en ligne de ledger (num vs text selon le type). */
export function observationToRow(
  assetId: string,
  o: Observation,
  sourceId: string | null,
): ObservationRow {
  const isNum = typeof o.value === "number" && Number.isFinite(o.value);
  return {
    asset_id: assetId,
    field: o.field,
    value_text: isNum ? null : o.value == null ? null : String(o.value),
    value_num: isNum ? (o.value as number) : null,
    source_id: sourceId,
    source_url: o.sourceUrl,
    reference_date: o.referenceDate,
    retrieved_at: o.retrievedAt,
    confidence: o.confidence,
    method: o.method,
    validation_status: o.validation.status,
  };
}

/**
 * Construit les lignes de ledger pour les observations PUBLIABLES (non
 * rejetées). Les review_required sont conservées au ledger (traçabilité) mais
 * n'iront jamais dans les colonnes canoniques (cf. canonicalAssetUpdate).
 */
export function buildObservationRows(
  assetId: string,
  observations: Observation[],
  sourceIdByKey: Record<string, string>,
): ObservationRow[] {
  return publishableObservations(observations).map((o) =>
    observationToRow(assetId, o, sourceIdByKey[o.sourceKey] ?? null),
  );
}

/** Champs d'observation → colonnes canoniques de `assets`. */
const CANONICAL_FIELD_TO_COLUMN: Record<string, string> = {
  esg_score: "esg_score",
  msci_esg_quality_score: "msci_esg_quality_score",
  waci_tco2e_per_musd_sales: "waci_tco2e_per_musd_sales",
  implied_temp_rise: "implied_temp_rise",
  sfdr_article: "sfdr_article",
  ter: "ter",
};

/**
 * Construit l'update partiel de `assets` à partir des observations VALIDES
 * (statut « valid » uniquement — jamais review_required ni rejected). Embarque
 * la provenance (source + date « as of ») pour respecter le contrat de
 * transparence. Renvoie `null` si rien de canonique n'est à écrire.
 */
export function canonicalAssetUpdate(observations: Observation[]): Record<string, unknown> | null {
  const valid = observations.filter((o) => o.validation.status === "valid");
  const update: Record<string, unknown> = {};
  let source: string | null = null;
  let asOf: string | null = null;
  let touchedCarbon = false;

  for (const o of valid) {
    const col = CANONICAL_FIELD_TO_COLUMN[o.field];
    if (!col) continue;
    update[col] = o.value;
    source = source ?? o.sourceKey;
    asOf = asOf ?? o.referenceDate;
    if (col === "waci_tco2e_per_musd_sales") touchedCarbon = true;
  }

  if (Object.keys(update).length === 0) return null;
  if (source != null) update.esg_score_source = source;
  if (asOf != null) update.esg_data_asof = asOf;
  if (touchedCarbon) {
    update.carbon_intensity_source = source;
    update.carbon_intensity_updated_at = asOf ? `${asOf}T00:00:00Z` : null;
  }
  return update;
}

/** I/O isolée : implémentée par un adaptateur Supabase côté serveur. */
export interface ObservationWriter {
  resolveSourceIds(keys: string[]): Promise<Record<string, string>>;
  insertObservations(rows: ObservationRow[]): Promise<number>;
  updateAssetCanonical(assetId: string, update: Record<string, unknown>): Promise<void>;
}

export interface PersistResult {
  observationsInserted: number;
  canonicalFieldsUpdated: string[];
}

/**
 * Oriente les observations vers le ledger + les colonnes canoniques. Ne lève
 * pas sur un lot vide (no-op). L'appelant (cron/hook) fournit le writer.
 */
export async function persistObservations(
  writer: ObservationWriter,
  assetId: string,
  observations: Observation[],
): Promise<PersistResult> {
  const publishable = publishableObservations(observations);
  if (publishable.length === 0) return { observationsInserted: 0, canonicalFieldsUpdated: [] };

  const keys = [...new Set(publishable.map((o) => o.sourceKey))];
  const sourceIdByKey = await writer.resolveSourceIds(keys);
  const rows = buildObservationRows(assetId, observations, sourceIdByKey);
  const inserted = await writer.insertObservations(rows);

  const update = canonicalAssetUpdate(observations);
  let canonicalFieldsUpdated: string[] = [];
  if (update) {
    await writer.updateAssetCanonical(assetId, update);
    canonicalFieldsUpdated = Object.keys(update);
  }
  return { observationsInserted: inserted, canonicalFieldsUpdated };
}
