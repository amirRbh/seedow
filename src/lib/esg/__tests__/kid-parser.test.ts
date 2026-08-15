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
  it("extrait les frais courants d'un DICI classique (décimale virgule)", () => {
    expect(parseKidOngoingCharges("Frais courants 1,20 %")).toBeCloseTo(0.012, 6);
    expect(parseKidOngoingCharges("Frais courants : 0,80%")).toBeCloseTo(0.008, 6);
  });

  it("extrait les frais récurrents d'un DIC PRIIPS (libellé et montant séparés)", () => {
    // Reproduit la structure réelle d'un DIC PRIIPS H2O (pdftotext -layout) :
    // le libellé et le montant sont sur des lignes distinctes, séparés par du
    // texte contenant des chiffres (« H2O AM EUROPE… »).
    const priips = [
      "Coûts récurrents prélevés chaque année",
      "Frais de gestion et autres frais       H2O AM EUROPE peut être amenée à rémunérer des tiers.",
      "0,8 % de la valeur de votre investissement par an. Il s'agit d'une estimation des coûts",
      "Coûts de transaction                   encourus lorsque nous achetons et vendons.",
    ].join("\n");
    expect(parseKidOngoingCharges(priips)).toBeCloseTo(0.008, 6);
  });

  it("null si le DIC PRIIPS multi-parts affiche plusieurs frais (non attribuable)", () => {
    const multi = [
      "Frais de gestion et autres frais",
      "0,0 % de la valeur de votre investissement par an",
      "Frais de gestion et autres frais",
      "0,8 % de la valeur de votre investissement par an",
    ].join("\n");
    expect(parseKidOngoingCharges(multi)).toBeNull();
  });

  it("null si absent ou hors bornes", () => {
    expect(parseKidOngoingCharges("aucun frais indiqué")).toBeNull();
    expect(parseKidOngoingCharges("Frais courants 42 %")).toBeNull();
    // Ancre présente mais sans le libellé de gestion → on n'extrait pas.
    expect(parseKidOngoingCharges("5,0 % de la valeur de votre investissement par an")).toBeNull();
  });
});
