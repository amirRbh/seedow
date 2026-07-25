/**
 * Vue d'impact d'un portefeuille — la SEULE source de vérité que l'UI doit
 * consommer pour afficher un chiffre carbone. Elle remplace l'ancienne heuristique
 * inventée (`co2_avoided_tons × montant / 10000`, `arbres = co2 × 45`,
 * `énergie = montant / 5`) qui violait le contrat de transparence (CLAUDE.md §1.2,
 * §5.4 : « chaque chiffre sourcé »).
 *
 * Principe : on ne présente une empreinte carbone chiffrée QUE si des données
 * d'intensité réelles (divulgations émetteurs, agrégées par le moteur portefeuille)
 * couvrent le portefeuille. Sinon on ne fabrique rien — l'UI affiche un état
 * honnête « en cours de mesure ».
 *
 * Fonction pure : aucune dépendance DB/UI, testable isolément. Réutilise le module
 * carbone (PCAF/GHG Protocol) et le module d'équivalences (ADEME, sourcé/daté).
 */

import { financedEmissionsKgPerYear, type PortfolioCarbon } from "@/lib/esg/carbon";
import { presentImpact, type ImpactPresentation } from "@/lib/impact/equivalences";

/** Sous-ensemble des métriques persistées nécessaires au calcul d'impact. */
export interface PortfolioImpactMetrics {
  /** Intensité carbone pondérée gCO₂e/€ investi/an, ou null si aucune donnée réelle. */
  carbon_intensity_gco2e_per_eur: number | null;
  /** Part du poids du portefeuille couverte par une intensité réelle (0..1). */
  carbon_intensity_coverage: number;
  /** Score d'impact ESG (0..100) — toujours réel, calculé par le moteur. */
  esg_score: number;
}

export interface PortfolioImpactView {
  /** true dès qu'une empreinte carbone RÉELLE est mesurée (intensité + couverture > 0). */
  measured: boolean;
  /** Intensité carbone gCO₂e/€/an sur la part couverte, ou null si non mesurée. */
  intensityGco2ePerEur: number | null;
  /** Part du portefeuille couverte par des données réelles (0..1). */
  coverage: number;
  /**
   * Émissions financées absolues (kg CO₂e/an) sur la part couverte, ou null.
   * C'est une EMPREINTE (ce que le portefeuille émet), jamais un « CO₂ évité » —
   * l'évité exige une comparaison à un indice de référence sourcé (cf. carbon.ts).
   */
  financedEmissionsKgPerYear: number | null;
  /**
   * Décision d'affichage des équivalences concrètes (km, vols…). show=true
   * UNIQUEMENT si mesuré ET couverture ≥ seuil ; sinon reasonKey explique pourquoi.
   */
  presentation: ImpactPresentation;
  /** Score d'impact ESG (0..100) — le repère honnête à afficher quand le carbone n'est pas mesuré. */
  esgScore: number;
}

/**
 * Construit la vue d'impact honnête d'un portefeuille valorisé.
 *
 * @param metrics       Métriques du portefeuille (issues du moteur / de la DB).
 * @param investedAmount Montant investi en € (capital de référence).
 */
export function buildPortfolioImpact(
  metrics: PortfolioImpactMetrics,
  investedAmount: number,
): PortfolioImpactView {
  const rawIntensity = metrics.carbon_intensity_gco2e_per_eur;
  const coverage = Number.isFinite(metrics.carbon_intensity_coverage)
    ? Math.max(0, Math.min(1, metrics.carbon_intensity_coverage))
    : 0;

  const hasIntensity = rawIntensity != null && Number.isFinite(rawIntensity) && rawIntensity >= 0;
  const measured = hasIntensity && coverage > 0;

  const carbon: PortfolioCarbon = {
    intensityGco2ePerEur: measured ? rawIntensity : null,
    coverage,
    dataQualityScore: null,
  };
  const financed = financedEmissionsKgPerYear(carbon, investedAmount);

  const presentation = presentImpact({
    kgCo2ePerYear: financed,
    basis: measured ? "measured" : "estimated",
    coverage,
  });

  return {
    measured,
    intensityGco2ePerEur: measured ? rawIntensity : null,
    coverage,
    financedEmissionsKgPerYear: financed,
    presentation,
    esgScore: Number.isFinite(metrics.esg_score) ? metrics.esg_score : 0,
  };
}
