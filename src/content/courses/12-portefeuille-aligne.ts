import type { Course } from "./types";

export const course: Course = {
  slug: "portefeuille-aligne-valeurs",
  number: 12,
  track: "esg",
  level: "intermediaire",
  isFree: false,
  readingMinutes: 13,
  title: "Construire un portefeuille aligné avec ses valeurs",
  eyebrow: "ESG · Méthode",
  description:
    "Étape par étape : définir ses lignes rouges, choisir ses briques, équilibrer engagement et diversification, suivre dans le temps.",
  intro:
    "Aligner son portefeuille avec ses valeurs ne signifie pas tout sacrifier à la performance, ni acheter n'importe quel produit étiqueté « green ». C'est un travail explicite, structuré, qui prend une journée par an. Voici la méthode.",
  eli5:
    "Imagine que tu prépares un menu pour un dîner. D'abord tu listes ce que tu ne veux pas (pas de viande, pas d'arachides). Ensuite tu choisis tes ingrédients (légumes, riz, épices). Puis tu goûtes en cours de route pour ajuster. Un portefeuille aligné, c'est la même recette : lignes rouges, ingrédients (fonds), goûter (audit) une fois par an.",
  sections: [
    {
      heading: "Étape 1 : définir ses lignes rouges",
      paragraphs: [
        "Avant de chercher des produits, écrire noir sur blanc ce qu'on refuse de financer. Liste typique : énergies fossiles, armement, tabac, jeux d'argent, paradis fiscaux. À étendre selon ses convictions.",
        "Pour chaque ligne rouge, fixer un seuil. « Pas du tout » (0 % de CA), « pas dominant » (< 10 %), « pas leader » (< 25 %). Le seuil détermine combien d'entreprises restent dans l'univers d'investissement.",
        "Une liste réaliste : 5 à 8 lignes rouges. Au-delà, l'univers devient si étroit que la diversification souffre — il faudra accepter une volatilité supérieure et un horizon plus long.",
      ],
      callout:
        "Mieux vaut 4 lignes rouges tenues sérieusement que 15 dont on ne vérifie jamais l'application. La cohérence prime sur l'exhaustivité.",
    },
    {
      heading: "Étape 2 : choisir l'approche",
      paragraphs: [
        "Exclusion stricte : on retire tout ce qui dépasse les seuils. Simple, lisible, mais réduit l'univers et peut concentrer le portefeuille.",
        "Best-in-class : dans chaque secteur, on garde les meilleurs sur les critères ESG. Maintient la diversification, mais conserve par construction des secteurs problématiques (fossiles par exemple).",
        "Impact / thématique : on cible des activités explicitement positives (renouvelables, eau, santé, économie circulaire). Forte cohérence, faible diversification, volatilité supérieure.",
        "Engagement actionnarial : on garde les entreprises problématiques mais on vote activement pour les faire évoluer. Demande des fonds qui font vraiment ce travail (rare pour les particuliers).",
      ],
    },
    {
      heading: "Étape 3 : construire la maquette",
      paragraphs: [
        "Définir un mix actions/obligations cohérent avec son horizon et sa tolérance au risque (voir cours « Actions, obligations, ETF »).",
        "Décliner la poche actions : un ETF mondial ESG comme socle (40 à 60 %), un ETF émergents ESG (10 à 15 %), une ou deux briques thématiques d'impact (renouvelables, eau, santé — 10 à 20 %).",
        "Décliner la poche obligations : ETF obligations vertes (« green bonds ») souverains et corporate, ou fonds obligataire ISR.",
        "Garder une poche liquidités sur livret durable (LDDS) qui finance partiellement les PME et l'économie sociale.",
      ],
    },
    {
      heading: "Étape 4 : choisir les enveloppes fiscales",
      paragraphs: [
        "PEA : très adapté à la poche actions européennes ESG (ETF MSCI Europe ESG par exemple). Fiscalité avantageuse après 5 ans.",
        "Assurance-vie en ligne : offre la plus large gamme de fonds ESG / Article 9 / labellisés. Idéale pour la diversification mondiale ESG et obligataire.",
        "Compte-titres ordinaire (CTO) : la plus grande flexibilité d'univers, notamment pour ETF spécifiques non disponibles ailleurs. Fiscalité moins favorable (30 % flat tax).",
        "PER (Plan Épargne Retraite) : intéressant si tranche marginale d'imposition élevée, gamme ESG souvent disponible.",
      ],
    },
    {
      heading: "Étape 5 : auditer chaque brique avant d'acheter",
      paragraphs: [
        "Pour chaque fonds ou ETF retenu, vérifier en 10 minutes (voir cours « Greenwashing ») : composition top 10, exclusions précises, intensité carbone, label, frais.",
        "Trois critères de rejet : entreprises clairement contradictoires avec les lignes rouges dans le top 10 ; intensité carbone non communiquée ; frais supérieurs à 1,5 % sans justification de gestion active.",
        "Croiser au minimum deux sources : fiche du gérant + plateforme indépendante (Morningstar, Quantalys, Novethic).",
      ],
    },
    {
      heading: "Étape 6 : suivre dans le temps",
      paragraphs: [
        "Audit annuel : revérifier chaque brique. Une entreprise détenue par un fonds peut avoir un nouveau scandale. Un label peut avoir changé de critères. Un fonds peut avoir glissé vers du greenwashing.",
        "Indicateurs simples à suivre : intensité carbone du portefeuille global, % d'actifs labellisés, performance vs un indice classique de référence (pour identifier les sacrifices financiers éventuels et les assumer).",
        "Rebalancement : si certaines briques ont surperformé et déséquilibrent le portefeuille, revendre une partie pour revenir à la maquette cible. Une fois par an suffit.",
      ],
      callout:
        "Un portefeuille aligné n'est jamais figé. Le marché évolue, les fonds changent, les convictions personnelles peuvent évoluer aussi. Une heure par trimestre suffit à entretenir la cohérence.",
    },
    {
      heading: "Cas pratique : Imane construit son portefeuille",
      paragraphs: [
        "Lignes rouges : pas d'énergies fossiles, pas d'armement, pas de tabac, pas de jeux. Approche mixte : exclusion stricte pour ces 4 secteurs + best-in-class pour le reste.",
        "Horizon : 25 ans. Tolérance : élevée. Mix cible : 80 % actions, 15 % obligations vertes, 5 % liquidités sur LDDS.",
        "Briques retenues : 50 % ETF MSCI World SRI (PEA + AV), 15 % ETF Emerging Markets ESG, 15 % ETF Clean Energy / Water (impact), 15 % fonds obligations vertes en AV, 5 % LDDS.",
        "Frais moyens : 0,4 % sur les ETF, 0,6 % sur l'assurance-vie. Intensité carbone visée : < 60 tCO2/M€. Audit annuel programmé en janvier. Cohérence : élevée. Sacrifice financier attendu : marginal sur 25 ans.",
      ],
    },
  ],
  keyTakeaways: [
    "Lignes rouges écrites noir sur blanc, avec seuils chiffrés.",
    "Choix d'approche : exclusion, best-in-class, impact, engagement.",
    "Maquette actions/obligations cohérente avec l'horizon.",
    "Enveloppes : PEA + AV en ligne + CTO en complément.",
    "Audit de chaque brique avant achat (10 min suffisent).",
    "Audit annuel + rebalancement = 1 heure par trimestre.",
    "Mieux vaut peu de lignes rouges tenues que beaucoup non vérifiées.",
  ],
  advanced: [
    "MSCI World SRI vs SRI Select Reduced Fossil Fuel vs Climate Paris Aligned : trois niveaux d'exigence croissante, tracking error de 3 % à 8 % vs parent.",
    "Green bonds : marché ICMA principles, ~2 500 Md$ encours mondial 2024, spread vs conventionnel (« greenium ») ~2-8 bps.",
    "Rééquilibrage : bandes de tolérance (ex ±5 % vs cible) plus efficaces que calendrier fixe (Vanguard research 2015).",
    "Optimisation fiscale ordre de retrait : PEA (5+ ans) → AV (8+ ans) → CTO ; inversion possible pour purger PS.",
    "Reporting Article 29 LEC (France) : investisseurs institutionnels + gestionnaires publient stratégie climat et biodiversité — utile pour benchmarker un gérant.",
  ],
  quiz: [
    {
      question: "Première étape pour aligner son portefeuille ?",
      options: [
        "Choisir le courtier.",
        "Définir ses lignes rouges avec seuils chiffrés.",
        "Acheter un ETF green.",
        "Demander à son conseiller.",
      ],
      correctIndex: 1,
      explanation:
        "Sans lignes rouges explicites, on ne peut pas évaluer si un fonds correspond à ses valeurs.",
    },
    {
      question: "Approche « best-in-class » conserve par construction…",
      options: [
        "Uniquement les énergies renouvelables.",
        "Les meilleurs ESG de chaque secteur, y compris secteurs problématiques.",
        "Aucune action.",
        "Uniquement les obligations.",
      ],
      correctIndex: 1,
      explanation:
        "Best-in-class garde les leaders de chaque secteur, ce qui inclut pétrole, défense, etc. À ne pas confondre avec exclusion.",
    },
    {
      question: "Combien de lignes rouges est-il raisonnable de retenir ?",
      options: ["1 seule", "5 à 8", "20 minimum", "Le plus possible"],
      correctIndex: 1,
      explanation:
        "Trop de lignes rouges réduisent dramatiquement l'univers et la diversification. 5 à 8 tenues sérieusement = équilibre.",
    },
    {
      question: "Pour une poche actions européennes ESG, l'enveloppe la plus adaptée est souvent…",
      options: ["CTO", "PEA", "Livret A", "Crypto wallet"],
      correctIndex: 1,
      explanation:
        "PEA = fiscalité avantageuse après 5 ans, parfait pour des ETF actions européennes ESG.",
    },
    {
      question: "Fréquence raisonnable d'audit d'un portefeuille aligné ?",
      options: ["Chaque jour", "Chaque mois", "Une fois par an + suivi trimestriel léger", "Jamais"],
      correctIndex: 2,
      explanation:
        "Audit annuel sérieux + 1 heure par trimestre pour vérification = suffisant et soutenable.",
    },
    {
      question: "Quel indicateur global suivre pour un portefeuille ESG ?",
      options: [
        "Le cours du Bitcoin.",
        "L'intensité carbone agrégée du portefeuille.",
        "Le PIB de la France.",
        "Le nombre de fonds détenus.",
      ],
      correctIndex: 1,
      explanation:
        "Intensité carbone agrégée + comparaison vs indice classique = bonne synthèse de l'engagement réel.",
    },
  ],
};
