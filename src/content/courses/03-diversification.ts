import type { Course } from "./types";

export const course: Course = {
  slug: "diversification",
  number: 3,
  track: "finance",
  level: "debutant",
  isFree: false,
  readingMinutes: 11,
  title: "Diversification : ne pas mettre tous ses œufs dans le même panier",
  eyebrow: "Bases · Construction de portefeuille",
  description:
    "Pourquoi un seul titre peut détruire un portefeuille, et comment la diversification réduit le risque sans sacrifier (beaucoup) le rendement attendu.",
  intro:
    "C'est le seul « repas gratuit » de la finance, disait le prix Nobel Harry Markowitz. La diversification réduit le risque global d'un portefeuille sans réduire son rendement espéré. Voici comment, et pourquoi la plupart des débutants la sous-estiment.",
  eli5:
    "Imagine un panier de 10 œufs. Si tu trébuches, tous se cassent. Maintenant, imagine 10 petits paniers d'un œuf chacun. Si tu trébuches, tu ne casses qu'un œuf. C'est ça, la diversification : ne pas mettre tout son argent au même endroit, pour qu'un accident quelque part ne fasse pas tout écrouler.",
  sections: [
    {
      heading: "Pourquoi une seule action est dangereuse",
      paragraphs: [
        "Sur 30 ans, environ 40 % des actions individuelles du grand indice américain (S&P 500) ont fait moins bien qu'un simple bon d'État. Toute la performance vient d'une minorité de gagnants. Si tu ne les as pas, tu perds face au marché.",
        "Pire : la moitié des actions individuelles ont chuté de plus de 80 % au cours de leur histoire. Une seule mauvaise nouvelle (fraude, faillite, scandale) peut anéantir une position concentrée.",
        "Cas Enron, Nokia, Vivendi, Wirecard : des mastodontes qui ont perdu plus de 95 % en quelques mois. Concentrer son patrimoine sur un seul titre, c'est de la spéculation, pas de l'investissement.",
      ],
      callout:
        "Sur les marchés, une minorité de titres tire toute la performance. Ne pas les avoir = sous-performer. Tous les avoir = faire la moyenne. La diversification résout ce dilemme.",
    },
    {
      heading: "Comment ça marche, en pratique",
      paragraphs: [
        "Imagine deux actions qui rapportent en moyenne 7 % par an, mais qui ne bougent pas en même temps. Quand l'une baisse, l'autre monte (ou ne bouge pas). En combinant les deux, tu gardes 7 % de rendement moyen, mais tes hauts et bas sont moins violents.",
        "C'est l'idée de Markowitz (prix Nobel 1990) : à rendement égal, un portefeuille diversifié bouge moins. Ou : à volatilité égale, il rapporte plus.",
        "Le mot technique = « corrélation ». Deux actifs qui bougent pareil (corrélation 1) ne diversifient rien. Deux actifs indépendants (proche de 0) se complètent. Deux actifs qui bougent en sens inverse (corrélation négative) sont l'idéal — rare en vrai.",
      ],
    },
    {
      heading: "Diversifier sur trois axes",
      paragraphs: [
        "1. Géographie : ne pas tout miser sur un seul pays. La France pèse 3 % du PIB mondial — mais souvent 70 % des portefeuilles français. C'est le « biais domestique » : on aime ce qu'on connaît.",
        "2. Secteurs : tech, santé, finance, énergie, conso, industrie. Chaque cycle favorise certains, en pénalise d'autres. Les posséder tous lisse l'expérience.",
        "3. Classes d'actifs : actions, obligations, immobilier, liquidités. Les obligations baissent rarement en même temps que les actions (sauf 2022, exception notable).",
      ],
      callout:
        "Acheter 10 actions tech (Apple, Microsoft, Google, Meta, Amazon, Nvidia, AMD, Salesforce, Adobe, Oracle), ce n'est pas de la diversification. C'est de la concentration tech avec 10 étiquettes.",
    },
    {
      heading: "Combien de lignes pour être diversifié ?",
      paragraphs: [
        "Réponse académique : au-delà de 20 à 30 actions bien réparties, le bénéfice supplémentaire devient faible. C'est la « diversification efficace ».",
        "Dans la vraie vie, sélectionner et suivre 25 titres demande beaucoup de travail. La solution simple : un ETF mondial (type MSCI World ou ACWI) contient déjà 1 500 à 3 000 entreprises sur 23 à 47 pays, pour 0,2 à 0,4 % de frais annuels. Rappel : ETF = panier d'actions qui suit un indice.",
        "Un seul ETF mondial est plus diversifié que 95 % des portefeuilles construits ligne à ligne par des particuliers. C'est le point de départ rationnel pour la plupart des débutants.",
      ],
    },
    {
      heading: "Les limites de la diversification",
      paragraphs: [
        "Elle ne protège pas contre les baisses globales de marché (le « risque systématique »). En 2008, en mars 2020, en 2022 : presque tout a baissé en même temps. Un ETF mondial a baissé comme le reste.",
        "Elle ne protège pas non plus contre une inflation prolongée si toutes tes lignes sont sensibles aux taux. C'est pour ça qu'on ajoute parfois de l'or, des matières premières, de l'immobilier.",
        "Enfin, sur-diversifier (5 ETF qui font tous la même chose) n'apporte rien. La diversification utile combine des expositions vraiment différentes, pas des étiquettes différentes.",
      ],
    },
    {
      heading: "Cas pratique : Tom restructure ses 30 000 €",
      paragraphs: [
        "Tom détient 30 000 € sur 4 actions du CAC 40 : TotalEnergies, LVMH, Sanofi, BNP. Il se croit diversifié — 4 lignes, 4 secteurs. En réalité, il est 100 % France, 100 % grandes capitalisations européennes.",
        "Nouvelle version : 60 % ETF MSCI World (≈ 1 500 entreprises), 10 % ETF émergents, 20 % ETF obligations euro, 10 % en liquidités.",
        "Résultat : volatilité réduite d'un tiers à rendement attendu équivalent. Exposition sur ~2 000 entreprises au lieu de 4. Les frais annuels passent de 0 € (mais immobilisme) à ~30 €/an — dérisoire face au gain en robustesse.",
      ],
    },
    {
      heading: "Erreurs classiques",
      paragraphs: [
        "1. Confondre « beaucoup de lignes » et « beaucoup de diversification ». 10 actions tech ≠ portefeuille diversifié.",
        "2. Tout mettre sur les actions de son employeur — concentration absolue : si l'entreprise va mal, tu perds ton salaire ET ton patrimoine.",
        "3. Biais domestique : surpondérer son propre pays par confort. Statistiquement injustifié.",
        "4. Empiler des ETF redondants (3 ETF S&P 500 chez 3 émetteurs).",
        "5. Se croire diversifié parce qu'on possède « un fonds » — encore faut-il regarder ce qu'il y a dedans.",
      ],
    },
  ],
  keyTakeaways: [
    "Diversification = seul « free lunch » de la finance.",
    "40 % des actions individuelles sous-performent des bons du Trésor sur 30 ans.",
    "Diversifier sur 3 axes : géographie, secteur, classe d'actifs.",
    "20 à 30 titres bien choisis suffisent — ou un ETF mondial.",
    "Un ETF mondial = plus diversifié que 95 % des portefeuilles particuliers.",
    "La diversification ne protège pas du risque de marché global.",
    "Tenir les actions de son employeur en plus de son salaire = double exposition.",
  ],
  advanced: [
    "Variance d'un portefeuille : σ²p = Σ wi²σi² + Σ wiwjσiσjρij ; la corrélation ρij pèse autant que les variances individuelles.",
    "Risque spécifique diversifiable ~ 1/n, risque systématique irréductible : plafond à ~15-18 % de vol pour un portefeuille actions large.",
    "MSCI ACWI (World + émergents) : ~2 900 titres, 47 pays, TER ETF ~0,20 %.",
    "Corrélation actions/obligations historiquement négative (~-0,3), passée positive en 2022 avec le choc inflationniste.",
    "Frontière efficiente de Markowitz : lieu géométrique des portefeuilles de vol minimale à rendement donné ; base théorique du 60/40.",
  ],
  quiz: [
    {
      question: "Quel énoncé est correct sur la diversification ?",
      options: [
        "Elle élimine totalement le risque.",
        "Elle réduit le risque spécifique sans réduire l'espérance de rendement.",
        "Elle augmente le rendement et le risque en même temps.",
        "Elle ne fonctionne qu'avec plus de 100 actions.",
      ],
      correctIndex: 1,
      explanation:
        "Markowitz : la diversification réduit le risque spécifique (lié à un titre) sans toucher au rendement espéré.",
    },
    {
      question: "Posséder 10 actions tech américaines, c'est…",
      options: [
        "Bien diversifié.",
        "Concentré sur un secteur et une géographie.",
        "Une bonne couverture contre l'inflation.",
        "Mieux qu'un ETF.",
      ],
      correctIndex: 1,
      explanation:
        "Diversification utile = secteurs ET géographies différents. 10 lignes du même secteur restent une concentration.",
    },
    {
      question: "Combien d'actions environ permettent une diversification quasi-optimale ?",
      options: ["3 à 5", "20 à 30", "100", "500 minimum"],
      correctIndex: 1,
      explanation:
        "Au-delà de ~25 titres bien répartis, le bénéfice marginal de diversification devient faible.",
    },
    {
      question: "Un ETF MSCI World contient environ…",
      options: [
        "100 entreprises françaises.",
        "1 500 entreprises de 23 pays développés.",
        "Uniquement des entreprises ESG.",
        "Toutes les entreprises de la planète.",
      ],
      correctIndex: 1,
      explanation: "≈ 1 500 grandes et moyennes capitalisations des pays développés. C'est le standard.",
    },
    {
      question: "Risque systématique signifie…",
      options: [
        "Risque d'une seule entreprise.",
        "Risque de marché global, non éliminable par diversification.",
        "Risque lié à l'algorithme du gérant.",
        "Risque réservé aux pros.",
      ],
      correctIndex: 1,
      explanation:
        "Le risque systématique (= marché entier) n'est pas diversifiable. Seul le risque spécifique l'est.",
    },
    {
      question: "Pourquoi détenir massivement les actions de son employeur est dangereux ?",
      options: [
        "C'est interdit par la loi.",
        "Le salaire et le patrimoine sont exposés au même risque.",
        "Les frais sont plus élevés.",
        "Ça énerve les collègues.",
      ],
      correctIndex: 1,
      explanation:
        "Si l'entreprise va mal : perte de salaire + chute du patrimoine en même temps. Concentration maximale.",
    },
  ],
};
