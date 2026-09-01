/**
 * Constats d'écart — typologie fermée E1 à E5.
 *
 * ── L'erreur de la v1 ──────────────────────────────────────────────────────
 *
 * La v1 produisait 67 « écarts » sur le catalogue, dont la plupart n'étaient pas
 * des constats mais des trous de données Seedow reformulés en reproche :
 *
 *   « revendication durable sans donnée d'intensité carbone mesurée »
 *        → Seedow n'a pas la donnée. Cela ne dit rien du fonds. Ce fait bascule
 *          dans le bloc C du STI, où l'absence de PUBLICATION est comptée à sa
 *          juste place.
 *   « revendication appuyée sur des données en partie estimées »
 *        → décrit la source Seedow, pas le fonds. Bascule dans l'indicateur de
 *          couverture de la fiche.
 *   « thème environnemental revendiqué avec un score climat à la limite »
 *        → circulaire : Seedow attribuait le thème, puis constatait l'écart avec
 *          son propre score. Supprimé sans remplacement.
 *
 * Un émetteur épinglé par surprise sur un constat qui s'avère être un trou de
 * données de Seedow attaque, et gagne. D'où la règle : **un constat requiert
 * trois éléments simultanés**, sans exception (spec §4.1) —
 *   1. une REVENDICATION du fonds, citée d'un document public, sourcée et datée ;
 *   2. un FAIT d'un document public qui la contredit, sourcé et daté ;
 *   3. aucune INFÉRENCE entre les deux : le lecteur constate lui-même.
 *
 * Si l'un des trois manque, il n'y a pas de constat. `isOpposable()` est la
 * porte : rien ne s'affiche sans l'avoir passée.
 *
 * Fonctions pures, sans I/O.
 */
import type { SignalStatus, TransparencySignal } from "./signal";

/** Typologie FERMÉE. Toute observation hors de cette liste n'est pas publiée. */
export type DiscrepancyCode = "E1" | "E2" | "E3" | "E4" | "E5";

export const DISCREPANCY_CODES: DiscrepancyCode[] = ["E1", "E2", "E3", "E4", "E5"];

/** Un élément sourcé : sans document ni date, il ne compte pas. */
export interface SourcedStatement {
  /** Citation exacte (revendication) ou fait constaté, en clair. */
  text: string;
  source_document: string | null;
  source_url: string | null;
  /** Date du document. ISO `YYYY-MM-DD`. */
  date: string | null;
}

/**
 * Suite donnée au constat (spec §8). Un constat contesté RESTE publié, avec la
 * contestation à côté ; un constat corrigé est retiré mais reste tracé — jamais
 * de suppression silencieuse.
 */
export type DiscrepancyState = "brouillon" | "notifie" | "publie" | "conteste" | "retire";

export interface IssuerResponse {
  /** Texte intégral de l'émetteur, publié sans commentaire de Seedow. */
  text: string;
  received_at: string | null;
}

export interface Discrepancy {
  code: DiscrepancyCode;
  /** Identité du fonds concerné (clé d'entité dédupliquée, cf. `fund-entity.ts`). */
  entity_key: string;
  claim: SourcedStatement;
  fact: SourcedStatement;
  /**
   * Ligne 3 obligatoire de la formulation (spec §4.4) : ce que ce constat NE dit
   * PAS. C'est ce qui distingue un constat d'une accusation.
   */
  limit: string;
  state: DiscrepancyState;
  /** Date de notification préalable à l'émetteur — affichée sur la fiche (§8). */
  notified_at: string | null;
  issuer_response: IssuerResponse | null;
  /** Version de la grille au moment du constat. */
  version: string;
}

/** Un élément sourcé est complet quand il porte un texte, un document et une date. */
function isSourced(s: SourcedStatement | null | undefined): boolean {
  return Boolean(s && s.text.trim() && s.source_document?.trim() && s.date);
}

/**
 * Porte d'entrée unique : les trois éléments, simultanément. Un constat qui ne
 * la passe pas n'est pas « faible », il n'existe pas.
 */
export function isOpposable(d: Discrepancy): boolean {
  return (
    DISCREPANCY_CODES.includes(d.code) &&
    isSourced(d.claim) &&
    isSourced(d.fact) &&
    Boolean(d.limit.trim())
  );
}

/** Constats affichables : opposables, notifiés, et non retirés (§8). */
export function publishable(d: Discrepancy): boolean {
  return isOpposable(d) && d.state !== "brouillon" && d.state !== "retire";
}

/** Délai de réponse laissé à l'émetteur avant publication (jours ouvrés, §8). */
export const NOTICE_PERIOD_WORKING_DAYS = 15;
/** Délai de retrait d'un constat une fois le document manquant produit (§8). */
export const CORRECTION_DEADLINE_HOURS = 48;

/**
 * La formulation en trois lignes fixes (spec §4.4). Rendue ici plutôt qu'en
 * gabarit d'interface : la troisième ligne est obligatoire, et une contrainte
 * obligatoire tient mieux dans le moteur que dans une consigne de design.
 */
export interface DiscrepancyLines {
  declares: string;
  shows: string;
  doesNotSay: string;
}

