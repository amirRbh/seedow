import type { Course } from "./types";

export const course: Course = {
  slug: "interets-composes",
  number: 2,
  track: "finance",
  level: "debutant",
  isFree: true,
  readingMinutes: 12,
  title: "Intérêts composés : la mécanique du temps long",
  eyebrow: "Bases · Mathématiques utiles",
  description:
    "Pourquoi 100 € placés à 7 % deviennent 7 600 € en 50 ans : la mécanique des intérêts composés, expliquée avec des chiffres simples et des cas pratiques.",
  intro:
    "Einstein l'aurait appelée « la huitième merveille du monde ». La formule tient en une ligne, ses conséquences sont contre-intuitives. Le temps est de loin le plus puissant levier de l'investisseur — bien plus que le choix du « bon » produit.",
  eli5: "Imagine une boule de neige au sommet d'une pente. Au début, elle est minuscule et elle avance lentement. Puis elle grossit, roule sur elle-même, ramasse encore plus de neige. À la fin, elle est énorme. Les intérêts composés, c'est la même chose : ton argent gagne des intérêts, et ces intérêts gagnent à leur tour des intérêts. Plus la pente est longue, plus la boule finit grosse.",
  sections: [
    {
      heading: "La formule en une ligne",
      paragraphs: [
        "Capital final = Capital de départ × (1 + rendement) ^ nombre d'années. C'est tout. « Composé » veut dire que les intérêts d'une année rapportent à leur tour des intérêts l'année suivante.",
        "Exemple : 1 000 € à 7 % par an. Au bout d'un an, tu as 1 070 €. La deuxième année, les 7 % s'appliquent à 1 070 € (pas à 1 000 €). Tu gagnes 74,90 € au lieu de 70 €. Petit écart, mais qui grossit chaque année.",
        "Sur 30 ans à 7 %, ces 1 000 € deviennent 7 612 €. Sur 50 ans : 29 457 €. La courbe n'est pas une ligne droite : elle accélère.",
      ],
      callout:
        "Notre cerveau raisonne en ligne droite. Les intérêts composés suivent une courbe qui accélère. C'est pour ça que 95 % des gens sous-estiment ce qu'un placement régulier peut donner sur 30 ans.",
    },
    {
      heading: "Le coût caché d'attendre 10 ans avant de commencer",
      paragraphs: [
        "Alex a 25 ans. Il place 200 €/mois pendant 10 ans, puis arrête et laisse tout tranquille. À 65 ans (à 7 %), il a environ 280 000 €.",
        "Béa a 35 ans. Elle place 200 €/mois pendant 30 ans, jusqu'à 65 ans. Elle a versé trois fois plus qu'Alex en tout. À 65 ans, elle a environ 244 000 €.",
        "Alex a moins versé — il termine devant. Ce n'est pas une astuce : c'est la nature de la boule de neige. Le temps est l'ingrédient n°1.",
      ],
    },
    {
      heading: "Pourquoi 1 % de rendement en plus change tout",
      paragraphs: [
        "Sur des durées longues, 1 % de plus par an semble ridicule. En vrai, c'est énorme.",
        "1 000 € à 4 % pendant 40 ans → 4 801 €. 1 000 € à 5 % pendant 40 ans → 7 040 €. Un seul point de plus, +46 % de capital final. Sur 50 ans, +65 %.",
        "En clair : 1 % de frais en moins par an, ce n'est pas de la cosmétique — c'est l'un des leviers les plus puissants dont tu disposes.",
      ],
      callout:
        "Un fonds maison de banque à 2,5 % de frais vs un ETF à 0,3 % : sur 30 ans, l'écart se compte en dizaines de milliers d'euros. Même rendement brut, très différents dans ta poche.",
    },
    {
      heading: "L'effet boule de neige : où elle décolle vraiment",
      paragraphs: [
        "Au début, ce sont surtout tes versements qui font le capital. Les intérêts sont ridicules. C'est la phase frustrante : on a l'impression que rien ne bouge.",
        "Vers la 10e année, ça bascule : les intérêts annuels approchent puis dépassent tes versements annuels. Point d'inflexion.",
        "Vers la 20e année, c'est spectaculaire : le capital double tous les 10 ans (à 7 %). Sur les 5 dernières années avant la retraite, tu peux gagner plus que ce que tu as versé sur les 20 premières.",
      ],
    },
    {
      heading: "La règle de 72 : le calcul mental utile",
      paragraphs: [
        "Envie de savoir en combien d'années ton placement double ? Divise 72 par le rendement. À 6 %, ça double en 12 ans. À 8 %, en 9 ans. À 3 %, en 24 ans.",
        "Simple, approximatif, redoutable. Un livret à 3 % double en 24 ans. Un ETF actions à 7 % double en environ 10 ans.",
        "Retournée, elle donne aussi l'effet de l'inflation. À 3 % d'inflation, ton pouvoir d'achat est divisé par 2 en 24 ans. Laisser son argent sur un compte courant à 0 %, c'est une perte garantie.",
      ],
    },
    {
      heading: "Cas pratique : 150 €/mois pendant 40 ans",
      paragraphs: [
        "Sami verse 150 €/mois de 25 à 65 ans. Total versé : 72 000 €. Rendement net moyen : 6 %.",
        "Résultat : environ 298 000 € à 65 ans. Sur ces 298 000 €, environ 226 000 € viennent des intérêts et seulement 72 000 € de ses versements.",
        "En clair : 76 % du capital final vient du temps et des marchés, 24 % de l'effort d'épargne. C'est ce déséquilibre qui rend l'investissement régulier si puissant pour des revenus moyens.",
      ],
    },
    {
      heading: "Erreurs fréquentes",
      paragraphs: [
        "1. Croire qu'il faut « beaucoup d'argent pour commencer ». 50 €/mois suffisent à amorcer la boule.",
        "2. Arrêter les versements quand les marchés baissent. C'est précisément là qu'on achète au meilleur prix.",
        "3. Sous-estimer les frais. 1 % par an paraît négligeable — on a vu le contraire.",
        "4. Vouloir « rattraper » en prenant plus de risque à 55 ans. Statistiquement perdant, émotionnellement intenable.",
      ],
    },
  ],
  keyTakeaways: [
    "Capital final = capital × (1 + r)^n : le n compte plus que tout.",
    "Commencer 10 ans plus tôt bat verser 3× plus longtemps.",
    "1 % de rendement annuel supplémentaire = +40 à 65 % de capital final sur 40 ans.",
    "Règle de 72 : doublement en 72 ÷ rendement (%).",
    "Sur 40 ans, ~75 % du capital final vient des intérêts, ~25 % des versements.",
    "Couper ses frais de 2 % à 0,3 % est l'optimisation la plus rentable disponible.",
    "Ne jamais interrompre les versements en baisse de marché : c'est le moment idéal.",
  ],
  advanced: [
    "Formule versements réguliers : V × ((1+r)^n − 1) / r, où V = versement, r = taux périodique, n = nombre de périodes.",
    "Passage taux annuel → mensuel : (1+r_annuel)^(1/12) − 1 (ne pas diviser par 12).",
    "Règle de 72 exacte via ln(2)/ln(1+r) ≈ 0,693/r ; l'écart avec 72/r reste < 3 % pour r ∈ [4 %, 10 %].",
    "Rendement réel = (1 + rendement nominal)/(1 + inflation) − 1 ; c'est le seul chiffre qui compte long terme.",
    "Ordre de grandeur historique : actions monde ~7 %/an réel, obligations ~2 %, or ~1 %, cash ~0 % (net d'inflation).",
  ],
  quiz: [
    {
      question: "Selon la règle de 72, en combien d'années un placement à 6 % double-t-il ?",
      options: ["6 ans", "12 ans", "24 ans", "36 ans"],
      correctIndex: 1,
      explanation: "72 ÷ 6 = 12. Approximation très utile pour juger un placement de tête.",
    },
    {
      question:
        "Alex (25 ans, 10 ans de versements) finit devant Béa (35 ans, 30 ans de versements). Pourquoi ?",
      options: [
        "Parce qu'Alex a versé plus.",
        "Parce que le temps composé donne un avantage massif aux 10 premières années.",
        "Parce que Béa a payé plus de frais.",
        "Parce qu'Alex a pris plus de risques.",
      ],
      correctIndex: 1,
      explanation:
        "Les premières années comptent le plus en valeur composée. Démarrer tôt > verser longtemps.",
    },
    {
      question: "1 000 € à 7 % sur 30 ans deviennent environ…",
      options: ["3 000 €", "5 000 €", "7 600 €", "30 000 €"],
      correctIndex: 2,
      explanation: "1 000 × 1,07^30 ≈ 7 612 €. La courbe est exponentielle, pas linéaire.",
    },
    {
      question:
        "Un fonds à 2,5 % de frais vs un ETF à 0,3 %, sur 30 ans, à rendement brut identique…",
      options: [
        "Différence négligeable.",
        "Différence de quelques centaines d'euros.",
        "Différence de plusieurs dizaines de milliers d'euros.",
        "L'ETF perd contre le fonds à cause du tracking error.",
      ],
      correctIndex: 2,
      explanation:
        "2,2 % d'écart annuel composé sur 30 ans = environ 40 % de capital final en moins pour le fonds cher.",
    },
    {
      question:
        "Le meilleur réflexe quand les marchés baissent fortement et qu'on a un horizon de 20 ans ?",
      options: [
        "Vendre pour limiter la casse.",
        "Arrêter les versements en attendant que ça remonte.",
        "Continuer (ou augmenter) les versements réguliers.",
        "Tout transférer en or.",
      ],
      correctIndex: 2,
      explanation:
        "En baisse, chaque versement achète plus de parts. Les versements réguliers en marché baissier dopent le rendement final.",
    },
    {
      question: "Pourquoi laisser son argent sur un compte courant à 0 % est une perte garantie ?",
      options: [
        "Parce que la banque le confisque.",
        "Parce que l'inflation érode le pouvoir d'achat chaque année.",
        "Parce que les comptes courants ne sont pas garantis.",
        "Parce que c'est imposé à 30 %.",
      ],
      correctIndex: 1,
      explanation:
        "À 3 % d'inflation, le pouvoir d'achat est divisé par 2 en 24 ans. Le nominal est stable, le réel s'effondre.",
    },
  ],
};
