/**
 * Ingestion des HOLDINGS (composition) depuis les fichiers CSV officiels
 * iShares/BlackRock (§13 historisation, §11 validation, §3 provenance).
 *
 * iShares publie, par fonds, un CSV de composition daté. On le parse en
 * `ParsedHolding[]` + une date `as_of`, puis on construit les lignes
 * `fund_holdings` (avec ISIN du titre sous-jacent quand présent — donnée réelle,
 * jamais inventée). Fonctions pures + persistance isolée derrière une interface.
 */

import { validateHoldingsSum, validateWeight, worstOf } from "./validation";
import type { Confidence } from "./connectors/types";

export interface ParsedHolding {
  ticker: string | null;
  name: string;
  sector: string | null;
  country: string | null;
  isin: string | null;
  weightPct: number | null;
  /**
   * Colonnes publiées par l'émetteur pour les fonds obligataires. Elles sont
   * ce qui DISTINGUE deux lignes portant le même nom : un fonds de crédit
   * détient quatre-vingts obligations AT&T, toutes libellées « AT&T INC », qui
   * ne diffèrent que par leur échéance et leur coupon. Les ignorer revenait à
   * traiter quatre-vingts positions réelles comme un doublon.
   *
   * `null` sur un fonds actions : ces colonnes n'existent pas dans son export,
   * et on ne les fabrique pas.
   */
  maturity: string | null;
  couponPct: number | null;
  /** « Equity », « Fixed Income », « Cash »… tel que publié. */
  assetClass: string | null;
}

/**
 * Identité d'une ligne de composition, dérivée UNIQUEMENT de ce que l'émetteur
 * publie.
 *
 * Le pipeline identifiait un titre par son seul nom. Contre des fichiers
 * réels, cette hypothèse s'effondre : dans l'export du iShares Global Corp
 * Bond, 2 077 noms sur 14 978 lignes sont répétés — « AT&T INC » quatre-vingts
 * fois, « VERIZON » soixante-quinze fois. Ce ne sont pas des doublons, ce sont
 * des obligations différentes du même émetteur. Sur un fonds actions, le même
 * phénomène apparaît en plus petit : « CHOCOLADEFABRIKEN LINDT & SPRUENGL »
 * paraît deux fois parce que le fonds détient l'action nominative ET le bon de
 * participation, deux lignes cotées distinctes (LISN et LISP).
 *
 * L'identité retenue est donc le n-uplet des champs publiés qui séparent
 * réellement deux lignes. Rien n'est déduit : si l'émetteur ne publie pas
 * l'échéance, elle ne participe pas à la clé.
 */
export function holdingIdentity(h: ParsedHolding): string {
  return [
    h.isin?.trim().toUpperCase() ?? "",
    h.name.trim().toLowerCase(),
    h.ticker?.trim().toUpperCase() ?? "",
    h.maturity?.trim() ?? "",
    h.couponPct == null ? "" : h.couponPct.toFixed(4),
  ].join("|");
}

export interface ParsedHoldings {
  asOf: string | null;
  holdings: ParsedHolding[];
}

