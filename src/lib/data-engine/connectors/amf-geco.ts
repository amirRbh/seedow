/**
 * AmfGecoConnector — connecteur d'identité de fonds via la base AMF GECO (§5).
 *
 * GECO est la base OFFICIELLE du régulateur français (priorité 1) : identité des
 * OPC de droit français, DICI/prospectus, classification SFDR et frais courants.
 * Elle fait foi sur l'identité et le réglementaire — jamais inventé, jamais
 * scrapé dynamiquement : le connecteur consomme un enregistrement structuré
 * (JSON) fourni par le téléchargeur injecté ; le cœur testable est `extract`.
 *
 * Émissions : `fund_name` et `isin` (identité, tracées au ledger), `sfdr_article`
 * et `ter` (réglementaire, canoniques). Un champ absent ne produit rien.
 */

import { SOURCE_BY_KEY, type SourceDefinition } from "../sources/registry";
import { isValidIsin } from "../isin";
import { validateReferenceDate, validateTer, worstOf, type ValidationResult } from "../validation";
import type { Confidence, Connector, Observation, RawData } from "./types";

const SOURCE_KEY = "amf_geco";
const METHOD = "api:amf_geco";
const CONF: Confidence = "high";

/** Downloader injectable : ISIN/ticker → enregistrement GECO (JSON), ou null. */
export type GecoDownloader = (identifier: string) => Promise<RawData | null>;

/** Enregistrement GECO tel qu'exposé (sous-ensemble utilisé). */
interface GecoRecord {
  denomination?: string | null;
  code_isin?: string | null;
  classification_sfdr?: number | string | null;
  frais_courants_pct?: number | string | null;
  date_reference?: string | null;
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function obs<T>(
  field: string,
  value: T,
  raw: RawData,
  referenceDate: string | null,
  validation: ValidationResult,
): Observation<T> {
  return {
    field,
    value,
    sourceKey: raw.sourceKey,
    sourceUrl: raw.sourceUrl,
    referenceDate,
    retrievedAt: raw.retrievedAt,
    confidence: CONF,
    method: METHOD,
    validation,
  };
}

export class AmfGecoConnector implements Connector {
  readonly definition: SourceDefinition;

  constructor(private readonly downloader?: GecoDownloader) {
    const def = SOURCE_BY_KEY.get(SOURCE_KEY);
    if (!def) throw new Error(`Source ${SOURCE_KEY} absente du registry`);
    this.definition = def;
  }

  async fetch(identifier: string): Promise<RawData | null> {
    return this.downloader ? this.downloader(identifier) : null;
  }

  extract(raw: RawData): Observation[] {
    if (raw.contentType !== "json") return [];
    let rec: GecoRecord;
    try {
      rec = JSON.parse(raw.content) as GecoRecord;
    } catch {
      return [];
    }

    const asOf = rec.date_reference ?? null;
    const dateCheck = validateReferenceDate(asOf);
    const out: Observation[] = [];

    if (rec.denomination) out.push(obs("fund_name", rec.denomination, raw, asOf, dateCheck));

    if (rec.code_isin) {
      const validIsin: ValidationResult = isValidIsin(rec.code_isin)
        ? { status: "valid", reason: null }
        : { status: "rejected", reason: `ISIN invalide (${rec.code_isin})` };
      out.push(obs("isin", rec.code_isin, raw, asOf, validIsin));
    }

    const sfdr = toNum(rec.classification_sfdr);
    if (sfdr === 6 || sfdr === 8 || sfdr === 9)
      // Donnée réglementaire (prospectus), non soumise à la fraîcheur MSCI.
      out.push(obs("sfdr_article", sfdr, raw, asOf, { status: "valid", reason: null }));

    const terPct = toNum(rec.frais_courants_pct);
    if (terPct != null) {
      const ter = terPct / 100;
      out.push(obs("ter", ter, raw, asOf, worstOf([dateCheck, validateTer(ter)])));
    }

    return out;
  }
}

/** Fabrique une `RawData` GECO à partir d'un enregistrement JSON déjà récupéré. */
export function gecoRawFromRecord(json: string, sourceUrl: string, retrievedAt: string): RawData {
  return { sourceKey: SOURCE_KEY, sourceUrl, content: json, contentType: "json", retrievedAt };
}
