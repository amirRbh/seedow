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
 * ── « Est-ce que ce fond est vraiment vert ? » ───────────────────────────────
 * L'analogie du fond vert (chroma key) tient bien : on ne se contente pas d'un
 * seuil binaire "vert / pas vert" (une couleur pure), on tolère une bande autour
 * du seuil (les nuances), on pondère selon l'intensité de l'écart (la luminosité)
 * et on protège l'algorithme des données manquantes ou aberrantes (les ombres).
 * Concrètement :
 *   - tolérance : une zone "limite" juste au-dessus du plancher signale un doute
 *     (medium) au lieu de laisser passer un fonds qui frôle le seuil ;
 *   - intensité : une contradiction franche (données qui démentent la promesse)
 *     pèse "high", une promesse simplement invérifiable pèse "medium" ;
 *   - robustesse : les scores sont bornés à [0..10] et les valeurs non finies ou
 *     un article SFDR hors {6,8,9} sont neutralisés — pas de faux positif sur
 *     une donnée corrompue.
 *
 * Fonctions pures, sans dépendance UI/DB : utilisées côté client (useAssetUniverse)
 * et côté serveur (endpoint public /api/public/esg-preview).
 */

export type DataCoverage = "complete" | "partial" | "estimated";
export type GreenwashingRisk = "low" | "medium" | "high";

/** Ids stables, traduits côté UI (clés i18n `transparency.reasons.*`). */
export type GreenwashingReason =
  | "art9_low_esg"
  | "art9_borderline_esg"
  | "art9_no_exclusions"
  | "sfdr_low_esg"
  | "sfdr_borderline_esg"
  | "sfdr_missing_carbon"
  | "sfdr_no_exclusions"
  | "green_theme_low_climate"
  | "green_theme_borderline_climate"
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

/**
 * Seuils de l'heuristique, nommés et centralisés — pas de nombre magique éparpillé
 * dans la logique. Échelle 0..10.
 *
 *  - *_FLOOR : en-dessous, la donnée contredit franchement la revendication (high).
 *  - BORDERLINE_BAND : largeur de la zone "limite" juste au-dessus du plancher.
 *    Dans cette bande, on lève un doute (medium) plutôt que de rien signaler :
 *    c'est la tolérance qui évite l'effet de falaise autour d'un seuil unique.
 */
const ART9_ESG_FLOOR = 6;
const SUSTAINABLE_ESG_FLOOR = 5;
const CLIMATE_FLOOR = 5;
const BORDERLINE_BAND = 1;

/** Contradictions franches : leur présence porte le risque à "high". */
const STRONG_REASONS: ReadonlySet<GreenwashingReason> = new Set([
  "art9_low_esg",
  "art9_no_exclusions",
  "sfdr_low_esg",
]);

/** Borne une valeur numérique dans [0..10] ; renvoie null si non exploitable. */
function clampScore(value: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(10, Math.max(0, value));
}

/** Normalise l'article SFDR : seuls 6, 8, 9 sont des classifications valides. */
function normalizeSfdrArticle(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return rounded === 6 || rounded === 8 || rounded === 9 ? rounded : null;
}

export function computeDataCoverage(input: TransparencyInput): DataCoverage {
  const missing = [
    input.hasPillarScores,
    input.hasCarbonData,
    normalizeSfdrArticle(input.sfdrArticle) != null,
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

  // ── Robustesse : on borne les entrées avant de juger (les "ombres"). Un score
  // non fini ou aberrant ne doit jamais déclencher de faux positif : on le traite
  // comme "inconnu" (null) et on n'affirme alors aucune contradiction chiffrée.
  const article = normalizeSfdrArticle(input.sfdrArticle);
  const esg = clampScore(input.overallEsgScore);
  const climate = clampScore(input.climateScore);
  const exclusions = Number.isFinite(input.exclusionsCount)
    ? Math.max(0, Math.floor(input.exclusionsCount))
    : 0;

  const claimsSustainable = article === 8 || article === 9;

  // ── Cohérence score ESG vs revendication durable ──────────────────────────
  // On ne se contente pas d'un seuil binaire : en-dessous du plancher c'est une
  // contradiction (high), dans la bande de tolérance juste au-dessus c'est un
  // doute (medium). Un fonds qui frôle le seuil n'est plus silencieusement validé.
  if (esg != null) {
    if (article === 9) {
      if (esg < ART9_ESG_FLOOR) reasons.push("art9_low_esg");
      else if (esg < ART9_ESG_FLOOR + BORDERLINE_BAND) reasons.push("art9_borderline_esg");
    }
    if (claimsSustainable) {
      if (esg < SUSTAINABLE_ESG_FLOOR) reasons.push("sfdr_low_esg");
      else if (esg < SUSTAINABLE_ESG_FLOOR + BORDERLINE_BAND && article !== 9)
        // Pour un Art. 9, la bande [5,6[ est déjà couverte par art9_low_esg
        // (plancher 6) — inutile de doubler le signal.
        reasons.push("sfdr_borderline_esg");
    }
  }

  // ── Exclusions sectorielles : un fonds durable sans aucune exclusion formelle ─
  if (article === 9 && exclusions === 0) reasons.push("art9_no_exclusions");
  if (article === 8 && exclusions === 0) reasons.push("sfdr_no_exclusions");

  // ── Thème vert vs score climat réel ───────────────────────────────────────
  if (input.claimsGreenTheme && climate != null) {
    if (climate < CLIMATE_FLOOR) reasons.push("green_theme_low_climate");
    else if (climate < CLIMATE_FLOOR + BORDERLINE_BAND)
      reasons.push("green_theme_borderline_climate");
  }

  // ── Revendications invérifiables (donnée manquante ou estimée) ────────────
  // Signaux "medium" par nature : on ne peut pas contredire, seulement douter.
  if (claimsSustainable && !input.hasCarbonData) reasons.push("sfdr_missing_carbon");
  if (claimsSustainable && computeDataCoverage(input) === "estimated")
    reasons.push("claims_on_estimated_data");

  if (reasons.length === 0) return { risk: "low", reasons };
  const hasStrongSignal = reasons.some((r) => STRONG_REASONS.has(r));
  return { risk: hasStrongSignal ? "high" : "medium", reasons };
}
