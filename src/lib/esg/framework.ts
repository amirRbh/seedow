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
 *   2. esg_risk        — notation ESG d'un fournisseur (MSCI ESG Fund Rating
 *                        quand l'émetteur la publie) : mesure la résilience
 *                        des entreprises aux risques ESG financièrement
 *                        matériels, pas leur effet sur le monde.
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
import { primarySourceStatus, type DataStatus } from "@/lib/data/status";
import type {
  BusinessInvolvementId,
  WorkbookBusinessInvolvement,
  WorkbookSustainability,
} from "@/lib/data-engine/ishares-workbook";
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

/**
 * Indicateurs de fonds calculés par un fournisseur de données (MSCI ESG
 * Research) et PUBLIÉS par l'émetteur sur sa page produit. Seedow les reprend
 * tels quels, attribués aux deux : le calculateur et le diffuseur. Seedow n'a
 * pas de licence auprès du fournisseur — d'où l'absence de redistribution.
 */
export interface ThirdPartyFundEsg {
  /** Calculateur : « MSCI ESG Research ». */
  provider: string;
  /** Diffuseur : « iShares (BlackRock) ». */
  publishedBy: string;
  sourceUrl: string | null;
  sustainability: WorkbookSustainability | null;
  businessInvolvement: WorkbookBusinessInvolvement | null;
}

/** Espace économique européen : là où le règlement SFDR et la Taxonomie s'appliquent. */
const EEA = new Set(
  "AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK IS LI NO".split(
    " ",
  ),
);

/**
 * Le fonds relève-t-il du cadre européen (SFDR, Taxonomie) ? Lu sur le pays de
 * l'ISIN, qui est celui de l'émission. `null` si l'ISIN manque : on ne présume
 * rien. Un fonds hors EEE commercialisé en Europe peut publier un article SFDR :
 * la déclaration de l'émetteur prime alors.
 */
export function euFrameworkApplies(isin: string | null | undefined): boolean | null {
  const cc = isin?.trim().slice(0, 2).toUpperCase();
  if (!cc || !/^[A-Z]{2}$/.test(cc)) return null;
  return EEA.has(cc);
}

function thirdPartySource(tp: ThirdPartyFundEsg): string {
  return `${tp.provider}, publié par ${tp.publishedBy}`;
}

const DOCUMENTED: SectorDisclosureLevel[] = [
  "exclu_seuil_quantifie",
  "exclu_sans_seuil",
  "non_exclu_documente",
];

