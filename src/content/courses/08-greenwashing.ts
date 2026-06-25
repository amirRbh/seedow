import type { Course } from "./types";

export const course: Course = {
  slug: "greenwashing-6-signaux",
  number: 8,
  track: "esg",
  level: "debutant",
  isFree: false,
  readingMinutes: 7,
  title: "Greenwashing : 6 signaux d'alerte sur un fonds « vert »",
  eyebrow: "ESG · Vigilance",
  description:
    "Comment distinguer un fonds réellement aligné avec ses promesses d'un fonds qui surfe sur la vague verte. Six signaux concrets à vérifier en 10 minutes.",
  intro:
    "« Durable », « responsable », « impact », « transition » : ces mots ne sont protégés par aucune loi. N'importe quel fonds peut s'en parer. Voici six signaux qui séparent le sérieux du marketing.",
  sections: [
    {
      heading: "Signal n°1 — Le nom est plus vert que le contenu",
      paragraphs: [
        "Un fonds nommé « Climat Avenir » qui détient 8 % de pétroliers et 6 % de mines de charbon n'est pas un fonds climat. Toujours ouvrir le reporting et regarder les 10 premières lignes.",
        "Si les premières positions ressemblent à un indice généraliste, c'est un indice généraliste avec un nom marketing.",
      ],
    },
    {
      heading: "Signal n°2 — Aucune exclusion sectorielle claire",
      paragraphs: [
        "Un fonds responsable digne de ce nom exclut des secteurs : armes controversées, tabac, charbon thermique, sables bitumineux. Si la politique d'exclusion est floue ou inexistante, c'est un signal.",
        "Vérifier les seuils : « exclusion du charbon » à 30 % du chiffre d'affaires laisse passer beaucoup d'entreprises encore très exposées.",
      ],
    },
    {
      heading: "Signal n°3 — Pas d'objectifs chiffrés",
      paragraphs: [
        "Un fonds sérieux affiche des objectifs mesurables : intensité carbone en baisse de X % vs l'indice, alignement avec une trajectoire 1,5°C, % d'entreprises avec objectifs SBTi validés.",
        "Une promesse « investir dans l'avenir durable » sans chiffres n'engage à rien.",
      ],
    },
    {
      heading: "Signal n°4 — Label opaque ou auto-déclaré",
      paragraphs: [
        "ISR, Greenfin, Towards Sustainability : ce sont des labels avec cahiers des charges publics. Un « label » créé par la société de gestion elle-même n'est pas un label, c'est une auto-évaluation.",
        "Article 8 ou 9 (SFDR) ≠ label. Ce sont des classifications déclaratives — utiles, mais à confronter aux pratiques réelles.",
      ],
      callout:
        "Le greenwashing prospère sur l'asymétrie d'information. 10 minutes de lecture du reporting suffisent souvent à le détecter.",
    },
    {
      heading: "Signal n°5 — Engagement actionnarial nul",
      paragraphs: [
        "Une stratégie d'impact crédible engage les entreprises détenues : vote en AG, dialogue, escalade. Si le rapport annuel ne mentionne aucune résolution votée ni dialogue mené, le fonds est passif.",
        "Détenir des actions d'une entreprise polluante sans jamais lui parler, ce n'est pas de la transition. C'est juste de la détention.",
      ],
    },
    {
      heading: "Signal n°6 — Frais élevés justifiés par « l'analyse extra-financière »",
      paragraphs: [
        "Certains fonds ESG facturent 1,8 à 2,5 % par an en arguant du coût de la recherche ESG. En face, un ETF ESG large peut afficher 0,2 %.",
        "Payer plus pour une vraie sélection et un engagement actif peut se défendre. Payer plus pour un indice quasiment identique repeint en vert, non.",
      ],
    },
  ],
  keyTakeaways: [
    "Ouvrir le reporting et lire les 10 premières positions.",
    "Vérifier les exclusions sectorielles et leurs seuils.",
    "Exiger des objectifs chiffrés et datés.",
    "Distinguer labels publics et auto-déclarations.",
    "Engagement actionnarial documenté = signal positif.",
    "Frais élevés doivent être justifiés par une démarche réellement active.",
  ],
  quiz: [
    {
      question: "Article 9 SFDR est…",
      options: [
        "Un label officiel délivré par l'AMF.",
        "Une classification déclarative européenne — utile mais pas une garantie.",
        "Un type d'obligation verte.",
        "Une norme comptable.",
      ],
      correctIndex: 1,
      explanation: "SFDR = classification déclarative. À confronter aux pratiques réelles.",
    },
    {
      question: "Premier réflexe pour évaluer un fonds « durable » ?",
      options: [
        "Regarder le nom.",
        "Lire la brochure marketing.",
        "Ouvrir le reporting et regarder les 10 premières positions.",
        "Demander à son banquier.",
      ],
      correctIndex: 2,
      explanation: "Le contenu réel se voit dans les positions détenues, pas dans le nom.",
    },
    {
      question: "Un fonds qui détient une entreprise polluante mais ne lui parle jamais…",
      options: [
        "Fait de l'engagement actionnarial.",
        "Fait simplement de la détention passive.",
        "A le droit de se déclarer Article 9.",
        "Garantit la transition.",
      ],
      correctIndex: 1,
      explanation:
        "L'engagement actionnarial demande votes, dialogue, escalade — documenté dans le rapport annuel.",
    },
    {
      question: "Frais à 2 % vs ETF ESG à 0,2 % : la prime est justifiée si…",
      options: [
        "Le nom du fonds est plus vendeur.",
        "Le fonds pratique une sélection active et un engagement documenté.",
        "Le gérant est connu.",
        "Toujours justifiée.",
      ],
      correctIndex: 1,
      explanation:
        "Payer plus n'a de sens que si on achète une démarche réellement active, pas un quasi-indice.",
    },
  ],
};
