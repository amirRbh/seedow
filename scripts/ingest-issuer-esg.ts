#!/usr/bin/env bun
/**
 * Ingestion batch des données MSCI ESG depuis les fiches produit iShares/BlackRock.
 *
 * Extraction PDF via `unpdf` (pur-JS, sans dépendance native — fonctionne dans
 * le sandbox Claude, contrairement à `pdftotext`). Setup une fois :
 *   bun add -d unpdf
 * Chaque fiche est téléchargée, extraite en texte, puis parsée par
 * `parseISharesFactSheet` (testé). Le script NE PRODUIT que ce qu'il lit
 * réellement — aucune valeur inventée (§1.2).
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
import { existsSync } from "node:fs";
import { parseISharesFactSheet, type ParsedFundEsg } from "../src/lib/esg/factsheet-parser";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36";
// CA du proxy agent (sandbox) : requis pour valider TLS derrière le proxy. En
// env normal ce fichier n'existe pas → curl utilise le CA système.
const PROXY_CA = "/root/.ccr/ca-bundle.crt";

const SOURCE = "MSCI ESG Fund Ratings (iShares fact sheet)";
const BASE = "https://www.ishares.com/us/literature/fact-sheet";

// Fiches produit iShares (US) — slugs CONFIRMÉS (URL résolue en 200). Ajoute
// d'autres fonds iShares US ici ; le script signale les 404 sans planter.
const FUNDS: { ticker: string; slug: string }[] = [
  { ticker: "ESGU", slug: "esgu-ishares-esg-aware-msci-usa-etf" },
  { ticker: "ESGD", slug: "esgd-ishares-esg-aware-msci-eafe-etf" },
  { ticker: "ESGE", slug: "esge-ishares-esg-aware-msci-em-etf" },
  { ticker: "DSI", slug: "dsi-ishares-esg-msci-kld-400-etf" },
  { ticker: "SUSL", slug: "susl-ishares-esg-msci-usa-leaders-etf" },
  { ticker: "ICLN", slug: "icln-ishares-global-clean-energy-etf" },
  { ticker: "SUSC", slug: "susc-ishares-esg-aware-usd-corporate-bond-etf" },
  { ticker: "SUSB", slug: "susb-ishares-esg-aware-1-5-year-usd-corporate-bond-etf" },
  { ticker: "BGRN", slug: "bgrn-ishares-usd-green-bond-etf" },
];

/** Extraction texte via unpdf (import dynamique : setup `bun add -d unpdf`). */
async function pdfBufferToText(buf: Uint8Array): Promise<string> {
  let unpdf: typeof import("unpdf");
  try {
    unpdf = await import("unpdf");
  } catch {
    console.error("❌ `unpdf` introuvable. Setup : bun add -d unpdf");
    process.exit(1);
  }
  const pdf = await unpdf.getDocumentProxy(buf);
  const { text } = await unpdf.extractText(pdf, { mergePages: true });
  return text;
}

// Téléchargement via curl (respecte $HTTPS_PROXY + CA du proxy ; iShares renvoie
// 404 sans User-Agent navigateur). Plus robuste que fetch() derrière un proxy.
function fetchPdfBuffer(url: string): Uint8Array | null {
  try {
    const args = ["-sS", "-L", "-A", UA, "-o", "-", url];
    if (existsSync(PROXY_CA)) args.unshift("--cacert", PROXY_CA);
    const buf = execFileSync("curl", args, { maxBuffer: 64 * 1024 * 1024 });
    return buf.length >= 1024 ? new Uint8Array(buf) : null;
  } catch {
    return null;
  }
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
  const emitSql = process.argv.includes("--sql");
  const rows: Record<string, unknown>[] = [];
  const skipped: string[] = [];

  for (const f of FUNDS) {
    const url = `${BASE}/${f.slug}-fund-fact-sheet-en-us.pdf`;
    const buf = fetchPdfBuffer(url);
    if (!buf) {
      skipped.push(`${f.ticker} (404/URL — ${f.slug})`);
      continue;
    }
    let parsed: ParsedFundEsg;
    try {
      parsed = parseISharesFactSheet(await pdfBufferToText(buf));
    } catch (e) {
      skipped.push(`${f.ticker} (extraction: ${(e as Error).message})`);
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
