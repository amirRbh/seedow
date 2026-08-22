import { describe, expect, it } from "vitest";
import {
  buildCompanySignalIndex,
  matchHolding,
  normalizeTargetStatus,
  parseIsinField,
  summarizeFundSignals,
  toCompanySignal,
  type RawCompanyRow,
} from "../company-signals";

/** Extrait réaliste du jeu de données publié (colonnes SBTi). */
const ROWS: RawCompanyRow[] = [
  {
    company_name: "Apple Inc.",
    isin: "US0378331005",
    lei: "HWUPKR0MPOU8FGXBT394",
    sector: "Technology Hardware",
    near_term_status: "Targets set",
    near_term_target_classification: "1.5°C",
    net_zero_status: "",
    date_updated: "2026-07-01",
  },
  {
    company_name: "Amazon.com, Inc.",
    isin: "US0231351067",
    lei: "ZXTILKJKG63JELOEG630",
    near_term_status: "Commitment removed",
    near_term_target_classification: "",
    net_zero_status: "",
    date_updated: "2026-07-01",
  },
  {
    // Deux ISIN dans un même champ (classes d'actions).
    company_name: "Alphabet Inc.",
    isin: "US02079K3059; US02079K1079",
    lei: "5493006MHB84DD0ZWV18",
    near_term_status: "Targets set",
    near_term_target_classification: "1.5°C",
    net_zero_status: "Targets set",
  },
  {
    // PME sans identifiant : indexable par rien, doit être écartée.
    company_name: '"Hytex Plastic" CJSC',
    isin: "",
    lei: "",
    near_term_status: "Targets set",
  },
  {
    // LEI seul, pas d'ISIN — appariable par LEI uniquement.
    company_name: "Société Sans ISIN SA",
    isin: "n/a",
    lei: "969500TJ5KRTCJQWXH05",
    near_term_status: "Committed",
  },
];

describe("normalizeTargetStatus", () => {
  it("ramène les libellés publiés à un ensemble fermé", () => {
    expect(normalizeTargetStatus("Targets set")).toBe("targets_set");
    expect(normalizeTargetStatus("Commitment removed")).toBe("commitment_removed");
    expect(normalizeTargetStatus("Committed")).toBe("committed");
  });

  it("ne suppose jamais le sens d'un libellé inconnu ou absent", () => {
    expect(normalizeTargetStatus("Quelque chose de neuf")).toBe("unknown");
    expect(normalizeTargetStatus("")).toBe("unknown");
    expect(normalizeTargetStatus(null)).toBe("unknown");
    expect(normalizeTargetStatus(undefined)).toBe("unknown");
  });

  it("« removed » prime sur « commitment », l'ordre des règles compte", () => {
    // « Commitment removed » contient les deux mots : le retrait doit gagner,
    // sinon un désengagement serait lu comme un engagement.
    expect(normalizeTargetStatus("Commitment removed")).not.toBe("committed");
  });
});

describe("parseIsinField", () => {
  it("extrait plusieurs ISIN d'un même champ et déduplique", () => {
    expect(parseIsinField("US02079K3059; US02079K1079")).toEqual(["US02079K3059", "US02079K1079"]);
    expect(parseIsinField("US0378331005 US0378331005")).toEqual(["US0378331005"]);
  });

  it("rejette ce qui n'est pas un ISIN plutôt que de le laisser passer", () => {
    expect(parseIsinField("n/a")).toEqual([]);
    expect(parseIsinField("")).toEqual([]);
    expect(parseIsinField(null)).toEqual([]);
    expect(parseIsinField("US037833100")).toEqual([]); // trop court
  });
});

describe("toCompanySignal", () => {
  it("conserve le libellé brut à côté du statut normalisé", () => {
    const s = toCompanySignal(ROWS[1]);
    expect(s.status).toBe("commitment_removed");
    expect(s.statusLabel).toBe("Commitment removed");
  });

  it("laisse à null ce qui n'est pas publié, sans le combler", () => {
    const s = toCompanySignal(ROWS[1]);
    expect(s.temperatureAlignment).toBeNull();
    expect(s.sector).toBeNull();
    expect(s.netZeroStatus).toBe("unknown");
  });

  it("ignore un LEI mal formé plutôt que de l'indexer", () => {
    expect(toCompanySignal({ lei: "PAS-UN-LEI" }).lei).toBeNull();
  });
});

