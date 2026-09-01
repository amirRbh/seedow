import { describe, it, expect } from "vitest";
import { canonicalStrategy, fundEntityKey, groupFundEntities } from "../fund-entity";

describe("canonicalStrategy — épluchage des parts de classe", () => {
  it("retire les marqueurs de fin et les parenthèses de part de classe", () => {
    expect(canonicalStrategy("iShares MSCI Japan SRI UCITS ETF EUR Hedged (Acc)")).toBe(
      "ishares msci japan sri",
    );
    expect(canonicalStrategy("iShares MSCI Japan SRI UCITS ETF USD (Dist)")).toBe(
      "ishares msci japan sri",
    );
  });

  it("ne retire pas un marqueur situé au milieu du nom", () => {
    // « Acc » ici n'est pas une part de classe : le retirer fusionnerait deux
    // fonds distincts, l'erreur qu'on ne veut surtout pas commettre.
    expect(canonicalStrategy("Amundi Acc World Fund")).toBe("amundi acc world fund");
  });
});

describe("groupFundEntities — les doublons du catalogue v1", () => {
  it("regroupe les deux parts d'iShares MSCI Japan SRI en une seule fiche", () => {
    const entities = groupFundEntities([
      {
        ticker: "SUJP",
        name: "iShares MSCI Japan SRI UCITS ETF EUR Hedged (Acc)",
        issuer: "iShares",
        isin: "IE00BYVJRP78",
      },
      {
        ticker: "SUJM",
        name: "iShares MSCI Japan SRI UCITS ETF USD (Dist)",
        issuer: "iShares",
        isin: "IE00BYVJRQ85",
      },
    ]);
    expect(entities).toHaveLength(1);
    expect(entities[0].tickers).toEqual(["SUJP", "SUJM"]);
    expect(entities[0].isins).toHaveLength(2);
  });

  it("regroupe les parts Acc/Dist d'un même fonds obligataire", () => {
    const entities = groupFundEntities([
      {
        ticker: "AECB",
        name: "Amundi EUR Corporate Bond ESG UCITS ETF Acc",
        issuer: "Amundi",
        isin: null,
      },
      {
        ticker: "AECR",
        name: "Amundi EUR Corporate Bond ESG UCITS ETF Dist",
        issuer: "Amundi",
        isin: null,
      },
    ]);
    expect(entities).toHaveLength(1);
    expect(entities[0].slug).toBe("AECB");
  });

  it("ne fusionne pas deux stratégies différentes du même émetteur", () => {
    const entities = groupFundEntities([
      { ticker: "SUJP", name: "iShares MSCI Japan SRI UCITS ETF", issuer: "iShares", isin: null },
      { ticker: "SUSM", name: "iShares MSCI EM SRI UCITS ETF", issuer: "iShares", isin: null },
    ]);
    expect(entities).toHaveLength(2);
  });

  it("sépare deux fonds de même nom chez deux émetteurs différents", () => {
    expect(
      fundEntityKey({ ticker: "A", name: "World ESG", issuer: "Amundi", isin: null }),
    ).not.toBe(fundEntityKey({ ticker: "B", name: "World ESG", issuer: "iShares", isin: null }));
  });

  it("retient le nom le plus court — celui du fonds, pas celui d'une part", () => {
    const entities = groupFundEntities([
      {
        ticker: "A",
        name: "Franklin Sustainable Euro Green Bond UCITS ETF EUR Acc",
        issuer: "Franklin",
        isin: null,
      },
      {
        ticker: "B",
        name: "Franklin Sustainable Euro Green Bond UCITS ETF",
        issuer: "Franklin",
        isin: null,
      },
    ]);
    expect(entities).toHaveLength(1);
    expect(entities[0].name).toBe("Franklin Sustainable Euro Green Bond UCITS ETF");
  });
});
