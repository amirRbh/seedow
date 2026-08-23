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

const CauseSchema = z.enum(["climat", "biodiversite", "humain", "egalite", "tech", "circulaire"]);
const ExclusionSchema = z.enum(["fossiles", "armes", "tabac", "jeux", "animaux", "fast-fashion"]);

/**
 * Défauts du cadre chiffré quand le builder est ouvert sans passer par le
 * questionnaire (`/construire` en direct) : un montant de départ neutre et le
 * couple risque/horizon de l'objectif « épargne » (cf. `objectiveToRiskHorizon`).
 * Ce sont des valeurs de repli assumées, pas une réponse prêtée à l'utilisateur.
 */
export const DEFAULT_INITIAL_AMOUNT = 100;
export const DEFAULT_RISK_TARGET = 0.09;
export const DEFAULT_HORIZON_YEARS = 10;

const CreateInputSchema = z.object({
  /** { asset_id: poids (0..1) } — au moins une ligne strictement positive. */
  weights: z.record(z.string().uuid(), z.number().min(0).max(1)),
  /** Nom du portefeuille construit à la main. */
  name: z.string().min(1).max(80).optional(),
  /**
   * "replace" (défaut) : désactive les portefeuilles actifs existants avant
   * d'insérer celui-ci (premier portefeuille). "create" : ajoute à côté des
   * existants (le trigger DB borne à 3 actifs) — parcours « ajouter un
   * portefeuille » depuis le tableau de bord.
   */
  mode: z.enum(["replace", "create"]).default("replace"),
  /** Convictions de l'onboarding — conservées (pondération des piliers ESG + aval). */
  causes: z.array(CauseSchema).max(6).default([]),
  /** Exclusions de l'onboarding — conservées sur le portefeuille. */
  exclusions: z.array(ExclusionSchema).max(6).default([]),
  /**
   * Cadre chiffré posé par l'utilisateur au questionnaire. Absent (builder
   * ouvert en direct, sans passer par l'aperçu) → défauts déclarés ici, jamais
   * présentés comme un choix de l'utilisateur.
   */
  initial_amount: z.number().min(0).max(10_000_000).default(DEFAULT_INITIAL_AMOUNT),
  risk_target: z.number().min(0.02).max(0.3).default(DEFAULT_RISK_TARGET),
  horizon_years: z.number().int().min(1).max(40).default(DEFAULT_HORIZON_YEARS),
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
    // On conserve les convictions de l'onboarding : pondération des piliers ESG
    // dérivée des causes (pas de valeur neutre inventée quand elles existent).
    const { weights, metrics } = normalizeAndMeasure(
      data.weights,
      byId,
      universe.covariance,
      data.causes,
    );

    // 1) Mode "replace" : désactive les portefeuilles actifs existants avant
    //    d'insérer. Mode "create" : on garde les existants (ajout d'un
    //    portefeuille) — le trigger DB borne le nombre d'actifs.
    if (data.mode === "replace") {
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
    }

    // 2) Insère le nouveau portefeuille custom comme actif.
    const { data: inserted, error } = await userClient
      .from("portfolios")
      .insert({
        user_id: userId,
        name: data.name ?? "Mon portefeuille",
        causes: data.causes,
        // Pas de `cause_intensity` : l'intensité par cause n'entre plus dans
        // aucune formule (le classement ne connaît que la présence d'une
        // conviction). On ne l'écrit donc plus — la colonne reste en base pour
        // les portefeuilles antérieurs.
        exclusions: data.exclusions,
        // Cadre chiffré de l'utilisateur (questionnaire), pas une valeur en dur :
        // « Mon argent » sur Le Fil part du montant qu'il a réellement saisi.
        risk_target: data.risk_target,
        horizon_years: data.horizon_years,
        initial_amount: data.initial_amount,
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

const PreferencesInputSchema = z.object({
  /**
   * Portefeuille visé — celui que l'application affiche (`useUserPortfolios`,
   * choix mémorisé côté navigateur). Sans lui, on retombait sur « le plus
   * récent actif », qui n'est pas celui que l'utilisateur a sous les yeux dès
   * qu'il en a plusieurs : ses réglages partaient sur un autre portefeuille.
   */
  portfolio_id: z.string().uuid().optional(),
  causes: z.array(CauseSchema).max(6).default([]),
  exclusions: z.array(ExclusionSchema).max(6).default([]),
  risk_target: z.number().min(0.02).max(0.3),
  horizon_years: z.number().int().min(1).max(40),
  initial_amount: z.number().min(0).max(10_000_000),
});

/**
 * Enregistre les préférences du portefeuille actif — SANS toucher à sa
 * composition.
 *
 * Auparavant, bouger un curseur dans /reglages relançait l'optimiseur et
 * remplaçait le portefeuille : l'utilisateur composait ses lignes à la main,
 * puis les perdait 700 ms après avoir décoché une cause. Depuis que Seedow ne
 * propose plus d'allocation, la seule chose que /reglages a le droit de faire
 * est de mettre à jour les préférences et de RE-MESURER honnêtement les poids
 * existants (le score ESG pondère ses piliers selon les convictions : changer
 * de conviction change la mesure, pas la composition).
 *
 * Les poids ne sont jamais réécrits ici — seulement les métriques qui en
 * découlent, et uniquement si le portefeuille contient encore des lignes
 * connues de l'univers.
 */
export const savePortfolioPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PreferencesInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase: userClient } = context;

    // Portefeuille explicitement visé, sinon repli sur le plus ancien actif —
    // c'est la convention de `useUserPortfolios` (liste triée par ancienneté,
    // premier élément), donc le même que l'application montre par défaut.
    let query = userClient
      .from("portfolios")
      .select("id, weights")
      .eq("user_id", userId)
      .eq("is_active", true);
    query = data.portfolio_id
      ? query.eq("id", data.portfolio_id)
      : query.order("generated_at", { ascending: true }).limit(1);
    const { data: pf, error: pfErr } = await query.maybeSingle();
    if (pfErr) {
      console.error("[savePortfolioPreferences] load error:", pfErr);
      throw new Error("Impossible de charger ton portefeuille. Réessaie dans un instant.");
    }
    if (!pf) throw new Error("Aucun portefeuille actif à mettre à jour.");

    const update: Record<string, unknown> = {
      causes: data.causes,
      exclusions: data.exclusions,
      risk_target: data.risk_target,
      horizon_years: data.horizon_years,
      initial_amount: data.initial_amount,
    };

    // Re-mesure des poids EXISTANTS avec la nouvelle pondération de piliers.
    // Best-effort : un portefeuille vide (ou dont les lignes ont quitté
    // l'univers) garde ses métriques précédentes plutôt que de bloquer
    // l'enregistrement des préférences.
    let metrics: PortfolioMetrics | null = null;
    const existingWeights = (pf.weights ?? {}) as Record<string, number>;
    if (Object.keys(existingWeights).length > 0) {
      try {
        const universe = await loadUniverse(userClient as typeof supabaseAdmin);
        const byId = new Map(universe.assets.map((a) => [a.id, a]));
        const measured = normalizeAndMeasure(
          existingWeights,
          byId,
          universe.covariance,
          data.causes,
        );
        metrics = measured.metrics;
        update.metrics = metrics as unknown as Record<string, unknown>;
      } catch (err) {
        console.error("[savePortfolioPreferences] re-measure skipped:", err);
      }
    }

    const { error: updErr } = await userClient
      .from("portfolios")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(update as any)
      .eq("id", pf.id)
      .eq("user_id", userId);
    if (updErr) {
      console.error("[savePortfolioPreferences] update error:", updErr);
      throw new Error("Impossible d'enregistrer tes préférences. Réessaie dans un instant.");
    }

    return { portfolio_id: pf.id, metrics };
  });
