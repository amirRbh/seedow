/**
 * SEEDOW LEXICON — "Le Jardin"
 * Vocabulaire centralisé : graines, jardin, racines.
 */

export const lexicon = {
  nav: {
    garden: "Jardin",
    roots: "Racines",
    discover: "Découvrir",
    ethi: "Ethi",
  },
  actions: {
    plant: "Planter",
    harvest: "Récolter",
    water: "Arroser",
    replant: "Replanter",
    compost: "Composter",
  },
  entities: {
    seed: "graine",
    seedPlural: "graines",
    seedling: "jeune pousse",
    plant: "plante",
    garden: "ton jardin",
    seed_initial: "graine originelle",
    soil: "terreau",
  },
  themes: {
    climat: { label: "Climat", icon: "☀️", desc: "Transition énergétique" },
    biodiversite: { label: "Biodiversité", icon: "🌿", desc: "Écosystèmes, forêts" },
    eau: { label: "Eau", icon: "💧", desc: "Ressource & accès" },
    social: { label: "Humain", icon: "🤝", desc: "Droits, travail" },
    governance: { label: "Éthique", icon: "⚖️", desc: "Gouvernance transparente" },
    circulaire: { label: "Circulaire", icon: "♻️", desc: "Zéro déchet" },
    tech: { label: "Tech propre", icon: "🧠", desc: "IA responsable" },
  },
  status: {
    growing: "en croissance",
    dormant: "en dormance",
    struggling: "a soif",
    blooming: "en floraison",
    new: "jeune pousse",
  },
  labels: {
    total_value: "Valeur cultivée",
    invested: "Graines plantées",
    gain: "Croissance",
    impact_co2: "CO₂ évité",
    impact_trees: "Arbres équivalents",
    impact_energy: "Énergie verte",
    esg_score: "Score d'impact",
  },
} as const;

export type Lexicon = typeof lexicon;
