/**
 * Porte serveur de l'analyse.
 *
 * `analyzePortfolio` a besoin des `Asset` COMPLETS — secteurs exclus, volatilité,
 * frais, source ESG, historique de cours. Aucun écran ne les porte : le builder
 * ne connaît de chaque ligne que son ticker et son score, et Le Fil ne charge
 * qu'un sous-ensemble. Cette fonction fait le pont : elle charge l'univers,
 * mesure la composition, et rend l'analyse.
 *
 * Elle ne lit aucune donnée utilisateur et n'écrit rien — les poids arrivent du
 * client, repartent en analyse, et rien n'est persisté. Pas d'authentification
 * requise, comme `screenAssetPool` : c'est une lecture de l'univers public.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildCovariance } from "../covariance";
import { computeMetrics } from "../metrics";
import { causeToPillarWeights, type CauseTag, type ExclusionTag } from "../types";
import { loadUniverse } from "../universe.server";
import { sanitizeWeights } from "../weights";
import { analyzePortfolio, type AnalyzedLine, type PortfolioAnalysis } from "./analyzePortfolio";

const CauseSchema = z.enum(["climat", "biodiversite", "humain", "egalite", "tech", "circulaire"]);
const ExclusionSchema = z.enum(["fossiles", "armes", "tabac", "jeux", "animaux", "fast-fashion"]);

const InputSchema = z.object({
  /** { asset_id: poids (0..1) } — TELS QUE l'utilisateur les a posés. */
  weights: z.record(z.string().uuid(), z.number().min(0).max(1)),
  causes: z.array(CauseSchema).max(6).default([]),
  exclusions: z.array(ExclusionSchema).max(6).default([]),
  /** Horizon en années. Absent → la cohérence financière reste « inconnue ». */
  horizon_years: z.number().int().min(1).max(40).nullable().default(null),
});

export type AnalyzeCompositionResult = PortfolioAnalysis & {
  /** Lignes dont l'actif est introuvable dans l'univers — signalées, pas ignorées. */
  unknownAssets: string[];
};

export const analyzeComposition = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<AnalyzeCompositionResult> => {
    const universe = await loadUniverse();
    const byId = new Map(universe.assets.map((a) => [a.id, a]));

    // Les poids ne sont ni renormalisés ni complétés : c'est la composition de
    // l'utilisateur qu'on analyse, pas une version corrigée (cf. `../weights`).
    const weights = sanitizeWeights(data.weights);
    const unknownAssets = Object.keys(weights).filter((id) => !byId.has(id));
    const lines: AnalyzedLine[] = Object.entries(weights)
      .filter(([id]) => byId.has(id))
      .map(([id, weight]) => ({ asset: byId.get(id)!, weight }));

    // Métriques mesurées sur ces poids exacts — aucune réoptimisation.
    let metrics = null;
    if (lines.length > 0) {
      const pool = lines.map((l) => l.asset);
      const cov = buildCovariance(pool, universe.covariance);
      const measuredWeights = Object.fromEntries(lines.map((l) => [l.asset.id, l.weight]));
      metrics = computeMetrics(
        pool,
        measuredWeights,
        cov,
        pool.map((a) => a.expected_return),
        causeToPillarWeights(data.causes as CauseTag[]),
      );
    }

    const analysis = analyzePortfolio({
      lines,
      causes: data.causes as CauseTag[],
      exclusions: data.exclusions as ExclusionTag[],
      horizonYears: data.horizon_years,
      metrics,
    });

    return { ...analysis, unknownAssets };
  });
