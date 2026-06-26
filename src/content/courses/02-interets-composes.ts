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
    "Einstein l'aurait appelée « la huitième merveille du monde ». La formule est triviale, ses conséquences sont contre-intuitives. Ce cours explique pourquoi le temps est de loin le plus puissant levier de l'investisseur — bien plus que le choix du « bon » produit.",
  sections: [
    {
      heading: "La formule en une ligne",
      paragraphs: [
        "Capital final = Capital initial × (1 + rendement annuel) ^ nombre d'années. C'est tout. Le mot « composé » signifie que les intérêts d'une année rapportent à leur tour des intérêts l'année suivante.",
        "Exemple : 1 000 € placés à 7 % par an deviennent 1 070 € après 1 an. La deuxième année, les 7 % s'appliquent à 1 070 €, pas à 1 000 €. On gagne 74,90 € au lieu de 70 €. L'écart paraît dérisoire — sur 30 ans, il fait toute la différence.",
        "Sur 30 ans à 7 %, ces 1 000 € deviennent 7 612 €. Sur 50 ans, 29 457 €. La courbe n'est pas une ligne droite : elle accélère avec le temps.",
      ],
      callout:
        "L'intuition humaine raisonne en ligne droite. Les intérêts composés suivent une exponentielle. C'est pourquoi 95 % des gens sous-estiment ce qu'un placement régulier produit sur 30 ans.",
    },
    {
      heading: "Le coût caché d'attendre 10 ans avant de commencer",
      paragraphs: [
        "Cas A : Alex commence à 25 ans, place 200 €/mois pendant 10 ans, puis arrête tout et laisse fructifier. À 65 ans, à 7 % de rendement annuel, il aura ≈ 280 000 €.",
        "Cas B : Béa commence à 35 ans, place 200 €/mois pendant 30 ans jusqu'à 65 ans. Elle aura placé trois fois plus que Alex en valeur cumulée. À 65 ans, elle aura ≈ 244 000 €.",
        "Alex a moins versé mais a commencé plus tôt — et il termine devant. Ce n'est pas une astuce de calcul, c'est la nature des intérêts composés. Le temps est l'ingrédient n°1.",
      ],
    },
    {
      heading: "Pourquoi 1 % de rendement annuel change tout",
      paragraphs: [
        "Sur des durées longues, 1 % de rendement supplémentaire par an semble dérisoire. En réalité, c'est massif.",
        "1 000 € à 4 % pendant 40 ans → 4 801 €. 1 000 € à 5 % pendant 40 ans → 7 040 €. Soit +46 % de capital final pour 1 point de rendement de plus par an. Sur 50 ans, l'écart dépasse +65 %.",
        "Conclusion pratique : 1 % de frais en moins par an n'est pas une optimisation cosmétique, c'est un des leviers les plus puissants à votre disposition.",
      ],
      callout:
        "Un fonds maison de banque à 2,5 % de frais annuels vs un ETF à 0,3 % : sur 30 ans, l'écart se compte en dizaines de milliers d'euros. Sur le même rendement brut.",
    },
    {
      heading: "L'effet boule de neige : où elle décolle vraiment",
      paragraphs: [
        "Au début, les versements représentent la quasi-totalité du capital. Les intérêts sont marginaux. C'est la phase frustrante : on a l'impression que rien ne se passe.",
        "Vers la 10e année, la balance bascule : les intérêts annuels approchent puis dépassent les versements annuels. C'est le point d'inflexion psychologique.",
        "Vers la 20e année, l'effet est spectaculaire : le capital double tous les 10 ans (à 7 %). Sur les 5 dernières années avant la retraite, on peut gagner plus qu'on n'a versé sur 20 ans.",
      ],
    },
    {
      heading: "La règle de 72 : le calcul mental utile",
      paragraphs: [
        "Pour estimer en combien d'années un placement double : 72 ÷ rendement annuel. À 6 %, on double en 12 ans. À 8 %, en 9 ans. À 3 %, en 24 ans.",
        "Cette règle, approximative mais redoutablement efficace, permet de juger un produit en 5 secondes. Un livret à 3 % double en 24 ans. Un ETF actions à 7 % long terme double en ~10 ans.",
        "Inversée, elle révèle aussi le coût de l'inflation. À 3 % d'inflation, le pouvoir d'achat de votre euro est divisé par 2 en 24 ans. Garder son argent sur un compte courant à 0 % est donc une perte garantie.",
      ],
    },
    {
      heading: "Cas pratique : 150 €/mois sur 40 ans",
      paragraphs: [
        "Hypothèses : Sami verse 150 €/mois pendant 40 ans (de 25 à 65 ans), soit 72 000 € versés au total. Rendement annuel net moyen : 6 %.",
        "Résultat : ≈ 298 000 € à 65 ans. Sur les 298 000 €, environ 226 000 € viennent des intérêts composés, et seulement 72 000 € des versements.",
        "Autrement dit : sur le capital final, 76 % vient du temps et des marchés, 24 % vient de l'effort d'épargne. C'est cette asymétrie qui rend l'investissement régulier si puissant pour des revenus moyens.",
      ],
    },
    {
      heading: "Erreurs fréquentes",
      paragraphs: [
        "1. Croire qu'il faut « beaucoup d'argent pour commencer ». 50 €/mois suffisent pour amorcer la mécanique. C'est le temps, pas la somme initiale, qui fait l'essentiel.",
        "2. Interrompre les versements quand les marchés baissent. C'est précisément à ce moment-là qu'on achète au meilleur prix les briques qui composeront le plus.",
        "3. Sous-estimer l'impact des frais. 1 % par an semble négligeable, on a vu : c'est tout sauf négligeable.",
        "4. Vouloir « rattraper » en prenant plus de risque à 55 ans pour compenser une décennie de retard. C'est statistiquement perdant et émotionnellement intenable.",
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
  quiz: [
    {
      question: "Selon la règle de 72, en combien d'années un placement à 6 % double-t-il ?",
      options: ["6 ans", "12 ans", "24 ans", "36 ans"],
      correctIndex: 1,
      explanation: "72 ÷ 6 = 12. Approximation très utile pour juger un placement de tête.",
    },
    {
      question: "Alex (25 ans, 10 ans de versements) finit devant Béa (35 ans, 30 ans de versements). Pourquoi ?",
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
      question: "Un fonds à 2,5 % de frais vs un ETF à 0,3 %, sur 30 ans, à rendement brut identique…",
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
      question: "Le meilleur réflexe quand les marchés baissent fortement et qu'on a un horizon de 20 ans ?",
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
