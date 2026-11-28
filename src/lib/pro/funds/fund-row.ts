/**
 * Passage GECO → ligne `pro_funds` et choix des documents officiels (module pur).
 *
 * Priorité des sources pour l'identité : GECO (AMF) d'abord ; à défaut, la
 * liste de départ (elle-même tirée de GECO, à une date antérieure). Jamais de
 * valeur fabriquée : un champ absent reste `null`.
 */
import { canonicalDocType } from "../../esg/sfdr-pipeline/geco-resolver";
import type { GecoDocument, GecoIdentity } from "../../data-engine/sources/geco.server";
import type { UniverseFund } from "./universe";

const LEI = /^[A-Z0-9]{18}[0-9]{2}$/;
const CCY = /^[A-Z]{3}$/;

export interface ProFundRow {
  isin: string;
  name: string;
  management_company: string | null;
  management_company_lei: string | null;
  amf_classification: string | null;
  legal_form: string | null;
  currency: string | null;
  identity_source: "amf_geco";
  identity_source_url: string;
  identity_retrieved_at: string;
  selection_reason: string;
  esma_name_terms: string[];
  updated_at: string;
}

export function fundRow(
  u: UniverseFund,
  id: GecoIdentity | null,
  sourceUrl: string,
  retrievedAt: string,
): ProFundRow {
  const lei = id?.managerLei?.trim().toUpperCase() ?? null;
  const ccy = id?.currency?.trim().toUpperCase() ?? null;
  return {
    isin: u.isin,
    name: id?.fundName?.trim() || u.name,
    management_company: id?.managementCompany?.trim() || u.management_company,
    management_company_lei: lei && LEI.test(lei) ? lei : null,
    amf_classification: id?.amfClassification?.trim() || u.amf_classification,
    legal_form: u.legal_form,
    currency: ccy && CCY.test(ccy) ? ccy : null,
    identity_source: "amf_geco",
    identity_source_url: id ? sourceUrl : u.source_url,
    identity_retrieved_at: retrievedAt,
    selection_reason: u.selection_reason,
    esma_name_terms: u.esma_terms,
    updated_at: retrievedAt,
  };
}

/** Date GECO (« 2026-03-01 », « 01/03/2026 » ou ISO complet) → clé triable, ou "". */
export function dateKey(d: string | null): string {
  if (!d) return "";
  const fr = d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (fr) return `${fr[3]}-${fr[2]}-${fr[1]}`;
  const iso = d.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1]! : "";
}

/** Le document le plus récent parmi les types demandés (ordre = préférence). */
export function pickDocument(
  docs: readonly GecoDocument[],
  kinds: readonly ReturnType<typeof canonicalDocType>[],
): (GecoDocument & { kind: ReturnType<typeof canonicalDocType> }) | null {
  for (const kind of kinds) {
    const c = docs
      .filter((d) => canonicalDocType(d.docType) === kind)
      .sort((a, b) => dateKey(b.dateEffet).localeCompare(dateKey(a.dateEffet)));
    if (c[0]) return { ...c[0], kind };
  }
  return null;
}
