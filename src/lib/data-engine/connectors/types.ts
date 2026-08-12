/**
 * Contrat du Data Ingestion Engine (§5).
 *
 *   Source → Connector → RawData → Parser → Normalizer → Validator →
 *   Confidence → Canonical DB
 *
 * Chaque source est un connecteur INDÉPENDANT (AmundiConnector, iSharesConnector,
 * AMFConnector…). Pas de scraper monolithique. Ce fichier ne définit que les
 * types du pipeline : les connecteurs concrets les implémentent un par un.
 */

import type { SourceDefinition } from "../sources/registry";
import type { ValidationResult } from "../validation";

export type Confidence = "high" | "medium" | "low";

/** Donnée brute récupérée par un connecteur, avant parsing. */
export interface RawData {
  sourceKey: string;
  /** URL exacte du document/endpoint (provenance §3). */
  sourceUrl: string;
  /** Contenu brut (texte de PDF, JSON d'API, CSV…). */
  content: string;
  contentType: "pdf_text" | "json" | "csv" | "html" | "xml";
  retrievedAt: string; // ISO
}

/** Une donnée normalisée + sa provenance complète (§3 source of truth). */
export interface Observation<T = unknown> {
  /** Champ canonique renseigné (ex. "ter", "holding.weight", "sfdr_article"). */
  field: string;
  value: T;
  sourceKey: string;
  sourceUrl: string;
  /** Date à laquelle la donnée fait référence (§12). */
  referenceDate: string | null;
  retrievedAt: string;
  confidence: Confidence;
  /** Méthode d'obtention (ex. "pdf_parse:factsheet", "api:quote"). */
  method: string;
  validation: ValidationResult;
}

/**
 * Un connecteur = une source. Chaque étape est optionnelle à surcharger, mais
 * le contrat impose que TOUTE observation émise porte sa provenance.
 */
export interface Connector {
  readonly definition: SourceDefinition;
  /** Étape 1 — récupère la donnée brute pour un identifiant (ISIN/ticker). */
  fetch(identifier: string): Promise<RawData | null>;
  /** Étapes 2-5 — parse, normalise, valide, score → observations. */
  extract(raw: RawData): Observation[];
}

/** Résultat d'une passe d'ingestion, pour le monitoring (§20). */
export interface IngestionRunResult {
  sourceKey: string;
  identifier: string;
  observations: Observation[];
  errors: string[];
  startedAt: string;
  finishedAt: string;
}
