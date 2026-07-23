#!/usr/bin/env bun
/**
 * Ingestion batch des données MSCI ESG depuis les fiches produit iShares/BlackRock.
 *
 * À exécuter dans un environnement disposant de `pdftotext` (poppler-utils) —
 * PAS dans le sandbox Claude (qui ne l'a pas). Chaque fiche est téléchargée,
 * convertie en texte, puis parsée par `parseISharesFactSheet` (testé). Le script
 * NE PRODUIT que ce qu'il lit réellement — aucune valeur inventée (§1.2).
 *
 * Usage :
 *   bun run scripts/ingest-issuer-esg.ts            # tableau + payload JSON
 *   bun run scripts/ingest-issuer-esg.ts --sql      # + UPDATE SQL prêts à coller
 *
 * Sortie : un payload { rows: [...] } à envoyer à la server function admin
 * `ingestIssuerEsgData` (provenance imposée), et/ou des UPDATE SQL de repli.
 * Les fonds en 404 ou sans section durabilité sont listés pour suivi manuel.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseISharesFactSheet, type ParsedFundEsg } from "../src/lib/esg/factsheet-parser";

const SOURCE = "MSCI ESG Fund Ratings (iShares fact sheet)";
const BASE = "https://www.ishares.com/us/literature/fact-sheet";

// Fiches produit iShares (US). ✓ = URL confirmée dans la session d'audit.
// Les autres sont des candidates : slug best-effort, le script signale les 404
// sans planter (ajuster le slug au vrai nom courant du fonds si besoin).
const FUNDS: { ticker: string; slug: string; confirmed?: boolean }[] = [
  { ticker: "ESGU", slug: "esgu-ishares-esg-aware-msci-usa-etf", confirmed: true },
  { ticker: "ESGD", slug: "esgd-ishares-esg-aware-msci-eafe-etf", confirmed: true },
  { ticker: "ESGE", slug: "esge-ishares-esg-aware-msci-em-etf", confirmed: true },
  { ticker: "DSI", slug: "dsi-ishares-esg-msci-kld-400-etf" },
  { ticker: "SUSA", slug: "susa-ishares-esg-optimized-msci-usa-etf" },
  { ticker: "MPCT", slug: "mpct-ishares-msci-global-sustainable-development-goals-etf" },
  { ticker: "ICLN", slug: "icln-ishares-global-clean-energy-etf" },
  { ticker: "CRBN", slug: "crbn-ishares-msci-acwi-low-carbon-target-etf" },
];

function ensurePdftotext(): void {
  try {
    execFileSync("pdftotext", ["-v"], { stdio: "ignore" });
  } catch {
    console.error(
      "❌ `pdftotext` introuvable. Installe poppler-utils :\n" +
        "   Debian/Ubuntu : apt-get install -y poppler-utils\n" +
        "   macOS         : brew install poppler",
    );
    process.exit(1);
  }
}

async function fetchPdf(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1024) return false;
    writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

function pdfToText(path: string): string {
  return execFileSync("pdftotext", ["-layout", "-nopgbrk", path, "-"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

/** Construit une ligne d'ingestion à partir d'un parse (champs non-null only). */
function toRow(ticker: string, p: ParsedFundEsg): Record<string, unknown> | null {
  if (p.asOf == null || (p.qualityScore == null && p.waci == null)) return null;
  const row: Record<string, unknown> = { ticker, esg_score_source: SOURCE, esg_data_asof: p.asOf };
  if (p.esgScore != null) row.esg_score = p.esgScore;
  if (p.qualityScore != null) row.msci_esg_quality_score = p.qualityScore;
  if (p.waci != null) row.waci_tco2e_per_musd_sales = p.waci;
  if (p.impliedTempRise != null) row.implied_temp_rise = p.impliedTempRise;
  return row;
}

function toSql(row: Record<string, unknown>): string {
  const sets: string[] = [];
  for (const [k, v] of Object.entries(row)) {
    if (k === "ticker") continue;
    sets.push(`${k} = ${typeof v === "number" ? v : `'${String(v).replace(/'/g, "''")}'`}`);
  }
  return `UPDATE public.assets SET ${sets.join(", ")} WHERE ticker = '${row.ticker}';`;
}

async function main(): Promise<void> {
  ensurePdftotext();
  const emitSql = process.argv.includes("--sql");
  const rows: Record<string, unknown>[] = [];
  const skipped: string[] = [];

  for (const f of FUNDS) {
    const url = `${BASE}/${f.slug}-fund-fact-sheet-en-us.pdf`;
    const dest = join(tmpdir(), `seedow-${f.ticker}.pdf`);
    const okDl = await fetchPdf(url, dest);
    if (!okDl) {
      skipped.push(`${f.ticker} (404/URL — ${f.slug})`);
      continue;
    }
    let parsed: ParsedFundEsg;
    try {
      parsed = parseISharesFactSheet(pdfToText(dest));
    } catch (e) {
      skipped.push(`${f.ticker} (pdftotext: ${(e as Error).message})`);
      continue;
    }
    const row = toRow(f.ticker, parsed);
    if (!row) {
      skipped.push(`${f.ticker} (pas de section durabilité exploitable)`);
      continue;
    }
    rows.push(row);
    console.error(
      `✓ ${f.ticker}: ESG ${parsed.msciRating ?? "?"} · ${parsed.qualityScore ?? "?"}/10 · WACI ${parsed.waci ?? "?"} · as of ${parsed.asOf}`,
    );
  }

  console.error(`\n${rows.length} fonds parsés, ${skipped.length} ignorés.`);
  if (skipped.length) console.error("Ignorés :\n  - " + skipped.join("\n  - "));

  // stdout = payload JSON (redirigeable), stderr = logs.
  console.log(JSON.stringify({ rows }, null, 2));
  if (emitSql) {
    console.error("\n-- SQL de repli --");
    for (const r of rows) console.error(toSql(r));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
