/**
 * Profils types du scan de contrat. Ce sont des HYPOTHÈSES de travail,
 * affichées comme telles dans chaque sortie, pas des catégories réglementaires.
 *
 * Un profil peut admettre plusieurs façons d'être satisfait (FORT : SFDR ≥ 25 %
 * OU taxinomie ≥ 5 %) : chaque alternative est un jeu de préférences évalué
 * par le moteur, et le profil retient la meilleure issue.
 */
import { match } from "./engine";
import type { ClientPreferences, FundData, MatchOptions, MatchResult, Verdict } from "./types";

export interface ScanProfile {
  key: string;
  label: string;
  /** Description lisible de l'hypothèse. */
  hypothesis: string;
  /** Le profil est satisfait si UNE alternative l'est. */
  alternatives: ClientPreferences[];
}

const prefs = (p: Partial<ClientPreferences>): ClientPreferences => ({
  taxonomy_min_pct: null,
  sfdr_min_pct: null,
  pai_required: false,
  pai_categories: [],
  ...p,
});

export const DEFAULT_SCAN_PROFILES: readonly ScanProfile[] = [
  {
    key: "LEGER",
    label: "Léger",
    hypothesis: "prise en compte des principales incidences négatives (PAI)",
    alternatives: [prefs({ pai_required: true })],
  },
  {
    key: "MODERE",
    label: "Modéré",
    hypothesis: "au moins 10 % d'investissements durables (art. 2(17) SFDR)",
    alternatives: [prefs({ sfdr_min_pct: 10 })],
  },
  {
    key: "FORT",
    label: "Fort",
    hypothesis: "au moins 25 % d'investissements durables OU au moins 5 % alignés sur la taxinomie",
    alternatives: [prefs({ sfdr_min_pct: 25 }), prefs({ taxonomy_min_pct: 5 })],
  },
];

/**
 * Ordre de préférence entre issues d'alternatives : une alternative adéquate
 * suffit ; à défaut, une issue « à vérifier » laisse la porte ouverte ; puis
 * partiel ; puis non adéquat.
 */
const RANK: Record<Verdict, number> = {
  ADEQUAT: 4,
  A_VERIFIER: 3,
  PARTIEL: 2,
  NON_ADEQUAT: 1,
  NEUTRE: 0,
};

export interface ProfileMatch {
  profile: string;
  verdict: Verdict;
  /** Résultat de l'alternative retenue. */
  best: MatchResult;
  /** Index de l'alternative retenue. */
  alternative: number;
}

export function matchProfile(
  profile: ScanProfile,
  fund: FundData | null,
  opts: MatchOptions & { isin?: string },
): ProfileMatch {
  if (profile.alternatives.length === 0) throw new Error(`profil ${profile.key} sans alternative`);
  const results = profile.alternatives.map((p) => match(p, fund, opts));
  let best = 0;
  for (let i = 1; i < results.length; i++) {
    if (RANK[results[i].verdict] > RANK[results[best].verdict]) best = i;
  }
  return {
    profile: profile.key,
    verdict: results[best].verdict,
    best: results[best],
    alternative: best,
  };
}
