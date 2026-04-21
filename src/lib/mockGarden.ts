/**
 * Données fictives pour la démo Seedow — "Le Jardin".
 * Pas de backend : on simule un jardin déjà bien planté.
 */

export interface MockAsset {
  id: string;
  ticker: string;
  name: string;
  category: string;
  description: string;
  current_price: number;
  overall_esg_score: number;
  climate_score: number;
  social_score: number;
  governance_score: number;
  tags: string[];
  co2_factor_per_1k_eur: number;
  energy_factor_per_1k_eur: number;
  themes: string[]; // matche lexicon.themes
  // — Détails complémentaires pour aider l'investisseur à comprendre
  issuer?: string;            // émetteur / société de gestion
  domicile?: string;          // pays de domiciliation (ex: Irlande)
  currency?: string;          // devise de cotation
  ter_pct?: number;           // frais courants annuels (%)
  dividend_policy?: "Capitalisant" | "Distribuant";
  dividend_yield_pct?: number;
  holdings_count?: number;    // nombre de lignes (pour ETF)
  top_holdings?: string[];    // top positions (pour ETF/fonds)
  sector_breakdown?: { label: string; pct: number }[];
  geo_breakdown?: { label: string; pct: number }[];
  risk_level?: 1 | 2 | 3 | 4 | 5 | 6 | 7; // SRRI 1-7
  inception_year?: number;
  benchmark?: string;
  exclusions?: string[];      // secteurs exclus
}

export interface MockHolding {
  id: string;
  asset: MockAsset;
  allocationPct: number;
  performancePct: number;
  avgBuyPrice: number;
}

export interface MockTransaction {
  id: string;
  created_at: string; // ISO
  type: "buy" | "sell" | "deposit" | "withdrawal";
  asset_ticker: string | null;
  asset_name: string | null;
  amount: number;
}

export const MOCK_ASSETS: MockAsset[] = [
  {
    id: "a-iwrd",
    ticker: "IWRD",
    name: "iShares Core MSCI World",
    category: "ETF",
    description:
      "Un bouquet de 1 500 entreprises mondiales filtrées sur des critères ESG stricts. Une graine robuste pour démarrer.",
    current_price: 92.4,
    overall_esg_score: 8.1,
    climate_score: 7.8,
    social_score: 8.2,
    governance_score: 8.4,
    tags: ["diversifié", "monde", "ESG"],
    co2_factor_per_1k_eur: 0.35,
    energy_factor_per_1k_eur: 180,
    themes: ["climat", "governance"],
  },
  {
    id: "a-clean",
    ticker: "CLEAN",
    name: "iShares Global Clean Energy",
    category: "ETF",
    description:
      "100 % énergies renouvelables : solaire, éolien, hydrogène. Le moteur de la transition énergétique mondiale.",
    current_price: 14.8,
    overall_esg_score: 9.2,
    climate_score: 9.7,
    social_score: 8.4,
    governance_score: 8.6,
    tags: ["climat", "renouvelable"],
    co2_factor_per_1k_eur: 1.2,
    energy_factor_per_1k_eur: 450,
    themes: ["climat", "tech"],
  },
  {
    id: "a-grnb",
    ticker: "GRNB",
    name: "VanEck Green Bond",
    category: "Obligation",
    description:
      "Obligations vertes qui financent des projets environnementaux concrets : reforestation, mobilité propre, eau.",
    current_price: 24.6,
    overall_esg_score: 8.7,
    climate_score: 9.0,
    social_score: 8.0,
    governance_score: 8.9,
    tags: ["obligation", "stable"],
    co2_factor_per_1k_eur: 0.8,
    energy_factor_per_1k_eur: 220,
    themes: ["climat", "biodiversite"],
  },
  {
    id: "a-wtef",
    ticker: "WTEF",
    name: "Invesco Water Resources",
    category: "ETF",
    description:
      "Entreprises qui gèrent, traitent ou préservent l'eau. Une ressource rare, un investissement essentiel.",
    current_price: 53.2,
    overall_esg_score: 8.4,
    climate_score: 8.0,
    social_score: 9.1,
    governance_score: 8.2,
    tags: ["eau", "infrastructure"],
    co2_factor_per_1k_eur: 0.42,
    energy_factor_per_1k_eur: 90,
    themes: ["eau", "biodiversite"],
  },
  {
    id: "a-hbio",
    ticker: "HBIO",
    name: "Humankind US Stock",
    category: "Action",
    description:
      "Sélection d'entreprises notées sur leur impact humain : conditions de travail, parité, droits sociaux.",
    current_price: 38.9,
    overall_esg_score: 8.6,
    climate_score: 7.5,
    social_score: 9.5,
    governance_score: 8.7,
    tags: ["humain", "égalité"],
    co2_factor_per_1k_eur: 0.28,
    energy_factor_per_1k_eur: 110,
    themes: ["social", "governance"],
  },
  {
    id: "a-vegn",
    ticker: "VEGN",
    name: "US Vegan Climate ETF",
    category: "ETF",
    description:
      "Aucune entreprise liée à l'élevage industriel, aux fossiles ou aux tests animaux. Un jardin sans cruauté.",
    current_price: 31.5,
    overall_esg_score: 9.0,
    climate_score: 9.3,
    social_score: 8.6,
    governance_score: 8.5,
    tags: ["vegan", "éthique"],
    co2_factor_per_1k_eur: 0.95,
    energy_factor_per_1k_eur: 260,
    themes: ["biodiversite", "social"],
  },
  {
    id: "a-pscw",
    ticker: "PSCW",
    name: "Patagonia Circular Goods",
    category: "Action",
    description:
      "Entreprise pionnière de la mode durable et circulaire : réparation, recyclage, matériaux régénératifs.",
    current_price: 88.0,
    overall_esg_score: 9.4,
    climate_score: 9.1,
    social_score: 9.5,
    governance_score: 9.6,
    tags: ["circulaire", "mode durable"],
    co2_factor_per_1k_eur: 0.52,
    energy_factor_per_1k_eur: 130,
    themes: ["circulaire", "social"],
  },
  {
    id: "a-aqua",
    ticker: "AQUA",
    name: "Evoqua Water Tech",
    category: "Action",
    description:
      "Technologies de purification d'eau pour les villes et les industries. Au cœur des enjeux climatiques.",
    current_price: 47.1,
    overall_esg_score: 8.3,
    climate_score: 8.6,
    social_score: 8.0,
    governance_score: 8.4,
    tags: ["eau", "tech"],
    co2_factor_per_1k_eur: 0.65,
    energy_factor_per_1k_eur: 175,
    themes: ["eau", "tech"],
  },
];

