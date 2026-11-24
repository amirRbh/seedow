/**
 * Le moteur appliqué aux 7 annexes de référence, à partir des valeurs saisies
 * à la main dans `fixtures/annexes/expected.json` (supposées validées). Sert de
 * garde-fou de plausibilité : un changement de règle qui modifie ces verdicts
 * doit être voulu (et incrémenter ENGINE_VERSION).
 */
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { expectedFileSchema } from "../../extraction/accuracy";
import { match } from "../engine";
import type { ClientPreferences, FundData } from "../types";

const fixtures = expectedFileSchema.parse(
  JSON.parse(await readFile("fixtures/annexes/expected.json", "utf8")),
).fixtures;

const funds: Record<string, FundData> = Object.fromEntries(
  Object.entries(fixtures).map(([file, f]) => [
    file.replace(/\.pdf$/, ""),
    {
      isin: f.isin ?? "XX0000000000",
      name: f.fund_name ?? file,
      ...f.fields,
      status: "validated" as const,
      evidence: {},
    },
  ]),
);

const verdicts = (p: ClientPreferences) =>
  Object.fromEntries(
    Object.entries(funds).map(([k, f]) => [k, match(p, f, { asOf: "2026-11-24" }).verdict]),
  );

describe("moteur sur les annexes de référence", () => {
  it("SFDR ≥ 10 % + PAI", () => {
    expect(
      verdicts({
        taxonomy_min_pct: null,
        sfdr_min_pct: 10,
        pai_required: true,
        pai_categories: [],
      }),
    ).toEqual({
      "bnpp-art8-feeder-fr": "PARTIEL",
      "bnpp-global-environment-fr": "ADEQUAT",
      "carmignac-global-active-fr": "ADEQUAT",
      "ecofi-enjeux-futurs-fr": "ADEQUAT",
      "lafrancaise-carbon-impact-govt-bonds-fr": "ADEQUAT",
      "lafrancaise-rendement-global-2028-en": "ADEQUAT",
      "oddo-pilotage-selection-dynamique-en": "NON_ADEQUAT",
    });
  });

  it("taxinomie ≥ 1 % : seul BNPP Global Environment (2 %) passe", () => {
    const v = verdicts({
      taxonomy_min_pct: 1,
      sfdr_min_pct: null,
      pai_required: false,
      pai_categories: [],
    });
    expect(
      Object.entries(v)
        .filter(([, x]) => x === "ADEQUAT")
        .map(([k]) => k),
    ).toEqual(["bnpp-global-environment-fr"]);
  });

  it("PAI eau demandées : catégorie non identifiable chez La Française Rendement 2028", () => {
    const v = verdicts({
      taxonomy_min_pct: null,
      sfdr_min_pct: null,
      pai_required: true,
      pai_categories: ["water"],
    });
    expect(v["lafrancaise-rendement-global-2028-en"]).toBe("A_VERIFIER");
    expect(v["oddo-pilotage-selection-dynamique-en"]).toBe("NON_ADEQUAT");
    expect(v["carmignac-global-active-fr"]).toBe("ADEQUAT");
  });

  it("alertes attendues sur les cas réels", () => {
    const codes = (k: string) =>
      match(
        { taxonomy_min_pct: null, sfdr_min_pct: null, pai_required: false, pai_categories: [] },
        funds[k],
        { asOf: "2026-11-24" },
      ).alerts.map((a) => a.code);
    expect(codes("oddo-pilotage-selection-dynamique-en")).toEqual([
      "TAXO_ZERO",
      "PAI_NON",
      "DOC_ANCIEN",
    ]);
    expect(codes("bnpp-art8-feeder-fr")).toEqual(["ART8_ZERO_INVEST_DURABLE", "TAXO_ZERO"]);
    // « Impact » dans le nom, mais #1 = 90 % ≥ 80 % : pas d'alerte de nom.
    expect(codes("lafrancaise-carbon-impact-govt-bonds-fr")).toEqual(["TAXO_ZERO", "DOC_ANCIEN"]);
  });
});
