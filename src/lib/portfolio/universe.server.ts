/**
 * Univers investissable + matrice de covariance — chargé et mis en cache une
 * seule fois par instance de Worker (~5 min de TTL), partagé par tous les
 * appelants serveur (génération de portefeuille, simulateur d'arbitrages).
 *
 * Ce module existait en double (server.functions.ts et tradeoffs.functions.ts
 * avaient chacun leur propre loadUniverse() + cache local) — deux caches
 * indépendants pouvaient diverger jusqu'à 5 minutes l'un de l'autre, et toute
 * évolution de la logique de chargement devait être répliquée deux fois.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Asset } from "@/lib/portfolio";

export interface UniverseCache {
  assets: Asset[];
  covariance: Map<string, number>;
  loadedAt: number;
}

let _cache: UniverseCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function loadUniverse(
  client: typeof supabaseAdmin = supabaseAdmin,
): Promise<UniverseCache> {
  if (_cache && Date.now() - _cache.loadedAt < CACHE_TTL_MS && _cache.assets.length > 0) {
    return _cache;
  }
  const [assetsRes, covRes] = await Promise.all([
    client
      .from("assets")
      .select(
        "id, ticker, name, asset_class, region, ter, esg_score, env_score, social_score, governance_score, esg_score_source, carbon_intensity_gco2e_per_eur, carbon_intensity_source, carbon_intensity_updated_at, sfdr_article, expected_return, volatility, cause_exposure, excluded_sectors, description",
      )
      .eq("is_active", true),
    client.from("asset_covariance").select("asset_a, asset_b, covariance"),
  ]);

  if (assetsRes.error) {
    console.error("[loadUniverse] assets error:", assetsRes.error);
    throw new Error("Univers d'actifs indisponible.");
  }
  if (covRes.error) {
    console.error("[loadUniverse] covariance error:", covRes.error);
    throw new Error("Données de covariance indisponibles.");
  }

  const num = (v: unknown): number | null => (v == null ? null : Number(v));
  const str = (v: unknown): string | null => (v == null ? null : String(v));

  const assets = (assetsRes.data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: row.id,
      ticker: row.ticker,
      name: row.name,
      asset_class: row.asset_class,
      region: row.region,
      ter: Number(row.ter),
      esg_score: Number(row.esg_score),
      env_score: num(r.env_score),
      social_score: num(r.social_score),
      governance_score: num(r.governance_score),
      esg_score_source: str(r.esg_score_source),
      carbon_intensity_gco2e_per_eur: num(r.carbon_intensity_gco2e_per_eur),
      carbon_intensity_source: str(r.carbon_intensity_source),
      carbon_intensity_updated_at: str(r.carbon_intensity_updated_at),
      sfdr_article: row.sfdr_article,
      expected_return: Number(row.expected_return),
      volatility: Number(row.volatility),
      cause_exposure: (row.cause_exposure ?? {}) as Record<string, number>,
      excluded_sectors: (row.excluded_sectors ?? []) as Asset["excluded_sectors"],
      description: row.description,
    };
  }) as Asset[];

  const covariance = new Map<string, number>();
  for (const c of covRes.data ?? []) {
    covariance.set(`${c.asset_a}|${c.asset_b}`, Number(c.covariance));
  }

  _cache = { assets, covariance, loadedAt: Date.now() };
  return _cache;
}
