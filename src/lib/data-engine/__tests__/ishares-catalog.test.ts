import { describe, expect, it } from "vitest";
import {
  extractProductsFromScreener,
  resolveHarvestTargets,
  type DiscoveredProduct,
} from "../ishares-catalog";

const BASE = "https://www.ishares.com/uk/individual/en";
// ISIN réels et valides (checksum) d'ETF iShares UCITS grand public.
const ISIN_WORLD = "IE00B4L5Y983";
const ISIN_EM = "IE00B4L5YC18";

describe("extractProductsFromScreener", () => {
  it("apparie ISIN + URL produit dans une forme de screener plausible", () => {
    const data = {
      IE001: {
        isin: ISIN_WORLD,
        fundName: "iShares Core MSCI World UCITS ETF",
        productPageUrl: "/uk/individual/en/products/251882/ishares-msci-world",
      },
      IE002: {
        localExchangeTicker: "EMIM",
        isin: ISIN_EM,
        productPageUrl: "https://www.ishares.com/uk/individual/en/products/264659/emerging",
      },
    };
    const products = extractProductsFromScreener(data, BASE);
    const byIsin = new Map(products.map((p) => [p.isin, p.url]));
    expect(byIsin.get(ISIN_WORLD)).toContain("/products/251882/");
    expect(byIsin.get(ISIN_WORLD)).toContain("https://www.ishares.com");
    expect(byIsin.get(ISIN_EM)).toContain("/products/264659/");
  });

  it("marche sur une structure imbriquée en tableau (forme alternative)", () => {
    const data = { data: [{ i: ISIN_WORLD, link: "/products/1/x" }] };
    const products = extractProductsFromScreener(data, BASE);
    expect(products).toHaveLength(1);
    expect(products[0].isin).toBe(ISIN_WORLD);
  });

  it("ignore les objets sans ISIN valide (aucun faux positif via checksum)", () => {
    const data = { row: { code: "NOTANISIN12", productPageUrl: "/products/9/x" } };
    expect(extractProductsFromScreener(data, BASE)).toEqual([]);
  });

  it("ignore un ISIN valide sans URL produit (jamais d'URL fabriquée)", () => {
    const data = { row: { isin: ISIN_WORLD, name: "x" } };
    expect(extractProductsFromScreener(data, BASE)).toEqual([]);
  });

  it("déduplique par ISIN", () => {
    const data = [
      { isin: ISIN_WORLD, productPageUrl: "/products/1/a" },
      { isin: ISIN_WORLD, productPageUrl: "/products/1/b" },
    ];
    expect(extractProductsFromScreener(data, BASE)).toHaveLength(1);
  });
});

describe("resolveHarvestTargets", () => {
  const active = new Map([
    [ISIN_WORLD, { id: "asset-world", name: "World" }],
    [ISIN_EM, { id: "asset-em", name: "EM" }],
  ]);
  const discovered: DiscoveredProduct[] = [
    { isin: ISIN_WORLD, url: "https://www.ishares.com/products/1/world" },
    { isin: "IE00BOGUS999", url: "https://www.ishares.com/products/9/bogus" },
  ];

  it("ne cible que les ISIN présents dans notre univers actif", () => {
    const targets = resolveHarvestTargets({ discovered, activeByIsin: active, base: BASE });
    expect(targets.map((t) => t.isin)).toEqual([ISIN_WORLD]);
    expect(targets[0].assetId).toBe("asset-world");
    expect(targets[0].source).toBe("discovered");
  });

  it("les overrides ont priorité et peuvent ajouter un fonds non découvert", () => {
    const targets = resolveHarvestTargets({
      discovered,
      activeByIsin: active,
      overrides: { [ISIN_EM]: "https://www.ishares.com/products/2/em-pinned" },
      base: BASE,
    });
    const em = targets.find((t) => t.isin === ISIN_EM);
    expect(em?.source).toBe("override");
    expect(em?.url).toContain("em-pinned");
  });

  it("un override sur un ISIN hors univers est ignoré (jamais créé)", () => {
    const targets = resolveHarvestTargets({
      discovered: [],
      activeByIsin: active,
      overrides: { IE00NOTOURS01: "https://www.ishares.com/products/3/x" },
      base: BASE,
    });
    expect(targets).toEqual([]);
  });
});
