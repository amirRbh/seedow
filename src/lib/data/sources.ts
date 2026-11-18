/**
 * Registre des sources de données — ce que Seedow utilise VRAIMENT, et où en
 * est chaque intégration.
 *
 * Ce registre décrit l'état réel du dépôt, pas une ambition : une source dont
 * le connecteur existe mais n'a pas tourné en production est écrite comme
 * telle. Il alimente la page publique `/donnees` et sert de contrat pour tout
 * nouveau fournisseur : ajouter une source = ajouter une entrée ici, avec son
 * statut d'intégration, sa licence et la transformation appliquée.
 *
 * Module PUR.
 */
import type { DataStatus } from "./status";

/**
 * Niveau d'intégration :
 *   scheduled   — tourne seul, à fréquence fixe (cron base ou GitHub Action planifiée) ;
 *   manual      — connecteur fonctionnel, déclenché à la main ;
 *   snapshot    — instantané daté figé dans le dépôt (démonstration) ;
 *   reference   — table de référence publiée, reprise telle quelle ;
 *   not_integrated — aucune source branchée : la donnée est UNAVAILABLE.
 */
export type IntegrationLevel = "scheduled" | "manual" | "snapshot" | "reference" | "not_integrated";

export interface DataSourceEntry {
  id: string;
  /** Jeu de données concerné. */
  dataset: string;
  provider: string;
  /** Document ou point d'accès précis. */
  source: string;
  integration: IntegrationLevel;
  /** Fréquence de mise à jour effective. */
  frequency: string;
  /** Licence / conditions d'usage connues. `null` = à confirmer. */
  license: string | null;
  /** Transformation appliquée par Seedow. */
  transformation: string;
  /** Statut des valeurs que cette source produit à l'écran. */
  producesStatus: DataStatus;
  /** Où le code vit — pour qu'un relecteur puisse vérifier. */
  codePath: string;
  /** Limites connues, écrites. */
  limits: string;
}

