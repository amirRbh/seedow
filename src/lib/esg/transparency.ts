/**
 * Transparence des données ESG — deux signaux de l'explorateur interne
 * (`/discover`, tableau de bord, alertes) :
 *
 *  - DataCoverage : qualité de couverture de NOS données pour un actif
 *    ("complete" / "partial" / "estimated"). On assume publiquement les trous
 *    plutôt que de les masquer : c'est le contrat de confiance de Seedow.
 *
 *  - GreenwashingRisk : heuristique de cohérence entre ce qu'un fonds revendique
 *    (article SFDR) et ce que les données montrent (score ESG, exclusions). Ce
 *    n'est PAS un verdict — c'est un drapeau "à vérifier", toujours accompagné de
 *    ses raisons pour que l'utilisateur puisse juger lui-même.
 *
 * ── Périmètre, depuis la grille STI 2.0 ─────────────────────────────────────
 * Cette heuristique ne sort plus sur les surfaces PUBLIQUES : l'Observatoire,
 * les fiches fonds et l'aperçu de la landing publient l'indice de transparence
 * et les constats opposables E1–E5 (`src/lib/esg/v2/`), qui exigent une
 * revendication citée et un fait public qui la contredit. Ici on reste sur un
 * signal d'aide à l'exploration, jamais publié comme un constat opposable — et
 * les trois familles de drapeaux que la v2 interdit ont été retirées (voir plus
 * bas, dans `assessGreenwashingRisk`).
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
 * Fonctions pures, sans dépendance UI/DB (`useAssetUniverse`, screening).
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
  | "sfdr_no_exclusions";

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
  /** Nombre de secteurs formellement exclus par le fonds. */
  exclusionsCount: number;
}

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

  // ── Ce qui n'est PLUS signalé ici (grille STI 2.0, cf. docs/scoring-v2.md) ──
  //
  // Trois familles de drapeaux ont été retirées définitivement :
  //
  //   « revendication durable sans donnée d'intensité carbone mesurée »
  //        → c'est un trou de données SEEDOW, pas un défaut du fonds. Il est
  //          désormais compté à sa juste place, dans le bloc C du STI, où c'est
  //          l'absence de PUBLICATION par l'émetteur qui coûte des points.
  //   « revendication appuyée sur des données en partie estimées »
  //        → décrit la source Seedow, pas le fonds. Vit dans l'indicateur de
  //          couverture, qui est déjà affiché à côté de chaque chiffre.
  //   « thème environnemental revendiqué avec un score climat à la limite »
  //        → circulaire : Seedow attribuait le thème, puis constatait l'écart
  //          avec son propre score. Supprimé sans remplacement — un fonds ne
  //          peut pas être pris en défaut par une donnée que Seedow a produite.
  //
  // Un émetteur épinglé sur un constat qui s'avère être un trou de données de
  // Seedow attaque, et gagne. C'est ce qui faisait passer le catalogue de 8
  // constats opposables à 67 constats dont 59 étaient attaquables.

  if (reasons.length === 0) return { risk: "low", reasons };
  const hasStrongSignal = reasons.some((r) => STRONG_REASONS.has(r));
  return { risk: hasStrongSignal ? "high" : "medium", reasons };
}
