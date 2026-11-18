/**
 * Cadre ESG de Seedow — six couches qui ne se confondent pas.
 *
 * Le contresens le plus répandu en finance durable consiste à lire une couche
 * comme si elle en disait une autre : « Article 9 » comme une note de qualité,
 * une note ESG comme une mesure d'impact, l'alignement Taxonomie comme un score.
 * Ce module rend chaque couche séparément, avec son statut de donnée, et dit
 * pour chacune ce qu'elle NE dit PAS. Il ne fabrique aucune note.
 *
 *   1. regulatory      — classification SFDR (art. 6/8/9) : une catégorie de
 *                        DIVULGATION déclarée par l'émetteur, pas une note.
 *   2. esg_risk        — note de risque ESG d'un fournisseur sous licence :
 *                        mesure l'exposition de l'entreprise aux risques ESG,
 *                        pas son effet sur le monde.
 *   3. characteristics — caractéristiques promues : politiques d'exclusion
 *                        documentées, thèmes revendiqués.
 *   4. taxonomy        — part alignée sur la Taxonomie européenne : une mesure
 *                        d'activité économique, indépendante de l'article SFDR.
 *   5. pai             — principales incidences négatives : publiées ou non, et
 *                        leurs valeurs quand elles sont collectées.
 *   6. impact          — effet réel sur le monde : NON mesuré par Seedow.
 *
 * Module PUR, testé (`framework.test.ts`).
 */
import type { DataStatus } from "@/lib/data/status";
import type { ObservatoryFund, SectorDisclosureLevel } from "./v2/observatory";

export type EsgLayerId =
  | "regulatory"
  | "esg_risk"
  | "characteristics"
  | "taxonomy"
  | "pai"
  | "impact";

export const ESG_LAYERS: readonly EsgLayerId[] = [
  "regulatory",
  "esg_risk",
  "characteristics",
  "taxonomy",
  "pai",
  "impact",
];

export interface EsgLayer {
  id: EsgLayerId;
  status: DataStatus;
  /** Code de valeur, traduit en i18n (`esg_framework.value.*`). */
  value: string;
  /** Paramètres d'affichage (article, nombre de secteurs…). */
  params?: Record<string, string | number>;
  /** Contradiction entre deux sources — affichée, jamais arbitrée en silence. */
  conflict?: { code: string; params: Record<string, string | number> } | null;
  source?: string | null;
  asOf?: string | null;
}

/** Ce que l'émetteur déclare dans son propre document (instantané, fiche…). */
export interface IssuerDeclaration {
  /** Libellé brut : « Article 8 », « Article 9 », « Other »… */
  sfdrDeclared: string | null;
  asOf: string | null;
  source: string | null;
}

/**
 * Article SFDR lu dans un libellé d'émetteur. « Other » désigne un fonds qui ne
 * relève ni de l'article 8 ni de l'article 9 : on le range en 6, et l'interface
 * l'écrit « ni 8 ni 9 ». Libellé illisible → `null`.
 */
export function parseSfdrArticle(label: string | null | undefined): 6 | 8 | 9 | null {
  if (!label) return null;
  const m = /article\s*(6|8|9)\b/i.exec(label);
  if (m) return Number(m[1]) as 6 | 8 | 9;
  if (/^\s*other\s*$/i.test(label)) return 6;
  return null;
}

const DOCUMENTED: SectorDisclosureLevel[] = [
  "exclu_seuil_quantifie",
  "exclu_sans_seuil",
  "non_exclu_documente",
];

