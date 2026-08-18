import type { Database } from "@/integrations/supabase/types";
import type { DataCoverage, GreenwashingReason, GreenwashingRisk } from "@/lib/esg/transparency";
import type { SustainabilityTier } from "@/lib/esg/sustainability-classification";

export type ExclusionTag = Database["public"]["Enums"]["exclusion_tag"];
export type AssetClass = Database["public"]["Enums"]["asset_class"];

/**
 * Actif réel de l'univers investissable (table `assets` + dernier `asset_quotes`).
 * Certains champs sont nullable : les données réelles ne couvrent pas tout ce que
 * couvrait l'ancien catalogue fictif (pas de cours = pas encore rafraîchi, pas de
 * co2_factor = pas encore mesuré côté fournisseur ESG).
 */
export interface DiscoverAsset {
  id: string;
  ticker: string;
  name: string;
  asset_class: AssetClass;
  category: string; // libellé lisible de asset_class
  region: string | null;
  description: string;
  issuer: string | null;
  currency: string | null;
  current_price: number | null;
  quote_fetched_at: string | null;
  overall_esg_score: number; // 0..10
  climate_score: number; // 0..10
  social_score: number; // 0..10
  governance_score: number; // 0..10
  /**
   * true seulement si les 3 piliers E/S/G viennent RÉELLEMENT de la source
   * (colonnes env_score/social_score/governance_score renseignées). false = les
   * scores ci-dessus sont dérivés du score global : on ne les affiche PAS comme un
   * détail par pilier, sous peine de fabriquer une fausse précision (CLAUDE.md §1.3).
   */
  has_pillar_scores: boolean;
  ter_pct: number; // %
  risk_level: 1 | 2 | 3 | 4 | 5 | 6 | 7; // SRRI approximé depuis la volatilité annualisée
  co2_factor_per_1k_eur: number | null; // kg CO2e / 1000€ investis/an, null si non mesuré
  waci_tco2e_per_musd_sales: number | null; // WACI MSCI (intensité par revenu), null si non renseigné
  sfdr_article: number | null;
  exclusions: ExclusionTag[];
  tags: string[];
  themes: string[]; // causes dominantes (matche cause_tag)
  /** Couverture de nos données pour cet actif — affichée, jamais cachée. */
  data_coverage: DataCoverage;
  /** Cohérence revendications (SFDR, thèmes) vs données observées. */
  greenwashing_risk: GreenwashingRisk;
  greenwashing_reasons: GreenwashingReason[];
  /**
   * Tier de durabilité dérivé des SIGNAUX BRUTS (carbone, température, ESG,
   * exclusions), indépendant de l'article SFDR — source de vérité unique de la
   * durabilité affichée (l'article SFDR devient un simple tag corroborant).
   */
  sustainability_tier: SustainabilityTier;
}
