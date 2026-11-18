/**
 * Libellés publiés par l'émetteur (en anglais, nomenclature GICS et pays)
 * traduits pour l'affichage. La valeur source n'est jamais modifiée : seule
 * sa présentation change, et un libellé inconnu est affiché tel quel.
 */
const SECTOR_FR: Record<string, string> = {
  "Information Technology": "Technologies de l'information",
  Financials: "Finance",
  Industrials: "Industrie",
  "Health Care": "Santé",
  "Consumer Discretionary": "Consommation discrétionnaire",
  Communication: "Communication",
  "Communication Services": "Communication",
  "Consumer Staples": "Consommation de base",
  Energy: "Énergie",
  Materials: "Matériaux",
  Utilities: "Services aux collectivités",
  "Real Estate": "Immobilier",
  "Cash and/or Derivatives": "Liquidités et dérivés",
  Treasury: "Obligations d'État (Trésor US)",
  Treasuries: "Obligations d'État (Trésor US)",
  Other: "Autres",
};

const COUNTRY_FR: Record<string, string> = {
  "United States": "États-Unis",
  Japan: "Japon",
  "United Kingdom": "Royaume-Uni",
  Canada: "Canada",
  Switzerland: "Suisse",
  France: "France",
  Germany: "Allemagne",
  Australia: "Australie",
  Netherlands: "Pays-Bas",
  China: "Chine",
  Taiwan: "Taïwan",
  India: "Inde",
  Korea: "Corée du Sud",
  "Korea (South)": "Corée du Sud",
  Brazil: "Brésil",
  "Saudi Arabia": "Arabie saoudite",
  "South Africa": "Afrique du Sud",
  Denmark: "Danemark",
  Spain: "Espagne",
  Italy: "Italie",
  Sweden: "Suède",
  "Hong Kong": "Hong Kong",
  Mexico: "Mexique",
  Other: "Autres",
  "Cash and/or Derivatives": "Liquidités et dérivés",
};

export function sectorLabel(label: string, lang: string): string {
  return lang === "fr" ? (SECTOR_FR[label] ?? label) : label;
}

export function countryLabel(label: string, lang: string): string {
  return lang === "fr" ? (COUNTRY_FR[label] ?? label) : label;
}
