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
 *   bun run scripts/pro/ingest.ts --inbox [--dry-run]
 *     traite les dépôts faits depuis /pro/fonds (`pro-annexes/inbox/<uid>/<ISIN>__….pdf`),
 *     puis les range dans `processed/<uid>/` ou `failed/<uid>/`.
 *
 * L'ISIN figure rarement dans une annexe : il vient de --isin, du manifeste,
 * ou à défaut du document (citation vérifiée). Sans ISIN, rien n'est écrit.
 *
 * Env : ANTHROPIC_API_KEY, EXTRACTION_MODEL (défaut claude-opus-5-5),
 *       EXTRACTION_MAX_COST_USD (plafond du run, défaut 10 $),
 *       SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 *
 * Une erreur de compte (clé refusée, plafond atteint, limite de débit) arrête le
 * run ; une erreur propre à un document n'arrête que ce document.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { parseInboxFileName } from "../../src/lib/pro/app/isin";
import { EXTRACTION_VERSION } from "../../src/lib/pro/extraction/prompt";
import { sustainabilityRow } from "../../src/lib/pro/extraction/to-row";
import { formatUsd } from "../../src/lib/pro/extraction/cost";
import { FatalExtractionError, runBudget } from "./lib/anthropic-extract";
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
    inbox: { type: "boolean", default: false },
  },
});

const target = positionals[0];
if (!target && !opts.inbox) {
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
  /** ISIN imposé (dépôt depuis l'interface). */
  isin?: string;
  /** Chemin du dépôt à ranger après traitement. */
  inbox?: { uid: string; name: string };
}

