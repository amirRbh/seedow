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

import {
  financedEmissionsKgPerYear,
  relativeIntensityVsBenchmark,
  type PortfolioCarbon,
} from "@/lib/esg/carbon";
import { presentImpact, type ImpactPresentation } from "@/lib/impact/equivalences";
import { ACWI_WACI_TCO2E_PER_MUSD } from "@/lib/esg/benchmark";

/** Sous-ensemble des métriques persistées nécessaires au calcul d'impact. */
export interface PortfolioImpactMetrics {
  /** Intensité carbone pondérée gCO₂e/€ investi/an, ou null si aucune donnée réelle. */
  carbon_intensity_gco2e_per_eur: number | null;
  /** Part du poids du portefeuille couverte par une intensité réelle (0..1). */
  carbon_intensity_coverage: number;
  /** WACI pondéré tCO₂e/M$ CA (donnée émetteurs), ou null si non couvert. */
  waci_tco2e_per_musd_sales?: number | null;
  /** Part du poids couverte par un WACI réel (0..1). */
  waci_coverage?: number;
  /** Score d'impact ESG (0..100) — toujours réel, calculé par le moteur. */
  esg_score: number;
}

/**
 * Intensité carbone WACI + comparaison à un indice de référence. C'est la donnée
 * carbone RÉELLEMENT sourçable aujourd'hui (fiches fonds MSCI), à la différence de
 * l'empreinte par € investi (réservée à une divulgation future). Sert d'état
 * « mesuré » de repli quand l'empreinte par € n'est pas disponible.
 */
export interface PortfolioIntensityView {
  /** WACI pondéré du portefeuille (tCO₂e/M$ CA), sur la part couverte. */
  waci: number;
  /** Part du portefeuille disposant d'un WACI réel (0..1). */
  coverage: number;
  /** WACI de référence (ETF Monde), sourcé. */
  benchmarkWaci: number;
  /** Écart relatif vs référence, (bench − port)/bench. Positif = moins intensif. */
  vsBenchmarkDeltaPct: number | null;
  /** true si le portefeuille est MOINS intensif que la référence. */
  cleaner: boolean;
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
  /**
   * Intensité carbone WACI + comparaison au benchmark, ou null si aucun WACI réel.
   * État « mesuré » sourçable dès aujourd'hui, à afficher quand l'empreinte par €
   * (`measured`) n'est pas disponible.
   */
  intensity: PortfolioIntensityView | null;
  /** Score d'impact ESG (0..100) — le repère honnête à afficher quand rien n'est mesuré. */
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

  // Intensité WACI + comparaison au benchmark, dès qu'un WACI réel existe.
  const rawWaci = metrics.waci_tco2e_per_musd_sales;
  const waciCoverage = Number.isFinite(metrics.waci_coverage ?? NaN)
    ? Math.max(0, Math.min(1, metrics.waci_coverage as number))
    : 0;
  let intensity: PortfolioIntensityView | null = null;
  if (rawWaci != null && Number.isFinite(rawWaci) && rawWaci >= 0 && waciCoverage > 0) {
    const cmp = relativeIntensityVsBenchmark(rawWaci, ACWI_WACI_TCO2E_PER_MUSD);
    intensity = {
      waci: rawWaci,
      coverage: waciCoverage,
      benchmarkWaci: ACWI_WACI_TCO2E_PER_MUSD,
      vsBenchmarkDeltaPct: cmp?.deltaPct ?? null,
      cleaner: cmp?.cleaner ?? false,
    };
  }

  return {
    measured,
    intensityGco2ePerEur: measured ? rawIntensity : null,
    coverage,
    financedEmissionsKgPerYear: financed,
    presentation,
    intensity,
    esgScore: Number.isFinite(metrics.esg_score) ? metrics.esg_score : 0,
  };
}
