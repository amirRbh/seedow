#!/usr/bin/env bun
/**
 * HARVESTER iShares — composition des fonds (`fund_holdings`) via NAVIGATEUR SANS
 * TÊTE (décision « holdings : option B », cf. docs/esg-sources.md et CLAUDE.md §7).
 *
 * Pourquoi un navigateur : le site iShares construit l'URL du CSV de composition
 * au runtime (SPA) — un simple `fetch` renvoie une coquille vide (voie HTTP
 * épuisée, runs #1-#5). On laisse donc le JS de la page s'exécuter, on lit le lien
 * de CSV RÉELLEMENT présent dans le DOM (`pickHoldingsCsvUrl`, pur et testé), puis
 * on télécharge le CSV DANS le contexte de la page (cookies/consentement portés).
 *
 * On RÉUTILISE tout le pipeline existant (§23) : `parseISharesHoldingsCsv` →
 * `persistHoldings` → `supabaseHoldingWriter`. Ce script n'ajoute que l'étape
 * navigateur. Rien n'est inventé (§1.3) : un fonds sans lien de CSV dans le DOM →
 * `no_source`, rien n'est écrit. Une somme de poids > 100 % → rejetée par le QC.
 *
 * Posture ToS : piloter la SPA d'un tiers pour moissonner des données publiques de
 * composition est une posture plus lourde qu'un flux déclaré — ACTÉE explicitement
 * par le porteur du produit (docs/esg-sources.md). UA identifiable, débit poli
 * (séquentiel + délai), aucune donnée non publique visée.
 *
 * Config (aucune URL devinée) : `ISHARES_PRODUCT_URLS` = JSON `{ "<ISIN>": "<url
 * de la page produit iShares>" }`, curée et vérifiée. Seuls les ISIN présents ET
 * correspondant à un actif actif de `assets` sont traités.
 *
 * Sûreté : DRY-RUN par défaut (parse + rapport, aucune écriture). `SEEDOW_PERSIST=1`
 * écrit réellement dans `fund_holdings`. `HEADFUL=1` ouvre un navigateur visible
 * (debug local des sélecteurs).
 *
 * Usage :
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ISHARES_PRODUCT_URLS='{"IE..":"https://.."}' \
 *     bun run scripts/harvest-ishares-holdings.ts            # dry-run
 *   SEEDOW_PERSIST=1 ... bun run scripts/harvest-ishares-holdings.ts   # écrit
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import { parseISharesHoldingsCsv, persistHoldings } from "../src/lib/data-engine/holdings";
import { supabaseHoldingWriter } from "../src/lib/data-engine/holdings.supabase";
import { pickHoldingsCsvUrl } from "../src/lib/data-engine/ishares-holdings-url";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36 SeedowBot/1.0 (+https://seedow.app)";
const NAV_TIMEOUT = 60_000;
const BETWEEN_FUNDS_MS = 2_500; // débit poli
const doPersist = process.env.SEEDOW_PERSIST === "1";
const headful = process.env.HEADFUL === "1";

interface FundResult {
  isin: string;
  status: "written" | "parsed_dry_run" | "no_source" | "empty" | "error";
  inserted?: number;
  asOf?: string | null;
  rows?: number;
  detail?: string;
}

function env(name: string): string | undefined {
  return process.env[name];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

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
      // bandeau absent ou déjà fermé — on continue
    }
  }
}

async function main(): Promise<void> {
  const SUPABASE_URL = env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL");
  const KEY = env("SUPABASE_SERVICE_ROLE_KEY") ?? env("SUPABASE_PUBLISHABLE_KEY");
  if (!SUPABASE_URL || !KEY) {
    console.error("Manque SUPABASE_URL et une clé Supabase (service role de préférence).");
    process.exit(1);
  }

  let productUrls: Record<string, string> = {};
  try {
    productUrls = JSON.parse(env("ISHARES_PRODUCT_URLS") ?? "{}");
  } catch {
    console.error("ISHARES_PRODUCT_URLS n'est pas un JSON valide.");
    process.exit(1);
  }
  const isins = Object.keys(productUrls);
  if (isins.length === 0) {
    console.log("ISHARES_PRODUCT_URLS vide — aucune page produit curée, rien à moissonner.");
    return;
  }

  const admin = createClient(SUPABASE_URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Correspondance ISIN → actif actif. Un ISIN sans actif → ignoré (jamais créé).
  const { data: assetRows, error } = await (admin as any)
    .from("assets")
    .select("id, isin, name")
    .eq("is_active", true);
  if (error) {
    console.error(`Lecture assets: ${error.message}`);
    process.exit(1);
  }
  const byIsin = new Map<string, { id: string; name: string }>();
  for (const a of assetRows ?? []) {
    if (a.isin) byIsin.set(a.isin, { id: a.id, name: a.name });
  }

  const writer = supabaseHoldingWriter(admin as any);

  console.log(
    `iShares holdings harvester — ${isins.length} ISIN configuré(s), ${doPersist ? "ÉCRITURE" : "DRY-RUN"}.`,
  );

  const { chromium } = (await import("playwright")) as any;
  const browser = await chromium.launch({ headless: !headful });
  const context = await browser.newContext({ userAgent: UA, locale: "en-GB" });
  context.setDefaultTimeout(NAV_TIMEOUT);
  const results: FundResult[] = [];

  try {
    for (const isin of isins) {
      const asset = byIsin.get(isin);
      const productUrl = productUrls[isin];
      if (!asset) {
        results.push({ isin, status: "no_source", detail: "aucun actif actif pour cet ISIN" });
        continue;
      }
      const page = await context.newPage();
      try {
        await page.goto(productUrl, { waitUntil: "domcontentloaded" });
        await dismissConsent(page);
        await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});

        const hrefs: string[] = await page.$$eval("a[href]", (as: any[]) =>
          as.map((a) => a.getAttribute("href") || ""),
        );
        const csvUrl = pickHoldingsCsvUrl(hrefs, productUrl);
        if (!csvUrl) {
          results.push({
            isin,
            status: "no_source",
            detail: "aucun lien CSV de holdings dans le DOM",
          });
          continue;
        }

        // Téléchargement DANS le contexte de la page (cookies/consentement portés).
        const text: string = await page.evaluate(async (u: string) => {
          const r = await fetch(u, { credentials: "include" });
          return await r.text();
        }, csvUrl);

        const parsed = parseISharesHoldingsCsv(text);
        if (!parsed.asOf || parsed.holdings.length === 0) {
          results.push({ isin, status: "empty", detail: "CSV sans date/holdings exploitables" });
          continue;
        }

        if (!doPersist) {
          results.push({
            isin,
            status: "parsed_dry_run",
            rows: parsed.holdings.length,
            asOf: parsed.asOf,
          });
        } else {
          const { inserted, asOf } = await persistHoldings(writer, asset.id, parsed, {
            sourceId: null,
            sourceUrl: productUrl,
            retrievedAt: new Date().toISOString(),
          });
          results.push({ isin, status: "written", inserted, asOf, rows: parsed.holdings.length });
        }
      } catch (e) {
        results.push({ isin, status: "error", detail: e instanceof Error ? e.message : String(e) });
      } finally {
        await page.close();
        await sleep(BETWEEN_FUNDS_MS);
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  // Rapport
  const summary = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log("\n── Résultats par fonds ──");
  for (const r of results) {
    const bits = [r.isin, r.status];
    if (r.rows != null) bits.push(`${r.rows} lignes`);
    if (r.asOf) bits.push(`as of ${r.asOf}`);
    if (r.inserted != null) bits.push(`${r.inserted} insérées`);
    if (r.detail) bits.push(`(${r.detail})`);
    console.log("  " + bits.join(" · "));
  }
  console.log("\n── Synthèse ──");
  console.log("  " + JSON.stringify(summary));

  const hardFailures = results.filter((r) => r.status === "error").length;
  // Un `no_source`/`empty` n'est pas un échec dur (donnée absente, pas un bug) ;
  // une erreur de navigation/parse l'est.
  if (hardFailures > 0 && hardFailures === results.length) {
    process.exit(1); // tout a échoué → signal d'échec pour la CI
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
