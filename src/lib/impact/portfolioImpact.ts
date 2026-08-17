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
  WACI_MIN_COVERAGE_FOR_VERDICT,
  type PortfolioCarbon,
} from "@/lib/esg/carbon";
import { roundSignificant, type CarbonDataQuality } from "@/lib/esg/carbon-engine";
import {
  presentImpact,
  co2Equivalences,
  ADEME_FACTORS,
  type ImpactPresentation,
  type EmissionFactor,
} from "@/lib/impact/equivalences";
import { carbonConfidenceTier, type CarbonConfidence } from "@/lib/impact/translator";
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
  /**
   * Part (0..1) de `carbon_intensity_coverage` qui est directement sourcée
   * (measured/reported) plutôt qu'estimée bottom-up depuis les holdings
   * (cf. lib/esg/carbon-engine.ts). Absent sur les métriques antérieures au
   * moteur d'estimation → traité comme 100% sourcé (comportement historique).
   */
  carbon_sourced_share?: number | null;
  /** Palier de fiabilité dominant de la donnée carbone du portefeuille. */
  carbon_data_quality?: CarbonDataQuality | null;
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

/**
 * Vue graduée de l'empreinte carbone — mesurée OU estimée, toujours étiquetée
 * comme telle. Contrairement à `measured`/`presentation` (repli historique,
 * conservé tel quel pour ne pas changer le comportement des écrans qui les
 * consomment déjà), `estimate` s'affiche dès que `coverage > 0`, mesuré ou
 * estimé — c'est la seule donnée que consomme la carte carbone (§ carte
 * carbone de ImpactExperience). Jamais de fausse précision : `kgCo2ePerYear`
 * et `carEquivalenceKm` sont arrondis à 2 chiffres significatifs.
 */
export interface CarbonEstimateView {
  /** kg CO₂e/an, arrondi (2 chiffres significatifs) sur la part couverte. */
  kgCo2ePerYear: number;
  /** Part du portefeuille couverte par une donnée quelconque, 0..100. */
  coveragePct: number;
  /** Part de CETTE couverture qui est directement sourcée (measured/reported), 0..100. */
  sourcedPct: number;
  /** Palier de fiabilité dominant. */
  dataQuality: CarbonDataQuality;
  /** Palier de confiance dérivé de la couverture (cf. lib/impact/translator.ts). */
  confidence: CarbonConfidence;
  /** true si la couverture est trop faible pour être représentative (confidence = "low"). */
  lowCoverage: boolean;
  /** Équivalent km en voiture (ADEME), arrondi — null si non calculable. */
  carEquivalenceKm: number | null;
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
  /**
   * Vue graduée mesurée-ou-estimée, dès que `coverage > 0` — voir CarbonEstimateView.
   * null si la couverture carbone est nulle. Optionnel pour rester compatible avec
   * les fixtures de test antérieures à ce champ (toujours présent, jamais
   * `undefined`, sur les vues produites par `buildPortfolioImpact`).
   */
  estimate?: CarbonEstimateView | null;
}

/**
 * Construit la vue d'impact honnête d'un portefeuille valorisé.
 *
 * @param metrics       Métriques du portefeuille (issues du moteur / de la DB).
 * @param investedAmount Montant investi en € (capital de référence).
 * @param factors        Facteurs d'équivalence ADEME — par défaut la constante
 *                        locale (fallback/tests) ; en production, préférer les
 *                        valeurs chargées depuis `carbon_equivalences` (DB).
 */
