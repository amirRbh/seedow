/**
 * Revue humaine des extractions `needs_review` (et, avec --all, `auto`).
 *
 *   REVIEWER_USER_ID=<uuid auth.users> bun run scripts/pro/review.ts [--isin FR…] [--all]
 *
 * Pour chaque extraction : valeur, page, citation, statut de vérification et
 * raison de la mise en revue, champ par champ. Commandes :
 *   v                     valider telle quelle (status → validated)
 *   c <champ> <valeur>    corriger un champ (null accepté) ; demande page et
 *                         citation, vérifiées contre le texte du PDF archivé
 *   s                     passer      q   quitter
 *
 * Une correction conserve l'ancienne valeur dans la preuve (`previous_value`)
 * et la marque `corrected_in_review`. La validation enregistre qui et quand.
 *
 * Env : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, REVIEWER_USER_ID.
 */
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { z } from "zod";
import {
  FOSSIL_GAS_NUCLEAR,
  PAI_CATEGORIES,
  PCT_FIELDS,
} from "../../src/lib/pro/extraction/schema";
import {
  MIN_QUOTE_CHARS,
  normalizeForMatch,
  numbersIn,
  quoteInText,
} from "../../src/lib/pro/extraction/verify";
import { pdfPagesText } from "./lib/pdf-text";
import { ANNEX_BUCKET, serviceClient } from "./lib/supabase";

const { values: opts } = parseArgs({
  options: { isin: { type: "string" }, all: { type: "boolean", default: false } },
});
const reviewer = z
  .string()
  .uuid({ message: "REVIEWER_USER_ID doit être l'uuid d'un utilisateur Supabase" })
  .parse(process.env.REVIEWER_USER_ID);

const db = serviceClient();
const rl = createInterface({ input: process.stdin, output: process.stdout });

const rowSchema = z
  .object({
    id: z.string().uuid(),
    isin: z.string(),
    document_id: z.string().uuid(),
    status: z.enum(["auto", "needs_review", "validated"]),
    evidence: z.record(z.string(), z.unknown()),
    extraction_model: z.string(),
    extraction_version: z.string(),
    pai_categories: z.array(z.string()),
  })
  .passthrough();

const EDITABLE = [
  ...PCT_FIELDS,
  "considers_pai",
  "pai_categories",
  "fossil_gas_nuclear",
  "benchmark_exclusions",
] as const;
type Editable = (typeof EDITABLE)[number];

