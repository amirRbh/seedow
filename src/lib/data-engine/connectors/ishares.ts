/**
 * iSharesConnector — connecteur ESG/carbone iShares/BlackRock (§5).
 *
 * Réutilise le parseur factsheet existant (`lib/esg/factsheet-parser`) et
 * transforme ses champs en `Observation[]` porteuses de leur provenance
 * complète (source, url, date de référence, confiance, validation). Aucune
 * donnée inventée : un champ absent du document ne produit AUCUNE observation.
 *
 * L'étape `fetch` (téléchargement réseau du document) est INJECTÉE : le cœur
 * testable est `extract(raw)`. En production, un downloader télécharge le PDF
 * officiel, le convertit en texte (`pdftotext -layout`) et fournit la `RawData`.
 */

import { parseISharesFactSheet } from "@/lib/esg/factsheet-parser";
import { SOURCE_BY_KEY, type SourceDefinition } from "../sources/registry";
import { validateReferenceDate, worstOf, type ValidationResult } from "../validation";
import type { Confidence, Connector, Observation, RawData } from "./types";

const SOURCE_KEY = "ishares_factsheet";

/** Downloader injectable : ISIN/ticker → texte de factsheet, ou null si indispo. */
export type FactsheetDownloader = (identifier: string) => Promise<RawData | null>;

function obs<T>(
  field: string,
  value: T,
  raw: RawData,
  referenceDate: string | null,
  confidence: Confidence,
  validation: ValidationResult,
): Observation<T> {
  return {
    field,
    value,
    sourceKey: raw.sourceKey,
    sourceUrl: raw.sourceUrl,
    referenceDate,
    retrievedAt: raw.retrievedAt,
    confidence,
    method: "pdf_parse:ishares_factsheet",
    validation,
  };
}

export class ISharesConnector implements Connector {
  readonly definition: SourceDefinition;

  constructor(private readonly downloader?: FactsheetDownloader) {
    const def = SOURCE_BY_KEY.get(SOURCE_KEY);
    if (!def) throw new Error(`Source ${SOURCE_KEY} absente du registry`);
    this.definition = def;
  }

  async fetch(identifier: string): Promise<RawData | null> {
    // Réseau non câblé par défaut : injecter un downloader (télécharge le PDF
    // officiel + pdftotext) pour activer l'ingestion réelle.
    return this.downloader ? this.downloader(identifier) : null;
  }

  extract(raw: RawData): Observation[] {
    if (raw.contentType !== "pdf_text") return [];
    const parsed = parseISharesFactSheet(raw.content);
    const asOf = parsed.asOf;
    // La date « as of » MSCI valide (ou signale) toutes les observations du lot.
    const dateCheck = validateReferenceDate(asOf);

    const out: Observation[] = [];
    // Confiance élevée : document officiel de l'émetteur (priorité 1).
    const conf: Confidence = "high";

    if (parsed.esgScore != null) {
      const v = worstOf([
        dateCheck,
        parsed.esgScore >= 0 && parsed.esgScore <= 100
          ? { status: "valid", reason: null }
          : { status: "rejected", reason: `esg_score hors bornes (${parsed.esgScore})` },
      ]);
      out.push(obs("esg_score", parsed.esgScore, raw, asOf, conf, v));
    }
    if (parsed.qualityScore != null)
      out.push(obs("msci_esg_quality_score", parsed.qualityScore, raw, asOf, conf, dateCheck));
    if (parsed.msciRating != null)
      out.push(obs("msci_esg_rating", parsed.msciRating, raw, asOf, conf, dateCheck));
    if (parsed.waci != null) {
      // Le parseur borne déjà le WACI (clampWaci) ; ici on ne fait que dater.
      out.push(obs("waci_tco2e_per_musd_sales", parsed.waci, raw, asOf, conf, dateCheck));
    }
    if (parsed.impliedTempRise != null)
      out.push(obs("implied_temp_rise", parsed.impliedTempRise, raw, asOf, conf, dateCheck));

    return out;
  }
}

/** Fabrique une `RawData` iShares à partir d'un texte de factsheet déjà extrait. */
export function iSharesRawFromText(text: string, sourceUrl: string, retrievedAt: string): RawData {
  return {
    sourceKey: SOURCE_KEY,
    sourceUrl,
    content: text,
    contentType: "pdf_text",
    retrievedAt,
  };
}
