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
import { causeToPillarWeights, type Asset, type CauseTag } from "./types";
import { loadUniverse } from "./universe.server";

const InputSchema = z.object({
  portfolio_id: z.string().uuid(),
  /** { asset_id: poids (0..1) } — au moins une ligne strictement positive. */
  weights: z.record(z.string().uuid(), z.number().min(0).max(1)),
});

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