export function describeEsgLayers(input: {
  fund: Pick<ObservatoryFund, "sfdrArticle" | "sectors" | "themes" | "sti"> | null;
  issuer?: IssuerDeclaration | null;
}): EsgLayer[] {
  const { fund, issuer } = input;

  // 1. Classification réglementaire — deux sources possibles, comparées.
  const catalogArticle = fund?.sfdrArticle ?? null;
  const declaredArticle = parseSfdrArticle(issuer?.sfdrDeclared);
  const article = declaredArticle ?? catalogArticle;
  const regulatory: EsgLayer = {
    id: "regulatory",
    status: article === null ? "UNAVAILABLE" : "VERIFIED",
    value: article === null ? "unknown" : article === 6 ? "article_6" : `article_${article}`,
    params: article === null ? undefined : { article },
    conflict:
      declaredArticle !== null && catalogArticle !== null && declaredArticle !== catalogArticle
        ? {
            code: "sfdr_mismatch",
            params: {
              declared: declaredArticle,
              catalog: catalogArticle,
              asOf: issuer?.asOf ?? "",
            },
          }
        : null,
    source:
      declaredArticle !== null
        ? (issuer?.source ?? null)
        : catalogArticle !== null
          ? "catalog"
          : null,
    asOf: declaredArticle !== null ? (issuer?.asOf ?? null) : null,
  };

  // 2. Risque ESG — aucune note sous licence n'est branchée sur les fonds publics.
  const esgRisk: EsgLayer = { id: "esg_risk", status: "UNAVAILABLE", value: "no_licensed_rating" };

  // 3. Caractéristiques promues — exclusions documentées et thèmes revendiqués.
  const sectors = fund?.sectors ?? [];
  const documented = sectors.filter((s) => DOCUMENTED.includes(s.level));
  const excluded = sectors.filter(
    (s) => s.level === "exclu_seuil_quantifie" || s.level === "exclu_sans_seuil",
  );
  const claimed = (fund?.themes ?? []).filter((t) => t.level === "revendique");
  const characteristics: EsgLayer = {
    id: "characteristics",
    status: documented.length > 0 ? "VERIFIED" : "UNAVAILABLE",
    value: documented.length > 0 ? "documented" : claimed.length > 0 ? "claimed_only" : "none",
    params: {
      documented: documented.length,
      excluded: excluded.length,
      total: sectors.length,
      claimed: claimed.length,
    },
    asOf:
      documented
        .map((s) => s.date)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null,
  };

  // 4. Taxonomie — non collectée. Jamais déduite de l'article SFDR.
  const taxonomy: EsgLayer = { id: "taxonomy", status: "UNAVAILABLE", value: "not_collected" };

  // 5. PAI — on sait seulement si la déclaration est publiée (signal STI C).
  const paiUnverified = fund?.sti.unverifiedSignals.includes("pai_published") ?? true;
  const blockC = fund?.sti.blocks.find((b) => b.id === "C");
  const paiPublished = !paiUnverified && blockC?.evaluable === true;
  const pai: EsgLayer = {
    id: "pai",
    status: paiPublished ? "VERIFIED" : "UNAVAILABLE",
    value: paiPublished ? "statement_published" : "not_verified",
  };

  // 6. Impact réel — hors du périmètre de mesure de Seedow, et dit comme tel.
  const impact: EsgLayer = { id: "impact", status: "UNAVAILABLE", value: "not_measured" };

  return [regulatory, esgRisk, characteristics, taxonomy, pai, impact];
}

// ── Indicateurs par pilier E / S / G ─────────────────────────────────────

export type Pillar = "E" | "S" | "G";

export interface EsgIndicator {
  id: string;
  pillar: Pillar;
  status: DataStatus;
  /** Valeur numérique (en %) ou état documentaire. `null` si indisponible. */
  value: number | string | null;
  source?: string | null;
  asOf?: string | null;
}

/** Les indicateurs que le cadre suit, par pilier — la grille est fixe et publique. */
export const INDICATOR_GRID: Record<Pillar, string[]> = {
  E: [
    "carbon_intensity",
    "fossil_sector_exposure",
    "fossil_exclusion_policy",
    "taxonomy_alignment",
    "biodiversity_exposure",
    "environmental_controversies",
  ],
  S: [
    "weapons_exclusion_policy",
    "tobacco_exclusion_policy",
    "human_rights",
    "labour_practices",
    "social_controversies",
  ],
  G: ["board_independence", "business_ethics", "corruption_controversies", "shareholder_rights"],
};

const SECTOR_POLICY_INDICATOR: Record<string, string> = {
  fossiles: "fossil_exclusion_policy",
  armement: "weapons_exclusion_policy",
  tabac: "tobacco_exclusion_policy",
};

