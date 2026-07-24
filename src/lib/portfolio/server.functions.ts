import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildPortfolio, type PortfolioParams, type PortfolioResult } from "@/lib/portfolio";
import { loadUniverse } from "./universe.server";

// ─────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────
const CauseSchema = z.enum(["climat", "biodiversite", "humain", "egalite", "tech", "circulaire"]);
const ExclusionSchema = z.enum(["fossiles", "armes", "tabac", "jeux", "animaux", "fast-fashion"]);

const ParamsSchema = z.object({
  causes: z.array(CauseSchema).max(6),
  cause_intensity: z.record(CauseSchema, z.number().min(0).max(1)).default({}),
  exclusions: z.array(ExclusionSchema).max(6),
  risk_target: z.number().min(0.02).max(0.3),
  horizon_years: z.number().int().min(1).max(40),
  initial_amount: z.number().min(0).max(10_000_000),
  /** "replace" (default): deactivate all existing active portfolios. "create": add a new one alongside (max 3 enforced by DB trigger). */
  mode: z.enum(["replace", "create"]).default("replace"),
  /** Custom name for the new portfolio (used when creating multiple portfolios) */
  name: z.string().min(1).max(80).optional(),
});

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

    // Résumé d'impact réel : couverture par des données MSCI réelles + intensité
    // carbone WACI pondérée (sur la part couverte). Rien n'est extrapolé.
    const { computePortfolioWaci, relativeIntensityVsBenchmark } = await import("@/lib/esg/carbon");
    const portfolioWaci = computePortfolioWaci(
      result.selected_assets.map((a) => ({
        weight: result.weights[a.id] ?? 0,
        waci: a.waci_tco2e_per_musd_sales ?? null,
      })),
    );
    let msciWeight = 0;
    let qualityNum = 0;
    let qualityWeight = 0;
    for (const a of result.selected_assets) {
      const w = result.weights[a.id] ?? 0;
      if ((a.esg_score_source ?? "").startsWith("MSCI")) msciWeight += w;
      const q = a.msci_esg_quality_score;
      if (q != null && Number.isFinite(q)) {
        qualityNum += w * q;
        qualityWeight += w;
      }
    }
    const msciQuality = qualityWeight > 0 ? qualityNum / qualityWeight : null;

    // WACI de référence d'un ETF actions monde « classique » = indice PARENT
    // MSCI ACWI. Valeur VÉRIFIÉE : 115 tCO₂e/M$ de CA (Scope 1+2), ligne « Wtd
    // avg carbon intensity (t CO2e/$M sales) » du MSCI ACWI Climate Indexes
    // Report, as of 2026-06-30 (msci.com). Même métrique/scope que le WACI des
    // fiches fonds → comparaison homogène. À mettre à jour à chaque nouveau
    // rapport MSCI daté.
    const BENCHMARK_ACWI_WACI: number | null = 115;
    const vsBenchmark =
      BENCHMARK_ACWI_WACI != null
        ? relativeIntensityVsBenchmark(portfolioWaci.waci, BENCHMARK_ACWI_WACI)
        : null;

    return {
      weights: result.weights,
      metrics: result.metrics,
      selected: result.selected_assets.map((a) => ({
        id: a.id,
        ticker: a.ticker,
        name: a.name,
        asset_class: a.asset_class,
        esg_score: a.esg_score,
        esg_score_source: a.esg_score_source,
        ter: a.ter,
      })),
      impact: {
        /** Part du portefeuille notée avec des données MSCI réelles (0..1). */
        msci_coverage: msciWeight,
        /** Score de qualité ESG MSCI moyen pondéré (0-10), sur la part couverte. null sinon. */
        msci_quality: msciQuality,
        /** Intensité carbone WACI moyenne pondérée (tCO₂e/M$ CA), sur part couverte. */
        waci: portfolioWaci.waci,
        /** Part du portefeuille disposant d'un WACI réel (0..1). */
        waci_coverage: portfolioWaci.coverage,
        /** Écart relatif d'intensité vs ETF monde classique (null tant que benchmark non sourcé). */
        vs_benchmark_delta_pct: vsBenchmark?.deltaPct ?? null,
      },
      excluded_count: result.excluded_count,
      universe_size: universe.assets.length,
      esg_floor_relaxed: result.esg_floor_relaxed,
      methodology_version: result.methodology_version,
    };
  });

