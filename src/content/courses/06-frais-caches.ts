import type { Course } from "./types";

export const course: Course = {
  slug: "frais-caches",
  number: 6,
  track: "finance",
  level: "debutant",
  isFree: false,
  readingMinutes: 6,
  title: "Frais cachés : ce qui ronge un portefeuille sur 20 ans",
  eyebrow: "Coûts · Vigilance",
  description:
    "Frais d'entrée, de gestion, d'arbitrage, de surperformance, droits de garde : la liste réelle des prélèvements. Et l'effet brutal qu'ils ont sur le long terme.",
  intro:
    "1 % de frais en plus par an ne se voit pas sur un relevé mensuel. Sur 30 ans, c'est jusqu'à un tiers du capital final qui part. Décortiquer les frais avant de signer, c'est protéger plusieurs années de salaire.",
  sections: [
    {
      heading: "Les couches de frais qu'on cumule",
      paragraphs: [
        "Frais d'entrée : prélevés au versement (parfois 2 à 5 %). Frais de gestion annuels : prélevés en continu sur l'encours (souvent 0,8 à 2,5 % par an). Frais d'arbitrage : à chaque changement de support. Frais de surperformance : « bonus » prélevé par le gérant quand le fonds bat son indice.",
        "Sur un contrat d'assurance-vie, on cumule en plus les frais du contrat ET les frais du fonds sous-jacent. Le total réel peut dépasser 3 % par an sans qu'on s'en rende compte.",
      ],
    },
    {
      heading: "L'effet sur 30 ans",
      paragraphs: [
        "10 000 € placés à 6 % brut pendant 30 ans : ≈ 57 000 € à 0,3 % de frais, ≈ 43 000 € à 1,5 %, ≈ 33 000 € à 2,5 %. La même mise initiale, le même marché, juste deux points de frais d'écart : 24 000 € de différence.",
        "Plus l'horizon est long, plus les frais sont destructeurs. C'est aussi pourquoi les ETF à frais bas sont devenus dominants : la concurrence sur le coût a finalement bénéficié aux particuliers.",
      ],
      callout:
        "Un fonds à 2 % de frais doit faire 2 % de surperformance par an juste pour égaler un ETF concurrent. Statistiquement, peu y arrivent durablement.",
    },
    {
      heading: "Repérer les frais sur un DICI",
      paragraphs: [
        "Le DICI (Document d'Information Clé pour l'Investisseur) liste les frais courants. Chercher la ligne « frais courants » ou « ongoing charges ». C'est la mesure synthétique la plus comparable.",
        "Méfiance : certains fonds affichent des frais courants faibles mais facturent une commission de surperformance qui peut tripler le coût certaines années.",
      ],
    },
    {
      heading: "Réduire la facture sans baisser la qualité",
      paragraphs: [
        "Privilégier les enveloppes peu chargées (PEA, PER chez courtiers en ligne), choisir des ETF à frais courants < 0,3 %, limiter les arbitrages inutiles, lire ligne par ligne les frais du contrat.",
        "Économiser 1 % de frais par an, c'est l'équivalent d'avoir une stratégie d'investissement qui surperforme de 1 % par an — sans rien faire de plus, sans risque additionnel.",
      ],
    },
  ],
  keyTakeaways: [
    "Frais multiples : entrée, gestion, arbitrage, surperformance, contrat.",
    "Cumul réel souvent > 2 % par an sur produits packagés.",
    "Sur 30 ans, 1 point de frais peut amputer le capital final de 20-30 %.",
    "Lire la ligne « frais courants » du DICI, vérifier la commission de surperformance.",
    "Réduire les frais = équivalent d'une surperformance, sans risque additionnel.",
  ],
  quiz: [
    {
      question: "Sur 30 ans, passer de 0,3 % à 1,5 % de frais annuels coûte environ…",
      options: ["1 % du capital final", "5 % du capital final", "20-25 % du capital final", "Rien"],
      correctIndex: 2,
      explanation:
        "L'effet composé des frais est non-linéaire. 1,2 point d'écart annuel rogne environ 20-25 % du capital final.",
    },
    {
      question: "Le DICI est…",
      options: [
        "Un label ESG.",
        "Un document légal qui détaille les frais et caractéristiques d'un fonds.",
        "Un courtier en ligne.",
        "Un type d'obligation.",
      ],
      correctIndex: 1,
      explanation:
        "Document d'Information Clé pour l'Investisseur : obligatoire, lit-le avant tout achat.",
    },
    {
      question: "Une commission de surperformance, c'est…",
      options: [
        "Un cadeau du gérant à l'investisseur.",
        "Un prélèvement quand le fonds dépasse un indice de référence.",
        "Une fiscalité supplémentaire.",
        "Une remise sur les frais d'entrée.",
      ],
      correctIndex: 1,
      explanation:
        "Prélèvement « bonus » pour le gérant — pas toujours mauvais, mais à intégrer dans le coût total.",
    },
    {
      question: "Pourquoi les ETF sont-ils devenus dominants ?",
      options: [
        "Parce qu'ils garantissent du rendement.",
        "Parce qu'ils sont à frais très bas et battent statistiquement les fonds gérés activement.",
        "Parce qu'ils sont interdits aux institutionnels.",
        "Parce qu'ils sont fiscalisés différemment.",
      ],
      correctIndex: 1,
      explanation:
        "Frais faibles + transparence + difficulté pour les fonds actifs à battre durablement les indices.",
    },
  ],
};
