/**
 * Parseur générique du bloc « Sustainability Characteristics » (données MSCI ESG)
 * présent, sous une forme largement standardisée par MSCI, sur les fiches produit
 * de plusieurs émetteurs (Amundi, Vanguard…). Étend le parseur iShares
 * (`factsheet-parser`) avec deux champs que ces fiches exposent aussi :
 * l'article SFDR et les frais courants (TER).
 *
 * Contrat de transparence (§1.2) : on n'extrait QUE ce qui est réellement présent
 * dans le texte — un champ absent reste `null`, jamais de valeur inventée.
 *
 * Fonctions pures (aucune I/O). Les libellés MSCI étant normalisés, on tolère les
 * variantes de casse, d'espacement et de ponctuation d'un émetteur à l'autre.
 *
 * ⚠️ Les regex modélisent les libellés MSCI/SFDR standards. Avant d'ACTIVER un
 * connecteur en production, valider le parsing sur des documents officiels réels
 * de l'émetteur (le cœur testable ici reste `parseMsciSustainability`).
 */

import { clampWaci, normalizeItr, usDateToIso } from "./factsheet-parser";

export interface ParsedSustainability {
  /** Note MSCI ESG (AAA..CCC), ou null. */
  msciRating: string | null;
  /** Score de qualité ESG MSCI (0-10), ou null. */
  qualityScore: number | null;
  /** Score ESG global 0-100 = qualityScore × 10, ou null. */
  esgScore: number | null;
  /** WACI tCO₂e/M$ de CA, borné par `clampWaci`, ou null. */
  waci: number | null;
  /** Implied Temperature Rise normalisé (ex. ">2.5-3.0°C"), ou null. */
  impliedTempRise: string | null;
  /** Article SFDR ∈ {6,8,9}, ou null. */
  sfdrArticle: number | null;
  /** Frais courants en FRACTION (0.002 = 0,20 %), ou null. */
  ter: number | null;
  /** Date « as of » de la donnée MSCI, ISO YYYY-MM-DD, ou null. */
  asOf: string | null;
}

function firstMatch(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? m[1] : null;
}

function toNumber(s: string | null): number | null {
  if (s == null) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Article SFDR déclaré : « SFDR … Article 8 » ou « Article 9 (SFDR) ». */
export function parseSfdrArticle(text: string): number | null {
  const near =
    firstMatch(text, /SFDR[^\n]*?Article\s*(6|8|9)\b/i) ??
    firstMatch(text, /Article\s*(6|8|9)\b[^\n]*?SFDR/i);
  const n = toNumber(near);
  return n === 6 || n === 8 || n === 9 ? n : null;
}

/**
 * Frais courants → fraction. Couvre les libellés usuels UCITS : « Ongoing
 * Charges », « OCF », « TER », « Total Expense Ratio », « Frais courants ».
 * Renvoie null si absent ou hors bornes plausibles (0 ≤ TER ≤ 10 %).
 */
export function parseTerFraction(text: string): number | null {
  const pct = toNumber(
    firstMatch(
      text,
      /(?:Ongoing Charges?(?: Figure)?|Ongoing Charge \(OCF\)|\bOCF\b|\bTER\b|Total Expense Ratio|Frais courants)\s*(?:\(OCF\))?\s*[:-]?\s*([\d.,]+)\s*%/i,
    ),
  );
  if (pct == null) return null;
  const frac = pct / 100;
  return frac >= 0 && frac <= 0.1 ? frac : null;
}

/**
 * WACI robuste aux mises en page : d'abord le libellé avec unité
 * (« (Tons CO2E/$M SALES) 69.03 »), sinon on repère l'en-tête « Weighted Average
 * Carbon Intensity » et on lit sur les lignes voisines le seul nombre qui n'est
 * PAS un pourcentage (le % est le taux de couverture, jamais l'intensité).
 */
function parseWaci(text: string): number | null {
  const labelled = clampWaci(
    toNumber(firstMatch(text, /\(Tons? CO2E\/\$?M\s*SALES\)\s+([\d.,]+)/i)),
  );
  if (labelled != null) return labelled;

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/Weighted Average Carbon Intensity/i.test(lines[i])) continue;
    if (lines[i].includes(":")) continue; // ligne de glossaire
    for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
      const nums = [...lines[j].matchAll(/(\d[\d,]*(?:\.\d+)?)(%?)/g)];
      const plain = nums.filter((m) => m[2] !== "%");
      if (plain.length === 1) {
        const n = Number(plain[0][1].replace(/,/g, ""));
        if (Number.isFinite(n)) return clampWaci(n);
      }
    }
  }
  return null;
}

/** Date « as of » MSCI : accepte MM/DD/YYYY (US) ou déjà ISO YYYY-MM-DD. */
function parseAsOf(text: string): string | null {
  const us = firstMatch(text, /MSCI ESG (?:Fund )?Ratings? as of\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const iso = usDateToIso(us);
  if (iso) return iso;
  return firstMatch(text, /MSCI ESG (?:Fund )?Ratings? as of\s+(\d{4}-\d{2}-\d{2})/i);
}

/**
 * Parse le bloc « Sustainability Characteristics » d'une fiche émetteur.
 * Tous les champs sont indépendants : un champ absent reste null.
 */
export function parseMsciSustainability(text: string): ParsedSustainability {
  const rating = firstMatch(
    text,
    /MSCI ESG (?:Fund )?Rating\s*\(?AAA-?CCC\)?\s*[:-]?\s*(AAA|AA|A|BBB|BB|B|CCC)\b/i,
  );
  const quality = toNumber(
    firstMatch(text, /MSCI ESG Quality Score\s*\(?0-?10\)?\s*[:-]?\s*([\d.]+)/i),
  );

  return {
    msciRating: rating,
    qualityScore: quality,
    esgScore: quality != null ? Math.round(quality * 10 * 10) / 10 : null,
    waci: parseWaci(text),
    impliedTempRise: normalizeItr(
      firstMatch(text, /Implied Temperature Rise\s*\(?0-3\.0\+?\s*°?C\)?\s*[:-]?\s*([^\n]+)/i),
    ),
    sfdrArticle: parseSfdrArticle(text),
    ter: parseTerFraction(text),
    asOf: parseAsOf(text),
  };
}
