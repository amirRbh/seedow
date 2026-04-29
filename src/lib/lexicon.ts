/**
 * SEEDOW LEXICON — sobre & moderne
 * Vocabulaire financier épuré, avec quelques touches d'impact.
 */

export const lexicon = {
  nav: {
    garden: "Portefeuille",
    roots: "Détails",
    discover: "Découvrir",
    ethi: "Ethi",
  },
  actions: {
    plant: "Investir",
    harvest: "Retirer",
    water: "Verser",
    replant: "Rééquilibrer",
    compost: "Arbitrer",
  },
  entities: {
    seed: "actif",
    seedPlural: "actifs",
    seedling: "nouvel actif",
    plant: "ligne",
    garden: "ton portefeuille",
    seed_initial: "capital initial",
    soil: "solde",
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
    growing: "en hausse",
    dormant: "stable",
    struggling: "à surveiller",
    blooming: "forte hausse",
    new: "récent",
  },
  labels: {
    total_value: "Valeur actuelle",
    invested: "Capital investi",
    gain: "Performance",
    impact_co2: "CO₂ évité",
    impact_trees: "Arbres équivalents",
    impact_energy: "Énergie verte",
    esg_score: "Score d'impact",
  },
} as const;

export type Lexicon = typeof lexicon;
