import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadUniverse } from "../universe.server";
import type { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Régression : une colonne d'enrichissement en retard sur la base live (ex.
 * `stats_observations`, migration N4 non appliquée) faisait rejeter par
 * PostgREST la TOTALITÉ du select `assets` (code 42703) — et
 * loadUniverse jetait « Univers d'actifs indisponible », coupant onboarding,
 * simulateur ET génération d'un coup. loadUniverse doit désormais retomber sur
 * le socle de colonnes stables et continuer en dégradé, pas tomber en panne.
 */

interface StubResult {
  data?: unknown;
  error?: { code: string; message: string } | null;
}

/** Chaîne fluide minimale : .select(cols).eq(...).eq(...) résolue en `resolve(cols)`. */
function makeChain(resolve: (cols: string) => StubResult) {
  const chain: Record<string, unknown> = {};
  let cols = "";
  chain.select = (c: string) => {
    cols = c;
    return chain;
  };
  chain.eq = () => chain;
  chain.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
    Promise.resolve(resolve(cols)).then(onF, onR);
  return chain;
}

const CORE_ROW = {
  id: "a1",
  ticker: "AAA",
  name: "Fonds A",
  asset_class: "equity",
  region: "Monde",
  ter: 0.002,
  esg_score: 7,
  env_score: 6,
  social_score: 7,
  governance_score: 8,
  esg_score_source: "MSCI",
  carbon_intensity_gco2e_per_eur: null,
  carbon_intensity_source: null,
  carbon_intensity_updated_at: null,
  sfdr_article: 8,
  expected_return: 0.06,
  volatility: 0.15,
  cause_exposure: { climat: 0.5 },
  excluded_sectors: [],
  description: "desc",
};

describe("loadUniverse — résilience au schéma", () => {
  beforeEach(() => {
    // Le cache module-level survit entre tests : on le vide en avançant l'horloge
    // au-delà du TTL (5 min) n'aide pas au 1er appel, mais garantit l'isolation si
    // d'autres tests s'ajoutent. Ici chaque test part d'un cache neuf de fait.
    vi.restoreAllMocks();
  });

  it("retombe sur le socle quand une colonne d'enrichissement manque (42703), sans jeter", async () => {
    let assetsSelectCount = 0;
    const client = {
      from(table: string) {
        if (table === "assets") {
          return makeChain((cols) => {
            assetsSelectCount += 1;
            // 1er essai : socle + enrichissement → colonne inconnue en base live.
            if (cols.includes("stats_observations")) {
              return {
                error: {
                  code: "42703",
                  message: "column assets.stats_observations does not exist",
                },
              };
            }
            // Repli : socle seul → succès.
            return { data: [CORE_ROW] };
          });
        }
        if (table === "asset_covariance") return makeChain(() => ({ data: [] }));
        // carbon_estimates_latest : absente aussi, mais non bloquante.
        return makeChain(() => ({ error: { code: "42P01", message: "relation does not exist" } }));
      },
    } as unknown as typeof supabaseAdmin;

    const universe = await loadUniverse(client);

    // A tenté le select complet PUIS le repli sur le socle.
    expect(assetsSelectCount).toBe(2);
    expect(universe.assets).toHaveLength(1);
    const asset = universe.assets[0];
    expect(asset.id).toBe("a1");
    expect(asset.expected_return).toBe(0.06);
    // Champs d'enrichissement absents → null (le moteur dégrade proprement :
    // classifyDataQuality lira stats_observations null comme « insufficient »).
    expect(asset.stats_observations).toBeNull();
    expect(asset.waci_tco2e_per_musd_sales).toBeNull();
  });
});