interface PersistedPortfolio {
  portfolio_id: string;
  weights: PortfolioResult["weights"];
  metrics: PortfolioResult["metrics"];
  selected: {
    id: string;
    ticker: string;
    name: string;
    asset_class: string;
    esg_score: number;
    ter: number;
  }[];
}

/**
 * Persiste le résultat de buildPortfolio pour un utilisateur : désactive
 * l'ancien portefeuille actif (mode "replace"), insère le nouveau, et si la
 * contrainte unique "un seul portefeuille actif par utilisateur" a déclenché
 * malgré tout (deux requêtes concurrentes de génération, course rare) —
 * retombe sur le portefeuille actif existant plutôt que de planter l'UI.
 *
 * Extrait de generatePortfolio() pour être testable indépendamment de
 * createServerFn/du middleware d'auth : `userClient` n'a besoin que de la
 * forme utilisée ci-dessous, pas d'un vrai client Supabase.
 */
export async function persistPortfolio(
  userClient: typeof supabaseAdmin,
  userId: string,
  data: z.infer<typeof ParamsSchema>,
  result: PortfolioResult,
): Promise<PersistedPortfolio> {
  const selected = result.selected_assets.map((a) => ({
    id: a.id,
    ticker: a.ticker,
    name: a.name,
    asset_class: a.asset_class,
    esg_score: a.esg_score,
    ter: a.ter,
  }));

  // 1) En mode "replace", désactiver tous les portefeuilles actifs existants.
  //    En mode "create", on conserve les jardins existants (le trigger DB applique la limite de 3).
  if (data.mode === "replace") {
    const { error: deactivateErr } = await userClient
      .from("portfolios")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true)
      .select("id");

    if (deactivateErr) {
      console.error("[generatePortfolio] deactivate error:", deactivateErr);
      throw new Error(
        "Impossible de désactiver le portefeuille précédent. Réessaie dans un instant.",
      );
    }
  }

  // 2) Insérer le nouveau portefeuille comme actif
  const { data: inserted, error } = await userClient
    .from("portfolios")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      user_id: userId,
      name: data.name ?? "Mon portefeuille",
      causes: data.causes,
      cause_intensity: data.cause_intensity,
      exclusions: data.exclusions,
      risk_target: data.risk_target,
      horizon_years: data.horizon_years,
      initial_amount: data.initial_amount,
      weights: result.weights,
      metrics: result.metrics as unknown as Record<string, unknown>,
      methodology_version: result.methodology_version,
      esg_floor_relaxed: result.esg_floor_relaxed,
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
        await userClient.from("profiles").update({ onboarding_completed: true }).eq("id", userId);
        return {
          portfolio_id: existing.id,
          weights: result.weights,
          metrics: result.metrics,
          selected,
        };
      }
    }
    throw new Error("Impossible d'enregistrer le portefeuille. Réessaie dans un instant.");
  }

  // Mark onboarding complete
  await userClient.from("profiles").update({ onboarding_completed: true }).eq("id", userId);

  return { portfolio_id: inserted.id, weights: result.weights, metrics: result.metrics, selected };
}

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

    return persistPortfolio(userClient as typeof supabaseAdmin, userId, data, result);
  });

const BacktestSchema = ParamsSchema.extend({
  /** Fenêtre d'estimation en jours de bourse (défaut ~1 an). */
  estimation_window: z.number().int().min(30).max(756).default(252),
  /** Fréquence de rebalancement en jours de bourse (défaut ~trimestriel). */
  rebalance_every: z.number().int().min(5).max(252).default(63),
});

