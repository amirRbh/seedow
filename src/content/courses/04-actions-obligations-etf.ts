import type { Course } from "./types";

export const course: Course = {
  slug: "actions-obligations-etf",
  number: 4,
  track: "finance",
  level: "debutant",
  isFree: false,
  readingMinutes: 8,
  title: "Actions, obligations, ETF : comprendre les briques de base",
  eyebrow: "Bases · Instruments",
  description:
    "Trois mots qui couvrent l'essentiel de ce qu'on peut détenir dans un portefeuille. Définitions, différences, à quoi sert chacun.",
  intro:
    "Avant de parler stratégie, on parle briques. Action, obligation, ETF : trois objets distincts, trois rôles différents dans un portefeuille.",
  sections: [
    {
      heading: "Action : une part d'entreprise",
      paragraphs: [
        "Une action est une fraction de propriété d'une entreprise cotée. En détenir vous donne droit à une part des bénéfices (dividendes) et à un vote en assemblée.",
        "L'action monte si l'entreprise se valorise (ou si le marché y croit) et baisse dans le cas contraire. Pas de garantie, pas d'échéance : on peut conserver une action toute sa vie ou la vendre demain.",
      ],
    },
    {
      heading: "Obligation : un prêt à durée fixe",
      paragraphs: [
        "Une obligation est un prêt que vous accordez à une entreprise ou à un État. Vous prêtez 1 000 €, on vous rembourse 1 000 € dans X années, et entre-temps on vous verse un coupon annuel.",
        "Moins volatile qu'une action, mais pas sans risque : si l'émetteur fait défaut, vous pouvez perdre tout ou partie. Les obligations d'États solides sont historiquement les actifs les plus stables.",
      ],
    },
    {
      heading: "ETF : un panier coté en continu",
      paragraphs: [
        "Un ETF (Exchange Traded Fund) est un panier d'actifs qui suit un indice. L'ETF MSCI World contient ≈ 1 500 actions des pays développés. En acheter une part, c'est acheter une mini-tranche des 1 500.",
        "Avantages : diversification instantanée, frais très bas (souvent < 0,3 % par an), liquidité quotidienne. C'est devenu le véhicule par défaut pour la plupart des investisseurs particuliers.",
      ],
      callout:
        "ETF ≠ fonds magique. Un ETF qui suit un mauvais indice reste un mauvais investissement. Toujours regarder ce qu'il y a dedans.",
    },
    {
      heading: "Quel mélange pour quel objectif",
      paragraphs: [
        "Horizon long et tolérance au risque : davantage d'actions (ou d'ETF actions). Horizon court ou aversion au risque : davantage d'obligations et liquidités.",
        "Une règle ancienne mais utile : avoir en obligations un pourcentage proche de son âge. À 30 ans, 70 % actions / 30 % obligations. À 60 ans, l'inverse. C'est un repère, pas une loi.",
      ],
    },
  ],
  keyTakeaways: [
    "Action = part d'entreprise, volatile, sans échéance.",
    "Obligation = prêt avec échéance, moins volatil mais pas sans risque.",
    "ETF = panier coté, diversification + frais bas.",
    "Un ETF qui suit un mauvais indice reste un mauvais placement.",
    "Mélange actions/obligations dépend d'horizon et tolérance au risque.",
  ],
  quiz: [
    {
      question: "Une obligation, c'est…",
      options: [
        "Une part d'entreprise.",
        "Un prêt à durée déterminée.",
        "Un fonds d'investissement.",
        "Une assurance-vie.",
      ],
      correctIndex: 1,
      explanation: "Obligation = créance avec coupon et remboursement à échéance.",
    },
    {
      question: "Un ETF MSCI World vous expose à…",
      options: [
        "Une action française.",
        "≈ 1 500 actions des pays développés.",
        "Uniquement des obligations.",
        "Des cryptomonnaies.",
      ],
      correctIndex: 1,
      explanation:
        "Le MSCI World agrège les grandes et moyennes capitalisations des 23 pays développés.",
    },
    {
      question: "Avantage principal d'un ETF par rapport à un fonds classique ?",
      options: [
        "Garantie de capital.",
        "Frais très faibles et liquidité quotidienne.",
        "Promesse de rendement.",
        "Exclusivité pour les pros.",
      ],
      correctIndex: 1,
      explanation: "ETF = frais bas (souvent < 0,3 %) et négociable comme une action en bourse.",
    },
    {
      question: "À 30 ans, horizon long, quel mix est généralement cohérent ?",
      options: [
        "100 % obligations.",
        "Majorité actions, minorité obligations.",
        "100 % liquidités.",
        "100 % immobilier.",
      ],
      correctIndex: 1,
      explanation: "Horizon long + tolérance jeune = davantage d'actions pour profiter du temps.",
    },
  ],
};
