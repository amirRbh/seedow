import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildPortfolio, type Asset, type PortfolioParams } from "@/lib/portfolio";

// ─────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────
const CauseSchema = z.enum([
  "climat", "biodiversite", "humain", "egalite", "tech", "circulaire",
]);
const ExclusionSchema = z.enum([
  "fossiles", "armes", "tabac", "jeux", "animaux", "fast-fashion",
]);

const ParamsSchema = z.object({
  causes: z.array(CauseSchema).max(6),
  cause_intensity: z.record(CauseSchema, z.number().min(0).max(1)).default({}),
  exclusions: z.array(ExclusionSchema).max(6),
  risk_target: z.number().min(0.02).max(0.30),
  horizon_years: z.number().int().min(1).max(40),
  initial_amount: z.number().min(0).max(10_000_000),
});

// ─────────────────────────────────────────────────────────
// Universe loader (cached in module scope per Worker instance)
// ─────────────────────────────────────────────────────────
interface UniverseCache {
  assets: Asset[];
  covariance: Map<string, number>;
  loadedAt: number;
}
let _cache: UniverseCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function loadUniverse(
  client: typeof supabaseAdmin = supabaseAdmin,
): Promise<UniverseCache> {
  if (_cache && Date.now() - _cache.loadedAt < CACHE_TTL_MS && _cache.assets.length > 0) {
    return _cache;
  }
  const [assetsRes, covRes] = await Promise.all([
    client
      .from("assets")
      .select("id, ticker, name, asset_class, region, ter, esg_score, env_score, social_score, governance_score, esg_score_source, carbon_intensity_gco2e_per_eur, carbon_intensity_source, carbon_intensity_updated_at, sfdr_article, expected_return, volatility, cause_exposure, excluded_sectors, description")
      .eq("is_active", true),
    client
      .from("asset_covariance")
      .select("asset_a, asset_b, covariance"),
  ]);

  if (assetsRes.error) throw new Error(`assets: ${assetsRes.error.message}`);
  if (covRes.error) throw new Error(`covariance: ${covRes.error.message}`);

  const num = (v: unknown): number | null =>
    v == null ? null : Number(v);
  const str = (v: unknown): string | null =>
    v == null ? null : String(v);

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

  console.log(`[loadUniverse] loaded ${assets.length} assets, ${covariance.size} cov entries`);
  _cache = { assets, covariance, loadedAt: Date.now() };
  return _cache;
}

// ─────────────────────────────────────────────────────────
// Server functions
// ─────────────────────────────────────────────────────────

/**
 * Compute a portfolio in-memory without persisting.
 * Used by the methodology page simulator.
 */
export const simulatePortfolio = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ParamsSchema.parse(input))
  .handler(async ({ data }) => {
    const universe = await loadUniverse();
    const params: PortfolioParams = {
      causes: data.causes,
      cause_intensity: data.cause_intensity,
      exclusions: data.exclusions,
      risk_target: data.risk_target,
      horizon_years: data.horizon_years,
      initial_amount: data.initial_amount,
    };
    const result = buildPortfolio({
      universe: universe.assets,
      covariance: universe.covariance,
      params,
    });
    return {
      weights: result.weights,
      metrics: result.metrics,
      selected: result.selected_assets.map((a) => ({
        id: a.id,
        ticker: a.ticker,
        name: a.name,
        asset_class: a.asset_class,
        esg_score: a.esg_score,
        ter: a.ter,
      })),
      excluded_count: result.excluded_count,
      universe_size: universe.assets.length,
      methodology_version: result.methodology_version,
    };
  });

/**
 * Generate AND persist a portfolio for the authenticated user.
 */
export const generatePortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ParamsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase: userClient } = context;
    const universe = await loadUniverse(userClient as typeof supabaseAdmin);
    const params: PortfolioParams = {
      causes: data.causes,
      cause_intensity: data.cause_intensity,
      exclusions: data.exclusions,
      risk_target: data.risk_target,
      horizon_years: data.horizon_years,
      initial_amount: data.initial_amount,
    };
    const result = buildPortfolio({
      universe: universe.assets,
      covariance: universe.covariance,
      params,
    });

    // 1) Désactiver tous les portefeuilles actifs existants (await garanti via .select())
    const { error: deactivateErr } = await userClient
      .from("portfolios")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true)
      .select("id");

    if (deactivateErr) {
      console.error("[generatePortfolio] deactivate error:", deactivateErr);
      throw new Error(`Failed to deactivate previous portfolio: ${deactivateErr.message}`);
    }

    // 2) Insérer le nouveau portefeuille comme actif
    const { data: inserted, error } = await userClient
      .from("portfolios")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        user_id: userId,
        name: "Mon portefeuille",
        causes: data.causes,
        cause_intensity: data.cause_intensity,
        exclusions: data.exclusions,
        risk_target: data.risk_target,
        horizon_years: data.horizon_years,
        initial_amount: data.initial_amount,
        weights: result.weights,
        metrics: result.metrics as unknown as Record<string, unknown>,
        methodology_version: result.methodology_version,
        is_active: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select()
      .single();

    if (error) {
      console.error("[generatePortfolio] insert error:", error);
      // Si la contrainte unique a déclenché malgré tout (course rare), on retombe
      // sur le portefeuille actif existant plutôt que de planter l'UI.
      if (error.code === "23505") {
        const { data: existing } = await userClient
          .from("portfolios")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing) {
          await userClient
            .from("profiles")
            .update({ onboarding_completed: true })
            .eq("id", userId);
          return {
            portfolio_id: existing.id,
            weights: result.weights,
            metrics: result.metrics,
            selected: result.selected_assets.map((a) => ({
              id: a.id, ticker: a.ticker, name: a.name,
              asset_class: a.asset_class, esg_score: a.esg_score, ter: a.ter,
            })),
          };
        }
      }
      throw new Error(`Failed to save portfolio: ${error.message}`);
    }

    // Mark onboarding complete
    await userClient
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", userId);

    return {
      portfolio_id: inserted.id,
      weights: result.weights,
      metrics: result.metrics,
      selected: result.selected_assets.map((a) => ({
        id: a.id,
        ticker: a.ticker,
        name: a.name,
        asset_class: a.asset_class,
        esg_score: a.esg_score,
        ter: a.ter,
      })),
    };
  });
