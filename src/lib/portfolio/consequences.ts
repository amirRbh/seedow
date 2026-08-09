/**
 * Parcours « Personnaliser » — conséquences d'une édition d'allocation,
 * en langage clair (mission Seedow §3/§9).
 *
 * Ces fonctions sont PURES et ne calculent que ce qui est honnêtement dérivable
 * côté client à partir des pondérations et du score d'impact par ligne :
 * concentration, diversification et impact. Le risque (volatilité) et les frais
 * exacts dépendent de la covariance et du TER par actif — ils sont recalculés
 * précisément côté serveur au moment de la sauvegarde. On ne fabrique jamais
 * une valeur de risque côté client.
 */

import { diversificationBand, perceivedRisk } from "./plain-language";

export interface WeightedLine {
  id: string;
  /** Score d'impact de la ligne, sur 0..100. */
  esgScore: number;
  /** Poids de la ligne (0..1). */
  weight: number;
}

export interface LiteSnapshot {
  /** 1 − HHI (0..1). */
  diversification: number;
  /** Impact moyen pondéré (0..100). */
  impact: number;
  /** Poids de la plus grosse ligne (0..1). */
  maxWeight: number;
  /** Nombre de lignes réellement pondérées (> 0). */
  positions: number;
}

/** Normalise une carte de poids pour que la somme fasse 1 (ignore les poids ≤ 0). */
export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  let total = 0;
  for (const id in weights) if (weights[id] > 0) total += weights[id];
  const out: Record<string, number> = {};
  if (total <= 0) return out;
  for (const id in weights) if (weights[id] > 0) out[id] = weights[id] / total;
  return out;
}

/** Indice de Herfindahl (somme des carrés des poids). */
export function herfindahl(weights: number[]): number {
  let hhi = 0;
  for (const w of weights) hhi += w * w;
  return hhi;
}

/**
 * Instantané « léger » d'une allocation. Attend des lignes déjà normalisées
 * (somme des poids ≈ 1) ; sinon normalise défensivement.
 */
export function liteSnapshot(lines: WeightedLine[]): LiteSnapshot {
  const active = lines.filter((l) => l.weight > 0);
  const sum = active.reduce((s, l) => s + l.weight, 0);
  const norm = sum > 0 ? active.map((l) => ({ ...l, weight: l.weight / sum })) : [];
  const weights = norm.map((l) => l.weight);
  const hhi = herfindahl(weights);
  const impact = norm.reduce((s, l) => s + l.weight * l.esgScore, 0);
  const maxWeight = weights.reduce((m, w) => Math.max(m, w), 0);
  return {
    diversification: norm.length > 0 ? 1 - hhi : 0,
    impact,
    maxWeight,
    positions: norm.length,
  };
}

export type ChangeDir = "up" | "down" | "flat";

export interface Consequence {
  /** Clé i18n complète (portfolio_customizer.consequence.*). */
  key: string;
  dir: ChangeDir;
  vars?: Record<string, string | number>;
}

/** Une position pèse « beaucoup » au-delà de ce seuil. */
export const CONCENTRATION_ALERT = 0.4;
const IMPACT_EPSILON = 0.5; // pts sur 100
const CONCENTRATION_EPSILON = 0.02; // 2 pts de poids

/**
 * Compare deux instantanés et renvoie des conséquences lisibles.
 * Ordre : concentration d'abord (le message le plus important pour un débutant),
 * puis diversification (si la bande change), puis impact.
 */
export function describeConsequences(before: LiteSnapshot, after: LiteSnapshot): Consequence[] {
  const out: Consequence[] = [];

  // Concentration — variation notable du poids de la plus grosse ligne.
  const dMax = after.maxWeight - before.maxWeight;
  if (dMax > CONCENTRATION_EPSILON) {
    out.push({ key: "portfolio_customizer.consequence.more_concentrated", dir: "up" });
  } else if (dMax < -CONCENTRATION_EPSILON) {
    out.push({ key: "portfolio_customizer.consequence.less_concentrated", dir: "down" });
  }

  // Diversification — seulement si la BANDE change (évite le bruit).
  const bandBefore = diversificationBand(before.diversification).band;
  const bandAfter = diversificationBand(after.diversification).band;
  if (bandBefore !== bandAfter) {
    const order = { limitee: 0, correcte: 1, bonne: 2 } as const;
    const improved = order[bandAfter] > order[bandBefore];
    out.push({
      key: improved
        ? "portfolio_customizer.consequence.diversification_up"
        : "portfolio_customizer.consequence.diversification_down",
      dir: improved ? "up" : "down",
    });
  }

  // Risque RESSENTI — dérivé de la concentration seule, jamais présenté comme
  // une volatilité chiffrée (la mesure serveur reste la référence).
  const riskBefore = perceivedRisk(before.diversification);
  const riskAfter = perceivedRisk(after.diversification);
  if (riskBefore !== riskAfter) {
    const order = { prudent: 0, modere: 1, dynamique: 2 } as const;
    const up = order[riskAfter] > order[riskBefore];
    out.push({
      key: up
        ? "portfolio_customizer.consequence.risk_up"
        : "portfolio_customizer.consequence.risk_down",
      dir: up ? "down" : "up",
    });
  }

  // Impact — variation notable de l'impact moyen pondéré.
  const dImpact = after.impact - before.impact;
  if (dImpact > IMPACT_EPSILON) {
    out.push({
      key: "portfolio_customizer.consequence.impact_up",
      dir: "up",
      vars: { pts: Math.round(dImpact) },
    });
  } else if (dImpact < -IMPACT_EPSILON) {
    out.push({
      key: "portfolio_customizer.consequence.impact_down",
      dir: "down",
      vars: { pts: Math.round(Math.abs(dImpact)) },
    });
  }

  return out;
}
