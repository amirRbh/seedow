/**
 * Enrichissement d'IDENTITÉ des ETF promus — maillon 2 du pipeline. Dérive
 * `issuer` (marque→gérant) et `region` (exposition) depuis le NOM du fonds et
 * complète les champs manquants. Avec l'identité complète + une série de cours
 * (maillon 1 « wiring »), `activation.ts` (voie « tradeabilité prouvée ») activera
 * automatiquement le fonds.
 *
 * Ciblé par défaut sur les ETF déjà WIRÉS (`yahoo_symbol` présent) : c'est là que
 * l'identité débloque réellement l'activation. `ENRICH_ALL=1` pour tous les promus.
 *
 * Non destructif : ne remplit QUE des champs `NULL` (jamais d'écrasement),
 * n'active aucun fonds (`is_active` inchangé). Anti-invention (§1.3) : ne pose que
 * ce que le nom affirme (marque connue / géographie claire) ; sinon laisse `NULL`.
 * Logique de dérivation pure/testée (`src/lib/data-engine/identity.ts`).
 *
 * Usage :
 *   bun run scripts/enrich-catalog-identity.ts                 (dry-run : rapport)
 *   SEEDOW_PERSIST=1 bun run scripts/enrich-catalog-identity.ts  (écrit ; secrets requis)
 * Env optionnel :
 *   ENRICH_LIMIT  max d'ETF traités (défaut 500)
 *   ENRICH_ALL=1  tous les promus, pas seulement les wirés
 */

import { deriveIdentityFromName } from "../src/lib/data-engine/identity";

const ASSETS_PAGE = 1000; // plafond PostgREST

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

interface AssetRow {
  id: string;
  name: string;
  issuer: string | null;
  region: string | null;
  yahoo_symbol: string | null;
}

async function loadPromotedNeedingIdentity(admin: Admin, wiredOnly: boolean): Promise<AssetRow[]> {
  const out: AssetRow[] = [];
  let from = 0;
  for (;;) {
    let q = admin
      .from("assets")
      .select("id, name, issuer, region, yahoo_symbol")
      .not("catalog_listing_key", "is", null)
      .eq("is_active", false)
      .or("issuer.is.null,region.is.null");
    if (wiredOnly) q = q.not("yahoo_symbol", "is", null);
    const { data, error } = await q.range(from, from + ASSETS_PAGE - 1);
    if (error) throw new Error(`load promoted assets: ${error.message}`);
    const rows = (data ?? []) as AssetRow[];
    out.push(...rows);
    if (rows.length < ASSETS_PAGE) break;
    from += ASSETS_PAGE;
  }
  return out;
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const doPersist = process.env.SEEDOW_PERSIST === "1";
  const limit = Math.max(1, Number(process.env.ENRICH_LIMIT) || 500);
  const wiredOnly = process.env.ENRICH_ALL !== "1";
  console.log(`[identity] persist: ${doPersist} · limit: ${limit} · wiredOnly: ${wiredOnly}`);

  const { supabaseAdmin } = await import("../src/integrations/supabase/client.server");
  const admin = supabaseAdmin as Admin;

  const rows = await loadPromotedNeedingIdentity(admin, wiredOnly);
  console.log(`[identity] promus à compléter: ${rows.length}`);

  let considered = 0;
  let issuerSet = 0;
  let regionSet = 0;
  let updated = 0;
  let errors = 0;

  for (const a of rows) {
    if (updated >= limit) break;
    const d = deriveIdentityFromName(a.name);
    // On ne remplit qu'un champ NULL par une valeur non nulle dérivée.
    const patch: { issuer?: string; region?: string } = {};
    if (a.issuer == null && d.issuer != null) patch.issuer = d.issuer;
    if (a.region == null && d.region != null) patch.region = d.region;
    if (Object.keys(patch).length === 0) continue;
    considered++;
    if (patch.issuer) issuerSet++;
    if (patch.region) regionSet++;

    if (!doPersist) continue;
    const { error } = await admin.from("assets").update(patch).eq("id", a.id);
    if (error) {
      errors++;
      console.error(`[identity] update ${a.id} error: ${error.message}`);
    } else {
      updated++;
    }
  }

  console.log(
    `[identity] traités=${considered} issuer posés=${issuerSet} region posés=${regionSet} ` +
      `écrits=${updated} erreurs=${errors}`,
  );

  if (!doPersist) {
    console.log("[identity] dry-run (SEEDOW_PERSIST != 1) — aucun champ écrit.");
    return;
  }

  const status = errors === 0 ? "ok" : updated > 0 ? "partial" : "error";
  await admin.from("cron_run_log").insert({
    job_name: "enrich-catalog-identity",
    status,
    message: `${updated} ETF enrichis (issuer/region) depuis le nom`,
    assets_ok: updated,
    assets_failed: errors,
    duration_ms: Date.now() - startedAt,
    details: { considered, issuerSet, regionSet, updated, limit, wiredOnly },
  });

  console.log(`[identity] DONE status=${status} updated=${updated} errors=${errors}`);
}

main().catch((e) => {
  console.error("[identity] fatal:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
