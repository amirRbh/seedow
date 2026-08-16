/**
 * Pipeline d'ingestion B1 — ISIN → GECO (source officielle AMF) → identité +
 * documents officiels (KID/DIC/prospectus) → extraction PDF → persistance.
 *
 * Usage :
 *   bun run scripts/ingest-funds.ts FR0010752543 FR0013306735 ...   (défaut : 5 ISIN démo)
 *   SEEDOW_PERSIST=1 bun run scripts/ingest-funds.ts ...            (écrit en base)
 *
 * Étapes (zéro mock, zéro invention — champ absent → null) :
 *   1. GECO : identité (nom, société de gestion + LEI, domicile, classif AMF, devise) ;
 *   2. documents officiels + URL de téléchargement ;
 *   3. extraction PDF du KID via `pdftotext` (SFDR, frais courants) SI l'outil est
 *      présent (job offline / GitHub Action avec poppler) — sinon `extraction_unavailable` ;
 *   4. persistance (si SEEDOW_PERSIST + Supabase) : observations sourcées + MAJ
 *      canonique (sfdr_article, ter) via le writer existant, matché par ISIN.
 *   Statuts : `ok` | `unavailable` | `error`. Traçabilité : source + retrievedAt (§5).
 */

import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  gecoUrls,
  resolveByIsin,
  getCompartment,
  getShare,
  getDocuments,
  mapIdentity,
  discoverIsins,
  type GecoDocument,
  type GecoIdentity,
} from "../src/lib/data-engine/sources/geco.server";
import { parseKidSfdrArticle, parseKidOngoingCharges } from "../src/lib/esg/kid-parser";

type Status = "ok" | "unavailable" | "error";

interface DocumentResult extends GecoDocument {
  download: { status: "ok" | "unavailable"; bytes: number | null };
}

interface PdfDerived {
  sfdrArticle: number | null;
  ongoingChargesPct: number | null;
  /** `ok` = au moins un champ extrait ; `extraction_unavailable` = pas d'outil/PDF. */
  status: "ok" | "extraction_unavailable" | "extraction_failed";
  sourceUrl: string | null; // URL du document d'où proviennent ces champs
  reason: string | null;
}

interface IngestionResult {
  isin: string;
  status: Status;
  retrievedAt: string;
  sources: Record<string, string>;
  identity: GecoIdentity | null;
  documents: DocumentResult[];
  pdfDerived: PdfDerived;
}

const hasPdftotext = (() => {
  try {
    return (
      spawnSync("pdftotext", ["-v"]).status === 0 || spawnSync("pdftotext", ["-v"]).error == null
    );
  } catch {
    return false;
  }
})();

async function headSize(
  url: string,
): Promise<{ status: "ok" | "unavailable"; bytes: number | null; buf: ArrayBuffer | null }> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return { status: "unavailable", bytes: null, buf: null };
    const buf = await resp.arrayBuffer();
    return { status: "ok", bytes: buf.byteLength, buf };
  } catch {
    return { status: "unavailable", bytes: null, buf: null };
  }
}

/** Extrait le texte d'un PDF (buffer) via `pdftotext -layout`, ou null. */
function pdfToText(buf: ArrayBuffer): string | null {
  if (!hasPdftotext) return null;
  try {
    const dir = mkdtempSync(join(tmpdir(), "kid-"));
    const p = join(dir, "doc.pdf");
    writeFileSync(p, Buffer.from(buf));
    const r = spawnSync("pdftotext", ["-layout", p, "-"], {
      encoding: "utf8",
      maxBuffer: 20_000_000,
    });
    return r.status === 0 && r.stdout ? r.stdout : null;
  } catch {
    return null;
  }
}

function extractPdf(text: string | null, sourceUrl: string): PdfDerived {
  if (text == null)
    return {
      sfdrArticle: null,
      ongoingChargesPct: null,
      status: "extraction_unavailable",
      sourceUrl: null,
      reason: "pdftotext indisponible (job offline requis)",
    };
  // Debug facultatif : révèle le libellé réel des coûts/SFDR dans le KID pour
  // calibrer les regex (SEEDOW_DUMP=1). N'affecte pas l'extraction.
  if (process.env.SEEDOW_DUMP === "1") {
    for (const line of text.split("\n")) {
      if (/frais|co[ûu]t|article\s*[689]|SFDR|durabilit/i.test(line)) {
        const t = line.trim();
        if (t) console.log(`    [dump] ${t.slice(0, 140)}`);
      }
    }
  }
  const sfdr = parseKidSfdrArticle(text);
  const terFrac = parseKidOngoingCharges(text);
  const ongoingChargesPct = terFrac == null ? null : Math.round(terFrac * 100 * 100) / 100;
  const got = sfdr != null || ongoingChargesPct != null;
  return {
    sfdrArticle: sfdr,
    ongoingChargesPct,
    status: got ? "ok" : "extraction_failed",
    sourceUrl: got ? sourceUrl : null,
    reason: got ? null : "aucun champ reconnu dans le PDF (format à calibrer)",
  };
}

