import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { pdfPagesText } from "../../../../../scripts/pro/lib/pdf-text";
import type { Extraction } from "../schema";
import { normalizeForMatch, numbersIn, quoteInText, verifyExtraction } from "../verify";

type F = Extraction["fund_name"];
const none = { value: null, page: null, quote: null, ambiguous: false, visual: false, note: null };
const ev = <T>(value: T, page: number, quote: string, extra: Partial<Omit<F, "value">> = {}) => ({
  value,
  page,
  quote,
  ambiguous: false,
  visual: false,
  note: null,
  ...extra,
});

function baseExtraction(over: Partial<Extraction> = {}): Extraction {
  return {
    language: "fr",
    fund_name: none,
    isin: none,
    lei: none,
    management_company: none,
    sfdr_article: none,
    doc_date: none,
    min_sustainable_pct: none,
    min_sustainable_env_pct: none,
    min_sustainable_social_pct: none,
    min_taxonomy_pct: none,
    min_taxonomy_pct_excl_sovereign: none,
    min_es_aligned_pct: none,
    considers_pai: none,
    pai_all_mandatory_indicators: none,
    pai_categories: [],
    fossil_gas_nuclear: none,
    ...over,
  } as Extraction;
}

describe("normalizeForMatch / quoteInText", () => {
  it("ignore les espaces parasites et la casse des extracteurs PDF", () => {
    const page = "Ce produit financier a - t - il un objectif d’ investissement durable   ?";
    expect(
      quoteInText("Ce produit financier a-t-il un objectif d'investissement durable ?", page),
    ).toBe(true);
  });
  it("conserve l'ordre des caractères (pas de sac de mots)", () => {
    expect(quoteInText("durable investissement", "investissement durable")).toBe(false);
  });
  it("accepte des fragments joints par des points de suspension, dans l'ordre", () => {
    const page =
      "Il promeut des caractéristiques E/S et contiendra une proportion minimale de 10% d'investissements durables";
    expect(quoteInText("Il promeut des caractéristiques … proportion minimale de 10%", page)).toBe(
      true,
    );
    expect(quoteInText("proportion minimale de 10% … Il promeut", page)).toBe(false);
  });
  it("unifie apostrophes typographiques et ligatures", () => {
    expect(normalizeForMatch("l’eﬃcacité")).toBe(normalizeForMatch("l'efficacité"));
  });
  it("lit les nombres à virgule française", () => {
    expect(numbersIn("proportion minimale de 55,0% et 1.5 %")).toEqual([55, 1.5]);
  });
});

