/**
 * Base commune aux connecteurs d'émetteurs dont la fiche produit porte le bloc
 * MSCI « Sustainability Characteristics » (Amundi, Vanguard…). Transforme un
 * `ParsedSustainability` en `Observation[]` porteuses de leur provenance complète
 * (source, url, date de référence, confiance, validation).
 *
 * Aucune donnée inventée : un champ `null` du parseur ne produit aucune
 * observation. La date « as of » MSCI valide (ou signale) tout le lot ; les
 * bornes de plausibilité (§11) sont appliquées champ par champ.
 */

import type { ParsedSustainability } from "@/lib/esg/msci-sustainability-parser";
import { validateReferenceDate, validateTer, worstOf, type ValidationResult } from "../validation";
import type { Confidence, Observation, RawData } from "./types";

function obs<T>(
  field: string,
  value: T,
  raw: RawData,
  referenceDate: string | null,
  confidence: Confidence,
  method: string,
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
    method,
    validation,
  };
}

/**
 * Construit les observations d'un émetteur à partir du bloc MSCI parsé.
 * @param method      Méthode d'obtention (ex. "pdf_parse:amundi_factsheet").
 * @param confidence  Confiance de la source (document officiel émetteur = high).
 */
export function issuerSustainabilityObservations(
  parsed: ParsedSustainability,
  raw: RawData,
  method: string,
  confidence: Confidence = "high",
): Observation[] {
  const asOf = parsed.asOf;
  const dateCheck = validateReferenceDate(asOf);
  const out: Observation[] = [];

  if (parsed.esgScore != null) {
    const bounds: ValidationResult =
      parsed.esgScore >= 0 && parsed.esgScore <= 100
        ? { status: "valid", reason: null }
        : { status: "rejected", reason: `esg_score hors bornes (${parsed.esgScore})` };
    out.push(
      obs(
        "esg_score",
        parsed.esgScore,
        raw,
        asOf,
        confidence,
        method,
        worstOf([dateCheck, bounds]),
      ),
    );
  }
  if (parsed.qualityScore != null)
    out.push(
      obs("msci_esg_quality_score", parsed.qualityScore, raw, asOf, confidence, method, dateCheck),
    );
  if (parsed.msciRating != null)
    out.push(obs("msci_esg_rating", parsed.msciRating, raw, asOf, confidence, method, dateCheck));
  if (parsed.waci != null)
    out.push(
      obs("waci_tco2e_per_musd_sales", parsed.waci, raw, asOf, confidence, method, dateCheck),
    );
  if (parsed.impliedTempRise != null)
    out.push(
      obs("implied_temp_rise", parsed.impliedTempRise, raw, asOf, confidence, method, dateCheck),
    );
  if (parsed.sfdrArticle != null)
    // L'article SFDR n'est pas daté par le « as of » MSCI (donnée réglementaire
    // du prospectus) : on ne lui applique donc pas la contrainte de fraîcheur.
    out.push(
      obs("sfdr_article", parsed.sfdrArticle, raw, asOf, confidence, method, {
        status: "valid",
        reason: null,
      }),
    );
  if (parsed.ter != null)
    out.push(obs("ter", parsed.ter, raw, asOf, confidence, method, validateTer(parsed.ter)));

  return out;
}

/** Fabrique une `RawData` de fiche émetteur à partir d'un texte déjà extrait. */
export function issuerRawFromText(
  sourceKey: string,
  text: string,
  sourceUrl: string,
  retrievedAt: string,
): RawData {
  return { sourceKey, sourceUrl, content: text, contentType: "pdf_text", retrievedAt };
}
