import { describe, expect, it } from "vitest";
import { MAX_QUERY_LEN, normalizeFundRequest } from "../fund-request";

describe("normalizeFundRequest", () => {
  it("détecte un ISIN valide", () => {
    const r = normalizeFundRequest("  ie00b4l5y983 ")!;
    expect(r.isin).toBe("IE00B4L5Y983");
    expect(r.query).toBe("ie00b4l5y983");
  });

  it("ISIN invalide → isin null mais requête conservée", () => {
    const r = normalizeFundRequest("IE00B4L5Y984")!;
    expect(r.isin).toBeNull();
    expect(r.query).toBe("IE00B4L5Y984");
  });

  it("texte libre → isin null", () => {
    const r = normalizeFundRequest("Amundi MSCI Emerging Markets")!;
    expect(r.isin).toBeNull();
    expect(r.query).toBe("Amundi MSCI Emerging Markets");
  });

  it("compacte les espaces et rejette le bruit trop court", () => {
    expect(normalizeFundRequest("   world   etf ")!.query).toBe("world etf");
    expect(normalizeFundRequest(" ")).toBeNull();
    expect(normalizeFundRequest("x")).toBeNull();
  });

  it("tronque les requêtes trop longues", () => {
    const r = normalizeFundRequest("a".repeat(300))!;
    expect(r.query.length).toBe(MAX_QUERY_LEN);
  });
});
