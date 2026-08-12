/**
 * Fund Data Completeness Score (§8) — score INTERNE de complétude d'un fonds.
 *
 * Ne mesure PAS la qualité d'impact du fonds : il mesure à quel point NOUS
 * disposons de données sourcées pour lui, afin de piloter l'effort d'ingestion
 * (quels fonds améliorer en priorité). Score 0-100 + ventilation par catégorie,
 * chaque catégorie explicable. Fonction pure.
 */

export interface CompletenessInput {
  // Identité
  hasIsin: boolean;
  hasName: boolean;
  hasIssuer: boolean;
  hasDomicile: boolean;
  hasCurrency: boolean;
  // Frais
  hasTer: boolean;
  // Holdings
  holdingsCount: number;
  holdingsAsOf: string | null;
  // SFDR / réglementaire
  hasSfdrArticle: boolean;
  hasKidOrProspectus: boolean;
  // Impact
  hasEsgScore: boolean;
  hasCarbon: boolean;
  // Controverses
  hasControversyData: boolean;
}

export type CompletenessCategory =
  | "identity"
  | "fees"
  | "holdings"
  | "sfdr"
  | "impact"
  | "controversies";

export interface CompletenessBreakdown {
  /** Score global 0-100 (moyenne pondérée des catégories). */
  score: number;
  /** Pourcentage 0-100 par catégorie. */
  categories: Record<CompletenessCategory, number>;
  /** Champs manquants, listés pour le data-quality dashboard. */
  missing: string[];
}

/** Poids relatifs des catégories (somme = 1). Identité & holdings priment. */
const WEIGHTS: Record<CompletenessCategory, number> = {
  identity: 0.25,
  fees: 0.1,
  holdings: 0.25,
  sfdr: 0.15,
  impact: 0.15,
  controversies: 0.1,
};

function pct(got: number, total: number): number {
  return total === 0 ? 0 : Math.round((got / total) * 100);
}

export function computeFundCompleteness(input: CompletenessInput): CompletenessBreakdown {
  const missing: string[] = [];
  const track = (ok: boolean, label: string): number => {
    if (!ok) missing.push(label);
    return ok ? 1 : 0;
  };

  const identityGot =
    track(input.hasIsin, "isin") +
    track(input.hasName, "name") +
    track(input.hasIssuer, "issuer") +
    track(input.hasDomicile, "domicile") +
    track(input.hasCurrency, "currency");

  const fees = track(input.hasTer, "ter");

  // Holdings : présence + fraîcheur de la date (§12 — un holding sans date n'a
  // presque aucune valeur).
  const hasHoldings = input.holdingsCount > 0;
  const hasHoldingsDate = !!input.holdingsAsOf;
  if (!hasHoldings) missing.push("holdings");
  if (hasHoldings && !hasHoldingsDate) missing.push("holdings_as_of");
  const holdingsScore = pct((hasHoldings ? 1 : 0) + (hasHoldingsDate ? 1 : 0), 2);

  const sfdrGot =
    track(input.hasSfdrArticle, "sfdr_article") +
    track(input.hasKidOrProspectus, "kid_or_prospectus");

  const impactGot = track(input.hasEsgScore, "esg_score") + track(input.hasCarbon, "carbon");

  const controversies = track(input.hasControversyData, "controversies");

  const categories: Record<CompletenessCategory, number> = {
    identity: pct(identityGot, 5),
    fees: pct(fees, 1),
    holdings: holdingsScore,
    sfdr: pct(sfdrGot, 2),
    impact: pct(impactGot, 2),
    controversies: pct(controversies, 1),
  };

  const score = Math.round(
    (Object.keys(WEIGHTS) as CompletenessCategory[]).reduce(
      (acc, k) => acc + categories[k] * WEIGHTS[k],
      0,
    ),
  );

  return { score, categories, missing };
}
