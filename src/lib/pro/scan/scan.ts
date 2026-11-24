/**
 * Scan d'une liste d'unités de compte (UC) d'un contrat d'assurance-vie contre
 * des profils types. Module pur : agrégats par profil, couverture des données,
 * export CSV.
 */
import { ENGINE_VERSION } from "../matching/engine";
import { matchProfile, type ScanProfile } from "../matching/profiles";
import type { AlertCode, FundData, Verdict } from "../matching/types";

export interface ScanContractMeta {
  insurer: string;
  contract_name: string;
  list_date: string;
  source_url: string | null;
  /** Date de référence du scan (AAAA-MM-JJ). */
  as_of: string;
}

export interface ScanRow {
  isin: string;
  name: string | null;
  has_data: boolean;
  data_status: FundData["status"] | null;
  sfdr_article: 6 | 8 | 9 | null;
  doc_date: string | null;
  min_sustainable_pct: number | null;
  /** Valeur la plus basse entre « avec » et « hors » souverains. */
  min_taxonomy_pct: number | null;
  considers_pai: boolean | null;
  verdicts: Record<string, Verdict>;
  alerts: AlertCode[];
}

export interface ProfileSummary {
  key: string;
  label: string;
  hypothesis: string;
  total: number;
  adequate: number;
  partial: number;
  non_adequate: number;
  to_verify: number;
  /** UC non adéquates pour ce profil (verdict NON_ADEQUAT ou PARTIEL). */
  non_adequate_isins: string[];
}

export interface ScanResult {
  meta: ScanContractMeta;
  engine_version: string;
  profiles: ProfileSummary[];
  rows: ScanRow[];
  coverage: {
    total: number;
    with_data: number;
    validated: number;
    needs_review: number;
    without_data: string[];
  };
}

function conservativeTaxonomy(f: FundData): number | null {
  const vs = [f.min_taxonomy_pct, f.min_taxonomy_pct_excl_sovereign].filter(
    (v): v is number => v !== null,
  );
  return vs.length ? Math.min(...vs) : null;
}

export function scanContract(
  meta: ScanContractMeta,
  isins: readonly string[],
  funds: ReadonlyMap<string, FundData>,
  profiles: readonly ScanProfile[],
): ScanResult {
  const uniqueIsins = [...new Set(isins)];
  const rows: ScanRow[] = uniqueIsins.map((isin) => {
    const f = funds.get(isin) ?? null;
    const matches = profiles.map((p) => matchProfile(p, f, { asOf: meta.as_of, isin }));
    return {
      isin,
      name: f?.name ?? null,
      has_data: f !== null,
      data_status: f?.status ?? null,
      sfdr_article: f?.sfdr_article ?? null,
      doc_date: f?.doc_date ?? null,
      min_sustainable_pct: f?.min_sustainable_pct ?? null,
      min_taxonomy_pct: f ? conservativeTaxonomy(f) : null,
      considers_pai: f?.considers_pai ?? null,
      verdicts: Object.fromEntries(matches.map((m) => [m.profile, m.verdict])),
      // Les alertes ne dépendent pas du profil.
      alerts: matches[0]?.best.alerts.map((a) => a.code) ?? [],
    };
  });

  const summaries: ProfileSummary[] = profiles.map((p) => {
    const vs = rows.map((r) => r.verdicts[p.key]);
    const count = (v: Verdict) => vs.filter((x) => x === v).length;
    return {
      key: p.key,
      label: p.label,
      hypothesis: p.hypothesis,
      total: rows.length,
      adequate: count("ADEQUAT"),
      partial: count("PARTIEL"),
      non_adequate: count("NON_ADEQUAT"),
      to_verify: count("A_VERIFIER"),
      non_adequate_isins: rows
        .filter((r) => r.verdicts[p.key] === "NON_ADEQUAT" || r.verdicts[p.key] === "PARTIEL")
        .map((r) => r.isin),
    };
  });

  return {
    meta,
    engine_version: ENGINE_VERSION,
    profiles: summaries,
    rows,
    coverage: {
      total: rows.length,
      with_data: rows.filter((r) => r.has_data).length,
      validated: rows.filter((r) => r.data_status === "validated").length,
      needs_review: rows.filter((r) => r.data_status === "needs_review").length,
      without_data: rows.filter((r) => !r.has_data).map((r) => r.isin),
    },
  };
}

// ---------------------------------------------------------------------------
// CSV (séparateur « ; », virgule décimale, BOM : ouverture directe dans un
// tableur configuré en français)
// ---------------------------------------------------------------------------

function cell(v: string | number | boolean | null): string {
  if (v === null) return "";
  const s =
    typeof v === "number"
      ? String(v).replace(".", ",")
      : typeof v === "boolean"
        ? v
          ? "oui"
          : "non"
        : v;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Marque d'ordre des octets UTF-8, pour qu'un tableur détecte l'encodage. */
const BOM = "\uFEFF";

export function scanCsv(r: ScanResult, profiles: readonly ScanProfile[]): string {
  const header = [
    "isin",
    "nom",
    "donnees",
    "statut_donnees",
    "article_sfdr",
    "date_annexe",
    "durable_min_pct",
    "taxinomie_min_pct",
    "pai",
    ...profiles.map((p) => `verdict_${p.key}`),
    "constats",
  ];
  const lines = r.rows.map((row) =>
    [
      row.isin,
      row.name,
      row.has_data ? "oui" : "non",
      row.data_status,
      row.sfdr_article,
      row.doc_date,
      row.min_sustainable_pct,
      row.min_taxonomy_pct,
      row.considers_pai,
      ...profiles.map((p) => row.verdicts[p.key]),
      row.alerts.join(" "),
    ]
      .map(cell)
      .join(";"),
  );
  return `${BOM}${[header.join(";"), ...lines].join("\r\n")}\r\n`;
}
