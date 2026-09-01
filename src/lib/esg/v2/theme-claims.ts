/**
 * Thèmes — trois niveaux sourcés, plus aucun pourcentage.
 *
 * ── Ce qui est supprimé ────────────────────────────────────────────────────
 *
 * Les pourcentages thématiques (« biodiversité 85 % », « climat 10 % ») étaient
 * saisis à la main — toutes les valeurs du catalogue sont des multiples de 5 —,
 * non calculés, et leur méthode n'était publiée nulle part. La fiche fonds
 * l'admettait déjà en petits caractères. Afficher une appréciation sous forme de
 * pourcentage est exactement le procédé que Seedow dénonce : la précision
 * apparente d'un chiffre appliquée à un jugement.
 *
 * ── Ce qui les remplace ────────────────────────────────────────────────────
 *
 *   revendiqué      — figure dans la dénomination ou l'objectif d'investissement
 *   mentionné       — apparaît dans la documentation ESG sans être un objectif
 *   non revendiqué  — absent de la documentation
 *
 * Règle absolue : **Seedow n'attribue aucun thème que le fonds ne revendique
 * pas.** Elle supprime d'un coup les anomalies du catalogue v1 — l'or physique
 * classé « climat 10 % », les fonds monétaires thématisés, un ETF cyber crédité
 * de « biodiversité 85 % ». Aucun de ces fonds ne revendique quoi que ce soit :
 * c'est Seedow qui remplissait la case.
 *
 * Fonctions pures, sans I/O. Le texte analysé est celui du fonds (dénomination,
 * objectif d'investissement, documentation ESG) — jamais une donnée dérivée.
 */

export type ThemeClaimLevel = "revendique" | "mentionne" | "non_revendique";

/** Thèmes suivis — mêmes tags que les causes d'onboarding, pour une seule langue produit. */
export const THEME_TAGS = [
  "climat",
  "biodiversite",
  "humain",
  "egalite",
  "tech",
  "circulaire",
] as const;
export type ThemeTag = (typeof THEME_TAGS)[number];

/**
 * Marqueurs lexicaux par thème, FR et EN. Une correspondance ne « donne » pas
 * le thème : elle atteste que le fonds emploie lui-même le mot, dans son propre
 * document. C'est la seule chose que Seedow constate ici.
 */
const THEME_MARKERS: Record<ThemeTag, string[]> = {
  climat: [
    "climat",
    "climate",
    "carbon",
    "carbone",
    "paris aligned",
    "paris-aligned",
    "net zero",
    "net-zero",
    "transition energetique",
    "energy transition",
    "clean energy",
    "renewable",
    "renouvelable",
    "solar",
    "solaire",
    "wind",
    "eolien",
    "green bond",
    "obligation verte",
  ],
  biodiversite: [
    "biodiversite",
    "biodiversity",
    "forest",
    "foret",
    "timber",
    "ocean",
    "water",
    "eau",
    "nature",
    "deforestation",
  ],
  humain: [
    "droits humains",
    "human rights",
    "social bond",
    "obligation sociale",
    "labour",
    "labor",
    "travail decent",
    "decent work",
    "fair trade",
    "commerce equitable",
  ],
  egalite: [
    "egalite",
    "equality",
    "gender",
    "genre",
    "parite",
    "diversity",
    "diversite",
    "inclusion",
    "women",
    "femmes",
  ],
  tech: [
    "tech ethique",
    "ethical tech",
    "digital inclusion",
    "privacy",
    "vie privee",
    "cyber",
    "responsible technology",
  ],
  circulaire: [
    "economie circulaire",
    "circular economy",
    "circular",
    "recycling",
    "recyclage",
    "waste",
    "dechets",
    "reuse",
    "reemploi",
  ],
};

export interface ThemeClaim {
  tag: ThemeTag;
  level: ThemeClaimLevel;
  /** Le marqueur trouvé, tel qu'il figure dans le document — la preuve, en clair. */
  evidence: string | null;
  /** Document où le marqueur a été trouvé (dénomination, prospectus, doc ESG). */
  source_document: string | null;
}

export interface ThemeClaimInput {
  /** Dénomination commerciale du fonds. */
  name: string;
  /** Objectif d'investissement déclaré (prospectus/KID), si collecté. */
  investmentObjective?: string | null;
  /** Corps de la documentation ESG, si collectée. */
  esgDocumentation?: string | null;
  /** Libellés des documents, pour l'attribution. */
  objectiveDocument?: string | null;
  esgDocument?: string | null;
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function findMarker(haystack: string | null | undefined, markers: string[]): string | null {
  if (!haystack) return null;
  const text = normalize(haystack);
  return markers.find((m) => text.includes(m)) ?? null;
}

/**
 * Dérive les trois niveaux depuis les seuls textes du fonds.
 *
 * L'ordre est significatif : la dénomination et l'objectif d'investissement font
 * la revendication (le fonds s'engage dessus) ; la documentation ESG seule ne
 * fait qu'une mention (le mot apparaît, sans être un objectif). En l'absence des
 * deux, le thème est `non_revendique` — et il n'est pas affiché.
 */
export function deriveThemeClaims(input: ThemeClaimInput): ThemeClaim[] {
  return THEME_TAGS.map((tag) => {
    const markers = THEME_MARKERS[tag];
    const inName = findMarker(input.name, markers);
    const inObjective = findMarker(input.investmentObjective, markers);
    if (inName || inObjective) {
      return {
        tag,
        level: "revendique" as const,
        evidence: inName ?? inObjective,
        source_document: inName
          ? "Dénomination du fonds"
          : (input.objectiveDocument ?? "Objectif d'investissement déclaré"),
      };
    }
    const inEsgDoc = findMarker(input.esgDocumentation, markers);
    if (inEsgDoc) {
      return {
        tag,
        level: "mentionne" as const,
        evidence: inEsgDoc,
        source_document: input.esgDocument ?? "Documentation ESG",
      };
    }
    return { tag, level: "non_revendique" as const, evidence: null, source_document: null };
  });
}

/** Ce qui s'affiche : les thèmes que le fonds revendique ou mentionne, dans cet ordre. */
export function displayedThemes(claims: readonly ThemeClaim[]): ThemeClaim[] {
  const rank: Record<ThemeClaimLevel, number> = {
    revendique: 0,
    mentionne: 1,
    non_revendique: 2,
  };
  return claims
    .filter((c) => c.level !== "non_revendique")
    .sort((a, b) => rank[a.level] - rank[b.level]);
}
