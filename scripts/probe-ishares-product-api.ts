/**
 * PROBE read-only — CHAÎNE COMPLÈTE ISIN → HOLDINGS chez iShares, en HTTP simple.
 *
 * Les probes #1–#5 (`probe-ishares-catalog.ts`) concluaient « voie HTTP simple
 * épuisée » : `product-data.jsn` répond 200 avec un `data` vide, piloté par une
 * config assemblée en JS. Cette conclusion visait le BON constat sur le MAUVAIS
 * endpoint : la page produit déclare aussi, dans son `url_map`, une API REST
 * distincte (`product_data_api`) que ces probes n'avaient pas testée.
 *
 * Ce probe mesure les trois maillons, chacun en simple GET, sans navigateur :
 *
 *   A. ÉNUMÉRATION — `product-sitemap.xml`, déclaré par le `robots.txt` du site
 *      (voie prévue pour les robots, §16), donne la liste des pages produit et
 *      donc des `portfolioId`.
 *   B. IDENTITÉ — `get-product-data?component=keyFundFacts` rend l'ISIN du fonds
 *      → construit la table de correspondance ISIN → portfolioId.
 *   C. COMPOSITION — `get-product-data?component=holdings` rend les positions en
 *      colonnes parallèles (isin, issueName, holdingPercent, sectorName,
 *      countryOfRisk…) + la date `asOfDate`.
 *
 * IMPRIME, par fonds échantillonné : statut HTTP, nb de lignes, taux d'ISIN
 * renseignés, somme des poids, date de référence. N'écrit RIEN, n'ingère rien,
 * ne devine aucune URL (toutes proviennent du sitemap ou de l'`url_map` du site).
 *
 * Usage : bun run scripts/probe-ishares-product-api.ts
 */

import { parseISharesProductDataHoldings } from "../src/lib/data-engine/holdings";

const UA = "Mozilla/5.0 (compatible; SeedowBot/1.0; +https://seedow.app)";
const DELAY_MS = 800;
/** Nombre de fonds échantillonnés dans le sitemap (probe, pas ingestion). */
const SAMPLE = Number(process.env.SAMPLE ?? 5);

const SITEMAP = "https://www.ishares.com/uk/product-sitemap.xml";
/** `product_data_api` tel que déclaré par l'`url_map` de la page produit. */
const PRODUCT_API =
  "https://www.blackrock.com/varnish-api/uk-retail01-product-data/product-data/api/v2/get-product-data";

const BASE_PARAMS = {
  targetSite: "ishares-uk",
  locale: "en_GB",
  appType: "PRODUCT_PAGE",
  appSubType: "ISHARES",
  userType: "individual",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Fetched {
  status: number;
  bytes: number;
  body: string | null;
}

/** GET tolérant : ne lève jamais, renvoie le statut pour qu'il soit imprimé. */
async function get(url: string): Promise<Fetched> {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    const body = await res.text();
    return { status: res.status, bytes: body.length, body };
  } catch (err) {
    console.log(`      erreur réseau: ${(err as Error).message}`);
    return { status: 0, bytes: 0, body: null };
  }
}

function productDataUrl(portfolioId: string, component: string): string {
  const p = new URLSearchParams({ ...BASE_PARAMS, portfolioId, component });
  return `${PRODUCT_API}?${p.toString()}`;
}

function parseJson(body: string | null): unknown {
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

/** Cherche la 1re valeur d'une clé donnée, à n'importe quelle profondeur. */
function findFirst(node: unknown, key: string, depth = 0): unknown {
  if (depth > 8 || node === null || typeof node !== "object") return undefined;
  if (!Array.isArray(node)) {
    const rec = node as Record<string, unknown>;
    if (key in rec) {
      const v = rec[key];
      if (v !== null && typeof v === "object" && "value" in (v as Record<string, unknown>)) {
        return (v as Record<string, unknown>).value;
      }
      if (typeof v === "string" || typeof v === "number") return v;
    }
  }
  for (const child of Array.isArray(node) ? node : Object.values(node)) {
    const found = findFirst(child, key, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

async function main(): Promise<void> {
  console.log("=== PROBE iShares product API (read-only) ===\n");

  // ---- A. ÉNUMÉRATION -------------------------------------------------------
  console.log(`A. Sitemap produit (déclaré par robots.txt)\n   ${SITEMAP}`);
  const sm = await get(SITEMAP);
  console.log(`   HTTP ${sm.status} · ${sm.bytes} o`);
  const ids = [...new Set([...(sm.body ?? "").matchAll(/\/products\/(\d+)\//g)].map((m) => m[1]))];
  console.log(`   → ${ids.length} portfolioId distincts énumérés\n`);
  if (ids.length === 0) {
    console.log("RÉSULTAT: énumération impossible — chaîne interrompue au maillon A.");
    return;
  }

  // Échantillon régulier plutôt que les N premiers (évite le biais d'ordre).
  const step = Math.max(1, Math.floor(ids.length / SAMPLE));
  const sample = Array.from({ length: SAMPLE }, (_, i) => ids[i * step]).filter(Boolean);

  // ---- B + C. IDENTITÉ puis COMPOSITION -------------------------------------
  console.log(`B+C. Échantillon de ${sample.length} fonds\n`);
  let withIsin = 0;
  let withHoldings = 0;

  for (const portfolioId of sample) {
    console.log(`— portfolioId ${portfolioId}`);

    await sleep(DELAY_MS);
    const facts = await get(productDataUrl(portfolioId, "keyFundFacts"));
    const factsJson = parseJson(facts.body);
    const fundName = findFirst(factsJson, "fundName");
    const isin = findFirst(factsJson, "isin");
    console.log(`   identité   HTTP ${facts.status} · ${facts.bytes} o · ${fundName ?? "?"}`);
    console.log(`   ISIN       ${isin ?? "(absent)"}`);
    if (typeof isin === "string" && /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(isin)) withIsin++;

    await sleep(DELAY_MS);
    const url = productDataUrl(portfolioId, "holdings");
    const hold = await get(url);
    const parsed = parseISharesProductDataHoldings(parseJson(hold.body));
    const n = parsed.holdings.length;
    const isinRate = n === 0 ? 0 : (parsed.holdings.filter((h) => h.isin).length / n) * 100;
    const sum = parsed.holdings.reduce((a, h) => a + (h.weightPct ?? 0), 0);
    console.log(
      `   holdings   HTTP ${hold.status} · ${hold.bytes} o · ${n} lignes · ` +
        `ISIN ${isinRate.toFixed(0)}% · somme ${sum.toFixed(2)}% · as_of ${parsed.asOf ?? "?"}`,
    );
    if (n > 0 && parsed.asOf) withHoldings++;
    console.log("");
  }

  // ---- VERDICT --------------------------------------------------------------
  console.log("=== RÉSULTAT ===");
  console.log(`énumérés=${ids.length} · échantillon=${sample.length}`);
  console.log(`ISIN résolus=${withIsin}/${sample.length}`);
  console.log(`holdings datées=${withHoldings}/${sample.length}`);
  const ok = withHoldings > 0 && withIsin > 0;
  console.log(
    ok
      ? "→ GO : chaîne ISIN → holdings franchie en HTTP simple, sans navigateur."
      : "→ NO-GO : un maillon a cédé (voir les statuts ci-dessus).",
  );
}

void main();
