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
 * Le passage à blanc ne demande AUCUN accès base : sans identifiants, il prend
 * le registre iShares pour cible et déroule quand même toute la chaîne
 * (téléchargement, lecture, contrôles qualité). C'est ce qui permet de vérifier
 * qu'une source répond avant de sortir une clé de service — et le premier geste
 * de qui reprend ce pipeline.
 *
 * Usage :
 *   bun run scripts/ingest-holdings.ts                  # à blanc, sans base
 *   SEEDOW_PERSIST=1 bun run scripts/ingest-holdings.ts # écrit réellement
 *   bun run scripts/ingest-holdings.ts IE00B4L5Y983 …   # se limite à ces ISIN
 */
import { createClient } from "@supabase/supabase-js";
import { ingestHoldingsForAssets } from "../src/lib/data-engine/holdings-ingest";
import type { HoldingsIngestAsset } from "../src/lib/data-engine/holdings-ingest";
import { supabaseHoldingWriter } from "../src/lib/data-engine/holdings.supabase";
import { ISHARES_REGISTRY, resolveISharesFund } from "../src/lib/data-engine/ishares-funds";
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

// L'écriture exige la clé de service : `fund_holdings` n'est accessible en
// écriture qu'à `service_role` (RLS, migration fondatrice). La clé publique
// serait refusée — autant le dire tout de suite plutôt qu'au 21e fonds.
if (PERSIST && (!url || !key)) {
  console.error("SEEDOW_PERSIST=1 exige SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const admin = url && key ? createClient(url, key) : null;

/**
 * Les fonds du catalogue pour lesquels une source de composition existe.
 * L'appariement se fait sur l'ISIN : un fonds du catalogue absent du registre
 * n'est pas ingéré, et ce n'est pas une erreur — c'est le cas courant.
 */
/** Un filtre `--only` accepte aussi bien un ISIN qu'un ticker. */
function selected(f: { isin: string; ticker: string | null }): boolean {
  if (only.size === 0) return true;
  return only.has(f.isin.toUpperCase()) || (f.ticker != null && only.has(f.ticker.toUpperCase()));
}

async function targetAssets(): Promise<{
  assets: HoldingsIngestAsset[];
  fromCatalogue: boolean;
  catalogueSize?: number;
}> {
  const refs = ISHARES_REGISTRY.filter(selected);
  if (refs.length === 0) return { assets: [], fromCatalogue: false };

  // Sans base, le registre lui-même fait la liste des cibles : on vérifie les
  // sources, pas l'appariement au catalogue. L'`id` est alors l'ISIN — il ne
  // sert qu'à identifier les lignes du compte-rendu, rien n'étant écrit.
  if (!admin) {
    return {
      assets: refs.map((f) => ({
        id: f.isin,
        ticker: f.ticker ?? f.isin,
        name: f.name,
        isin: f.isin,
        issuer: "iShares",
      })),
      fromCatalogue: false,
    };
  }

  // On lit tout le catalogue actif et on apparie EN MÉMOIRE, plutôt que de
  // filtrer sur `isin` côté base.
  //
  // Le filtre `.in("isin", …)` rendait systématiquement zéro ligne, pour deux
  // raisons qui se cumulaient : la colonne `assets.isin` est vide sur tout le
  // catalogue (`data/catalog-isins.csv` n'a jamais été renseigné), et le
  // registre ne listait que des UCITS irlandais quand le catalogue est composé
  // d'ETF américains. Aucun ISIN d'un côté, aucun ISIN correspondant de
  // l'autre : l'intersection ne pouvait pas être autre chose que vide.
  //
  // `resolveISharesFund` apparie sur l'ISIN quand il existe, sur le ticker
  // sinon — c'est ainsi que l'émetteur lui-même désigne ces fonds.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("assets")
    .select("id, ticker, name, isin, issuer")
    .eq("is_active", true);
  if (error) throw new Error(`assets: ${error.message}`);

  const wanted = new Set(refs.map((f) => f.portfolioId));
  const matched = ((data ?? []) as HoldingsIngestAsset[]).filter((a) => {
    const ref = resolveISharesFund(a);
    return ref != null && wanted.has(ref.portfolioId);
  });
  return { assets: matched, fromCatalogue: true, catalogueSize: (data ?? []).length };
}

async function main() {
  const { assets, fromCatalogue, catalogueSize } = await targetAssets();
  const registrySize = ISHARES_REGISTRY.filter(selected).length;
  console.log(
    `${registrySize} fonds au registre · ${assets.length} cible(s)` +
      (fromCatalogue
        ? ` appariée(s) sur ${catalogueSize ?? 0} actifs actifs`
        : " (registre seul — pas d'accès base)") +
      (only.size > 0 ? ` · filtre : ${[...only].join(", ")}` : "") +
      (PERSIST ? " · ÉCRITURE" : " · à blanc (SEEDOW_PERSIST=1 pour écrire)"),
  );

  // ── Garde-fou : zéro cible sur un registre non vide est une PANNE ───────
  //
  // Ce script s'est déjà terminé en code 0 sur « 21 fonds au registre · 0
  // cible ». Techniquement, rien n'avait échoué : aucun téléchargement, aucune
  // écriture, aucune exception. Sauf qu'un pipeline d'ingestion qui n'ingère
  // rien n'a pas réussi — et un vert en CI sur un travail non fait est pire
  // qu'un rouge, parce qu'il ferme la question.
  //
  // La condition est étroite à dessein : un registre vide (filtre `--only` qui
  // ne désigne rien) reste une sortie normale, tout comme un catalogue qui
  // aurait légitimement perdu ces fonds — mais ce dernier cas se signale, il
  // ne se devine pas.
  if (registrySize > 0 && assets.length === 0) {
    console.error(
      `\n✗ ${registrySize} fonds au registre, aucun apparié au catalogue.\n` +
        `  Le registre apparie sur l'ISIN puis sur le ticker. Aucun des deux n'a répondu :\n` +
        `  soit le catalogue ne contient pas ces fonds, soit leurs identifiants ont changé.\n` +
        `  Rien n'a été téléchargé ni écrit.`,
    );
    process.exit(1);
  }
  if (assets.length === 0) {
    console.log("Le filtre ne désigne aucun fonds du registre.");
    return;
  }

  const { results, summary } = await ingestHoldingsForAssets(assets, {
    resolveUrl: (a) => {
      const ref = resolveISharesFund(a);
      return ref ? { url: iSharesHoldingsUrl(ref.portfolioId, ref.site), sourceId: null } : null;
    },
    download: async (u: string) => {
      const res = await fetch(u, { signal: AbortSignal.timeout(90_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    },
    parse: parseISharesHoldings,
    // À blanc, l'écrivain compte les lignes sans rien écrire : la chaîne
    // complète tourne quand même, contrôles qualité compris, pour que le
    // compte-rendu soit représentatif.
    //
    // Il implémentait `replaceForAsset`, une méthode qui n'existe pas sur
    // `HoldingWriter` — le passage à blanc, c'est-à-dire le mode par défaut et
    // le premier geste de l'opérateur, plantait sur « insertHoldings is not a
    // function ». Rien ne l'avait signalé : `scripts/` est hors du périmètre de
    // `tsc` (voir `tsconfig.json`).
    writer:
      PERSIST && admin
        ? supabaseHoldingWriter(admin)
        : { insertHoldings: async (rows) => rows.length },
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
