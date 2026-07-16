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
    "ESG est devenu un argument marketing si vendeur que presque tous les fonds européens s'en réclament. Voici les bases pour comprendre ce que recouvre l'acronyme, ce qu'il évalue vraiment, et ce qu'il ne dit pas. Sans naïveté ni cynisme.",
  eli5: "Imagine un bulletin scolaire d'entreprise. Trois notes principales : Environnement (l'entreprise pollue-t-elle ?), Social (traite-t-elle bien ses employés ?), Gouvernance (est-elle bien dirigée, sans triche ?). ESG = ces trois notes. Le problème : chaque « prof » (agence de notation) note différemment. Une entreprise peut être 18/20 chez l'un et 8/20 chez l'autre.",
  sections: [
    {
      heading: "E pour Environnement",
      paragraphs: [
        "Tout ce qui touche à l'impact écologique : émissions de CO2 (directes et indirectes), consommation d'eau, gestion des déchets, pollution, biodiversité, dépendance au pétrole/gaz/charbon, capacité à s'adapter au climat qui change.",
        "Indicateurs typiques : intensité carbone (tonnes de CO2 pour 1 M€ de chiffre d'affaires), part d'énergies renouvelables, alignement avec l'accord de Paris (1,5 °C ou 2 °C).",
        "Limite majeure : la fiabilité des données. Beaucoup d'entreprises ne publient pas leurs émissions « scope 3 » (toute la chaîne fournisseurs + clients), qui pèsent souvent 80 à 95 % du total. Un score E flatteur peut cacher une réalité bien moins propre.",
      ],
    },
    {
      heading: "S pour Social",
      paragraphs: [
        "Conditions de travail, salaires, égalité hommes-femmes, sécurité, formation, droits humains chez les fournisseurs, impact sur les communautés locales, respect du droit du travail.",
        "Indicateurs typiques : turnover (départ des salariés), taux d'accidents, écart salarial hommes-femmes, % de cadres femmes, présence dans des pays à risque droits humains, controverses (procès, scandales).",
        "Le « S » est souvent le parent pauvre : moins quantifiable, plus subjectif, moins standardisé. Une entreprise peut afficher un bon score S sans changer grand-chose dans ses pratiques.",
      ],
      callout:
        "Le S est le plus difficile à comparer entre entreprises. Une PME française et une multinationale du textile au Bangladesh n'opèrent pas dans le même contexte — les noter avec la même grille a peu de sens.",
    },
    {
      heading: "G pour Gouvernance",
      paragraphs: [
        "Comment l'entreprise est dirigée : indépendance du conseil d'administration, séparation des pouvoirs (PDG vs président), rémunération des dirigeants, lutte anti-corruption, transparence comptable, droits des petits actionnaires.",
        "Indicateurs typiques : % d'administrateurs indépendants, ratio de rémunération PDG / employé médian, présence d'un comité d'audit indépendant, historique de scandales financiers.",
        "Paradoxalement, le G est le mieux mesurable et le mieux corrélé à la performance financière long terme. Une gouvernance solide réduit les risques de fraude, de mauvaises décisions et de scandales destructeurs.",
      ],
    },
    {
      heading: "Comment on attribue un score ESG",
      paragraphs: [
        "Des agences spécialisées (MSCI, Sustainalytics, Moody's, S&P Global, ISS) analysent les entreprises selon leurs propres méthodes, à partir des publications officielles, des controverses médiatisées et de questionnaires.",
        "Problème central : les agences sont en désaccord entre elles. Une étude du MIT montre une corrélation d'environ 0,5 entre agences — contre 0,99 pour les notes de crédit financier. Les notes financières font consensus, les notes ESG restent en partie subjectives.",
        "Tesla peut être noté « très bon » par un et « mauvais » par un autre. Total peut être « leader transition » chez l'un et « brun » chez l'autre. Le score ESG est un indicateur, pas une vérité.",
      ],
      callout:
        "Score ESG ≠ alignement avec tes valeurs. Une entreprise peut avoir un excellent score ESG (bien gouvernée, bonnes pratiques RH) tout en fabriquant des armes ou du tabac. ESG mesure les pratiques, pas l'activité.",
    },
    {
      heading: "ESG ≠ impact ≠ éthique",
      paragraphs: [
        "ESG mesure les pratiques d'une entreprise. Impact mesure les conséquences réelles de son activité. Éthique exprime un jugement de valeur sur ce qu'elle fait.",
        "Une mine de lithium peut avoir un bon score ESG (bonne gouvernance, conditions de travail correctes) mais un impact environnemental local lourd, et une utilité jugée positive (transition énergétique) ou négative (extraction destructrice) selon la grille.",
        "Trois approches distinctes : best-in-class (les meilleurs de chaque secteur, sans exclusion), exclusion (on retire certains secteurs entiers), impact (on cherche à produire un effet positif mesurable).",
      ],
    },
    {
      heading: "Pourquoi ESG s'est imposé en Europe",
      paragraphs: [
        "Réglementation SFDR (2021) : oblige les acteurs financiers européens à classer leurs produits en Article 6 (pas ESG), Article 8 (« light green ») ou Article 9 (« dark green »).",
        "Conséquence directe : presque tous les fonds vendus en Europe se déclarent Article 8 ou 9. Ce qui dilue le sens initial — un fonds Article 8 peut être très peu engagé.",
        "Demande croissante des particuliers, surtout des moins de 35 ans : 70 à 80 % des jeunes investisseurs européens disent vouloir aligner leurs placements sur leurs valeurs. Les banques ont suivi.",
      ],
    },
    {
      heading: "Erreurs fréquentes",
      paragraphs: [
        "1. Confondre « fonds ESG » et « fonds éthique ». Un fonds ESG peut détenir Total, Coca-Cola ou Boeing si leurs pratiques sont jugées meilleures que la moyenne du secteur.",
        "2. Penser qu'un fonds Article 9 est forcément vert. Article 9 = objectif d'investissement durable, mais la définition est large et controversée.",
        "3. Croire qu'investir ESG sacrifie forcément le rendement. Les études récentes montrent un rendement proche des indices classiques, parfois supérieur, parfois inférieur selon les périodes.",
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
  advanced: [
    "Matérialité financière (SASB, MSCI) vs double matérialité (CSRD européenne) : ce qui compte financièrement vs impact sur le monde.",
    "CSRD (Corporate Sustainability Reporting Directive) : ~50 000 entreprises européennes concernées à partir de 2024-2026, publication d'indicateurs ESRS obligatoires.",
    "PAI (Principal Adverse Impacts) SFDR : 14 indicateurs obligatoires côté fonds Article 8/9 (empreinte carbone, controverses OIT, etc.).",
    "Divergence de rating documentée par Berg, Kölbel & Rigobon (MIT, 2022) : mêmes données, méthodes différentes, résultats opposés.",
    "Taxonomie européenne : 6 objectifs environnementaux, critères de contribution substantielle + DNSH (Do No Significant Harm) + garanties sociales minimales.",
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
      question:
        "Selon le MIT, la corrélation entre scores ESG d'agences différentes est d'environ…",
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