function parseValue(field: Editable, raw: string): unknown {
  if (raw === "null") return null;
  if ((PCT_FIELDS as readonly string[]).includes(field)) {
    return z.coerce.number().min(0).max(100).parse(raw.replace(",", "."));
  }
  if (field === "considers_pai") return z.enum(["true", "false"]).parse(raw) === "true";
  if (field === "fossil_gas_nuclear") return z.enum(FOSSIL_GAS_NUCLEAR).parse(raw);
  if (field === "benchmark_exclusions") return z.enum(["pab", "ctb", "not_stated"]).parse(raw);
  return z.array(z.enum(PAI_CATEGORIES)).parse(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

let query = db
  .from("pro_fund_sustainability_data")
  .select("*, pro_fund_documents(storage_path, doc_date, source_url), pro_funds(name)")
  .order("created_at");
query = opts.all ? query.neq("status", "validated") : query.eq("status", "needs_review");
if (opts.isin) query = query.eq("isin", opts.isin);
const { data, error } = await query;
if (error) throw error;
console.log(`${data.length} extraction(s) à revoir.\n`);

const pdfCache = new Map<string, string[]>();
async function pagesOf(storagePath: string): Promise<string[]> {
  const hit = pdfCache.get(storagePath);
  if (hit) return hit;
  const dl = await db.storage.from(ANNEX_BUCKET).download(storagePath);
  if (dl.error) throw dl.error;
  const pages = await pdfPagesText(new Uint8Array(await dl.data.arrayBuffer()));
  pdfCache.set(storagePath, pages);
  return pages;
}

for (const raw of data) {
  const row = rowSchema.parse(raw);
  const doc = z
    .object({
      storage_path: z.string(),
      doc_date: z.string().nullable(),
      source_url: z.string().nullable(),
    })
    .parse((raw as Record<string, unknown>).pro_fund_documents);
  const fundName = z
    .object({ name: z.string() })
    .parse((raw as Record<string, unknown>).pro_funds).name;
  const evidence = { ...row.evidence };
  const updates: Record<string, unknown> = {};

  const show = () => {
    console.log(
      `\n━━ ${row.isin} — ${fundName} — document du ${doc.doc_date ?? "?"} — ${row.status}`,
    );
    console.log(
      `   ${doc.source_url ?? doc.storage_path} · ${row.extraction_model} · ${row.extraction_version}`,
    );
    for (const f of EDITABLE) {
      const value = f in updates ? updates[f] : (raw as Record<string, unknown>)[f];
      const ev = evidence[f] as Record<string, unknown> | undefined;
      const mark = !ev ? " " : ev.verified ? "✓" : "✗";
      console.log(`   ${mark} ${f.padEnd(32)} = ${JSON.stringify(value)}`);
      if (ev) {
        console.log(`       p.${ev.page} « ${String(ev.quote ?? "").slice(0, 220)} »`);
        if (ev.issue) console.log(`       ⚠ ${ev.issue}`);
        if (ev.note) console.log(`       ℹ ${ev.note}`);
      }
    }
    const reasons = evidence._review_reasons;
    if (Array.isArray(reasons)) console.log(`   Raisons : ${reasons.join(" | ")}`);
  };
  show();

  for (;;) {
    const cmd = (
      await rl.question("[v]alider · [c]orriger <champ> <valeur> · [s]auter · [q]uitter > ")
    ).trim();
    if (cmd === "q") {
      rl.close();
      process.exit(0);
    }
    if (cmd === "s") break;
    if (cmd === "v") {
      const { error: e } = await db
        .from("pro_fund_sustainability_data")
        .update({
          ...updates,
          evidence,
          status: "validated",
          validated_by: reviewer,
          validated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (e) console.error(`✗ ${e.message}`);
      else console.log("✓ validé");
      break;
    }
    const m = /^c\s+(\S+)\s+(.+)$/.exec(cmd);
    if (!m || !(EDITABLE as readonly string[]).includes(m[1])) {
      console.log(`Champs corrigeables : ${EDITABLE.join(", ")}`);
      continue;
    }
    const field = m[1] as Editable;
    let value: unknown;
    try {
      value = parseValue(field, m[2].trim());
    } catch {
      console.log("Valeur invalide.");
      continue;
    }
    const prev = f_value(raw, updates, field);
    if (value === null) {
      updates[field] = field === "pai_categories" ? [] : null;
      evidence[field] = {
        page: null,
        quote: null,
        verified: true,
        corrected_in_review: true,
        previous_value: prev,
      };
      show();
      continue;
    }
    const page = Number(await rl.question("   page (index physique du PDF) : "));
    const quote = (await rl.question("   citation verbatim : ")).trim();
    const pages = await pagesOf(doc.storage_path);
    const okPage = Number.isInteger(page) && page >= 1 && page <= pages.length;
    const verified =
      okPage &&
      normalizeForMatch(quote).length >= MIN_QUOTE_CHARS &&
      quoteInText(quote, pages[page - 1]);
    if (!verified) {
      console.log(
        "✗ citation introuvable sur cette page : correction refusée (une preuve doit être vérifiable).",
      );
      continue;
    }
    if (typeof value === "number" && !numbersIn(quote).some((n) => Math.abs(n - value) < 1e-9)) {
      console.log(`✗ la citation ne contient pas ${value} : correction refusée.`);
      continue;
    }
    updates[field] = value;
    evidence[field] = {
      page,
      quote,
      verified: true,
      corrected_in_review: true,
      previous_value: prev,
    };
    show();
  }
}
rl.close();

function f_value(rawRow: unknown, upd: Record<string, unknown>, field: string): unknown {
  return field in upd ? upd[field] : (rawRow as Record<string, unknown>)[field];
}
