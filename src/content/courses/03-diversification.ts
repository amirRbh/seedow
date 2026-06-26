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
    "C'est le seul « free lunch » de la finance, disait l'économiste Harry Markowitz. La diversification permet de réduire le risque global d'un portefeuille sans diminuer son espérance de rendement. Voici comment elle fonctionne, et pourquoi la plupart des débutants la sous-estiment.",
  sections: [
    {
      heading: "Pourquoi un seul titre est dangereux",
      paragraphs: [
        "Sur 30 ans, environ 40 % des actions individuelles de l'indice américain S&P 500 ont sous-performé un simple bon du Trésor. La majorité de la performance vient d'une minorité de titres. Si vous n'avez pas ces titres-là, vous perdez face au marché.",
        "Pire : la moitié des actions individuelles ont connu un drawdown de plus de 80 % au cours de leur histoire. Une seule mauvaise nouvelle (fraude, scandale, faillite) peut anéantir une position concentrée.",
        "Le cas Enron, Nokia, Vivendi, Wirecard : des entreprises de premier plan qui ont perdu plus de 95 % de leur valeur en quelques mois. Concentrer son patrimoine sur un titre individuel relève de la spéculation, pas de l'investissement.",
      ],
      callout:
        "La performance des marchés est portée par une minorité de titres. Pas les avoir, c'est sous-performer. Tous les avoir, c'est faire la moyenne. La diversification résout ce dilemme.",
    },
    {
      heading: "Comment ça marche mathématiquement",
      paragraphs: [
        "Imaginez deux actifs qui rapportent en moyenne 7 % par an chacun, mais dont les variations ne sont pas synchronisées. Quand l'un baisse, l'autre monte (ou ne bouge pas). En combinant les deux, le rendement moyen reste à 7 %, mais la volatilité chute.",
        "C'est l'idée de Markowitz, prix Nobel d'économie 1990 : à rendement attendu équivalent, un portefeuille diversifié a un risque inférieur. Ou, dit autrement : à risque équivalent, il offre un meilleur rendement attendu.",
        "Le mécanisme repose sur la corrélation. Deux actifs parfaitement corrélés (corrélation = 1) ne diversifient rien. Deux actifs non corrélés (corrélation proche de 0) se complètent. Deux actifs anti-corrélés (corrélation négative) sont l'idéal — rare en pratique.",
      ],
    },
    {
      heading: "Diversifier sur trois axes",
      paragraphs: [
        "1. Géographique : ne pas tout miser sur un seul pays. La France, c'est 3 % du PIB mondial — mais souvent 70 % des portefeuilles français. C'est ce qu'on appelle le « biais domestique ».",
        "2. Sectoriel : tech, santé, finance, énergie, consommation, industrie. Chaque cycle économique favorise certains secteurs et en pénalise d'autres. Posséder l'ensemble lisse l'expérience.",
        "3. Classe d'actifs : actions, obligations, immobilier, liquidités. Les obligations baissent rarement quand les actions chutent (sauf en 2022, exception notable). Les ajouter stabilise un portefeuille.",
      ],
      callout:
        "Acheter 10 actions du même secteur (par exemple : Apple, Microsoft, Google, Meta, Amazon, Nvidia, AMD, Salesforce, Adobe, Oracle) n'est pas de la diversification. C'est de la concentration tech avec 10 étiquettes différentes.",
    },
    {
      heading: "Combien de lignes faut-il pour être diversifié ?",
      paragraphs: [
        "Recherche académique classique : au-delà de 20 à 30 actions soigneusement choisies sur des secteurs et géographies variés, le bénéfice marginal de diversification devient faible. C'est la « diversification efficace ».",
        "Dans la pratique pour un particulier, sélectionner et suivre 25 titres demande un travail considérable. La solution simple : un ETF mondial diversifié (type MSCI World ou ACWI) couvre 1 500 à 3 000 entreprises sur 23 à 47 pays, pour 0,2 % à 0,4 % de frais annuels.",
        "Un seul ETF mondial est plus diversifié que 95 % des portefeuilles construits ligne à ligne par des particuliers. Pour la plupart des débutants, c'est le point de départ rationnel.",
      ],
    },
    {
      heading: "Les limites de la diversification",
      paragraphs: [
        "La diversification ne protège pas contre le risque de marché global (le « risque systématique »). En 2008, en mars 2020 ou en 2022, presque tout a baissé en même temps. Un ETF mondial a baissé comme le reste.",
        "Elle ne protège pas non plus contre l'inflation prolongée si toutes vos lignes sont sensibles aux taux d'intérêt. C'est pour ça qu'on ajoute parfois de l'or, des matières premières ou de l'immobilier.",
        "Enfin, sur-diversifier (posséder 5 ETF qui font tous la même chose) n'apporte rien. La diversification utile combine des expositions vraiment différentes, pas des étiquettes différentes.",
      ],
    },
    {
      heading: "Cas pratique : Tom restructure ses 30 000 €",
      paragraphs: [
        "Tom détient 30 000 € répartis sur 4 actions du CAC 40 : TotalEnergies, LVMH, Sanofi, BNP. Il pense être diversifié — 4 lignes, 4 secteurs. En réalité, il est 100 % France, 100 % grandes capitalisations européennes.",
        "Restructuration cohérente : 60 % sur un ETF MSCI World (≈ 1 500 entreprises de 23 pays développés), 10 % sur un ETF émergents, 20 % sur un ETF obligations gouvernementales euro, 10 % conservés en liquidités pour saisir les opportunités.",
        "Résultat : volatilité réduite d'environ un tiers à rendement attendu équivalent, et exposition mondiale sur ~2 000 entreprises au lieu de 4. Les frais annuels passent de 0 € (mais immobilisme) à environ 30 € par an, dérisoire face au gain en robustesse.",
      ],
    },
    {
      heading: "Erreurs classiques",
      paragraphs: [
        "1. Confondre « beaucoup de lignes » et « beaucoup de diversification ». 10 actions tech ≠ portefeuille diversifié.",
        "2. Tout placer sur les actions de son employeur — concentration absolue : si l'entreprise va mal, on perd son salaire ET son patrimoine en même temps.",
        "3. Biais domestique : surpondérer son propre pays par confort. Statistiquement injustifié.",
        "4. Empiler des ETF redondants (3 ETF S&P 500 chez 3 émetteurs différents).",
        "5. Croire qu'on est diversifié parce qu'on possède un fonds — encore faut-il regarder ce qu'il contient.",
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
