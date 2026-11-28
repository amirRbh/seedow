import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pdfPagesText } from "../../../../../scripts/pro/lib/pdf-text";
import { MAX_ANNEX_PAGES, findAnnexRanges, locateAnnex, nameScore } from "../annex-locate";

const TITLE8 =
  "Informations précontractuelles pour les produits financiers visés à l’article 8, paragraphes 1, 2 et 2 bis, du règlement (UE) 2019/2088";
const END = "Où puis-je trouver en ligne davantage d’informations spécifiques au produit ?";

describe("repérage de l'annexe SFDR dans un prospectus", () => {
  it("isole l'annexe du fonds dans un prospectus à compartiments", () => {
    const pages = [
      "Prospectus — Sommaire",
      "Règles de fonctionnement",
      `${TITLE8} Dénomination du produit : Alpha Actions Monde Identifiant d’entité juridique : X`,
      "Quelles caractéristiques...",
      END,
      `${TITLE8} Dénomination du produit : Beta Obligations Climat Identifiant d’entité juridique : Y`,
      "Quelle stratégie...",
      END,
      "Annexe — Règlement du fonds",
    ];
    expect(findAnnexRanges(pages)).toEqual([
      { start: 3, end: 5, endFound: true },
      { start: 6, end: 8, endFound: true },
    ]);
    const r = locateAnnex(pages, "BETA OBLIGATIONS CLIMAT");
    expect(r).toMatchObject({ status: "found", range: { start: 6, end: 8 }, annexCount: 2 });
  });

  it("ne devine pas quand aucune annexe ne nomme le fonds", () => {
    const pages = [`${TITLE8} Fonds A`, END, `${TITLE8} Fonds B`, END];
    expect(locateAnnex(pages, "Gamma Croissance").status).toBe("ambiguous");
  });

  it("signale une annexe sans fin repérée et borne sa longueur", () => {
    const pages = [TITLE8, ...Array.from({ length: 30 }, () => "texte")];
    const [r] = findAnnexRanges(pages);
    expect(r).toEqual({ start: 1, end: MAX_ANNEX_PAGES, endFound: false });
    expect(locateAnnex(pages, "x").status).toBe("ambiguous");
  });

  it("répond « introuvable » sur un document sans annexe", () => {
    expect(locateAnnex(["Rapport annuel", "Bilan"], "x").status).toBe("not_found");
  });

  it("note le nom sur les mots significatifs, accents et casse ignorés", () => {
    expect(nameScore("Écofi Enjeux Futurs", "ECOFI ENJEUX FUTURS - Annexe")).toBe(1);
    expect(nameScore("Écofi Enjeux Futurs", "Ecofi Trajectoires")).toBeCloseTo(1 / 3, 10);
  });

  it("retrouve l'annexe entière dans les 7 annexes réelles du jeu de référence", async () => {
    const expected = JSON.parse(readFileSync("fixtures/annexes/expected.json", "utf8")) as {
      fixtures: Record<string, { fund_name: string }>;
    };
    for (const [file, exp] of Object.entries(expected.fixtures)) {
      const pages = await pdfPagesText(new Uint8Array(readFileSync(`fixtures/annexes/${file}`)));
      const r = locateAnnex(pages, exp.fund_name);
      expect(r.status, file).toBe("found");
      if (r.status === "found") {
        expect(r.range.start, file).toBe(1);
        expect(r.range.endFound, file).toBe(true);
        expect(r.range.end, file).toBeGreaterThanOrEqual(pages.length - 1);
      }
    }
  }, 30_000);
});
