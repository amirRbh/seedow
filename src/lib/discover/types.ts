import type { Database } from "@/integrations/supabase/types";
import type { DataCoverage, GreenwashingReason, GreenwashingRisk } from "@/lib/esg/transparency";
import type { ScorePillar, SustainabilityTier } from "@/lib/esg/sustainability-classification";

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
  /**
   * Champs BRUTS conservés pour décrire les couches de l'actif (`lib/portfolio/layers`)
   * et signer ses chiffres (`lib/data-engine/provenance`). Ils ne servent pas à
   * l'affichage direct : ils servent à dire ce qu'on sait et ce qui manque.
   */
  isin: string | null;
  esg_score_source: string | null;
  esg_data_asof: string | null;
  carbon_intensity_source: string | null;
  expected_return: number | null;
  volatility: number;
  stats_observations: number | null;
  current_price: number | null;
  quote_fetched_at: string | null;
  overall_esg_score: number; // 0..10
  climate_score: number; // 0..10
  social_score: number; // 0..10
  governance_score: number; // 0..10
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
  /**
   * Score Seedow 0..100 — LE même nombre que la fiche publique et
   * l'Observatoire affichent pour ce fonds. Il était calculé ici depuis
   * toujours (`deriveDiscoverAssetTier` en renvoie le profil complet) et jeté
   * aussitôt : l'explorateur montrait à la place le score ESG du fournisseur
   * sur 10. Deux surfaces, deux nombres, un seul fonds — c'est ce qui faisait
   * douter d'un produit dont l'argument est la rigueur.
   * `null` si aucun pilier n'est exploitable : « non noté », jamais 0.
   */
  seedow_score: number | null;
  /** Le détail du composite — répond à « pourquoi ce score ? » sans requête. */
  score_breakdown: ScorePillar[];
}
