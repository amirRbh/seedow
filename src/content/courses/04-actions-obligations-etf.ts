import type { Course } from "./types";

export const course: Course = {
  slug: "actions-obligations-etf",
  number: 4,
  track: "finance",
  level: "debutant",
  isFree: false,
  readingMinutes: 12,
  title: "Actions, obligations, ETF : comprendre les briques de base",
  eyebrow: "Bases · Instruments",
  description:
    "Trois mots qui couvrent l'essentiel de ce qu'on peut détenir dans un portefeuille. Définitions, différences, rôles, à quoi sert chacun selon votre horizon.",
  intro:
    "Avant de parler stratégie, on parle briques. Action, obligation, ETF : trois objets distincts, trois rôles différents dans un portefeuille. Une fois ces trois mots clairs, vous pouvez lire la composition de n'importe quel produit financier en deux minutes.",
  sections: [
    {
      heading: "Action : une part d'entreprise cotée",
      paragraphs: [
        "Une action est une fraction de propriété d'une entreprise cotée en bourse. En détenir vous donne droit à une part des bénéfices distribués (dividendes) et à un vote en assemblée générale, à raison d'une voix par action.",
        "L'action monte si l'entreprise se valorise — bénéfices en hausse, perspectives positives, ou simplement engouement de marché. Elle baisse dans les cas inverses. Pas de garantie, pas d'échéance : on peut conserver une action toute sa vie ou la vendre demain.",
        "Historiquement, sur 100 ans, les actions sont la classe d'actifs qui rapporte le plus à long terme (~7 % réel par an), mais avec une volatilité importante. Sur 1 an, on peut perdre 40 %. Sur 20 ans, c'est statistiquement très improbable.",
      ],
      callout:
        "Détenir une action, ce n'est pas spéculer : c'est devenir copropriétaire d'une entreprise réelle qui emploie, vend, investit. On peut tout à fait conserver des actions pendant 30 ans sans jamais regarder leur cours.",
    },
    {
      heading: "Obligation : un prêt à durée déterminée",
      paragraphs: [
        "Une obligation est un prêt que vous accordez à une entreprise ou à un État. Vous prêtez 1 000 €, on s'engage à vous rembourser 1 000 € dans X années, et entre-temps on vous verse un coupon annuel (par exemple 3 %).",
        "Moins volatile qu'une action, mais pas sans risque. Si l'émetteur fait défaut (incapable de rembourser), vous pouvez perdre tout ou partie. Les obligations d'États solides (Allemagne, États-Unis) sont historiquement les actifs les plus stables. Les obligations d'entreprises fragiles (« high yield ») peuvent défaillir.",
        "Surprise pour beaucoup : la valeur d'une obligation peut aussi baisser avant son échéance, si les taux d'intérêt montent. C'est ce qui s'est passé en 2022 : les fonds obligataires ont perdu 10 à 20 %, du jamais-vu en 40 ans.",
      ],
    },
    {
      heading: "ETF : un panier coté en continu",
      paragraphs: [
        "Un ETF (Exchange Traded Fund) est un panier d'actifs qui suit un indice. L'ETF MSCI World contient environ 1 500 actions des pays développés. En acheter une part, c'est acheter une mini-tranche des 1 500.",
        "Avantages : diversification instantanée, frais très bas (souvent < 0,3 % par an contre 2 % pour un fonds classique), liquidité quotidienne en bourse. C'est devenu le véhicule par défaut pour la plupart des investisseurs particuliers depuis 15 ans.",
        "Un ETF n'est pas un produit magique : c'est juste un panier transparent. Sa performance reflète celle de l'indice qu'il suit. Si l'indice baisse de 20 %, l'ETF baisse de 20 %. La diversification protège du risque spécifique, pas du risque de marché.",
      ],
      callout:
        "ETF ≠ fonds magique. Un ETF qui suit un mauvais indice (par exemple un indice ultra-concentré sur 5 titres) reste un mauvais investissement. Toujours regarder ce qu'il y a dedans avant d'acheter.",
    },
    {
      heading: "Trois variantes utiles à connaître",
      paragraphs: [
        "ETF capitalisant vs distribuant : le premier réinvestit automatiquement les dividendes dans le fonds (idéal pour faire jouer les intérêts composés), le second les verse en cash sur votre compte (utile à la retraite pour générer un revenu).",
        "ETF physique vs synthétique : le physique détient réellement les titres de l'indice. Le synthétique reproduit la performance via un swap avec une banque. Le physique est plus transparent et préféré par défaut, sauf cas particulier (PEA + indices US).",
        "ETF à effet de levier (×2, ×3) ou inversés : à éviter pour 99 % des investisseurs. Conçus pour du trading court terme, ils perdent mécaniquement de la valeur en marché latéral volatil. Pas adaptés au long terme.",
      ],
    },
    {
      heading: "Quel mélange pour quel objectif",
      paragraphs: [
        "Horizon long (15 ans et plus) et tolérance au risque : davantage d'actions ou d'ETF actions. Le temps long lisse la volatilité.",
        "Horizon court (< 3 ans) ou aversion au risque : davantage d'obligations et liquidités. La priorité devient la préservation du capital, pas le rendement maximal.",
        "Une règle ancienne mais utile : avoir en obligations un pourcentage proche de son âge. À 30 ans, 70 % actions / 30 % obligations. À 60 ans, l'inverse. C'est un repère, pas une loi — à moduler selon les revenus, le patrimoine et la psychologie.",
      ],
    },
    {
      heading: "Cas pratique : trois portefeuilles type",
      paragraphs: [
        "Portefeuille dynamique (horizon 20 ans, jeune investisseur) : 80 % ETF actions monde, 10 % ETF obligations, 10 % liquidités. Rendement attendu ~6-7 % net, volatilité élevée.",
        "Portefeuille équilibré (horizon 8-15 ans, milieu de carrière) : 50 % ETF actions, 35 % ETF obligations diversifié, 15 % liquidités ou fonds euros. Rendement attendu ~4-5 %, volatilité modérée.",
        "Portefeuille prudent (horizon < 5 ans ou pré-retraite) : 25 % ETF actions, 50 % obligations courtes, 25 % liquidités. Rendement attendu ~2-3 %, volatilité faible.",
      ],
    },
    {
      heading: "Erreurs fréquentes",
      paragraphs: [
        "1. Croire qu'obligation = sans risque. Faux : risque de défaut + risque de taux.",
        "2. Acheter un ETF sans regarder l'indice sous-jacent — l'étiquette « ETF » ne suffit pas.",
        "3. Empiler les ETF qui se recouvrent (MSCI World + S&P 500 + Nasdaq = 80 % de redondance).",
        "4. Confondre actions individuelles et ETF actions — risque très différent, fiscalité parfois différente, suivi différent.",
        "5. Choisir un ETF à effet de levier en pensant qu'il « rapporte plus » à long terme. Il ne rapporte pas, il décroît.",
      ],
    },
  ],
  keyTakeaways: [
    "Action = part d'entreprise, volatile, sans échéance, rendement long terme élevé.",
    "Obligation = prêt avec échéance, moins volatile mais ni sans risque ni sans variation.",
    "ETF = panier coté, diversification + frais bas, devenu le standard particulier.",
    "Capitalisant pour les intérêts composés, distribuant pour générer un revenu.",
    "Mélange actions/obligations dépend d'horizon et tolérance au risque.",
    "Règle de pouce : % obligations ≈ âge. À ajuster selon profil.",
    "Éviter ETF à effet de levier en long terme : décroissance mécanique.",
  ],
  quiz: [
    {
      question: "Une obligation, c'est…",
      options: [
        "Une part d'entreprise.",
        "Un prêt à durée déterminée avec coupon.",
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
      question: "Pourquoi les fonds obligataires ont-ils perdu en 2022 ?",
      options: [
        "Défauts massifs d'États.",
        "Remontée brutale des taux d'intérêt.",
        "Sanctions internationales.",
        "Bug technique.",
      ],
      correctIndex: 1,
      explanation:
        "Quand les taux montent, la valeur des obligations existantes baisse. 2022 a été un mouvement historique.",
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
    {
      question: "ETF capitalisant signifie…",
      options: [
        "Garanti par l'État.",
        "Les dividendes sont réinvestis automatiquement.",
        "Bloqué pendant 5 ans.",
        "Réservé aux entreprises capitalistes.",
      ],
      correctIndex: 1,
      explanation:
        "Capitalisant = dividendes réinvestis. Idéal pour les intérêts composés sur long terme.",
    },
  ],
};
