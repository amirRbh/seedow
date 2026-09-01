/**
 * Assemblage de l'Observatoire v2 — la couche qui relie les quatre moteurs
 * (déduplication, STI, constats, thèmes) à ce que les pages affichent.
 *
 * ── La séparation stricte des trois objets (spec §2) ──────────────────────
 *
 *   Indice de transparence (STI)  fait documentaire      agrégé en 0–100
 *   Constats d'écart              contradiction sourcée  JAMAIS agrégés
 *   Faits bruts                   donnée publiée         JAMAIS agrégés
 *
 * L'erreur structurelle de la v1 est d'avoir mélangé ces trois natures dans un
 * même chiffre. Aucun des trois n'alimente les deux autres, et ce fichier est
 * l'endroit où cette séparation doit tenir : un fonds peut avoir un STI de 90 ET
 * un constat d'écart. Cela veut dire qu'il publie beaucoup, et que dans ce qu'il
 * publie il y a une contradiction. C'est cohérent — c'est même l'usage le plus
 * intéressant de l'Observatoire, et il serait invisible si le constat faisait
 * baisser le score.
 */
import {
  computeSti,
  STI_SECTORS,
  type StiResult,
  type ComputeStiOptions,
  type StiSector,
} from "./sti";
import type { TransparencySignal } from "./signal";
import { groupFundEntities, type FundEntity, type FundLine } from "./fund-entity";
import { deriveThemeClaims, displayedThemes, type ThemeClaim } from "./theme-claims";
import { peerGroup, type PeerGroup } from "./peer-group";
import { publishable, type Discrepancy } from "./discrepancies";

/**
 * Ce que la documentation dit d'un secteur — quatre états, pas deux.
 *
 * La v1 affichait « ce qu'il ne s'interdit pas » à partir d'une liste
 * d'exclusions stockée par Seedow : un secteur absent de la liste se lisait
 * comme « non exclu », alors qu'il pouvait tout aussi bien signifier « Seedow
 * n'a pas regardé ». La v2 distingue les deux, parce que c'est exactement la
 * différence entre un fait sur le fonds et un trou de collecte.
 */
export type SectorDisclosureLevel =
  | "exclu_seuil_quantifie"
  | "exclu_sans_seuil"
  | "non_exclu_documente"
  | "non_verifie";

export interface SectorDisclosure {
  sector: StiSector;
  level: SectorDisclosureLevel;
  source_document: string | null;
  source_url: string | null;
  date: string | null;
}

/** Une ligne de cotation telle que la base la donne, avant déduplication. */
export interface ObservatoryLine extends FundLine {
  /** Identifiant `assets.id` — sert à retrouver la composition publiée. */
  assetId?: string | null;
  assetClass: string;
  /** Article SFDR déclaré — un FAIT BRUT repris à l'identique, jamais un score. */
  sfdrArticle: number | null;
  ter: number | null;
  investmentObjective?: string | null;
  esgDocumentation?: string | null;
}

/** Une entité-fonds prête à afficher : un STI, des constats, des thèmes déclarés. */
export interface ObservatoryFund {
  key: string;
  slug: string;
  name: string;
  issuer: string | null;
  isins: string[];
  tickers: string[];
  /** Les `assets.id` des parts regroupées — plusieurs lignes, un seul fonds. */
  assetIds: string[];
  assetClass: string;
  sfdrArticle: number | null;
  ter: number | null;
  sti: StiResult;
  /** Constats publiables uniquement — les brouillons ne sortent jamais d'ici. */
  discrepancies: Discrepancy[];
  themes: ThemeClaim[];
  /** Ce que la documentation dit des six secteurs — jamais agrégé en score. */
  sectors: SectorDisclosure[];
  peer: PeerGroup;
}

/**
 * Zone géographique déduite de la classe d'actif et du nom — uniquement pour
 * constituer les groupes de pairs. Elle n'est jamais affichée comme un fait sur
 * le fonds : c'est une clé de regroupement interne, pas une donnée publiée.
 */
const REGION_MARKERS: [RegExp, string][] = [
  [/\b(world|monde|global|acwi|developed)\b/i, "monde"],
  [/\b(emerging|em|marches emergents)\b/i, "emergents"],
  [/\b(europe|euro|emu|eurozone)\b/i, "europe"],
  [/\b(usa|us|united states|s&p 500|sp500|america)\b/i, "amerique_nord"],
  [/\b(japan|japon|asia|asie|pacific|pacifique|china|chine)\b/i, "asie_pacifique"],
];

