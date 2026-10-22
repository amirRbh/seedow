/**
 * PROBE read-only — SIGNAUX ESG AU NIVEAU ENTREPRISE (lot 1 de
 * `docs/esg-holdings-beta.md`). Mesure la seule chose qui décide de la
 * stratégie « score par transparisation » : **quelle part d'un portefeuille
 * réel, en poids, peut être appariée à un signal ESG publié gratuitement.**
 *
 * Trois sources, trois questions :
 *
 *   A. GLEIF (CC0)         — ISIN → LEI → raison sociale. Taux de résolution ?
 *   B. SBTi                — objectifs climat validés, publiés AVEC ISIN et LEI.
 *                            Taux d'appariement par identifiant, et poids couvert ?
 *   C. Climate TRACE (CC BY) — émissions d'actifs rattachées à un propriétaire.
 *                            Appariable à un indice actions large ?
 *
 * L'appariement se fait par **identifiant**, jamais par nom. Le probe mesure
 * aussi ce que donnerait l'appariement par nom sur Climate TRACE, précisément
 * pour documenter pourquoi il est refusé (faux positifs grossiers).
 *
 * N'écrit RIEN, n'ingère rien, ne persiste aucune donnée : ces sources n'ont pas
 * encore toutes une licence confirmée pour un usage commercial (§ lot 2).
 *
 * Usage : bun run scripts/probe-esg-company-signals.ts
 *         ISINS="US0378331005,US5949181045" bun run scripts/probe-esg-company-signals.ts
 */

import {
  buildCompanySignalIndex,
  summarizeFundSignals,
  type RawCompanyRow,
  type SignalHolding,
} from "../src/lib/esg/company-signals";
import { parseXlsxSheet } from "../src/lib/esg/xlsx-reader";

const UA = "Seedow/0.1 (contact: fouad.gto@gmail.com)";
const DELAY_MS = 300;

const SBTI_URL = "https://files.sciencebasedtargets.org/production/files/companies-excel.xlsx";
const GLEIF_URL = "https://api.gleif.org/api/v1/lei-records";
const CT_SEARCH = "https://api.climatetrace.org/v6/search";

/**
 * Échantillon par défaut : les 12 premières lignes d'un MSCI World, par poids.
 * Un ISIN est une référence publique d'instrument, pas une donnée de marché.
 */