describe("buildCompanySignalIndex", () => {
  it("indexe par ISIN et par LEI, et compte ce qui est écarté", () => {
    const idx = buildCompanySignalIndex(ROWS);
    expect(idx.indexedCount).toBe(4);
    expect(idx.skippedCount).toBe(1); // la PME sans identifiant
    expect(idx.byIsin.size).toBe(4); // Apple + Amazon + 2 classes Alphabet
    expect(idx.byLei.size).toBe(4);
  });

  it("rend les deux classes d'actions d'un même émetteur", () => {
    const idx = buildCompanySignalIndex(ROWS);
    expect(idx.byIsin.get("US02079K3059")?.companyName).toBe("Alphabet Inc.");
    expect(idx.byIsin.get("US02079K1079")?.companyName).toBe("Alphabet Inc.");
  });
});

describe("matchHolding", () => {
  const idx = buildCompanySignalIndex(ROWS);

  it("apparie par ISIN en priorité", () => {
    const m = matchHolding(idx, { isin: "US0378331005", weightPct: 4.98 });
    expect(m.matchedBy).toBe("isin");
    expect(m.signal?.companyName).toBe("Apple Inc.");
  });

  it("retombe sur le LEI quand l'ISIN ne donne rien", () => {
    const m = matchHolding(idx, {
      isin: "XX0000000000",
      lei: "969500TJ5KRTCJQWXH05",
      weightPct: 1,
    });
    expect(m.matchedBy).toBe("lei");
    expect(m.signal?.companyName).toBe("Société Sans ISIN SA");
  });

  it("n'apparie jamais par nom : un titre inconnu reste non apparié", () => {
    // Garde-fou mesuré : l'appariement par nom produisait des faux positifs
    // grossiers (« Johnson & Johnson » → « Johnson Farms »).
    const m = matchHolding(idx, { isin: "US4781601046", weightPct: 0.7 });
    expect(m.signal).toBeNull();
    expect(m.matchedBy).toBeNull();
  });

  it("traite un poids absent comme zéro, sans lever", () => {
    expect(matchHolding(idx, { isin: null, weightPct: null }).weightPct).toBe(0);
  });
});

describe("summarizeFundSignals", () => {
  const idx = buildCompanySignalIndex(ROWS);

  it("sépare le poids couvert du poids non apparié", () => {
    const s = summarizeFundSignals(idx, [
      { isin: "US0378331005", weightPct: 5 }, // Apple, targets set
      { isin: "US0231351067", weightPct: 3 }, // Amazon, commitment removed
      { isin: "US67066G1040", weightPct: 2 }, // NVIDIA, absent du jeu
    ]);
    expect(s.totalWeightPct).toBe(10);
    expect(s.coveredWeightPct).toBe(8);
    expect(s.unmatchedWeightPct).toBe(2);
    expect(s.coverageRatio).toBeCloseTo(0.8, 6);
    expect(s.matchedCount).toBe(2);
    expect(s.unmatchedCount).toBe(1);
  });

  it("ne redistribue jamais le poids non apparié sur les statuts", () => {
    const s = summarizeFundSignals(idx, [
      { isin: "US0378331005", weightPct: 5 },
      { isin: "US67066G1040", weightPct: 95 },
    ]);
    const sum = Object.values(s.weightByStatus).reduce((a, b) => a + b, 0);
    expect(sum).toBe(5); // pas 100
    expect(s.weightByStatus.targets_set).toBe(5);
  });

  it("ventile le poids par statut publié", () => {
    const s = summarizeFundSignals(idx, [
      { isin: "US0378331005", weightPct: 5 },
      { isin: "US02079K3059", weightPct: 2 },
      { isin: "US0231351067", weightPct: 3 },
    ]);
    expect(s.weightByStatus.targets_set).toBe(7);
    expect(s.weightByStatus.commitment_removed).toBe(3);
  });

  it("portefeuille vide → couverture null, pas 0 % ni 100 %", () => {
    const s = summarizeFundSignals(idx, []);
    expect(s.coverageRatio).toBeNull();
    expect(s.totalWeightPct).toBe(0);
  });
});
