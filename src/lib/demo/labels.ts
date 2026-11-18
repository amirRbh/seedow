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
  // Sous-industries GICS publiées par les ETF thématiques américains.
  "Renewable Electricity": "Électricité renouvelable",
  "Electric Utilities": "Électricité (services publics)",
  "Heavy Electrical Equipment": "Équipements électriques lourds",
  "Electrical Components & Equipment": "Composants et équipements électriques",
  Semiconductors: "Semi-conducteurs",
  "Semiconductor Equipment": "Équipements pour semi-conducteurs",
  "Oil & Gas Refining & Marketing & Transportation":
    "Pétrole et gaz : raffinage, distribution, transport",
  "Construction & Engineering": "Construction et ingénierie",
  "Independent Power Producers & Energy Traders": "Producteurs indépendants d'électricité",
  Steel: "Acier",
  "Industrial Machinery & Supplies & Components": "Machines et composants industriels",
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
  Israel: "Israël",
  Portugal: "Portugal",
  Ireland: "Irlande",
  Other: "Autres",
  "Cash and/or Derivatives": "Liquidités et dérivés",
};

export function sectorLabel(label: string, lang: string): string {
  return lang === "fr" ? (SECTOR_FR[label] ?? label) : label;
}

export function countryLabel(label: string, lang: string): string {
  return lang === "fr" ? (COUNTRY_FR[label] ?? label) : label;
}

/** « iShares Core MSCI World UCITS ETF » → « Core MSCI World ». */
export function shortFundName(name: string): string {
  return name
    .replace(/^iShares\s+/i, "")
    .replace(/\s+UCITS ETF.*$/i, "")
    .trim();
}

/** Libellé SFDR déclaré par l'émetteur, traduit (« Other » = ni 8 ni 9). */
export function sfdrLabel(
  declared: string | null,
  t: (k: string, o?: Record<string, unknown>) => string,
): string {
  if (!declared) return t("fin.sfdr.unknown");
  const m = /article\s*(8|9|6)/i.exec(declared);
  if (m) return t("fin.sfdr.article", { n: m[1] });
  if (/other/i.test(declared)) return t("fin.sfdr.other");
  return declared;
}
