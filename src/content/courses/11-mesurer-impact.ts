import type { Course } from "./types";

export const course: Course = {
  slug: "mesurer-impact",
  number: 11,
  track: "esg",
  level: "intermediaire",
  isFree: false,
  readingMinutes: 12,
  title: "Mesurer l'impact : intensité carbone, score ESG, controverses",
  eyebrow: "ESG · Indicateurs",
  description:
    "Les principaux indicateurs d'impact ESG : ce qu'ils mesurent vraiment, comment les lire, et pourquoi un seul chiffre ne suffit jamais.",
  intro:
    "« Notre fonds a un impact positif. » D'accord — combien, mesuré comment, comparé à quoi ? Ce cours détaille les indicateurs ESG les plus utilisés, leurs forces et leurs limites, pour cesser de se contenter de slogans.",
  sections: [
    {
      heading: "Intensité carbone du portefeuille",
      paragraphs: [
        "Mesure : tonnes de CO2 émises par million d'euros de chiffre d'affaires des entreprises détenues, pondérées par leur poids dans le portefeuille. Unité : tCO2 / M€ CA.",
        "Lecture : un MSCI World classique tourne autour de 130 à 150 tCO2/M€. Un MSCI World ESG Leaders à environ 80-90. Un Paris-Aligned Benchmark à environ 50-60. Un fonds Greenfin pur en dessous de 30.",
        "Limite majeure : l'intensité carbone est calculée par CA, ce qui favorise les entreprises de services au détriment des industries lourdes — y compris celles qui contribuent à la transition (cimentiers décarbonés, mines de cuivre nécessaire pour les énergies renouvelables).",
      ],
      callout:
        "Une intensité carbone faible peut traduire un vrai engagement OU simplement une surpondération du secteur tech. Toujours regarder la composition sectorielle en parallèle.",
    },
    {
      heading: "Scopes 1, 2, 3 : la distinction essentielle",
      paragraphs: [
        "Scope 1 : émissions directes (combustibles brûlés, véhicules de l'entreprise). Mesurable, fiable.",
        "Scope 2 : émissions liées à l'énergie achetée (électricité, chauffage). Mesurable, fiable.",
        "Scope 3 : toute la chaîne de valeur (fournisseurs, transport, usage des produits vendus, fin de vie). Représente souvent 80 à 95 % du total, mais très mal mesuré.",
        "Beaucoup de fonds publient une intensité carbone scope 1+2 uniquement, ce qui sous-estime massivement l'empreinte réelle. Pour les pétroliers, le scope 3 (combustion du pétrole vendu) est l'essentiel.",
      ],
    },
    {
      heading: "Alignement Paris : la trajectoire qui compte",
      paragraphs: [
        "Plutôt que de mesurer le passé, certains indicateurs évaluent si le portefeuille est sur une trajectoire compatible avec un réchauffement de 1,5 °C ou 2 °C d'ici 2100.",
        "Méthode SBTi (Science Based Targets initiative) : compare les engagements de réduction des entreprises détenues aux trajectoires sectorielles compatibles 1,5 °C. Indicateur prospectif, plus pertinent que l'empreinte passée.",
        "Limite : repose sur les déclarations volontaires des entreprises. Greenwashing possible si les objectifs annoncés ne sont pas suivis d'effets.",
      ],
    },
    {
      heading: "Scores ESG agences : à manier avec précaution",
      paragraphs: [
        "MSCI ESG Rating : note de AAA (leader) à CCC (retardataire), basée sur les risques ESG matériels pour le secteur. Approche « risque pour l'entreprise » plus que « risque créé par l'entreprise ».",
        "Sustainalytics ESG Risk Rating : note l'exposition aux risques ESG non gérés. Plus le score est bas, mieux c'est. Méthode différente, résultats parfois opposés à MSCI.",
        "ISS, Moody's ESG, S&P Global ESG : encore d'autres méthodologies. Les divergences entre agences sont structurelles et documentées (corrélation ~0,5).",
        "Bonne pratique : ne jamais s'appuyer sur un seul score. Croiser au moins deux sources et comprendre la méthodologie de chacune.",
      ],
      callout:
        "Un score ESG mesure souvent à quel point l'entreprise est exposée aux risques ESG, pas à quel point son activité contribue positivement au monde. C'est une perspective de gestionnaire de risque, pas d'investisseur à impact.",
    },
    {
      heading: "Controverses : le complément indispensable",
      paragraphs: [
        "Les agences ESG publient une base de controverses : scandales, procès, accusations crédibles documentées par la presse internationale. Échelle typique de 1 (mineur) à 5 (sévère).",
        "Une controverse de niveau 4 ou 5 active devrait normalement exclure une entreprise des fonds ESG. En pratique, beaucoup de fonds Article 8 continuent de détenir des entreprises avec des controverses sévères en cours.",
        "Bonne pratique : vérifier le « controversy score » des 10 plus grosses positions d'un fonds ESG avant d'investir. Outils en ligne disponibles gratuitement (Yahoo Finance Sustainability, Morningstar, MSCI publiques).",
      ],
    },
    {
      heading: "Pourcentage aligné taxonomie européenne",
      paragraphs: [
        "La taxonomie européenne classifie les activités économiques selon leur contribution à six objectifs environnementaux (climat, eau, économie circulaire, etc.). Une activité est « alignée » si elle contribue substantiellement à au moins un objectif sans nuire aux autres.",
        "Indicateur : % du chiffre d'affaires des entreprises détenues qui est aligné taxonomie. Un MSCI World classique : ~5 %. Un fonds vert : 30 à 70 %. Un fonds infrastructures renouvelables : 90 %+.",
        "Limite : les données sont récentes (2022+), incomplètes, et la taxonomie elle-même fait débat (inclusion du gaz et du nucléaire sous conditions a divisé les acteurs).",
      ],
    },
    {
      heading: "Cas pratique : décoder une fiche d'impact",
      paragraphs: [
        "Fonds A : intensité carbone 45 tCO2/M€, alignement Paris 1,8 °C, 35 % CA aligné taxonomie, exclusions claires, 3 controverses niveau 2. → fonds vraiment engagé, sérieux.",
        "Fonds B : intensité carbone 95 tCO2/M€, pas d'alignement Paris communiqué, 12 % CA aligné, exclusions minimales, 2 controverses niveau 4 actives. → ESG cosmétique, à éviter pour qui cherche du fond.",
        "Fonds C : intensité carbone 130 tCO2/M€ (= indice classique), alignement 3 °C, < 5 % CA aligné. → pas ESG en pratique, peu importe l'étiquette.",
      ],
    },
  ],
  keyTakeaways: [
    "Intensité carbone (tCO2/M€ CA) = indicateur de base, mais sectoriellement biaisé.",
    "Scope 1+2+3 essentiel : scope 3 souvent 80-95 % des émissions.",
    "Alignement Paris 1,5 °C ou 2 °C = vision prospective utile.",
    "Scores ESG agences en désaccord (corrélation ~0,5), croiser plusieurs sources.",
    "Controverses niveau 4-5 = signal d'exclusion légitime.",
    "% aligné taxonomie européenne = indicateur récent mais utile.",
    "Aucun chiffre seul ne suffit : combiner plusieurs indicateurs.",
  ],
  quiz: [
    {
      question: "Le scope 3 d'une entreprise pétrolière comprend principalement…",
      options: [
        "Les véhicules de service.",
        "L'électricité des bureaux.",
        "La combustion du pétrole par les clients finaux.",
        "Les déchets de bureau.",
      ],
      correctIndex: 2,
      explanation:
        "Scope 3 = chaîne de valeur, dont usage des produits vendus. Pour un pétrolier, c'est l'essentiel des émissions.",
    },
    {
      question: "Une intensité carbone très basse peut traduire…",
      options: [
        "Un engagement fort, toujours.",
        "Un engagement fort OU une surpondération tech/services.",
        "Une fraude comptable.",
        "Un fonds obligataire.",
      ],
      correctIndex: 1,
      explanation:
        "Intensité par CA favorise mécaniquement les services. Toujours vérifier la composition sectorielle.",
    },
    {
      question: "Pourquoi croiser plusieurs scores ESG ?",
      options: [
        "Pour passer plus de temps à lire.",
        "Parce que les agences sont en désaccord (corrélation ~0,5).",
        "Parce que c'est obligatoire.",
        "Pour faire plaisir au gérant.",
      ],
      correctIndex: 1,
      explanation:
        "Notation ESG = en partie subjective. Un score AAA chez l'un peut être moyen chez l'autre.",
    },
    {
      question: "Alignement Paris 1,5 °C signifie…",
      options: [
        "Le fonds est basé à Paris.",
        "Sa trajectoire est compatible avec un réchauffement limité à 1,5 °C.",
        "Le fonds est garanti par l'État français.",
        "Le fonds ne détient que des entreprises françaises.",
      ],
      correctIndex: 1,
      explanation:
        "Indicateur prospectif sur la trajectoire des entreprises détenues. Méthode SBTi est la référence.",
    },
    {
      question: "Une controverse niveau 5 chez une entreprise détenue par un fonds ESG est…",
      options: [
        "Anecdotique.",
        "Un signal légitime d'exclusion à examiner.",
        "Une preuve d'innovation.",
        "Un faux positif systématique.",
      ],
      correctIndex: 1,
      explanation:
        "Niveau 5 = sévère et documenté. Un fonds ESG sérieux exclut ou s'engage activement pour faire évoluer la situation.",
    },
    {
      question: "% aligné taxonomie européenne d'un MSCI World classique ?",
      options: ["~5 %", "~30 %", "~70 %", "~100 %"],
      correctIndex: 0,
      explanation:
        "≈ 5 %. La taxonomie est exigeante : la plupart des activités économiques ne sont pas alignées.",
    },
  ],
};
