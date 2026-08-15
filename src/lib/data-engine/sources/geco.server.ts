/**
 * Client GECO (AMF) — source officielle régulateur (priorité 1), server-only.
 *
 * Chaîne réelle, reverse-engineerée sur l'API back-office publique de GECO
 * (https://geco.amf-france.org) :
 *   ISIN → funds/shareByCmpCodeParPrincp/{isin} → { idInterne, cmpId }
 *        → funds/compartment/{cmpId}   (identité, société de gestion, classif AMF)
 *        → funds/share/{idInterne}     (devise, date de création, statut)
 *        → document/byShare/{idInterne} (KID/DIC/prospectus + URL de download)
 *
 * Contrat §1.2 / §17 : on n'extrait que ce que GECO renvoie réellement (champ
 * absent → null), et toute erreur réseau/HTTP → null (jamais d'exception, jamais
 * de donnée inventée). SFDR / frais / ESG détaillé ne sont PAS dans le JSON GECO
 * (ils vivent dans le PDF du KID) → ces champs restent null ici.
 */

export const GECO_BASE = "https://geco.amf-france.org/back-office";

export interface GecoRef {
  idInterne: number;
  cmpId: string;
  parId: string | null;
  isin: string;
  parNom: string | null;
}

export interface GecoIdentity {
  fundName: string | null; // compartiment (cmpNom)
  shareName: string | null; // part (parNom)
  managementCompany: string | null; // gestionnaire
  managerLei: string | null; // LEI de la société de gestion
  domicile: string | null;
  legalNature: string | null; // OPCVM/FCP…
  amfClassification: string | null;
  currency: string | null;
  status: string | null;
  inceptionDate: string | null; // ISO
}

export interface GecoDocument {
  docType: string | null; // ex. "DIC PRIIPS toutes opérations", "DICI", "Prospectus"
  dateEffet: string | null;
  format: string | null;
  url: string; // URL de téléchargement officielle
}

/** URL de téléchargement officielle d'un document (par son idInterne). */
export function buildDownloadUrl(docIdInterne: number): string {
  return `${GECO_BASE}/document/download/${docIdInterne}`;
}

export const gecoUrls = {
  resolve: (isin: string) => `${GECO_BASE}/funds/shareByCmpCodeParPrincp/${isin}`,
  compartment: (cmpId: string) => `${GECO_BASE}/funds/compartment/${cmpId}`,
  share: (idInterne: number) => `${GECO_BASE}/funds/share/${idInterne}`,
  documents: (idInterne: number) => `${GECO_BASE}/document/byShare/${idInterne}`,
};

// ── Mappers purs (testables sur payloads réels) ────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapRef(json: any): GecoRef | null {
  if (!json || typeof json !== "object") return null;
  const idInterne = Number(json.idInterne);
  if (!Number.isFinite(idInterne) || idInterne <= 0) return null; // 0 = non résolu
  if (!json.isin) return null;
  return {
    idInterne,
    cmpId: String(json.cmpId ?? ""),
    parId: json.parId ?? null,
    isin: String(json.isin),
    parNom: json.parNom ?? null,
  };
}

export function mapIdentity(compartment: any, share: any): GecoIdentity {
  const c = compartment ?? {};
  const s = share ?? {};
  return {
    fundName: c.cmpNom ?? null,
    shareName: s.parNom ?? null,
    managementCompany: c.gestionnaire ?? c.fundDTO?.gestionnaireNom ?? null,
    managerLei: c.gestionnaireAssocie?.codeLei ?? c.fundDTO?.gestionnaireLei ?? null,
    domicile: c.prdDomcltnLib ?? c.prdDomcltn ?? null,
    legalNature: c.prdSsNatureLib ?? c.prdNatureLib ?? null,
    amfClassification: c.cmpClssFndAmfLib ?? null,
    currency: s.parRefDevCode ?? null,
    status: s.parStatutLib ?? c.cmpStatutLib ?? null,
    inceptionDate: s.parDateCreation ?? null,
  };
}

export function mapDocuments(arr: any): GecoDocument[] {
  if (!Array.isArray(arr)) return [];
  const out: GecoDocument[] = [];
  for (const d of arr) {
    const id = Number(d?.idInterne);
    if (!Number.isFinite(id) || id <= 0) continue;
    out.push({
      docType: d.docTypeLib ?? null,
      dateEffet: d.dateEffet ?? null,
      format: d.docFormat ?? null,
      url: buildDownloadUrl(id),
    });
  }
  return out;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Fetchers live (server) — ne lèvent jamais (§17) ────────────────────────

async function getJson(url: string, fetchImpl: typeof fetch): Promise<unknown | null> {
  try {
    const resp = await fetchImpl(url, { headers: { Accept: "application/json" } });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

export async function resolveByIsin(isin: string, fetchImpl: typeof fetch = fetch) {
  return mapRef(await getJson(gecoUrls.resolve(isin), fetchImpl));
}

export async function getCompartment(cmpId: string, fetchImpl: typeof fetch = fetch) {
  return getJson(gecoUrls.compartment(cmpId), fetchImpl);
}

export async function getShare(idInterne: number, fetchImpl: typeof fetch = fetch) {
  return getJson(gecoUrls.share(idInterne), fetchImpl);
}

export async function getDocuments(idInterne: number, fetchImpl: typeof fetch = fetch) {
  return mapDocuments(await getJson(gecoUrls.documents(idInterne), fetchImpl));
}