export function describeEsgLayers(input: {
  fund: Pick<ObservatoryFund, "sfdrArticle" | "sectors" | "themes" | "sti"> | null;
  issuer?: IssuerDeclaration | null;
  /** ISIN du fonds : situe le fonds dans ou hors du cadre européen. */
  isin?: string | null;
  thirdParty?: ThirdPartyFundEsg | null;
  /**
   * Rendu destiné à un EXPORT (rapport, fichier) : une notation tierce non
   * redistribuable y est signalée comme publiée, sans sa valeur.
   */
  exportContext?: boolean;
  now?: Date;
}): EsgLayer[] {
  const { fund, issuer, thirdParty } = input;
  const eu = euFrameworkApplies(input.isin);

  // 1. Classification réglementaire — deux sources possibles, comparées.
  const catalogArticle = fund?.sfdrArticle ?? null;
  const declaredArticle = parseSfdrArticle(issuer?.sfdrDeclared);
  const article = declaredArticle ?? catalogArticle;
  // Hors EEE et sans article déclaré : SFDR ne s'applique pas — ce n'est ni un
  // trou de collecte ni un défaut du fonds, et l'interface l'écrit comme tel.
  const nonEu = eu === false && article === null;
  const regulatory: EsgLayer = {
    id: "regulatory",
    status: article === null ? "UNAVAILABLE" : "VERIFIED",
    value: nonEu
      ? "not_applicable"
      : article === null
        ? "unknown"
        : article === 6
          ? "article_6"
          : `article_${article}`,
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

  // 2. Risque ESG — la notation MSCI du fonds quand l'émetteur la publie, reprise
  //    telle quelle et attribuée. Jamais recalculée, jamais convertie en score
  //    Seedow, jamais utilisée pour classer (docs/scoring-v2.md).
  const sust = thirdParty?.sustainability ?? null;
  const esgRisk: EsgLayer =
    thirdParty && sust?.msciRating && input.exportContext
      ? {
          id: "esg_risk",
          status: primarySourceStatus(true, sust.asOf, "esg_fund_metrics", input.now),
          value: "published_not_exported",
          params: { provider: thirdParty.provider, issuer: thirdParty.publishedBy },
          source: thirdPartySource(thirdParty),
          asOf: sust.asOf,
        }
      : thirdParty && sust?.msciRating
        ? {
            id: "esg_risk",
            status: primarySourceStatus(true, sust.asOf, "esg_fund_metrics", input.now),
            value: "msci_fund_rating",
            params: {
              rating: sust.msciRating,
              coverage: sust.ratingCoveragePct ?? "—",
              quality: sust.qualityScore ?? "—",
            },
            source: thirdPartySource(thirdParty),
            asOf: sust.asOf,
          }
        : { id: "esg_risk", status: "UNAVAILABLE", value: "no_licensed_rating" };

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

  // 4. Taxonomie — non collectée. Jamais déduite de l'article SFDR. Hors EEE, le
  //    règlement ne s'applique pas.
  const taxonomy: EsgLayer = {
    id: "taxonomy",
    status: "UNAVAILABLE",
    value: nonEu ? "not_applicable" : "not_collected",
  };

  // 5. PAI — on sait seulement si la déclaration est publiée (signal STI C).
  const paiUnverified = fund?.sti.unverifiedSignals.includes("pai_published") ?? true;
  const blockC = fund?.sti.blocks.find((b) => b.id === "C");
  const paiPublished = !paiUnverified && blockC?.evaluable === true;
  // Hors EEE : pas de déclaration PAI. Deux expositions publiées en sont
  // voisines (armes controversées ≈ PAI 14, Pacte mondial ≈ PAI 10) : elles
  // sont montrées comme indicateurs, jamais comme une déclaration PAI.
  const proxies = (thirdParty?.businessInvolvement?.rows ?? []).filter(
    (r) => r.id === "controversial_weapons" || r.id === "ungc_violators",
  ).length;
  const pai: EsgLayer = {
    id: "pai",
    status: paiPublished ? "VERIFIED" : "UNAVAILABLE",
    value: paiPublished
      ? "statement_published"
      : nonEu
        ? proxies > 0
          ? "not_applicable_proxies"
          : "not_applicable"
        : "not_verified",
    params: proxies > 0 ? { proxies } : undefined,
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
    "implied_temperature_rise",
    "fossil_sector_exposure",
    "thermal_coal_involvement",
    "oil_sands_involvement",
    "fossil_exclusion_policy",
    "taxonomy_alignment",
    "biodiversity_exposure",
    "environmental_controversies",
  ],
  S: [
    "controversial_weapons_involvement",
    "ungc_violations",
    "weapons_exclusion_policy",
    "tobacco_involvement",
    "tobacco_exclusion_policy",
    "human_rights",
    "labour_practices",
    "social_controversies",
  ],
  G: ["board_independence", "business_ethics", "corruption_controversies", "shareholder_rights"],
};

/** Exposition d'activité publiée → indicateur de la grille. */
const INVOLVEMENT_INDICATOR: Partial<Record<BusinessInvolvementId, string>> = {
  thermal_coal: "thermal_coal_involvement",
  oil_sands: "oil_sands_involvement",
  controversial_weapons: "controversial_weapons_involvement",
  ungc_violators: "ungc_violations",
  tobacco: "tobacco_involvement",
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
  thirdParty?: ThirdPartyFundEsg | null;
  now?: Date;
}): EsgIndicator[] {
  const values = new Map<string, Omit<EsgIndicator, "id" | "pillar">>();

  const tp = input.thirdParty;
  if (tp) {
    const source = thirdPartySource(tp);
    const sust = tp.sustainability;
    const status = (asOf: string | null) =>
      primarySourceStatus(true, asOf, "esg_fund_metrics", input.now);
    if (sust?.waci != null)
      values.set("carbon_intensity", {
        status: status(sust.asOf),
        value: sust.waci,
        source,
        asOf: sust.asOf,
      });
    if (sust?.impliedTempRise)
      values.set("implied_temperature_rise", {
        status: status(sust.asOf),
        value: sust.impliedTempRise,
        source,
        asOf: sust.asOf,
      });
    const bi = tp.businessInvolvement;
    for (const row of bi?.rows ?? []) {
      const id = INVOLVEMENT_INDICATOR[row.id];
      if (!id) continue;
      values.set(id, { status: status(bi!.asOf), value: row.pct, source, asOf: bi!.asOf });
    }
  }

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
