import type { Course } from "./types";

export const course: Course = {
  slug: "risque-volatilite-drawdown",
  number: 5,
  track: "finance",
  level: "intermediaire",
  isFree: false,
  readingMinutes: 12,
  title: "Risque & volatilité : lire un drawdown sans paniquer",
  eyebrow: "Avancé · Gestion du risque",
  description:
    "Drawdown, volatilité, max perte historique, ratio de Sharpe : comprendre les indicateurs de risque pour ne pas vendre au pire moment.",
  intro:
    "La principale cause de mauvaise performance n'est pas le mauvais choix de produit. C'est la vente en panique au creux d'une baisse. Ce cours pose les concepts qui permettent de tenir psychologiquement quand le portefeuille affiche -25 %.",
  sections: [
    {
      heading: "Volatilité : la mesure mathématique de l'agitation",
      paragraphs: [
        "La volatilité s'exprime généralement en pourcentage annualisé. Le S&P 500 a une volatilité historique d'environ 15-18 % par an. Cela signifie qu'environ 68 % du temps, sa performance annuelle se situe entre -11 % et +25 % (autour d'une moyenne de ~7 %).",
        "Plus la volatilité est élevée, plus le « bruit » court terme est fort. Une action individuelle peut avoir 40 % de volatilité ; un ETF actions monde ≈ 15 % ; un fonds obligataire ≈ 5 % ; un livret 0 %.",
        "La volatilité est symétrique : elle compte autant les hausses que les baisses. Un actif qui fait +30 % puis -25 % apparaît très volatil dans les chiffres, alors qu'il a globalement progressé.",
      ],
    },
    {
      heading: "Drawdown : la mesure psychologique qui compte vraiment",
      paragraphs: [
        "Le drawdown, c'est l'écart entre un plus haut atteint et le creux qui suit. Si votre portefeuille passe de 100 000 € à 70 000 € avant de remonter, le drawdown est de -30 %. C'est ce chiffre qui détermine si vous allez tenir psychologiquement, ou paniquer et vendre.",
        "Quelques drawdowns historiques d'un ETF actions monde : -55 % (2008), -34 % (mars 2020), -25 % (2022). Ces baisses n'ont rien d'exceptionnel : elles font partie intégrante du jeu.",
        "La durée du drawdown compte autant que sa profondeur. Après 2008, il a fallu environ 5 ans pour retrouver les plus hauts. Après mars 2020, quelques mois. Après 2000 (bulle internet), 13 ans pour le Nasdaq. C'est ce qu'on appelle la « période de récupération ».",
      ],
      callout:
        "Un investisseur long terme doit accepter mentalement, AVANT d'investir, un drawdown maximum de -50 % sur la poche actions. Sinon, il vendra au pire moment et transformera la fluctuation en perte définitive.",
    },
    {
      heading: "Les biais psychologiques qui détruisent les rendements",
      paragraphs: [
        "Aversion à la perte (Kahneman & Tversky, prix Nobel) : la douleur de perdre 100 € est environ 2 fois plus intense que le plaisir de gagner 100 €. Ce biais pousse à vendre en baisse, exactement quand il ne faut pas.",
        "Effet de récence : on extrapole le présent à l'infini. En 2022, beaucoup ont vendu pensant « ça va continuer à baisser ». Les marchés ont rebondi de +25 % en 2023. Manquer une seule grosse journée de rebond peut coûter 1 à 2 % de rendement annualisé sur 10 ans.",
        "Sur-confiance : juste après une période de hausse, on se croit bon stockpicker. Juste après une baisse, on devient ultra-prudent. Les deux excès coûtent cher.",
      ],
    },
    {
      heading: "Risque ≠ volatilité",
      paragraphs: [
        "La volatilité est une mesure statistique de l'amplitude des variations. Le risque, c'est la probabilité de perdre durablement du capital ou de ne pas atteindre son objectif.",
        "Un livret a 0 % de volatilité, mais un risque réel de perdre du pouvoir d'achat face à l'inflation. Sur 30 ans à 1 % de rendement et 3 % d'inflation, on perd environ la moitié de son pouvoir d'achat. Risque maximal, volatilité nulle.",
        "Un ETF actions monde a 15 % de volatilité, mais sur 20 ans glissants, n'a jamais perdu d'argent dans toute l'histoire moderne. Volatilité élevée, risque réel faible à horizon long.",
      ],
      callout:
        "Confondre volatilité court terme et risque long terme est l'erreur intellectuelle la plus coûteuse pour un investisseur particulier. Le « sans risque » apparent du livret est un risque garanti.",
    },
    {
      heading: "Ratio de Sharpe : rendement par unité de risque",
      paragraphs: [
        "Le ratio de Sharpe mesure le rendement obtenu par unité de volatilité prise. Formule simplifiée : (rendement du fonds - taux sans risque) ÷ volatilité du fonds.",
        "Un ratio de Sharpe > 1 est généralement considéré comme bon, > 2 comme excellent (et rare). Les ETF actions diversifiés affichent historiquement entre 0,3 et 0,6. Les hedge funds prétendent souvent > 1, c'est souvent un artefact de mesure.",
        "Utile pour comparer deux produits qui rapportent le même rendement mais avec des volatilités différentes. À rendement égal, on préfère le plus stable.",
      ],
    },
    {
      heading: "Cas pratique : Hugo et la baisse de 2022",
      paragraphs: [
        "Janvier 2022 : Hugo a 50 000 € sur un ETF MSCI World. Fin septembre 2022 : son portefeuille vaut 39 000 € (-22 %). Il panique, vend tout, met sur livret.",
        "Fin 2023, son portefeuille théorique (s'il avait tenu) aurait valu 51 000 €. Sur livret à 3 %, son capital réel : 40 200 €. Il a transformé une fluctuation en perte définitive de 11 000 €.",
        "Que faire à la place ? Continuer les versements programmés (qui achètent moins cher), ne pas regarder l'application boursière tous les jours, se rappeler que son horizon est de 20 ans, pas de 6 mois. La vraie décision se prend avant la baisse, pas pendant.",
      ],
    },
    {
      heading: "Trois règles pratiques pour tenir un drawdown",
      paragraphs: [
        "1. Définir son allocation cible avant d'investir, en écrivant noir sur blanc le drawdown maximum acceptable. Si la baisse historique du portefeuille est -40 %, en suis-je capable ?",
        "2. Automatiser les versements. Une fois programmé, on subit moins les biais émotionnels mois par mois.",
        "3. Limiter la fréquence de consultation à 1 fois par trimestre, voire moins. Plus on regarde, plus on agit. Plus on agit, moins on performe.",
      ],
    },
  ],
  keyTakeaways: [
    "Volatilité = amplitude statistique. Drawdown = baisse vécue depuis un plus haut.",
    "Un ETF actions peut connaître -50 % historiquement, c'est normal.",
    "L'aversion à la perte = douleur 2× plus forte que plaisir équivalent.",
    "Vendre en panique transforme une fluctuation en perte définitive.",
    "Volatilité ≠ risque : le livret a 0 % volatilité mais risque d'inflation garanti.",
    "Ratio de Sharpe = rendement par unité de risque, utile pour comparer.",
    "Automatiser ses versements et limiter la fréquence de consultation.",
  ],
  quiz: [
    {
      question: "Le drawdown mesure…",
      options: [
        "La performance annuelle.",
        "L'écart entre un plus haut et le creux qui suit.",
        "Les frais du fonds.",
        "Le taux d'inflation.",
      ],
      correctIndex: 1,
      explanation:
        "Drawdown = baisse maximale depuis un plus haut. Indicateur clé pour la tenue psychologique.",
    },
    {
      question: "Drawdown historique maximal d'un ETF actions monde sur 30 ans ?",
      options: ["-10 %", "-25 %", "-55 %", "-90 %"],
      correctIndex: 2,
      explanation: "≈ -55 % en 2008. Niveau à accepter mentalement avant d'investir en actions.",
    },
    {
      question: "Un livret à 1 % avec 3 % d'inflation présente…",
      options: [
        "Aucun risque.",
        "Un risque garanti de perte de pouvoir d'achat.",
        "Le meilleur ratio de Sharpe possible.",
        "Une fiscalité avantageuse.",
      ],
      correctIndex: 1,
      explanation:
        "Volatilité nulle ≠ absence de risque. L'inflation érode mécaniquement le pouvoir d'achat.",
    },
    {
      question: "L'aversion à la perte de Kahneman dit que…",
      options: [
        "On préfère ne jamais perdre.",
        "La douleur de perdre est ~2× plus forte que le plaisir équivalent.",
        "On gagne plus en bourse qu'au casino.",
        "Les femmes investissent mieux que les hommes.",
      ],
      correctIndex: 1,
      explanation:
        "Asymétrie psychologique fondamentale qui explique la majorité des ventes en panique.",
    },
    {
      question: "Ratio de Sharpe élevé signifie…",
      options: [
        "Beaucoup de frais.",
        "Bon rendement par unité de risque prise.",
        "Garantie de gain.",
        "Fonds réservé aux institutionnels.",
      ],
      correctIndex: 1,
      explanation:
        "Sharpe = (rendement - taux sans risque) / volatilité. Plus c'est élevé, mieux on est rémunéré pour le risque pris.",
    },
    {
      question: "Meilleur réflexe en plein drawdown si horizon = 20 ans ?",
      options: [
        "Tout vendre.",
        "Continuer ses versements programmés.",
        "Passer 100 % en or.",
        "Consulter le portefeuille chaque jour.",
      ],
      correctIndex: 1,
      explanation:
        "Les versements en baisse achètent moins cher et dopent le rendement final. C'est mécanique.",
    },
  ],
};
