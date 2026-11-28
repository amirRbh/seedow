/**
 * Construit la base UC de Seedow Pro à partir de sources officielles.
 *
 *   bun run scripts/pro/build-fund-base.ts [--universe data/pro/uc-universe-v1.json]
 *        [--isins FR…,FR…] [--limit N] [--out out/fund-base] [--persist]
 *
 * Pour chaque ISIN (aucune IA dans ce script) :
 *   1. GECO (AMF) : identité officielle (nom, société de gestion et son LEI,
 *      classification, devise) et liste des documents réglementaires ;
 *   2. KID / DIC : téléchargé, lu par `pdftotext -layout`, frais courants extraits
 *      par le parseur déterministe existant, avec page et ligne citées ;
 *   3. annexe SFDR : dans le document SFDR ou le prospectus le plus récent, les
 *      pages de l'annexe sont repérées (`annex-locate.ts`) puis isolées dans un PDF
 *      à part, écrit dans `<out>/annexes/<ISIN>.pdf`, avec un manifeste
 *      (`<out>/annexes/manifest.json`) qui garde l'URL et les pages d'origine.
 *      L'extraction de ces annexes est faite ENSUITE par `ingest.ts`, qui seul
 *      appelle le modèle ;
 *   4. rapport : `<out>/report.json` et `<out>/REPORT.md` (un statut par fonds).
 *
 * Sans --persist : rien n'est écrit en base (mode par défaut).
 * Avec --persist : upsert de `pro_funds` (identité sourcée), insertion des frais
 * dans `pro_fund_costs` (un KID déjà importé est ignoré), une ligne de journal
 * dans `pro_fund_imports`. Aucune suppression.
 *
 * Courtoisie : requêtes séquentielles espacées de 400 ms (API du site de l'AMF).
 * Env (--persist) : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import {
  getCompartment,
  getDocuments,
  getShare,
  gecoUrls,
  mapIdentity,
  resolveByIsin,
} from "../../src/lib/data-engine/sources/geco.server";
import { isValidIsin } from "../../src/lib/pro/app/isin";
import { locateAnnex } from "../../src/lib/pro/funds/annex-locate";
import { fundRow, pickDocument, dateKey } from "../../src/lib/pro/funds/fund-row";
import { kidCosts, type KidCosts } from "../../src/lib/pro/funds/kid-costs";
import type { UniverseFund } from "../../src/lib/pro/funds/universe";
import { pdfPagesText } from "./lib/pdf-text";
import { sha256Hex } from "./lib/process-annex";
import { serviceClient } from "./lib/supabase";

const PAUSE_MS = 400;
const USER_AGENT = "Seedow-Pro-fund-base/1.0";
const KID_PARSER = "kid-parser@lib/esg/kid-parser";

const { values: opts } = parseArgs({
  options: {
    universe: { type: "string", default: "data/pro/uc-universe-v1.json" },
    isins: { type: "string" },
    limit: { type: "string" },
    out: { type: "string", default: "out/fund-base" },
    persist: { type: "boolean", default: false },
  },
});

const universeSchema = z.object({
  funds: z.array(
    z.object({
      isin: z.string(),
      name: z.string(),
      management_company: z.string(),
      amf_classification: z.string().nullable(),
      legal_form: z.string(),
      esma_terms: z.array(z.string()),
      esma_baseline: z.string(),
      selection_reason: z.string(),
      source_url: z.string(),
    }),
  ),
});

const universe: UniverseFund[] = universeSchema.parse(
  JSON.parse(await readFile(opts.universe!, "utf8")),
).funds;
let targets = universe;
if (opts.isins) {
  const wanted = new Set(opts.isins.split(/[\s,]+/).filter(Boolean));
  const bad = [...wanted].filter((i) => !isValidIsin(i));
  if (bad.length) throw new Error(`ISIN invalide(s) : ${bad.join(", ")}`);
  targets = universe.filter((u) => wanted.has(u.isin));
  const missing = [...wanted].filter((i) => !targets.some((t) => t.isin === i));
  if (missing.length) console.warn(`hors liste de départ, ignorés : ${missing.join(", ")}`);
}
if (opts.limit) targets = targets.slice(0, Number(opts.limit));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function download(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return Buffer.from(bytes.subarray(0, 4)).toString("latin1") === "%PDF" ? bytes : null;
  } catch {
    return null;
  }
}

/** Texte page par page via `pdftotext -layout` (format sur lequel le parseur KID est calibré). */
function pdftotextPages(bytes: Uint8Array): string[] | null {
  const r = spawnSync("pdftotext", ["-layout", "-", "-"], {
    input: Buffer.from(bytes),
    maxBuffer: 50_000_000,
    encoding: "utf8",
  });
  if (r.status !== 0 || typeof r.stdout !== "string") return null;
  return r.stdout.split("\f").filter((p, i, a) => i < a.length - 1 || p.trim() !== "");
}

