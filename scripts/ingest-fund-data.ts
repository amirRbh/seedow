#!/usr/bin/env bun
/**
 * Ingestion Data Engine — factsheet émetteur → base canonique.
 *
 * Contrairement à `ingest-issuer-esg.ts` (qui n'écrit que les colonnes plates
 * de `assets`), ce script fait passer chaque fiche par le **Data Engine** :
 *
 *   factsheet → <Issuer>Connector.extract → Observation[] (provenance complète)
 *            → data_observations (ledger §3) + colonnes canoniques `assets` (§24)
 *
 * Multi-émetteur (iShares/Amundi/Vanguard partagent le même Data Engine, cf.
 * `connectors/`). iShares a une liste d'URL stables (slug fixe, vérifiée) :
 * gardée en dur par défaut. Amundi/Vanguard exposent leurs factsheets sous des
 * URL datées (changent chaque mois) — plutôt que d'en figer une qui périmerait
 * en quelques semaines, elles sont fournies en argument (ISIN=URL), à récupérer
 * fraîches sur amundietf.fr / vanguard.co.uk au moment de l'ingestion.
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
 *   bun run scripts/ingest-fund-data.ts                        # iShares (défaut), JSON
 *   bun run scripts/ingest-fund-data.ts --sql                  # + INSERT/UPDATE SQL
 *   bun run scripts/ingest-fund-data.ts --issuer amundi FR001400U5Q4=https://...pdf ...
 *   bun run scripts/ingest-fund-data.ts --issuer vanguard IE00B3RBWM25=https://...pdf ...
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { ISharesConnector, iSharesRawFromText } from "../src/lib/data-engine/connectors/ishares";
import { AmundiConnector, amundiRawFromText } from "../src/lib/data-engine/connectors/amundi";
import { VanguardConnector, vanguardRawFromText } from "../src/lib/data-engine/connectors/vanguard";
import { publishableObservations } from "../src/lib/data-engine/engine";
import { canonicalAssetUpdate } from "../src/lib/data-engine/persist";
import type { Connector, Observation, RawData } from "../src/lib/data-engine/connectors/types";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36";
const PROXY_CA = "/root/.ccr/ca-bundle.crt";
const ISHARES_BASE = "https://www.ishares.com/us/literature/fact-sheet";

type MatchColumn = "ticker" | "isin";

interface FundSource {
  /** Valeur de la colonne `assets.ticker` ou `assets.isin` (selon `matchBy`). */
  key: string;
  url: string;
}

interface IssuerSetup {
  matchBy: MatchColumn;
  connector: Connector;
  rawFromText: (text: string, url: string, retrievedAt: string) => RawData;
  /** Fiches par défaut si aucune n'est fournie en argument (vide = obligatoire en CLI). */
  defaultFunds: FundSource[];
}

/** Fiches iShares US confirmées (cf. ingest-issuer-esg.ts). ticker = clé d'`assets`. */
const ISHARES_FUNDS: FundSource[] = [
  { key: "ESGU", url: slugUrl("esgu-ishares-esg-aware-msci-usa-etf") },
  { key: "ESGD", url: slugUrl("esgd-ishares-esg-aware-msci-eafe-etf") },
  { key: "ESGE", url: slugUrl("esge-ishares-esg-aware-msci-em-etf") },
  { key: "DSI", url: slugUrl("dsi-ishares-esg-msci-kld-400-etf") },
  { key: "SUSL", url: slugUrl("susl-ishares-esg-msci-usa-leaders-etf") },
  { key: "EAGG", url: slugUrl("eagg-ishares-esg-aware-u-s-aggregate-bond-etf") },
  { key: "ICLN", url: slugUrl("icln-ishares-global-clean-energy-etf") },
  { key: "SUSC", url: slugUrl("susc-ishares-esg-aware-usd-corporate-bond-etf") },
  { key: "SUSB", url: slugUrl("susb-ishares-esg-aware-1-5-year-usd-corporate-bond-etf") },
  { key: "BGRN", url: slugUrl("bgrn-ishares-usd-green-bond-etf") },
];

function slugUrl(slug: string): string {
  return `${ISHARES_BASE}/${slug}-fund-fact-sheet-en-us.pdf`;
}