export function deriveRegion(name: string): string | null {
  for (const [re, region] of REGION_MARKERS) if (re.test(name)) return region;
  return null;
}

export interface AssembleInput {
  lines: readonly ObservatoryLine[];
  /** Signaux STI, indexés par clé d'entité. */
  signalsByEntity: ReadonlyMap<string, TransparencySignal<string>[]>;
  /** Constats, indexés par clé d'entité. */
  discrepanciesByEntity: ReadonlyMap<string, Discrepancy[]>;
  stiOptions?: ComputeStiOptions;
}

/**
 * Construit la liste de l'Observatoire : dédupliquée, notée quand c'est
 * publiable, et sans le moindre chiffre inventé quand ça ne l'est pas.
 */
export function assembleObservatory(input: AssembleInput): ObservatoryFund[] {
  const entities = groupFundEntities(input.lines);
  return entities.map((entity) => toFund(entity, input));
}

function toFund(entity: FundEntity<ObservatoryLine>, input: AssembleInput): ObservatoryFund {
  // Une entité regroupe plusieurs parts de la même stratégie : leurs faits bruts
  // sont identiques par construction. On lit la première ligne, et on ne
  // moyenne rien — moyenner deux parts d'un même fonds fabriquerait une valeur
  // qui n'est publiée nulle part.
  const head = entity.lines[0];
  const signals = input.signalsByEntity.get(entity.key) ?? [];
  const sti = computeSti(signals, input.stiOptions);
  const discrepancies = (input.discrepanciesByEntity.get(entity.key) ?? []).filter(publishable);
  const sectors = deriveSectorDisclosure(signals);
  const themes = displayedThemes(
    deriveThemeClaims({
      name: entity.name,
      investmentObjective: head.investmentObjective ?? null,
      esgDocumentation: head.esgDocumentation ?? null,
    }),
  );
  return {
    key: entity.key,
    slug: entity.slug,
    name: entity.name,
    issuer: entity.issuer,
    isins: entity.isins,
    tickers: entity.tickers,
    assetIds: entity.lines.map((l) => l.assetId).filter((id): id is string => Boolean(id)),
    assetClass: head.assetClass,
    sfdrArticle: head.sfdrArticle,
    ter: head.ter,
    sti,
    discrepancies,
    themes,
    sectors,
    peer: peerGroup({
      assetClass: head.assetClass,
      region: deriveRegion(entity.name),
      declaredTheme: themes.find((th) => th.level === "revendique")?.tag ?? null,
    }),
  };
}

/**
 * Lit les six signaux d'exclusion du bloc B et les traduit en états lisibles.
 * Aucun secteur n'est déduit d'autre chose que de son propre signal.
 */
export function deriveSectorDisclosure(
  signals: readonly TransparencySignal<string>[],
): SectorDisclosure[] {
  return STI_SECTORS.map((sector) => {
    const signal = signals.find((s) => s.signal === `exclusion_${sector}`);
    const level: SectorDisclosureLevel =
      signal == null || signal.statut === "non_verifie"
        ? "non_verifie"
        : signal.statut === "absent"
          ? "non_exclu_documente"
          : signal.valeur === "seuil_quantifie"
            ? "exclu_seuil_quantifie"
            : "exclu_sans_seuil";
    return {
      sector,
      level,
      source_document: signal?.source_document ?? null,
      source_url: signal?.source_url ?? null,
      date: signal?.date_donnee ?? null,
    };
  });
}

export interface ObservatoryStats {
  /** Entités-fonds après déduplication — pas des lignes de cotation. */
  funds: number;
  /** Lignes de cotation absorbées (le chiffre que la v1 affichait comme total). */
  lines: number;
  /**
   * Fonds non notables. Le taux est publié EN TÊTE d'Observatoire : c'est un
   * meilleur titre que n'importe quel classement, et c'est le chiffre qui rend
   * la limite de données de Seedow lisible au lieu de la masquer.
   */
  notRatable: number;
  notRatablePct: number;
  /** Fonds portant au moins un constat opposable. */
  withDiscrepancy: number;
}

export function observatoryStats(funds: readonly ObservatoryFund[]): ObservatoryStats {
  const notRatable = funds.filter((f) => !f.sti.publishable).length;
  return {
    funds: funds.length,
    lines: funds.reduce((acc, f) => acc + f.tickers.length, 0),
    notRatable,
    notRatablePct: funds.length ? Math.round((100 * notRatable) / funds.length) : 0,
    withDiscrepancy: funds.filter((f) => f.discrepancies.length > 0).length,
  };
}
