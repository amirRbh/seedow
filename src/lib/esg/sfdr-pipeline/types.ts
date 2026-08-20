/**
 * Types du pipeline SFDR (§2 hiérarchie, §7 preuve, §10 gate, §12 échecs).
 *
 * Le pipeline transforme un ISIN en une **observation ESG traçable** — ou en un
 * échec catégorisé. Jamais en donnée inventée : une absence de preuve est un
 * `status = UNKNOWN`, pas un « article 6 » par défaut (§1).
 */

import type { SfdrArticle, SfdrConfidence } from "./sfdr-parser";

/** Niveau de source (§2). PRIMARY = officiel/régulateur ; SECONDARY = agrégateur. */
export type SourceTier = "PRIMARY" | "SECONDARY" | "UNKNOWN";

/** Statut de vérification (§2, §10). Seul VERIFIED+PRIMARY passe le gate. */
export type VerificationStatus = "VERIFIED" | "UNVERIFIED" | "UNKNOWN";

/**
 * Taxonomie d'échec (§12) — jamais un simple « failed ». Chaque ISIN non résolu
 * porte SA raison, pour piloter la suite (quelle source ajouter, quoi corriger).
 */
export type FailureReason =
  | "NO_GECO_MATCH" // GECO ne connaît pas cet ISIN (souvent : fonds non FR)
  | "NO_DOCUMENT" // fonds résolu mais aucun document exploitable listé
  | "DOCUMENT_BLOCKED" // document listé mais téléchargement refusé (403/anti-bot)
  | "PDF_PARSE_FAILED" // document téléchargé mais extraction texte impossible
  | "NO_SFDR_MENTION" // texte extrait mais aucune mention SFDR affirmée
  | "AMBIGUOUS_SFDR" // plusieurs articles affirmés → non tranchable
  | "ISSUER_NOT_RESOLVED" // pas de piste asset-manager (fallback niveau 2)
  | "RATE_LIMIT" // throttling de la source
  | "NETWORK_RESTRICTION" // mur d'egress (source injoignable depuis l'env)
  | "OTHER";

/** Document officiel candidat, tel que listé par un resolver. */
export interface CandidateDocument {
  /** Type de document (KID/DICI/prospectus/SFDR…), tel qu'annoncé par la source. */
  docType: string | null;
  /** Type canonique mappé sur l'enum `fund_document_type` de la base. */
  canonicalType: "kid" | "dici" | "prospectus" | "sfdr" | "factsheet" | "annual_report" | "other";
  /** URL de téléchargement officielle. */
  url: string;
  /** Date d'effet/publication (ISO) si connue. */
  documentDate: string | null;
  language: string | null;
}

/** Résultat d'un resolver de documents (§5) : ISIN → docs officiels + provenance. */
export interface ResolvedFund {
  /** Clé de la source (registry) ayant résolu le fonds. Ex. "amf_geco". */
  sourceKey: string;
  /** Nom lisible de la source (registry). Ex. "AMF — base GECO". */
  sourceName: string;
  sourceTier: SourceTier;
  /** URL de la page/enregistrement source (provenance §7). */
  sourceUrl: string;
  fundName: string | null;
  managementCompany: string | null;
  documents: CandidateDocument[];
}

/** Texte extrait d'un document + son empreinte (cache §14, repro §15). */
export interface ExtractedDocument {
  url: string;
  /** Texte brut extrait (PDF → texte). */
  text: string;
  /** Empreinte du binaire téléchargé (clé de cache / détection de changement). */
  documentHash: string;
  /** Nombre de pages, si l'extracteur le fournit. */
  pageCount: number | null;
  retrievedAt: string;
}

/**
 * Observation ESG complète et traçable (§7). Persistée dans `data_observations`
 * (+ colonnes evidence). Répond à « pourquoi cet ETF est-il Article 8 ? ».
 */
export interface EsgObservation {
  isin: string;
  metric: "sfdr_article";
  value: SfdrArticle;
  sourceTier: SourceTier;
  sourceKey: string;
  sourceName: string;
  /** URL de la source (enregistrement/page). */
  sourceUrl: string;
  /** URL du document officiel dont la preuve est extraite. */
  documentUrl: string;
  documentDate: string | null;
  documentHash: string;
  retrievedAt: string;
  /** Snippet exact prouvant la classification. */
  evidenceText: string;
  regulationReference: string;
  confidence: SfdrConfidence;
  verificationStatus: VerificationStatus;
  parserVersion: number;
}

/** Résultat du pipeline pour un ISIN : succès (observation) ou échec catégorisé. */
export interface PipelineResult {
  isin: string;
  ok: boolean;
  observation: EsgObservation | null;
  failureReason: FailureReason | null;
  /** Détail lisible de l'échec (jamais un simple « failed », §12). */
  detail: string | null;
  /** Étapes franchies (pour le rapport / debug). */
  trace: {
    resolvedBy: string | null;
    documentsFound: number;
    documentTried: string | null;
    textExtracted: boolean;
  };
}