export async function ingestIsin(isin: string): Promise<IngestionResult> {
  const retrievedAt = new Date().toISOString();
  const base = {
    isin,
    retrievedAt,
    sources: { resolve: gecoUrls.resolve(isin) } as Record<string, string>,
  };
  const noPdf: PdfDerived = {
    sfdrArticle: null,
    ongoingChargesPct: null,
    status: "extraction_unavailable",
    sourceUrl: null,
    reason: "aucun document exploitable",
  };

  try {
    const ref = await resolveByIsin(isin);
    if (!ref)
      return { ...base, status: "unavailable", identity: null, documents: [], pdfDerived: noPdf };

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
    let pdfDerived: PdfDerived = noPdf;
    for (const d of docs) {
      const dl = await headSize(d.url);
      documents.push({ ...d, download: { status: dl.status, bytes: dl.bytes } });
      // Extraction sur le 1er document exploitable (KID en priorité).
      if (pdfDerived.status !== "ok" && dl.buf) {
        pdfDerived = extractPdf(pdfToText(dl.buf), d.url);
      }
    }

    return { ...base, status: "ok", identity, documents, pdfDerived };
  } catch (e) {
    return {
      ...base,
      status: "error",
      identity: null,
      documents: [],
      pdfDerived: noPdf,
      sources: { ...base.sources, error: e instanceof Error ? e.message : String(e) },
    };
  }
}

/**
 * Déduit l'`asset_class` (enum requis, NOT NULL) à partir de la classification
 * AMF réelle renvoyée par GECO. Mapping conservateur ; sans correspondance nette
 * (fonds « mixtes », diversifiés…), on retombe sur `thematic` (bucket « autre »
 * déjà utilisé par le seed). La classification AMF réelle reste conservée telle
 * quelle dans `description` ET dans une observation dédiée — rien n'est perdu ni
 * inventé, seul le bucket enum est approximé pour satisfaire la contrainte NOT NULL.
 */
export function deriveAssetClass(identity: GecoIdentity): string {
  const s = `${identity.amfClassification ?? ""} ${identity.legalNature ?? ""}`.toLowerCase();
  if (/mon[ée]taire/.test(s)) return "cash";
  if (/immobili|opci|scpi|reit/.test(s)) return "reit";
  if (/mati[èe]res? premi[èe]res?|commodit/.test(s)) return "commodity";
  if (/obligation|cr[ée]ance|taux|bond/.test(s))
    return /souverain|[ée]tat|public|govern/.test(s) ? "sov_bond" : "corporate_bond";
  if (/action|[ée]quity|share/.test(s))
    return /[ée]mergent|emerging/.test(s) ? "equity_em" : "equity_dev";
  return "thematic";
}

/**
 * Trouve l'asset par ISIN, sinon le CRÉE depuis l'identité GECO réelle.
 * Idempotent : `isin` et `ticker` (= ISIN, faute de symbole marché côté GECO)
 * sont UNIQUE → aucun doublon au rejeu. On ne renseigne que des champs réels ;
 * un champ absent reste au défaut du schéma (jamais une valeur inventée). Un
 * asset auto-créé est `is_active = false` (non revu éditorialement).
 */
export async function ensureAsset(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  isin: string,
  identity: GecoIdentity,
): Promise<{ id: string; created: boolean }> {
  const { data: existing } = await admin.from("assets").select("id").eq("isin", isin).maybeSingle();
  if (existing?.id) return { id: existing.id, created: false };

  const description =
    [identity.amfClassification, identity.legalNature, identity.domicile]
      .filter(Boolean)
      .join(" · ") || null;
  const row: Record<string, unknown> = {
    ticker: isin,
    isin,
    name: identity.fundName ?? identity.shareName ?? isin,
    issuer: identity.managementCompany,
    asset_class: deriveAssetClass(identity),
    currency: identity.currency ?? "EUR",
    description,
    is_active: false,
  };
  const { data: created, error } = await admin.from("assets").insert(row).select("id").single();
  if (error) throw new Error(`create asset ${isin}: ${error.message}`);
  return { id: created.id, created: true };
}

/**
 * Persiste un résultat en base (si SEEDOW_PERSIST + Supabase configuré) :
 * enrichit l'asset existant OU le crée s'il est absent (via `ensureAsset`), puis
 * écrit les observations sourcées + MAJ canonique (sfdr_article, ter) via le
 * writer existant. Idempotent : purge les observations `amf_geco` antérieures de
 * l'asset avant réinsertion (le rejeu ne duplique ni asset ni observations ;
 * sources/URL/dates conservées). N'invente rien : champ absent → non écrit.
 */
