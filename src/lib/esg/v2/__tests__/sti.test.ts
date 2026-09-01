import { describe, it, expect } from "vitest";
import { computeSti, STI_SIGNAL_IDS, stiLabel, type StiSignalId } from "../sti";
import { unverified, type TransparencySignal } from "../signal";

const NOW = new Date("2026-09-01T00:00:00Z");

function signal(
  id: StiSignalId,
  statut: TransparencySignal["statut"],
  extra: Partial<TransparencySignal> = {},
): TransparencySignal<string> {
  return { ...unverified(id), statut, ...extra };
}

/** Tous les signaux résolus à `absent` : la recherche a été menée, rien n'est publié. */
function allAbsent(): TransparencySignal<string>[] {
  return STI_SIGNAL_IDS.map((id) => signal(id, "absent"));
}

describe("computeSti — règle d'abstention", () => {
  it("ne publie pas de score quand aucun signal n'a été collecté", () => {
    const r = computeSti([], { now: NOW });
    expect(r.publishable).toBe(false);
    expect(r.score).toBeNull();
    expect(r.label).toBe("non_notable");
    expect(r.blocksEvaluated).toBe(0);
  });

  it("distingue un bloc évalué à zéro d'un bloc non évaluable", () => {
    const r = computeSti(allAbsent(), { now: NOW });
    // Recherche menée partout : les cinq blocs sont évaluables, et le score
    // est 0 — ce qui n'est PAS la même chose que « non notable ».
    expect(r.publishable).toBe(true);
    expect(r.score).toBe(0);
    expect(r.label).toBe("faible");
    expect(r.blocksEvaluated).toBe(5);
    expect(r.unverifiedSignals).toHaveLength(0);
  });

  it("un seul signal non vérifié rend son bloc nul, pas zéro", () => {
    const signals = allAbsent().map((s) =>
      s.signal === "third_party_audit" ? signal("third_party_audit", "non_verifie") : s,
    );
    const r = computeSti(signals, { now: NOW });
    const blockE = r.blocks.find((b) => b.id === "E")!;
    expect(blockE.evaluable).toBe(false);
    expect(r.blocksEvaluated).toBe(4);
    expect(r.publishable).toBe(true); // 4 blocs sur 5, A et B présents
    expect(r.unverifiedSignals).toEqual(["third_party_audit"]);
  });

  it("reproportionne sur les blocs évalués au lieu de compter le bloc absent comme zéro", () => {
    // Bloc A plein (30/30), bloc E non vérifié, tout le reste absent.
    const signals = allAbsent().map((s) => {
      if (s.signal === "third_party_audit" || s.signal === "public_label")
        return signal(s.signal as StiSignalId, "non_verifie");
      if (
        [
          "kid_public",
          "exclusion_policy_public",
          "esg_report_annual",
          "holdings_full_monthly",
        ].includes(s.signal)
      )
        return signal(s.signal as StiSignalId, "publie", {
          source_document: "KID",
          date_donnee: "2026-08-01",
        });
      return s;
    });
    const r = computeSti(signals, { now: NOW });
    // Blocs évalués : A(30/30) + B(0/25) + C(0/25) + D(10/10) = 40 / 90.
    expect(r.blocksEvaluated).toBe(4);
    expect(r.score).toBe(Math.round((100 * 40) / 90));
  });

  it("refuse de publier quand le bloc A ou le bloc B n'est pas évaluable", () => {
    const signals = allAbsent().map((s) =>
      s.signal === "exclusion_tabac" ? signal("exclusion_tabac", "non_verifie") : s,
    );
    const r = computeSti(signals, { now: NOW });
    expect(r.blocksEvaluated).toBe(4);
    expect(r.publishable).toBe(false); // B est obligatoire
    expect(r.score).toBeNull();
  });
});

describe("computeSti — bloc B, précision et non sévérité", () => {
  it("donne plus de points à un seuil quantifié qu'à une déclaration sans seuil", () => {
    const base = allAbsent();
    const withThreshold = computeSti(
      base.map((s) =>
        s.signal === "exclusion_fossiles"
          ? signal("exclusion_fossiles", "publie", {
              valeur: "seuil_quantifie",
              source_document: "Politique d'exclusion",
            })
          : s,
      ),
      { now: NOW },
    );
    const withoutThreshold = computeSti(
      base.map((s) =>
        s.signal === "exclusion_fossiles"
          ? signal("exclusion_fossiles", "publie", {
              valeur: "declare_sans_seuil",
              source_document: "Politique d'exclusion",
            })
          : s,
      ),
      { now: NOW },
    );
    const b = (r: ReturnType<typeof computeSti>) => r.blocks.find((x) => x.id === "B")!.earned;
    expect(b(withThreshold)).toBe(4);
    expect(b(withoutThreshold)).toBe(2);
  });

  it("plafonne le bloc B à 25 points même avec les six secteurs quantifiés", () => {
    const signals = allAbsent().map((s) =>
      s.signal.startsWith("exclusion_") && s.signal !== "exclusion_policy_public"
        ? signal(s.signal as StiSignalId, "publie", {
            valeur: "seuil_quantifie",
            source_document: "Politique d'exclusion",
          })
        : s,
    );
    const r = computeSti(signals, { now: NOW });
    expect(r.blocks.find((b) => b.id === "B")!.earned).toBe(24);
  });
});

describe("computeSti — bloc D, fraîcheur", () => {
  const dated = (date: string) =>
    allAbsent().map((s) =>
      s.signal === "kid_public"
        ? signal("kid_public", "publie", { source_document: "KID", date_donnee: date })
        : s,
    );
  const dPoints = (date: string) =>
    computeSti(dated(date), { now: NOW }).blocks.find((b) => b.id === "D")!.earned;

  it("applique le barème d'ancienneté", () => {
    expect(dPoints("2026-08-01")).toBe(10); // ≤ 3 mois
    expect(dPoints("2026-04-01")).toBe(6); // 3–6 mois
    expect(dPoints("2025-12-01")).toBe(3); // 6–12 mois
    expect(dPoints("2024-01-01")).toBe(0); // > 12 mois
  });

  it("compte 0 quand les documents publiés ne portent pas de date", () => {
    const signals = allAbsent().map((s) =>
      s.signal === "kid_public"
        ? signal("kid_public", "publie", { source_document: "KID", date_donnee: null })
        : s,
    );
    const r = computeSti(signals, { now: NOW });
    expect(r.blocks.find((b) => b.id === "D")!.earned).toBe(0);
    expect(r.oldestDataDate).toBeNull();
  });
});

describe("stiLabel — vocabulaire", () => {
  it("bande les libellés sur les seuils publiés", () => {
    expect(stiLabel(100)).toBe("elevee");
    expect(stiLabel(80)).toBe("elevee");
    expect(stiLabel(79)).toBe("correcte");
    expect(stiLabel(60)).toBe("correcte");
    expect(stiLabel(59)).toBe("partielle");
    expect(stiLabel(40)).toBe("partielle");
    expect(stiLabel(39)).toBe("faible");
    expect(stiLabel(null)).toBe("non_notable");
  });
});