export const MOCK_HOLDINGS: MockHolding[] = [
  { id: "h1", asset: MOCK_ASSETS[0], allocationPct: 38, performancePct: 6.4, avgBuyPrice: 86.8 },
  { id: "h2", asset: MOCK_ASSETS[1], allocationPct: 24, performancePct: 14.2, avgBuyPrice: 12.96 },
  { id: "h3", asset: MOCK_ASSETS[2], allocationPct: 18, performancePct: 2.1, avgBuyPrice: 24.1 },
  { id: "h4", asset: MOCK_ASSETS[3], allocationPct: 12, performancePct: -3.5, avgBuyPrice: 55.1 },
  { id: "h5", asset: MOCK_ASSETS[6], allocationPct: 8, performancePct: 9.8, avgBuyPrice: 80.1 },
];

export const MOCK_PORTFOLIO = {
  total_value: 4287,
  total_invested: 3950,
  co2_avoided: 1.4, // tonnes
  trees_equivalent: 64,
  energy_financed: 820, // kWh
  overall_score: 8.6,
};

export const MOCK_WALLET = { balance: 312, currency: "EUR" };

export const MOCK_USER_NAME = "Sofia";

export const MOCK_TRANSACTIONS: MockTransaction[] = [
  { id: "t1", created_at: "2025-04-12T08:00:00Z", type: "buy", asset_ticker: "CLEAN", asset_name: "iShares Global Clean Energy", amount: 200 },
  { id: "t2", created_at: "2025-04-02T08:00:00Z", type: "deposit", asset_ticker: null, asset_name: null, amount: 250 },
  { id: "t3", created_at: "2025-03-22T08:00:00Z", type: "buy", asset_ticker: "WTEF", asset_name: "Invesco Water Resources", amount: 350 },
  { id: "t4", created_at: "2025-03-05T08:00:00Z", type: "buy", asset_ticker: "PSCW", asset_name: "Patagonia Circular Goods", amount: 320 },
  { id: "t5", created_at: "2025-02-15T08:00:00Z", type: "deposit", asset_ticker: null, asset_name: null, amount: 500 },
  { id: "t6", created_at: "2025-02-04T08:00:00Z", type: "buy", asset_ticker: "GRNB", asset_name: "VanEck Green Bond", amount: 600 },
  { id: "t7", created_at: "2025-01-18T08:00:00Z", type: "buy", asset_ticker: "IWRD", asset_name: "iShares Core MSCI World", amount: 1500 },
  { id: "t8", created_at: "2025-01-05T08:00:00Z", type: "deposit", asset_ticker: null, asset_name: null, amount: 2000 },
];

export const MOCK_BADGES = [
  { id: "first_seed", name: "Première graine", description: "Tu as planté ta première graine.", icon: "🌱", tier: "bronze" as const, unlocked: true },
  { id: "patient_gardener", name: "Jardinier patient", description: "90 jours sans paniquer.", icon: "🧘", tier: "bronze" as const, unlocked: true },
  { id: "biodiversity", name: "Écosystème riche", description: "5 graines différentes plantées.", icon: "🌿", tier: "silver" as const, unlocked: true },
  { id: "regular_waterer", name: "Arrosage régulier", description: "6 mois d'abondements.", icon: "💧", tier: "silver" as const, unlocked: false },
  { id: "carbon_neutral", name: "Empreinte nulle", description: "Autant de CO₂ évité que ta conso annuelle.", icon: "🌍", tier: "silver" as const, unlocked: false },
  { id: "forest", name: "Petite forêt", description: "100 arbres équivalents.", icon: "🌳", tier: "gold" as const, unlocked: false },
  { id: "first_harvest", name: "Première récolte", description: "Tu as récolté pour un projet qui te tient à cœur.", icon: "🍎", tier: "gold" as const, unlocked: false },
  { id: "aligned", name: "Parfait alignement", description: "ESG > 8,5 sur tout.", icon: "✨", tier: "gold" as const, unlocked: true },
];
