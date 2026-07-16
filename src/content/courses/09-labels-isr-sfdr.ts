import type { Course } from "./types";

export const course: Course = {
  slug: "labels-isr-greenfin-sfdr",
  number: 9,
  track: "esg",
  level: "intermediaire",
  isFree: false,
  readingMinutes: 13,
  title: "Labels ISR, Greenfin, Article 8/9 SFDR",
  eyebrow: "ESG · Réglementation",
  description:
    "Le maquis des labels et catégories de fonds durables : ce qu'ils garantissent vraiment, leurs critères, leurs limites.",
  intro:
    "ISR, Greenfin, Finansol, Article 8, Article 9, Towards Sustainability, B-Corp… Les labels se multiplient sans se ressembler. Voici l'inventaire des principaux, ce qu'ils contrôlent vraiment, et une hiérarchie de confiance.",
  eli5: "Imagine les étiquettes qu'on colle sur les aliments : bio, AOC, Label Rouge, sans gluten, Nutri-Score A. Chacune contrôle une chose différente, et le mot « naturel » n'est presque jamais garanti par personne. Pour les fonds « verts », c'est pareil : des labels très différents, avec des règles très différentes. Il faut savoir lequel garantit quoi.",
  sections: [
    {
      heading: "Le label ISR français (refondu en 2024)",
      paragraphs: [
        "Créé en 2016 par le Ministère de l'Économie. Longtemps critiqué pour son laxisme : il a pu être attribué à des fonds détenant TotalEnergies en première ligne. Refonte fin 2023 / début 2024 : critères durcis.",
        "Nouveaux critères : exclusion des entreprises avec plus de 5 % de CA fossile non conventionnel (charbon, sables bitumineux, gaz de schiste), exclusion du tabac, alignement transition climatique exigé pour les énergéticiens conservés, suppression des 20 % moins-disants (best-in-universe).",
        "Conséquence : environ 20 % des fonds labellisés avant 2024 ont perdu le label. C'est désormais un signal plus fiable, sans être un gage absolu d'engagement. Le label est gratuit, ce qui facilite son adoption.",
      ],
      callout:
        "Vérifier la date d'obtention du label ISR. Un fonds labellisé pour la première fois après mars 2024 a satisfait les nouveaux critères. Un fonds labellisé avant doit avoir été renouvelé sous ces nouvelles règles.",
    },
    {
      heading: "Le label Greenfin (anciennement TEEC)",
      paragraphs: [
        "Plus strict que l'ISR sur le volet environnemental. Géré par le Ministère de la Transition écologique. Exclut totalement les énergies fossiles (y compris le gaz « transition ») et le nucléaire.",
        "Cible obligatoire : 75 % minimum du portefeuille dans des activités de transition écologique (énergies renouvelables, efficacité énergétique, transports propres, bâtiments verts, économie circulaire).",
        "Peu de fonds le portent (< 100 en France), souvent thématiques (infrastructures vertes, immobilier vert). Label le plus exigeant côté E, mais univers d'investissement étroit et concentré.",
      ],
    },
    {
      heading: "Le label Finansol (finance solidaire)",
      paragraphs: [
        "Label différent : il certifie des produits d'épargne solidaire qui financent des projets à fort impact social ou environnemental (insertion par l'emploi, logement social, agriculture bio, énergies renouvelables locales).",
        "Mécanique typique : 5 à 10 % du fonds investi directement dans des entreprises solidaires non cotées, le reste sur des supports classiques ou ESG. Option « 100 % solidaire » aussi possible.",
        "Univers très réduit, performance souvent inférieure aux marchés (les actifs solidaires non cotés rapportent moins). C'est un choix de cohérence éthique, pas d'optimisation financière.",
      ],
    },
    {
      heading: "SFDR : la classification européenne (Article 6, 8, 9)",
      paragraphs: [
        "SFDR (Sustainable Finance Disclosure Regulation) impose depuis 2021 à tous les fonds vendus en Europe de se classer.",
        "Article 6 : pas d'objectif ESG particulier. Article 8 : promeut des caractéristiques ESG (« light green »). Article 9 : a un objectif explicite d'investissement durable (« dark green »).",
        "Limite : la définition d'Article 8 est très large. Presque tous les fonds européens s'y placent (~50 % de l'encours total). Article 9 est plus restrictif, mais beaucoup ont été reclassés Article 8 en 2023 par prudence après controverses.",
      ],
      callout:
        "SFDR Article 8 ne dit presque rien sur la qualité ESG d'un fonds : c'est devenu une norme de marché, pas une distinction. Article 9 reste plus engageant mais la définition est en débat.",
    },
    {
      heading: "Hiérarchie de confiance pratique",
      paragraphs: [
        "1. Greenfin → engagement environnemental fort, univers étroit.",
        "2. ISR refondu (après 2024) → engagement modéré, univers large, refus crédible des fossiles non conventionnels.",
        "3. Article 9 SFDR → objectif durable explicite, mais à vérifier individuellement.",
        "4. Article 8 SFDR → minimum syndical, ne vaut que comme point de départ.",
        "5. Pas de label, pas d'Article → soit un fonds très récent, soit pas du tout positionné ESG.",
      ],
    },
    {
      heading: "Autres labels européens à connaître",
      paragraphs: [
        "Towards Sustainability (Belgique) : créé en 2019, exigeant, exclusions sectorielles claires. Adopté par certains acteurs internationaux.",
        "Nordic Swan Ecolabel (Scandinavie) : très exigeant côté E, peu courant en France.",
        "B-Corp : label d'entreprise (et non de fonds) qui certifie une gestion durable globale. Quelques sociétés de gestion européennes sont B-Corp.",
        "Febelfin (Belgique) et FNG-Siegel (Allemagne, Autriche, Suisse) : labels nationaux avec exigences variables.",
      ],
    },
    {
      heading: "Cas pratique : décoder une étiquette",
      paragraphs: [
        "Fonds A : Article 8 SFDR, pas de label national. → engagement minimal, à vérifier ligne par ligne.",
        "Fonds B : Article 8 + label ISR refondu (2024). → engagement modéré crédible, exclusions fossiles non conventionnelles.",
        "Fonds C : Article 9 + Greenfin. → engagement fort sur l'environnement, univers étroit (renouvelables, transition).",
        "Fonds D : « Sustainable Growth Fund », ni label ni Article 9, frais 2,2 %. → marketing pur, à éviter pour qui cherche du sérieux.",
      ],
    },
  ],
  keyTakeaways: [
    "Label ISR (refondu 2024) = engagement modéré crédible, univers large.",
    "Greenfin = engagement environnemental fort, univers étroit.",
    "Finansol = finance solidaire, performance souvent inférieure.",
    "Article 8 SFDR = minimum syndical européen (~50 % de l'encours).",
    "Article 9 SFDR = objectif durable explicite, à vérifier individuellement.",
    "Combinaison label national + Article 9 = signal le plus fiable.",
    "Aucun label = aucune validation externe, à examiner sans a priori.",
  ],
  advanced: [
    "Référentiel ISR 2024 : 5 piliers (objectifs, méthode, gestion, engagement, transparence) + exclusions minimales harmonisées + audit tiers indépendant (Afnor, EY, Deloitte).",
    "SFDR Level 2 (RTS, janvier 2023) : templates précontractuels et rapports périodiques obligatoires pour Art. 8/9 avec PAI quantifiés.",
    "Reclassement massif Art. 9 → Art. 8 fin 2022 : ~40 % des encours Art. 9 européens reclassés, souvent par prudence face à la définition « 100 % sustainable investments ».",
    "Label Relance (France, 2020) : soutien PME/ETI post-Covid, critères ESG minimalistes, à ne pas confondre avec ISR.",
    "Révision SFDR en cours (consultation Commission 2024) : possible passage vers un système de catégorisation orienté impact (produits « transition », « sustainable », « exclusion »).",
  ],
  quiz: [
    {
      question: "Le label ISR refondu en 2024 exclut désormais…",
      options: [
        "Toutes les actions cotées.",
        "Les entreprises avec > 5 % de CA fossile non conventionnel et le tabac.",
        "Uniquement le tabac.",
        "Uniquement le secteur bancaire.",
      ],
      correctIndex: 1,
      explanation:
        "Refonte 2024 : exclusion charbon, pétrole/gaz non conventionnels, tabac. Plus crédible qu'avant.",
    },
    {
      question: "Le label Greenfin exclut totalement…",
      options: [
        "Le secteur tech.",
        "Les énergies fossiles ET le nucléaire.",
        "Les entreprises françaises.",
        "Les ETF.",
      ],
      correctIndex: 1,
      explanation:
        "Greenfin = pas de fossiles, pas de nucléaire. C'est le label environnemental le plus strict.",
    },
    {
      question: "Article 8 SFDR signifie…",
      options: [
        "Fonds garanti vert.",
        "Fonds qui promeut des caractéristiques ESG (engagement large et flou).",
        "Fonds réservé aux experts.",
        "Fonds 100 % obligataire.",
      ],
      correctIndex: 1,
      explanation:
        "Article 8 est très large et représente la moitié de l'encours européen. Ne suffit pas à valider l'engagement.",
    },
    {
      question: "Hiérarchie de confiance pour un investisseur attentif ?",
      options: [
        "Article 8 > ISR > Greenfin",
        "Greenfin > ISR refondu > Article 9 > Article 8",
        "B-Corp > Article 8 > Greenfin",
        "Aucun label ne vaut rien.",
      ],
      correctIndex: 1,
      explanation:
        "Greenfin > ISR refondu > Article 9 > Article 8. À combiner avec un audit ligne par ligne.",
    },
    {
      question: "Finansol certifie principalement…",
      options: [
        "Des fonds boursiers verts.",
        "Des produits d'épargne solidaire à fort impact social.",
        "Des assurances-vie.",
        "Des cryptomonnaies.",
      ],
      correctIndex: 1,
      explanation:
        "Finansol = finance solidaire (insertion, logement, agriculture bio, etc.). Logique d'impact, pas d'optimisation.",
    },
    {
      question: "Pourquoi beaucoup de fonds Article 9 ont été reclassés Article 8 en 2023 ?",
      options: [
        "Pour augmenter les frais.",
        "Par prudence après des controverses sur la définition d'« objectif durable ».",
        "Parce que la réglementation a disparu.",
        "Pour les rendre obligatoires.",
      ],
      correctIndex: 1,
      explanation:
        "La définition floue d'Article 9 et le risque de greenwashing ont poussé de nombreux gérants à se rétrograder par prudence juridique.",
    },
  ],
};
