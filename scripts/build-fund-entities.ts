#!/usr/bin/env bun
/**
 * Phase 0 du scoring v2 — déduplication du catalogue en entités-fonds.
 *
 * Ne demande AUCUNE donnée nouvelle : il regroupe les lignes de cotation déjà
 * en base (`assets`) par `(émetteur, stratégie, indice répliqué)` et écrit une
 * ligne `fund_entities` par fonds réel, avec les ISIN des parts dessous.
 *
 * Pourquoi c'est la toute première étape : le catalogue v1 portait iShares MSCI
 * Japan SRI à deux scores différents (68 sur SUJP, 85 sur SUJM) parce que
 * chaque part de classe était traitée comme un fonds distinct. C'est le défaut
 * qui décrédibilise le plus vite, parce qu'il se vérifie en dix secondes — et
 * il ne coûte rien à corriger.
 *
 * Il crée aussi, pour chaque entité, les 16 signaux du STI à l'état
 * `non_verifie`. C'est volontaire : un fonds démarre à « Documentation
 * insuffisante pour être noté », pas à zéro. Le zéro se mérite — il signifie
 * « la recherche a été menée et le fonds ne publie rien », ce que seule la
 * collecte de la phase 1 peut établir.
 *
 * Usage :
 *   bun run scripts/build-fund-entities.ts              # rapport + SQL sur stdout
 *   SEEDOW_PERSIST=1 bun run scripts/build-fund-entities.ts   # écrit en base
 *
 * Persistance : SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY requis.
 */
import { createClient } from "@supabase/supabase-js";
import { groupFundEntities, type FundLine } from "../src/lib/esg/v2/fund-entity";
import { STI_SIGNAL_IDS } from "../src/lib/esg/v2/sti";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const persist = process.env.SEEDOW_PERSIST === "1";

if (persist && (!url || !key)) {
  console.error("SEEDOW_PERSIST=1 exige SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!url || !key) {
  console.error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis pour lire le catalogue.");
  process.exit(1);
}

const admin = createClient(url, key);

interface AssetRow extends FundLine {
  asset_class: string;
}

const { data, error } = await admin
  .from("assets")
  .select("ticker, name, issuer, isin, asset_class")
  .eq("is_active", true)
  .order("name", { ascending: true })
  .limit(1000);
if (error) {
  console.error("Lecture de `assets` impossible :", error.message);
  process.exit(1);
}

const rows = (data ?? []) as unknown as AssetRow[];
const entities = groupFundEntities(rows);

console.log(`${rows.length} lignes de cotation → ${entities.length} fonds après déduplication.`);
const merged = entities.filter((e) => e.lines.length > 1);
if (merged.length > 0) {
  console.log("\nFonds dont plusieurs parts étaient comptées séparément :");
  for (const e of merged) {
    console.log(`  ${e.name}`);
    console.log(`    ${e.tickers.join(", ")}${e.isins.length ? ` · ${e.isins.join(", ")}` : ""}`);
  }
}

const quote = (v: string | null) => (v == null ? "NULL" : `'${v.replace(/'/g, "''")}'`);
const array = (v: string[]) => `ARRAY[${v.map(quote).join(", ")}]::text[]`;

if (!persist) {
  console.log("\n-- SQL (SEEDOW_PERSIST=1 pour écrire directement) --\n");
  for (const e of entities) {
    const head = e.lines[0] as AssetRow;
    console.log(
      `INSERT INTO public.fund_entities (entity_key, name, issuer, asset_class, isins, tickers) VALUES (${quote(e.key)}, ${quote(e.name)}, ${quote(e.issuer)}, ${quote(head.asset_class)}, ${array(e.isins)}, ${array(e.tickers)}) ON CONFLICT (entity_key) DO UPDATE SET name = EXCLUDED.name, issuer = EXCLUDED.issuer, asset_class = EXCLUDED.asset_class, isins = EXCLUDED.isins, tickers = EXCLUDED.tickers;`,
    );
  }
  process.exit(0);
}

for (const e of entities) {
  const head = e.lines[0] as AssetRow;
  const { error: upsertError } = await admin.from("fund_entities" as never).upsert(
    {
      entity_key: e.key,
      name: e.name,
      issuer: e.issuer,
      asset_class: head.asset_class,
      isins: e.isins,
      tickers: e.tickers,
    } as never,
    { onConflict: "entity_key" },
  );
  if (upsertError) {
    console.error(`  ✗ ${e.name} : ${upsertError.message}`);
    continue;
  }
  // Les signaux naissent `non_verifie` : rien n'est jamais supposé publié, et
  // rien n'est supposé absent non plus tant que personne n'a cherché.
  const { error: signalError } = await admin.from("fund_transparency_signals" as never).upsert(
    STI_SIGNAL_IDS.map((signal) => ({
      entity_key: e.key,
      signal,
      statut: "non_verifie",
    })) as never,
    { onConflict: "entity_key,signal", ignoreDuplicates: true },
  );
  if (signalError) console.error(`  ✗ signaux ${e.name} : ${signalError.message}`);
}

console.log(`\n${entities.length} entités écrites.`);
