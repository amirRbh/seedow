/**
 * Server functions publiques de l'Observatoire v2.
 *
 * Une seule source de vérité pour la liste et pour la fiche : les deux pages
 * lisent le MÊME assemblage (`assembleObservatory`). C'est ce qui garantit qu'un
 * fonds ne peut plus afficher un chiffre dans la liste et un autre sur sa fiche
 * — le défaut de la v1 se vérifiait en dix secondes, il ne doit plus être
 * possible par construction.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  assembleObservatory,
  observatoryStats,
  type ObservatoryFund,
  type ObservatoryLine,
  type ObservatoryStats,
} from "./observatory";
import type { SignalStatus, SignalMethod, TransparencySignal } from "./signal";
import type { Discrepancy, DiscrepancyCode, DiscrepancyState } from "./discrepancies";

/** Colonnes de `assets` réellement utilisées — que des faits bruts, aucun score. */
const LINE_COLUMNS = "id, ticker, name, issuer, isin, asset_class, sfdr_article, ter";

interface AssetLineRow {
  id: string;
  ticker: string;
  name: string;
  issuer: string | null;
  isin: string | null;
  asset_class: string;
  sfdr_article: number | null;
  ter: number | string | null;
}

interface SignalRow {
  entity_key: string;
  signal: string;
  statut: SignalStatus;
  valeur: string | null;
  source_url: string | null;
  source_document: string | null;
  date_donnee: string | null;
  date_collecte: string | null;
  methode: SignalMethod | null;
}

interface DiscrepancyRow {
  entity_key: string;
  code: DiscrepancyCode;
  state: DiscrepancyState;
  claim_text: string;
  claim_document: string | null;
  claim_url: string | null;
  claim_date: string | null;
  fact_text: string;
  fact_document: string | null;
  fact_url: string | null;
  fact_date: string | null;
  limit_text: string;
  notified_at: string | null;
  issuer_response: string | null;
  issuer_response_at: string | null;
  methodology_version: string;
}

function toLine(r: AssetLineRow): ObservatoryLine {
  return {
    assetId: r.id,
    ticker: r.ticker,
    name: r.name,
    issuer: r.issuer,
    isin: r.isin,
    assetClass: r.asset_class,
    sfdrArticle: r.sfdr_article,
    ter: r.ter == null ? null : Number(r.ter),
  };
}

function toSignal(r: SignalRow): TransparencySignal<string> {
  return {
    signal: r.signal,
    statut: r.statut,
    valeur: r.valeur,
    source_url: r.source_url,
    source_document: r.source_document,
    date_donnee: r.date_donnee,
    date_collecte: r.date_collecte,
    methode: r.methode,
  };
}

function toDiscrepancy(r: DiscrepancyRow): Discrepancy {
  return {
    code: r.code,
    entity_key: r.entity_key,
    claim: {
      text: r.claim_text,
      source_document: r.claim_document,
      source_url: r.claim_url,
      date: r.claim_date,
    },
    fact: {
      text: r.fact_text,
      source_document: r.fact_document,
      source_url: r.fact_url,
      date: r.fact_date,
    },
    limit: r.limit_text,
    state: r.state,
    notified_at: r.notified_at,
    issuer_response: r.issuer_response
      ? { text: r.issuer_response, received_at: r.issuer_response_at }
      : null,
    version: r.methodology_version,
  };
}

function groupBy<T>(rows: readonly T[], keyOf: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const bucket = map.get(key);
    if (bucket) bucket.push(row);
    else map.set(key, [row]);
  }
  return map;
}

/**
 * Charge et assemble tout l'Observatoire.
 *
 * Les tables v2 viennent d'être créées et ne figurent pas encore dans les types
 * générés par Lovable Cloud (`types.ts` ne s'édite pas à la main — §1.6) : cast
 * localisé et retypage explicite, comme les autres accès aux colonnes récentes.
 * À retirer à la prochaine régénération.
 */
