/**
 * Types partagés du moteur de matching (pivot PIU). Aucune logique, aucune I/O.
 */
import type { MatchDimension } from "@/lib/preferences/dimensions";

export type SatisfactionForm = "monotone_decreasing" | "monotone_increasing" | "target" | "ordinal";

/**
 * Couverture d'une dimension pour un actif ∈ [0,1] : part de la donnée
 * réellement disponible (1 = mesurée, 0 = absente). Pour le look-through partiel,
 * une valeur fractionnaire (ex. 0,92 = calculé sur 92 % du fonds) est légitime.
 */
export type Coverage = number;

/** Motif d'absence de satisfaction sur une dimension (id stable, traduit UI). */
export type UncoveredReason =
  | "no_data" // donnée non disponible pour cet actif
  | "requires_holdings" // dépend du look-through (fund_holdings), pas encore alimenté
  | "requires_collection" // ne se juge qu'au niveau d'une collection, pas d'un actif isolé
  | "requires_user_context" // manque un paramètre utilisateur (ex. tolérance au risque)
  | "no_spec"; // aucune méthodologie de satisfaction définie pour cette dimension

/** Signal d'UNE dimension pour UN actif. */
export interface DimensionSignal {
  dimension: MatchDimension;
  /** Satisfaction ∈ [0,1], ou null si non évaluable (couverture nulle). */
  satisfaction: number | null;
  coverage: Coverage;
  /** Valeur mesurée lisible (ex. « TER 0,20 % », « WACI 74 »), pour le « pourquoi ». */
  measuredLabel?: string;
  /** Motif quand `satisfaction` est null / couverture nulle. */
  uncoveredReason?: UncoveredReason;
}

/** Signaux de toutes les dimensions pour un actif. */
export type AssetSignals = Record<MatchDimension, DimensionSignal>;

/** Entrée minimale par-actif consommée par le matching (découplée de DiscoverAsset). */
export interface MatchAssetInput {
  id: string;
  /** Frais courants annuels, en % (ex. 0.20 pour 0,20 %). */
  terPct: number | null;
  /** Niveau de risque SRRI approximé (1..7). */
  riskLevel: number | null;
  /** WACI mesuré (tCO₂e/M$ CA), source d'abord du sous-score climat. */
  waci: number | null;
  /** Score climat / pilier E sur 0..10 (repli quand le WACI manque). */
  climateScore: number | null;
  /** Score ESG global sur 0..10. */
  esgScore: number | null;
  /** Bande de controverses (none/low/moderate/severe), si connue. */
  controversyBand: string | null;
  /** Notre couverture de données pour cet actif. */
  dataCoverage: "complete" | "partial" | "estimated" | null;
}

/** Contexte utilisateur nécessaire à certaines dimensions. */
export interface MatchContext {
  /** Cible de risque (SRRI 1..7) dérivée de la tolérance déclarée ; null = non renseignée. */
  targetRiskLevel: number | null;
  /** Référence WACI ; défaut = benchmark ACWI sourcé (voir dimensions.ts). */
  benchmarkWaci?: number;
}

/** Contribution d'une dimension au score agrégé (pour l'explication décomposée). */
export interface DimensionContribution {
  dimension: MatchDimension;
  weight: number; // poids utilisateur
  coverage: Coverage;
  satisfaction: number; // 0 si non couverte
  /** Part marginale dans le score final (w·c·s / Σ w·c·s), ∈ [0,1]. */
  share: number;
  measuredLabel?: string;
}

/** Bande de correspondance affichée (§6.4 : bandes plutôt qu'une fausse précision). */
export type MatchBand = "strong" | "good" | "partial" | "weak" | "not_scored";

/** Résultat du matching d'un actif contre des préférences. */
export interface MatchResult {
  assetId: string;
  /** Vrai si la couverture agrégée atteint le plancher : un score est affichable. */
  scorable: boolean;
  /** Score de correspondance ∈ [0,1], ou null si non scorable (§6.4). */
  score: number | null;
  /** Couverture agrégée ∈ [0,1] (confiance), toujours renseignée. */
  coverage: Coverage;
  band: MatchBand;
  /**
   * Pourcentage à afficher, ou null. N'est renseigné qu'au-delà d'une couverture
   * élevée (§6.4 : le % implique une précision que la donnée ne porte pas sinon).
   */
  displayPercent: number | null;
  /** Contributions triées par part décroissante (positives ET faibles). */
  contributions: DimensionContribution[];
  /** Dimensions demandées par l'utilisateur mais non couvertes (avec motif). */
  missing: { dimension: MatchDimension; reason: UncoveredReason }[];
}
