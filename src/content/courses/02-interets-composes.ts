import type { Course } from "./types";

export const course: Course = {
  slug: "interets-composes",
  number: 2,
  track: "finance",
  level: "debutant",
  isFree: true,
  readingMinutes: 7,
  title: "Intérêts composés : la mécanique du temps long",
  eyebrow: "Bases · Mécanique",
  description:
    "Pourquoi commencer à 25 ans avec 100 €/mois rapporte plus que commencer à 40 ans avec 300 €/mois. La force que Einstein aurait appelée la 8ème merveille du monde.",
  intro:
    "Les intérêts composés, c'est le moment où vos gains commencent à gagner eux-mêmes des gains. Ça paraît minuscule la première année. Sur 30 ans, ça change la nature même de votre patrimoine.",
  sections: [
    {
      heading: "La mécanique en une phrase",
      paragraphs: [
        "Intérêts simples : vous gagnez chaque année un pourcentage du capital de départ. Intérêts composés : vous gagnez un pourcentage du capital initial PLUS de tous les gains accumulés.",
        "1 000 € placés à 6 % rapportent 60 € la première année. La deuxième, on ne calcule pas 6 % de 1 000 € mais 6 % de 1 060 €. Soit 63,60 €. La différence semble dérisoire. Continuez 30 ans et le capital atteint environ 5 743 € au lieu de 2 800 € en intérêts simples.",
      ],
    },
    {
      heading: "Le rôle du temps",
      paragraphs: [
        "Investir 100 € par mois pendant 40 ans à 6 % annuel donne ≈ 200 000 €. Les mêmes 100 €/mois pendant 20 ans : ≈ 46 000 €. Doubler la durée multiplie le capital par plus de 4, pas par 2.",
        "Conclusion : le levier le plus puissant n'est pas le montant épargné, c'est l'année à laquelle vous commencez. Un euro placé à 25 ans vaut plusieurs euros placés à 45 ans.",
      ],
      callout:
        "Commencer petit mais tôt bat presque toujours commencer fort mais tard. Le temps est la seule variable que personne ne peut acheter.",
    },
    {
      heading: "La règle des 72",
      paragraphs: [
        "Une approximation utile : divisez 72 par le rendement annuel pour estimer combien d'années il faut pour doubler votre capital. À 6 %, doublement en 12 ans. À 9 %, en 8 ans. À 3 %, en 24 ans.",
        "Cette règle aide à juger une promesse rapidement. Quand quelqu'un vous parle de « doubler votre argent en 3 ans », il vous parle d'un rendement de 24 % par an — un signal d'alerte, pas une opportunité.",
      ],
    },
    {
      heading: "L'inflation, l'ennemie silencieuse",
      paragraphs: [
        "L'inflation érode le pouvoir d'achat de votre capital. À 2 % d'inflation, 1 000 € aujourd'hui valent ≈ 820 € dans 10 ans. Tout rendement doit être lu net d'inflation.",
        "C'est pourquoi laisser dormir un capital sur un compte courant est en réalité une perte garantie. La passivité a un coût, simplement invisible.",
      ],
    },
  ],
  keyTakeaways: [
    "Les gains qui rapportent des gains : c'est non-linéaire.",
    "Le temps est le levier dominant, pas le montant.",
    "Règle des 72 : durée de doublement ≈ 72 ÷ rendement.",
    "Une promesse de doublement rapide cache un rendement absurde.",
    "Inflation = perte garantie sur capital dormant.",
  ],
  quiz: [
    {
      question: "À 6 % annuel, combien d'années pour doubler 10 000 € ?",
      options: ["6 ans", "12 ans", "20 ans", "30 ans"],
      correctIndex: 1,
      explanation: "Règle des 72 : 72 ÷ 6 = 12 ans.",
    },
    {
      question: "Commencer à 25 ans plutôt qu'à 40 ans, à mensualité égale, multiplie le capital final…",
      options: ["Par 1,5", "Par 2", "Par 3 à 5", "Cela ne change rien"],
      correctIndex: 2,
      explanation:
        "Les 15 années supplémentaires d'intérêts composés démultiplient le résultat, typiquement par 3 à 5 selon le rendement.",
    },
    {
      question: "Quelqu'un promet « +24 % par an, garanti ». Vous…",
      options: [
        "Investissez immédiatement.",
        "Vérifiez la documentation puis investissez.",
        "Considérez ça comme un signal d'arnaque.",
        "Demandez à diviser le ticket d'entrée.",
      ],
      correctIndex: 2,
      explanation:
        "Aucun placement légal et liquide ne garantit 24 % par an. Plus le rendement promis est haut, plus le risque (ou la fraude) l'est.",
    },
    {
      question: "Pourquoi laisser 50 000 € sur un compte courant est-il une perte ?",
      options: [
        "Parce que la banque prend des frais.",
        "Parce que l'inflation érode le pouvoir d'achat chaque année.",
        "Parce que c'est interdit au-delà d'un certain montant.",
        "Ce n'est pas une perte, c'est neutre.",
      ],
      correctIndex: 1,
      explanation:
        "Compte courant ≈ 0 % de rendement. Avec 2 % d'inflation, vous perdez chaque année 2 % de pouvoir d'achat réel.",
    },
  ],
};
