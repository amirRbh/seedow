import type { Course } from "./types";

export const course: Course = {
  slug: "exclusions-sectorielles",
  number: 10,
  track: "esg",
  level: "debutant",
  isFree: false,
  readingMinutes: 11,
  title: "Exclusions sectorielles : armes, tabac, énergies fossiles",
  eyebrow: "ESG · Choix éthiques",
  description:
    "Quels secteurs sont communément exclus des fonds ESG, selon quels seuils, et avec quel impact sur le portefeuille.",
  intro:
    "L'exclusion sectorielle est l'approche la plus visible et la plus controversée de l'investissement responsable. Voici les secteurs typiquement exclus, les seuils utilisés, les débats actifs et les conséquences en termes de diversification.",
  eli5:
    "Imagine que tu invites 100 amis à un dîner, mais tu décides à l'avance : pas de fumeurs, pas de vendeurs d'armes, pas de tricheurs. Il te reste peut-être 70 amis à inviter. Pour un fonds, c'est pareil : « exclure un secteur », c'est décider de ne pas financer certaines entreprises, quelles que soient leurs performances. Selon combien tu exclus, ton portefeuille est plus étroit — ou beaucoup plus étroit.",
  sections: [
    {
      heading: "Exclusions normatives (quasi obligatoires)",
      paragraphs: [
        "Certaines exclusions viennent de conventions internationales et sont appliquées par la quasi-totalité des fonds européens, même non labellisés ESG.",
        "Armes controversées : mines antipersonnel (Convention d'Ottawa, 1997), bombes à sous-munitions (Convention d'Oslo, 2008), armes biologiques et chimiques. Standard de marché.",
        "Atteinte grave aux droits humains : travail forcé, travail des enfants, violations massives des droits fondamentaux. Critère subjectif mais en théorie présent partout.",
      ],
    },
    {
      heading: "Exclusions sectorielles classiques",
      paragraphs: [
        "Tabac : exclu par la majorité des fonds ISR, généralement à 0 % (toute production) ou < 5 % du CA. Secteur en déclin structurel, ce qui simplifie le débat.",
        "Charbon thermique : exclu progressivement, généralement à partir de 5 à 25 % de CA selon les fonds. Les seuils se durcissent chaque année.",
        "Pétrole et gaz non conventionnels (sables bitumineux, fracturation hydraulique, forages arctiques) : exclus par les fonds engagés, souvent < 5 % de CA.",
        "Armes conventionnelles (non controversées) : armée régulière, défense. Approche variable : certains excluent toute la défense, d'autres uniquement les ventes à des régimes problématiques.",
      ],
      callout:
        "« Pétrole et gaz classiques » (TotalEnergies, Shell, Equinor) ne sont pas toujours exclus, même par les fonds ISR. Les exclusions concernent surtout le charbon et les sources non conventionnelles.",
    },
    {
      heading: "Le débat sur l'armement",
      paragraphs: [
        "L'invasion de l'Ukraine en 2022 a relancé un débat majeur : peut-on financer une armée européenne pour défendre une démocratie tout en se déclarant ESG ?",
        "Position 1 (classique) : armement = exclusion par principe, indépendamment de l'usage.",
        "Position 2 (renouvelée depuis 2022) : la défense d'États démocratiques face à des agressions est compatible avec un cadre ESG. Plusieurs grandes sociétés de gestion ont assoupli leur position.",
        "Conséquence : certains fonds ESG détiennent désormais Rheinmetall, Thales ou BAE Systems. À chacun de décider si c'est cohérent avec ses valeurs.",
      ],
    },
    {
      heading: "Le débat sur le nucléaire",
      paragraphs: [
        "Nucléaire civil : longtemps exclu des fonds ESG par principe, redevenu accepté par certains depuis 2022-2023 sous l'angle « énergie bas carbone ».",
        "La taxonomie européenne a finalement classé le nucléaire en « activité de transition » sous conditions, ce qui a légitimé son inclusion dans certains fonds verts.",
        "Greenfin continue d'exclure totalement le nucléaire. ISR refondu ne l'exclut pas par principe. Article 9 SFDR : variable selon le fonds.",
      ],
      callout:
        "Nucléaire et armement sont les deux clivages majeurs actuels de l'ESG européen. Aucune position n'est universelle — chaque investisseur doit savoir où il place son curseur.",
    },
    {
      heading: "Autres exclusions parfois pratiquées",
      paragraphs: [
        "Jeux d'argent et casinos : exclus par certains fonds, surtout d'inspiration anglo-saxonne. Seuil typique 5 à 10 % de CA.",
        "Alcool : rarement exclu en Europe (sauf fonds confessionnels). Plus fréquent dans les fonds américains d'inspiration religieuse.",
        "Pornographie et adult entertainment : exclu par les fonds engagés, à 0 % généralement.",
        "Pesticides controversés, OGM, élevage intensif : exclusions émergentes, encore minoritaires.",
      ],
    },
    {
      heading: "Impact des exclusions sur la diversification",
      paragraphs: [
        "Exclure 5 à 10 % de l'univers d'investissement (charbon, armes controversées, tabac) a un impact quasi nul sur la diversification. La performance reste très proche d'un indice large.",
        "Exclure 20 à 30 % (toutes énergies fossiles, défense, nucléaire) commence à concentrer le portefeuille sur certains secteurs (tech, santé, conso non cyclique). Tracking error élevé vs MSCI World, volatilité parfois supérieure.",
        "Exclure plus de 50 % (Greenfin pur) revient à investir dans un univers thématique étroit, avec une volatilité spécifique et un horizon plus long requis.",
      ],
    },
    {
      heading: "Cas pratique : Salma construit ses exclusions",
      paragraphs: [
        "Salma définit ses lignes rouges : aucune entreprise du tabac, aucune énergie fossile, aucun armement (même conventionnel), aucun jeu d'argent.",
        "Elle filtre son univers : MSCI World ESG Leaders + filtre supplémentaire « no fossil fuels » + filtre « no defense ». Reste un univers d'environ 800 entreprises, principalement tech, santé, conso non cyclique, services.",
        "Impact attendu : tracking error de 4-6 % vs MSCI World, performance probablement supérieure en marché baissier sur l'énergie, inférieure si l'énergie surperforme. Volatilité comparable. Acceptable pour son horizon de 20 ans.",
      ],
    },
  ],
  keyTakeaways: [
    "Armes controversées et atteintes graves aux droits humains = exclusions standard.",
    "Tabac, charbon, fossiles non conventionnels = exclusions ESG courantes.",
    "Défense conventionnelle et nucléaire = débats actifs depuis 2022.",
    "Pétrole et gaz classiques pas toujours exclus, même en ISR.",
    "Seuils chiffrés (% de CA) sont la mesure clé.",
    "Exclusion < 10 % de l'univers : impact diversification négligeable.",
    "Exclusion > 30 % : tracking error et concentration significatifs.",
  ],
  advanced: [
    "Convention d'Ottawa (mines antipersonnel) : 164 États signataires ; exclusion FCPE/UCITS quasi-universelle en Europe.",
    "PAB (Paris-Aligned Benchmark) EU : exclusions minimales fossile (charbon > 1 %, pétrole > 10 %, gaz > 50 %), armes controversées, tabac, dommage climatique significatif.",
    "Screening quantitatif MSCI Business Involvement : seuils multi-critères par secteur avec granularité par filiale.",
    "Divestment vs engagement : littérature mixte, mais méta-études (Broccardo, Hart, Zingales 2022) plutôt en faveur de l'engagement actionnarial ciblé.",
    "Tracking error attendu d'un ESG Leaders vs parent : ~1-2 % ; d'un fossil-free : 2-4 % ; d'un thématique clean energy : 8-15 %.",
  ],
  quiz: [
    {
      question: "Quelle exclusion est devenue un standard quasi universel ?",
      options: [
        "Le secteur tech.",
        "Les armes controversées (mines antipersonnel, bombes à sous-munitions).",
        "Les entreprises françaises.",
        "Le secteur santé.",
      ],
      correctIndex: 1,
      explanation:
        "Conventions internationales (Ottawa, Oslo). Quasi tous les fonds européens les appliquent, ESG ou non.",
    },
    {
      question: "TotalEnergies est-il systématiquement exclu des fonds ISR ?",
      options: ["Oui, toujours.", "Non, pas toujours, selon les seuils retenus.", "Seulement aux États-Unis.", "Uniquement par Greenfin."],
      correctIndex: 1,
      explanation:
        "Pétrole conventionnel pas systématiquement exclu. Charbon et fossiles non conventionnels oui, mais pas TotalEnergies dans tous les fonds ISR.",
    },
    {
      question: "Depuis 2022, le débat sur l'armement a évolué…",
      options: [
        "Toutes les exclusions ont été levées.",
        "Certains fonds ESG acceptent désormais la défense d'États démocratiques.",
        "L'armement est devenu obligatoire dans les fonds.",
        "Aucun changement.",
      ],
      correctIndex: 1,
      explanation:
        "Invasion de l'Ukraine a recadré le débat. Position ESG sur la défense s'est assouplie chez plusieurs gérants.",
    },
    {
      question: "Le label Greenfin a une position quelle sur le nucléaire ?",
      options: [
        "Acceptation totale.",
        "Exclusion totale.",
        "Acceptation sous conditions.",
        "Pas d'avis.",
      ],
      correctIndex: 1,
      explanation:
        "Greenfin exclut le nucléaire par principe, contrairement à la taxonomie européenne récente.",
    },
    {
      question: "Exclure 5 % de l'univers d'investissement a un impact sur la performance…",
      options: [
        "Catastrophique.",
        "Quasi nul à long terme.",
        "Toujours positif.",
        "Imprévisible mais énorme.",
      ],
      correctIndex: 1,
      explanation:
        "Exclusions < 10 % gardent un univers très large. Performance attendue très proche d'un indice classique.",
    },
    {
      question: "Que regarder en priorité dans une politique d'exclusion ?",
      options: [
        "Le nombre de mots.",
        "Les seuils chiffrés (% de CA) appliqués à chaque secteur.",
        "La police de caractère.",
        "Le nom du gérant.",
      ],
      correctIndex: 1,
      explanation:
        "Sans seuils chiffrés (ex : exclusion à partir de 5 % de CA charbon), une politique reste théorique.",
    },
  ],
};
