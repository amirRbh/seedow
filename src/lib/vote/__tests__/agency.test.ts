import { describe, it, expect } from "vitest";
import { pickAgencyTeaser } from "../agency";
import { emptyTally } from "../bloc";
import type { Resolution, ResolutionWithBloc } from "../vote.functions";

const NOW = new Date("2026-08-01T00:00:00Z");

function resolution(overrides: Partial<Resolution> = {}): Resolution {
  return {
    id: overrides.id ?? "00000000-0000-0000-0000-000000000000",
    company: "ACME",
    ticker: "ACM",
    theme: null,
    title: "Résolution",
    summary: "",
    forLabel: "Pour",
    againstLabel: "Contre",
    fundsStance: "Les grands fonds votent pour la direction.",
    sourceName: "AGM notice",
    sourceUrl: "https://example.com",
    meetingDate: "2026-09-01",
    closesAt: "2026-08-20T00:00:00Z",
    status: "open",
    outcomePct: null,
    outcomeNote: null,
    ...overrides,
  };
}

function withBloc(res: Resolution): ResolutionWithBloc {
  return { resolution: res, bloc: emptyTally() };
}

describe("pickAgencyTeaser", () => {
  it("renvoie null quand rien n'est ouvert", () => {
    const closed = withBloc(resolution({ status: "closed" }));
    expect(pickAgencyTeaser([closed], ["climat"], NOW)).toBeNull();
  });

  it("renvoie null sur une liste vide", () => {
    expect(pickAgencyTeaser([], ["climat"], NOW)).toBeNull();
  });

  it("ignore une résolution ouverte mais déjà expirée (closesAt passé)", () => {
    const expired = withBloc(resolution({ status: "open", closesAt: "2026-07-01T00:00:00Z" }));
    expect(pickAgencyTeaser([expired], ["climat"], NOW)).toBeNull();
  });

  it("privilégie une résolution alignée sur une conviction choisie", () => {
    const climate = withBloc(
      resolution({ id: "11111111-1111-1111-1111-111111111111", theme: "climat" }),
    );
    const other = withBloc(
      resolution({ id: "22222222-2222-2222-2222-222222222222", theme: "tech" }),
    );
    const picked = pickAgencyTeaser([other, climate], ["climat"], NOW);
    expect(picked?.item.resolution.id).toBe("11111111-1111-1111-1111-111111111111");
    expect(picked?.matchedCause).toBe(true);
  });

  it("parmi plusieurs résolutions alignées, prend celle qui clôt le plus tôt", () => {
    const later = withBloc(
      resolution({
        id: "33333333-3333-3333-3333-333333333333",
        theme: "climat",
        closesAt: "2026-08-25T00:00:00Z",
      }),
    );
    const sooner = withBloc(
      resolution({
        id: "44444444-4444-4444-4444-444444444444",
        theme: "climat",
        closesAt: "2026-08-10T00:00:00Z",
      }),
    );
    const picked = pickAgencyTeaser([later, sooner], ["climat"], NOW);
    expect(picked?.item.resolution.id).toBe("44444444-4444-4444-4444-444444444444");
  });

  it("retombe sur la prochaine résolution ouverte sans correspondance de thème", () => {
    const a = withBloc(
      resolution({
        id: "55555555-5555-5555-5555-555555555555",
        theme: "tech",
        closesAt: "2026-08-18T00:00:00Z",
      }),
    );
    const b = withBloc(
      resolution({
        id: "66666666-6666-6666-6666-666666666666",
        theme: "humain",
        closesAt: "2026-08-12T00:00:00Z",
      }),
    );
    const picked = pickAgencyTeaser([a, b], ["climat"], NOW);
    expect(picked?.matchedCause).toBe(false);
    expect(picked?.item.resolution.id).toBe("66666666-6666-6666-6666-666666666666");
  });

  it("ne matche pas sur un thème null même si les causes sont vides", () => {
    const a = withBloc(resolution({ id: "77777777-7777-7777-7777-777777777777", theme: null }));
    const picked = pickAgencyTeaser([a], [], NOW);
    expect(picked?.matchedCause).toBe(false);
    expect(picked?.item.resolution.id).toBe("77777777-7777-7777-7777-777777777777");
  });
});