const BACKTEST_HISTORY_DAYS = 1095; // ~3 ans

/** Sous-échantillonne une courbe à ~`target` points pour un payload léger. */
function downsample<T>(arr: T[], target = 180): T[] {
  if (arr.length <= target) return arr;
  const step = arr.length / target;
  const out: T[] = [];
  for (let i = 0; i < target; i++) out.push(arr[Math.floor(i * step)]);
  out.push(arr[arr.length - 1]);
  return out;
}

/**
 * Backtest walk-forward hors échantillon sur l'univers réel — réservé aux admins.
 *
 * ATTENTION coût : recalcule le modèle de risque (shrinkage Ledoit-Wolf,
 * O(n²·T)) à chaque rebalancement sur ~3 ans d'historique. C'est un outil
 * d'ÉVALUATION (valider une méthode, comparer au 1/N), pas une fonctionnalité
 * live à mettre sur un chemin de requête public : on dépasserait les limites CPU
 * d'un Worker Cloudflare. Gardé admin + rate-limité en conséquence.
 */
export const backtestPortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BacktestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { runBacktest } = await import("./backtest");
    const universe = await loadUniverse(supabase as typeof supabaseAdmin);

    const cutoff = new Date(Date.now() - BACKTEST_HISTORY_DAYS * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const pricesByAsset = new Map<string, { date: string; close: number }[]>();
    for (const a of universe.assets) {
      const { data: rows } = await (supabase as typeof supabaseAdmin)
        .from("asset_prices")
        .select("price_date, close")
        .eq("asset_id", a.id)
        .gte("price_date", cutoff)
        .order("price_date", { ascending: true });
      pricesByAsset.set(
        a.id,
        (rows ?? []).map((r) => ({ date: r.price_date as string, close: Number(r.close) })),
      );
    }

    const params: PortfolioParams = {
      causes: data.causes,
      cause_intensity: data.cause_intensity,
      exclusions: data.exclusions,
      risk_target: data.risk_target,
      horizon_years: data.horizon_years,
      initial_amount: data.initial_amount,
    };

    const result = runBacktest({
      universe: universe.assets,
      pricesByAsset,
      params,
      config: { estimationWindow: data.estimation_window, rebalanceEvery: data.rebalance_every },
    });

    // Payload léger : courbes sous-échantillonnées + métriques.
    return {
      dates: downsample(result.dates),
      seedow: { curve: downsample(result.seedow.curve), perf: result.seedow.perf },
      equalWeight: { curve: downsample(result.equalWeight.curve), perf: result.equalWeight.perf },
      oos_days: result.dates.length,
    };
  });

const RebalanceSchema = z.object({ portfolio_id: z.string().uuid() });

/**
 * Rééquilibre un portefeuille : déplace l'ancre de valorisation (`rebalanced_at`)
 * à maintenant. Les poids cibles (`weights`) ne changent pas — c'est le drift
 * entre cible et valorisation réelle qui est remis à zéro, comme si on avait
 * vendu/racheté pour revenir pile sur l'allocation cible. Pas de mouvement
 * d'argent réel : l'app est en mode simulation.
 */
export const rebalancePortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RebalanceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase: userClient } = context;
    const rebalancedAt = new Date().toISOString();
    const { data: updated, error } = await userClient
      .from("portfolios")
      .update({ rebalanced_at: rebalancedAt })
      .eq("id", data.portfolio_id)
      .eq("user_id", userId)
      .select("id, rebalanced_at")
      .maybeSingle();
    if (error) {
      throw new Error("Impossible de rééquilibrer le portefeuille. Réessaie dans un instant.");
    }
    if (!updated) {
      throw new Error("Portefeuille introuvable.");
    }
    return { portfolio_id: updated.id, rebalanced_at: updated.rebalanced_at as string };
  });
