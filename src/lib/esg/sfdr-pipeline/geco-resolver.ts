/**
 * Adaptateur GECO → DocumentResolver (§4). Réutilise le client officiel existant
 * (`lib/data-engine/sources/geco.server`) — PAS de seconde architecture. GECO est
 * la source PRIMAIRE (régulateur AMF, priorité 1) : ISIN → documents officiels
 * (KID/DICI/prospectus) avec leurs URL de téléchargement.
 *
 * Server-only (réseau). Ne lève jamais (le client GECO renvoie null en cas
 * d'erreur). Le mapping docType → type canonique reste conservateur : un libellé
 * inconnu tombe dans « other », jamais deviné.
 */

import {
  getDocuments,
  resolveByIsin,
  getCompartment,
  mapIdentity,
  type GecoDocument,
} from "../../data-engine/sources/geco.server";
import type { DocumentResolver } from "./pipeline";
import type { CandidateDocument, ResolvedFund } from "./types";

const SOURCE_KEY = "amf_geco";
const SOURCE_NAME = "AMF — base GECO";

/** Mappe un libellé de type GECO (FR) vers l'enum canonique `fund_document_type`. */
export function canonicalDocType(docType: string | null): CandidateDocument["canonicalType"] {
  const t = (docType ?? "").toLowerCase();
  if (/\bdic\b|priips|document d.information cl/.test(t)) return "kid";
  if (/dici/.test(t)) return "dici";
  if (/prospectus/.test(t)) return "prospectus";
  if (/sfdr|durabilit|annexe/.test(t)) return "sfdr";
  if (/rapport annuel|annual/.test(t)) return "annual_report";
  if (/factsheet|fiche/.test(t)) return "factsheet";
  return "other";
}

function toCandidate(d: GecoDocument): CandidateDocument {
  return {
    docType: d.docType,
    canonicalType: canonicalDocType(d.docType),
    url: d.url,
    documentDate: d.dateEffet,
    language: "fr",
  };
}

export class GecoResolver implements DocumentResolver {
  readonly sourceKey = SOURCE_KEY;
  readonly sourceName = SOURCE_NAME;
  readonly sourceTier = "PRIMARY" as const;

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async resolve(isin: string): Promise<ResolvedFund | null> {
    const ref = await resolveByIsin(isin, this.fetchImpl);
    if (!ref) return null; // ISIN inconnu de GECO (souvent : fonds non FR)

    const [compartment, gecoDocs] = await Promise.all([
      ref.cmpId ? getCompartment(ref.cmpId, this.fetchImpl) : Promise.resolve(null),
      getDocuments(ref.idInterne, this.fetchImpl),
    ]);
    const identity = mapIdentity(compartment, { parNom: ref.parNom });

    return {
      sourceKey: SOURCE_KEY,
      sourceName: SOURCE_NAME,
      sourceTier: "PRIMARY",
      sourceUrl: `https://geco.amf-france.org/back-office/document/byShare/${ref.idInterne}`,
      fundName: identity.fundName ?? ref.parNom ?? null,
      managementCompany: identity.managementCompany ?? null,
      documents: gecoDocs.map(toCandidate),
    };
  }
}