async function loadInbox(): Promise<Input[]> {
  const db = serviceClient();
  const inputs: Input[] = [];
  const { data: users, error } = await db.storage.from(ANNEX_BUCKET).list("inbox", { limit: 1000 });
  if (error) throw error;
  for (const u of users ?? []) {
    if (!/^[0-9a-f-]{36}$/.test(u.name)) continue;
    const { data: files, error: e2 } = await db.storage
      .from(ANNEX_BUCKET)
      .list(`inbox/${u.name}`, { limit: 1000 });
    if (e2) throw e2;
    for (const f of files ?? []) {
      const isin = parseInboxFileName(f.name);
      const dl = await db.storage.from(ANNEX_BUCKET).download(`inbox/${u.name}/${f.name}`);
      if (dl.error) throw dl.error;
      inputs.push({
        label: `inbox/${u.name}/${f.name}`,
        bytes: new Uint8Array(await dl.data.arrayBuffer()),
        sourceUrl: null,
        isin: isin ?? undefined,
        inbox: { uid: u.name, name: f.name },
      });
    }
  }
  return inputs;
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

/**
 * Manifeste : `{"<fichier ou sha256>": "<ISIN>"}`, ou la forme produite par
 * `build-fund-base.ts`, qui garde l'origine d'une annexe isolée d'un prospectus.
 */
const manifestEntry = z.union([
  z.string().regex(ISIN_RE),
  z.object({
    isin: z.string().regex(ISIN_RE),
    source_url: z.string().url(),
    source_sha256: z.string().regex(/^[0-9a-f]{64}$/),
    source_page_start: z.number().int().min(1),
    source_page_end: z.number().int().min(1),
  }),
]);
type ManifestEntry = z.infer<typeof manifestEntry>;
const manifest: Record<string, ManifestEntry> = opts.manifest
  ? z.record(z.string(), manifestEntry).parse(JSON.parse(await readFile(opts.manifest, "utf8")))
  : {};
const entryIsin = (e: ManifestEntry | undefined) => (typeof e === "string" ? e : e?.isin);
const entryOrigin = (e: ManifestEntry | undefined) => (e && typeof e === "object" ? e : null);

function resolveIsin(input: Input, p: ProcessedAnnex): string | null {
  if (input.isin) return input.isin;
  if (opts.isin) return opts.isin;
  const fromManifest = entryIsin(manifest[input.label] ?? manifest[p.sha256]);
  if (fromManifest) return fromManifest;
  const x = p.cached.extraction.isin;
  return x.value && p.verification.evidence.isin?.verified ? x.value : null;
}

const inputs = opts.inbox ? await loadInbox() : await loadInputs(target!);
if (opts.isin && inputs.length > 1) {
  console.error("--isin ne s'utilise qu'avec un seul document (sinon --manifest).");
  process.exit(1);
}
const db = opts["dry-run"] ? null : serviceClient();
const summary = { ingested: 0, skipped: 0, needsReview: 0, failed: 0, noIsin: 0 };
const budget = runBudget();
let fatal: string | null = null;

/** Range un dépôt de l'inbox après traitement (hors --dry-run). */
async function fileAway(input: Input, ok: boolean): Promise<void> {
  if (!db || !input.inbox) return;
  const from = `inbox/${input.inbox.uid}/${input.inbox.name}`;
  const to = `${ok ? "processed" : "failed"}/${input.inbox.uid}/${input.inbox.name}`;
  const { error } = await db.storage.from(ANNEX_BUCKET).move(from, to);
  if (error) console.error(`  ✗ rangement de ${from} : ${error.message}`);
}

for (const input of inputs) {
  const sha = sha256Hex(input.bytes);
  let ok = false;
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
        await fileAway(input, true);
        continue;
      }
    }

    const p = await processAnnex(input.bytes, { label: input.label, budget });
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
      await fileAway(input, false);
      continue;
    }
    if (!db) continue;

    const storagePath = `${isin}/${sha}.pdf`;
    const up = await db.storage
      .from(ANNEX_BUCKET)
      .upload(storagePath, input.bytes, { contentType: "application/pdf", upsert: false });
    if (up.error && !/exists/i.test(up.error.message)) throw up.error;

    // L'identité GECO (source primaire) n'est jamais écrasée par celle de
    // l'annexe, qui ne nomme presque jamais la société de gestion. L'annexe ne
    // complète que l'article SFDR, et seulement si sa citation est vérifiée.
    const existing = await db
      .from("pro_funds")
      .select("isin, identity_source")
      .eq("isin", isin)
      .maybeSingle();
    if (existing.error) throw existing.error;
    const articleVerified = p.verification.evidence.sfdr_article?.verified === true;
    const now = new Date().toISOString();
    const fund = existing.data
      ? await db
          .from("pro_funds")
          .update({
            ...(articleVerified ? { sfdr_article: x.sfdr_article.value } : {}),
            updated_at: now,
          })
          .eq("isin", isin)
      : await db.from("pro_funds").insert({
          isin,
          name: x.fund_name.value ?? isin,
          management_company: x.management_company.value,
          sfdr_article: articleVerified ? x.sfdr_article.value : null,
          identity_source: "annex",
          identity_retrieved_at: now,
          updated_at: now,
        });
    if (fund.error) throw fund.error;
    const origin = entryOrigin(manifest[input.label] ?? manifest[p.sha256]);

    const doc = await db
      .from("pro_fund_documents")
      .insert({
        isin,
        doc_type: "sfdr_precontractual",
        language: x.language,
        source_url: origin?.source_url ?? input.sourceUrl,
        storage_path: storagePath,
        sha256: sha,
        doc_date: x.doc_date.value,
        source_sha256: origin?.source_sha256 ?? null,
        source_page_start: origin?.source_page_start ?? null,
        source_page_end: origin?.source_page_end ?? null,
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
    ok = true;
  } catch (e) {
    if (e instanceof FatalExtractionError) {
      // Le document n'est pas en cause : il reste dans l'inbox pour le prochain run.
      fatal = e.message;
      console.error(`■ arrêt du run : ${e.message}`);
      break;
    }
    summary.failed++;
    console.error(`✗ ${input.label} : ${e instanceof Error ? e.message : String(e)}`);
  }
  if (input.inbox) await fileAway(input, ok);
}

console.log(
  `\n${summary.ingested} ingéré(s) dont ${summary.needsReview} à revoir · ${summary.skipped} déjà présent(s) · ` +
    `${summary.noIsin} sans ISIN · ${summary.failed} échec(s)\n` +
    `${budget.callCount} appel(s) modèle · ${formatUsd(budget.spentUsd)} sur un plafond de ${formatUsd(budget.limitUsd)}`,
);
if (fatal || summary.failed > 0) process.exit(1);
