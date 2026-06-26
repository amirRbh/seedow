import type { Course } from "./types";

export const course: Course = {
  slug: "frais-caches",
  number: 6,
  track: "finance",
  level: "debutant",
  isFree: false,
  readingMinutes: 11,
  title: "Frais cachés : ce qui ronge un portefeuille sur 20 ans",
  eyebrow: "Bases · Argent qui sort",
  description:
    "Frais d'entrée, de gestion, d'arbitrage, fiscalité, écart bid-ask : la liste complète des coûts qui rognent silencieusement votre performance.",
  intro:
    "Un point de frais en trop par an, ça paraît dérisoire. Sur 30 ans, c'est environ 25 % de votre capital final qui disparaît. Ce cours dresse l'inventaire des frais — y compris ceux qu'on ne vous dit pas spontanément — et donne les ordres de grandeur pour les arbitrer.",
  sections: [
    {
      heading: "Pourquoi 1 % de frais en plus = 25 % de capital final en moins",
      paragraphs: [
        "Hypothèse : 10 000 € placés à 6 % brut pendant 30 ans. Avec 0,3 % de frais annuels (ETF) → 52 100 €. Avec 1,3 % de frais (fonds bon marché) → 39 300 €. Avec 2,5 % de frais (fonds maison de banque) → 27 600 €.",
        "Écart entre l'ETF à 0,3 % et le fonds à 2,5 % : 24 500 €, soit 47 % du résultat de l'ETF. Sur le même capital de départ et le même rendement brut.",
        "C'est le pouvoir des intérêts composés inversés : chaque euro pris en frais ne rapporte plus jamais. Sur 30 ans, l'effet est colossal et largement sous-estimé.",
      ],
      callout:
        "Réduire ses frais est l'optimisation la plus prévisible et la plus rentable en finance personnelle. Aucun gérant ne peut garantir +1 % de rendement. Tout le monde peut garantir -1 % de frais.",
    },
    {
      heading: "Les frais d'entrée et de sortie",
      paragraphs: [
        "Frais d'entrée (« frais de souscription ») : prélevés au moment où vous achetez. Historiquement 1 à 5 % chez les banques et conseillers, mais souvent négociables jusqu'à 0 %. Toujours demander une remise.",
        "Frais de sortie (« frais de rachat ») : moins fréquents, parfois sur les unités de compte d'assurance-vie. À vérifier avant de souscrire.",
        "Sur un ETF acheté en bourse : pas de frais d'entrée du fonds, mais des frais de courtage du courtier (entre 0,2 % et 2 € par ordre selon les acteurs).",
      ],
    },
    {
      heading: "Les frais de gestion annuels (le poison silencieux)",
      paragraphs: [
        "Ce sont les plus importants en montant cumulé. Prélevés en continu sur la valeur du fonds, ils apparaissent dans la ligne « frais courants » ou « TER » (Total Expense Ratio) du document d'information clé.",
        "Ordres de grandeur : ETF mondiaux 0,2 à 0,4 %. Fonds indiciels gérés 0,5 à 1 %. Fonds actifs « bon marché » 1 à 1,5 %. Fonds actifs banque 1,5 à 2,5 %. Fonds spécialisés (small caps, thématiques) jusqu'à 3 %.",
        "À performance brute égale, le fonds le moins cher gagne — toujours. Et statistiquement, les fonds actifs cher sous-performent leur indice à 80-90 % sur 10 ans. Payer plus cher pour moins de performance.",
      ],
    },
    {
      heading: "Les frais d'enveloppe (PEA, assurance-vie, CTO)",
      paragraphs: [
        "Au-dessus des frais de fonds, l'enveloppe a ses propres frais. Assurance-vie : frais de gestion sur unités de compte (souvent 0,6 à 1 % par an chez les banques traditionnelles, 0,5 % chez les courtiers en ligne).",
        "Frais d'arbitrage : prélevés à chaque changement de support. Parfois 0,5 à 1 % par opération. Une assurance-vie « gratuite à l'arbitrage » est devenue le standard chez les acteurs en ligne.",
        "PEA : généralement 0 % de frais d'enveloppe chez les courtiers en ligne, mais frais de tenue de compte (souvent supprimés) et de transaction selon les courtiers.",
      ],
      callout:
        "Cumul fréquent dans les banques traditionnelles : 2,5 % de frais fonds + 1 % de frais d'enveloppe + 0,5 % de frais d'arbitrage. Soit 4 % par an qui partent en fumée avant même de parler de rendement.",
    },
    {
      heading: "Les frais qu'on ne facture pas mais qui coûtent",
      paragraphs: [
        "Spread bid-ask : écart entre le prix d'achat et le prix de vente d'un titre à un instant donné. Marginal sur un ETF très liquide (< 0,05 %), peut atteindre 1 % sur des titres exotiques.",
        "Frais de change : si vous achetez un ETF en USD via un courtier français, conversion EUR → USD à chaque opération. Souvent 0,25 à 1,5 % selon le courtier.",
        "Tracking error : un ETF ne suit jamais parfaitement son indice (frottements de réplication, prêts de titres). Généralement faible (< 0,1 %) sur les ETF mainstream.",
      ],
    },
    {
      heading: "La fiscalité : à intégrer comme un frais",
      paragraphs: [
        "Compte-titres ordinaire (CTO) : flat tax 30 % sur les plus-values et dividendes en France. Le pire fiscalement, mais le plus souple en pratique (tout l'univers investissable).",
        "PEA : exonération d'impôt sur le revenu après 5 ans (prélèvements sociaux 17,2 % restent). Univers limité aux actions européennes ou ETF éligibles.",
        "Assurance-vie : abattement de 4 600 € (9 200 € couple) par an sur les gains après 8 ans, fiscalité réduite ensuite. Excellente pour transmission.",
      ],
    },
    {
      heading: "Cas pratique : Nadia, audit de son assurance-vie",
      paragraphs: [
        "Nadia détient 60 000 € sur une assurance-vie de sa banque, investis sur 3 fonds maison à 2,4 % de frais en moyenne. Frais d'enveloppe : 0,96 %. Frais d'arbitrage : 0,75 % par opération.",
        "Total annuel : ≈ 3,4 % de frais. Sur 60 000 €, c'est environ 2 040 € par an qui partent. Sur 20 ans, à 6 % brut, elle finira avec 132 000 € au lieu de 192 000 € avec une assurance-vie en ligne à 0,5 % + ETF à 0,3 %.",
        "Différence : 60 000 €, soit l'équivalent de son investissement initial. Action simple : transférer (ou ouvrir parallèlement) une assurance-vie en ligne avec des ETF. Quelques heures de paperasse pour 60 000 € de gain.",
      ],
    },
  ],
  keyTakeaways: [
    "1 % de frais annuels en moins = ~25 % de capital final en plus sur 30 ans.",
    "Frais à vérifier : entrée, gestion (TER), enveloppe, arbitrage, courtage, change.",
    "ETF mondial < 0,4 % vs fonds banque ~2,5 %.",
    "Spread, fiscalité et tracking error comptent aussi.",
    "Fonds actifs chers sous-performent leur indice à 80-90 % sur 10 ans.",
    "PEA et assurance-vie ont une fiscalité qui peut compenser certains frais.",
    "Auditer son existant est l'optimisation la plus rentable à effort égal.",
  ],
  quiz: [
    {
      question: "Sur 30 ans, 1 % de frais annuels en plus coûte environ…",
      options: ["1 % du capital final", "5 % du capital final", "25 % du capital final", "100 % du capital final"],
      correctIndex: 2,
      explanation:
        "Effet exponentiel des intérêts composés inversés. 1 % par an = ~25 % de perte cumulée sur 30 ans.",
    },
    {
      question: "Le TER d'un fonds, c'est…",
      options: [
        "Le taux d'épargne réglementé.",
        "Le total des frais annuels du fonds.",
        "La rentabilité brute promise.",
        "Le ticker boursier.",
      ],
      correctIndex: 1,
      explanation: "TER = Total Expense Ratio. Le chiffre à comparer en premier lieu entre deux fonds.",
    },
    {
      question: "Ordre de grandeur d'un bon ETF actions mondial ?",
      options: ["0,2 à 0,4 %", "1 à 1,5 %", "2 à 2,5 %", "5 %"],
      correctIndex: 0,
      explanation: "Les ETF MSCI World mainstream sont à 0,2-0,4 % de TER. Standard de marché.",
    },
    {
      question: "Quel pourcentage de fonds actifs sous-performent leur indice sur 10 ans ?",
      options: ["10 à 20 %", "40 à 50 %", "80 à 90 %", "0 %"],
      correctIndex: 2,
      explanation:
        "Études SPIVA récurrentes : 80 à 90 % des fonds actifs sous-performent leur indice sur 10 ans. Net de frais.",
    },
    {
      question: "Sur un PEA, après 5 ans, la fiscalité sur les gains est…",
      options: [
        "30 % flat tax.",
        "Exonération d'impôt sur le revenu (17,2 % prélèvements sociaux restent).",
        "0 % total.",
        "Plus chère qu'un CTO.",
      ],
      correctIndex: 1,
      explanation:
        "Après 5 ans : pas d'IR, mais prélèvements sociaux à 17,2 %. Très avantageux pour actions européennes.",
    },
    {
      question: "Le frais le plus important à surveiller en montant cumulé ?",
      options: [
        "Les frais d'entrée (une fois).",
        "Les frais de gestion annuels.",
        "Les frais de courtage.",
        "Le spread bid-ask.",
      ],
      correctIndex: 1,
      explanation:
        "Les frais annuels s'appliquent en continu et composent. Un point de plus = effet massif long terme.",
    },
  ],
};
