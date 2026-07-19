/**
 * SEEDOW LEXICON — sobre & moderne
 * Vocabulaire financier épuré, avec quelques touches d'impact.
 */

export const lexicon = {
  nav: {
    portfolio: "Portefeuille",
    roots: "Analyse",
    discover: "Découvrir",
    ethi: "Ethi",
  },
  actions: {
    invest: "Investir",
    withdraw: "Retirer",
    deposit: "Verser",
    rebalance: "Rééquilibrer",
    arbitrate: "Arbitrer",
  },
  entities: {
    asset: "actif",
    assetPlural: "actifs",
    newAsset: "nouvel actif",
    holding: "ligne",
    portfolio: "ton portefeuille",
    initialCapital: "capital initial",
    balance: "solde",
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
    up: "en hausse",
    stable: "stable",
    down: "à surveiller",
    strongUp: "forte hausse",
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
