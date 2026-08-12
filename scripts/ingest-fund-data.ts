#!/usr/bin/env bun
/**
 * Ingestion Data Engine — pipeline complet iShares → base canonique.
 *
 * Contrairement à `ingest-issuer-esg.ts` (qui n'écrit que les colonnes plates
 * de `assets`), ce script fait passer chaque fiche par le **Data Engine** :
 *
 *   factsheet → ISharesConnector.extract → Observation[] (provenance complète)
 *            → data_observations (ledger §3) + colonnes canoniques `assets` (§24)
 *
 * Il n'écrit RIEN en base directement (le sandbox n'a pas la clé service_role,
 * et l'écriture doit rester gouvernée) : il ÉMET le SQL prêt à appliquer, comme
 * les scripts existants. Brancher `persistObservations` + `supabaseObservationWriter`
 * sur un client admin est immédiat quand la clé service_role est disponible.
 *
 * On ne produit QUE ce qui est réellement lu dans le document — aucune valeur
 * inventée, chaque observation datée et sourcée (§9, §12).
 *
 * Usage :
 *   bun run scripts/ingest-fund-data.ts          # JSON des observations
 *   bun run scripts/ingest-fund-data.ts --sql    # + INSERT/UPDATE SQL
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { ISharesConnector, iSharesRawFromText } from "../src/lib/data-engine/connectors/ishares";
import { publishableObservations } from "../src/lib/data-engine/engine";
import { canonicalAssetUpdate } from "../src/lib/data-engine/persist";
import type { Observation } from "../src/lib/data-engine/connectors/types";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36";
const PROXY_CA = "/root/.ccr/ca-bundle.crt";
const BASE = "https://www.ishares.com/us/literature/fact-sheet";

/** Fiches iShares US confirmées (cf. ingest-issuer-esg.ts). ticker = clé d'`assets`. */
const FUNDS: { ticker: string; slug: string }[] = [
  { ticker: "ESGU", slug: "esgu-ishares-esg-aware-msci-usa-etf" },
  { ticker: "ESGD", slug: "esgd-ishares-esg-aware-msci-eafe-etf" },
  { ticker: "ESGE", slug: "esge-ishares-esg-aware-msci-em-etf" },
  { ticker: "DSI", slug: "dsi-ishares-esg-msci-kld-400-etf" },
  { ticker: "SUSL", slug: "susl-ishares-esg-msci-usa-leaders-etf" },
  { ticker: "EAGG", slug: "eagg-ishares-esg-aware-u-s-aggregate-bond-etf" },
  { ticker: "ICLN", slug: "icln-ishares-global-clean-energy-etf" },
  { ticker: "SUSC", slug: "susc-ishares-esg-aware-usd-corporate-bond-etf" },
  { ticker: "SUSB", slug: "susb-ishares-esg-aware-1-5-year-usd-corporate-bond-etf" },
  { ticker: "BGRN", slug: "bgrn-ishares-usd-green-bond-etf" },
];

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

function fetchPdfBuffer(url: string): Uint8Array | null {
  try {
    const args = ["-sS", "-L", "-A", UA, "-m", "60", "-o", "-", url];
    if (existsSync(PROXY_CA)) args.unshift("--cacert", PROXY_CA);
    const buf = execFileSync("curl", args, { maxBuffer: 64 * 1024 * 1024 });
    return buf.length >= 1024 ? new Uint8Array(buf) : null;
  } catch {
    return null;
  }
}

function sqlLiteral(v: unknown): string {
  if (v == null) return "NULL";
  if (typeof v === "number") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

/** INSERT d'une observation dans data_observations (asset & source par sous-requête). */
function observationInsertSql(ticker: string, o: Observation): string {
  const isNum = typeof o.value === "number" && Number.isFinite(o.value);
  const cols = [
    "asset_id",
    "field",
    "value_text",
    "value_num",
    "source_id",
    "source_url",
    "reference_date",
    "retrieved_at",
    "confidence",
    "method",
    "validation_status",
  ];
  const vals = [
    `(SELECT id FROM public.assets WHERE ticker = ${sqlLiteral(ticker)})`,
    sqlLiteral(o.field),
    isNum ? "NULL" : sqlLiteral(o.value),
    isNum ? sqlLiteral(o.value) : "NULL",
    `(SELECT id FROM public.data_sources WHERE key = ${sqlLiteral(o.sourceKey)})`,
    sqlLiteral(o.sourceUrl),
    sqlLiteral(o.referenceDate),
    sqlLiteral(o.retrievedAt),
    sqlLiteral(o.confidence),
    sqlLiteral(o.method),
    sqlLiteral(o.validation.status),
  ];
  return `INSERT INTO public.data_observations (${cols.join(", ")}) VALUES (${vals.join(", ")});`;
}

/** UPDATE des colonnes canoniques d'`assets` depuis les observations valides. */
function canonicalUpdateSql(ticker: string, observations: Observation[]): string | null {
  const update = canonicalAssetUpdate(observations);
  if (!update) return null;
  const sets = Object.entries(update).map(([k, v]) => `${k} = ${sqlLiteral(v)}`);
  return `UPDATE public.assets SET ${sets.join(", ")} WHERE ticker = ${sqlLiteral(ticker)};`;
}

async function main(): Promise<void> {
  const emitSql = process.argv.includes("--sql");
  const connector = new ISharesConnector();
  const retrievedAt = new Date().toISOString();

  const perFund: { ticker: string; observations: Observation[] }[] = [];
  const skipped: string[] = [];

  for (const f of FUNDS) {
    const url = `${BASE}/${f.slug}-fund-fact-sheet-en-us.pdf`;
    const buf = fetchPdfBuffer(url);
    if (!buf) {
      skipped.push(`${f.ticker} (404/URL — ${f.slug})`);
      continue;
    }
    let observations: Observation[];
    try {
      const text = await pdfBufferToText(buf);
      observations = connector.extract(iSharesRawFromText(text, url, retrievedAt));
    } catch (e) {
      skipped.push(`${f.ticker} (extraction: ${(e as Error).message})`);
      continue;
    }
    const publishable = publishableObservations(observations);
    if (publishable.length === 0) {
      skipped.push(`${f.ticker} (aucune observation publiable)`);
      continue;
    }
    perFund.push({ ticker: f.ticker, observations });
    const fields = publishable.map((o) => o.field).join(", ");
    console.error(`✓ ${f.ticker}: ${publishable.length} observations (${fields})`);
  }

  console.error(`\n${perFund.length} fonds ingérés, ${skipped.length} ignorés.`);
  if (skipped.length) console.error("Ignorés :\n  - " + skipped.join("\n  - "));

  console.log(JSON.stringify({ funds: perFund }, null, 2));

  if (emitSql) {
    console.error("\n-- SQL Data Engine (ledger + colonnes canoniques) --");
    for (const { ticker, observations } of perFund) {
      for (const o of publishableObservations(observations)) {
        console.error(observationInsertSql(ticker, o));
      }
      const upd = canonicalUpdateSql(ticker, observations);
      if (upd) console.error(upd);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