/** Découpe une ligne CSV (guillemets + virgules internes), format RFC 4180. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

/** « Jul 31, 2026 » → « 2026-07-31 », sinon null. */
export function monthDayYearToIso(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/([A-Za-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) return null;
  const mm = MONTHS[m[1].toLowerCase()];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[2].padStart(2, "0")}`;
}

function toNum(s: string | undefined): number | null {
  if (s == null) return null;
  const n = Number(s.replace(/[",%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Index de colonne par nom d'en-tête (insensible à la casse/espaces). */
function headerIndex(header: string[]): Record<string, number> {
  const idx: Record<string, number> = {};
  header.forEach((h, i) => {
    idx[h.toLowerCase().replace(/\s+/g, " ").trim()] = i;
  });
  return idx;
}

/**
 * Parse un CSV de composition iShares. Repère la date « as of » dans le
 * préambule et la ligne d'en-tête (contenant « Ticker » et « Weight (%) »),
 * puis lit les positions jusqu'à la fin du tableau. Ne produit que ce qui est
 * présent (champ absent → null).
 */
export function parseISharesHoldingsCsv(text: string): ParsedHoldings {
  const lines = text.split(/\r?\n/);
  let asOf: string | null = null;
  let headerRow = -1;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (asOf == null && /Fund Holdings as of/i.test(l)) {
      asOf = monthDayYearToIso(parseCsvLine(l).slice(1).join(" "));
    }
    if (/(^|,)\s*"?Ticker"?\s*,/i.test(l) && /Weight\s*\(%\)/i.test(l)) {
      headerRow = i;
      break;
    }
  }
  if (headerRow === -1) return { asOf, holdings: [] };

  const idx = headerIndex(parseCsvLine(lines[headerRow]));
  const col = (name: string): number => idx[name] ?? -1;
  const cTicker = col("ticker");
  const cName = col("name");
  const cSector = col("sector");
  const cWeight = col("weight (%)");
  const cLocation = col("location");
  const cIsin = col("isin");

  const holdings: ParsedHolding[] = [];
  for (let i = headerRow + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim() === "") break; // fin du tableau
    const cells = parseCsvLine(raw);
    const name = cName >= 0 ? cells[cName] : "";
    if (!name) continue;
    holdings.push({
      ticker: cTicker >= 0 && cells[cTicker] ? cells[cTicker] : null,
      name,
      sector: cSector >= 0 && cells[cSector] ? cells[cSector] : null,
      country: cLocation >= 0 && cells[cLocation] ? cells[cLocation] : null,
      isin: cIsin >= 0 && cells[cIsin] ? cells[cIsin] : null,
      weightPct: cWeight >= 0 ? toNum(cells[cWeight]) : null,
      // Ce parser CSV lit l'ancien format, qui ne porte pas ces colonnes.
      maturity: null,
      couponPct: null,
      assetClass: null,
    });
  }
  return { asOf, holdings };
}

/** Ligne prête à insérer dans `fund_holdings`. */
export interface HoldingRow {
  asset_id: string;
  security_isin: string | null;
  security_name: string;
  weight_pct: number | null;
  as_of: string;
  /**
   * Rang de la ligne dans le document publié (0-indexé). C'est la seule clé
   * qui garantisse de rendre le fichier TEL QUEL.
   *
   * L'échéance et le coupon suffisent à séparer quatre-vingts obligations AT&T,
   * mais pas tout : le même export publie deux tranches HSBC de même échéance
   * et même coupon, deux sociétés différentes sous le sigle « EQT », et jusqu'à
   * douze jambes de change « SAR/USD ». L'émetteur lui-même ne les distingue
   * pas dans ce document. Les fusionner par identité perdrait des positions
   * réelles ; sommer leurs poids fabriquerait une ligne qu'il n'a pas publiée.
   * Le rang, lui, est stable pour un fichier donné : ré-ingérer la même date
   * réécrit les mêmes lignes, et rien ne disparaît.
   */
  line_no: number;
  /** Secteur publié — ce sur quoi l'interface ouvre la composition. */
  security_sector: string | null;
  /** Ce qui sépare deux lignes du même émetteur, tel que publié. */
  security_maturity: string | null;
  security_coupon_pct: number | null;
  security_asset_class: string | null;
  source_id: string | null;
  source_url: string | null;
  retrieved_at: string;
  confidence: string;
  validation_status: string;
}

/**
 * Construit les lignes `fund_holdings` datées et sourcées. Le statut de
 * validation combine la plausibilité du poids (§11) et celle de la somme
 * globale (une couverture partielle reste « valid » ; une somme > 100 rejette).
 */
export function buildHoldingRows(
  assetId: string,
  parsed: ParsedHoldings,
  meta: { sourceId: string | null; sourceUrl: string | null; retrievedAt: string },
  confidence: Confidence = "high",
): HoldingRow[] {
  if (!parsed.asOf || parsed.holdings.length === 0) return [];
  const sumStatus = validateHoldingsSum(parsed.holdings.map((h) => h.weightPct ?? 0)).status;

  return parsed.holdings.map((h, index) => {
    const status = worstOf([
      validateWeight(h.weightPct),
      { status: sumStatus, reason: null },
    ]).status;
    return {
      asset_id: assetId,
      security_isin: h.isin,
      security_name: h.name,
      weight_pct: h.weightPct,
      as_of: parsed.asOf as string,
      line_no: index,
      security_sector: h.sector,
      security_maturity: h.maturity,
      security_coupon_pct: h.couponPct,
      security_asset_class: h.assetClass,
      source_id: meta.sourceId,
      source_url: meta.sourceUrl,
      retrieved_at: meta.retrievedAt,
      confidence,
      validation_status: status,
    };
  });
}

/** I/O isolée : écriture des holdings (upsert sur l'identité publiée de la ligne). */
export interface HoldingWriter {
  insertHoldings(rows: HoldingRow[]): Promise<number>;
}

/** Persiste les holdings publiables (statut ≠ rejected). No-op si rien. */
export async function persistHoldings(
  writer: HoldingWriter,
  assetId: string,
  parsed: ParsedHoldings,
  meta: { sourceId: string | null; sourceUrl: string | null; retrievedAt: string },
): Promise<{ inserted: number; asOf: string | null }> {
  const rows = buildHoldingRows(assetId, parsed, meta).filter(
    (r) => r.validation_status !== "rejected",
  );
  if (rows.length === 0) return { inserted: 0, asOf: parsed.asOf };
  const inserted = await writer.insertHoldings(rows);
  return { inserted, asOf: parsed.asOf };
}
