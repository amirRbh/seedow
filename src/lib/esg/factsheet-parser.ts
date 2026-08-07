/**
 * Parseur de fiches produit iShares/BlackRock (section « Sustainability
 * Characteristics ») → données MSCI ESG structurées, avec provenance.
 *
 * Conçu pour être robuste au format texte de `pdftotext` : les libellés et
 * valeurs peuvent être sur la même ligne (mise en page 2 colonnes) ou le libellé
 * peut être coupé sur deux lignes. On cherche donc le nombre qui SUIT le
 * mot-clé, en tolérant espaces et sauts de ligne.
 *
 * Fonctions pures : aucune I/O. Le script d'ingestion (scripts/) fournit le
 * texte ; ici on n'extrait que ce qui est réellement présent (null sinon —
 * jamais de valeur inventée, contrat de transparence §1.2).
 */

export interface ParsedFundEsg {
  /** Note MSCI ESG (AAA..CCC). */
  msciRating: string | null;
  /** Score de qualité ESG MSCI (0-10). */
  qualityScore: number | null;
  /** Score ESG global 0-100 = qualityScore × 10. */
  esgScore: number | null;
  /** WACI tCO₂e/M$ de CA. */
  waci: number | null;
  /** Implied Temperature Rise normalisé (ex. ">2.5-3.0°C"). */
  impliedTempRise: string | null;
  /** Date « as of » de la donnée MSCI, ISO YYYY-MM-DD. */
  asOf: string | null;
}

/** Convertit une date MM/DD/YYYY en ISO YYYY-MM-DD, ou null. */
export function usDateToIso(us: string | null | undefined): string | null {
  if (!us) return null;
  const m = us.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const mm = m[1].padStart(2, "0");
  const dd = m[2].padStart(2, "0");
  return `${m[3]}-${mm}-${dd}`;
}

/** Normalise une bande ITR "> 2.5° - 3.0° C" → ">2.5-3.0°C". */
export function normalizeItr(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const range = raw.match(/(>?)\s*([\d.]+)\s*°?\s*-\s*([\d.]+)\s*°?\s*C/i);
  if (range) return `${range[1]}${range[2]}-${range[3]}°C`;
  const single = raw.match(/(>?)\s*([\d.]+)\s*°?\s*C/i);
  if (single) return `${single[1]}${single[2]}°C`;
  return null;
}

function firstMatch(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? m[1] : null;
}

/** WACI au-delà duquel on considère la valeur comme une erreur de parsing.
 *  Même les indices les plus carbonés (EM, matières premières) restent
 *  typiquement < 200 tCO₂e/M$ CA. Une green bond à 757 est donc impossible. */
const WACI_SANITY_MAX = 300;

function toNumber(s: string | null): number | null {
  if (s == null) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function clampWaci(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value < 0 || value >= WACI_SANITY_MAX) return null;
  return value;
}

/**
 * WACI en mise en page 2 colonnes (`pdftotext -layout`).
 *
 * Dans ce rendu, la valeur n'est PAS forcément après le libellé
 * « (Tons CO2E/$M SALES) » : selon la fiche, la colonne « % Coverage » est à
 * gauche ou à droite, et le nombre se trouve sur la ligne AU-DESSUS des deux
 * libellés. On repère donc le bloc par son en-tête, puis on lit sur les lignes
 * voisines le seul nombre qui n'est PAS un pourcentage — le pourcentage étant
 * le taux de couverture, jamais l'intensité carbone.
 */
function extractWaciFromLayout(text: string): number | null {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/MSCI Weighted Average Carbon Intensity/i.test(line)) continue;
    if (line.includes(":")) continue; // ligne de glossaire, pas de donnée
    for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
      const nums = [...lines[j].matchAll(/(\d[\d,]*(?:\.\d+)?)(%?)/g)];
      const plain = nums.filter((m) => m[2] !== "%");
      if (plain.length === 1) {
        const n = Number(plain[0][1].replace(/,/g, ""));
        if (Number.isFinite(n)) return n;
      }
    }
  }
  return null;
}

/**
 * Parse le texte d'une fiche iShares (idéalement `pdftotext -layout`).
 * Tous les champs sont indépendants : un champ absent reste null.
 */
export function parseISharesFactSheet(text: string): ParsedFundEsg {
  const rating = firstMatch(
    text,
    /MSCI ESG Fund Rating\s*\(AAA-CCC\)\s+(AAA|AA|A|BBB|BB|B|CCC)\b/i,
  );
  const quality = toNumber(firstMatch(text, /MSCI ESG Quality Score\s*\(0-10\)\s+([\d.]+)/i));
  const waci =
    clampWaci(toNumber(firstMatch(text, /\(Tons CO2E\/\$M SALES\)\s+([\d.,]+)/i))) ??
    clampWaci(extractWaciFromLayout(text));
  const itrRaw = firstMatch(text, /Implied Temperature Rise\s*\(0-3\.0\+\s*°C\)\s+([^\n]+)/i);

  const asOf = usDateToIso(
    firstMatch(text, /MSCI ESG Fund Ratings as of\s+(\d{1,2}\/\d{1,2}\/\d{4})/i),
  );

  return {
    msciRating: rating,
    qualityScore: quality,
    esgScore: quality != null ? Math.round(quality * 10 * 10) / 10 : null,
    waci,
    impliedTempRise: normalizeItr(itrRaw),
    asOf,
  };
}
