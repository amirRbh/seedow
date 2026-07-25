import { describe, it, expect } from "vitest";
import {
  selectAlertsForDigest,
  buildAlertDigest,
  EMAILABLE_SEVERITIES,
  type DigestAlert,
} from "../digest";

function mk(over: Partial<DigestAlert> = {}): DigestAlert {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    severity: over.severity ?? "warn",
    title: over.title ?? "Titre",
    body: over.body ?? "Corps",
    ctaHref: over.ctaHref ?? null,
    createdAt: over.createdAt ?? "2026-07-25T10:00:00.000Z",
  };
}

describe("selectAlertsForDigest", () => {
  it("exclut les alertes d'info (in-app uniquement)", () => {
    const out = selectAlertsForDigest([mk({ severity: "info" }), mk({ severity: "warn" })]);
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe("warn");
    expect(EMAILABLE_SEVERITIES.has("info")).toBe(false);
  });

  it("trie par sévérité décroissante puis date décroissante", () => {
    const out = selectAlertsForDigest([
      mk({ id: "w-old", severity: "warn", createdAt: "2026-07-20T10:00:00Z" }),
      mk({ id: "a", severity: "alert", createdAt: "2026-07-19T10:00:00Z" }),
      mk({ id: "w-new", severity: "warn", createdAt: "2026-07-24T10:00:00Z" }),
    ]);
    expect(out.map((a) => a.id)).toEqual(["a", "w-new", "w-old"]);
  });

  it("borne le nombre d'alertes détaillées", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      mk({ id: `a${i}`, severity: "alert", createdAt: `2026-07-${10 + i}T10:00:00Z` }),
    );
    expect(selectAlertsForDigest(many, 5)).toHaveLength(5);
  });
});

describe("buildAlertDigest", () => {
  const base = { appUrl: "https://seedow.life", settingsUrl: "https://seedow.life/reglages" };

  it("ne construit jamais un email vide", () => {
    expect(buildAlertDigest([], base)).toBeNull();
  });

  it("sujet singulier reprend le titre de l'unique alerte", () => {
    const d = buildAlertDigest([mk({ title: "Score ESG en baisse" })], base)!;
    expect(d.subject).toContain("Score ESG en baisse");
  });

  it("sujet pluriel compte les alertes et le corps porte le lien de désinscription", () => {
    const d = buildAlertDigest([mk(), mk(), mk()], { ...base, lang: "fr" })!;
    expect(d.subject).toContain("3");
    expect(d.text).toContain("seedow.life/reglages");
    expect(d.text.toLowerCase()).toContain("désactiver");
  });

  it("rend les CTA relatifs en URL absolues, garde les absolues intactes", () => {
    const d = buildAlertDigest(
      [
        mk({ title: "A", ctaHref: "/discover" }),
        mk({ title: "B", ctaHref: "https://ext.example/x" }),
      ],
      base,
    )!;
    expect(d.text).toContain("https://seedow.life/discover");
    expect(d.text).toContain("https://ext.example/x");
  });

  it("respecte la langue (en)", () => {
    const d = buildAlertDigest([mk(), mk()], { ...base, lang: "en" })!;
    expect(d.subject.toLowerCase()).toContain("signals");
    expect(d.text.toLowerCase()).toContain("turn off");
  });
});