export async function persist(result: IngestionResult): Promise<string> {
  if (result.status !== "ok" || !result.identity) return "skip (non ok)";
  const { supabaseAdmin } = await import("../src/integrations/supabase/client.server");
  const { persistObservations } = await import("../src/lib/data-engine/persist");
  const { supabaseObservationWriter } = await import("../src/lib/data-engine/persist.supabase");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;

  const { id: assetId, created } = await ensureAsset(admin, result.isin, result.identity);

  const src =
    result.sources.documents ?? result.sources.compartment ?? gecoUrls.resolve(result.isin);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obs: any[] = [];
  const push = (field: string, value: unknown, url: string) =>
    obs.push({
      field,
      value,
      sourceKey: "amf_geco",
      sourceUrl: url,
      referenceDate: null,
      retrievedAt: result.retrievedAt,
      confidence: "high",
      method: "geco+pdf",
      validation: { status: "valid", reason: null },
    });

  if (result.identity.fundName) push("fund_name", result.identity.fundName, src);
  if (result.identity.managementCompany)
    push("management_company", result.identity.managementCompany, src);
  if (result.identity.amfClassification)
    push(
      "amf_classification",
      result.identity.amfClassification,
      result.sources.compartment ?? src,
    );
  if (result.pdfDerived.sfdrArticle != null && result.pdfDerived.sourceUrl)
    push("sfdr_article", result.pdfDerived.sfdrArticle, result.pdfDerived.sourceUrl);
  if (result.pdfDerived.ongoingChargesPct != null && result.pdfDerived.sourceUrl)
    push("ter", result.pdfDerived.ongoingChargesPct / 100, result.pdfDerived.sourceUrl);
  for (const d of result.documents) push("kid_document_url", d.url, d.url);

  // Idempotence : supprime les observations amf_geco antérieures de cet asset
  // avant de réécrire le lot courant (pas de doublons au rejeu).
  const { data: srcRow } = await admin
    .from("data_sources")
    .select("id")
    .eq("key", "amf_geco")
    .maybeSingle();
  if (srcRow?.id)
    await admin
      .from("data_observations")
      .delete()
      .eq("asset_id", assetId)
      .eq("source_id", srcRow.id);

  const r = await persistObservations(supabaseObservationWriter(supabaseAdmin), assetId, obs);
  return `${created ? "created" : "updated"} asset · ${r.observationsInserted} obs, canonique: ${r.canonicalFieldsUpdated.join(",") || "—"}`;
}

const DEMO_ISINS = ["FR0010752543", "FR0013306735", "FR0011291657", "FR0013478591", "FR0010929836"];

async function main() {
  const args = process.argv.slice(2);
  // `--discover N` : récupère automatiquement N ISIN réels via GECO ; sinon
  // ISIN passés en arguments ; sinon les 5 ISIN de démo.
  let isins: string[];
  if (args[0] === "--discover") {
    const limit = Math.max(1, Number(args[1]) || 50);
    console.log(`Découverte de ${limit} ISIN via GECO…`);
    isins = await discoverIsins(limit);
    console.log(`→ ${isins.length} ISIN découverts.`);
  } else {
    isins = args.length ? args : DEMO_ISINS;
  }
  const doPersist = process.env.SEEDOW_PERSIST === "1";
  console.log(`pdftotext: ${hasPdftotext ? "présent" : "absent"} · persist: ${doPersist}`);
  let ok = 0;
  let unavailable = 0;
  for (const isin of isins) {
    const r = await ingestIsin(isin);
    if (r.status === "ok") ok++;
    else if (r.status === "unavailable") unavailable++;
    const id = r.identity;
    console.log(`\n=== ${isin} → ${r.status} ===`);
    if (id) {
      console.log(`  Fonds        : ${id.fundName ?? "—"} / part ${id.shareName ?? "—"}`);
      console.log(`  Société gest.: ${id.managementCompany ?? "—"} (LEI ${id.managerLei ?? "—"})`);
      console.log(`  Domicile     : ${id.domicile ?? "—"} · ${id.legalNature ?? "—"}`);
      console.log(`  Classif AMF  : ${id.amfClassification ?? "—"}`);
      console.log(`  Devise/créa. : ${id.currency ?? "—"} · ${id.inceptionDate ?? "—"}`);
    }
    for (const d of r.documents)
      console.log(`  doc          : ${d.docType ?? "?"} [${d.download.status}] ${d.url}`);
    console.log(
      `  PDF          : SFDR=${r.pdfDerived.sfdrArticle ?? "—"} frais=${r.pdfDerived.ongoingChargesPct ?? "—"}% (${r.pdfDerived.status})`,
    );
    if (doPersist) {
      try {
        console.log(`  persist      : ${await persist(r)}`);
      } catch (e) {
        console.log(`  persist      : error (${e instanceof Error ? e.message : String(e)})`);
      }
    }
  }
  console.log(`\n--- ${ok} ok, ${unavailable} unavailable, ${isins.length} total ---`);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
