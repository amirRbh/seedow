import type { Course } from "./types";

export const course: Course = {
  slug: "labels-isr-greenfin-sfdr",
  number: 9,
  track: "esg",
  level: "intermediaire",
  isFree: false,
  readingMinutes: 8,
  title: "Labels ISR, Greenfin, Article 8/9 SFDR",
  eyebrow: "ESG · Labels",
  description:
    "Quatre étiquettes qui ne disent pas la même chose. Ce que chacune garantit vraiment, et celles qui sont les plus exigeantes.",
  intro:
    "Le marché de l'investissement responsable a multiplié les labels. Tous n'ont pas la même rigueur. On les décortique un par un, du plus permissif au plus exigeant.",
  sections: [
    {
      heading: "ISR (France)",
      paragraphs: [
        "Label public français créé en 2016, refondu en 2024 pour devenir plus exigeant. Depuis 2024, exclusion obligatoire du charbon et des nouveaux projets fossiles. Le label couvre désormais des centaines de fonds.",
        "Force : très répandu, accessible aux particuliers via la plupart des assurances-vie. Limite : reste large dans ses exclusions par rapport à des labels plus thématiques.",
      ],
    },
    {
      heading: "Greenfin (France)",
      paragraphs: [
        "Label public français orienté transition écologique. Exclut strictement les fossiles, le nucléaire, et impose un pourcentage minimum de fonds investi dans des activités écologiques (énergies renouvelables, efficacité énergétique, transport propre…).",
        "Plus exigeant qu'ISR sur la dimension verte, mais plus restreint en nombre de fonds disponibles.",
      ],
    },
    {
      heading: "Article 8 SFDR (UE)",
      paragraphs: [
        "Classification européenne déclarative pour les fonds qui « promeuvent » des caractéristiques environnementales ou sociales. Très large : un fonds qui exclut seulement les armes controversées peut être Article 8.",
        "Utile comme premier filtre, insuffisant comme garantie d'impact.",
      ],
    },
    {
      heading: "Article 9 SFDR (UE)",
      paragraphs: [
        "Classification européenne pour les fonds qui ont un « objectif d'investissement durable » comme objectif principal. Plus exigeant qu'Article 8, avec obligations de mesure et de reporting.",
        "Attention : beaucoup de fonds ont été rétrogradés d'Article 9 vers Article 8 en 2023 quand les critères ont été précisés. Vérifier la classification actuelle, pas l'historique.",
      ],
      callout:
        "Aucun label n'est suffisant seul. Croiser label + reporting + exclusions documentées + engagement actionnarial.",
    },
    {
      heading: "Comment les classer en exigence",
      paragraphs: [
        "Du plus permissif au plus exigeant (en général) : Article 8 < ISR (post-2024) < Article 9 < Greenfin sur la dimension climat. Mais c'est une approximation : un fonds Article 9 mal sélectionné peut être moins crédible qu'un Article 8 sérieux.",
        "Le label est un point d'entrée, pas une conclusion. La vraie analyse se fait sur les positions, la politique d'exclusion, les objectifs chiffrés, et l'engagement.",
      ],
    },
  ],
  keyTakeaways: [
    "ISR : large, refondu en 2024 avec exclusion charbon/fossiles nouveaux.",
    "Greenfin : exigeant sur le climat, exclut nucléaire et fossiles.",
    "Article 8 SFDR : déclaratif, très large.",
    "Article 9 SFDR : plus exigeant, objectif durable principal.",
    "Aucun label ne dispense de lire le reporting.",
  ],
  quiz: [
    {
      question: "Quel label exclut strictement le nucléaire ?",
      options: ["ISR", "Greenfin", "Article 8 SFDR", "Aucun"],
      correctIndex: 1,
      explanation: "Greenfin exclut nucléaire et énergies fossiles.",
    },
    {
      question: "Article 8 SFDR garantit-il qu'un fonds a un impact environnemental positif ?",
      options: ["Oui", "Non, c'est une classification déclarative large", "Uniquement en France", "Seulement depuis 2024"],
      correctIndex: 1,
      explanation: "Article 8 = promotion de caractéristiques ESG, pas objectif durable principal.",
    },
    {
      question: "Pourquoi beaucoup de fonds sont passés d'Article 9 à Article 8 en 2023 ?",
      options: [
        "Parce qu'ils ont changé de gérant.",
        "Parce que les critères Article 9 ont été précisés, rendant la classification plus exigeante.",
        "Parce que la France a changé sa réglementation.",
        "Parce que les frais étaient trop élevés.",
      ],
      correctIndex: 1,
      explanation:
        "L'UE a précisé en 2022-2023 ce qu'implique un « objectif d'investissement durable ». Beaucoup de fonds ne tenaient plus la définition.",
    },
    {
      question: "Pour évaluer un fonds responsable, on doit…",
      options: [
        "Se fier exclusivement au label.",
        "Croiser label, positions réelles, exclusions, engagement.",
        "Demander à son conseiller.",
        "Choisir le plus gros fonds disponible.",
      ],
      correctIndex: 1,
      explanation: "Le label est un point d'entrée, jamais une conclusion.",
    },
  ],
};
