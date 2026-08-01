/**
 * Le Réveil — moteur du fil de conscience quotidien.
 *
 * Au niveau ENTREPRISE (là où « Le Fil » de l'impact reste au niveau portefeuille) :
 * ce que la donnée dit des entreprises que tu détiens ou suis, aujourd'hui.
 *
 * Contrat de transparence (CLAUDE.md §1.2, §1.3, §7) tenu strictement :
 *  - Aucun événement inventé. On n'écrit PAS « hier à 18h42 » : on n'a pas de flux
 *    d'événements temps réel. On énonce ce que les données de l'app établissent
 *    réellement (détection de greenwashing, score ESG, votes d'AG à venir), daté
 *    du jour de lecture.
 *  - Chaque dépêche porte une source. Le ton est doublé d'un libellé/icône côté
 *    UI, jamais porté par la seule couleur (§4).
 *  - Équilibre : la mauvaise nouvelle et la bonne nouvelle cohabitent (§7).
 *
 * Fonction PURE, testable isolément. Le texte vit dans l'i18n (`reveil.*`).
 */

import type { GreenwashingRisk, GreenwashingReason } from "@/lib/esg/transparency";

export type ReveilTone = "action" | "caution" | "bright";

/** Une entreprise que l'utilisateur détient ou suit, avec ses signaux ESG. */
export interface ReveilSubject {
  assetId: string;
  ticker: string;
  name: string;
  esgScore: number; // 0..10
  greenwashingRisk: GreenwashingRisk;
  greenwashingReasons: GreenwashingReason[];
  /** true si l'entreprise est dans le portefeuille (vs seulement suivie). */
  owned: boolean;
}

/** Un vote d'AG à venir, rapproché des entreprises de l'utilisateur par ticker. */
export interface ReveilVote {
  resolutionId: string;
  ticker: string | null;
  company: string;
  daysLeft: number | null;
}

export type ReveilAction =
  | { kind: "vote"; resolutionId: string }
  | { kind: "asset"; assetId: string };

export interface ReveilDispatch {
  id: string;
  tone: ReveilTone;
  company: string;
  headlineKey: string;
  headlineParams?: Record<string, string | number>;
  bodyKey?: string;
  bodyParams?: Record<string, string | number>;
  /** Libellé de source, affiché à l'écran (§1.2). */
  source: string;
  action: ReveilAction | null;
}

export interface ReveilOptions {
  maxCards?: number;
  /** Score ESG minimal pour une dépêche « bonne nouvelle ». */
  brightEsgFloor?: number;
}

function riskRank(risk: GreenwashingRisk): number {
  return risk === "high" ? 2 : risk === "medium" ? 1 : 0;
}

/**
 * Construit le fil du Réveil, ordonné : votes à venir (actionnables) → écarts de
 * greenwashing (le plus grave d'abord, ce que tu détiens d'abord) → une bonne
 * nouvelle. Une entreprise n'apparaît qu'une fois hors votes. Plafonné.
 */
export function buildReveil(
  subjects: readonly ReveilSubject[],
  votes: readonly ReveilVote[],
  opts: ReveilOptions = {},
): ReveilDispatch[] {
  const maxCards = opts.maxCards ?? 6;
  const brightFloor = opts.brightEsgFloor ?? 7.5;

  const subjectTickers = new Set(subjects.map((s) => s.ticker.toUpperCase()));
  const out: ReveilDispatch[] = [];
  const seenCompanies = new Set<string>();

  // 1 — Votes à venir sur une entreprise que tu détiens/suis (actionnable, prioritaire).
  const relevantVotes = votes
    .filter((v) => v.ticker != null && subjectTickers.has(v.ticker.toUpperCase()))
    .sort(
      (a, b) => (a.daysLeft ?? Number.POSITIVE_INFINITY) - (b.daysLeft ?? Number.POSITIVE_INFINITY),
    );
  for (const v of relevantVotes) {
    out.push({
      id: `vote-${v.resolutionId}`,
      tone: "action",
      company: v.company,
      headlineKey: "reveil.vote.headline",
      headlineParams: { company: v.company },
      bodyKey: v.daysLeft != null ? "reveil.vote.body" : undefined,
      bodyParams: v.daysLeft != null ? { n: v.daysLeft } : undefined,
      source: "Assemblée générale",
      action: { kind: "vote", resolutionId: v.resolutionId },
    });
  }

  // 2 — Écart entre le discours et la donnée (greenwashing) sur tes lignes.
  const flagged = [...subjects]
    .filter((s) => s.greenwashingRisk !== "low")
    .sort((a, b) => {
      const r = riskRank(b.greenwashingRisk) - riskRank(a.greenwashingRisk);
      if (r !== 0) return r;
      return Number(b.owned) - Number(a.owned);
    });
  for (const s of flagged) {
    if (seenCompanies.has(s.name)) continue;
    const reason = s.greenwashingReasons[0];
    out.push({
      id: `gw-${s.assetId}`,
      tone: "caution",
      company: s.name,
      headlineKey: s.owned
        ? "reveil.greenwashing.headline_owned"
        : "reveil.greenwashing.headline_watched",
      headlineParams: { company: s.name },
      bodyKey: reason ? `reveil.reason.${reason}` : "reveil.greenwashing.generic",
      source: "Détection Seedow",
      action: { kind: "asset", assetId: s.assetId },
    });
    seenCompanies.add(s.name);
  }

  // 3 — Bonne nouvelle : une ligne solide et cohérente (équilibre §7).
  const bright = [...subjects]
    .filter((s) => s.greenwashingRisk === "low" && s.esgScore >= brightFloor)
    .sort((a, b) => b.esgScore - a.esgScore);
  for (const s of bright) {
    if (seenCompanies.has(s.name)) continue;
    out.push({
      id: `bright-${s.assetId}`,
      tone: "bright",
      company: s.name,
      headlineKey: s.owned ? "reveil.bright.headline_owned" : "reveil.bright.headline_watched",
      headlineParams: { company: s.name, score: s.esgScore.toFixed(1) },
      bodyKey: "reveil.bright.body",
      source: "Données ESG",
      action: { kind: "asset", assetId: s.assetId },
    });
    seenCompanies.add(s.name);
  }

  return out.slice(0, maxCards);
}
