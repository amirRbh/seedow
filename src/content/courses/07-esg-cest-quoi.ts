import type { Course } from "./types";

export const course: Course = {
  slug: "esg-cest-quoi",
  number: 7,
  track: "esg",
  level: "debutant",
  isFree: true,
  readingMinutes: 11,
  title: "Qu'est-ce que l'ESG ?",
  eyebrow: "Bases · ESG",
  description:
    "Environnement, Social, Gouvernance : trois lettres devenues incontournables. Ce qu'elles signifient vraiment, comment on les mesure, et leurs limites.",
  intro:
    "ESG est devenu un argument marketing si vendeur que presque tous les fonds européens s'en réclament. Ce cours pose les bases pour comprendre ce que recouvre l'acronyme, ce qu'il évalue vraiment, et ce qu'il ne dit pas. Sans naïveté ni cynisme.",
  sections: [
    {
      heading: "E pour Environnement",
      paragraphs: [
        "Tout ce qui concerne l'impact écologique d'une entreprise : émissions de CO2 directes et indirectes, consommation d'eau, gestion des déchets, pollution, biodiversité, dépendance aux énergies fossiles, capacité d'adaptation au changement climatique.",
        "Indicateurs typiques : intensité carbone (tonnes de CO2 par million d'euros de chiffre d'affaires), part d'énergies renouvelables, alignement sur les accords de Paris (trajectoire 1,5 °C ou 2 °C), exposition au risque physique climatique.",
        "Limite majeure : la fiabilité des données. Beaucoup d'entreprises ne publient pas leurs émissions « scope 3 » (toute la chaîne de valeur), qui représentent souvent 80 à 95 % du total. Un score E flatteur peut masquer une réalité bien moins propre.",
      ],
    },
    {
      heading: "S pour Social",
      paragraphs: [
        "Conditions de travail, salaires, égalité hommes-femmes, sécurité, formation, droits humains chez les fournisseurs, impact sur les communautés locales, respect du droit du travail, qualité du dialogue social.",
        "Indicateurs typiques : turnover, taux d'accidents, écart salarial hommes-femmes, pourcentage de cadres femmes, présence dans des pays à risque pour les droits humains, controverses sociales (procès, scandales).",
        "Le « S » est souvent le parent pauvre du triptyque : moins quantifiable, plus subjectif, moins standardisé. Une entreprise peut afficher un bon score S sans changer fondamentalement ses pratiques.",
      ],
      callout:
        "Le S est le plus difficile à comparer entre entreprises. Une PME française et une multinationale du textile au Bangladesh n'opèrent pas dans le même contexte — les noter avec la même grille a peu de sens.",
    },
    {
      heading: "G pour Gouvernance",
      paragraphs: [
        "Comment l'entreprise est dirigée : indépendance du conseil d'administration, séparation des pouvoirs (PDG vs président), rémunération des dirigeants, lutte anti-corruption, transparence comptable, droits des actionnaires minoritaires.",
        "Indicateurs typiques : pourcentage d'administrateurs indépendants, ratio de rémunération PDG / employé médian, présence d'un comité d'audit indépendant, transparence sur les paiements politiques, historique de scandales financiers.",
        "Le G est paradoxalement le plus mesurable et le mieux corrélé à la performance financière long terme. Une gouvernance solide réduit les risques de fraude, de mauvaise allocation du capital et de scandales destructeurs.",
      ],
    },
    {
      heading: "Comment on attribue un score ESG",
      paragraphs: [
        "Des agences spécialisées (MSCI, Sustainalytics, Moody's, S&P Global, ISS) analysent les entreprises selon leurs propres méthodologies, à partir des publications officielles, des controverses médiatisées et de questionnaires.",
        "Problème central : les agences sont en désaccord entre elles. Une étude du MIT a montré une corrélation entre scores ESG d'agences différentes d'environ 0,5 — contre 0,99 pour les notations de crédit. Autrement dit : les notations financières font consensus, les notations ESG sont en partie subjectives.",
        "Tesla peut être noté « très bon » par un et « mauvais » par un autre. Total peut être étiqueté « leader transition » par un et « brun » par un autre. Le score ESG est un indicateur, pas une vérité.",
      ],
      callout:
        "Score ESG ≠ alignement avec vos valeurs. Une entreprise peut avoir un excellent score ESG (bien gouvernée, bonnes pratiques RH) tout en étant active dans l'armement ou le tabac. ESG mesure les pratiques, pas l'activité.",
    },
    {
      heading: "ESG ≠ impact ≠ éthique",
      paragraphs: [
        "ESG mesure les pratiques d'une entreprise. Impact mesure les conséquences réelles de son activité. Éthique exprime un jugement de valeur sur ce qu'elle fait.",
        "Une mine de lithium peut avoir un score ESG correct (bonne gouvernance, conditions de travail) mais un impact environnemental local lourd, et une utilité jugée positive (transition énergétique) ou négative (extraction destructrice) selon la grille.",
        "Trois approches qui se distinguent : best-in-class (les meilleures pratiques d'un secteur, sans en exclure aucun), exclusion (on retire certains secteurs entiers), impact (on cherche à produire un effet positif mesurable).",
      ],
    },
    {
      heading: "Pourquoi ESG s'est imposé en Europe",
      paragraphs: [
        "Réglementation SFDR (Sustainable Finance Disclosure Regulation, 2021) : oblige les acteurs financiers européens à classer leurs produits en Article 6 (non ESG), Article 8 (« light green ») ou Article 9 (« dark green »).",
        "Conséquence directe : la quasi-totalité des fonds vendus en Europe se déclarent désormais Article 8 ou 9. Ce qui dilue le sens initial — un fonds Article 8 peut être très peu engagé.",
        "Demande croissante des particuliers, notamment des moins de 35 ans : selon plusieurs études, 70 à 80 % des jeunes investisseurs européens disent vouloir aligner leurs placements sur leurs valeurs. Les banques ont suivi le marché.",
      ],
    },
    {
      heading: "Erreurs fréquentes des débutants",
      paragraphs: [
        "1. Confondre « fonds ESG » et « fonds éthique ». Un fonds ESG peut détenir Total, Coca-Cola ou Boeing si leurs pratiques sont jugées meilleures que la moyenne sectorielle.",
        "2. Penser qu'un fonds Article 9 est forcément vert. Article 9 = objectif d'investissement durable, mais la définition est large et controversée.",
        "3. Croire qu'investir ESG sacrifie nécessairement le rendement. Les études récentes montrent un rendement proche des indices classiques, parfois supérieur, parfois inférieur selon les périodes.",
        "4. Faire confiance à un seul score d'une seule agence sans regarder ce qu'il y a dans le fonds.",
      ],
    },
  ],
  keyTakeaways: [
    "E = environnement, S = social, G = gouvernance.",
    "Les scores ESG sont publiés par des agences (MSCI, Sustainalytics, etc.) en désaccord entre elles.",
    "ESG mesure les pratiques, pas l'activité ni l'impact.",
    "SFDR Article 8 ≠ très engagé. Article 9 = objectif durable, mais flou.",
    "Un fonds ESG peut contenir Total ou Boeing.",
    "Score ESG ≠ alignement personnel avec ses valeurs.",
    "Gouvernance est le mieux corrélé à la performance financière long terme.",
  ],
  quiz: [
    {
      question: "Que signifie ESG ?",
      options: [
        "Économie, Stratégie, Géopolitique",
        "Environnement, Social, Gouvernance",
        "Entreprise, Société, Groupe",
        "Énergie, Sécurité, Gouvernement",
      ],
      correctIndex: 1,
      explanation: "Trois axes d'évaluation extra-financière standardisés depuis ~2005.",
    },
    {
      question: "Selon le MIT, la corrélation entre scores ESG d'agences différentes est d'environ…",
      options: ["0,99", "0,80", "0,50", "0,10"],
      correctIndex: 2,
      explanation:
        "≈ 0,5, vs 0,99 pour les notations de crédit. Les scores ESG sont en partie subjectifs.",
    },
    {
      question: "Un fonds ESG peut-il détenir une entreprise pétrolière comme TotalEnergies ?",
      options: [
        "Non, jamais.",
        "Oui, si elle est jugée meilleure que sa moyenne sectorielle.",
        "Seulement aux États-Unis.",
        "Seulement si c'est un Article 9.",
      ],
      correctIndex: 1,
      explanation:
        "Approche « best-in-class » très répandue : on garde les meilleurs de chaque secteur, sans exclusion sectorielle.",
    },
    {
      question: "L'élément ESG le mieux corrélé à la performance financière long terme ?",
      options: ["E", "S", "G", "Aucun"],
      correctIndex: 2,
      explanation:
        "La gouvernance, par son effet sur la qualité des décisions et la réduction des risques de fraude.",
    },
    {
      question: "Un fonds SFDR Article 9, c'est…",
      options: [
        "Un fonds réservé aux experts.",
        "Un fonds avec un objectif explicite d'investissement durable (définition large).",
        "Un fonds garanti vert par l'État.",
        "Un fonds sans actions.",
      ],
      correctIndex: 1,
      explanation:
        "Article 9 = objectif durable selon la réglementation européenne. La définition reste discutée et beaucoup ont été reclassés Article 8 récemment.",
    },
    {
      question: "Quelle limite majeure du « E » environnemental ?",
      options: [
        "Impossible à mesurer du tout.",
        "Données scope 3 (chaîne de valeur) souvent absentes ou approximatives.",
        "Trop coûteux à calculer.",
        "Réservé aux entreprises européennes.",
      ],
      correctIndex: 1,
      explanation:
        "Scope 3 = 80 à 95 % des émissions chez la plupart des entreprises, et très peu publié de façon fiable.",
    },
  ],
};
