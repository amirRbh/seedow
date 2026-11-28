/**
 * Évalue l'extraction sur les annexes de référence (`fixtures/annexes/*.pdf`)
 * contre l'attendu saisi à la main (`fixtures/annexes/expected.json`).
 *
 *   bun run scripts/pro/eval-fixtures.ts             # extrait ce qui n'est pas en cache
 *   bun run scripts/pro/eval-fixtures.ts --refresh   # ré-extrait tout (appels payants)
 *   bun run scripts/pro/eval-fixtures.ts --cached    # cache seul, aucun appel
 *
 * La sortie brute du modèle est mise en cache dans
 * `fixtures/annexes/extractions/<fichier>.json` (versionnée : le test vitest
 * rejoue la vérification et la notation sans appel réseau). Le cache est
 * invalidé si le PDF ou la version du prompt change.
 *
 * Écrit aussi `fixtures/annexes/extractions/REPORT.md` et `report.json`.
 *
 * Env : ANTHROPIC_API_KEY, EXTRACTION_MODEL (défaut claude-opus-5-5),
 *       EXTRACTION_MAX_COST_USD (plafond du run, défaut 10 $).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  expectedFileSchema,
  formatAccuracy,
  formatIdentity,
  scoreExtractions,
  scoreIdentity,
  type IdentityValues,
} from "../../src/lib/pro/extraction/accuracy";
import { formatUsd } from "../../src/lib/pro/extraction/cost";
import { EXTRACTION_VERSION } from "../../src/lib/pro/extraction/prompt";
import {
  sustainabilityValues,
  type SustainabilityValues,
} from "../../src/lib/pro/extraction/to-row";
import { FatalExtractionError, runBudget } from "./lib/anthropic-extract";
import { processAnnex, type CachedExtraction } from "./lib/process-annex";

const DIR = "fixtures/annexes";
const CACHE = join(DIR, "extractions");

const { values: opts } = parseArgs({
  options: {
    refresh: { type: "boolean", default: false },
    cached: { type: "boolean", default: false },
  },
});

const expected = expectedFileSchema.parse(
  JSON.parse(await readFile(join(DIR, "expected.json"), "utf8")),
);
await mkdir(CACHE, { recursive: true });

async function readCache(name: string): Promise<CachedExtraction | null> {
  try {
    return JSON.parse(await readFile(join(CACHE, `${name}.json`), "utf8")) as CachedExtraction;
  } catch {
    return null;
  }
}

const actual: Record<string, SustainabilityValues> = {};
const identity: Record<string, IdentityValues> = {};
const review: { name: string; reasons: string[] }[] = [];
const failures: { name: string; error: string }[] = [];
const costs = { input: 0, output: 0, calls: 0, usd: 0 };
const budget = opts.cached ? null : runBudget();
let fatal: string | null = null;

for (const name of Object.keys(expected.fixtures)) {
  const bytes = new Uint8Array(await readFile(join(DIR, name)));
  const cache = opts.refresh ? null : await readCache(name);
  if (opts.cached && !cache) {
    console.log(`∅ ${name} : pas d'extraction en cache`);
    continue;
  }
  try {
    const p = await processAnnex(bytes, { label: name, cache, budget: budget ?? undefined });
    if (p.cached !== cache) {
      costs.calls++;
      costs.input += p.cached.usage.input_tokens;
      costs.output += p.cached.usage.output_tokens;
      costs.usd += p.cached.cost_usd ?? 0;
      await writeFile(join(CACHE, `${name}.json`), JSON.stringify(p.cached, null, 2) + "\n");
    }
    actual[name] = sustainabilityValues(p.cached.extraction, p.verification);
    const x = p.cached.extraction;
    identity[name] = {
      fund_name: x.fund_name.value,
      isin: x.isin.value,
      lei: x.lei.value,
      management_company: x.management_company.value,
    };
    if (p.verification.status === "needs_review") {
      review.push({ name, reasons: p.verification.reviewReasons });
    }
    console.log(`${p.verification.status === "auto" ? "✓" : "?"} ${name} (${p.cached.model})`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (e instanceof FatalExtractionError) {
      fatal = msg;
      console.error(`■ arrêt : ${msg}`);
      break;
    }
    failures.push({ name, error: msg });
    console.error(`✗ ${name} : ${msg}`);
  }
}

const report = scoreExtractions(expected.fixtures, actual);
const idReport = scoreIdentity(expected.fixtures, identity);
const table = formatAccuracy(report);
const idTable = formatIdentity(idReport);
const mismatchLines = report.mismatches.map(
  (m) =>
    `- ${m.fixture} · ${m.field} : attendu ${JSON.stringify(m.expected)}, obtenu ${JSON.stringify(m.actual)}`,
);
const reviewLines = review.flatMap((r) => [`- ${r.name}`, ...r.reasons.map((x) => `  - ${x}`)]);

console.log(`\n${table}\n\n${idTable}\n`);
for (const m of idReport.mismatches) {
  console.log(
    `- ${m.fixture} · ${m.field} : attendu ${JSON.stringify(m.expected)}, obtenu ${JSON.stringify(m.actual)}`,
  );
}
console.log(mismatchLines.length ? `Écarts :\n${mismatchLines.join("\n")}` : "Aucun écart.");
console.log(
  `\nneeds_review (${review.length}/${Object.keys(expected.fixtures).length}) :\n${reviewLines.join("\n")}`,
);
if (costs.calls) {
  console.log(
    `\n${costs.calls} appel(s) modèle · ${costs.input} tokens entrée · ${costs.output} tokens sortie · ${formatUsd(costs.usd)}`,
  );
}

await writeFile(
  join(CACHE, "REPORT.md"),
  [
    `# Précision de l'extraction (${EXTRACTION_VERSION})`,
    "",
    "```",
    table,
    "```",
    "",
    "```",
    idTable,
    "```",
    "",
    "## Écarts",
    "",
    ...(mismatchLines.length ? mismatchLines : ["Aucun."]),
    ...idReport.mismatches.map(
      (m) =>
        `- ${m.fixture} · ${m.field} : attendu ${JSON.stringify(m.expected)}, obtenu ${JSON.stringify(m.actual)}`,
    ),
    "",
    `## Échecs (${failures.length})`,
    "",
    ...(failures.length ? failures.map((f) => `- ${f.name} : ${f.error}`) : ["Aucun."]),
    "",
    `## needs_review (${review.length})`,
    "",
    ...(reviewLines.length ? reviewLines : ["Aucun."]),
    "",
  ].join("\n"),
);

await writeFile(
  join(CACHE, "report.json"),
  JSON.stringify(
    {
      extraction_version: EXTRACTION_VERSION,
      evaluated: Object.keys(actual).length,
      fixtures: Object.keys(expected.fixtures).length,
      sustainability: report,
      identity: idReport,
      review,
      failures,
      fatal,
      costs,
    },
    null,
    2,
  ) + "\n",
);
if (fatal) process.exit(2);
