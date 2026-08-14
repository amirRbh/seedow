/**
 * VanguardConnector — connecteur ESG/carbone Vanguard UCITS (§5).
 *
 * Gamme UCITS (VWCE, VWRL…). Documents KID/factsheet publics par ISIN. Même
 * base d'émetteur que le connecteur Amundi : parseur MSCI générique + provenance
 * complète. `fetch` (téléchargement du document officiel) injecté, jamais de
 * scraping dynamique (§23) ; le cœur testable est `extract(raw)`.
 */

import { parseMsciSustainability } from "@/lib/esg/msci-sustainability-parser";
import { SOURCE_BY_KEY, type SourceDefinition } from "../sources/registry";
import type { Connector, Observation, RawData } from "./types";
import { issuerRawFromText, issuerSustainabilityObservations } from "./msci-issuer";

const SOURCE_KEY = "vanguard_factsheet";
const METHOD = "pdf_parse:vanguard_factsheet";

/** Downloader injectable : ISIN/ticker → texte de document officiel, ou null. */
export type VanguardDownloader = (identifier: string) => Promise<RawData | null>;

export class VanguardConnector implements Connector {
  readonly definition: SourceDefinition;

  constructor(private readonly downloader?: VanguardDownloader) {
    const def = SOURCE_BY_KEY.get(SOURCE_KEY);
    if (!def) throw new Error(`Source ${SOURCE_KEY} absente du registry`);
    this.definition = def;
  }

  async fetch(identifier: string): Promise<RawData | null> {
    return this.downloader ? this.downloader(identifier) : null;
  }

  extract(raw: RawData): Observation[] {
    if (raw.contentType !== "pdf_text") return [];
    return issuerSustainabilityObservations(parseMsciSustainability(raw.content), raw, METHOD);
  }
}

/** Fabrique une `RawData` Vanguard à partir d'un texte de document déjà extrait. */
export function vanguardRawFromText(text: string, sourceUrl: string, retrievedAt: string): RawData {
  return issuerRawFromText(SOURCE_KEY, text, sourceUrl, retrievedAt);
}
