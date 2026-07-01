import type { Course } from "./types";

export const course: Course = {
  slug: "cinq-mots-avant-investir",
  number: 1,
  track: "finance",
  level: "debutant",
  isFree: true,
  readingMinutes: 11,
  title: "Les 5 mots à connaître avant d'investir",
  eyebrow: "Bases · Vocabulaire",
  description:
    "Rendement, risque, volatilité, horizon, liquidité : cinq mots que tout investisseur débutant rencontre dès la première page. Définitions courtes, exemples chiffrés, pièges classiques.",
  intro:
    "Investir, ce n'est pas compliqué — c'est mal expliqué. On pose cinq mots. Une fois ces cinq mots clairs, 80 % des conversations financières deviennent lisibles, et on cesse de signer des produits qu'on ne comprend pas.",
  eli5:
    "Imagine que tu prêtes ta trottinette à un copain. Combien il te rend en plus ? (rendement). Est-ce qu'il peut la casser ? (risque). Est-ce qu'elle roule un peu à droite un peu à gauche ? (volatilité). Pour combien de temps tu la prêtes ? (horizon). Peux-tu la récupérer vite ? (liquidité). Voilà, tu sais tout.",
  sections: [
    {
      heading: "Rendement : ce que ton argent te rapporte en plus",
      paragraphs: [
        "Le rendement, c'est le « en plus » que tu récupères. Tu poses 100 € sur un livret à 3 % : au bout d'un an, tu as 103 €. Les 3 € en plus, c'est le rendement.",
        "Piège classique : le chiffre affiché est presque toujours « brut » (avant frais et impôts). Un fonds affiché à 6 % peut te rapporter 4 % dans la vraie vie. Toujours demander : c'est brut ou net ?",
        "Autre piège : « + 60 % sur 10 ans » sonne mieux que « + 4,8 % par an », mais c'est exactement la même chose. Un chiffre sans durée = un chiffre marketing.",
      ],
      callout:
        "Un rendement sans durée et sans « net de quoi » ne veut rien dire. Toujours poser deux questions : sur combien de temps, et après quels frais.",
    },
    {
      heading: "Risque : le prix à payer pour espérer plus",
      paragraphs: [
        "Le risque, c'est la possibilité de récupérer moins que ce que tu as mis. Un livret n'a presque aucun risque. Une action peut baisser de 30 %. C'est le deal : plus tu acceptes de voir ton argent bouger, plus il peut rapporter à long terme.",
        "Vue autrement : sans un peu de risque, ton argent rapporte à peine plus que l'inflation. Historiquement, sur 100 ans, tout le « bonus » vient d'avoir accepté de voir son capital fluctuer.",
        "La vraie question n'est donc pas « comment éviter le risque » mais « combien puis-je voir mon argent baisser sans paniquer ? ». Si la réponse est « rien », on reste sur des livrets — et on accepte de ne pas battre l'inflation.",
      ],
    },
    {
      heading: "Volatilité : la hauteur des vagues, pas la marée",
      paragraphs: [
        "La volatilité, c'est l'amplitude des mouvements. Imagine deux bateaux : l'un tangue beaucoup, l'autre glisse tranquille. Les deux avancent — mais le premier fait plus peur à bord.",
        "Un livret a une volatilité nulle. Une action peut prendre 5 % un jour et en perdre 4 % le lendemain. Ça bouge fort mais ça n'a rien d'anormal.",
        "Point important : volatilité ≠ perte définitive. Sur un indice mondial (l'ensemble des grandes entreprises), on perd sur 1 an environ 1 fois sur 4. Sur 15 ans, presque jamais. Plus l'horizon est long, plus les vagues se lissent.",
      ],
      callout:
        "Un produit « peu volatil » n'est pas forcément « peu risqué ». Une obligation d'entreprise fragile bouge peu — jusqu'au jour où l'émetteur ne rembourse pas.",
    },
    {
      heading: "Horizon : dans combien de temps tu auras besoin de cet argent",
      paragraphs: [
        "L'horizon, c'est la durée pendant laquelle tu peux laisser ton argent tranquille. Court (< 3 ans), moyen (3 à 8 ans), long (8 ans et plus).",
        "Règle simple : plus c'est long, plus tu peux accepter de volatilité, parce que tu as le temps d'attendre une remontée. Placer en actions un argent que tu utiliseras dans 6 mois est l'erreur la plus courante des débutants.",
        "Bon réflexe : ranger son épargne par tiroirs. Le tiroir « 6 mois » sur un livret. Le tiroir « 4 ans » sur un fonds prudent. Le tiroir « 15 ans » peut aller en actions. Chaque tiroir a sa logique.",
      ],
    },
    {
      heading: "Liquidité : à quelle vitesse tu peux récupérer ton argent",
      paragraphs: [
        "La liquidité, c'est la facilité à retirer son argent. Un livret : 1 clic, 24 h. Une assurance-vie : quelques semaines. Un appartement en location : plusieurs mois et des frais.",
        "Manquer de liquidité, ce n'est pas grave si l'horizon est cohérent. Ça devient grave quand un imprévu (chômage, santé, séparation) t'oblige à vendre au pire moment, souvent avec une décote.",
        "Règle minimale : garder 3 à 6 mois de dépenses sur un support 100 % liquide (livret) avant d'investir sur des supports moins accessibles. C'est ce qu'on appelle l'épargne de précaution.",
      ],
      callout:
        "Crypto et SCPI (parts d'immobilier) ont un point commun : en période de stress, tout le monde veut sortir en même temps, les prix chutent et les retraits sont parfois gelés. Pas la peine d'y mettre son épargne de précaution.",
    },
    {
      heading: "Cas pratique : Léa, 28 ans, 15 000 € qui dorment",
      paragraphs: [
        "Léa a 15 000 € sur son compte courant. Pas de projet précis. Étape 1 : trier par horizon.",
        "5 000 € sur un livret (précaution, 3 mois de dépenses). 4 000 € sur un fonds prudent en assurance-vie pour un projet à 4-5 ans. 6 000 € sur un ETF mondial diversifié (horizon 10 ans et plus).",
        "Léa accepte que les 6 000 € puissent valoir 4 500 € dans deux ans en cas de baisse, parce qu'elle sait qu'elle n'y touchera pas. Sur 15 ans, cette poche vaudra statistiquement entre 12 000 € et 18 000 €.",
      ],
    },
    {
      heading: "Cinq erreurs classiques",
      paragraphs: [
        "1. Comparer un rendement brut à un rendement net — comme comparer un salaire brut à un salaire net.",
        "2. Confondre « ça bouge en ce moment » et « j'ai perdu pour toujours ». Vendre en panique après -20 % transforme une vague en perte définitive.",
        "3. Investir long terme un argent dont on aura besoin dans 6 mois. La pire combinaison.",
        "4. Sous-estimer les frais. 2 % par an semblent peu, c'est environ un tiers du rendement long terme des actions.",
        "5. Tout mettre sur le produit « miracle » de l'année. Ce qui a fait +40 % l'an dernier fait souvent -30 % l'année suivante.",
      ],
    },
  ],
  keyTakeaways: [
    "Rendement sans horizon ni « net de quoi » = chiffre marketing.",
    "Le risque est le prix du rendement, pas son ennemi.",
    "Volatilité court terme ≠ perte définitive : le temps long lisse.",
    "L'horizon dicte la tolérance à la volatilité, pas l'inverse.",
    "Vérifier la liquidité avant d'engager une somme dont on peut avoir besoin.",
    "Segmenter son épargne par poche d'horizon avant tout choix de produit.",
    "Garder 3 à 6 mois de dépenses 100 % liquides avant d'investir long terme.",
  ],
  advanced: [
    "Rendement annualisé (moyenne géométrique) vs cumulé : un fonds « +60 % sur 10 ans » = 4,8 %/an, pas 6 %.",
    "Volatilité annualisée S&P 500 ~15-18 %, ETF World ~15 %, fonds obligataire ~5 %, livret 0 %.",
    "Sur 1 an glissant, ~25 % des fenêtres d'un ETF World sont négatives ; sur 15 ans, historiquement < 5 %.",
    "Livret garanti par l'État jusqu'à 100 000 € par banque (garantie FGDR) ; au-delà, risque de contrepartie.",
    "Fonds monétaire = alternative au livret pour l'épargne courte, sensibilité aux taux directeurs BCE.",
  ],
  quiz: [
    {
      question: "Un fonds affiche « 7 % de rendement ». Quelle question poser en premier ?",
      options: [
        "Quelle est sa notation ESG ?",
        "Sur quelle période, et net de quels frais ?",
        "Qui est le gérant ?",
        "Quelle est la devise du fonds ?",
      ],
      correctIndex: 1,
      explanation:
        "Sans période ni mention 'net de frais et fiscalité', un rendement n'est pas comparable. C'est l'argument numéro un à exiger.",
    },
    {
      question: "Volatilité forte signifie nécessairement…",
      options: [
        "Que je vais perdre de l'argent.",
        "Que l'actif varie beaucoup à court terme.",
        "Que l'actif est mal géré.",
        "Que l'actif est interdit aux particuliers.",
      ],
      correctIndex: 1,
      explanation:
        "La volatilité mesure l'amplitude des variations, pas la perte finale. Un actif volatil sur 1 an peut très bien gagner sur 10 ans.",
    },
    {
      question: "Pour de l'argent dont vous aurez besoin dans 6 mois, quel placement est cohérent ?",
      options: [
        "Un ETF actions monde.",
        "Un fonds immobilier non coté.",
        "Un livret ou un fonds monétaire.",
        "Une action individuelle.",
      ],
      correctIndex: 2,
      explanation:
        "Horizon court = priorité à la liquidité et à la stabilité, pas au rendement maximal. Livret ou monétaire couvrent ce besoin.",
    },
    {
      question: "« Sans risque, pas de rendement supérieur à l'inflation. » Cette phrase est…",
      options: [
        "Fausse, certains placements sans risque battent l'inflation.",
        "Vraie à long terme, le risque rémunère.",
        "Vraie uniquement aux États-Unis.",
        "Inventée par les banques pour vendre des fonds.",
      ],
      correctIndex: 1,
      explanation:
        "Empiriquement, sur plusieurs décennies, les placements sans risque rapportent proche de l'inflation. Le supplément vient du risque accepté.",
    },
    {
      question: "Combien de mois de dépenses garder en épargne de précaution avant d'investir ?",
      options: ["1 mois", "3 à 6 mois", "12 à 24 mois", "Aucun, tout investir tout de suite"],
      correctIndex: 1,
      explanation:
        "3 à 6 mois est le standard. Moins, c'est risqué en cas d'imprévu. Plus, c'est de l'argent qui dort et perd contre l'inflation.",
    },
    {
      question: "Un ETF mondial peut historiquement perdre de l'argent sur quel horizon ?",
      options: [
        "Jamais, peu importe l'horizon.",
        "Sur 1 an, c'est arrivé environ 1 année sur 4.",
        "Uniquement en cas de guerre mondiale.",
        "Seulement si on choisit le mauvais gérant.",
      ],
      correctIndex: 1,
      explanation:
        "Sur 1 an glissant, ~25 % des fenêtres historiques sont négatives. Sur 15 ans, c'est devenu rarissime. D'où l'importance de l'horizon.",
    },
  ],
};