async function cutPages(bytes: Uint8Array, start: number, end: number): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const dst = await PDFDocument.create();
  const pages = await dst.copyPages(
    src,
    Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i),
  );
  for (const p of pages) dst.addPage(p);
  return dst.save();
}

type Status = "ok" | "partial" | "unavailable" | "error";

interface FundOutcome {
  isin: string;
  name: string;
  status: Status;
  geco: "resolved" | "not_found";
  identity_source_url: string;
  costs: (KidCosts & { source_url: string; source_sha256: string; doc_date: string | null }) | null;
  costs_reason: string | null;
  annex: {
    file: string;
    source_url: string;
    source_sha256: string;
    source_page_start: number;
    source_page_end: number;
    annex_count: number;
  } | null;
  annex_reason: string | null;
  error?: string;
}

const outDir = opts.out!;
const annexDir = join(outDir, "annexes");
await mkdir(annexDir, { recursive: true });

const db = opts.persist ? serviceClient() : null;
const gitSha = process.env.GITHUB_SHA ?? null;
let importId: string | null = null;
if (db) {
  const { data, error } = await db
    .from("pro_fund_imports")
    .insert({
      source: "amf_geco",
      git_sha: gitSha,
      params: { universe: opts.universe, isins: opts.isins ?? null, limit: opts.limit ?? null },
    })
    .select("id")
    .single();
  if (error) throw error;
  importId = z.object({ id: z.string().uuid() }).parse(data).id;
}

const outcomes: FundOutcome[] = [];
const manifest: Record<string, unknown> = {};

for (const [n, u] of targets.entries()) {
  const retrievedAt = new Date().toISOString();
  const o: FundOutcome = {
    isin: u.isin,
    name: u.name,
    status: "unavailable",
    geco: "not_found",
    identity_source_url: u.source_url,
    costs: null,
    costs_reason: null,
    annex: null,
    annex_reason: null,
  };
  try {
    const ref = await resolveByIsin(u.isin);
    await sleep(PAUSE_MS);
    const [compartment, share, docs] = ref
      ? await Promise.all([
          getCompartment(ref.cmpId),
          getShare(ref.idInterne),
          getDocuments(ref.idInterne),
        ])
      : [null, null, []];
    if (ref) {
      o.geco = "resolved";
      o.identity_source_url = gecoUrls.compartment(ref.cmpId);
    }
    const identity = ref ? mapIdentity(compartment, share) : null;
    const row = fundRow(u, identity, o.identity_source_url, retrievedAt);
    o.name = row.name;

    // 2. KID / DIC → frais courants
    const kid = pickDocument(docs, ["kid", "dici"]);
    if (!kid) o.costs_reason = "aucun KID / DICI dans GECO";
    else {
      await sleep(PAUSE_MS);
      const bytes = await download(kid.url);
      const pages = bytes ? pdftotextPages(bytes) : null;
      if (!bytes) o.costs_reason = "KID non téléchargeable";
      else if (!pages) o.costs_reason = "texte du KID illisible (pdftotext)";
      else {
        const c = kidCosts(pages);
        o.costs = {
          ...c,
          source_url: kid.url,
          source_sha256: sha256Hex(bytes),
          doc_date: dateKey(kid.dateEffet) || null,
        };
        if (c.status === "not_found") o.costs_reason = "frais courants non lus (format à calibrer)";
      }
    }

    // 3. Annexe SFDR
    const doc = pickDocument(docs, ["sfdr", "prospectus"]);
    if (!doc) o.annex_reason = "ni annexe SFDR ni prospectus dans GECO";
    else {
      await sleep(PAUSE_MS);
      const bytes = await download(doc.url);
      if (!bytes) o.annex_reason = "document non téléchargeable";
      else {
        const pages = await pdfPagesText(bytes);
        const loc = locateAnnex(pages, row.name);
        if (loc.status !== "found") o.annex_reason = loc.reason;
        else {
          const { start, end } = loc.range;
          const annex = await cutPages(bytes, start, end);
          const file = `${u.isin}.pdf`;
          await writeFile(join(annexDir, file), annex);
          o.annex = {
            file,
            source_url: doc.url,
            source_sha256: sha256Hex(bytes),
            source_page_start: start,
            source_page_end: end,
            annex_count: loc.annexCount,
          };
          manifest[file] = {
            isin: u.isin,
            source_url: doc.url,
            source_sha256: o.annex.source_sha256,
            source_page_start: start,
            source_page_end: end,
          };
        }
      }
    }

    const costsOk = o.costs?.status === "auto";
    o.status = o.annex && costsOk ? "ok" : o.annex || o.costs ? "partial" : "unavailable";

    if (db) {
      const up = await db.from("pro_funds").upsert(row, { onConflict: "isin" });
      if (up.error) throw up.error;
      if (o.costs && kid) {
        const ins = await db.from("pro_fund_costs").upsert(
          {
            isin: u.isin,
            ongoing_charges_pct: o.costs.ongoing_charges_pct,
            status: o.costs.status,
            page: o.costs.page,
            quote: o.costs.quote,
            source_doc_type: kid.kind === "dici" ? "dici" : "kid",
            source_url: o.costs.source_url,
            source_sha256: o.costs.source_sha256,
            doc_date: o.costs.doc_date,
            parser: KID_PARSER,
          },
          { onConflict: "isin,source_sha256", ignoreDuplicates: true },
        );
        if (ins.error) throw ins.error;
      }
    }
  } catch (e) {
    o.status = "error";
    o.error = e instanceof Error ? e.message : String(e);
  }
  outcomes.push(o);
  console.log(
    `[${n + 1}/${targets.length}] ${o.status.padEnd(11)} ${u.isin} ${o.name} · frais ${
      o.costs?.ongoing_charges_pct ?? "—"
    } (${o.costs?.status ?? o.costs_reason}) · annexe ${
      o.annex ? `p. ${o.annex.source_page_start}-${o.annex.source_page_end}` : o.annex_reason
    }${o.error ? ` · ERREUR ${o.error}` : ""}`,
  );
}

