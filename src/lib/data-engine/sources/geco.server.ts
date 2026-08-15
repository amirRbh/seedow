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

/** Une page de la liste GECO des compartiments → ISIN réels extraits. */
export interface CompartmentPage {
  total: number;
  isins: string[];
}

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Extrait les ISIN valides d'une page `getCompartmentsBycriteria` (dédupliqués). */
export function mapCompartmentList(json: any): CompartmentPage {
  const total = Number(json?.total) || 0;
  const seen = new Set<string>();
  for (const c of Array.isArray(json?.compartmentDtos) ? json.compartmentDtos : []) {
    for (const i of Array.isArray(c?.sharesIsins) ? c.sharesIsins : []) {
      if (typeof i === "string" && ISIN_RE.test(i)) seen.add(i);
    }
  }
  return { total, isins: [...seen] };
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

/** Une page de la liste GECO des compartiments (POST lazy-load). */
export async function listCompartments(
  first: number,
  rows: number,
  fetchImpl: typeof fetch = fetch,
): Promise<CompartmentPage> {
  try {
    const resp = await fetchImpl(
      `${GECO_BASE}/funds/getCompartmentsBycriteria?productType=&idThirdParty=0`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ first, rows, filters: {}, globalFilter: null }),
      },
    );
    if (!resp.ok) return { total: 0, isins: [] };
    return mapCompartmentList(await resp.json());
  } catch {
    return { total: 0, isins: [] };
  }
}

/**
 * Découvre automatiquement des ISIN réels via GECO (source régulateur), jusqu'à
 * `limit`. Pagine la liste officielle et déduplique. Zéro invention.
 */
export async function discoverIsins(
  limit: number,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const out: string[] = [];
  const seen = new Set<string>();
  const pageSize = 100;
  for (let first = 0; out.length < limit; first += pageSize) {
    const page = await listCompartments(first, pageSize, fetchImpl);
    if (page.isins.length === 0) break;
    for (const i of page.isins) {
      if (!seen.has(i)) {
        seen.add(i);
        out.push(i);
      }
      if (out.length >= limit) break;
    }
    if (first + pageSize >= page.total) break;
  }
  return out.slice(0, limit);
}
