/**
 * Seedow Wrapped — bilan de l'engagement de l'utilisateur dans le Bloc.
 *
 * Agrégation pure et honnête (§1.2/§1.3) des votes réels de l'utilisateur : rien
 * n'est inventé, tout se déduit de `resolution_votes`. Logique hors composant
 * (§3), testable.
 */

import type { VoteChoice } from "./bloc";

export interface WrappedVote {
  resolutionId: string;
  choice: VoteChoice;
}

export interface WrappedResolution {
  id: string;
  company: string;
}

export interface WrappedStats {
  /** Nombre total de votes exprimés par l'utilisateur. */
  totalVotes: number;
  /** Votes « contre la direction » (le refus assumé). */
  refusals: number;
  /** Nombre d'entreprises distinctes sur lesquelles l'utilisateur a voté. */
  companiesCount: number;
  /** Entreprises auxquelles l'utilisateur a dit « contre », dédupliquées, plafonnées. */
  refusedCompanies: string[];
  /** Le plus grand Bloc rejoint (total de votes Seedow sur une résolution votée). */
  biggestBloc: { total: number; company: string } | null;
}

export function emptyWrapped(): WrappedStats {
  return {
    totalVotes: 0,
    refusals: 0,
    companiesCount: 0,
    refusedCompanies: [],
    biggestBloc: null,
  };
}

/**
 * Calcule le bilan à partir des votes de l'utilisateur, des résolutions
 * associées (pour les noms d'entreprises) et du total du Bloc par résolution.
 */
export function computeWrapped(
  votes: readonly WrappedVote[],
  resolutions: readonly WrappedResolution[],
  blocTotals: Readonly<Record<string, number>>,
  maxCompanies = 5,
): WrappedStats {
  const companyOf = new Map(resolutions.map((r) => [r.id, r.company]));

  let refusals = 0;
  const votedCompanies = new Set<string>();
  const refusedCompanies: string[] = [];
  let biggestBloc: { total: number; company: string } | null = null;

  for (const vote of votes) {
    const company = companyOf.get(vote.resolutionId);
    if (company) votedCompanies.add(company);

    if (vote.choice === "against") {
      refusals += 1;
      if (company && !refusedCompanies.includes(company)) {
        refusedCompanies.push(company);
      }
    }

    if (company) {
      const total = blocTotals[vote.resolutionId] ?? 0;
      if (!biggestBloc || total > biggestBloc.total) {
        biggestBloc = { total, company };
      }
    }
  }

  return {
    totalVotes: votes.length,
    refusals,
    companiesCount: votedCompanies.size,
    refusedCompanies: refusedCompanies.slice(0, maxCompanies),
    biggestBloc,
  };
}