/**
 * Remplit la grille avec ce que les sources disent RÉELLEMENT. Toute case non
 * renseignée reste UNAVAILABLE — elle compte dans la couverture, elle n'est
 * jamais remplie par défaut.
 */
export function buildEsgIndicators(input: {
  fund: Pick<ObservatoryFund, "sectors"> | null;
  /** Part du secteur Énergie (GICS) publiée par l'émetteur, en %. */
  energySectorPct?: number | null;
  energyAsOf?: string | null;
  energySource?: string | null;
}): EsgIndicator[] {
  const values = new Map<string, Omit<EsgIndicator, "id" | "pillar">>();

  if (input.energySectorPct != null && Number.isFinite(input.energySectorPct)) {
    values.set("fossil_sector_exposure", {
      status: "VERIFIED",
      value: input.energySectorPct,
      source: input.energySource ?? null,
      asOf: input.energyAsOf ?? null,
    });
  }
  for (const s of input.fund?.sectors ?? []) {
    const id = SECTOR_POLICY_INDICATOR[s.sector];
    if (!id || s.level === "non_verifie") continue;
    values.set(id, {
      status: "VERIFIED",
      value: s.level,
      source: s.source_document,
      asOf: s.date,
    });
  }

  const out: EsgIndicator[] = [];
  for (const pillar of ["E", "S", "G"] as const) {
    for (const id of INDICATOR_GRID[pillar]) {
      const v = values.get(id);
      out.push({ id, pillar, ...(v ?? { status: "UNAVAILABLE" as const, value: null }) });
    }
  }
  return out;
}

export type Confidence = "high" | "medium" | "low" | "insufficient";

export interface PillarCoverage {
  pillar: Pillar;
  available: number;
  total: number;
  coveragePct: number;
  confidence: Confidence;
}

/** Couverture d'un pilier = indicateurs renseignés (VERIFIED ou ESTIMATED) / grille. */
export function pillarCoverage(indicators: EsgIndicator[]): PillarCoverage[] {
  return (["E", "S", "G"] as const).map((pillar) => {
    const rows = indicators.filter((i) => i.pillar === pillar);
    const available = rows.filter(
      (i) => i.status === "VERIFIED" || i.status === "ESTIMATED",
    ).length;
    const coveragePct = rows.length ? (available / rows.length) * 100 : 0;
    return {
      pillar,
      available,
      total: rows.length,
      coveragePct,
      confidence: confidenceOf(coveragePct),
    };
  });
}

/** Seuils de confiance, publics : ≥ 80 % élevée, ≥ 60 % moyenne, ≥ 30 % faible, sinon insuffisante. */
export function confidenceOf(coveragePct: number): Confidence {
  if (coveragePct >= 80) return "high";
  if (coveragePct >= 60) return "medium";
  if (coveragePct >= 30) return "low";
  return "insufficient";
}

/**
 * Note composite d'un pilier, à partir de sous-notes 0..100 par indicateur.
 * Rend `null` tant que la couverture est sous `minCoveragePct` : une donnée
 * manquante ne peut pas produire une bonne note par défaut. Un indicateur
 * absent n'est jamais compté comme neutre.
 *
 * NB — Seedow n'affiche pas de note de durabilité sur ses surfaces publiques
 * (docs/scoring-v2.md) ; cette fonction encadre tout usage interne futur.
 */
export function gatedPillarScore(
  subScores: Map<string, number>,
  grid: string[],
  minCoveragePct = 60,
): { score: number | null; coveragePct: number; confidence: Confidence } {
  const known = grid.filter((id) => {
    const v = subScores.get(id);
    return v !== undefined && Number.isFinite(v);
  });
  const coveragePct = grid.length ? (known.length / grid.length) * 100 : 0;
  const confidence = confidenceOf(coveragePct);
  if (coveragePct < minCoveragePct || known.length === 0)
    return { score: null, coveragePct, confidence };
  const score =
    known.reduce((s, id) => s + Math.min(100, Math.max(0, subScores.get(id)!)), 0) / known.length;
  return { score, coveragePct, confidence };
}
