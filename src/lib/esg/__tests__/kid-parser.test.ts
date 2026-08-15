import { describe, expect, it } from "vitest";
import { parseFrenchNumber, parseKidOngoingCharges, parseKidSfdrArticle } from "../kid-parser";

describe("parseFrenchNumber", () => {
  it("gère la virgule décimale française", () => {
    expect(parseFrenchNumber("1,20")).toBe(1.2);
    expect(parseFrenchNumber("0.80")).toBe(0.8);
    expect(parseFrenchNumber(null)).toBeNull();
    expect(parseFrenchNumber("n/a")).toBeNull();
  });
});

describe("parseKidSfdrArticle", () => {
  it("extrait l'article en contexte de durabilité", () => {
    expect(parseKidSfdrArticle("Ce produit relève de l'article 8 du règlement SFDR.")).toBe(8);
    expect(
      parseKidSfdrArticle("Informations en matière de durabilité : article 9 (2019/2088)."),
    ).toBe(9);
  });
  it("ignore un « article » hors contexte durabilité", () => {
    expect(parseKidSfdrArticle("Conformément à l'article 8 du code monétaire.")).toBeNull();
    expect(parseKidSfdrArticle("aucune mention")).toBeNull();
  });
});

describe("parseKidOngoingCharges", () => {
  it("extrait les frais courants (décimale virgule) → fraction", () => {
    expect(parseKidOngoingCharges("Frais courants 1,20 %")).toBeCloseTo(0.012, 6);
    expect(parseKidOngoingCharges("Coûts récurrents : 0,80%")).toBeCloseTo(0.008, 6);
    expect(
      parseKidOngoingCharges("Frais de gestion et autres frais administratifs 2,00 %"),
    ).toBeCloseTo(0.02, 6);
  });
  it("null si absent ou hors bornes", () => {
    expect(parseKidOngoingCharges("aucun frais indiqué")).toBeNull();
    expect(parseKidOngoingCharges("Frais courants 42 %")).toBeNull();
  });
});