describe("verifyExtraction (règles)", () => {
  const pages = [
    "Informations précontractuelles pour les produits financiers visés à l'article 8 du règlement (UE) 2019/2088",
    "Il promeut des caractéristiques E/S et contiendra une proportion minimale de 20% d'investissements durables. La part minimale alignée sur la taxinomie est de 0%. Oui, le produit prend en compte les principales incidences négatives.",
  ];
  const ok = baseExtraction({
    sfdr_article: ev(8, 1, "produits financiers visés à l'article 8 du règlement (UE) 2019/2088"),
    min_sustainable_pct: ev(
      20,
      2,
      "contiendra une proportion minimale de 20% d'investissements durables",
    ),
    min_taxonomy_pct: ev(0, 2, "La part minimale alignée sur la taxinomie est de 0%"),
    considers_pai: ev(
      true,
      2,
      "Oui, le produit prend en compte les principales incidences négatives",
    ),
  });

  it("toutes les citations vérifiées → auto", () => {
    const r = verifyExtraction(ok, pages);
    expect(r.status).toBe("auto");
    expect(r.reviewReasons).toEqual([]);
    expect(r.evidence.min_sustainable_pct.verified).toBe(true);
  });
  it("une citation sur la mauvaise page → needs_review, page réelle signalée", () => {
    const r = verifyExtraction(
      { ...ok, min_sustainable_pct: { ...ok.min_sustainable_pct, page: 1 } },
      pages,
    );
    expect(r.status).toBe("needs_review");
    expect(r.evidence.min_sustainable_pct.found_on_pages).toEqual([2]);
  });
  it("une citation inventée → needs_review", () => {
    const r = verifyExtraction(
      { ...ok, min_taxonomy_pct: ev(5, 2, "La part minimale alignée sur la taxinomie est de 5%") },
      pages,
    );
    expect(r.status).toBe("needs_review");
    expect(r.evidence.min_taxonomy_pct.verified).toBe(false);
  });
  it("citation exacte mais sans la valeur annoncée → needs_review", () => {
    const r = verifyExtraction(
      { ...ok, min_sustainable_pct: { ...ok.min_sustainable_pct, value: 25 } },
      pages,
    );
    expect(r.evidence.min_sustainable_pct.issue).toMatch(/ne contient pas la valeur 25/);
    expect(r.status).toBe("needs_review");
  });
  it("citation trop courte (« Oui ») → non probante", () => {
    const r = verifyExtraction({ ...ok, considers_pai: ev(true, 2, "Oui") }, pages);
    expect(r.evidence.considers_pai.verified).toBe(false);
    expect(r.status).toBe("needs_review");
  });
  it("champ clé null pour un art. 8 → needs_review", () => {
    const r = verifyExtraction({ ...ok, considers_pai: none }, pages);
    expect(r.reviewReasons.join()).toMatch(/considers_pai : absent alors que le fonds est art. 8/);
  });
  it("article SFDR non établi → needs_review", () => {
    expect(verifyExtraction({ ...ok, sfdr_article: none }, pages).status).toBe("needs_review");
  });
  it("valeur ambiguë → needs_review même si la citation est vérifiée", () => {
    const amb = { ...ok.min_sustainable_pct, ambiguous: true, note: "20 % p.2, 30 % p.5" };
    const r = verifyExtraction({ ...ok, min_sustainable_pct: amb }, pages);
    expect(r.status).toBe("needs_review");
    expect(r.evidence.min_sustainable_pct.ambiguous).toBe(true);
  });
  it("valeur graphique sur un champ clé → needs_review ; hors champ clé → reste auto", () => {
    const visualKey = { ...ok.min_taxonomy_pct, visual: true };
    expect(verifyExtraction({ ...ok, min_taxonomy_pct: visualKey }, pages).status).toBe(
      "needs_review",
    );
    const visualOther = ev(0, 2, "La part minimale alignée sur la taxinomie est de 0%", {
      visual: true,
    });
    expect(
      verifyExtraction({ ...ok, min_taxonomy_pct_excl_sovereign: visualOther }, pages).status,
    ).toBe("auto");
  });
  it("catégories PAI : explicites vérifiées, ou toutes via « tous les indicateurs obligatoires »", () => {
    const p = [
      ...pages,
      "Le fonds prend en compte les 14 indicateurs obligatoires du tableau 1, dont les émissions de GES.",
    ];
    const explicit = verifyExtraction(
      { ...ok, pai_categories: [{ category: "ghg", page: 3, quote: "dont les émissions de GES" }] },
      p,
    );
    expect(explicit.paiCategories).toEqual(["ghg"]);
    const all = verifyExtraction(
      {
        ...ok,
        pai_all_mandatory_indicators: ev(
          true,
          3,
          "prend en compte les 14 indicateurs obligatoires du tableau 1",
        ),
      },
      p,
    );
    expect(all.paiCategories).toEqual(["ghg", "biodiversity", "water", "waste", "social"]);
  });
});

describe("verifyExtraction sur une vraie annexe (artefacts pdfjs réels)", () => {
  it("vérifie des citations recopiées du PDF Oddo (EN)", async () => {
    const bytes = new Uint8Array(
      await readFile("fixtures/annexes/oddo-pilotage-selection-dynamique-en.pdf"),
    );
    const pages = await pdfPagesText(bytes);
    const x = baseExtraction({
      language: "en",
      sfdr_article: ev(8, 1, "Environmental and/or social characteristics", { note: null }),
      min_sustainable_pct: ev(8, 1, "minimum proportion of 8.0% of sustainable"),
      min_taxonomy_pct: ev(0, 3, "At least 0% of the Fund's assets will be taxonomy-aligned."),
      considers_pai: ev(
        false,
        2,
        "available on the Management Company’s website: am.oddo-bhf.com. ☒ No",
      ),
      min_es_aligned_pct: ev(
        75,
        3,
        "At least 8% of the Fund’s assets will sustainable investments and at least 75% of the Fund’s assets will be",
      ),
    });
    const r = verifyExtraction(x, pages);
    expect(r.evidence.min_sustainable_pct.verified).toBe(true);
    expect(r.evidence.min_taxonomy_pct.verified).toBe(true);
    expect(r.evidence.min_es_aligned_pct.verified).toBe(true);
    expect(r.evidence.considers_pai.verified).toBe(true);
  });
});
