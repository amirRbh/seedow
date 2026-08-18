/**
 * Étage « Explanation » du pipeline — transforme un portefeuille construit en
 * une explication lisible et VÉRIFIABLE : « pourquoi Seedow propose ça ».
 *
 * Purement déterministe, dérivé UNIQUEMENT des vrais poids/métriques + de la
 * qualité de données réelle. Aucun texte en dur (clés i18n + valeurs), aucune
 * donnée inventée. L'optimisation n'est pas une boîte noire : chaque nombre
 * affiché ici est traçable jusqu'à un calcul du moteur.
 */

import type {
  DataQualitySummary,
  PortfolioExplanation,
  PortfolioMetrics,
  PortfolioParams,
  PortfolioWeights,
} from "./types";
import { MAX_SINGLE_WEIGHT } from "./types";
import { riskBand } from "./plain-language";

export interface ExplanationInput {
  weights: PortfolioWeights;
  metrics: PortfolioMetrics;
  params: PortfolioParams;
  dataQuality: DataQualitySummary;
  esgFloorRelaxed: boolean;
}

/** Diversification (1 − HHI) → note sur 10, bornée et arrondie à 0,1 près. */
export function diversificationScore10(diversification: number): number {
  const d = Number.isFinite(diversification) ? Math.min(1, Math.max(0, diversification)) : 0;
  return Math.round(d * 100) / 10;
}

export function buildExplanation(input: ExplanationInput): PortfolioExplanation {
  const { weights, metrics, params, dataQuality, esgFloorRelaxed } = input;
  const ids = Object.keys(weights);
  const positionCount = ids.length;
  const maxWeight = ids.reduce((mx, id) => Math.max(mx, weights[id]), 0);
  const risk = riskBand(metrics.volatility).level;
  const div10 = diversificationScore10(metrics.diversification);

  const highlights: PortfolioExplanation["highlights"] = [];
  highlights.push({ key: "portfolio_explain.positions", vars: { count: positionCount } });
  highlights.push({
    key: "portfolio_explain.max_concentration",
    vars: { pct: Math.round(maxWeight * 100) },
  });
  highlights.push({
    key: "portfolio_explain.diversification",
    vars: { score: div10 },
  });
  if (params.exclusions.length > 0) {
    highlights.push({
      key: "portfolio_explain.exclusions",
      vars: { count: params.exclusions.length },
    });
  }
  if (params.causes.length > 0) {
    highlights.push({ key: "portfolio_explain.causes", vars: { count: params.causes.length } });
  }
  // Transparence sur la qualité de données : combien de lignes s'appuient sur
  // des données de marché réelles vs un repli (jamais présenté comme réel).
  highlights.push({
    key: "portfolio_explain.real_data",
    vars: { pct: Math.round(dataQuality.full_weight_share * 100) },
  });
  if (esgFloorRelaxed) {
    highlights.push({ key: "portfolio_explain.esg_relaxed" });
  }

  // Phrase de synthèse : on choisit la clé selon le nombre de contraintes
  // réellement actives, pour que la promesse corresponde au portefeuille.
  const summary_key =
    params.causes.length > 0 || params.exclusions.length > 0
      ? "portfolio_explain.summary.aligned"
      : "portfolio_explain.summary.default";

  return {
    risk_level: risk,
    diversification_10: div10,
    position_count: positionCount,
    max_weight: maxWeight,
    real_data_share: dataQuality.full_weight_share,
    highlights,
    summary_key,
  };
}

/** Garantit que MAX_SINGLE_WEIGHT reste la borne annoncée dans l'explication. */
export const EXPLAINED_MAX_WEIGHT = MAX_SINGLE_WEIGHT;
