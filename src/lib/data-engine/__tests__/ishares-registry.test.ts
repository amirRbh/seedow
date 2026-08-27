import { describe, it, expect } from "vitest";
import {
  ISHARES_FUNDS,
  ISHARES_FUNDS_US,
  ISHARES_REGISTRY,
  resolveISharesFund,
} from "../ishares-funds";
import { iSharesHoldingsUrl } from "../ishares-holdings";

/**
 * Le registre, et l'appariement qui rendait zéro.
 *
 * L'ingestion s'est terminée en code 0 sur « 21 fonds au registre · 0 cible ».
 * Deux causes cumulées, dont aucune n'était visible depuis le code :
 * `assets.isin` est vide sur tout le catalogue, et le registre ne listait que
 * des UCITS irlandais quand le catalogue est composé d'ETF américains. Aucun
 * ISIN d'un côté, aucun ISIN correspondant de l'autre.
 */

describe("registre iShares", () => {
  it("couvre les deux places, sans mélange", () => {
    expect(ISHARES_FUNDS.every((f) => f.site === "uk")).toBe(true);
    expect(ISHARES_FUNDS_US.every((f) => f.site === "us")).toBe(true);
    expect(ISHARES_REGISTRY).toHaveLength(ISHARES_FUNDS.length + ISHARES_FUNDS_US.length);
  });

  it("n'expose aucun identifiant produit en double", () => {
    const ids = ISHARES_REGISTRY.map((f) => f.portfolioId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("porte un ticker sur les fonds américains — c'est la clé du catalogue", () => {
    // Le catalogue Seedow identifie ses ETF américains par leur ticker et ne
    // porte aucun ISIN. Sans ticker au registre, l'appariement est impossible.
    expect(ISHARES_FUNDS_US.every((f) => f.ticker != null && f.ticker.length > 0)).toBe(true);
  });
});

describe("resolveISharesFund", () => {
  it("apparie un actif qui n'a QUE son ticker", () => {
    // Le cas réel : `assets.isin` est null sur tout le catalogue.
    const found = resolveISharesFund({ isin: null, ticker: "ICLN" });
    expect(found?.portfolioId).toBe("239738");
    expect(found?.site).toBe("us");
  });

  it("apparie un actif qui n'a que son ISIN", () => {
    expect(resolveISharesFund({ isin: "IE00B4L5Y983", ticker: null })?.site).toBe("uk");
  });

  it("préfère l'ISIN au ticker quand les deux sont présents", () => {
    // L'ISIN est l'identifiant sans ambiguïté ; un ticker peut désigner deux
    // valeurs différentes selon la place.
    const found = resolveISharesFund({ isin: "IE00B4L5Y983", ticker: "ICLN" });
    expect(found?.isin).toBe("IE00B4L5Y983");
  });

  it("ignore la casse et les espaces", () => {
    expect(resolveISharesFund({ ticker: "  icln " })?.portfolioId).toBe("239738");
  });

  it("rend null sur un fonds hors registre — une réponse normale", () => {
    expect(resolveISharesFund({ isin: null, ticker: "INCONNU" })).toBeNull();
    expect(resolveISharesFund({ isin: null, ticker: null })).toBeNull();
  });
});

describe("iSharesHoldingsUrl", () => {
  it("vise un hôte différent selon la place", () => {
    // Les deux ne sont pas interchangeables : l'hôte américain sert bien un
    // classeur pour un fonds britannique, mais avec des poids tronqués à
    // l'entier dont la somme tombe à 37 %. Un fichier faux qui a l'air juste.
    const uk = iSharesHoldingsUrl("251882", "uk");
    const us = iSharesHoldingsUrl("239738", "us");
    expect(uk).toContain("uk-retail01-product-data");
    expect(uk).toContain("targetSite=ishares-uk");
    expect(us).toContain("blk-one01-product-data");
    expect(us).toContain("targetSite=us-ishares");
  });

  it("reste sur le site britannique par défaut", () => {
    expect(iSharesHoldingsUrl("251882")).toContain("ishares-uk");
  });

  it("produit une URL rejouable — c'est ce qui est enregistré en source_url", () => {
    const url = new URL(iSharesHoldingsUrl("239738", "us"));
    expect(url.searchParams.get("portfolioId")).toBe("239738");
    expect(url.searchParams.get("component")).toBe("fundDownloadV2");
  });
});
