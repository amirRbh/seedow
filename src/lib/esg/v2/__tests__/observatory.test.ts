import { describe, it, expect } from "vitest";
import {
  assembleObservatory,
  deriveSectorDisclosure,
  observatoryStats,
  type ObservatoryLine,
} from "../observatory";
import { STI_SIGNAL_IDS, type StiSignalId } from "../sti";
import { unverified, type TransparencySignal } from "../signal";
import { DISCREPANCY_LIMITS, type Discrepancy } from "../discrepancies";
import { fundEntityKey } from "../fund-entity";

/** La clé d'entité se calcule, elle ne se recopie pas : deux façons de la
 *  produire finiraient par diverger, et le test cesserait de tester. */
const GOLD_KEY = fundEntityKey({
  ticker: "GOLD",
  name: "Invesco Physical Gold ETC",
  issuer: "Invesco",
  isin: "IE00B579F325",
});

const NOW = new Date("2026-09-01T00:00:00Z");

function fullyPublished(): TransparencySignal<string>[] {
  return STI_SIGNAL_IDS.map((id: StiSignalId) => ({
    ...unverified(id),
    statut: "publie" as const,
    valeur:
      id.startsWith("exclusion_") && id !== "exclusion_policy_public" ? "seuil_quantifie" : null,
    source_document: "Documentation émetteur",
    date_donnee: "2026-08-01",
    date_collecte: "2026-08-30",
  }));
}

const lines: ObservatoryLine[] = [
  {
    ticker: "SUJP",
    name: "iShares MSCI Japan SRI UCITS ETF EUR Hedged (Acc)",
    issuer: "iShares",
    isin: "IE00BYVJRP78",
    assetClass: "equity_dev",
    sfdrArticle: 8,
    ter: 0.002,
  },
  {
    ticker: "SUJM",
    name: "iShares MSCI Japan SRI UCITS ETF USD (Dist)",
    issuer: "iShares",
    isin: "IE00BYVJRQ85",
    assetClass: "equity_dev",
    sfdrArticle: 8,
    ter: 0.002,
  },
  {
    ticker: "GOLD",
    name: "Invesco Physical Gold ETC",
    issuer: "Invesco",
    isin: "IE00B579F325",
    assetClass: "commodity",
    sfdrArticle: null,
    ter: 0.0012,
  },
];

describe("assembleObservatory", () => {
  it("dédoublonne les parts de classe en une seule entité notée une seule fois", () => {
    const funds = assembleObservatory({
      lines,
      signalsByEntity: new Map(),
      discrepanciesByEntity: new Map(),
      stiOptions: { now: NOW },
    });
    expect(funds).toHaveLength(2);
    const japan = funds.find((f) => f.name.includes("Japan"))!;
    expect(japan.isins).toHaveLength(2);
    expect(japan.tickers).toEqual(["SUJP", "SUJM"]);
  });

  it("n'attribue aucun thème que le fonds ne revendique pas", () => {
    const funds = assembleObservatory({
      lines,
      signalsByEntity: new Map(),
      discrepanciesByEntity: new Map(),
      stiOptions: { now: NOW },
    });
    expect(funds.find((f) => f.name.includes("Gold"))!.themes).toHaveLength(0);
  });

  it("garde le STI et les constats strictement séparés", () => {
    const funds = assembleObservatory({
      lines: [lines[2]],
      signalsByEntity: new Map([[GOLD_KEY, fullyPublished()]]),
      discrepanciesByEntity: new Map([
        [
          GOLD_KEY,
          [
            {
              code: "E1",
              entity_key: GOLD_KEY,
              claim: {
                text: "Article 8",
                source_document: "Prospectus",
                source_url: null,
                date: "2026-01-01",
              },
              fact: {
                text: "Aucune politique d'exclusion publiée",
                source_document: "Site émetteur",
                source_url: null,
                date: "2026-08-30",
              },
              limit: DISCREPANCY_LIMITS.E1,
              state: "publie",
              notified_at: "2026-08-01",
              issuer_response: null,
              version: "2.0",
            } satisfies Discrepancy,
          ],
        ],
      ]),
      stiOptions: { now: NOW },
    });
    const fund = funds[0];
    // Un fonds peut publier beaucoup ET porter une contradiction : le constat ne
    // fait pas baisser l'indice, sinon l'usage le plus intéressant de
    // l'Observatoire serait invisible.
    expect(fund.sti.score).toBeGreaterThanOrEqual(90);
    expect(fund.discrepancies).toHaveLength(1);
  });

  it("écarte les constats non publiables", () => {
    const key = GOLD_KEY;
    const draft: Discrepancy = {
      code: "E1",
      entity_key: key,
      claim: { text: "x", source_document: null, source_url: null, date: null },
      fact: { text: "y", source_document: null, source_url: null, date: null },
      limit: "",
      state: "brouillon",
      notified_at: null,
      issuer_response: null,
      version: "2.0",
    };
    const funds = assembleObservatory({
      lines: [lines[2]],
      signalsByEntity: new Map(),
      discrepanciesByEntity: new Map([[key, [draft]]]),
      stiOptions: { now: NOW },
    });
    expect(funds[0].discrepancies).toHaveLength(0);
  });
});

describe("observatoryStats", () => {
  it("publie le taux de fonds non notables et le compte de lignes absorbées", () => {
    const funds = assembleObservatory({
      lines,
      signalsByEntity: new Map(),
      discrepanciesByEntity: new Map(),
      stiOptions: { now: NOW },
    });
    const stats = observatoryStats(funds);
    expect(stats.funds).toBe(2);
    expect(stats.lines).toBe(3);
    expect(stats.notRatable).toBe(2);
    expect(stats.notRatablePct).toBe(100);
  });
});

describe("deriveSectorDisclosure", () => {
  it("distingue « non exclu, documenté » de « non vérifié »", () => {
    const disclosure = deriveSectorDisclosure([
      { ...unverified("exclusion_fossiles"), statut: "absent" },
      {
        ...unverified("exclusion_tabac"),
        statut: "publie",
        valeur: "seuil_quantifie",
      },
    ]);
    expect(disclosure.find((d) => d.sector === "fossiles")!.level).toBe("non_exclu_documente");
    expect(disclosure.find((d) => d.sector === "tabac")!.level).toBe("exclu_seuil_quantifie");
    expect(disclosure.find((d) => d.sector === "armement")!.level).toBe("non_verifie");
  });
});