export async function loadObservatory(): Promise<{
  funds: ObservatoryFund[];
  stats: ObservatoryStats;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: assetRows, error } = await supabaseAdmin
    .from("assets")
    .select(LINE_COLUMNS)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(1000);
  if (error) throw new Error(error.message);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [{ data: signalRows }, { data: discrepancyRows }] = await Promise.all([
    (supabaseAdmin as any)
      .from("fund_transparency_signals")
      .select(
        "entity_key, signal, statut, valeur, source_url, source_document, date_donnee, date_collecte, methode",
      ),
    (supabaseAdmin as any)
      .from("fund_discrepancies")
      .select(
        "entity_key, code, state, claim_text, claim_document, claim_url, claim_date, fact_text, fact_document, fact_url, fact_date, limit_text, notified_at, issuer_response, issuer_response_at, methodology_version",
      )
      .neq("state", "brouillon"),
  ]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const lines = ((assetRows ?? []) as unknown as AssetLineRow[]).map(toLine);
  const signals = ((signalRows ?? []) as SignalRow[]).map((r) => ({
    ...toSignal(r),
    entity_key: r.entity_key,
  }));
  const discrepancies = ((discrepancyRows ?? []) as DiscrepancyRow[]).map(toDiscrepancy);

  const funds = assembleObservatory({
    lines,
    signalsByEntity: groupBy(signals, (s) => s.entity_key),
    discrepanciesByEntity: groupBy(discrepancies, (d) => d.entity_key),
  });
  return { funds, stats: observatoryStats(funds) };
}

export const getObservatory = createServerFn({ method: "GET" }).handler(async () => {
  const { funds, stats } = await loadObservatory();
  return { funds, stats };
});

/**
 * Fiche d'un fonds, par ISIN **ou** ticker : l'URL peut porter l'un ou l'autre,
 * et une entité regroupe désormais PLUSIEURS ISIN. On résout donc sur l'entité,
 * pas sur la ligne — c'est ce qui fait qu'un ancien lien vers la part Dist et un
 * lien vers la part Acc atterrissent sur la même fiche, avec le même STI.
 */
export const getObservatoryFund = createServerFn({ method: "GET" })
  .inputValidator((input: string) => z.string().min(1).max(64).parse(input))
  .handler(async ({ data: key }) => {
    const { funds } = await loadObservatory();
    const needle = key.trim().toUpperCase();
    const fund =
      funds.find((f) => f.isins.some((i) => i.toUpperCase() === needle)) ??
      funds.find((f) => f.tickers.some((t) => t.toUpperCase() === needle)) ??
      null;
    if (!fund) return null;

    // La composition publiée est un FAIT BRUT : reprise à l'identique, jamais
    // agrégée dans un score. Une seule date — mélanger deux publications
    // donnerait une composition qui n'a jamais existé.
    const holdings = await loadHoldings(fund.assetIds);

    // Les pairs servent à situer le fonds SANS produire de classement global :
    // on ne renvoie que les membres de son propre groupe.
    const peers = funds.filter((f) => f.peer.key === fund.peer.key && f.key !== fund.key);
    return { fund, peers, ...holdings };
  });

/** Une position telle que la fiche la consomme (même forme que la v1). */
export interface FundHoldingRow {
  name: string;
  ticker: string | null;
  sector: string | null;
  weightPct: number | null;
}

interface HoldingsQueryRow {
  security_name: string;
  security_sector: string | null;
  weight_pct: number | string | null;
  as_of: string;
  source_url: string | null;
}

async function loadHoldings(assetIds: readonly string[]): Promise<{
  holdings: FundHoldingRow[];
  holdingsAsOf: string | null;
  holdingsSourceUrl: string | null;
}> {
  const empty = { holdings: [], holdingsAsOf: null, holdingsSourceUrl: null };
  if (assetIds.length === 0) return empty;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // `security_sector` n'est pas encore dans les types générés (§1.6) — cast
  // localisé, comme les autres accès Data Engine aux colonnes récentes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabaseAdmin.from("fund_holdings") as any)
    .select("security_name, security_sector, weight_pct, as_of, source_url")
    .in("asset_id", assetIds as string[])
    .order("as_of", { ascending: false })
    .order("weight_pct", { ascending: false })
    .limit(400);
  const rows = (data ?? []) as HoldingsQueryRow[];
  if (rows.length === 0) return empty;
  const latest = rows[0].as_of;
  const sameDay = rows.filter((r) => r.as_of === latest);
  return {
    holdings: sameDay.map((r) => ({
      name: r.security_name,
      ticker: null,
      sector: r.security_sector ?? null,
      weightPct: r.weight_pct == null ? null : Number(r.weight_pct),
    })),
    holdingsAsOf: latest,
    holdingsSourceUrl: sameDay[0]?.source_url ?? null,
  };
}
