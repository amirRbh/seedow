import { describe, it, expect } from "vitest";
import {
  checkFundName,
  detectNameTerms,
  normalizeName,
  renderNameCheckReport,
  requirementsFor,
  PAB_EXCLUSIONS,
  CTB_EXCLUSIONS,
  type FundDocumentation,
} from "../esma-fund-names";

const src = (text: string) => ({
  text,
  source_document: "Annexe précontractuelle SFDR",
  source_url: "https://example.com/annexe.pdf",
  date: "2026-03-01",
});

function doc(over: Partial<FundDocumentation>): FundDocumentation {
  return {
    id: "F1",
    name: "Fonds Test",
    sfdrArticle: 8,
    sfdrSource: src("Article 8"),
    benchmarkExclusionsReference: null,
    declaredExclusions: [],
    minAlignedProportionPct: null,
    minSustainableInvestmentPct: null,
    ...over,
  };
}

describe("detectNameTerms", () => {
  it("normalise accents et ponctuation", () => {
    expect(normalizeName("Actions Européennes — Durabilité")).toBe(
      " actions europeennes durabilite ",
    );
  });

  it("reconnaît un terme sur des mots entiers seulement", () => {
    expect(detectNameTerms("Greenwich Equity")).toEqual([]);
    expect(detectNameTerms("Euro Green Bond").map((t) => t.term)).toEqual(["green"]);
  });

  it("lit ESG / ISR comme E, S et G à la fois", () => {
    const [m] = detectNameTerms("Actions Euro ISR");
    expect(m.categories).toEqual(["environnement", "social", "gouvernance"]);
  });

  it("marque les termes non tranchés comme ambigus", () => {
    const [m] = detectNameTerms("Global Responsible Equity");
    expect(m.ambiguous).toBe(true);
  });

  it("« transition énergétique » est aussi un terme environnemental", () => {
    const r = requirementsFor(detectNameTerms("123 Transition Energetique"));
    expect(r.baseline).toBe("PAB");
    expect(r.transitionPath).toBe(true);
    expect(r.readingNotes.length).toBeGreaterThan(0);
  });

  it("reconnaît les expressions multi-mots", () => {
    expect(detectNameTerms("World Net-Zero Leaders").map((t) => t.term)).toEqual(["net zero"]);
  });
});

describe("requirementsFor", () => {
  it("aucun terme → aucune exigence", () => {
    expect(requirementsFor([]).baseline).toBeNull();
  });

  it("social / gouvernance / transition → socle CTB", () => {
    expect(requirementsFor(detectNameTerms("Social Bond Fund")).baseline).toBe("CTB");
    expect(requirementsFor(detectNameTerms("Climate Transition")).baseline).toBe("PAB");
    expect(requirementsFor(detectNameTerms("Transition Leaders")).baseline).toBe("CTB");
  });

  it("environnement / impact / durabilité → socle PAB", () => {
    expect(requirementsFor(detectNameTerms("Impact Europe")).baseline).toBe("PAB");
    expect(requirementsFor(detectNameTerms("Sustainable Equity")).baseline).toBe("PAB");
  });

  it("durabilité → engagement d'investissements durables", () => {
    expect(requirementsFor(detectNameTerms("Sustainable Equity")).meaningfulSustainable).toBe(true);
    expect(requirementsFor(detectNameTerms("Green Equity")).meaningfulSustainable).toBe(false);
  });

  it("signale la combinaison transition + environnement comme point de lecture", () => {
    const r = requirementsFor(detectNameTerms("Climate Transition"));
    expect(r.readingNotes.some((n) => n.includes("transition"))).toBe(true);
  });
});

