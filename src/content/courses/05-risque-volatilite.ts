import type { Course } from "./types";

export const course: Course = {
  slug: "risque-volatilite-drawdown",
  number: 5,
  track: "finance",
  level: "intermediaire",
  isFree: false,
  readingMinutes: 7,
  title: "Risque & volatilité : lire un drawdown sans paniquer",
  eyebrow: "Risque · Lecture",
  description:
    "Drawdown, écart-type, Value-at-Risk : trois indicateurs qui décrivent le risque mieux qu'un pourcentage. Comment les lire pour ne pas vendre au pire moment.",
  intro:
    "Le pire moment pour vendre, c'est en bas. Le meilleur moyen de tenir, c'est d'avoir compris d'avance ce qu'un portefeuille peut perdre temporairement. Trois outils pour ça.",
  sections: [
    {
      heading: "Drawdown : la pire baisse traversée",
      paragraphs: [
        "Le drawdown est la baisse maximale d'un portefeuille depuis son plus haut historique, jusqu'à ce qu'il retrouve ce niveau. Le MSCI World a connu en 2008 un drawdown d'environ -55 %.",
        "Avant d'investir, on regarde le drawdown maximal historique du type de portefeuille visé. Si la réponse fait peur en chiffres, il faut diminuer la part actions. Vendre en panique à -40 % détruit plus de valeur que n'en crée toute une stratégie.",
      ],
    },
    {
      heading: "Volatilité : l'écart-type annualisé",
      paragraphs: [
        "La volatilité (souvent notée σ) mesure l'amplitude moyenne des variations autour de la moyenne. Pour un portefeuille actions monde, σ ≈ 15-18 % annualisé. Pour un portefeuille obligataire, ≈ 5-7 %.",
        "Règle approximative : sur une année, le rendement reste dans une fourchette de ± 1 σ environ 2 fois sur 3, et de ± 2 σ environ 19 fois sur 20.",
      ],
    },
    {
      heading: "Value-at-Risk (VaR)",
      paragraphs: [
        "La VaR à 95 % sur 1 an, c'est la perte que vous ne devriez dépasser que dans 5 % des cas. Une VaR 95 % de -20 % signifie : il y a 5 % de chances de perdre plus de 20 % sur l'année.",
        "C'est utile pour cadrer un dialogue : on n'investit pas une somme dont une perte temporaire de la VaR ferait basculer son projet de vie.",
      ],
      callout:
        "Un investisseur prévenu vaut deux investisseurs paniqués. Le risque qu'on a anticipé est presque toujours mieux supporté que celui qui surprend.",
    },
    {
      heading: "Ce que ces chiffres ne disent pas",
      paragraphs: [
        "Tous ces indicateurs reposent sur l'histoire récente. Les vraies crises (1929, 2008, 2020) sortent souvent de la distribution attendue. C'est la queue de distribution — rare mais réelle.",
        "Donc : utiliser ces métriques pour calibrer, mais ne jamais croire qu'elles bornent strictement l'avenir. Garder une marge de sécurité.",
      ],
    },
  ],
  keyTakeaways: [
    "Drawdown = pire baisse historique, utile pour test psychologique avant d'investir.",
    "Volatilité σ ≈ amplitude moyenne des variations, à lire annualisée.",
    "VaR 95 % = perte annuelle dépassée 1 année sur 20.",
    "Les chiffres reposent sur le passé, les crises sortent souvent du cadre.",
    "Garder une marge de sécurité, ne pas investir l'argent dont on a besoin demain.",
  ],
  quiz: [
    {
      question: "Le drawdown maximal mesure…",
      options: [
        "Le rendement annuel moyen.",
        "La pire baisse historique depuis un plus haut.",
        "Le coût de gestion.",
        "Le taux d'inflation.",
      ],
      correctIndex: 1,
      explanation: "Drawdown = perte maximale d'un sommet à un creux.",
    },
    {
      question: "Une VaR 95 % de -20 % sur 1 an signifie…",
      options: [
        "Vous gagnerez 20 % cette année.",
        "Vous avez 5 % de chances de perdre plus de 20 %.",
        "Vous perdrez 20 % à coup sûr.",
        "Le marché va baisser de 20 %.",
      ],
      correctIndex: 1,
      explanation: "VaR 95 % = seuil dépassé dans 5 % des cas.",
    },
    {
      question: "La volatilité d'un portefeuille actions monde est typiquement…",
      options: ["≈ 2 %", "≈ 15-18 %", "≈ 50 %", "≈ 100 %"],
      correctIndex: 1,
      explanation: "Annualisée, autour de 15-18 % sur l'historique long.",
    },
    {
      question: "Pourquoi ne pas se fier strictement à la VaR ?",
      options: [
        "Parce qu'elle est interdite par la loi.",
        "Parce qu'elle repose sur le passé et sous-estime les vraies crises.",
        "Parce qu'elle est trop pessimiste.",
        "Parce qu'elle change tous les jours.",
      ],
      correctIndex: 1,
      explanation:
        "Les événements extrêmes (queues de distribution) sortent souvent du cadre statistique habituel.",
    },
  ],
};
