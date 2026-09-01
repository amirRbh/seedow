import { describe, it, expect } from "vitest";
import {
  detectE1,
  detectE3,
  formatDiscrepancy,
  isOpposable,
  publishable,
  DISCREPANCY_LIMITS,
  type Discrepancy,
} from "../discrepancies";
import { unverified, type TransparencySignal } from "../signal";

const TODAY = "2026-09-01";

const sfdrSource = {
  text: "The Fund is classified as an Article 8 product under SFDR",
  source_document: "Prospectus",
  source_url: "https://example.com/prospectus.pdf",
  date: "2026-02-10",
};

function policySignal(statut: TransparencySignal["statut"]): TransparencySignal<string> {
  return {
    ...unverified("exclusion_policy_public"),
    statut,
    source_document: "Documentation publique de l'émetteur",
    date_collecte: TODAY,
  };
}

describe("E1 — la nuance qui rendait 59 constats de la v1 attaquables", () => {
  const base = {
    entity_key: "amundi|msci world esg",
    name: "Fonds ESG",
    sfdrArticle: 8,
    sfdrSource,
  };

  it("constate quand l'absence de politique d'exclusion est DOCUMENTÉE", () => {
    const d = detectE1({ ...base, signals: [policySignal("absent")] }, TODAY);
    expect(d).not.toBeNull();
    expect(d!.code).toBe("E1");
    expect(d!.limit).toBe(DISCREPANCY_LIMITS.E1);
  });

  it("ne constate rien quand Seedow n'a pas pu vérifier", () => {
    // Un trou de collecte Seedow n'est pas un défaut du fonds : c'est
    // exactement la confusion qui rendait la v1 indéfendable.
    expect(detectE1({ ...base, signals: [policySignal("non_verifie")] }, TODAY)).toBeNull();
  });

  it("ne constate rien quand la politique est publiée", () => {
    expect(detectE1({ ...base, signals: [policySignal("publie")] }, TODAY)).toBeNull();
  });

  it("ne constate rien sans revendication SFDR sourcée", () => {
    expect(
      detectE1({ ...base, sfdrSource: null, signals: [policySignal("absent")] }, TODAY),
    ).toBeNull();
    expect(
      detectE1({ ...base, sfdrArticle: 6, signals: [policySignal("absent")] }, TODAY),
    ).toBeNull();
  });
});

describe("E3 — le seul constat qui compare des chiffres", () => {
  const source = {
    text: "Rapport annuel 2025",
    source_document: "Rapport annuel",
    source_url: null,
    date: "2026-03-31",
  };

  it("utilise l'indice déclaré par le fonds lui-même", () => {
    const d = detectE3({
      entity_key: "x|y",
      fundIntensity: 140,
      declaredBenchmarkIntensity: 115,
      benchmarkName: "MSCI World",
      source,
    });
    expect(d).not.toBeNull();
    expect(d!.claim.text).toContain("MSCI World");
    // Les deux chiffres viennent de la même source et de la même date : comparer
    // deux photographies prises à deux moments se démonte en une ligne.
    expect(d!.claim.date).toBe(d!.fact.date);
    expect(d!.claim.source_document).toBe(d!.fact.source_document);
  });

  it("ne constate rien quand l'un des deux chiffres manque", () => {
    expect(
      detectE3({
        entity_key: "x|y",
        fundIntensity: 140,
        declaredBenchmarkIntensity: null,
        benchmarkName: "MSCI World",
        source,
      }),
    ).toBeNull();
  });

  it("ne constate rien quand le fonds est sous son indice", () => {
    expect(
      detectE3({
        entity_key: "x|y",
        fundIntensity: 90,
        declaredBenchmarkIntensity: 115,
        benchmarkName: "MSCI World",
        source,
      }),
    ).toBeNull();
  });
});

describe("isOpposable — les trois éléments simultanés", () => {
  const complete: Discrepancy = {
    code: "E1",
    entity_key: "x|y",
    claim: sfdrSource,
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
  };

  it("accepte un constat complet", () => {
    expect(isOpposable(complete)).toBe(true);
  });

  it("refuse un constat sans date sur l'un des deux éléments", () => {
    expect(isOpposable({ ...complete, fact: { ...complete.fact, date: null } })).toBe(false);
    expect(isOpposable({ ...complete, claim: { ...complete.claim, date: null } })).toBe(false);
  });

  it("refuse un constat sans sa limite explicite", () => {
    expect(isOpposable({ ...complete, limit: "  " })).toBe(false);
  });

  it("ne publie ni les brouillons ni les constats retirés", () => {
    expect(publishable({ ...complete, state: "brouillon" })).toBe(false);
    expect(publishable({ ...complete, state: "retire" })).toBe(false);
    // Un constat contesté reste publié, avec la contestation à côté.
    expect(publishable({ ...complete, state: "conteste" })).toBe(true);
  });

  it("formate les trois lignes, la troisième comprise", () => {
    const lines = formatDiscrepancy(complete);
    expect(lines.declares).toContain("Prospectus, 2026-02-10");
    expect(lines.shows).toContain("Site émetteur, 2026-08-30");
    expect(lines.doesNotSay).toBe(DISCREPANCY_LIMITS.E1);
  });
});
