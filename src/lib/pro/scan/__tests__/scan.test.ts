import { describe, expect, it } from "vitest";
import { DEFAULT_SCAN_PROFILES, matchProfile, type ScanProfile } from "../../matching/profiles";
import type { FundData } from "../../matching/types";
import { scanContract, scanCsv } from "../scan";

const AS_OF = "2026-11-24";
const fund = (isin: string, over: Partial<FundData> = {}): FundData => ({
  isin,
  name: `Fonds ${isin}`,
  sfdr_article: 8,
  doc_date: "2026-06-01",
  min_sustainable_pct: 20,
  min_taxonomy_pct: 0,
  min_taxonomy_pct_excl_sovereign: 0,
  min_es_aligned_pct: 90,
  considers_pai: true,
  pai_categories: [],
  status: "validated",
  evidence: {},
  ...over,
});
const [LEGER, MODERE, FORT] = DEFAULT_SCAN_PROFILES;

describe("profils types", () => {
  it("LEGER = PAI, MODERE = durable ≥ 10 %, FORT = durable ≥ 25 % OU taxinomie ≥ 5 %", () => {
    expect(matchProfile(LEGER, fund("A"), { asOf: AS_OF }).verdict).toBe("ADEQUAT");
    expect(matchProfile(LEGER, fund("A", { considers_pai: false }), { asOf: AS_OF }).verdict).toBe(
      "NON_ADEQUAT",
    );
    expect(
      matchProfile(MODERE, fund("A", { min_sustainable_pct: 10 }), { asOf: AS_OF }).verdict,
    ).toBe("ADEQUAT");
    expect(
      matchProfile(MODERE, fund("A", { min_sustainable_pct: 9.9 }), { asOf: AS_OF }).verdict,
    ).toBe("NON_ADEQUAT");
  });
  it("FORT : une seule alternative satisfaite suffit", () => {
    const byTaxo = matchProfile(
      FORT,
      fund("A", {
        min_sustainable_pct: 0,
        min_taxonomy_pct: 5,
        min_taxonomy_pct_excl_sovereign: 6,
      }),
      { asOf: AS_OF },
    );
    expect(byTaxo).toMatchObject({ verdict: "ADEQUAT", alternative: 1 });
    const bySfdr = matchProfile(FORT, fund("A", { min_sustainable_pct: 25 }), { asOf: AS_OF });
    expect(bySfdr).toMatchObject({ verdict: "ADEQUAT", alternative: 0 });
    expect(matchProfile(FORT, fund("A"), { asOf: AS_OF }).verdict).toBe("NON_ADEQUAT");
  });
  it("FORT : « à vérifier » l'emporte sur « non adéquat » quand une alternative manque de données", () => {
    const r = matchProfile(
      FORT,
      fund("A", { min_taxonomy_pct: null, min_taxonomy_pct_excl_sovereign: null }),
      {
        asOf: AS_OF,
      },
    );
    expect(r).toMatchObject({ verdict: "A_VERIFIER", alternative: 1 });
  });
  it("une alternative partielle l'emporte sur « non adéquat »", () => {
    const p: ScanProfile = {
      key: "X",
      label: "X",
      hypothesis: "x",
      alternatives: [
        { taxonomy_min_pct: 50, sfdr_min_pct: null, pai_required: false, pai_categories: [] },
        { taxonomy_min_pct: 50, sfdr_min_pct: 10, pai_required: false, pai_categories: [] },
      ],
    };
    expect(matchProfile(p, fund("A"), { asOf: AS_OF })).toMatchObject({
      verdict: "PARTIEL",
      alternative: 1,
    });
  });
  it("refuse un profil sans alternative", () => {
    expect(() =>
      matchProfile({ key: "V", label: "V", hypothesis: "", alternatives: [] }, null, {
        asOf: AS_OF,
      }),
    ).toThrow();
  });
});

describe("scan de contrat", () => {
  const meta = {
    insurer: "Assureur Test",
    contract_name: "Contrat Test",
    list_date: "2026-10-01",
    source_url: null,
    as_of: AS_OF,
  };
  const funds = new Map<string, FundData>([
    ["FR0000000001", fund("FR0000000001", { min_sustainable_pct: 30 })],
    [
      "FR0000000002",
      fund("FR0000000002", {
        min_sustainable_pct: 5,
        considers_pai: false,
        min_taxonomy_pct: null,
        min_taxonomy_pct_excl_sovereign: 1.5,
      }),
    ],
    [
      "FR0000000003",
      fund("FR0000000003", { status: "needs_review", name: "Nom ; « guillemets »" }),
    ],
  ]);
  const isins = ["FR0000000001", "FR0000000002", "FR0000000003", "LU0000000004", "FR0000000001"];
  const r = scanContract(meta, isins, funds, DEFAULT_SCAN_PROFILES);

  it("dédoublonne, et compte la couverture", () => {
    expect(r.rows.map((x) => x.isin)).toEqual([
      "FR0000000001",
      "FR0000000002",
      "FR0000000003",
      "LU0000000004",
    ]);
    expect(r.coverage).toEqual({
      total: 4,
      with_data: 3,
      validated: 2,
      needs_review: 1,
      without_data: ["LU0000000004"],
    });
  });
  it("agrège par profil", () => {
    const fort = r.profiles.find((p) => p.key === "FORT")!;
    expect(fort).toMatchObject({
      total: 4,
      adequate: 1,
      non_adequate: 1,
      to_verify: 2,
      partial: 0,
    });
    expect(fort.non_adequate_isins).toEqual(["FR0000000002"]);
    expect(r.rows[1]).toMatchObject({
      min_taxonomy_pct: 1.5,
      verdicts: { LEGER: "NON_ADEQUAT", MODERE: "NON_ADEQUAT" },
    });
    expect(r.rows[1].alerts).toContain("PAI_NON");
    expect(r.rows[3]).toMatchObject({ has_data: false, name: null, alerts: [] });
  });
  it("CSV : BOM, « ; », virgule décimale, échappement", () => {
    const csv = scanCsv(r, DEFAULT_SCAN_PROFILES);
    expect(csv.startsWith("﻿isin;nom;donnees;")).toBe(true);
    const lines = csv.trimEnd().split("\r\n");
    expect(lines).toHaveLength(5);
    expect(lines[0]).toContain("verdict_LEGER;verdict_MODERE;verdict_FORT;constats");
    expect(lines[2]).toContain(";1,5;non;");
    expect(lines[3]).toContain('"Nom ; « guillemets »"');
    expect(lines[4]).toBe("LU0000000004;;non;;;;;;;A_VERIFIER;A_VERIFIER;A_VERIFIER;");
  });
});
