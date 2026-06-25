import type { Course } from "./types";

export const course: Course = {
  slug: "cinq-mots-avant-investir",
  number: 1,
  track: "finance",
  level: "debutant",
  isFree: true,
  readingMinutes: 6,
  title: "Les 5 mots à connaître avant d'investir",
  eyebrow: "Bases · Vocabulaire",
  description:
    "Rendement, risque, volatilité, horizon, liquidité : cinq mots que tout investisseur débutant rencontre dès la première page. Définitions courtes, exemples concrets.",
  intro:
    "Investir, ce n'est pas compliqué — c'est juste mal expliqué. Avant de cliquer sur quoi que ce soit, on pose cinq mots. Une fois ces cinq mots clairs, 80 % des conversations financières deviennent lisibles.",
  sections: [
    {
      heading: "Rendement",
      paragraphs: [
        "Le rendement, c'est ce que rapporte un placement, exprimé en pourcentage du montant investi sur une période donnée. Un livret à 3 % rapporte 30 € pour 1 000 € sur un an.",
        "Distinction utile : rendement brut (avant frais et fiscalité) vs rendement net. Les deux peuvent différer de 1 à 2 points par an — sur 20 ans, c'est l'écart entre doubler son capital ou non.",
      ],
      callout:
        "Un rendement affiché sans horizon ni méthode de calcul ne veut rien dire. Toujours demander : sur combien de temps, net de quoi.",
    },
    {
      heading: "Risque",
      paragraphs: [
        "Le risque est la probabilité de perdre une partie de son capital, ou de toucher un rendement très différent de celui attendu. Tout placement non garanti porte un risque — y compris un fonds étiqueté ESG.",
        "Le risque n'est pas l'ennemi du rendement, il en est le carburant. Sans risque, pas de rendement supérieur à l'inflation. La question est : combien suis-je prêt à voir mon capital baisser temporairement sans paniquer.",
      ],
    },
    {
      heading: "Volatilité",
      paragraphs: [
        "La volatilité mesure l'amplitude des variations d'un actif autour de sa moyenne. Une action très volatile peut prendre 5 % un jour et en perdre 4 % le lendemain. Un livret a une volatilité nulle.",
        "Volatilité ≠ risque de perte définitive. Un portefeuille diversifié et volatil sur 1 an peut être très stable sur 10 ans. La volatilité fait peur ; le temps long la dilue.",
      ],
    },
    {
      heading: "Horizon",
      paragraphs: [
        "L'horizon, c'est le temps pendant lequel on accepte de ne pas toucher à son argent. Court (moins de 3 ans), moyen (3 à 8 ans), long (8 ans et plus).",
        "Règle de base : plus l'horizon est long, plus on peut tolérer de volatilité, parce qu'on a le temps d'attendre une remontée. Investir en actions de l'argent dont on aura besoin dans 6 mois est une erreur fréquente.",
      ],
    },
    {
      heading: "Liquidité",
      paragraphs: [
        "La liquidité, c'est la facilité avec laquelle on peut récupérer son argent. Un livret est très liquide (1 clic, 24 h). Un investissement immobilier locatif l'est beaucoup moins (plusieurs mois, frais).",
        "Manquer de liquidité, ce n'est pas grave si l'horizon est cohérent. Ça le devient quand un imprévu force à vendre au mauvais moment.",
      ],
    },
  ],
  keyTakeaways: [
    "Rendement sans horizon ni 'net de quoi' = chiffre marketing.",
    "Le risque est le prix du rendement, pas son ennemi.",
    "Volatilité court terme ≠ perte définitive : le temps long lisse.",
    "L'horizon dicte la tolérance à la volatilité.",
    "Vérifier la liquidité avant d'engager une somme dont on peut avoir besoin.",
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
  ],
};