const DEFAULT_HOLDINGS: { isin: string; name: string; weightPct: number }[] = [
  { isin: "US67066G1040", name: "NVIDIA", weightPct: 5.46 },
  { isin: "US0378331005", name: "APPLE", weightPct: 4.98 },
  { isin: "US5949181045", name: "MICROSOFT", weightPct: 3.7 },
  { isin: "US0231351067", name: "AMAZON.COM", weightPct: 2.75 },
  { isin: "US02079K3059", name: "ALPHABET A", weightPct: 2.16 },
  { isin: "US11135F1012", name: "BROADCOM", weightPct: 1.79 },
  { isin: "US30303M1027", name: "META PLATFORMS", weightPct: 1.31 },
  { isin: "US5486611073", name: "ELI LILLY", weightPct: 1.09 },
  { isin: "US88160R1014", name: "TESLA", weightPct: 1.06 },
  { isin: "US46625H1005", name: "JPMORGAN CHASE", weightPct: 1.03 },
  { isin: "US30231G1022", name: "EXXONMOBIL", weightPct: 0.76 },
  { isin: "NL0010273215", name: "ASML HOLDING", weightPct: 0.74 },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------

interface GleifHit {
  lei: string;
  legalName: string;
}

async function resolveGleif(isin: string): Promise<GleifHit | null> {
  const url = `${GLEIF_URL}?filter%5Bisin%5D=${encodeURIComponent(isin)}`;
  const body = (await getJson(url)) as {
    data?: { attributes?: { lei?: string; entity?: { legalName?: { name?: string } } } }[];
  } | null;
  const rec = body?.data?.[0]?.attributes;
  if (!rec?.lei) return null;
  return { lei: rec.lei, legalName: rec.entity?.legalName?.name ?? "" };
}

async function searchClimateTrace(name: string): Promise<string | null> {
  const body = (await getJson(`${CT_SEARCH}?name=${encodeURIComponent(name)}`)) as
    | { type?: string; name?: string }[]
    | null;
  const owner = (body ?? []).find((x) => x.type === "owner");
  return owner?.name ?? null;
}

function pct(n: number, d: number): string {
  return d === 0 ? "n/a" : `${((n / d) * 100).toFixed(0)}%`;
}

async function main(): Promise<void> {
  const override = process.env.ISINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const holdings = override
    ? override.map((isin) => ({ isin, name: isin, weightPct: 100 / override.length }))
    : DEFAULT_HOLDINGS;
  const totalWeight = holdings.reduce((a, h) => a + h.weightPct, 0);

  console.log("=== PROBE signaux ESG entreprise (read-only) ===");
  console.log(`échantillon : ${holdings.length} lignes · ${totalWeight.toFixed(2)} % de poids\n`);

  // ---- A. GLEIF -------------------------------------------------------------
  console.log("A. GLEIF — ISIN → LEI → raison sociale (CC0)");
  const resolved = new Map<string, GleifHit>();
  for (const h of holdings) {
    const hit = await resolveGleif(h.isin);
    if (hit) resolved.set(h.isin, hit);
    console.log(`   ${h.isin}  ${h.name.padEnd(18)} ${hit ? hit.legalName : "— non résolu"}`);
    await sleep(DELAY_MS);
  }
  console.log(
    `   → résolus ${resolved.size}/${holdings.length} (${pct(resolved.size, holdings.length)})\n`,
  );

  // ---- B. SBTi --------------------------------------------------------------
  console.log("B. SBTi — objectifs climat, appariement par ISIN/LEI");
  let summaryLine = "   → jeu de données indisponible";
  try {
    const res = await fetch(SBTI_URL, { headers: { "user-agent": UA } });
    console.log(`   téléchargement HTTP ${res.status} · ${res.headers.get("content-type")}`);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      console.log(`   ${(buf.length / 1024 / 1024).toFixed(2)} Mo`);
      const rows = parseXlsxSheet(buf) as unknown as RawCompanyRow[];
      const index = buildCompanySignalIndex(rows);
      console.log(
        `   ${rows.length} entreprises · indexables ${index.indexedCount} · ` +
          `sans identifiant ${index.skippedCount}`,
      );
      const signalHoldings: SignalHolding[] = holdings.map((h) => ({
        isin: h.isin,
        lei: resolved.get(h.isin)?.lei ?? null,
        weightPct: h.weightPct,
      }));
      const s = summarizeFundSignals(index, signalHoldings);
      summaryLine =
        `   → appariées ${s.matchedCount}/${holdings.length} · ` +
        `poids couvert ${s.coveredWeightPct.toFixed(2)} % sur ${s.totalWeightPct.toFixed(2)} % ` +
        `(${s.coverageRatio == null ? "n/a" : (s.coverageRatio * 100).toFixed(0) + "%"} du testé)`;
      console.log(`   ventilation par statut : ${JSON.stringify(s.weightByStatus)}`);
      console.log(`   poids NON apparié (jamais imputé) : ${s.unmatchedWeightPct.toFixed(2)} %`);
    }
  } catch (err) {
    console.log(`   erreur : ${(err as Error).message}`);
  }
  console.log(`${summaryLine}\n`);

  // ---- C. Climate TRACE -----------------------------------------------------
  console.log("C. Climate TRACE — appariement par NOM (mesuré pour être écarté)");
  let ctHits = 0;
  for (const h of holdings) {
    const legal = resolved.get(h.isin)?.legalName;
    if (!legal) continue;
    const match = await searchClimateTrace(legal);
    if (match) ctHits++;
    console.log(`   ${h.name.padEnd(18)} → ${match ?? "— absent"}`);
    await sleep(DELAY_MS);
  }
  console.log(`   → ${ctHits}/${resolved.size} « appariées » par nom — à lire avec méfiance :`);
  console.log("     l'appariement par nom produit des faux positifs (une exploitation");
  console.log("     agricole homonyme d'un laboratoire pharmaceutique, p. ex.). Climate");
  console.log("     TRACE indexe des ACTIFS rattachés à des filiales d'exploitation, pas");
  console.log("     des sociétés cotées : sans identifiant commun, non exploitable ici.\n");

  console.log("=== LECTURE ===");
  console.log("GLEIF et SBTi s'apparient par identifiant → exploitables.");
  console.log("Climate TRACE n'expose ni ISIN ni LEI → écarté comme signal de portefeuille.");
  console.log("Aucune donnée n'a été persistée (licences du lot 2 non confirmées).");
}

void main();
