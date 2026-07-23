/**
 * Équivalences d'impact — traduire un nombre de kg CO₂e en repères concrets
 * (km en voiture, allers-retours en avion, repas…), pour rendre l'impact
 * parlant SANS jamais le sur-vendre.
 *
 * Deux garde-fous de transparence (CLAUDE.md §1 & §5) :
 *   1. La conversion n'est qu'une multiplication par un facteur SOURCÉ et DATÉ
 *      (base ADEME). C'est honnête tant que le nombre de kg CO₂e d'entrée est,
 *      lui, réel — d'où le point 2.
 *   2. On ne présente une équivalence que si la donnée carbone sous-jacente est
 *      MESURÉE et suffisamment couverte. Une empreinte estimée (couverture faible,
 *      heuristique ESG) ne produit PAS d'équivalence « arbres/voiture » : ce
 *      serait du greenwashing. `presentImpact()` applique cette règle.
 *
 * Les facteurs sont des constantes nommées, datées et sourcées — faciles à
 * mettre à jour quand l'ADEME publie une nouvelle Base Carbone. Ne pas coder de
 * facteur « de mémoire » sans source vérifiable.
 */

export type ImpactBasis = "measured" | "estimated";

export interface EmissionFactor {
  id: string;
  /** Clé i18n du libellé (ex. "impact.equiv.car_km"). */
  labelKey: string;
  /** Clé i18n de l'unité (ex. "impact.unit.km"). */
  unitKey: string;
  /** kg CO₂e par unité de l'équivalence. */
  kgCo2ePerUnit: number;
  /** Source vérifiable. */
  source: string;
  /** Millésime de la donnée (année). */
  asOf: number;
}

/**
 * Base ADEME (Base Carbone®) — valeurs publiques, à réviser à chaque mise à jour
 * ADEME. Chaque facteur porte sa source et son année : rien n'est affirmé sans
 * attribution (contrat de transparence Seedow).
 */
export const ADEME_FACTORS: readonly EmissionFactor[] = [
  {
    id: "car_km",
    labelKey: "impact.equiv.car_km",
    unitKey: "impact.unit.km",
    // Voiture particulière moyenne, parc France (cycle de vie carburant inclus).
    kgCo2ePerUnit: 0.193,
    source: "ADEME Base Carbone",
    asOf: 2023,
  },
  {
    id: "flight_paris_ny",
    labelKey: "impact.equiv.flight_paris_ny",
    unitKey: "impact.unit.round_trip",
    // Aller-retour Paris–New York, par passager (≈ 1,8 tCO₂e).
    kgCo2ePerUnit: 1800,
    source: "ADEME / DGAC",
    asOf: 2023,
  },
  {
    id: "beef_meal",
    labelKey: "impact.equiv.beef_meal",
    unitKey: "impact.unit.meal",
    // Repas avec bœuf (≈ 7 kgCO₂e).
    kgCo2ePerUnit: 7,
    source: "ADEME Agribalyse",
    asOf: 2023,
  },
  {
    id: "smartphone",
    labelKey: "impact.equiv.smartphone",
    unitKey: "impact.unit.unit",
    // Fabrication d'un smartphone (≈ 57 kgCO₂e).
    kgCo2ePerUnit: 57,
    source: "ADEME",
    asOf: 2022,
  },
] as const;

export interface Equivalence {
  factorId: string;
  labelKey: string;
  unitKey: string;
  /** Quantité d'unités équivalentes (peut être négative si l'entrée l'est). */
  value: number;
  source: string;
  asOf: number;
}

/**
 * Convertit un nombre de kg CO₂e en équivalences. Multiplication pure par des
 * facteurs sourcés — à n'appeler qu'avec un nombre de kg CO₂e réel (voir
 * presentImpact pour la règle de visibilité).
 */
export function co2Equivalences(
  kgCo2e: number,
  factors: readonly EmissionFactor[] = ADEME_FACTORS,
): Equivalence[] {
  if (!Number.isFinite(kgCo2e)) return [];
  return factors.map((f) => ({
    factorId: f.id,
    labelKey: f.labelKey,
    unitKey: f.unitKey,
    value: kgCo2e / f.kgCo2ePerUnit,
    source: f.source,
    asOf: f.asOf,
  }));
}

/**
 * Couverture minimale pour qu'une empreinte carbone MESURÉE justifie l'affichage
 * d'équivalences concrètes. En-dessous, la donnée réelle n'est pas représentative
 * du portefeuille — on n'affiche pas d'équivalence (on peut afficher l'intensité
 * brute avec la couverture, mais pas la traduire en « X km »).
 */
export const MIN_COVERAGE_FOR_EQUIVALENCES = 0.5;

export interface ImpactInput {
  /** kg CO₂e/an réellement mesurés (ou évités) sur la part couverte. */
  kgCo2ePerYear: number | null;
  basis: ImpactBasis;
  /** Part du portefeuille couverte par une donnée réelle (0..1). */
  coverage: number;
}

export interface ImpactPresentation {
  /** true si l'on peut afficher des équivalences concrètes honnêtement. */
  show: boolean;
  /** Raison de non-affichage, clé i18n (ex. "impact.reason.low_coverage"). */
  reasonKey?: string;
  equivalences: Equivalence[];
  coverage: number;
  basis: ImpactBasis;
}

/**
 * Décide si et comment présenter l'impact. Règle unique et stricte :
 * équivalences concrètes UNIQUEMENT si la donnée est mesurée ET la couverture
 * ≥ seuil. Sinon on renvoie show=false avec une raison explicite — jamais
 * d'équivalence dérivée d'une estimation (anti-greenwashing).
 */
export function presentImpact(
  input: ImpactInput,
  factors: readonly EmissionFactor[] = ADEME_FACTORS,
): ImpactPresentation {
  const coverage = Number.isFinite(input.coverage) ? Math.max(0, Math.min(1, input.coverage)) : 0;

  if (input.kgCo2ePerYear == null || !Number.isFinite(input.kgCo2ePerYear)) {
    return {
      show: false,
      reasonKey: "impact.reason.no_data",
      equivalences: [],
      coverage,
      basis: input.basis,
    };
  }
  if (input.basis !== "measured") {
    return {
      show: false,
      reasonKey: "impact.reason.estimated_only",
      equivalences: [],
      coverage,
      basis: input.basis,
    };
  }
  if (coverage < MIN_COVERAGE_FOR_EQUIVALENCES) {
    return {
      show: false,
      reasonKey: "impact.reason.low_coverage",
      equivalences: [],
      coverage,
      basis: input.basis,
    };
  }

  return {
    show: true,
    equivalences: co2Equivalences(input.kgCo2ePerYear, factors),
    coverage,
    basis: input.basis,
  };
}
