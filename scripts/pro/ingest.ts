/**
 * Ingestion d'annexes précontractuelles SFDR dans les tables `pro_*`.
 *
 *   bun run scripts/pro/ingest.ts <dossier | fichier.pdf | https://…pdf> [options]
 *
 * Options :
 *   --isin FR0010592022        ISIN du document (un seul fichier/URL)
 *   --manifest isins.json      {"<nom de fichier ou sha256>": "<ISIN>"} pour un dossier
 *   --source-url https://…     URL d'origine à archiver (fichier local)
 *   --dry-run                  extrait et vérifie, n'écrit rien
 *
 * Étapes par PDF : sha256 (déjà ingéré → ignoré) ; texte page par page ;
 * extraction par le modèle ; vérification des citations ; upload Storage
 * (`pro-annexes/<isin>/<sha256>.pdf`) ; upsert `pro_funds`, insert
 * `pro_fund_documents` et `pro_fund_sustainability_data`.
 *
 * L'ISIN figure rarement dans une annexe : il vient de --isin, du manifeste,
 * ou à défaut du document (citation vérifiée). Sans ISIN, rien n'est écrit.
 *
 * Env : ANTHROPIC_API_KEY, EXTRACTION_MODEL (défaut claude-sonnet-5-5),
 *       SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { EXTRACTION_VERSION } from "../../src/lib/pro/extraction/prompt.v1";
import { sustainabilityRow } from "../../src/lib/pro/extraction/to-row";
import { processAnnex, sha256Hex, type ProcessedAnnex } from "./lib/process-annex";
import { ANNEX_BUCKET, serviceClient } from "./lib/supabase";

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    isin: { type: "string" },
    manifest: { type: "string" },
    "source-url": { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

const target = positionals[0];
if (!target) {
  console.error(
    "Usage : bun run scripts/pro/ingest.ts <dossier|fichier.pdf|url> [--isin …] [--dry-run]",
  );
  process.exit(1);
}
if (opts.isin && !ISIN_RE.test(opts.isin)) {
  console.error(`ISIN invalide : ${opts.isin}`);
  process.exit(1);
}

interface Input {
  label: string;
  bytes: Uint8Array;
  sourceUrl: string | null;
}

async function loadInputs(t: string): Promise<Input[]> {
  if (/^https?:\/\//.test(t)) {
    const res = await fetch(t, { headers: { "User-Agent": "Seedow-Pro-ingest/1.0" } });
    if (!res.ok) throw new Error(`${t} : HTTP ${res.status}`);
    return [{ label: t, bytes: new Uint8Array(await res.arrayBuffer()), sourceUrl: t }];
  }
  const s = await stat(t);
  if (s.isDirectory()) {
    const files = (await readdir(t)).filter((f) => f.toLowerCase().endsWith(".pdf")).sort();
    return Promise.all(
      files.map(async (f) => ({
        label: f,
        bytes: new Uint8Array(await readFile(join(t, f))),
        sourceUrl: null,
      })),
    );
  }
  return [
    {
      label: basename(t),
      bytes: new Uint8Array(await readFile(t)),
      sourceUrl: opts["source-url"] ?? null,
    },
  ];
}

const manifest: Record<string, string> = opts.manifest
  ? z
      .record(z.string(), z.string().regex(ISIN_RE))
      .parse(JSON.parse(await readFile(opts.manifest, "utf8")))
  : {};

function resolveIsin(input: Input, p: ProcessedAnnex): string | null {
  if (opts.isin) return opts.isin;
  const fromManifest = manifest[input.label] ?? manifest[p.sha256];
  if (fromManifest) return fromManifest;
  const x = p.cached.extraction.isin;
  return x.value && p.verification.evidence.isin?.verified ? x.value : null;
}

const inputs = await loadInputs(target);
if (opts.isin && inputs.length > 1) {
  console.error("--isin ne s'utilise qu'avec un seul document (sinon --manifest).");
  process.exit(1);
}
const db = opts["dry-run"] ? null : serviceClient();
const summary = { ingested: 0, skipped: 0, needsReview: 0, failed: 0, noIsin: 0 };

for (const input of inputs) {
  const sha = sha256Hex(input.bytes);
  try {
    if (db) {
      const { data: existing, error } = await db
        .from("pro_fund_documents")
        .select("id, isin")
        .eq("sha256", sha)
        .maybeSingle();
      if (error) throw error;
      if (existing) {
        console.log(`= ${input.label} : déjà ingéré (${existing.isin}), ignoré`);
        summary.skipped++;
        continue;
      }
    }

    const p = await processAnnex(input.bytes, { label: input.label });
    const x = p.cached.extraction;
    const isin = resolveIsin(input, p);
    console.log(
      `${p.verification.status === "auto" ? "✓" : "?"} ${input.label} — ${x.fund_name.value ?? "(sans nom)"} ` +
        `art. ${x.sfdr_article.value ?? "?"} — ${p.verification.status} — modèle ${p.cached.model}`,
    );
    for (const r of p.verification.reviewReasons) console.log(`    · ${r}`);

    if (!isin) {
      console.log("    ✗ ISIN inconnu : relancer avec --isin ou --manifest. Rien n'est écrit.");
      summary.noIsin++;
      continue;
    }
    if (!db) continue;

    const storagePath = `${isin}/${sha}.pdf`;
    const up = await db.storage
      .from(ANNEX_BUCKET)
      .upload(storagePath, input.bytes, { contentType: "application/pdf", upsert: false });
    if (up.error && !/exists/i.test(up.error.message)) throw up.error;

    const fund = await db.from("pro_funds").upsert(
      {
        isin,
        name: x.fund_name.value ?? isin,
        management_company: x.management_company.value,
        sfdr_article: x.sfdr_article.value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "isin" },
    );
    if (fund.error) throw fund.error;

    const doc = await db
      .from("pro_fund_documents")
      .insert({
        isin,
        doc_type: "sfdr_precontractual",
        language: x.language,
        source_url: input.sourceUrl,
        storage_path: storagePath,
        sha256: sha,
        doc_date: x.doc_date.value,
      })
      .select("id")
      .single();
    if (doc.error) throw doc.error;

    const row = sustainabilityRow({
      documentId: z.string().uuid().parse(doc.data.id),
      isin,
      extraction: x,
      verification: p.verification,
      model: p.cached.model,
      version: EXTRACTION_VERSION,
    });
    const ins = await db.from("pro_fund_sustainability_data").insert(row);
    if (ins.error) throw ins.error;

    summary.ingested++;
    if (row.status === "needs_review") summary.needsReview++;
  } catch (e) {
    summary.failed++;
    console.error(`✗ ${input.label} : ${e instanceof Error ? e.message : String(e)}`);
  }
}

console.log(
  `\n${summary.ingested} ingéré(s) dont ${summary.needsReview} à revoir · ${summary.skipped} déjà présent(s) · ` +
    `${summary.noIsin} sans ISIN · ${summary.failed} échec(s)`,
);
if (summary.failed > 0) process.exit(1);
