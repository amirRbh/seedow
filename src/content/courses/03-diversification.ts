import type { Course } from "./types";

export const course: Course = {
  slug: "diversification",
  number: 3,
  track: "finance",
  level: "debutant",
  isFree: false,
  readingMinutes: 7,
  title: "Diversification : ne pas mettre tous ses œufs dans le même panier",
  eyebrow: "Bases · Construction",
  description:
    "Pourquoi répartir son capital entre plusieurs actifs réduit le risque sans amputer significativement le rendement. La seule règle gratuite de la finance.",
  intro:
    "Markowitz a reçu le Nobel pour avoir formalisé une intuition populaire : ne pas tout mettre au même endroit. On regarde pourquoi, et surtout comment, diversifier réellement.",
  sections: [
    {
      heading: "Pourquoi ça marche",
      paragraphs: [
        "Si vous détenez une seule action, votre destin est celui de cette entreprise. Si elle fait faillite, vous perdez tout. Si vous détenez 200 actions, la faillite d'une seule réduit votre capital de moins de 1 %.",
        "La diversification réduit le risque dit « spécifique » (lié à une entreprise) sans réduire le risque dit « systémique » (lié au marché entier). On ne se débarrasse pas du second, mais on annule le premier presque gratuitement.",
      ],
    },
    {
      heading: "Diversifier vraiment",
      paragraphs: [
        "Détenir 50 actions du CAC 40 n'est pas une diversification : si la France traverse une crise, tout baisse en même temps. La vraie diversification croise les zones géographiques, les secteurs, les classes d'actifs, les devises.",
        "Un portefeuille raisonnablement diversifié contient typiquement : actions monde (USA, Europe, émergents), obligations (États, entreprises), un peu d'immobilier, parfois des matières premières.",
      ],
      callout:
        "Diversifier ne réduit pas le rendement attendu, mais réduit l'amplitude des baisses. C'est le seul « repas gratuit » en finance.",
    },
    {
      heading: "Les corrélations changent",
      paragraphs: [
        "Deux actifs peu corrélés en temps normal peuvent le devenir brutalement en crise. En mars 2020, presque tout a baissé ensemble pendant deux semaines. La diversification n'est pas une assurance, c'est une réduction statistique du risque.",
        "Cela ne remet pas en cause la stratégie. Sur des horizons longs, la diversification reste l'outil le plus puissant pour limiter les pertes maximales (drawdowns).",
      ],
    },
    {
      heading: "Diversification ≠ multiplication",
      paragraphs: [
        "Acheter 12 fonds qui détiennent tous les mêmes 50 grandes capitalisations américaines n'est pas plus diversifié qu'en acheter un seul. Toujours vérifier les expositions sous-jacentes, pas les noms.",
        "Un ETF Monde bien construit diversifie davantage qu'un panier de fonds thématiques aux noms variés.",
      ],
    },
  ],
  keyTakeaways: [
    "Diversifier annule le risque spécifique ; le risque systémique reste.",
    "Vraie diversification = zones + secteurs + classes d'actifs.",
    "Les corrélations grimpent en crise : ce n'est pas une assurance.",
    "Multiplier les fonds ≠ diversifier.",
    "Un ETF Monde bien choisi peut faire le travail pour un coût minime.",
  ],
  quiz: [
    {
      question: "Le risque spécifique est…",
      options: [
        "Le risque du marché entier.",
        "Le risque lié à une entreprise individuelle, neutralisable par diversification.",
        "Le risque de change.",
        "Le risque réglementaire.",
      ],
      correctIndex: 1,
      explanation: "Risque spécifique = idiosyncratique = neutralisé par la diversification.",
    },
    {
      question: "Détenir 12 fonds aux noms variés vous diversifie automatiquement ?",
      options: [
        "Oui, plus de fonds = plus de diversification.",
        "Non, il faut vérifier les actifs sous-jacents.",
        "Oui, si les fonds sont chez des sociétés de gestion différentes.",
        "Non, il faut au moins 20 fonds.",
      ],
      correctIndex: 1,
      explanation: "Ce qui compte n'est pas le nombre de fonds, c'est l'exposition réelle.",
    },
    {
      question: "En crise majeure, la diversification…",
      options: [
        "Garantit zéro perte.",
        "Réduit les pertes mais ne les annule pas.",
        "Augmente les pertes.",
        "N'a aucun effet.",
      ],
      correctIndex: 1,
      explanation: "Les corrélations augmentent en crise, mais la diversification reste réductrice statistique du risque.",
    },
    {
      question: "Le « repas gratuit » de la finance, c'est…",
      options: [
        "Le levier.",
        "La diversification.",
        "Les actions à dividende.",
        "Les obligations d'État.",
      ],
      correctIndex: 1,
      explanation:
        "Expression de Markowitz : la diversification réduit le risque sans réduire le rendement attendu.",
    },
  ],
};
