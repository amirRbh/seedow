import type { Course } from "./types";

export const course: Course = {
  slug: "mesurer-impact",
  number: 11,
  track: "esg",
  level: "intermediaire",
  isFree: false,
  readingMinutes: 8,
  title: "Mesurer l'impact : intensité carbone, score ESG, controverses",
  eyebrow: "ESG · Mesure",
  description:
    "Trois familles d'indicateurs pour évaluer la performance extra-financière d'un portefeuille. Forces, limites, comment les lire ensemble.",
  intro:
    "« Mon portefeuille est-il vraiment responsable ? » La réponse demande de croiser plusieurs mesures. Aucune ne suffit seule, chacune éclaire une dimension différente.",
  sections: [
    {
      heading: "Intensité carbone",
      paragraphs: [
        "L'intensité carbone d'un portefeuille mesure les émissions de gaz à effet de serre (en tonnes de CO₂e) générées par million d'euros investi ou par million de chiffre d'affaires des entreprises détenues.",
        "Comparée à un indice de référence (MSCI World, par exemple), elle montre si le portefeuille est plus ou moins carboné que le marché. -30 % vs benchmark, c'est significatif. -5 %, c'est cosmétique.",
      ],
    },
    {
      heading: "Score ESG agrégé",
      paragraphs: [
        "Plusieurs fournisseurs (MSCI, Sustainalytics, ISS) publient des scores ESG. Ils notent les entreprises sur des dizaines de critères puis agrègent en un score unique (souvent de 0 à 100, ou AAA à CCC).",
        "Limites bien documentées : les scores divergent fortement entre fournisseurs (corrélation ≈ 0,5). Deux notations sérieuses peuvent classer la même entreprise très différemment. Donc : lire les sous-scores, pas le score agrégé.",
      ],
      callout:
        "Si deux fournisseurs ESG divergent sur une entreprise, ce n'est pas du bruit : c'est qu'ils mesurent des choses différentes. Toujours regarder la méthode.",
    },
    {
      heading: "Controverses",
      paragraphs: [
        "Une controverse est un incident documenté : pollution, scandale social, fraude, etc. Les bases de données comme RepRisk ou Sustainalytics classent les controverses de mineure à majeure.",
        "Une entreprise au bon score ESG mais avec une controverse majeure récente mérite enquête. Le score peut refléter une politique en place ; la controverse, ce qui s'est vraiment passé.",
      ],
    },
    {
      heading: "Indicateurs d'impact positif (PAI)",
      paragraphs: [
        "Depuis SFDR, les fonds publient des PAI (Principal Adverse Impact Indicators) : intensité carbone, % de revenus dans des activités controversées, exposition aux énergies fossiles, écart salarial femmes-hommes, etc.",
        "Ces indicateurs sont standardisés et comparables d'un fonds à l'autre. C'est aujourd'hui la matière la plus utile pour comparer deux fonds entre eux.",
      ],
    },
  ],
  keyTakeaways: [
    "Intensité carbone : à lire en relatif vs benchmark.",
    "Scores ESG : faibles corrélations entre fournisseurs, lire les sous-scores.",
    "Controverses : enquête obligatoire si majeure et récente.",
    "PAI (SFDR) : indicateurs standardisés, base de comparaison.",
    "Aucune mesure unique ne suffit, croiser les angles.",
  ],
  quiz: [
    {
      question: "L'intensité carbone d'un portefeuille se lit…",
      options: [
        "En valeur absolue uniquement.",
        "En relatif par rapport à un benchmark.",
        "En tonnes de CO₂ par investisseur.",
        "En euros.",
      ],
      correctIndex: 1,
      explanation: "Comparée à un indice de référence pour juger si le portefeuille est plus ou moins carboné.",
    },
    {
      question: "Deux fournisseurs ESG donnent des notes très différentes à la même entreprise. C'est…",
      options: [
        "Une erreur de l'un d'eux.",
        "Normal : ils mesurent des choses différentes selon leur méthode.",
        "Une preuve que l'ESG ne marche pas.",
        "Interdit par la réglementation.",
      ],
      correctIndex: 1,
      explanation:
        "La corrélation entre fournisseurs est ≈ 0,5. Lire la méthode et les sous-scores plutôt que le score agrégé.",
    },
    {
      question: "Une controverse majeure récente sur une entreprise bien notée doit…",
      options: [
        "Être ignorée si le score est bon.",
        "Déclencher une enquête approfondie.",
        "Faire vendre immédiatement.",
        "Confirmer le bon score.",
      ],
      correctIndex: 1,
      explanation:
        "Le score reflète des politiques, la controverse reflète ce qui s'est vraiment passé. Croiser les deux.",
    },
    {
      question: "Les PAI (SFDR) sont utiles parce que…",
      options: [
        "Ils sont marketing.",
        "Ils sont standardisés, donc comparables entre fonds.",
        "Ils garantissent un rendement.",
        "Ils remplacent le DICI.",
      ],
      correctIndex: 1,
      explanation:
        "Standardisation = comparabilité, ce qui manquait jusqu'ici aux indicateurs extra-financiers.",
    },
  ],
};
