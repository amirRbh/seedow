import type { Database } from "@/integrations/supabase/types";
import type { DataCoverage, GreenwashingReason, GreenwashingRisk } from "@/lib/esg/transparency";

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
  ter_pct: number; // %
  risk_level: 1 | 2 | 3 | 4 | 5 | 6 | 7; // SRRI approximé depuis la volatilité annualisée
  co2_factor_per_1k_eur: number | null; // kg CO2e / 1000€ investis/an, null si non mesuré
  sfdr_article: number | null;
  exclusions: ExclusionTag[];
  tags: string[];
  themes: string[]; // causes dominantes (matche cause_tag)
  /** Couverture de nos données pour cet actif — affichée, jamais cachée. */
  data_coverage: DataCoverage;
  /** Cohérence revendications (SFDR, thèmes) vs données observées. */
  greenwashing_risk: GreenwashingRisk;
  greenwashing_reasons: GreenwashingReason[];
}
