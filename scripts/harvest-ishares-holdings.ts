#!/usr/bin/env bun
/**
 * HARVESTER iShares — composition des fonds (`fund_holdings`) via NAVIGATEUR SANS
 * TÊTE (décision « holdings : option B », cf. docs/esg-sources.md et CLAUDE.md §7).
 *
 * ENTIÈREMENT AUTOMATIQUE — aucune liste d'ISIN à curer à la main :
 *   1. DÉCOUVERTE : le navigateur charge la page catalogue iShares ; le site
 *      publie lui-même son « product screener » (JSON) que la SPA consomme. On
 *      l'INTERCEPTE et on en extrait les couples (ISIN, page produit) — puis on
 *      CROISE avec notre univers (`assets`) par ISIN. On ne devine aucune URL
 *      (§1.3) : on lit ce que le site expose (`extractProductsFromScreener`, pur
 *      et testé). Un override curé (`ISHARES_PRODUCT_URLS`) reste possible pour
 *      épingler un cas particulier, mais n'est PAS requis.
 *   2. MOISSONNAGE : pour chaque fonds ciblé, on ouvre sa page produit, on lit le
 *      lien de CSV de composition réellement rendu dans le DOM
 *      (`pickHoldingsCsvUrl`), on télécharge le CSV DANS le contexte de la page
 *      (cookies/consentement portés), puis on RÉUTILISE le pipeline existant
 *      (parseISharesHoldingsCsv → persistHoldings → supabaseHoldingWriter, §23).
 *
 * Posture ToS : piloter la SPA d'un tiers pour moissonner des compositions
 * PUBLIQUES est acté (docs/esg-sources.md). UA identifiable, débit poli,
 * séquentiel.
 *
 * Sûreté : DRY-RUN par défaut (parse + rapport, aucune écriture). `SEEDOW_PERSIST=1`
 * écrit dans `fund_holdings`. `HEADFUL=1` ouvre un navigateur visible (debug).
 *
 * Env :
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY            (requis)
 *   ISHARES_LIST_URLS   JSON string[] pages catalogue  (optionnel — défaut fourni)
 *   ISHARES_PRODUCT_URLS JSON { ISIN: url }  overrides  (optionnel)
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import { parseISharesHoldingsCsv, persistHoldings } from "../src/lib/data-engine/holdings";
import { supabaseHoldingWriter } from "../src/lib/data-engine/holdings.supabase";
import { pickHoldingsCsvUrl } from "../src/lib/data-engine/ishares-holdings-url";
import {
  extractProductsFromScreener,
  resolveHarvestTargets,
  type DiscoveredProduct,
  type HarvestTarget,
} from "../src/lib/data-engine/ishares-catalog";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36 SeedowBot/1.0 (+https://seedow.app)";
const NAV_TIMEOUT = 60_000;
const BETWEEN_FUNDS_MS = 2_500;
const doPersist = process.env.SEEDOW_PERSIST === "1";
const headful = process.env.HEADFUL === "1";

// Pages catalogue par défaut (entrées PUBLIQUES du site, pas des URL de données
// devinées) — surchargeable via ISHARES_LIST_URLS.
const DEFAULT_LIST_URLS = ["https://www.ishares.com/uk/individual/en/products/etf-investments"];

interface FundResult {
  isin: string;
  source: HarvestTarget["source"];
  status: "written" | "parsed_dry_run" | "no_csv" | "empty" | "error";
  inserted?: number;
  asOf?: string | null;
  rows?: number;
  detail?: string;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Ferme au mieux les bandeaux de consentement / sélection d'investisseur. */
async function dismissConsent(page: any): Promise<void> {
  const selectors = [
    "#onetrust-accept-btn-handler",
    "button:has-text('Accept all')",
    "button:has-text('Accept All')",
    "button:has-text('I Accept')",
    "button:has-text('Accept')",
    "button:has-text('Agree')",
    "button:has-text('Individual')",
    "a:has-text('Individual')",
  ];
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1200 })) {
        await el.click({ timeout: 2000 });
        await page.waitForTimeout(400);
      }
    } catch {
      // absent / déjà fermé
    }
  }
}

/** Ressemble à un ISIN (pré-filtre grossier des payloads ; validation checksum ensuite). */
const ISIN_RE = /[A-Z]{2}[A-Z0-9]{9}[0-9]/;

/**
 * Découvre (ISIN → page produit) en interceptant le screener que la SPA charge.
 * On ne garde que les réponses JSON qui contiennent à la fois un ISIN plausible
 * et un chemin `/products/`. La validation ISIN par checksum se fait dans
 * `extractProductsFromScreener`.
 */
async function discoverProducts(context: any, listUrls: string[]): Promise<DiscoveredProduct[]> {
  const merged = new Map<string, string>();

  for (const listUrl of listUrls) {
    const page = await context.newPage();
    const payloads: string[] = [];
    page.on("response", async (res: any) => {
      try {
        const ct = (res.headers()["content-type"] as string) || "";
        if (!ct.includes("json")) return;
        const text = await res.text();
        if (text.length > 200 && text.includes("products/") && ISIN_RE.test(text)) {
          payloads.push(text);
        }
      } catch {
        // corps illisible (binaire, streamé…) — on ignore
      }
    });

    try {
      await page.goto(listUrl, { waitUntil: "domcontentloaded" });
      await dismissConsent(page);
      await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => {});
      await page.waitForTimeout(2_000); // appels tardifs du screener
    } catch (e) {
      console.warn(`  discovery: ${listUrl} — ${e instanceof Error ? e.message : String(e)}`);
    }

    for (const payload of payloads) {
      try {
        const data = JSON.parse(payload);
        for (const prod of extractProductsFromScreener(data, listUrl)) {
          if (!merged.has(prod.isin)) merged.set(prod.isin, prod.url);
        }
      } catch {
        // pas du JSON exploitable
      }
    }
    await page.close();
  }

  return [...merged.entries()].map(([isin, url]) => ({ isin, url }));
}