export function buildPortfolioImpact(
  metrics: PortfolioImpactMetrics,
  investedAmount: number,
  factors: readonly EmissionFactor[] = ADEME_FACTORS,
): PortfolioImpactView {
  const rawIntensity = metrics.carbon_intensity_gco2e_per_eur;
  const coverage = Number.isFinite(metrics.carbon_intensity_coverage)
    ? Math.max(0, Math.min(1, metrics.carbon_intensity_coverage))
    : 0;

  const hasIntensity = rawIntensity != null && Number.isFinite(rawIntensity) && rawIntensity >= 0;
  // Palier dominant de la donnée carbone. Absent sur les métriques antérieures au
  // moteur d'estimation (rétrocompat : elles ne pouvaient être que des divulgations
  // réelles). `measured` (legacy) ne reste vrai que si TOUTE la part couverte est
  // directement sourcée (measured/reported) — jamais vrai pour une estimation
  // bottom-up, pour ne jamais présenter une estimation comme une mesure.
  const dataQuality: CarbonDataQuality | null =
    metrics.carbon_data_quality ?? (hasIntensity && coverage > 0 ? "measured" : null);
  const directlySourced = dataQuality === "measured" || dataQuality === "reported";
  const measured = hasIntensity && coverage > 0 && directlySourced;

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
  // Verdict carbone : uniquement si la couverture est suffisante pour être
  // représentative. En dessous, on expose le WACI mais sans écart chiffré
  // (vsBenchmarkDeltaPct = null → l'UI affiche « mesure en cours »), pour ne pas
  // comparer une petite fraction du portefeuille à un indice plein.
  let intensity: PortfolioIntensityView | null = null;
  if (rawWaci != null && Number.isFinite(rawWaci) && rawWaci >= 0 && waciCoverage > 0) {
    const verdictAllowed = waciCoverage >= WACI_MIN_COVERAGE_FOR_VERDICT;
    const cmp = verdictAllowed
      ? relativeIntensityVsBenchmark(rawWaci, ACWI_WACI_TCO2E_PER_MUSD)
      : null;
    intensity = {
      waci: rawWaci,
      coverage: waciCoverage,
      benchmarkWaci: ACWI_WACI_TCO2E_PER_MUSD,
      vsBenchmarkDeltaPct: cmp?.deltaPct ?? null,
      cleaner: cmp?.cleaner ?? false,
    };
  }

  // Vue graduée mesurée-ou-estimée : s'affiche dès que la couverture carbone est
  // non nulle, qu'elle soit mesurée ou estimée bottom-up — contrairement à
  // `presentation` (gate stricte "measured only", conservée telle quelle pour
  // les écrans historiques). Jamais de fausse précision : arrondi à 2 chiffres
  // significatifs (cf. carbon-engine.ts).
  let estimate: CarbonEstimateView | null = null;
  if (hasIntensity && coverage > 0 && dataQuality != null) {
    // Contrairement à `financed` (gate stricte, mesuré uniquement), cette valeur
    // couvre TOUTE la part couverte — mesurée et estimée — puisque `estimate`
    // porte lui-même l'étiquette de fiabilité (jamais présentée comme mesurée).
    const financedAll = financedEmissionsKgPerYear(
      { intensityGco2ePerEur: rawIntensity, coverage, dataQualityScore: null },
      investedAmount,
    );
    if (financedAll != null) {
      const sourcedShare = Math.max(
        0,
        Math.min(1, metrics.carbon_sourced_share ?? (directlySourced ? 1 : 0)),
      );
      const confidence = carbonConfidenceTier(coverage);
      const carEquiv = co2Equivalences(financedAll, factors).find((e) => e.factorId === "car_km");
      estimate = {
        kgCo2ePerYear: roundSignificant(financedAll, 2),
        coveragePct: Math.round(coverage * 100),
        sourcedPct: Math.round(sourcedShare * 100),
        dataQuality,
        confidence,
        lowCoverage: confidence === "low",
        carEquivalenceKm: carEquiv ? roundSignificant(carEquiv.value, 2) : null,
      };
    }
  }

  return {
    measured,
    intensityGco2ePerEur: measured ? rawIntensity : null,
    coverage,
    financedEmissionsKgPerYear: financed,
    presentation,
    intensity,
    esgScore: Number.isFinite(metrics.esg_score) ? metrics.esg_score : 0,
    estimate,
  };
}
