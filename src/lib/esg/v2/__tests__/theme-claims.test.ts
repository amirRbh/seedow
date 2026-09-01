import { describe, it, expect } from "vitest";
import { deriveThemeClaims, displayedThemes } from "../theme-claims";

const level = (name: string, tag: string, extra = {}) =>
  deriveThemeClaims({ name, ...extra }).find((c) => c.tag === tag)!.level;

describe("deriveThemeClaims — Seedow n'attribue aucun thème non revendiqué", () => {
  it("corrige les anomalies du catalogue v1", () => {
    // Or physique classé « climat 10 % », monétaires thématisés, ETF cyber
    // crédité de « biodiversité 85 % » : aucun de ces fonds ne revendiquait
    // quoi que ce soit — c'est Seedow qui remplissait la case.
    expect(level("Invesco Physical Gold ETC", "climat")).toBe("non_revendique");
    expect(level("Amundi Euro Overnight Return", "climat")).toBe("non_revendique");
    expect(level("L&G Cyber Security UCITS ETF", "biodiversite")).toBe("non_revendique");
  });

  it("revendique un thème présent dans la dénomination", () => {
    expect(level("Franklin Sustainable Euro Green Bond UCITS ETF", "climat")).toBe("revendique");
    expect(level("iShares Global Timber & Forestry UCITS ETF", "biodiversite")).toBe("revendique");
  });

  it("revendique un thème présent dans l'objectif d'investissement", () => {
    expect(
      level("Amundi Index Solutions", "climat", {
        investmentObjective:
          "Le compartiment vise à répliquer un indice Paris-Aligned Benchmark, en réduisant l'intensité carbone du portefeuille.",
      }),
    ).toBe("revendique");
  });

  it("distingue une simple mention dans la documentation ESG d'une revendication", () => {
    expect(
      level("Some Broad Market ETF", "egalite", {
        esgDocumentation: "The index applies a gender diversity screen among other filters.",
      }),
    ).toBe("mentionne");
  });

  it("n'affiche que ce qui est revendiqué ou mentionné, revendications d'abord", () => {
    const claims = deriveThemeClaims({
      name: "Green Bond Fund",
      esgDocumentation: "Le portefeuille suit également des critères de diversité et d'inclusion.",
    });
    const shown = displayedThemes(claims);
    expect(shown.map((c) => c.level)).toEqual(["revendique", "mentionne"]);
    expect(shown.every((c) => c.level !== "non_revendique")).toBe(true);
  });
});
