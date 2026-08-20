import { describe, expect, it } from "vitest";
import { extractSfdrEvidence, sfdrArticleOf, SFDR_PARSER_VERSION } from "../sfdr-parser";

describe("extractSfdrEvidence — cas EN (§18)", () => {
  it("« The Fund is classified as an Article 8 product » → 8, high, avec preuve", () => {
    const ev = extractSfdrEvidence("The Fund is classified as an Article 8 product.");
    expect(ev?.article).toBe(8);
    expect(ev?.confidence).toBe("high");
    expect(ev?.matchKind).toBe("classification");
    expect(ev?.language).toBe("en");
    expect(ev?.evidenceText).toContain("Article 8");
  });

  it("« classified under Article 9 of Regulation (EU) 2019/2088 » → 9, ref 2019/2088", () => {
    const ev = extractSfdrEvidence(
      "The Sub-Fund is classified under Article 9 of Regulation (EU) 2019/2088.",
    );
    expect(ev?.article).toBe(9);
    expect(ev?.confidence).toBe("high");
    expect(ev?.regulationReference).toBe("EU 2019/2088");
  });

  it("« The Fund does not promote environmental or social characteristics » → null (pas de 6 déduit)", () => {
    // Absence de promotion E/S ≠ classification Article 6 affirmée : on n'invente pas.
    expect(
      extractSfdrEvidence(
        "The Fund does not promote environmental or social characteristics and does not have sustainable investment as its objective.",
      ),
    ).toBeNull();
  });

  it("« Article 8 products are described below » → null (sujet ≠ le fonds, générique)", () => {
    expect(
      extractSfdrEvidence("Article 8 products are described below in this section."),
    ).toBeNull();
  });

  it("aucune mention SFDR → null", () => {
    expect(extractSfdrEvidence("This fund tracks a broad global equity index.")).toBeNull();
    expect(extractSfdrEvidence("")).toBeNull();
  });

  it("négation EN (« does not qualify as Article 9 ») → null si seul article", () => {
    expect(
      extractSfdrEvidence("The Fund does not qualify as an Article 9 product under SFDR."),
    ).toBeNull();
  });

  it("« is an Article 8 fund » (copule) → 8", () => {
    expect(extractSfdrEvidence("The Fund is an Article 8 fund.")?.article).toBe(8);
  });

  it("référence liée EN sans verbe de classif → medium", () => {
    const ev = extractSfdrEvidence(
      "Sustainability information: this share class falls within Article 8 pursuant to Regulation (EU) 2019/2088.",
    );
    expect(ev?.article).toBe(8);
    expect(ev?.confidence).toBe("medium");
    expect(ev?.matchKind).toBe("bound_reference");
  });
});

describe("extractSfdrEvidence — cas FR (parité avec le parseur historique)", () => {
  it("« au sens de l'article 8 du règlement SFDR » → 8, high, fr", () => {
    const ev = extractSfdrEvidence(
      "Le Fonds promeut des caractéristiques environnementales ou sociales au sens de l'article 8 du règlement SFDR.",
    );
    expect(ev?.article).toBe(8);
    expect(ev?.language).toBe("fr");
    expect(ev?.confidence).toBe("high");
  });

  it("article 9 rattaché à 2019/2088", () => {
    expect(
      extractSfdrEvidence(
        "Conformément à l'article 9, paragraphes 1 à 4bis, du règlement (UE) 2019/2088.",
      )?.article,
    ).toBe(9);
  });

  it("écarte l'article 9 nié, retient l'article 8 affirmé (cas DIC réel)", () => {
    const real = [
      "L’objectif de gestion ne comprend pas d’objectif d’investissement durable au sens de l’article 9 du règlement européen 2019/2088.",
      "Le Fonds assure la promotion de critères sociaux au sens de l’article 8 de la réglementation SFDR.",
    ].join("\n");
    expect(extractSfdrEvidence(real)?.article).toBe(8);
  });

  it("négation seule (aucun article affirmé) → null", () => {
    expect(
      extractSfdrEvidence(
        "Le Fonds ne poursuit pas d'objectif durable au sens de l'article 9 du règlement SFDR.",
      ),
    ).toBeNull();
  });

  it("hors contexte SFDR → null (article du code monétaire)", () => {
    expect(extractSfdrEvidence("Conformément à l'article 8 du code monétaire.")).toBeNull();
  });
});

describe("extractSfdrEvidence — ambiguïté", () => {
  it("deux articles distincts affirmés → null", () => {
    const ambiguous = [
      "The Fund is classified as an Article 8 product.",
      "The Fund is classified as an Article 9 product.",
    ].join("\n");
    expect(extractSfdrEvidence(ambiguous)).toBeNull();
  });

  it("classification ambiguë ne se rabat PAS sur une référence liée moins fiable", () => {
    const mixed = [
      "The Fund is classified as an Article 8 product.",
      "The Fund is classified as an Article 9 product.",
      "See Article 6 of Regulation (EU) 2019/2088.",
    ].join("\n");
    expect(extractSfdrEvidence(mixed)).toBeNull();
  });
});

describe("sfdrArticleOf / version", () => {
  it("renvoie le numéro seul", () => {
    expect(sfdrArticleOf("The Fund is classified as an Article 9 product.")).toBe(9);
    expect(sfdrArticleOf("nothing")).toBeNull();
  });
  it("expose une version de parseur (reproductibilité §15)", () => {
    expect(SFDR_PARSER_VERSION).toBeGreaterThanOrEqual(1);
  });
});
