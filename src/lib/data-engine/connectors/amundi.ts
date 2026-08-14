/**
 * AmundiConnector — connecteur ESG/carbone Amundi ETF (§5).
 *
 * Amundi est le premier émetteur d'ETF européen : ses documents officiels
 * (DICI/KID, factsheets) sont publics par ISIN et portent le bloc MSCI
 * « Sustainability Characteristics » ainsi que l'article SFDR et les frais.
 * Le connecteur réutilise le parseur générique + la base commune d'émetteurs :
 * le cœur testable est `extract(raw)`. Le `fetch` (téléchargement du document
 * officiel) est injecté — jamais de scraping dynamique (§23).
 */

import { parseMsciSustainability } from "@/lib/esg/msci-sustainability-parser";
import { SOURCE_BY_KEY, type SourceDefinition } from "../sources/registry";
import type { Connector, Observation, RawData } from "./types";
import { issuerRawFromText, issuerSustainabilityObservations } from "./msci-issuer";

const SOURCE_KEY = "amundi_factsheet";
const METHOD = "pdf_parse:amundi_factsheet";

/** Downloader injectable : ISIN/ticker → texte de document officiel, ou null. */
export type AmundiDownloader = (identifier: string) => Promise<RawData | null>;

export class AmundiConnector implements Connector {
  readonly definition: SourceDefinition;

  constructor(private readonly downloader?: AmundiDownloader) {
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

/** Fabrique une `RawData` Amundi à partir d'un texte de document déjà extrait. */
export function amundiRawFromText(text: string, sourceUrl: string, retrievedAt: string): RawData {
  return issuerRawFromText(SOURCE_KEY, text, sourceUrl, retrievedAt);
}
