import type { Course } from "./types";

export const course: Course = {
  slug: "exclusions-sectorielles",
  number: 10,
  track: "esg",
  level: "debutant",
  isFree: false,
  readingMinutes: 6,
  title: "Exclusions sectorielles : armes, tabac, énergies fossiles",
  eyebrow: "ESG · Filtres",
  description:
    "L'outil le plus simple — et le plus mal exécuté — de l'investissement responsable. Quelles exclusions sont strictes, lesquelles sont symboliques.",
  intro:
    "Exclure un secteur, c'est le premier geste de l'investissement responsable. C'est aussi le geste le plus facile à mal faire : un seuil trop laxiste, et l'exclusion devient cosmétique.",
  sections: [
    {
      heading: "Les exclusions historiques",
      paragraphs: [
        "Armes controversées (mines antipersonnel, bombes à sous-munitions, armes biologiques et chimiques) : exclusion quasi universelle, souvent imposée par traités internationaux.",
        "Tabac : exclusion fréquente mais pas systématique. Souvent calibrée sur un seuil de chiffre d'affaires (10 % ou 5 %).",
      ],
    },
    {
      heading: "Énergies fossiles : la zone grise",
      paragraphs: [
        "Beaucoup de fonds annoncent exclure « le charbon » sans préciser le seuil. Une exclusion à 30 % de chiffre d'affaires charbon laisse passer la plupart des majors énergétiques diversifiées.",
        "Les exclusions sérieuses se font à 1 % ou 5 % de revenus issus du charbon thermique, plus une interdiction de l'expansion (nouveaux projets de mines ou de centrales).",
      ],
      callout:
        "Le seuil compte autant que l'intitulé. « Exclusion charbon » sans chiffre = à creuser. Avec « < 5 % CA + pas d'expansion » = sérieux.",
    },
    {
      heading: "Autres exclusions courantes",
      paragraphs: [
        "Jeux d'argent, pornographie, alcool : exclusions présentes dans certains fonds (notamment confessionnels), variables selon les sensibilités.",
        "Pesticides controversés, fast fashion, sables bitumineux, élevage industriel : exclusions plus récentes, peu standardisées, à creuser au cas par cas.",
      ],
    },
    {
      heading: "Limites de l'exclusion",
      paragraphs: [
        "L'exclusion seule ne suffit pas à avoir un impact. Vendre des actions d'une entreprise polluante ne la fait pas changer — un autre acheteur la prend. L'exclusion doit s'accompagner d'une démarche d'engagement ou de financement positif.",
        "Mais l'exclusion a un effet symbolique et de réputation : un secteur exclu par massivement par les fonds finit par voir son coût de capital augmenter, ce qui peut accélérer sa transformation.",
      ],
    },
  ],
  keyTakeaways: [
    "Armes controversées : exclusion quasi universelle.",
    "Tabac : exclusion fréquente, à vérifier sur seuil.",
    "Charbon : seuil < 5 % CA + pas d'expansion = sérieux.",
    "Exclusion seule ≠ impact : à combiner avec engagement ou financement positif.",
    "Effet collectif : augmenter le coût du capital des secteurs sortants.",
  ],
  quiz: [
    {
      question: "Un fonds annonce « exclusion du charbon ». Que vérifiez-vous ?",
      options: [
        "Rien, c'est suffisant.",
        "Le seuil de chiffre d'affaires retenu.",
        "Le nom du gérant.",
        "Le pays du fonds.",
      ],
      correctIndex: 1,
      explanation: "Sans seuil, l'exclusion peut être quasi cosmétique. 5 % CA + non-expansion = sérieux.",
    },
    {
      question: "Les armes controversées incluent…",
      options: [
        "Toutes les armes à feu.",
        "Mines antipersonnel, bombes à sous-munitions, armes biologiques et chimiques.",
        "Uniquement les armes nucléaires.",
        "Les couteaux de cuisine.",
      ],
      correctIndex: 1,
      explanation: "Catégorie définie par traités internationaux : exclusion quasi universelle.",
    },
    {
      question: "Exclure un secteur a-t-il un impact direct sur celui-ci ?",
      options: [
        "Oui, immédiat.",
        "Pas directement, mais collectivement cela peut augmenter son coût de capital.",
        "Non, aucun effet.",
        "Uniquement sur les obligations.",
      ],
      correctIndex: 1,
      explanation:
        "Vendre ses actions ne change pas l'entreprise immédiatement, mais l'effet de masse renchérit son financement.",
    },
    {
      question: "Exclusion + engagement actionnarial, c'est…",
      options: [
        "Redondant.",
        "Une combinaison plus efficace qu'exclusion seule.",
        "Interdit par la réglementation.",
        "Réservé aux institutionnels.",
      ],
      correctIndex: 1,
      explanation:
        "Exclure les pires, dialoguer avec ceux qui peuvent encore évoluer : c'est la combinaison la plus crédible.",
    },
  ],
};
