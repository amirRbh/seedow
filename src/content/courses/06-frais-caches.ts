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
    "Un point de frais en trop par an, ça paraît ridicule. Sur 30 ans, c'est environ 25 % de ton capital final qui disparaît. Voici l'inventaire des frais — y compris ceux qu'on ne t'annonce pas — avec les ordres de grandeur pour les négocier.",
  eli5: "Imagine que tu remplis un seau avec un tuyau. En bas du seau, il y a un tout petit trou. Presque invisible. Mais chaque minute, il fuit un peu. Au bout d'une heure, tu as perdu un quart de ce que tu as versé. Les frais, c'est le trou. Un tout petit % par an = un énorme paquet d'euros perdus sur 30 ans.",
  sections: [
    {
      heading: "Pourquoi 1 % de frais en plus = 25 % de capital en moins",
      paragraphs: [
        "Point de départ : 10 000 € à 6 % brut pendant 30 ans. Avec 0,3 % de frais (ETF) → 52 100 €. Avec 1,3 % (fonds bon marché) → 39 300 €. Avec 2,5 % (fonds maison de banque) → 27 600 €.",
        "Écart entre l'ETF à 0,3 % et le fonds à 2,5 % : 24 500 €, soit presque la moitié du résultat de l'ETF. Même capital de départ, même rendement brut.",
        "C'est la boule de neige à l'envers : chaque euro pris en frais ne rapporte plus jamais. Sur 30 ans, l'effet est massif et sous-estimé.",
      ],
      callout:
        "Réduire ses frais est l'optimisation la plus prévisible et la plus rentable en finance perso. Aucun gérant ne peut garantir +1 % de rendement. Tout le monde peut garantir -1 % de frais.",
    },
    {
      heading: "Les frais d'entrée et de sortie",
      paragraphs: [
        "Frais d'entrée (« frais de souscription ») : prélevés quand tu achètes. Historiquement 1 à 5 % en banque, souvent négociables jusqu'à 0 %. Toujours demander une remise.",
        "Frais de sortie (« frais de rachat ») : moins fréquents, parfois sur les unités de compte d'assurance-vie. À vérifier avant de souscrire.",
        "Sur un ETF acheté en bourse : pas de frais d'entrée du fonds, mais des frais de courtage du courtier (entre 0,2 % et 2 € par ordre selon les acteurs).",
      ],
    },
    {
      heading: "Les frais de gestion annuels (le poison silencieux)",
      paragraphs: [
        "Les plus importants en montant cumulé. Prélevés en continu sur la valeur du fonds. Apparaissent dans la ligne « frais courants » ou « TER » (Total Expense Ratio, la somme de tous les frais annuels du fonds).",
        "Ordres de grandeur : ETF mondial 0,2-0,4 %. Fonds indiciel géré 0,5-1 %. Fonds actif bon marché 1-1,5 %. Fonds actif banque 1,5-2,5 %. Fonds spécialisé (small caps, thématique) jusqu'à 3 %.",
        "À performance brute égale, le moins cher gagne — toujours. Et statistiquement, les fonds actifs chers font moins bien que leur indice dans 80-90 % des cas sur 10 ans. Payer plus cher pour moins de performance.",
      ],
    },
    {
      heading: "Les frais d'enveloppe (PEA, assurance-vie, CTO)",
      paragraphs: [
        "En plus des frais du fonds, l'enveloppe (le contenant) a ses propres frais. Assurance-vie : frais de gestion sur unités de compte (souvent 0,6 à 1 % par an en banque, 0,5 % en ligne).",
        "Frais d'arbitrage : à chaque changement de support. Parfois 0,5 à 1 % par opération. « Gratuité d'arbitrage » est devenue le standard en ligne.",
        "PEA : généralement 0 % de frais d'enveloppe chez les courtiers en ligne, quelques frais de transaction selon les cas.",
      ],
      callout:
        "Cumul fréquent en banque : 2,5 % de frais fonds + 1 % de frais d'enveloppe + 0,5 % d'arbitrage = 4 % par an qui partent avant même de parler de rendement.",
    },
    {
      heading: "Les frais qu'on ne facture pas mais qui coûtent",
      paragraphs: [
        "Spread bid-ask : écart entre le prix d'achat et le prix de vente à un instant donné. Marginal sur un ETF très liquide (< 0,05 %), jusqu'à 1 % sur des titres exotiques.",
        "Frais de change : si tu achètes un ETF en USD via un courtier français, conversion EUR → USD à chaque opération. Souvent 0,25 à 1,5 % selon le courtier.",
        "Tracking error : un ETF ne suit jamais parfaitement son indice (petits frottements de réplication, prêts de titres). Généralement faible (< 0,1 %) sur les ETF mainstream.",
      ],
    },
    {
      heading: "La fiscalité : à intégrer comme un frais",
      paragraphs: [
        "Compte-titres ordinaire (CTO) : flat tax 30 % sur les plus-values et dividendes en France. Le pire fiscalement, mais le plus souple (univers investissable complet).",
        "PEA : exonération d'impôt sur le revenu après 5 ans (prélèvements sociaux à 17,2 % restent). Univers limité aux actions européennes ou ETF éligibles.",
        "Assurance-vie : abattement de 4 600 € (9 200 € couple) par an sur les gains après 8 ans, fiscalité réduite. Excellente pour transmission.",
      ],
    },
    {
      heading: "Cas pratique : Nadia, audit de son assurance-vie",
      paragraphs: [
        "Nadia détient 60 000 € en assurance-vie de sa banque, sur 3 fonds maison à 2,4 % de frais en moyenne. Frais d'enveloppe : 0,96 %. Frais d'arbitrage : 0,75 % par opération.",
        "Total : ~3,4 % de frais par an. Sur 60 000 €, environ 2 040 € par an qui s'envolent. Sur 20 ans à 6 % brut, elle finit avec 132 000 € au lieu de 192 000 € avec une AV en ligne à 0,5 % + ETF à 0,3 %.",
        "Écart : 60 000 €, soit son investissement initial. Solution : transférer (ou ouvrir en parallèle) une assurance-vie en ligne avec des ETF. Quelques heures de paperasse pour 60 000 € de gain.",
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
  advanced: [
    "TER n'inclut pas les frais de transaction internes au fonds : ajouter le portfolio turnover cost (0,1-0,5 % pour un fonds actif).",
    "Étude SPIVA (S&P) : 85-95 % des fonds actifs européens sous-performent leur benchmark net sur 10 ans.",
    "PFU (Prélèvement Forfaitaire Unique) 30 % = 12,8 % IR + 17,2 % PS ; option barème IR possible si TMI < 12,8 %.",
    "Loi PACTE 2019 : transferts d'assurance-vie intra-assureur possibles en gardant l'antériorité fiscale.",
    "PEA-PME plafond 225 k€ combiné PEA ; univers PME/ETI européennes < 5 Md€ CA ou < 5 000 salariés.",
  ],
  quiz: [
    {
      question: "Sur 30 ans, 1 % de frais annuels en plus coûte environ…",
      options: [
        "1 % du capital final",
        "5 % du capital final",
        "25 % du capital final",
        "100 % du capital final",
      ],
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
      explanation:
        "TER = Total Expense Ratio. Le chiffre à comparer en premier lieu entre deux fonds.",
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