export const DATA_SOURCES: readonly DataSourceEntry[] = [
  {
    id: "yahoo_quotes",
    dataset: "Cours et historiques de prix",
    provider: "Yahoo Finance",
    source: "API de cotation publique (non officielle)",
    integration: "scheduled",
    frequency: "Horaire (pg_cron → /hooks/refresh-market-data)",
    license:
      "Usage non commercial toléré — à remplacer par un fournisseur sous licence avant tout usage B2B",
    transformation:
      "Aucune sur les cours ; volatilités et covariances recalculées (modèle de risque)",
    producesStatus: "VERIFIED",
    codePath: "src/lib/market/yahoo.server.ts",
    limits: "Pas de garantie de service ; symboles parfois absents pour les parts européennes.",
  },
  {
    id: "amf_geco",
    dataset: "Identité des fonds, documents réglementaires (DIC/KID)",
    provider: "AMF — base GECO",
    source: "geco.amf-france.org",
    integration: "scheduled",
    frequency: "Hebdomadaire (GitHub Action ingest-funds)",
    license: "Données publiques de l'autorité de marché",
    transformation:
      "Extraction de l'article SFDR et des frais courants depuis le DIC (parseur testé)",
    producesStatus: "VERIFIED",
    codePath: "scripts/ingest-funds.ts · src/lib/esg/kid-parser.ts",
    limits:
      "Fonds de droit français principalement ; extraction PDF dépendante de la mise en page.",
  },
  {
    id: "adanos_catalog",
    dataset: "Catalogue mondial d'instruments",
    provider: "Adanos — Free Global Ticker Database",
    source: "Release publique GitHub",
    integration: "scheduled",
    frequency: "Hebdomadaire (GitHub Action import-adanos-catalog)",
    license: "MIT",
    transformation: "Normalisation des identifiants (ISIN, ticker, place de cotation)",
    producesStatus: "VERIFIED",
    codePath: "scripts/import-adanos-catalog.ts",
    limits: "Identité seulement : aucune donnée de composition, de frais ni d'ESG.",
  },
  {
    id: "ishares_workbook",
    dataset: "Composition, expositions, classification SFDR déclarée, historique de VL",
    provider: "iShares (BlackRock)",
    source: "API produit officielle — classeur « fundDownloadV2 »",
    integration: "manual",
    frequency:
      "Déclenchement manuel (GitHub Action ingest-holdings) ; publication quotidienne côté émetteur",
    license:
      "Documents publics de l'émetteur — conditions de réutilisation à confirmer pour un usage B2B",
    transformation:
      "Lecture fidèle des feuilles publiées ; agrégation par devise ; aucun retraitement des poids",
    producesStatus: "VERIFIED",
    codePath: "src/lib/data-engine/ishares-workbook.ts · scripts/ingest-holdings.ts",
    limits:
      "Connecteur fonctionnel, mais aucune composition n'est encore en base de production. Couvre les seuls fonds iShares du registre. Classeurs américains : croissance publiée en fin de mois seulement, ISIN déduit du CUSIP (ISO 6166).",
  },
  {
    id: "demo_snapshot",
    dataset: "Instantané de démonstration (5 fonds iShares)",
    provider: "iShares (BlackRock)",
    source: "Même classeur officiel, figé dans src/content/demo/fund-snapshots.json",
    integration: "snapshot",
    frequency: "Ponctuel (scripts/snapshot-demo-funds.ts) — vieillit visiblement (statut STALE)",
    license: "Documents publics de l'émetteur",
    transformation:
      "150 premières positions conservées (la part restante est écrite) ; 6 ans d'historique quotidien",
    producesStatus: "VERIFIED",
    codePath: "scripts/snapshot-demo-funds.ts",
    limits:
      "Les montants du portefeuille de démonstration sont fictifs (SIMULATED) ; les données des fonds ne le sont pas.",
  },
  {
    id: "issuer_msci_factsheet",
    dataset: "Indicateurs MSCI ESG publiés dans les fiches produit (WACI, qualité ESG)",
    provider: "Émetteurs (fiches produit) — calcul MSCI ESG Research",
    source: "Fiches PDF des émetteurs",
    integration: "manual",
    frequency: "Déclenchement manuel (scripts/ingest-issuer-esg.ts)",
    license: "Données MSCI reproduites par l'émetteur — pas de licence MSCI directe",
    transformation: "Extraction texte du PDF, aucun recalcul",
    producesStatus: "VERIFIED",
    codePath: "scripts/ingest-issuer-esg.ts · src/lib/esg/factsheet-parser.ts",
    limits:
      "Pas de note de risque ESG sous licence : la couche « risque ESG » reste indisponible sur la plupart des fonds.",
  },
  {
    id: "carbon_estimates",
    dataset: "Intensité carbone estimée",
    provider: "Seedow (modèle sectoriel)",
    source: "Intensités sectorielles moyennes × composition",
    integration: "scheduled",
    frequency: "Recalcul avec le modèle de risque",
    license: null,
    transformation: "Estimation bottom-up — jamais présentée comme une mesure",
    producesStatus: "ESTIMATED",
    codePath: "src/lib/esg/carbon-engine.ts",
    limits:
      "Ordre de grandeur sectoriel ; ne remplace pas les émissions publiées par les entreprises.",
  },
  {
    id: "ademe_base_carbone",
    dataset: "Facteurs d'équivalence (km en voiture, vols…)",
    provider: "ADEME — Base Carbone",
    source: "Facteurs publiés",
    integration: "reference",
    frequency: "Mise à jour manuelle des constantes",
    license: "Licence ouverte",
    transformation: "Conversion d'une intensité carbone en équivalents parlants",
    producesStatus: "ESTIMATED",
    codePath: "src/lib/impact/equivalences.ts",
    limits: "Équivalences pédagogiques, pas un bilan carbone.",
  },
  {
    id: "issuer_msci_workbook",
    dataset:
      "Indicateurs MSCI de fonds publiés par l'émetteur : notation ESG, WACI, hausse de température implicite, expositions d'activité",
    provider: "iShares (BlackRock), États-Unis — calcul MSCI ESG Research",
    source:
      "Classeur produit officiel, feuilles « Sustainability Characteristics » et « Business Involvement »",
    integration: "snapshot",
    frequency:
      "Instantané daté (scripts/snapshot-demo-funds.ts) ; MSCI recalcule ses notations de fonds chaque mois",
    license:
      "Données MSCI reproduites par l'émetteur — Seedow n'a pas de licence MSCI : affichage attribué sur le site, aucune redistribution (exclues de l'API publique, du CSV et du rapport)",
    transformation:
      "Lecture fidèle, sans recalcul ; la hausse de température reste une bande, jamais un nombre",
    producesStatus: "VERIFIED",
    codePath: "src/lib/data-engine/ishares-workbook.ts · src/lib/esg/framework.ts",
    limits:
      "Cinq ETF américains seulement (les classeurs UCITS n'ont pas ces feuilles). Une exposition à 0 % dépend de la couverture MSCI. Fonds hors UE : pas de SFDR, de Taxonomie ni de déclaration PAI.",
  },
  {
    id: "eu_taxonomy",
    dataset: "Alignement Taxonomie européenne",
    provider: "—",
    source:
      "Aucune source branchée — annexes périodiques SFDR (modèles réglementaires) ou fichier EET d'un fournisseur",
    integration: "not_integrated",
    frequency: "—",
    license: null,
    transformation: "—",
    producesStatus: "UNAVAILABLE",
    codePath: "src/lib/esg/framework.ts (couche « taxonomy »)",
    limits:
      "Affiché comme indisponible, jamais déduit de l'article SFDR. « Non applicable » pour un fonds domicilié hors UE. Les annexes des émetteurs ne sont pas joignables depuis l'environnement de collecte actuel ; un flux EET sous licence est la voie prévue.",
  },
  {
    id: "pai_values",
    dataset: "Valeurs des principales incidences négatives (PAI)",
    provider: "—",
    source: "Annexes périodiques SFDR — non collectées",
    integration: "not_integrated",
    frequency: "—",
    license: null,
    transformation: "—",
    producesStatus: "UNAVAILABLE",
    codePath: "src/lib/esg/framework.ts (couche « pai »)",
    limits:
      "Seul le FAIT de publier une déclaration PAI est suivi (indice de transparence), pas ses valeurs. Pour les ETF américains, deux expositions publiées en sont voisines (armes controversées ≈ PAI 14, violations du Pacte mondial ≈ PAI 10) : elles sont montrées comme indicateurs, jamais comme une déclaration PAI.",
  },
];

/** Regroupe les sources par niveau d'intégration, dans un ordre de lecture stable. */
export function sourcesByIntegration(): { level: IntegrationLevel; sources: DataSourceEntry[] }[] {
  const order: IntegrationLevel[] = [
    "scheduled",
    "manual",
    "snapshot",
    "reference",
    "not_integrated",
  ];
  return order
    .map((level) => ({ level, sources: DATA_SOURCES.filter((s) => s.integration === level) }))
    .filter((g) => g.sources.length > 0);
}
