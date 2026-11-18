/**
 * Instantané de démonstration — compositions, expositions et historiques RÉELS
 * de quelques fonds, tels que l'émetteur les publie.
 *
 * Pourquoi un instantané figé dans le dépôt : en production, la table
 * `fund_holdings` est encore vide (le cron d'ingestion n'a pas tourné sur ces
 * fonds). Plutôt que d'inventer une composition pour la démonstration, on fige
 * ici la publication officielle de l'émetteur, avec son URL rejouable, sa date
 * de référence et sa date de collecte. Chaque chiffre affiché à partir de ce
 * fichier remonte donc à une source primaire, et vieillit visiblement (statut
 * STALE au-delà de la fenêtre de fraîcheur, cf. `lib/data/status.ts`).
 *
 * Ce qui est GARDÉ, et pourquoi :
 *   - les métadonnées déclarées (devise, indice, SFDR, TER, domicile) ;
 *   - les expositions sectorielle et géographique publiées par l'émetteur ;
 *   - la répartition par devise de cotation, agrégée sur TOUTES les positions ;
 *   - les 150 premières positions (le reste est agrégé, et sa part est écrite :
 *     le look-through dit quelle part du fonds il couvre) ;
 *   - la croissance de 10 000 du fonds ET de son indice sur ~6 ans (rendement
 *     total, dividendes inclus), pour calculer rendements, volatilité, perte
 *     maximale et écart à l'indice ;
 *   - les rendements annualisés que l'émetteur publie lui-même, qui servent de
 *     contrôle indépendant des calculs (`performance.test.ts`).
 *
 * Usage : bun run scripts/snapshot-demo-funds.ts
 * Écrit : src/content/demo/fund-snapshots.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { iSharesHoldingsUrl } from "../src/lib/data-engine/ishares-holdings";
import { parseISharesWorkbook } from "../src/lib/data-engine/ishares-workbook";

/** Fonds retenus : actions monde, monde ISR, émergents, thématique climat, obligations d'État. */
const FUNDS = [
  { portfolioId: "251882", role: "core_world" },
  { portfolioId: "291392", role: "world_sri" },
  { portfolioId: "264659", role: "emerging" },
  { portfolioId: "251911", role: "clean_energy" },
  { portfolioId: "251715", role: "treasury" },
] as const;

const TOP_HOLDINGS = 150;
/** Profondeur d'historique conservée : 6 ans couvrent la fenêtre 5 ans avec marge. */
const HISTORY_YEARS = 6;

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

async function snapshot(portfolioId: string, role: string) {
  const sourceUrl = iSharesHoldingsUrl(portfolioId, "uk");
  const res = await fetch(sourceUrl, { headers: { "user-agent": "seedow-snapshot/1.0" } });
  if (!res.ok) throw new Error(`${portfolioId}: HTTP ${res.status}`);
  const wb = parseISharesWorkbook(await res.text());
  if (!wb.isin || wb.growthFund.length < 300) throw new Error(`${portfolioId}: classeur incomplet`);

  // Devise de cotation, agrégée sur TOUTES les positions (pas seulement le top).
  const byCurrency = new Map<string, number>();
  let holdingsWeight = 0;
  for (const h of wb.holdings) {
    holdingsWeight += h.weightPct;
    const key = h.currency ?? "—";
    byCurrency.set(key, (byCurrency.get(key) ?? 0) + h.weightPct);
  }
  const currencyExposure = [...byCurrency.entries()]
    .filter(([label]) => label !== "—")
    .map(([label, w]) => ({ label, weightPct: round(w, 2) }))
    .sort((a, b) => b.weightPct - a.weightPct);

  const top = [...wb.holdings].sort((a, b) => b.weightPct - a.weightPct).slice(0, TOP_HOLDINGS);
  const topWeight = top.reduce((s, h) => s + h.weightPct, 0);

  const last = wb.growthFund.at(-1)!.date;
  const cutoff = `${Number(last.slice(0, 4)) - HISTORY_YEARS}${last.slice(4)}`;
  const benchByDate = new Map(wb.growthBenchmark.map((p) => [p.date, p.value]));
  const history = wb.growthFund.filter((p) => p.date >= cutoff);

  return {
    role,
    isin: wb.isin,
    name: wb.name,
    issuer: "iShares (BlackRock)",
    sourceUrl,
    sourceLabel: "Classeur produit iShares — publication officielle de l'émetteur",
    retrievedAt: new Date().toISOString().slice(0, 10),
    navAsOf: wb.navAsOf,
    currency: wb.currency,
    benchmark: wb.benchmark,
    sfdrDeclared: wb.sfdrDeclared,
    ter: wb.ter,
    domicile: wb.domicile,
    assetClass: wb.assetClass,
    launchDate: wb.launchDate,
    holdingsCount: wb.holdingsCount,
    publishedStdDev3y: wb.publishedStdDev3y,
    publishedReturns: wb.publishedReturns,
    sectorExposure: wb.sectorExposure,
    sectorAsOf: wb.sectorAsOf,
    geographyExposure: wb.geographyExposure,
    geographyAsOf: wb.geographyAsOf,
    currencyExposure,
    holdingsAsOf: wb.holdingsAsOf,
    holdingsLines: wb.holdings.length,
    holdingsTotalWeightPct: round(holdingsWeight, 2),
    topHoldingsWeightPct: round(topWeight, 2),
    topHoldings: top.map((h) => ({
      ticker: h.ticker,
      name: h.name,
      sector: h.sector,
      currency: h.currency,
      weightPct: h.weightPct,
    })),
    history: {
      dates: history.map((p) => p.date),
      fund: history.map((p) => round(p.value, 2)),
      benchmark: history.map((p) => {
        const v = benchByDate.get(p.date);
        return v === undefined ? null : round(v, 2);
      }),
    },
  };
}

const out = [];
for (const f of FUNDS) {
  console.log(`→ ${f.portfolioId} (${f.role})`);
  out.push(await snapshot(f.portfolioId, f.role));
}
mkdirSync("src/content/demo", { recursive: true });
writeFileSync(
  "src/content/demo/fund-snapshots.json",
  JSON.stringify({ generatedAt: new Date().toISOString(), funds: out }) + "\n",
);
console.log(`✓ ${out.length} fonds — src/content/demo/fund-snapshots.json`);
