import { describe, expect, it } from "vitest";
import { absolutize, pickHoldingsCsvUrl } from "../ishares-holdings-url";

const BASE = "https://www.ishares.com/uk/individual/en/products/251882/ishares-msci-world";

describe("absolutize", () => {
  it("résout un href relatif contre la page produit", () => {
    expect(absolutize("/uk/.../1506575576011.ajax?fileType=csv", BASE)).toContain(
      "https://www.ishares.com/uk/.../1506575576011.ajax?fileType=csv",
    );
  });
  it("garde une URL déjà absolue", () => {
    const abs = "https://www.ishares.com/x.ajax?fileType=csv&dataType=fund";
    expect(absolutize(abs, BASE)).toBe(abs);
  });
  it("null sur href inexploitable", () => {
    expect(absolutize("::::", "not a url")).toBeNull();
  });
});

describe("pickHoldingsCsvUrl", () => {
  it("sélectionne le CSV de holdings (dataType=fund) parmi plusieurs liens", () => {
    const hrefs = [
      "/uk/products/x/perf.ajax?fileType=csv&dataType=performance",
      "/uk/products/x/1506575576011.ajax?fileType=csv&dataType=fund&fileName=World_holdings",
      "/uk/products/x/factsheet.pdf",
    ];
    const url = pickHoldingsCsvUrl(hrefs, BASE);
    expect(url).toContain("dataType=fund");
    expect(url).toContain("https://www.ishares.com");
  });

  it("reconnaît un lien .csv nommé holdings sans dataType", () => {
    expect(pickHoldingsCsvUrl(["https://x.com/fund_holdings.csv"], BASE)).toBe(
      "https://x.com/fund_holdings.csv",
    );
  });

  it("null si aucun lien ne correspond (jamais d'URL devinée)", () => {
    expect(
      pickHoldingsCsvUrl(
        ["/x/factsheet.pdf", "/x/perf.ajax?fileType=csv&dataType=performance"],
        BASE,
      ),
    ).toBeNull();
    expect(pickHoldingsCsvUrl([], BASE)).toBeNull();
  });

  it("préfère le candidat le plus spécifique quand plusieurs matchent", () => {
    const url = pickHoldingsCsvUrl(
      [
        "https://x.com/holdings.csv",
        "https://x.com/1506.ajax?fileType=csv&dataType=fund&fileName=holdings",
      ],
      BASE,
    );
    expect(url).toContain("dataType=fund");
  });
});
