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
  it("extrait l'article rattaché au règlement SFDR", () => {
    // Formulation réelle d'un DIC Lazard (article 8).
    expect(
      parseKidSfdrArticle(
        "…des caractéristiques environnementales ou sociales au sens de l'article 8 du règlement SFDR.",
      ),
    ).toBe(8);
    // Référence à l'annexe pré-contractuelle 2019/2088 (article 9).
    expect(
      parseKidSfdrArticle(
        "Conformément à l'article 9, paragraphes 1 à 4bis, du règlement (UE) 2019/2088.",
      ),
    ).toBe(9);
    expect(parseKidSfdrArticle("Ce produit relève de l'article 6 du règlement SFDR.")).toBe(6);
  });

  it("rejette les « article » hors-SFDR d'un document groupé (prospectus + règlement)", () => {
    // Cas réel : le PDF GECO mêle KID + règlement + taxonomie ; seul l'article
    // rattaché à 2019/2088 compte, pas ceux du règlement interne ni de 2020/852.
    const bundled = [
      "ARTICLE 6 - LE DÉPOSITAIRE",
      "ARTICLE 8 - LES COMPTES ET LE RAPPORT DE GESTION",
      "ARTICLE 9 - MODALITÉS D'AFFECTATION DES SOMMES DISTRIBUABLES",
      "conformément à l'article 6, premier alinéa, du règlement (UE) 2020/852",
      "…environnementales ou sociales au sens de l'article 8 du règlement SFDR.",
    ].join("\n");
    expect(parseKidSfdrArticle(bundled)).toBe(8);
  });

  it("null hors contexte SFDR, ou si ambigu sans formulation de classification", () => {
    expect(parseKidSfdrArticle("Conformément à l'article 8 du code monétaire.")).toBeNull();
    expect(parseKidSfdrArticle("aucune mention")).toBeNull();
    // Deux articles distincts rattachés à SFDR sans « au sens de … » → ambigu.
    const ambiguous = ["ni l'article 8 du règlement SFDR", "ni l'article 9 du règlement SFDR"].join(
      "\n",
    );
    expect(parseKidSfdrArticle(ambiguous)).toBeNull();
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
