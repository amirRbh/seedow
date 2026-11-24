/**
 * Génère le rapport d'exemple à 5 fonds (`fixtures/report/sample-5-funds.json`)
 * dans `fixtures/report/sample-report.pdf`.
 *
 *   bun run scripts/pro/sample-report.ts
 *
 * Garde-fou : chaque citation de l'exemple est d'abord vérifiée contre le texte
 * de la page citée dans le PDF de l'annexe (fixtures/annexes). Une seule
 * citation introuvable → arrêt, rien n'est généré.
 */
import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { PAI_CATEGORIES } from "../../src/lib/pro/extraction/schema";
import { quoteInText } from "../../src/lib/pro/extraction/verify";
import { computeReport, sha256Hex } from "../../src/lib/pro/report/model";
import { VERDICT_LABELS, renderReportPdf } from "../../src/lib/pro/report/pdf";
import { loadReportFonts } from "./lib/fonts";
import { pdfPagesText } from "./lib/pdf-text";

const IN = "fixtures/report/sample-5-funds.json";
const OUT = "fixtures/report/sample-report.pdf";

const pct = z.number().min(0).max(100).nullable();
const sampleSchema = z.object({
  report_id: z.string(),
  created_at: z.string(),
  example: z.boolean(),
  cabinet: z.unknown(),
  profile: z.unknown(),
  funds: z.array(
    z.object({
      fixture: z.string(),
      isin: z.string(),
      name: z.string(),
      sfdr_article: z.union([z.literal(6), z.literal(8), z.literal(9)]).nullable(),
      doc_date: z.string().nullable(),
      language: z.enum(["fr", "en"]),
      source_url: z.string().url(),
      status: z.enum(["auto", "needs_review", "validated"]),
      values: z.object({
        min_sustainable_pct: pct,
        min_taxonomy_pct: pct,
        min_taxonomy_pct_excl_sovereign: pct,
        min_es_aligned_pct: pct,
        considers_pai: z.boolean().nullable(),
        pai_categories: z.array(z.enum(PAI_CATEGORIES)),
      }),
      evidence: z.record(
        z.string(),
        z.object({ page: z.number().int().min(1), quote: z.string() }),
      ),
    }),
  ),
});

const sample = sampleSchema.parse(JSON.parse(await readFile(IN, "utf8")));

let failures = 0;
const funds = [];
for (const f of sample.funds) {
  const bytes = new Uint8Array(await readFile(`fixtures/annexes/${f.fixture}`));
  const pages = await pdfPagesText(bytes);
  for (const [field, e] of Object.entries(f.evidence)) {
    if (!quoteInText(e.quote, pages[e.page - 1] ?? "")) {
      failures++;
      console.error(`✗ ${f.fixture} · ${field} : citation absente de la p. ${e.page}`);
    }
  }
  funds.push({
    isin: f.isin,
    data: {
      isin: f.isin,
      name: f.name,
      sfdr_article: f.sfdr_article,
      doc_date: f.doc_date,
      ...f.values,
      status: f.status,
      evidence: f.evidence,
    },
    document: {
      doc_date: f.doc_date,
      language: f.language,
      source_url: f.source_url,
      sha256: await sha256Hex(bytes),
    },
    extraction: {
      model: "saisie manuelle",
      version: "exemple",
      status: f.status,
      validated_at: null,
    },
  });
}
if (failures > 0) {
  console.error(`${failures} citation(s) non vérifiée(s) : rapport non généré.`);
  process.exit(1);
}
console.log(
  `✓ ${sample.funds.reduce((n, f) => n + Object.keys(f.evidence).length, 0)} citations vérifiées`,
);

const report = await computeReport({ ...sample, funds });
const pdf = await renderReportPdf(report, await loadReportFonts());
await writeFile(OUT, pdf);

for (const r of report.results)
  console.log(
    `  ${r.isin}  ${VERDICT_LABELS[r.verdict].padEnd(12)} ${r.alerts.map((a) => a.code).join(", ")}`,
  );
console.log(`\n${OUT} — ${pdf.length} octets`);
console.log(`data_snapshot_hash ${report.data_snapshot_hash}`);
console.log(`content_hash       ${report.content_hash}`);
console.log(`pdf_sha256         ${await sha256Hex(pdf)}`);
