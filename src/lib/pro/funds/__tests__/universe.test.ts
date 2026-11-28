import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isValidIsin } from "../../app/isin";
import { gecoFundSchema, selectUniverse, type GecoFund } from "../universe";

const f = (over: Partial<GecoFund>): GecoFund => ({
  cmpId: "c1",
  name: "Fonds Climat",
  isin: "FR0010592022",
  family: "OPCVM - Organisme de placement collectif en valeurs mobilières",
  amfClass: "Actions internationales",
  terms: ["climat"],
  baseline: "PAB",
  sgpId: 1,
  sgpName: "SGP A",
  gecoUrl: "https://geco.amf-france.org/produits-financiers/c1",
  ...over,
});

describe("sélection de l'univers UC", () => {
  it("applique les règles dans l'ordre et compte chaque exclusion", () => {
    const r = selectUniverse(
      [
        f({}),
        f({ cmpId: "c2", isin: "990000103989" }), // code AMF épargne salariale
        f({ cmpId: "c3", isin: "FR0013439528", family: "FIA d'épargne salariale" }),
        f({ cmpId: "c4", isin: "FR0010500603", amfClass: "Fonds à formule" }),
        f({ cmpId: "c1", isin: "FR0010698555" }), // même compartiment
        f({ cmpId: "c6", isin: "FR0000446304", name: "Z Fonds ISR", sgpName: "SGP A" }),
      ],
      { maxPerManager: 1, sourceDate: "2026-10-09" },
    );
    expect(r.selected.map((x) => x.isin)).toEqual(["FR0010592022"]);
    expect(r.excluded).toEqual({
      isin_invalide: 1,
      famille_hors_grand_public: 1,
      formule_ou_monetaire: 1,
      doublon_compartiment: 1,
      plafond_societe: 1,
    });
    expect(r.selected[0]!.legal_form).toBe("OPCVM");
    expect(r.selected[0]!.selection_reason).toContain("2026-10-09");
  });

  it("est déterministe quel que soit l'ordre d'entrée", () => {
    const funds = [
      f({ cmpId: "a", isin: "FR0010592022", name: "B", sgpName: "Y" }),
      f({ cmpId: "b", isin: "FR0013439528", name: "A", sgpName: "X" }),
    ];
    const a = selectUniverse(funds, { maxPerManager: 4, sourceDate: "d" });
    const b = selectUniverse([...funds].reverse(), { maxPerManager: 4, sourceDate: "d" });
    expect(a).toEqual(b);
    expect(a.selected.map((x) => x.management_company)).toEqual(["X", "Y"]);
  });

  it("sur l'extrait GECO du repo : entre 100 et 200 fonds, ISIN valides et uniques", () => {
    const raw = gecoFundSchema
      .array()
      .parse(JSON.parse(readFileSync("data/prospects/geco-fonds-esg-2026-10-09.json", "utf8")));
    const r = selectUniverse(raw, { maxPerManager: 4, sourceDate: "2026-10-09" });
    expect(r.selected.length).toBeGreaterThanOrEqual(100);
    expect(r.selected.length).toBeLessThanOrEqual(200);
    expect(new Set(r.selected.map((x) => x.isin)).size).toBe(r.selected.length);
    expect(r.selected.every((x) => isValidIsin(x.isin))).toBe(true);
  });
});