describe("checkFundName", () => {
  it("nom sans terme ESG : un seul point, sans objet", () => {
    const c = checkFundName(doc({ name: "Actions Monde" }));
    expect(c.points.map((p) => p.code)).toEqual(["N0"]);
    expect(c.points[0].status).toBe("sans_objet");
  });

  it("un renvoi explicite au socle PAB documente N1", () => {
    const c = checkFundName(
      doc({
        name: "Euro Green Equity",
        benchmarkExclusionsReference: { value: "PAB", source: src("exclusions art. 12(1)(a)-(g)") },
        minAlignedProportionPct: { value: 90, source: src("90 % minimum") },
      }),
    );
    const n1 = c.points.find((p) => p.code === "N1")!;
    expect(n1.status).toBe("documente");
    expect(n1.sources).toHaveLength(1);
    expect(c.points.find((p) => p.code === "N2")!.status).toBe("documente");
  });

  it("un renvoi PAB couvre aussi le socle CTB", () => {
    const c = checkFundName(
      doc({
        name: "Social Leaders",
        benchmarkExclusionsReference: { value: "PAB", source: src("PAB") },
      }),
    );
    expect(c.points.find((p) => p.code === "N1")!.status).toBe("documente");
  });

  it("un renvoi CTB ne couvre pas le socle PAB : liste les exclusions manquantes", () => {
    const c = checkFundName(
      doc({
        name: "Climate Equity",
        benchmarkExclusionsReference: { value: "CTB", source: src("CTB") },
      }),
    );
    const n1 = c.points.find((p) => p.code === "N1")!;
    expect(n1.status).toBe("ecart_documentaire");
    expect(n1.detail).toContain("charbon");
    expect(n1.detail).not.toContain("tabac");
  });

  it("des exclusions déclarées une à une suffisent si elles couvrent le socle", () => {
    const c = checkFundName(
      doc({
        name: "Social Leaders",
        declaredExclusions: CTB_EXCLUSIONS.map((value) => ({ value, source: src(value) })),
      }),
    );
    expect(c.points.find((p) => p.code === "N1")!.status).toBe("documente");
    expect(PAB_EXCLUSIONS.length).toBeGreaterThan(CTB_EXCLUSIONS.length);
  });

  it("part minimale sous 80 % → écart documentaire, avec la valeur", () => {
    const c = checkFundName(
      doc({ name: "Green Equity", minAlignedProportionPct: { value: 60, source: src("60 %") } }),
    );
    const n2 = c.points.find((p) => p.code === "N2")!;
    expect(n2.status).toBe("ecart_documentaire");
    expect(n2.detail).toContain("60");
  });

  it("durabilité avec part d'investissements durables : à apprécier, jamais « documenté »", () => {
    const c = checkFundName(
      doc({
        name: "Sustainable Equity",
        minSustainableInvestmentPct: { value: 20, source: src("20 %") },
      }),
    );
    expect(c.points.find((p) => p.code === "N3")!.status).toBe("a_verifier");
  });

  it("article 6 avec un nom ESG → N5", () => {
    const c = checkFundName(doc({ name: "ESG Equity", sfdrArticle: 6 }));
    expect(c.points.find((p) => p.code === "N5")!.status).toBe("ecart_documentaire");
  });

  it("transition / impact → N4 à vérifier manuellement", () => {
    const c = checkFundName(doc({ name: "Impact Europe" }));
    expect(c.points.find((p) => p.code === "N4")!.status).toBe("a_verifier");
  });

  it("chaque point porte sa limite, et le contrôle rappelle qu'il ne voit pas les positions", () => {
    const c = checkFundName(doc({ name: "Green Equity" }));
    for (const p of c.points) expect(p.limit.length).toBeGreaterThan(20);
    expect(c.points.at(-1)!.code).toBe("N6");
  });
});

describe("renderNameCheckReport", () => {
  it("affiche la mention de démonstration et les statuts en toutes lettres", () => {
    const md = renderNameCheckReport([checkFundName(doc({ name: "Green Equity" }))], {
      client: "Démo",
      generatedOn: "2026-10-09",
      demo: true,
    });
    expect(md).toContain("DÉMONSTRATION");
    expect(md).toContain("Écart documentaire");
    expect(md).toContain("Ce que ce point ne dit pas");
  });

  it("sans démonstration, pas de mention fictive", () => {
    const md = renderNameCheckReport([], { client: "X", generatedOn: "2026-10-09", demo: false });
    expect(md).not.toContain("DÉMONSTRATION");
  });
});