const ISSUERS: Record<string, IssuerSetup> = {
  ishares: {
    matchBy: "ticker",
    connector: new ISharesConnector(),
    rawFromText: iSharesRawFromText,
    defaultFunds: ISHARES_FUNDS,
  },
  amundi: {
    matchBy: "isin",
    connector: new AmundiConnector(),
    rawFromText: amundiRawFromText,
    defaultFunds: [],
  },
  vanguard: {
    matchBy: "isin",
    connector: new VanguardConnector(),
    rawFromText: vanguardRawFromText,
    defaultFunds: [],
  },
};

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
function observationInsertSql(matchBy: MatchColumn, key: string, o: Observation): string {
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
    `(SELECT id FROM public.assets WHERE ${matchBy} = ${sqlLiteral(key)})`,
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
function canonicalUpdateSql(
  matchBy: MatchColumn,
  key: string,
  observations: Observation[],
): string | null {
  const update = canonicalAssetUpdate(observations);
  if (!update) return null;
  const sets = Object.entries(update).map(([k, v]) => `${k} = ${sqlLiteral(v)}`);
  return `UPDATE public.assets SET ${sets.join(", ")} WHERE ${matchBy} = ${sqlLiteral(key)};`;
}

/** Parse les arguments `KEY=URL` (ISIN/ticker=url du document officiel). */
function parseFundArgs(args: string[]): FundSource[] {
  return args
    .filter((a) => a.includes("="))
    .map((a) => {
      const i = a.indexOf("=");
      return { key: a.slice(0, i), url: a.slice(i + 1) };
    });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const emitSql = args.includes("--sql");
  const issuerIdx = args.indexOf("--issuer");
  const issuerKey = issuerIdx >= 0 ? args[issuerIdx + 1] : "ishares";
  const setup = ISSUERS[issuerKey];
  if (!setup) {
    console.error(
      `❌ Émetteur inconnu : ${issuerKey}. Attendu : ${Object.keys(ISSUERS).join(", ")}`,
    );
    process.exit(1);
  }

  const fromArgs = parseFundArgs(args);
  const funds = fromArgs.length ? fromArgs : setup.defaultFunds;
  if (funds.length === 0) {
    console.error(
      `❌ Aucune fiche à ingérer pour ${issuerKey}. Fournir des paires ${setup.matchBy.toUpperCase()}=URL (pas de liste par défaut pour cet émetteur).`,
    );
    process.exit(1);
  }

  const retrievedAt = new Date().toISOString();
  const perFund: { key: string; observations: Observation[] }[] = [];
  const skipped: string[] = [];

  for (const f of funds) {
    const buf = fetchPdfBuffer(f.url);
    if (!buf) {
      skipped.push(`${f.key} (404/URL — ${f.url})`);
      continue;
    }
    let observations: Observation[];
    try {
      const text = await pdfBufferToText(buf);
      observations = setup.connector.extract(setup.rawFromText(text, f.url, retrievedAt));
    } catch (e) {
      skipped.push(`${f.key} (extraction: ${(e as Error).message})`);
      continue;
    }
    const publishable = publishableObservations(observations);
    if (publishable.length === 0) {
      skipped.push(`${f.key} (aucune observation publiable)`);
      continue;
    }
    perFund.push({ key: f.key, observations });
    const fields = publishable.map((o) => o.field).join(", ");
    console.error(`✓ ${f.key}: ${publishable.length} observations (${fields})`);
  }

  console.error(`\n${perFund.length} fonds ingérés, ${skipped.length} ignorés.`);
  if (skipped.length) console.error("Ignorés :\n  - " + skipped.join("\n  - "));

  console.log(JSON.stringify({ issuer: issuerKey, funds: perFund }, null, 2));

  if (emitSql) {
    console.error("\n-- SQL Data Engine (ledger + colonnes canoniques) --");
    for (const { key, observations } of perFund) {
      for (const o of publishableObservations(observations)) {
        console.error(observationInsertSql(setup.matchBy, key, o));
      }
      const upd = canonicalUpdateSql(setup.matchBy, key, observations);
      if (upd) console.error(upd);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
