/**
 * Pipeline d'ingestion B1 — ISIN → GECO (source officielle AMF) → identité +
 * documents officiels (KID/DIC/prospectus) → données extraites + traçabilité.
 *
 * Usage :
 *   bun run scripts/ingest-funds.ts FR0010752543 FR0013306735 ...
 *   (sans argument → ISIN de démonstration ci-dessous)
 *
 * Ce que le script FAIT réellement (zéro mock, zéro invention) :
 *   - résout l'ISIN dans GECO, lit compartiment + part → identité sourcée ;
 *   - liste les documents officiels + leur URL de téléchargement ;
 *   - télécharge chaque PDF pour PROUVER sa disponibilité (taille), stocke l'URL ;
 *   - marque les champs issus du PDF (SFDR, frais, ESG, exclusions) comme
 *     `extraction_unavailable` : leur extraction exige un extracteur PDF (poppler)
 *     absent du runtime — on ne devine jamais leur valeur.
 *   - statuts : `ok` | `unavailable` (fonds/doc introuvable) | `error`.
 *
 * Chaque donnée conserve sa source (URL GECO) et `retrievedAt` (§5 traçabilité).
 */

import {
  gecoUrls,
  resolveByIsin,
  getCompartment,
  getShare,
  getDocuments,
  mapIdentity,
  type GecoDocument,
  type GecoIdentity,
} from "../src/lib/data-engine/sources/geco.server";

type Status = "ok" | "unavailable" | "error";

interface DocumentResult extends GecoDocument {
  /** Résultat du téléchargement réel du PDF (preuve de disponibilité). */
  download: { status: "ok" | "unavailable"; bytes: number | null };
}

interface IngestionResult {
  isin: string;
  status: Status;
  retrievedAt: string;
  /** Sources GECO consultées (pour « d'où vient cette info ? »). */
  sources: Record<string, string>;
  identity: GecoIdentity | null;
  documents: DocumentResult[];
  /** Champs présents uniquement dans le PDF → non extraits (pas d'outil). */
  pdfDerived: {
    sfdrArticle: null;
    ongoingChargesPct: null;
    esg: null;
    exclusions: null;
    status: "extraction_unavailable";
    reason: string;
  };
}

const PDF_REASON =
  "Extraction PDF indisponible dans ce runtime (nécessite un extracteur type poppler en job offline).";

async function headSize(
  url: string,
): Promise<{ status: "ok" | "unavailable"; bytes: number | null }> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return { status: "unavailable", bytes: null };
    const buf = await resp.arrayBuffer();
    return { status: "ok", bytes: buf.byteLength };
  } catch {
    return { status: "unavailable", bytes: null };
  }
}

export async function ingestIsin(isin: string): Promise<IngestionResult> {
  const retrievedAt = new Date().toISOString();
  const base: Omit<IngestionResult, "status" | "identity" | "documents"> = {
    isin,
    retrievedAt,
    sources: { resolve: gecoUrls.resolve(isin) },
    pdfDerived: {
      sfdrArticle: null,
      ongoingChargesPct: null,
      esg: null,
      exclusions: null,
      status: "extraction_unavailable",
      reason: PDF_REASON,
    },
  };

  try {
    const ref = await resolveByIsin(isin);
    if (!ref) return { ...base, status: "unavailable", identity: null, documents: [] };

    base.sources.compartment = gecoUrls.compartment(ref.cmpId);
    base.sources.share = gecoUrls.share(ref.idInterne);
    base.sources.documents = gecoUrls.documents(ref.idInterne);

    const [compartment, share, docs] = await Promise.all([
      getCompartment(ref.cmpId),
      getShare(ref.idInterne),
      getDocuments(ref.idInterne),
    ]);
    const identity = mapIdentity(compartment, share);

    const documents: DocumentResult[] = [];
    for (const d of docs) {
      documents.push({ ...d, download: await headSize(d.url) });
    }

    return { ...base, status: "ok", identity, documents };
  } catch (e) {
    return {
      ...base,
      status: "error",
      identity: null,
      documents: [],
      sources: { ...base.sources, error: e instanceof Error ? e.message : String(e) },
    };
  }
}

const DEMO_ISINS = ["FR0010752543", "FR0013306735", "FR0011291657", "FR0013478591", "FR0010929836"];

async function main() {
  const isins = process.argv.slice(2).length ? process.argv.slice(2) : DEMO_ISINS;
  const results: IngestionResult[] = [];
  for (const isin of isins) {
    const r = await ingestIsin(isin);
    results.push(r);
    // Sortie lisible par fonds.
    const id = r.identity;
    console.log(`\n=== ${isin} → ${r.status} ===`);
    if (id) {
      console.log(`  Fonds        : ${id.fundName ?? "—"} / part ${id.shareName ?? "—"}`);
      console.log(`  Société gest.: ${id.managementCompany ?? "—"} (LEI ${id.managerLei ?? "—"})`);
      console.log(`  Domicile     : ${id.domicile ?? "—"} · ${id.legalNature ?? "—"}`);
      console.log(`  Classif AMF  : ${id.amfClassification ?? "—"}`);
      console.log(`  Devise/créa. : ${id.currency ?? "—"} · ${id.inceptionDate ?? "—"}`);
    }
    console.log(`  Documents    : ${r.documents.length}`);
    for (const d of r.documents) {
      console.log(
        `    - ${d.docType ?? "?"} (${d.dateEffet ?? "?"}) [${d.download.status}${d.download.bytes != null ? ` ${d.download.bytes}o` : ""}] ${d.url}`,
      );
    }
    console.log(`  PDF-derived  : SFDR/frais/ESG = ${r.pdfDerived.status}`);
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const unavailable = results.filter((r) => r.status === "unavailable").length;
  console.log(`\n--- Résumé : ${ok} ok, ${unavailable} unavailable, ${results.length} total ---`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
