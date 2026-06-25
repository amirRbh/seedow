import type { Course } from "./types";

export const course: Course = {
  slug: "portefeuille-aligne-valeurs",
  number: 12,
  track: "esg",
  level: "intermediaire",
  isFree: false,
  readingMinutes: 9,
  title: "Construire un portefeuille aligné avec ses valeurs",
  eyebrow: "ESG · Méthode",
  description:
    "Une démarche en 5 étapes pour passer d'un portefeuille subi à un portefeuille choisi. Sans renoncer à la rigueur financière.",
  intro:
    "Investir en accord avec ses valeurs n'est pas un compromis : c'est un cadrage. Cinq étapes, dans l'ordre, pour construire un portefeuille qu'on peut justifier et tenir dans le temps.",
  sections: [
    {
      heading: "Étape 1 — Clarifier ses non-négociables",
      paragraphs: [
        "Avant les pourcentages, les principes. Quelles activités refusez-vous absolument de financer ? Énergies fossiles, armes, tabac, élevage industriel : la liste est personnelle, mais elle doit être posée par écrit.",
        "Un cadre clair évite les arbitrages émotionnels en cours de route. C'est aussi ce qui rendra le portefeuille tenable sur 15 ans, et pas seulement sur 6 mois d'enthousiasme.",
      ],
    },
    {
      heading: "Étape 2 — Définir ses convictions positives",
      paragraphs: [
        "Au-delà des exclusions, qu'avez-vous envie de soutenir ? Transition énergétique, économie circulaire, santé, éducation, biodiversité ? Pas besoin de tout vouloir financer. 2 à 4 convictions fortes valent mieux qu'une liste de 12.",
        "Ces convictions deviennent les tilts du portefeuille : surpondérer certains thèmes, sans pour autant détruire la diversification.",
      ],
    },
    {
      heading: "Étape 3 — Construire le socle diversifié",
      paragraphs: [
        "Avant les thématiques, un socle large : ETF actions monde ESG, obligations vertes ou souveraines durables. Ce socle absorbe la majorité du capital (60-80 %) et garantit la diversification.",
        "Sur ce socle, on superpose ensuite les convictions thématiques (transition, social, biodiversité) en proportion mesurée (20-40 %).",
      ],
      callout:
        "Un portefeuille aligné ne renonce pas à la rigueur. La diversification reste l'outil n°1 pour ne pas voir son capital halluciner sur une mauvaise année.",
    },
    {
      heading: "Étape 4 — Vérifier la cohérence réelle",
      paragraphs: [
        "Une fois le portefeuille construit, contrôle qualité : intensité carbone vs benchmark, exposition aux exclusions, % aligné taxonomie verte, contrôverses détectées.",
        "Si le résultat est très proche d'un MSCI World classique, c'est qu'il y a un problème de cohérence entre principes et pratique. À corriger.",
      ],
    },
    {
      heading: "Étape 5 — Réviser une fois par an, pas plus",
      paragraphs: [
        "Un portefeuille bien construit ne se touche pas tous les mois. Une revue annuelle : a-t-il dérivé ? Les exclusions tiennent-elles toujours ? Les convictions sont-elles toujours les vôtres ?",
        "Bricoler en permanence détruit la performance et brouille le sens. Cadrer une fois, exécuter longtemps, réviser annuellement.",
      ],
    },
  ],
  keyTakeaways: [
    "Poser non-négociables et convictions positives par écrit.",
    "Socle diversifié 60-80 %, tilts thématiques 20-40 %.",
    "Contrôler la cohérence réelle vs benchmark.",
    "Revue annuelle, pas mensuelle.",
    "Un portefeuille aligné = méthode, pas idéologie.",
  ],
  quiz: [
    {
      question: "Quelle est la première étape ?",
      options: [
        "Choisir les fonds.",
        "Clarifier ses non-négociables par écrit.",
        "Calculer le rendement attendu.",
        "Ouvrir un compte-titres.",
      ],
      correctIndex: 1,
      explanation:
        "Sans cadre écrit, les arbitrages émotionnels reprennent le dessus. Les principes d'abord, les produits ensuite.",
    },
    {
      question: "Un socle diversifié dans un portefeuille aligné représente typiquement…",
      options: ["0 %", "20-40 %", "60-80 %", "100 %"],
      correctIndex: 2,
      explanation:
        "60-80 % pour le socle, 20-40 % pour les convictions thématiques. Garde la diversification.",
    },
    {
      question: "Réviser un portefeuille tous les mois, c'est…",
      options: [
        "Une bonne discipline.",
        "Destructeur de performance et de sens.",
        "Obligatoire.",
        "Recommandé par tous les conseillers.",
      ],
      correctIndex: 1,
      explanation: "Une revue annuelle suffit. Le bricolage permanent ronge la performance.",
    },
    {
      question: "Si le portefeuille construit ressemble à un MSCI World classique, c'est…",
      options: [
        "Un succès, c'est diversifié.",
        "Un signal d'incohérence entre principes affichés et pratique.",
        "Idéal pour la performance.",
        "Conforme à toutes les normes.",
      ],
      correctIndex: 1,
      explanation:
        "Si le résultat est identique à l'indice de marché, c'est que la sélection n'a rien produit de différent.",
    },
  ],
};