const counts = {
  total: outcomes.length,
  ok: outcomes.filter((o) => o.status === "ok").length,
  partial: outcomes.filter((o) => o.status === "partial").length,
  unavailable: outcomes.filter((o) => o.status === "unavailable").length,
  error: outcomes.filter((o) => o.status === "error").length,
  geco_resolved: outcomes.filter((o) => o.geco === "resolved").length,
  costs_auto: outcomes.filter((o) => o.costs?.status === "auto").length,
  costs_review: outcomes.filter((o) => o.costs?.status === "needs_review").length,
  annexes: outcomes.filter((o) => o.annex).length,
};

await writeFile(join(annexDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
await writeFile(
  join(outDir, "report.json"),
  JSON.stringify(
    { generated_at: new Date().toISOString(), git_sha: gitSha, counts, outcomes },
    null,
    2,
  ) + "\n",
);
const reasons = (k: "costs_reason" | "annex_reason") =>
  Object.entries(
    outcomes.reduce<Record<string, number>>((acc, o) => {
      const r = o[k];
      if (r) acc[r] = (acc[r] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .map(([r, c]) => `- ${r} : ${c}`);
await writeFile(
  join(outDir, "REPORT.md"),
  [
    "# Base UC — import GECO",
    "",
    `Fonds traités : ${counts.total} · complets : ${counts.ok} · partiels : ${counts.partial} · ` +
      `sans document : ${counts.unavailable} · erreurs : ${counts.error}`,
    `GECO résolu : ${counts.geco_resolved} · frais lus avec preuve : ${counts.costs_auto} · ` +
      `frais à revoir : ${counts.costs_review} · annexes isolées : ${counts.annexes}`,
    "",
    "## Frais non lus",
    ...reasons("costs_reason"),
    "",
    "## Annexes non isolées",
    ...reasons("annex_reason"),
    "",
  ].join("\n"),
);

if (db && importId) {
  const status = counts.error === 0 ? (counts.ok === counts.total ? "ok" : "partial") : "partial";
  await db
    .from("pro_fund_imports")
    .update({ finished_at: new Date().toISOString(), counts, status })
    .eq("id", importId);
}
console.log(`\n${JSON.stringify(counts)}`);
console.log(
  opts.persist
    ? "Écrit en base."
    : "Mode préparation : rien n'est écrit en base (--persist pour écrire).",
);
