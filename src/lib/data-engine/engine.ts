/**
 * Ingestion runner (§5 orchestration, §20 monitoring).
 *
 * Exécute un connecteur pour un identifiant (ISIN/ticker) et produit un
 * `IngestionRunResult` : observations émises + erreurs + horodatage, prêt à
 * journaliser dans `ingestion_jobs` / `ingestion_errors`. Ne casse jamais :
 * une source indisponible → résultat vide + erreur, pas d'exception propagée
 * (§17 fallback — ne jamais casser l'app parce qu'une source externe tombe).
 */

import type { Connector, IngestionRunResult, Observation } from "./connectors/types";

/** Ne retient que les observations publiables (statut de validation ≠ rejeté). */
export function publishableObservations(observations: Observation[]): Observation[] {
  return observations.filter((o) => o.validation.status !== "rejected");
}

/** Observations nécessitant une revue humaine avant publication (§11). */
export function needsReview(observations: Observation[]): Observation[] {
  return observations.filter((o) => o.validation.status === "review_required");
}

export async function runConnector(
  connector: Connector,
  identifier: string,
  now: () => string = () => new Date().toISOString(),
): Promise<IngestionRunResult> {
  const startedAt = now();
  const sourceKey = connector.definition.key;
  const errors: string[] = [];
  let observations: Observation[] = [];

  try {
    const raw = await connector.fetch(identifier);
    if (!raw) {
      errors.push(`fetch: aucune donnée pour ${identifier} (source ${sourceKey})`);
    } else {
      try {
        observations = connector.extract(raw);
        if (observations.length === 0) errors.push(`extract: aucune observation extraite`);
      } catch (e) {
        errors.push(`extract: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch (e) {
    // Une source externe qui tombe ne casse pas le runner (§17).
    errors.push(`fetch: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { sourceKey, identifier, observations, errors, startedAt, finishedAt: now() };
}
