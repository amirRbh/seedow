#!/usr/bin/env bun
/**
 * Moisson des données MSCI ESG (WACI, score de qualité, température implicite)
 * depuis les fiches produit publiées par les émetteurs.
 *
 * Extraction texte via `pdftotext -layout` (poppler) — disponible partout, et
 * c'est le rendu pour lequel `parseISharesFactSheet` est écrit/testé.
 *
 * Ce script NE PRODUIT que ce qu'il lit réellement dans le document : un champ
 * absent reste null, une fiche introuvable est signalée. Aucune valeur n'est
 * estimée (contrat de transparence §1.2).
 *
 * Usage :
 *   bun run scripts/harvest-msci-esg.ts          # tableau + JSON
 *   bun run scripts/harvest-msci-esg.ts --sql    # + UPDATE SQL prêts à appliquer
 *
 * Portée actuelle : fiches iShares **US**. Les fiches UCITS européennes
 * (iShares UK/NL, Amundi, UBS, Xtrackers) ne publient PAS la section
 * durabilité MSCI en accès libre — vérifié le 2026-08-02, voir
 * docs/journal-sources-esg.md. Ne pas rajouter ici de fonds européen sans
 * avoir d'abord confirmé qu'un document exploitable existe.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseISharesFactSheet, type ParsedFundEsg } from "../src/lib/esg/factsheet-parser";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36";
const PROXY_CA = "/root/.ccr/ca-bundle.crt";
const SOURCE = "MSCI ESG Fund Ratings (iShares fact sheet)";
const BASE = "https://www.ishares.com/us/literature/fact-sheet";

/** Slugs CONFIRMÉS (HTTP 200 + section durabilité présente). */
const FUNDS: { ticker: string; slug: string }[] = [
  { ticker: "ESGU", slug: "esgu-ishares-esg-aware-msci-usa-etf" },
  { ticker: "ESGD", slug: "esgd-ishares-esg-aware-msci-eafe-etf" },
  { ticker: "ESGE", slug: "esge-ishares-esg-aware-msci-em-etf" },
  { ticker: "DSI", slug: "dsi-ishares-esg-msci-kld-400-etf" },
  { ticker: "SUSA", slug: "susa-ishares-esg-optimized-msci-usa-etf" },
  { ticker: "EAGG", slug: "eagg-ishares-esg-aware-u-s-aggregate-bond-etf" },
  { ticker: "SUSC", slug: "susc-ishares-esg-aware-usd-corporate-bond-etf" },
  { ticker: "SUSB", slug: "susb-ishares-esg-aware-1-5-year-usd-corporate-bond-etf" },
  { ticker: "BGRN", slug: "bgrn-ishares-usd-green-bond-etf" },
];

const workDir = mkdtempSync(join(tmpdir(), "msci-harvest-"));

function downloadPdf(url: string, dest: string): boolean {
  try {
    const args = ["-sS", "-L", "-A", UA, "-m", "60", "-o", dest, url];
    if (existsSync(PROXY_CA)) args.unshift("--cacert", PROXY_CA);
    execFileSync("curl", args);
    return readFileSync(dest).subarray(0, 4).toString() === "%PDF";
  } catch {
    return false;
  }
}

function pdfToText(pdf: string, txt: string): string | null {
  try {
    execFileSync("pdftotext", ["-layout", pdf, txt]);
    return readFileSync(txt, "utf8");
  } catch {
    return null;
  }
}

/** Ligne d'ingestion (champs non-null uniquement) ; null si rien d'exploitable. */
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
  if (row.waci_tco2e_per_musd_sales != null) {
    sets.push(`carbon_intensity_source = '${SOURCE.replace(/'/g, "''")}'`);
    sets.push(`carbon_intensity_updated_at = '${row.esg_data_asof}T00:00:00Z'`);
  }
  return `UPDATE public.assets SET ${sets.join(", ")} WHERE ticker = '${row.ticker}';`;
}

const rows: Record<string, unknown>[] = [];
const skipped: string[] = [];

for (const f of FUNDS) {
  const pdf = join(workDir, `${f.ticker}.pdf`);
  const txt = join(workDir, `${f.ticker}.txt`);
  if (!downloadPdf(`${BASE}/${f.slug}-fund-fact-sheet-en-us.pdf`, pdf)) {
    skipped.push(`${f.ticker} — fiche introuvable (${f.slug})`);
    continue;
  }
  const text = pdfToText(pdf, txt);
  if (!text) {
    skipped.push(`${f.ticker} — extraction texte impossible`);
    continue;
  }
  const parsed = parseISharesFactSheet(text);
  const row = toRow(f.ticker, parsed);
  if (!row) {
    skipped.push(`${f.ticker} — pas de section durabilité exploitable`);
    continue;
  }
  rows.push(row);
  console.log(
    `${f.ticker.padEnd(6)} WACI=${String(parsed.waci ?? "—").padStart(8)}  ` +
      `qualité=${String(parsed.qualityScore ?? "—").padStart(5)}  ` +
      `note=${(parsed.msciRating ?? "—").padEnd(4)} ITR=${(parsed.impliedTempRise ?? "—").padEnd(11)} au ${parsed.asOf}`,
  );
}

console.log(`\n${rows.length} fonds moissonnés, ${skipped.length} ignorés`);
for (const s of skipped) console.log(`  · ${s}`);

if (process.argv.includes("--sql")) {
  console.log("\n-- SQL\n" + rows.map(toSql).join("\n"));
} else {
  console.log("\n" + JSON.stringify({ rows }, null, 2));
}
