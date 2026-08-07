/**
 * Parcours « Personnaliser » — persistance des pondérations éditées à la main.
 *
 * L'utilisateur part de la proposition Seedow et l'ajuste (retirer, repondérer).
 * On recalcule alors les métriques RÉELLES côté serveur (volatilité, frais, ESG,
 * diversification) via le même `computeMetrics` que le moteur, puis on sauvegarde
 * les poids + métriques et on marque le portefeuille `is_custom = true` pour ne
 * pas l'écraser silencieusement.
 *
 * On ne réoptimise pas : ce sont les choix de l'utilisateur qui priment. On se
 * contente de mesurer honnêtement leur portefeuille.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeMetrics } from "./metrics";
import { causeToPillarWeights, type Asset, type CauseTag, type PortfolioMetrics } from "./types";
import { loadUniverse } from "./universe.server";

const InputSchema = z.object({
  portfolio_id: z.string().uuid(),
  /** { asset_id: poids (0..1) } — au moins une ligne strictement positive. */
  weights: z.record(z.string().uuid(), z.number().min(0).max(1)),
});

const CreateInputSchema = z.object({
  /** { asset_id: poids (0..1) } — au moins une ligne strictement positive. */
  weights: z.record(z.string().uuid(), z.number().min(0).max(1)),
  /** Nom du portefeuille construit à la main. */
  name: z.string().min(1).max(80).optional(),
});

/**
 * Normalise des poids bruts et recalcule les métriques RÉELLES pour ces poids
 * (pas de réoptimisation), avec la pondération de piliers ESG fournie. Partagé
 * par la sauvegarde (Personnaliser) et la création (Page blanche).
 */
function normalizeAndMeasure(
  rawWeights: Record<string, number>,
  byId: Map<string, Asset>,
  covariance: Map<string, number>,
  causes: CauseTag[],
): { weights: Record<string, number>; metrics: PortfolioMetrics; pool: Asset[] } {
  const kept: { id: string; weight: number }[] = [];
  let total = 0;
  for (const id in rawWeights) {
    const w = rawWeights[id];
    if (w > 0 && byId.has(id)) {
      kept.push({ id, weight: w });
      total += w;
    }
  }
  if (kept.length === 0 || total <= 0) {
    throw new Error("Votre portefeuille doit contenir au moins un investissement.");
  }
  const weights: Record<string, number> = {};
  for (const k of kept) weights[k.id] = k.weight / total;

  const pool = kept.map((k) => byId.get(k.id)!);
  const cov = buildCovariance(pool, covariance);
  const expectedReturns = pool.map((a) => a.expected_return);
  const pillarWeights = causeToPillarWeights(causes);
  const metrics = computeMetrics(pool, weights, cov, expectedReturns, pillarWeights);
  return { weights, metrics, pool };
}

/**
 * Construit la sous-matrice de covariance pour un sous-ensemble d'actifs, avec
 * la même règle de repli que le moteur : diagonale manquante → volatility²
 * (jamais 0), hors-diagonale manquante → 0 (non-corrélé).
 */
function buildCovariance(assets: Asset[], covMap: Map<string, number>): number[][] {
  const n = assets.length;
  const cov: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      const key = `${assets[i].id}|${assets[j].id}`;
      const fallback = i === j ? assets[i].volatility ** 2 : 0;
      row.push(covMap.get(key) ?? fallback);
    }
    cov.push(row);
  }
  return cov;
}

