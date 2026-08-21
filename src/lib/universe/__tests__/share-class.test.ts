import { describe, expect, it } from "vitest";
import {
  detectShareClassCandidates,
  normalizeFundName,
  type ShareClassAsset,
} from "../share-class";

function a(over: Partial<ShareClassAsset> & { id: string; name: string }): ShareClassAsset {
  return { isin: null, issuer: null, shareClassOf: null, ...over };
}

describe("normalizeFundName", () => {
  it("retire les marqueurs de classe de parts et de devise", () => {
    const acc = normalizeFundName("iShares Core MSCI World UCITS ETF USD (Acc)");
    const dist = normalizeFundName("iShares Core MSCI World UCITS ETF EUR Dist");
    expect(acc).toBe(dist);
    expect(acc).toContain("core msci world");
  });
  it("neutralise diacritiques et ponctuation", () => {
    expect(normalizeFundName("Amundi Épargne — Actions")).toBe(
      normalizeFundName("amundi epargne actions"),
    );
  });
  it("distingue deux fonds réellement différents", () => {
    expect(normalizeFundName("MSCI World Acc")).not.toBe(normalizeFundName("MSCI Europe Acc"));
  });
});

describe("detectShareClassCandidates", () => {
  it("regroupe les classes du même fonds/émetteur", () => {
    const groups = detectShareClassCandidates([
      a({ id: "1", name: "Core MSCI World UCITS ETF USD Acc", issuer: "iShares" }),
      a({ id: "2", name: "Core MSCI World UCITS ETF EUR Dist", issuer: "iShares" }),
      a({ id: "3", name: "MSCI Europe UCITS ETF Acc", issuer: "iShares" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].members.map((m) => m.id).sort()).toEqual(["1", "2"]);
  });

  it("ne regroupe pas à travers deux émetteurs différents", () => {
    const groups = detectShareClassCandidates([
      a({ id: "1", name: "MSCI World UCITS ETF Acc", issuer: "iShares" }),
      a({ id: "2", name: "MSCI World UCITS ETF Acc", issuer: "Amundi" }),
    ]);
    expect(groups).toHaveLength(0);
  });

  it("ignore les actifs déjà reliés (share_class_of renseigné)", () => {
    const groups = detectShareClassCandidates([
      a({ id: "1", name: "MSCI World UCITS ETF Acc", issuer: "iShares" }),
      a({ id: "2", name: "MSCI World UCITS ETF Dist", issuer: "iShares", shareClassOf: "1" }),
    ]);
    expect(groups).toHaveLength(0);
  });

  it("ne fusionne pas : renvoie les membres bruts pour revue", () => {
    const groups = detectShareClassCandidates([
      a({ id: "1", name: "MSCI World Acc", issuer: "iShares", isin: "IE00A" }),
      a({ id: "2", name: "MSCI World Dist", issuer: "iShares", isin: "IE00B" }),
    ]);
    expect(groups[0].members).toHaveLength(2);
    // Les ISIN restent distincts : aucune décision d'identité n'est prise.
    expect(groups[0].members.map((m) => m.isin)).toEqual(["IE00A", "IE00B"]);
  });

  it("ignore un nom réduit à des marqueurs génériques (pas de signal)", () => {
    const groups = detectShareClassCandidates([
      a({ id: "1", name: "UCITS ETF Acc", issuer: "X" }),
      a({ id: "2", name: "ETF Dist USD", issuer: "X" }),
    ]);
    expect(groups).toHaveLength(0);
  });
});
