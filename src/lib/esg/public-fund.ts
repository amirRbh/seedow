/**
 * Données publiques d'un fonds (§1.2 : chaque chiffre sourcé et daté). Logique
 * PARTAGÉE entre l'aperçu public agrégé (`api.public.esg-preview.ts`) et les
 * pages Autorité (Phase C — `/fonds/$isin`, `/observatoire`) : même colonnes,
 * même calcul de risque greenwashing, une seule source de vérité.
 */
import {
  assessGreenwashingRisk,
  computeDataCoverage,
  GREEN_CAUSE_TAGS,
  type TransparencyInput,
} from "./transparency";
import {
  deriveSustainabilityProfile,
  type SustainabilityTier,
} from "./sustainability-classification";
import { ACWI_WACI_TCO2E_PER_MUSD } from "./benchmark";

export const PUBLIC_FUND_COLUMNS =
  "ticker, name, issuer, isin, asset_class, esg_score, env_score, social_score, governance_score, ter, carbon_intensity_gco2e_per_eur, waci_tco2e_per_musd_sales, implied_temp_rise, sfdr_article, excluded_sectors, cause_exposure, esg_score_source, esg_data_asof";

export interface PublicFundRow {
  ticker: string;
  name: string;
  issuer: string | null;
  isin: string | null;
  asset_class: string;
  esg_score: number | string | null;
  env_score: number | string | null;
  social_score: number | string | null;
  governance_score: number | string | null;
  ter: number | string;
  carbon_intensity_gco2e_per_eur: number | null;
  waci_tco2e_per_musd_sales: number | null;
  implied_temp_rise: string | null;
  sfdr_article: number | null;
  excluded_sectors: string[] | null;
  cause_exposure: Record<string, number> | null;
  esg_score_source: string | null;
  esg_data_asof: string | null;
}

/**
 * Traçabilité de l'estimation carbone bottom-up (table `carbon_estimates`,
 * produite par le moteur `carbon-engine.ts`). Exposée telle quelle : on montre
 * la part réellement couverte et la part directement sourcée plutôt qu'un chiffre
 * nu qui donnerait une fausse impression d'exhaustivité (§1.2/§1.3).
 */
export interface FundCarbonTrace {
  /** gCO₂e / € investi dans le fonds, sur la part couverte. null si couverture nulle. */
  intensityGco2ePerEur: number | null;
  /** Part du fonds couverte par une donnée quelconque (mesurée → proxy), 0..1. */
  coverage: number;
  /** Part du fonds couverte par une donnée DIRECTEMENT sourcée (measured/reported), 0..1. */
  sourcedCoverage: number;
  /** Palier le moins fiable parmi les holdings qui contribuent (label honnête). */
  dataQuality: string;
  /** Phrase de méthode écrite par le moteur (déjà en clair, sourcée). */
  methodology: string;
  holdingsConsidered: number;
  holdingsCovered: number;
  asOf: string | null;
}

/** Ligne brute `carbon_estimates` (pas encore dans les types Supabase générés). */
export interface CarbonEstimateRow {
  intensity_gco2e_per_eur: number | string | null;
  coverage: number | string;
  sourced_coverage: number | string;
  data_quality: string;
  methodology: string;
  holdings_considered: number;
  holdings_covered: number;
  as_of: string | null;
}

export interface PublicFundAsset {
  ticker: string;
  name: string;
  issuer: string | null;
  isin: string | null;
  asset_class: string;
  esg: number;
  climate: number;
  social: number;
  governance: number;
  /** true seulement si les 3 piliers E/S/G viennent réellement de la source. false
   *  = climate/social/governance sont dérivés du score global (ne pas les afficher
   *  comme un détail par pilier — fausse précision, §1.3). */
  has_pillar_scores: boolean;
  ter: number;
  carbon_intensity: number | null;
  /** Traçabilité de l'estimation carbone bottom-up, null si non calculée. */
  carbon_trace: FundCarbonTrace | null;
  implied_temp_rise: string | null;
  sfdr_article: number | null;
  coverage: "complete" | "partial" | "estimated";
  greenwashing_risk: "low" | "medium" | "high";
  greenwashing_reasons: string[];
  excluded_sectors: string[];
  themes: { tag: string; pct: number }[];
  source: string | null;
  data_asof: string | null;
  /** Score Seedow propriétaire 0..100 (composite pondéré, indépendant de SFDR
   *  — cf. `sustainability-classification.ts`), et le tier/drivers associés. */
  seedow_score: number | null;
  sustainability_tier: SustainabilityTier;
  sustainability_drivers: string[];
}