export const saveCustomPortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase: userClient } = context;

    // 1) Récupère le portefeuille de l'utilisateur (causes → pondération des piliers ESG).
    const { data: pf, error: pfErr } = await userClient
      .from("portfolios")
      .select("id, causes")
      .eq("id", data.portfolio_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (pfErr || !pf) throw new Error("Portefeuille introuvable.");

    // 2) Normalise les poids et ne garde que les lignes réellement présentes dans l'univers.
    const universe = await loadUniverse(userClient as typeof supabaseAdmin);
    const byId = new Map(universe.assets.map((a) => [a.id, a]));
    const kept: { id: string; weight: number }[] = [];
    let total = 0;
    for (const id in data.weights) {
      const w = data.weights[id];
      if (w > 0 && byId.has(id)) {
        kept.push({ id, weight: w });
        total += w;
      }
    }
    if (kept.length === 0 || total <= 0) {
      throw new Error("Votre portefeuille doit contenir au moins un investissement.");
    }

    const weights: Record<string, number> = {};
    for (const k of kept) weights[k.id] = k.weight / total;

    // 3) Recalcule les métriques réelles pour CES poids (pas de réoptimisation).
    const pool = kept.map((k) => byId.get(k.id)!);
    const cov = buildCovariance(pool, universe.covariance);
    const expectedReturns = pool.map((a) => a.expected_return);
    const pillarWeights = causeToPillarWeights((pf.causes ?? []) as CauseTag[]);
    const metrics = computeMetrics(pool, weights, cov, expectedReturns, pillarWeights);

    // 4) Sauvegarde : poids + métriques + marqueur custom.
    const { error: updErr } = await userClient
      .from("portfolios")
      .update({
        weights,
        metrics: metrics as unknown as Record<string, unknown>,
        is_custom: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .eq("id", data.portfolio_id)
      .eq("user_id", userId);
    if (updErr) {
      console.error("[saveCustomPortfolio] update error:", updErr);
      throw new Error("Impossible d'enregistrer vos modifications. Réessaie dans un instant.");
    }

    return { portfolio_id: data.portfolio_id, weights, metrics };
  });

/**
 * Parcours « Page blanche » — crée un NOUVEAU portefeuille actif à partir de
 * lignes choisies entièrement à la main. Comme Personnaliser, on ne réoptimise
 * pas : on mesure honnêtement les poids de l'utilisateur. Mode « replace » :
 * on désactive les portefeuilles actifs existants (le trigger DB borne à 3
 * actifs), puis on insère celui-ci comme actif et `is_custom`.
 */
export const createCustomPortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase: userClient } = context;

    const universe = await loadUniverse(userClient as typeof supabaseAdmin);
    const byId = new Map(universe.assets.map((a) => [a.id, a]));
    // Page blanche : aucune cause déclarée → pondération de piliers ESG par défaut.
    const { weights, metrics } = normalizeAndMeasure(data.weights, byId, universe.covariance, []);

    // 1) Désactive les portefeuilles actifs existants (mode replace).
    const { error: deactivateErr } = await userClient
      .from("portfolios")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true)
      .select("id");
    if (deactivateErr) {
      console.error("[createCustomPortfolio] deactivate error:", deactivateErr);
      throw new Error(
        "Impossible de désactiver le portefeuille précédent. Réessaie dans un instant.",
      );
    }

    // 2) Insère le nouveau portefeuille custom comme actif.
    const { data: inserted, error } = await userClient
      .from("portfolios")
      .insert({
        user_id: userId,
        name: data.name ?? "Mon portefeuille",
        causes: [],
        cause_intensity: {},
        exclusions: [],
        risk_target: 0.09,
        horizon_years: 10,
        initial_amount: 100,
        weights,
        metrics: metrics as unknown as Record<string, unknown>,
        methodology_version: "custom-v1",
        is_custom: true,
        is_active: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select()
      .single();

    if (error) {
      console.error("[createCustomPortfolio] insert error:", error);
      // Course rare avec la contrainte « un seul actif » : on retombe sur l'actif existant.
      if (error.code === "23505") {
        const { data: existing } = await userClient
          .from("portfolios")
          .select("id")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing) {
          await userClient.from("profiles").update({ onboarding_completed: true }).eq("id", userId);
          return { portfolio_id: existing.id, weights, metrics };
        }
      }
      throw new Error("Impossible d'enregistrer votre portefeuille. Réessaie dans un instant.");
    }

    await userClient.from("profiles").update({ onboarding_completed: true }).eq("id", userId);
    return { portfolio_id: inserted.id, weights, metrics };
  });