export function formatDiscrepancy(d: Discrepancy): DiscrepancyLines {
  const attribution = (s: SourcedStatement) =>
    [s.source_document, s.date].filter(Boolean).join(", ");
  return {
    declares: `« ${d.claim.text} » — ${attribution(d.claim)}`,
    shows: `${d.fact.text} — ${attribution(d.fact)}`,
    doesNotSay: d.limit,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Détection — E1 seul est calculable sans base documentaire complète.
// ─────────────────────────────────────────────────────────────────────────────
//
// E2 à E5 deviennent calculables une fois les blocs A/B/C collectés (spec §10,
// phase 3). Les détecteurs sont écrits ici pour qu'ils partent des mêmes
// signaux, jamais d'une heuristique parallèle.

export interface DetectionInput {
  entity_key: string;
  /** Nom commercial du fonds, tel que publié. */
  name: string;
  /** Article SFDR déclaré (6/8/9), ou null. */
  sfdrArticle: number | null;
  /** Document portant la classification SFDR (prospectus, KID…). */
  sfdrSource: SourcedStatement | null;
  /** Signaux STI collectés pour ce fonds. */
  signals: readonly TransparencySignal<string>[];
}

function signalStatus(
  signals: readonly TransparencySignal<string>[],
  id: string,
): SignalStatus | null {
  return signals.find((s) => s.signal === id)?.statut ?? null;
}

function signalOf(signals: readonly TransparencySignal<string>[], id: string) {
  return signals.find((s) => s.signal === id) ?? null;
}

/** Limites explicites, par code — la ligne 3, écrite une fois pour toutes. */
export const DISCREPANCY_LIMITS: Record<DiscrepancyCode, string> = {
  E1: "Ce constat ne dit pas que le fonds détient ces secteurs. Il constate l'absence d'engagement formel à ne pas les détenir.",
  E2: "Ce constat ne dit pas que la dénomination est trompeuse. Il constate qu'aucune exclusion publiée ne correspond au thème revendiqué.",
  E3: "Ce constat ne dit pas que le fonds est plus carboné que le marché. Il compare deux chiffres publiés par le fonds lui-même, à la même date.",
  E4: "Ce constat ne dit pas que le fonds a cessé de produire ce rapport. Il constate qu'aucune publication n'est accessible depuis plus de 24 mois.",
  E5: "Ce constat ne dit pas laquelle des deux versions fait foi. Il constate que deux documents publics du même fonds ne disent pas la même chose.",
};

/**
 * E1 — classé Article 8 ou 9 sans AUCUNE politique d'exclusion sectorielle
 * formelle publiée.
 *
 * Le point de rigueur est le statut du signal : seul un `absent` (recherche
 * menée, rien publié) fonde le constat. Un `non_vérifié` (source injoignable)
 * ne fonde rien — c'est précisément la confusion qui rendait 59 constats de la
 * v1 attaquables.
 */
export function detectE1(input: DetectionInput, today: string): Discrepancy | null {
  const article = input.sfdrArticle;
  if (article !== 8 && article !== 9) return null;
  if (!isSourced(input.sfdrSource)) return null;
  if (signalStatus(input.signals, "exclusion_policy_public") !== "absent") return null;

  const policySignal = signalOf(input.signals, "exclusion_policy_public");
  return {
    code: "E1",
    entity_key: input.entity_key,
    claim: input.sfdrSource as SourcedStatement,
    fact: {
      text: "Aucune politique d'exclusion sectorielle formelle publiée : recherche menée sur la documentation publique de l'émetteur, aucun document dédié ni section identifiée du prospectus.",
      source_document: policySignal?.source_document ?? "Documentation publique de l'émetteur",
      source_url: policySignal?.source_url ?? null,
      date: policySignal?.date_collecte ?? today,
    },
    limit: DISCREPANCY_LIMITS.E1,
    state: "brouillon",
    notified_at: null,
    issuer_response: null,
    version: "2.0",
  };
}

/**
 * E3 — intensité carbone publiée supérieure à l'indice de référence **déclaré
 * par le fonds lui-même**.
 *
 * Seul constat qui compare des chiffres. Il n'utilise JAMAIS un indice choisi
 * par Seedow : c'est la différence entre un constat et une opinion. Les deux
 * chiffres doivent venir de la même source et de la même date, sinon on compare
 * deux photographies prises à deux moments — et un émetteur le démonte en une
 * ligne.
 */
export interface CarbonComparisonInput {
  entity_key: string;
  fundIntensity: number | null;
  /** Intensité de l'indice tel que LE FONDS le déclare comme référence. */
  declaredBenchmarkIntensity: number | null;
  benchmarkName: string | null;
  source: SourcedStatement | null;
}

export function detectE3(input: CarbonComparisonInput): Discrepancy | null {
  const { fundIntensity: fund, declaredBenchmarkIntensity: bench } = input;
  if (fund == null || bench == null) return null;
  if (!Number.isFinite(fund) || !Number.isFinite(bench)) return null;
  if (fund <= bench) return null;
  if (!isSourced(input.source) || !input.benchmarkName) return null;

  const src = input.source as SourcedStatement;
  return {
    code: "E3",
    entity_key: input.entity_key,
    claim: {
      text: `Indice de référence déclaré par le fonds : ${input.benchmarkName}, intensité carbone ${bench}`,
      source_document: src.source_document,
      source_url: src.source_url,
      date: src.date,
    },
    fact: {
      text: `Intensité carbone publiée du fonds : ${fund}, supérieure à celle de son indice de référence déclaré`,
      source_document: src.source_document,
      source_url: src.source_url,
      date: src.date,
    },
    limit: DISCREPANCY_LIMITS.E3,
    state: "brouillon",
    notified_at: null,
    issuer_response: null,
    version: "2.0",
  };
}
