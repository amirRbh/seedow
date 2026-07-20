/**
 * Transparence des données ESG — deux signaux affichés partout où un score apparaît :
 *
 *  - DataCoverage : qualité de couverture de NOS données pour un actif
 *    ("complete" / "partial" / "estimated"). On assume publiquement les trous
 *    plutôt que de les masquer : c'est le contrat de confiance de Seedow.
 *
 *  - GreenwashingRisk : heuristique de cohérence entre ce que le fonds revendique
 *    (article SFDR, thèmes verts) et ce que les données montrent (scores, exclusions,
 *    carbone). Ce n'est PAS un verdict — c'est un drapeau "à vérifier", toujours
 *    accompagné de ses raisons pour que l'utilisateur puisse juger lui-même.
 *
 * Fonctions pures, sans dépendance UI/DB : utilisées côté client (useAssetUniverse)
 * et côté serveur (endpoint public /api/public/esg-preview).
 */

export type DataCoverage = "complete" | "partial" | "estimated";
export type GreenwashingRisk = "low" | "medium" | "high";

/** Ids stables, traduits côté UI (clés i18n `transparency.reasons.*`). */
export type GreenwashingReason =
  | "art9_low_esg"
  | "art9_no_exclusions"
  | "sfdr_low_esg"
  | "sfdr_missing_carbon"
  | "sfdr_no_exclusions"
  | "green_theme_low_climate"
  | "claims_on_estimated_data";

export interface TransparencyInput {
  /** Un cours (live ou dernier close) est connu. */
  hasPrice: boolean;
  /** Les scores E/S/G proviennent du fournisseur (pas dérivés du score global). */
  hasPillarScores: boolean;
  /** Intensité carbone mesurée disponible. */
  hasCarbonData: boolean;
  sfdrArticle: number | null;
  /** Score ESG global, échelle 0..10. */
  overallEsgScore: number;
  /** Score climat (pilier E), échelle 0..10. */
  climateScore: number;
  /** Nombre de secteurs formellement exclus par le fonds. */
  exclusionsCount: number;
  /** Le fonds revendique des thèmes environnementaux (clean energy, climat…). */
  claimsGreenTheme: boolean;
}

/** Causes considérées comme des revendications "vertes" (vs sociales/gouvernance). */
export const GREEN_CAUSE_TAGS = new Set(["climat", "biodiversite", "circulaire"]);

export function computeDataCoverage(input: TransparencyInput): DataCoverage {
  const missing = [
    input.hasPillarScores,
    input.hasCarbonData,
    input.sfdrArticle != null,
    input.hasPrice,
  ].filter((present) => !present).length;

  // Piliers absents = les scores E/S/G affichés sont dérivés du score global :
  // ce sont des estimations, quel que soit le reste de la couverture.
  if (!input.hasPillarScores || missing >= 3) return "estimated";
  if (missing >= 1) return "partial";
  return "complete";
}

export interface GreenwashingAssessment {
  risk: GreenwashingRisk;
  reasons: GreenwashingReason[];
}

export function assessGreenwashingRisk(input: TransparencyInput): GreenwashingAssessment {
  const reasons: GreenwashingReason[] = [];
  const claimsSustainable = input.sfdrArticle === 8 || input.sfdrArticle === 9;

  // ── Incohérences fortes : la revendication contredit les données ──
  if (input.sfdrArticle === 9 && input.overallEsgScore < 6) reasons.push("art9_low_esg");
  if (input.sfdrArticle === 9 && input.exclusionsCount === 0) reasons.push("art9_no_exclusions");
  if (claimsSustainable && input.overallEsgScore < 5) reasons.push("sfdr_low_esg");

  const hasStrongSignal = reasons.length > 0;

  // ── Incohérences moyennes : revendication non vérifiable ou partiellement contredite ──
  if (claimsSustainable && !input.hasCarbonData) reasons.push("sfdr_missing_carbon");
  if (input.sfdrArticle === 8 && input.exclusionsCount === 0) reasons.push("sfdr_no_exclusions");
  if (input.claimsGreenTheme && input.climateScore < 5) reasons.push("green_theme_low_climate");
  if (claimsSustainable && computeDataCoverage(input) === "estimated")
    reasons.push("claims_on_estimated_data");

  if (hasStrongSignal) return { risk: "high", reasons };
  if (reasons.length > 0) return { risk: "medium", reasons };
  return { risk: "low", reasons };
}