/** Convertit une ligne `carbon_estimates` en trace publique (jamais fabriquée). */
export function mapCarbonEstimateRow(row: CarbonEstimateRow | null | undefined): FundCarbonTrace | null {
  if (!row) return null;
  const intensity =
    row.intensity_gco2e_per_eur != null ? Number(row.intensity_gco2e_per_eur) : null;
  return {
    intensityGco2ePerEur: intensity != null && Number.isFinite(intensity) ? intensity : null,
    coverage: Number(row.coverage) || 0,
    sourcedCoverage: Number(row.sourced_coverage) || 0,
    dataQuality: row.data_quality,
    methodology: row.methodology,
    holdingsConsidered: row.holdings_considered ?? 0,
    holdingsCovered: row.holdings_covered ?? 0,
    asOf: row.as_of,
  };
}

/** Transforme une ligne `assets` en vue publique — jamais de valeur inventée. */
export function mapPublicFundRow(
  r: PublicFundRow,
  carbonEstimate?: CarbonEstimateRow | null,
): PublicFundAsset {
  const esg = Number(r.esg_score);
  const causeExposure = r.cause_exposure ?? {};
  const claimThemes = Object.entries(causeExposure)
    .filter(([, v]) => Number(v) > 0.15)
    .map(([k]) => k);
  const themesOut = Object.entries(causeExposure)
    .map(([tag, v]) => ({ tag, pct: Math.round(Number(v) * 100) }))
    .filter((th) => th.pct >= 8)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);
  const input: TransparencyInput = {
    hasPrice: true, // le cours n'est pas exposé publiquement : neutre pour la couverture
    hasPillarScores: r.env_score != null && r.social_score != null && r.governance_score != null,
    hasCarbonData: r.carbon_intensity_gco2e_per_eur != null,
    sfdrArticle: r.sfdr_article,
    overallEsgScore: esg / 10,
    climateScore: Number(r.env_score ?? esg) / 10,
    exclusionsCount: (r.excluded_sectors ?? []).length,
    claimsGreenTheme: claimThemes.some((th) => GREEN_CAUSE_TAGS.has(th)),
  };
  const gw = assessGreenwashingRisk(input);
  const coverage = computeDataCoverage(input);
  const profile = deriveSustainabilityProfile({
    esgScore: Number.isFinite(esg) ? esg : null,
    climateScore: r.env_score != null ? Number(r.env_score) : null,
    waci: r.waci_tco2e_per_musd_sales,
    benchmarkWaci: ACWI_WACI_TCO2E_PER_MUSD,
    impliedTempRise: r.implied_temp_rise,
    exclusionsCount: (r.excluded_sectors ?? []).length,
    dataCoverage: coverage,
    sfdrArticle: r.sfdr_article,
  });
  return {
    ticker: r.ticker,
    name: r.name,
    issuer: r.issuer,
    isin: r.isin,
    asset_class: r.asset_class,
    esg: Math.round(esg) / 10,
    climate: Math.round(Number(r.env_score ?? esg)) / 10,
    social: Math.round(Number(r.social_score ?? esg)) / 10,
    governance: Math.round(Number(r.governance_score ?? esg)) / 10,
    has_pillar_scores: input.hasPillarScores,
    ter: Number(r.ter),
    carbon_intensity: r.carbon_intensity_gco2e_per_eur,
    carbon_trace: mapCarbonEstimateRow(carbonEstimate),
    implied_temp_rise: r.implied_temp_rise,
    sfdr_article: r.sfdr_article,
    coverage,
    greenwashing_risk: gw.risk,
    greenwashing_reasons: gw.reasons,
    excluded_sectors: r.excluded_sectors ?? [],
    themes: themesOut,
    source: r.esg_score_source,
    data_asof: r.esg_data_asof,
    seedow_score: profile.score,
    sustainability_tier: profile.tier,
    sustainability_drivers: profile.drivers,
  };
}
