/**
 * Ton Argent Vote — logique métier du « Bloc ».
 *
 * Le Bloc, c'est l'agrégation honnête des intentions de vote des utilisateurs
 * Seedow sur une résolution d'assemblée générale. Aucun chiffre fabriqué : on
 * ne compte que de vrais votes (§1.2 / §1.3 du CLAUDE.md). Cette logique est
 * pure (aucun accès réseau/DB) pour être testable et vivre hors d'un composant
 * (§3 — pas de calcul métier inline dans un composant).
 */

export type VoteChoice = "for" | "against" | "abstain";

export const VOTE_CHOICES: readonly VoteChoice[] = ["for", "against", "abstain"] as const;

export function isVoteChoice(value: unknown): value is VoteChoice {
  return value === "for" || value === "against" || value === "abstain";
}

/** Décompte agrégé des votes d'une résolution. `total` = somme des trois. */
export interface BlocTally {
  for: number;
  against: number;
  abstain: number;
  total: number;
}

export function emptyTally(): BlocTally {
  return { for: 0, against: 0, abstain: 0, total: 0 };
}

/**
 * Compte des lignes de vote brutes en un décompte agrégé. Ignore silencieusement
 * les choix invalides plutôt que de fausser le total (une ligne corrompue ne
 * doit pas gonfler le Bloc).
 */
export function tallyVotes(rows: ReadonlyArray<{ choice: string | null }>): BlocTally {
  const tally = emptyTally();
  for (const row of rows) {
    if (!isVoteChoice(row.choice)) continue;
    tally[row.choice] += 1;
    tally.total += 1;
  }
  return tally;
}

/**
 * Construit un décompte agrégé à partir de comptes déjà groupés en base
 * (`{ choice, count }`), tels que renvoyés par l'agrégat SQL `tally_resolution_votes`.
 * Évite de rapatrier toutes les lignes de vote côté serveur (efficacité §12) :
 * on ne transporte que trois nombres par résolution. Ignore les choix invalides
 * et borne les comptes négatifs/non finis pour ne jamais fausser le total.
 */
export function tallyFromCounts(
  rows: ReadonlyArray<{ choice: string | null; count: number }>,
): BlocTally {
  const tally = emptyTally();
  for (const row of rows) {
    if (!isVoteChoice(row.choice)) continue;
    const n = Number.isFinite(row.count) ? Math.max(0, Math.floor(row.count)) : 0;
    tally[row.choice] += n;
    tally.total += n;
  }
  return tally;
}

/**
 * Part d'un camp dans le Bloc, entre 0 et 1. Renvoie 0 si personne n'a encore
 * voté (pas de division par zéro, pas de NaN affiché à l'écran).
 */
export function blocShare(tally: BlocTally, choice: VoteChoice): number {
  if (tally.total <= 0) return 0;
  return tally[choice] / tally.total;
}

/**
 * Camp majoritaire du Bloc, ou `null` si aucun vote ou parfaite égalité entre
 * les deux premiers. On ne « déclare » jamais un gagnant sur une égalité.
 */
export function dominantChoice(tally: BlocTally): VoteChoice | null {
  if (tally.total <= 0) return null;
  const ranked = [...VOTE_CHOICES].sort((a, b) => tally[b] - tally[a]);
  if (tally[ranked[0]] === tally[ranked[1]]) return null;
  return ranked[0];
}

/**
 * Position de l'utilisateur dans le Bloc après son vote : combien d'autres
 * partagent son choix (lui exclu), et le rang honnête (« 3ᵉ à voter contre »).
 * `sharing` n'est jamais négatif même si les décomptes arrivent désynchronisés.
 */
export interface BlocPosition {
  choice: VoteChoice;
  /** Nombre total sur ce camp, l'utilisateur compris. */
  sameChoice: number;
  /** Les autres, l'utilisateur exclu. */
  others: number;
  /** Rang d'arrivée sur ce camp (1 = premier). */
  rank: number;
}

export function blocPosition(tally: BlocTally, choice: VoteChoice): BlocPosition {
  const sameChoice = Math.max(0, tally[choice]);
  const others = Math.max(0, sameChoice - 1);
  return { choice, sameChoice, others, rank: sameChoice };
}

/** Une résolution est-elle encore ouverte au vote à l'instant `now` ? */
export function isVotable(
  resolution: { status: "open" | "closed"; closesAt: string },
  now: Date = new Date(),
): boolean {
  if (resolution.status !== "open") return false;
  const closes = new Date(resolution.closesAt).getTime();
  if (Number.isNaN(closes)) return true; // pas de date exploitable → on n'empêche pas de voter
  return closes > now.getTime();
}

/**
 * Jours restants avant la clôture, arrondi à l'entier supérieur, borné à 0.
 * `null` si la date est inexploitable (on n'affiche alors pas de compte à rebours).
 */
export function daysUntilClose(closesAt: string, now: Date = new Date()): number | null {
  const closes = new Date(closesAt).getTime();
  if (Number.isNaN(closes)) return null;
  const diffMs = closes - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Parmi une liste de résolutions, celle encore ouverte au vote dont la clôture
 * est la plus proche — le meilleur candidat à mettre en avant (dashboard). Les
 * dates inexploitables passent en dernier. `null` si aucune n'est votable.
 */
export function soonestClosingOpen<T extends { status: "open" | "closed"; closesAt: string }>(
  items: readonly T[],
  now: Date = new Date(),
): T | null {
  const votable = items.filter((item) => isVotable(item, now));
  if (votable.length === 0) return null;
  const rank = (c: string) => {
    const t = new Date(c).getTime();
    return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
  };
  return votable.reduce((best, cur) => (rank(cur.closesAt) < rank(best.closesAt) ? cur : best));
}
