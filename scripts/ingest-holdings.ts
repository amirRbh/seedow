#!/usr/bin/env bun
/**
 * Ingestion des HOLDINGS — composition officielle des fonds iShares.
 *
 * Le pipeline (`lib/data-engine/holdings-ingest`) existait et ne ramenait rien :
 * il visait l'ancien endpoint CSV de BlackRock, retiré lors de la migration du
 * site. L'URL répond 200 avec la page HTML du fonds — un « succès » qui ne
 * contient aucune position. Ce script branche la source qui existe vraiment :
 * l'API produit, qui sert un classeur SpreadsheetML daté.
 *
 * Il fait passer chaque fonds par la MÊME chaîne que le reste du Data Engine —
 * contrôles qualité, provenance, écriture — pour que rien n'ait à changer le
 * jour où un autre émetteur s'y ajoute.
 *
 * Sans `SEEDOW_PERSIST=1`, rien n'est écrit : le script rend le compte-rendu et
 * s'arrête. C'est le défaut, pour qu'un lancement de vérification ne touche
 * jamais la base par accident.
 *
 * Usage :
 *   bun run scripts/ingest-holdings.ts                  # à blanc, compte-rendu
 *   SEEDOW_PERSIST=1 bun run scripts/ingest-holdings.ts # écrit réellement
 *   bun run scripts/ingest-holdings.ts IE00B4L5Y983 …   # se limite à ces ISIN
 */
import { createClient } from "@supabase/supabase-js";
import { ingestHoldingsForAssets } from "../src/lib/data-engine/holdings-ingest";
import type { HoldingsIngestAsset } from "../src/lib/data-engine/holdings-ingest";
import { supabaseHoldingWriter } from "../src/lib/data-engine/holdings.supabase";
import { ISHARES_FUNDS, resolveISharesPortfolioId } from "../src/lib/data-engine/ishares-funds";
import { iSharesHoldingsUrl, parseISharesHoldings } from "../src/lib/data-engine/ishares-holdings";

const PERSIST = process.env.SEEDOW_PERSIST === "1";
const only = new Set(
  process.argv
    .slice(2)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
);

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
  process.exit(1);
}
const admin = createClient(url, key);

/**
 * Les fonds du catalogue pour lesquels une source de composition existe.
 * L'appariement se fait sur l'ISIN : un fonds du catalogue absent du registre
 * n'est pas ingéré, et ce n'est pas une erreur — c'est le cas courant.
 */
async function targetAssets(): Promise<HoldingsIngestAsset[]> {
  const isins = ISHARES_FUNDS.map((f) => f.isin).filter((i) => only.size === 0 || only.has(i));
  if (isins.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("assets")
    .select("id, ticker, name, isin, issuer")
    .eq("is_active", true)
    .in("isin", isins);
  if (error) throw new Error(`assets: ${error.message}`);
  return (data ?? []) as HoldingsIngestAsset[];
}

async function main() {
  const assets = await targetAssets();
  console.log(
    `${ISHARES_FUNDS.length} fonds au registre · ${assets.length} présents dans le catalogue` +
      (only.size > 0 ? ` · filtre : ${[...only].join(", ")}` : "") +
      (PERSIST ? " · ÉCRITURE" : " · à blanc (SEEDOW_PERSIST=1 pour écrire)"),
  );
  if (assets.length === 0) {
    // Aucun appariement : le dire, plutôt que de laisser croire à un succès vide.
    console.log("Aucun fonds du registre n'est présent dans le catalogue actif.");
    return;
  }

  const { results, summary } = await ingestHoldingsForAssets(assets, {
    resolveUrl: (a) => {
      const pid = resolveISharesPortfolioId(a.isin);
      return pid ? { url: iSharesHoldingsUrl(pid), sourceId: null } : null;
    },
    download: async (u: string) => {
      const res = await fetch(u, { signal: AbortSignal.timeout(90_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    },
    parse: parseISharesHoldings,
    // À blanc, l'écrivain ne fait rien : la chaîne complète tourne quand même,
    // contrôles qualité compris, pour que le compte-rendu soit représentatif.
    writer: PERSIST ? supabaseHoldingWriter(admin) : { replaceForAsset: async () => 0 },
  });

  for (const r of results) {
    const a = assets.find((x) => x.id === r.assetId);
    console.log(
      `  ${r.status.padEnd(12)} ${(a?.isin ?? r.assetId).padEnd(14)} ${String(r.inserted).padStart(5)} positions  ${r.asOf ?? "—"}  ${a?.name ?? ""}`,
    );
    if (r.error) console.log(`      ${r.error}`);
  }
  console.log(
    `\n${summary.ingested} ingéré(s) · ${summary.holdingsInserted} positions · ` +
      `${summary.no_source} sans source · ${summary.fetch_failed} en échec · ${summary.rejected} rejeté(s)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
