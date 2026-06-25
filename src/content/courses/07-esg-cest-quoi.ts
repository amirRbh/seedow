import type { Course } from "./types";

export const course: Course = {
  slug: "esg-cest-quoi",
  number: 7,
  track: "esg",
  level: "debutant",
  isFree: true,
  readingMinutes: 6,
  title: "Qu'est-ce que l'ESG ?",
  eyebrow: "ESG · Fondamentaux",
  description:
    "Environnement, Social, Gouvernance : trois lettres devenues omniprésentes. Ce qu'elles recouvrent vraiment, ce qu'elles ne disent pas, et pourquoi un score ESG n'est pas un brevet de vertu.",
  intro:
    "L'ESG est partout sur les brochures financières depuis dix ans. C'est à la fois une grille d'analyse utile et un terrain de jeu marketing. Comprendre ce que les trois lettres veulent dire — et surtout ce qu'elles ne disent pas — est la première étape pour ne pas se faire avoir.",
  sections: [
    {
      heading: "E comme Environnement",
      paragraphs: [
        "Le pilier E mesure l'impact d'une entreprise sur son environnement physique : émissions de CO₂, consommation d'eau et d'énergie, gestion des déchets, biodiversité, exposition au risque climatique.",
        "Une entreprise bien notée E n'est pas forcément « verte ». Elle peut simplement être moins polluante que la moyenne de son secteur. Un pétrolier peut être bien noté E parmi les pétroliers.",
      ],
    },
    {
      heading: "S comme Social",
      paragraphs: [
        "Le pilier S couvre les relations humaines : conditions de travail, sécurité, diversité, formation, respect des droits humains dans la chaîne d'approvisionnement, impact sur les communautés locales.",
        "C'est le pilier le plus difficile à mesurer objectivement. Les fournisseurs de données ESG divergent souvent davantage sur le S que sur le E.",
      ],
    },
    {
      heading: "G comme Gouvernance",
      paragraphs: [
        "Le pilier G porte sur la manière dont l'entreprise est dirigée : indépendance du conseil d'administration, rémunération des dirigeants, transparence comptable, lutte contre la corruption, droits des actionnaires minoritaires.",
        "C'est historiquement le pilier le plus corrélé à la performance financière : une mauvaise gouvernance précède souvent un scandale qui détruit de la valeur.",
      ],
      callout:
        "Une note ESG agrège trois piliers très différents. Une entreprise peut être excellente en G, médiocre en E, et finir avec une note moyenne qui ne dit pas grand-chose.",
    },
    {
      heading: "Ce qu'un score ESG ne mesure pas",
      paragraphs: [
        "Un score ESG mesure la gestion des risques extra-financiers — pas l'impact positif sur le monde. Une compagnie de tabac qui gère bien ses risques peut avoir un meilleur score qu'une PME solaire mal documentée.",
        "ESG ≠ impact. ESG ≠ éthique. ESG ≠ aligné sur l'Accord de Paris. Ce sont des notions distinctes que le marketing financier confond volontairement.",
      ],
    },
  ],
  keyTakeaways: [
    "ESG = trois piliers indépendants : Environnement, Social, Gouvernance.",
    "Une note ESG est relative à un secteur, pas absolue.",
    "Le S est le pilier le plus subjectif ; le G est le plus prédictif financièrement.",
    "ESG mesure le risque, pas l'impact positif.",
    "Toujours regarder les sous-notes et la méthode, pas le score agrégé.",
  ],
  quiz: [
    {
      question: "Que mesure principalement le pilier G ?",
      options: [
        "L'empreinte carbone.",
        "La gestion et la transparence de l'entreprise.",
        "La diversité hommes-femmes.",
        "Le respect de la biodiversité.",
      ],
      correctIndex: 1,
      explanation:
        "G = Gouvernance : structure du conseil, rémunération, transparence, droits des actionnaires.",
    },
    {
      question: "Un pétrolier bien noté E signifie qu'il…",
      options: [
        "Ne pollue plus.",
        "Est meilleur que la moyenne des pétroliers.",
        "A arrêté l'exploration de nouveaux puits.",
        "Compense toutes ses émissions.",
      ],
      correctIndex: 1,
      explanation:
        "Les notes ESG sont sectorielles : on compare une entreprise à ses pairs, pas à un idéal absolu.",
    },
    {
      question: "ESG est…",
      options: [
        "Un synonyme d'impact positif sur le climat.",
        "Une mesure de risque extra-financier, pas d'impact.",
        "Un label délivré par l'État.",
        "Une garantie de rendement.",
      ],
      correctIndex: 1,
      explanation:
        "ESG mesure comment l'entreprise gère ses risques sociaux, environnementaux et de gouvernance — pas l'impact qu'elle a sur le monde.",
    },
    {
      question: "Pourquoi le pilier le plus prédictif financièrement est-il le G ?",
      options: [
        "Parce qu'il est le plus facile à mesurer.",
        "Parce qu'une mauvaise gouvernance précède souvent les scandales destructeurs de valeur.",
        "Parce qu'il est noté par les régulateurs.",
        "Parce que les dirigeants y portent attention.",
      ],
      correctIndex: 1,
      explanation:
        "Historiquement, fraudes, manipulations comptables et conflits d'intérêts (mauvaise gouvernance) sont les premières causes d'effondrement boursier.",
    },
  ],
};
