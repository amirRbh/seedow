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
    "Avant la stratégie, les briques. Action, obligation, ETF : trois objets, trois rôles différents. Une fois ces trois mots clairs, tu peux lire la composition de n'importe quel produit financier en deux minutes.",
  eli5: "Trois façons de participer à l'économie. Une action, c'est un petit bout de boulangerie : si elle vend plus de pains, tu gagnes. Une obligation, c'est un prêt à la boulangerie : elle te rend l'argent + un petit extra à date fixe. Un ETF, c'est un panier qui contient un morceau de 1 500 boulangeries différentes en même temps — si une brûle, les autres compensent.",
  sections: [
    {
      heading: "Action : un petit bout d'entreprise",
      paragraphs: [
        "Une action, c'est une fraction de propriété d'une entreprise cotée. En détenir te donne droit à une part des bénéfices (dividendes) et à un vote en assemblée générale.",
        "L'action monte si l'entreprise se porte bien (bénéfices, perspectives, enthousiasme du marché). Elle baisse dans les cas inverses. Pas de garantie, pas d'échéance : tu peux la garder toute ta vie ou la vendre demain.",
        "Historiquement, sur 100 ans, les actions rapportent le plus à long terme (~7 % réel par an), mais ça secoue. Sur 1 an, on peut perdre 40 %. Sur 20 ans, statistiquement très improbable.",
      ],
      callout:
        "Détenir une action, ce n'est pas spéculer : c'est devenir copropriétaire d'une entreprise qui vend, embauche, investit. On peut très bien garder des actions 30 ans sans jamais regarder leur cours.",
    },
    {
      heading: "Obligation : un prêt avec date de remboursement",
      paragraphs: [
        "Une obligation, c'est un prêt que tu fais à une entreprise ou un État. Tu prêtes 1 000 €, on s'engage à te rendre 1 000 € dans X années, et entre-temps on te verse un coupon (par exemple 3 %/an).",
        "Moins agitée qu'une action, mais pas sans risque. Si l'emprunteur ne peut plus rembourser, tu peux perdre tout ou partie. Les obligations d'États solides (Allemagne, États-Unis) sont historiquement les actifs les plus stables.",
        "Surprise : la valeur d'une obligation peut aussi baisser avant l'échéance, si les taux d'intérêt du marché montent. C'est ce qui s'est passé en 2022 : les fonds obligataires ont perdu 10 à 20 %, du jamais-vu en 40 ans.",
      ],
    },
    {
      heading: "ETF : un panier coté en bourse",
      paragraphs: [
        "ETF = Exchange Traded Fund. Un panier qui suit un indice. L'ETF MSCI World contient environ 1 500 actions des pays développés. En acheter une part, c'est acheter une mini-tranche des 1 500.",
        "Avantages : diversification instantanée, frais très bas (souvent < 0,3 %/an vs 2 % pour un fonds classique), on l'achète comme une action en bourse. Devenu le véhicule par défaut des particuliers depuis 15 ans.",
        "Ce n'est pas un produit magique : c'est un panier transparent. Si l'indice baisse de 20 %, l'ETF baisse de 20 %. La diversification protège du risque spécifique, pas du risque de marché.",
      ],
      callout:
        "ETF ≠ fonds magique. Un ETF qui suit un mauvais indice (ex : ultra-concentré sur 5 titres) reste un mauvais investissement. Toujours regarder ce qu'il y a dedans avant d'acheter.",
    },
    {
      heading: "Trois variantes utiles à connaître",
      paragraphs: [
        "ETF capitalisant vs distribuant : le capitalisant réinvestit tes dividendes automatiquement (parfait pour la boule de neige). Le distribuant te les verse en cash (utile à la retraite pour un revenu).",
        "ETF physique vs synthétique : le physique détient réellement les titres. Le synthétique reproduit la performance via un contrat avec une banque. Le physique est plus transparent et préféré par défaut, sauf cas particulier (PEA + indices US).",
        "ETF à effet de levier (×2, ×3) ou inversés : à éviter pour 99 % des investisseurs. Conçus pour du trading court terme, ils perdent mécaniquement de la valeur en marché volatil. Pas adaptés au long terme.",
      ],
    },
    {
      heading: "Quel mélange pour quel objectif",
      paragraphs: [
        "Horizon long (15 ans et plus) et tolérance au risque : davantage d'actions / ETF actions. Le temps long lisse la volatilité.",
        "Horizon court (< 3 ans) ou peu de tolérance : davantage d'obligations et liquidités. Priorité à la préservation, pas au rendement.",
        "Règle ancienne mais utile : garder en obligations un pourcentage proche de son âge. À 30 ans, 70 % actions / 30 % obligations. À 60 ans, l'inverse. C'est un repère, pas une loi.",
      ],
    },
    {
      heading: "Cas pratique : trois portefeuilles type",
      paragraphs: [
        "Dynamique (jeune, 20 ans d'horizon) : 80 % ETF actions monde, 10 % ETF obligations, 10 % liquidités. Rendement attendu ~6-7 % net, volatilité élevée.",
        "Équilibré (milieu de carrière, 8-15 ans) : 50 % ETF actions, 35 % ETF obligations, 15 % liquidités ou fonds euros. Rendement attendu ~4-5 %, volatilité modérée.",
        "Prudent (< 5 ans ou pré-retraite) : 25 % ETF actions, 50 % obligations courtes, 25 % liquidités. Rendement attendu ~2-3 %, volatilité faible.",
      ],
    },
    {
      heading: "Erreurs fréquentes",
      paragraphs: [
        "1. Croire qu'obligation = sans risque. Faux : risque de défaut + risque de taux.",
        "2. Acheter un ETF sans regarder l'indice sous-jacent — l'étiquette ETF ne suffit pas.",
        "3. Empiler des ETF qui se recouvrent (MSCI World + S&P 500 + Nasdaq = 80 % de redondance).",
        "4. Confondre actions individuelles et ETF actions — risques et fiscalités très différents.",
        "5. Choisir un ETF à levier en pensant qu'il « rapporte plus » à long terme. Il décroît.",
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
  advanced: [
    "Duration d'une obligation ≈ sensibilité à un mouvement de +1 % des taux : duration 7 → -7 % de prix pour +1 % de taux.",
    "Rendement obligataire = coupon + variation de prix ; les deux composantes s'opposent quand les taux bougent.",
    "Réplication ETF physique complète, échantillonnée ou optimisée : la méthode affecte la tracking error (typiquement < 0,10 % sur mainstream).",
    "ETF synthétique via swap total return : contrepartie plafonnée à 10 % de l'actif (UCITS), collatéral posté quotidiennement.",
    "Décroissance des ETF leveraged : compounding path-dependent, perte structurelle en marché sideways volatile — inadapté buy-and-hold.",
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
