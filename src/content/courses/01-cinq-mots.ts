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
    "Investir, ce n'est pas compliqué — c'est juste mal expliqué. Avant de cliquer sur quoi que ce soit, on pose cinq mots. Une fois ces cinq mots clairs, 80 % des conversations financières deviennent lisibles, et on cesse de signer des produits qu'on ne comprend pas. Ce cours pose un vocabulaire de base, en français, avec des exemples concrets en euros.",
  sections: [
    {
      heading: "Rendement : ce que rapporte vraiment un placement",
      paragraphs: [
        "Le rendement, c'est ce que rapporte un placement, exprimé en pourcentage du montant investi sur une période donnée. Un livret à 3 % rapporte 30 € pour 1 000 € sur un an. C'est l'indicateur le plus mis en avant — et donc le plus manipulé.",
        "Distinction utile et systématiquement masquée par le marketing : rendement brut (avant frais et fiscalité) versus rendement net. Les deux peuvent différer de 1 à 2 points par an. Sur 20 ans, c'est l'écart entre doubler son capital ou le multiplier par 1,4.",
        "Autre distinction : le rendement annualisé (moyenne géométrique sur plusieurs années) versus le rendement cumulé (gain total). Un fonds peut afficher « +60 % sur 10 ans » qui correspond à seulement 4,8 % par an — honorable, mais moins glamour que les chiffres en gras.",
      ],
      callout:
        "Un rendement affiché sans horizon, sans méthode de calcul et sans mention « net de quoi » ne veut rien dire. Toujours demander : sur combien de temps, et net de quels frais et de quelle fiscalité.",
    },
    {
      heading: "Risque : le prix à payer pour exister sur les marchés",
      paragraphs: [
        "Le risque est la probabilité de perdre une partie de son capital, ou de toucher un rendement très différent de celui attendu. Tout placement non garanti porte un risque — y compris un fonds étiqueté ESG, y compris un ETF mondial, y compris un livret au-delà des 100 000 € garantis par État.",
        "Le risque n'est pas l'ennemi du rendement, il en est le carburant. Historiquement, sur plus d'un siècle de données aux États-Unis et en Europe, les placements sans risque rapportent à peine plus que l'inflation. Tout le supplément vient du fait d'accepter de voir son capital fluctuer.",
        "La vraie question n'est donc pas « comment éviter le risque » mais « combien suis-je prêt à voir mon capital baisser temporairement sans paniquer ». Si la réponse est « 0 € », il faut rester sur des supports garantis et accepter un rendement proche de l'inflation.",
      ],
    },
    {
      heading: "Volatilité : l'amplitude des vagues, pas la marée",
      paragraphs: [
        "La volatilité mesure l'amplitude des variations d'un actif autour de sa moyenne. Une action très volatile peut prendre 5 % un jour et en perdre 4 % le lendemain. Un livret a une volatilité nulle. Les statisticiens la mesurent avec l'écart-type des rendements quotidiens ou mensuels.",
        "Volatilité ≠ risque de perte définitive. Un portefeuille diversifié et volatil sur 1 an peut être très stable sur 10 ans. Sur l'indice S&P 500, les chances de perdre de l'argent sont d'environ 25 % sur 1 an, mais tombent à moins de 5 % sur 15 ans, et zéro historiquement sur 20 ans.",
        "La volatilité fait peur ; le temps long la dilue. C'est la raison pour laquelle on ne place pas en actions l'argent dont on aura besoin dans 12 mois, mais qu'on peut le faire pour un projet à 15 ans.",
      ],
      callout:
        "Un produit « peu volatil » n'est pas forcément « peu risqué ». Certains fonds obligataires affichent une volatilité faible jusqu'au jour où l'émetteur fait défaut.",
    },
    {
      heading: "Horizon : le temps dont vous disposez vraiment",
      paragraphs: [
        "L'horizon, c'est le temps pendant lequel on accepte de ne pas toucher à son argent. Court (moins de 3 ans), moyen (3 à 8 ans), long (8 ans et plus). Cet horizon doit être réaliste, pas théorique : si on sait qu'on va acheter une maison dans 4 ans, l'horizon est de 4 ans, pas de 30.",
        "Règle de base : plus l'horizon est long, plus on peut tolérer de volatilité, parce qu'on a le temps d'attendre une remontée après une baisse. Investir en actions de l'argent dont on aura besoin dans 6 mois est l'erreur la plus courante chez les débutants.",
        "Un bon réflexe : segmenter son épargne par horizon. L'argent à 6 mois sur un livret. L'argent à 4 ans sur un fonds prudent. L'argent à 15 ans peut accepter beaucoup plus de volatilité. Chaque poche a sa logique propre.",
      ],
    },
    {
      heading: "Liquidité : la facilité à récupérer son argent",
      paragraphs: [
        "La liquidité, c'est la facilité avec laquelle on peut récupérer son argent. Un livret est très liquide (1 clic, 24 h). Une assurance-vie l'est correctement (sous 1 mois). Un investissement immobilier locatif l'est beaucoup moins (plusieurs mois, frais de notaire, marché illiquide).",
        "Manquer de liquidité, ce n'est pas grave si l'horizon est cohérent. Ça le devient quand un imprévu — chômage, santé, séparation — force à vendre au mauvais moment, souvent avec une décote significative.",
        "Règle minimale : conserver l'équivalent de 3 à 6 mois de dépenses sur un support 100 % liquide avant d'envisager des placements moins disponibles. C'est ce qu'on appelle l'épargne de précaution.",
      ],
      callout:
        "Crypto et SCPI ont en commun une faible liquidité en période de stress : quand tout le monde veut sortir, les prix s'effondrent et les retraits sont parfois gelés. À garder en tête avant de mettre l'épargne de précaution dedans.",
    },
    {
      heading: "Cas pratique : Léa, 28 ans, 15 000 € sur son compte courant",
      paragraphs: [
        "Léa a 15 000 € qui dorment sur son compte courant. Elle n'a aucun projet précis. Première étape : segmenter par horizon.",
        "5 000 € restent disponibles sur un livret pour l'épargne de précaution (3 mois de dépenses). 4 000 € vont sur un fonds prudent en assurance-vie pour un éventuel projet à 4-5 ans. Les 6 000 € restants partent sur un ETF mondial diversifié, avec un horizon d'au moins 10 ans.",
        "Léa accepte que ces 6 000 € puissent valoir 4 500 € dans deux ans si les marchés baissent, parce qu'elle sait qu'elle n'y touchera pas. Statistiquement, sur 15 ans, cette poche vaudra entre 12 000 € et 18 000 € selon les scénarios.",
      ],
    },
    {
      heading: "Cinq erreurs fréquentes chez les débutants",
      paragraphs: [
        "1. Comparer des rendements bruts à des rendements nets — toujours apple to apple, frais compris.",
        "2. Confondre volatilité court terme et perte définitive — vendre en panique après -20 % est la meilleure façon de transformer une fluctuation en perte réelle.",
        "3. Investir long terme un argent à court terme — la pire combinaison, car l'horizon force à vendre au pire moment.",
        "4. Sous-estimer les frais — 2 % par an semblent peu, mais c'est environ un tiers du rendement long terme moyen des actions.",
        "5. Tout mettre sur un seul produit « miracle » — un fonds qui a fait +40 % l'an dernier a souvent autant de chances de faire -30 % l'année suivante.",
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