async function main(): Promise<void> {
  const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !KEY) {
    console.error("Manque SUPABASE_URL et une clé Supabase (service role de préférence).");
    process.exit(1);
  }

  let listUrls = DEFAULT_LIST_URLS;
  try {
    const raw = process.env.ISHARES_LIST_URLS;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) listUrls = parsed;
    }
  } catch {
    console.error("ISHARES_LIST_URLS n'est pas un JSON valide.");
    process.exit(1);
  }

  let overrides: Record<string, string> = {};
  try {
    overrides = JSON.parse(process.env.ISHARES_PRODUCT_URLS ?? "{}");
  } catch {
    console.error("ISHARES_PRODUCT_URLS n'est pas un JSON valide.");
    process.exit(1);
  }

  const admin = createClient(SUPABASE_URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: assetRows, error } = await (admin as any)
    .from("assets")
    .select("id, isin, name")
    .eq("is_active", true);
  if (error) {
    console.error(`Lecture assets: ${error.message}`);
    process.exit(1);
  }
  const activeByIsin = new Map<string, { id: string; name: string }>();
  for (const a of assetRows ?? []) {
    if (a.isin) activeByIsin.set(a.isin, { id: a.id, name: a.name });
  }
  console.log(
    `Univers actif : ${activeByIsin.size} actif(s) avec ISIN. Mode : ${doPersist ? "ÉCRITURE" : "DRY-RUN"}.`,
  );

  const writer = supabaseHoldingWriter(admin as any);
  const { chromium } = (await import("playwright")) as any;
  const browser = await chromium.launch({ headless: !headful });
  const context = await browser.newContext({ userAgent: UA, locale: "en-GB" });
  context.setDefaultTimeout(NAV_TIMEOUT);

  const results: FundResult[] = [];
  try {
    console.log(`Découverte du catalogue iShares (${listUrls.length} page(s))…`);
    const discovered = await discoverProducts(context, listUrls);
    const targets = resolveHarvestTargets({
      discovered,
      activeByIsin,
      overrides,
      base: listUrls[0],
    });
    console.log(
      `Découverts : ${discovered.length} produit(s) iShares · dont ${targets.filter((t) => t.source === "discovered").length} dans notre univers · overrides : ${Object.keys(overrides).length}. À moissonner : ${targets.length}.`,
    );

    for (const target of targets) {
      const page = await context.newPage();
      try {
        await page.goto(target.url, { waitUntil: "domcontentloaded" });
        await dismissConsent(page);
        await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});

        const hrefs: string[] = await page.$$eval("a[href]", (as: any[]) =>
          as.map((a) => a.getAttribute("href") || ""),
        );
        const csvUrl = pickHoldingsCsvUrl(hrefs, target.url);
        if (!csvUrl) {
          results.push({ isin: target.isin, source: target.source, status: "no_csv" });
          continue;
        }

        const text: string = await page.evaluate(async (u: string) => {
          const r = await fetch(u, { credentials: "include" });
          return await r.text();
        }, csvUrl);

        const parsed = parseISharesHoldingsCsv(text);
        if (!parsed.asOf || parsed.holdings.length === 0) {
          results.push({ isin: target.isin, source: target.source, status: "empty" });
          continue;
        }

        if (!doPersist) {
          results.push({
            isin: target.isin,
            source: target.source,
            status: "parsed_dry_run",
            rows: parsed.holdings.length,
            asOf: parsed.asOf,
          });
        } else {
          const { inserted, asOf } = await persistHoldings(writer, target.assetId, parsed, {
            sourceId: null,
            sourceUrl: target.url,
            retrievedAt: new Date().toISOString(),
          });
          results.push({
            isin: target.isin,
            source: target.source,
            status: "written",
            inserted,
            asOf,
            rows: parsed.holdings.length,
          });
        }
      } catch (e) {
        results.push({
          isin: target.isin,
          source: target.source,
          status: "error",
          detail: e instanceof Error ? e.message : String(e),
        });
      } finally {
        await page.close();
        await sleep(BETWEEN_FUNDS_MS);
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const summary = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log("\n── Résultats par fonds ──");
  for (const r of results) {
    const bits = [r.isin, r.source, r.status];
    if (r.rows != null) bits.push(`${r.rows} lignes`);
    if (r.asOf) bits.push(`as of ${r.asOf}`);
    if (r.inserted != null) bits.push(`${r.inserted} insérées`);
    if (r.detail) bits.push(`(${r.detail})`);
    console.log("  " + bits.join(" · "));
  }
  console.log("\n── Synthèse ──\n  " + JSON.stringify(summary));

  const hardFailures = results.filter((r) => r.status === "error").length;
  if (results.length > 0 && hardFailures === results.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
