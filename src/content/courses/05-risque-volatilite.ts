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
    "La principale cause de mauvaise performance n'est pas le mauvais choix de produit. C'est la vente en panique au creux d'une baisse. Ce cours pose les concepts qui permettent de tenir psychologiquement quand ton portefeuille affiche -25 %.",
  eli5: "Imagine un ascenseur qui monte du 0 au 100e étage sur 20 ans. En chemin, il descend parfois de 10 étages, parfois de 30, une fois de 50. Si tu descends à chaque baisse, tu ne remontes jamais. La volatilité, c'est l'à-coup de l'ascenseur. Le risque, c'est ne jamais arriver au 100e. Les deux ne sont pas la même chose.",
  sections: [
    {
      heading: "Volatilité : la mesure de l'agitation",
      paragraphs: [
        "La volatilité, c'est en gros la « moyenne des à-coups », exprimée en % par an. Le grand indice américain S&P 500 a une volatilité historique d'environ 15 à 18 %. Traduction : environ 68 % du temps, sa performance annuelle est entre -11 % et +25 % (autour d'une moyenne ~7 %).",
        "Plus la volatilité est élevée, plus le bruit court terme est fort. Action individuelle : ~40 %. ETF actions monde : ~15 %. Fonds obligataire : ~5 %. Livret : 0 %.",
        "Détail important : la volatilité compte les hausses comme les baisses. Un actif qui fait +30 % puis -25 % apparaît très volatil, alors qu'il a globalement progressé.",
      ],
    },
    {
      heading: "Drawdown : la baisse qu'on vit vraiment",
      paragraphs: [
        "Le drawdown, c'est l'écart entre un plus haut et le creux qui suit. Ton portefeuille passe de 100 000 € à 70 000 € avant de remonter : drawdown = -30 %. C'est ce chiffre-là qui décide si tu tiens ou si tu vends en panique.",
        "Drawdowns historiques d'un ETF actions monde : -55 % en 2008, -34 % en mars 2020, -25 % en 2022. Ces baisses ne sont pas exceptionnelles — elles font partie du jeu.",
        "La durée compte autant que la profondeur. Après 2008, il a fallu ~5 ans pour retrouver les plus hauts. Après mars 2020, quelques mois. Après la bulle internet (2000), 13 ans pour le Nasdaq. C'est la « période de récupération ».",
      ],
      callout:
        "Avant d'investir, accepte mentalement un drawdown maximum de -50 % sur ta poche actions. Sinon, tu vendras au pire moment et tu transformeras la vague en perte définitive.",
    },
    {
      heading: "Les biais psychologiques qui détruisent les rendements",
      paragraphs: [
        "Aversion à la perte (Kahneman & Tversky, Nobel) : la douleur de perdre 100 € est ~2 fois plus intense que le plaisir d'en gagner 100. Ce biais pousse à vendre en baisse, exactement quand il ne faut pas.",
        "Effet de récence : on croit que ce qui se passe maintenant va continuer pour toujours. En 2022, beaucoup ont vendu en pensant « ça va continuer à baisser ». Rebond de +25 % en 2023. Rater une seule grosse journée de rebond peut coûter 1 à 2 % de rendement annualisé sur 10 ans.",
        "Sur-confiance : après une hausse, on se croit malin. Après une baisse, on devient ultra-prudent. Les deux excès coûtent cher.",
      ],
    },
    {
      heading: "Risque ≠ volatilité",
      paragraphs: [
        "La volatilité mesure l'amplitude des variations. Le risque, c'est la probabilité de perdre pour de bon ou de rater son objectif.",
        "Un livret a 0 % de volatilité, mais un risque réel : perdre du pouvoir d'achat face à l'inflation. Sur 30 ans à 1 % de rendement et 3 % d'inflation, tu perds environ la moitié de ton pouvoir d'achat. Risque maximal, volatilité nulle.",
        "Un ETF actions monde a ~15 % de volatilité, mais sur 20 ans glissants, n'a jamais perdu d'argent dans l'histoire moderne. Volatilité élevée, risque long terme faible.",
      ],
      callout:
        "Confondre volatilité court terme et risque long terme est l'erreur la plus coûteuse pour un particulier. Le « sans risque » apparent du livret est un risque garanti face à l'inflation.",
    },
    {
      heading: "Ratio de Sharpe : rendement par unité de risque",
      paragraphs: [
        "Le ratio de Sharpe mesure ce que tu gagnes par unité de risque pris. Formule simplifiée : (rendement du fonds − taux sans risque) ÷ volatilité du fonds.",
        "Un Sharpe > 1 est considéré comme bon, > 2 comme excellent (et rare). Les ETF actions diversifiés affichent historiquement 0,3 à 0,6.",
        "Utile pour comparer deux produits qui rapportent le même rendement mais avec des volatilités différentes. À rendement égal, on préfère le plus stable.",
      ],
    },
    {
      heading: "Cas pratique : Hugo et la baisse de 2022",
      paragraphs: [
        "Janvier 2022 : Hugo a 50 000 € sur un ETF MSCI World. Fin septembre 2022 : 39 000 € (-22 %). Il panique, vend tout, met sur livret.",
        "Fin 2023, son portefeuille théorique (s'il avait tenu) aurait valu 51 000 €. Sur livret à 3 % : 40 200 €. Il a transformé une vague en perte définitive de 11 000 €.",
        "Que faire à la place ? Continuer les versements programmés (qui achètent moins cher), ne pas ouvrir l'appli boursière tous les jours, se rappeler que son horizon est de 20 ans, pas de 6 mois. La vraie décision se prend AVANT la baisse.",
      ],
    },
    {
      heading: "Trois règles pratiques pour tenir",
      paragraphs: [
        "1. Écrire noir sur blanc AVANT d'investir le drawdown maximum acceptable. Si la baisse historique du portefeuille est -40 %, en suis-je capable ?",
        "2. Automatiser les versements. Une fois programmé, tu subis moins les émotions.",
        "3. Consulter au maximum 1 fois par trimestre, voire moins. Plus on regarde, plus on agit. Plus on agit, moins on performe.",
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
  advanced: [
    "Volatilité annualisée = σ_quotidien × √252 (nombre de séances de bourse/an).",
    "VaR 95 % : perte maximale attendue avec 95 % de confiance sur un horizon ; complément fréquent au drawdown.",
    "Ratio de Sortino = variante du Sharpe qui ne pénalise que la volatilité à la baisse ; plus juste pour un investisseur asymétrique.",
    "Séquence de rendements : deux portefeuilles avec même moyenne mais ordre différent des rendements donnent des capitaux finaux très différents en phase de décumulation.",
    "Missing the best 10 days sur 20 ans sur le S&P 500 = ~50 % de performance en moins vs buy-and-hold (études JPM & Fidelity).",
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
