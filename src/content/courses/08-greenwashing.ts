import type { Course } from "./types";

export const course: Course = {
  slug: "greenwashing-6-signaux",
  number: 8,
  track: "esg",
  level: "debutant",
  isFree: false,
  readingMinutes: 11,
  title: "Greenwashing : 6 signaux d'alerte sur un fonds « vert »",
  eyebrow: "ESG · Détection",
  description:
    "Comment repérer en quelques minutes si un fonds « vert » l'est vraiment, ou s'il fait juste du marketing vert.",
  intro:
    "Sur les étagères européennes, presque tous les fonds se présentent comme « durables », « responsables », « green », « impact ». La réalité est très inégale. Voici six signaux d'alerte à vérifier avant de souscrire — ça prend dix minutes et ça évite les pires pièges.",
  eli5: "Imagine un jus d'orange étiqueté « 100 % naturel ». Tu retournes la bouteille : au dos, ça dit « sucre, arômes, colorant, 2 % de jus concentré ». C'est du greenwashing : un emballage qui promet une chose, un contenu qui en fait une autre. Pour les fonds « verts », on fait pareil : on retourne l'étiquette et on regarde ce qu'il y a vraiment dedans.",
  sections: [
    {
      heading: "Signal n°1 : un nom marketing sans preuve",
      paragraphs: [
        "« Green », « Sustainable », « Climate », « Future », « Impact » dans le nom du fonds : marketing puissant, ne dit rien sur la composition. Beaucoup de fonds renommés récemment n'ont pas changé leur portefeuille d'un iota.",
        "Vérification : ouvrir la fiche du fonds, regarder les 10 premières lignes (« top holdings »). Si tu y trouves TotalEnergies, ExxonMobil, Glencore, Boeing ou Amazon en grosses positions, l'étiquette « vert » est un emballage.",
        "L'AMF française et l'ESMA européenne ont publié des règles en 2024 pour limiter ces noms trompeurs. Application progressive — la vigilance reste utile.",
      ],
      callout:
        "Si le nom contient « green » mais que la fiche détaillée n'est pas accessible en deux clics, c'est déjà un mauvais signe.",
    },
    {
      heading: "Signal n°2 : aucune exclusion sectorielle claire",
      paragraphs: [
        "Un fonds vraiment engagé exclut généralement certains secteurs : énergies fossiles, armement controversé (mines antipersonnel, bombes à sous-munitions), tabac, charbon, jeux d'argent, parfois pornographie.",
        "Vérification : chercher dans le DICI (Document d'Information Clé — la fiche officielle de 2 pages) ou la politique ISR du fonds la liste des exclusions. Pas de liste, ou liste cosmétique (« nous excluons les armes nucléaires interdites », ce qui est déjà obligatoire pour tout fonds européen) = signal faible.",
        "À l'inverse, des seuils précis (« exclusion des entreprises tirant plus de 5 % de leur CA du charbon ») montrent un effort réel — même si on peut discuter les seuils choisis.",
      ],
    },
    {
      heading: "Signal n°3 : score ESG = seul argument",
      paragraphs: [
        "Beaucoup de fonds « ESG » se contentent d'acheter les entreprises les mieux notées par une seule agence (souvent MSCI). Approche « best-in-class » qui ne change pas grand-chose à la composition par rapport à un indice classique.",
        "Vérification : comparer la composition du fonds « ESG » avec celle de son indice de référence classique. Si l'écart est inférieur à 10 % sur les principales lignes, l'effort « vert » est marginal.",
        "Un vrai effort se voit dans un « tracking error » significatif (= écart de composition) vs l'indice classique. Pas d'écart = pas de vrais choix.",
      ],
    },
    {
      heading: "Signal n°4 : pas de transparence sur la méthode",
      paragraphs: [
        "Un fonds engagé publie sa politique d'exclusion détaillée, sa méthode de sélection, les agences ESG utilisées, le nombre d'entreprises éliminées par les filtres, et idéalement un rapport d'impact annuel.",
        "Vérification : aller sur le site du gérant, chercher la « politique ISR » du fonds. Document inexistant, daté de 2019, ou ne contenant que des généralités = signal négatif.",
        "Les bons fonds publient aussi leur exercice du droit de vote en assemblée générale (« voting record »). Un fonds qui ne vote jamais contre les rémunérations excessives n'a pas d'effet réel sur la gouvernance.",
      ],
      callout:
        "Un fonds engagé est traçable. Si tu mets 30 minutes à comprendre ce qu'il y a dedans et comment il sélectionne, c'est qu'il y a un problème.",
    },
    {
      heading: "Signal n°5 : promesses d'impact sans chiffres",
      paragraphs: [
        "« Notre fonds finance la transition énergétique » : phrase typique qui peut couvrir aussi bien un vrai fonds d'énergies renouvelables qu'un fonds qui détient 5 % d'éolien et 30 % de tech américaine.",
        "Vérification : chercher des indicateurs chiffrés et comparables. Intensité carbone du portefeuille vs l'indice, alignement Paris 1,5 °C, % du CA des entreprises détenues lié à des activités vertes (taxonomie européenne).",
        "Méfiance pour les indicateurs flous : « contribution aux ODD de l'ONU », « entreprises engagées » sans chiffres. Un vrai impact se mesure.",
      ],
    },
    {
      heading: "Signal n°6 : frais déguisés",
      paragraphs: [
        "Phénomène fréquent : les fonds « ESG » sont parfois 0,2 à 0,5 % plus chers que leurs équivalents classiques, parfois sans contrepartie réelle en sélection ou en gestion.",
        "Vérification : comparer le TER du fonds ESG avec un ETF ESG indiciel équivalent. Si le fonds « ESG » à 2 % de frais ressemble à 90 % à un MSCI World ESG à 0,3 %, le « surcoût responsable » est en réalité du surcoût tout court.",
        "Les vrais fonds à gestion ESG active (sélection ligne à ligne, engagement actionnarial) peuvent justifier des frais supérieurs. Encore faut-il que la sélection soit visible dans le portefeuille.",
      ],
    },
    {
      heading: "Cas pratique : audit en 10 minutes",
      paragraphs: [
        "Étape 1 (2 min) : récupérer le DICI / fiche fonds. Lire les exclusions précises et la philosophie.",
        "Étape 2 (3 min) : regarder les 10 premières lignes du portefeuille. Reconnaître les entreprises qui clochent.",
        "Étape 3 (2 min) : comparer le TER vs un ETF ESG indiciel large. Justifier l'écart éventuel.",
        "Étape 4 (3 min) : chercher le rapport d'impact ou de vote. Vérifier qu'il est récent, chiffré, et pas un dépliant marketing.",
        "Si trois étapes sur quatre passent, le fonds est probablement sérieux. Si deux ou moins, le « vert » est essentiellement décoratif.",
      ],
    },
  ],
  keyTakeaways: [
    "Le nom « green » ne dit rien — toujours regarder la composition.",
    "Vérifier la liste précise des exclusions sectorielles avec seuils chiffrés.",
    "Best-in-class sans exclusion ≠ fonds vraiment engagé.",
    "Politique ISR récente et publique = signal positif.",
    "Indicateurs d'impact chiffrés > slogans ODD.",
    "Comparer frais ESG actif vs ETF ESG indiciel.",
    "Audit en 10 min suffit pour repérer les pires cas.",
  ],
  advanced: [
    "Guidelines ESMA fonds ESG (mai 2024) : nom durable requiert ≥ 80 % d'investissements alignés + exclusions Paris-Aligned Benchmark.",
    "PAB (Paris-Aligned Benchmark) vs CTB (Climate Transition Benchmark) : deux standards européens, PAB plus strict (-50 % intensité carbone dès départ, -7 %/an).",
    "Active Share : mesure quantitative de l'écart avec l'indice ; < 20 % = closet indexing, > 60 % = gestion réellement active.",
    "Novethic, Morningstar Sustainability Rating (globes), Reclaim Finance : sources indépendantes pour croiser les allégations.",
    "Sanctions AMF : mise en demeure fréquente sur greenwashing dans les noms depuis 2023 ; DWS, Goldman Sachs déjà condamnés aux USA.",
  ],
  quiz: [
    {
      question: "Premier réflexe pour vérifier qu'un fonds « green » l'est ?",
      options: [
        "Faire confiance au nom.",
        "Regarder les 10 premières lignes du portefeuille.",
        "Demander à son conseiller.",
        "Vérifier la couleur du logo.",
      ],
      correctIndex: 1,
      explanation:
        "Le top 10 holdings révèle immédiatement les contradictions avec le nom marketing.",
    },
    {
      question: "Approche « best-in-class » signifie…",
      options: [
        "Exclusion totale des secteurs polluants.",
        "Sélection des meilleurs ESG d'un secteur, sans exclusion sectorielle.",
        "Garantie de performance.",
        "Fonds réservé aux institutionnels.",
      ],
      correctIndex: 1,
      explanation:
        "On garde les « meilleurs » de chaque secteur, y compris pétrole, armement, etc. Différent d'une approche d'exclusion.",
    },
    {
      question:
        "Un fonds ESG à 2 % de frais qui ressemble à 90 % à un ETF MSCI World ESG à 0,3 % suggère…",
      options: [
        "Une excellente gestion active.",
        "Un surcoût injustifié déguisé en effort responsable.",
        "Un effet de levier important.",
        "Une fiscalité préférentielle.",
      ],
      correctIndex: 1,
      explanation:
        "Si la composition est quasi-identique à l'indice ESG, le surcoût n'est pas justifié par une sélection différente.",
    },
    {
      question: "« Notre fonds contribue aux ODD de l'ONU » est un argument…",
      options: [
        "Suffisant pour valider l'impact.",
        "Flou s'il n'est pas chiffré.",
        "Réservé aux fonds verts.",
        "Obligatoire en Europe.",
      ],
      correctIndex: 1,
      explanation:
        "Sans indicateurs chiffrés et comparables (intensité carbone, % vert, alignement Paris), c'est du slogan.",
    },
    {
      question: "Une exclusion crédible se traduit par…",
      options: [
        "Une phrase générale.",
        "Des seuils chiffrés précis (ex : < 5 % de CA charbon).",
        "Une déclaration sur le site.",
        "Un logo certifié.",
      ],
      correctIndex: 1,
      explanation:
        "Sans seuils, l'exclusion reste théorique. Les vrais fonds responsables publient leurs seuils.",
    },
    {
      question: "Le « voting record » d'un fonds permet de vérifier…",
      options: [
        "Sa rentabilité.",
        "Comment le fonds exerce ses droits de vote en AG.",
        "Le nombre de souscripteurs.",
        "La fiscalité applicable.",
      ],
      correctIndex: 1,
      explanation:
        "Un fonds qui ne vote jamais contre les mauvaises pratiques n'a pas d'influence réelle sur les entreprises détenues.",
    },
  ],
};
