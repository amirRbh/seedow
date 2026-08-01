import { describe, expect, it } from "vitest";
import { pickNextAction } from "@/components/dashboard/nextAction";

const base = {
  profileIncomplete: false,
  greenwashingAlert: null,
  portfolioEmpty: false,
  introDone: true,
};

describe("pickNextAction", () => {
  it("priorise le profil incomplet sur tout le reste", () => {
    expect(
      pickNextAction({
        ...base,
        profileIncomplete: true,
        greenwashingAlert: { assetId: "a1", company: "Acme" },
        portfolioEmpty: true,
        introDone: false,
      }),
    ).toEqual({ kind: "complete_profile" });
  });

  it("priorise l'alerte greenwashing sur le portefeuille vide et le cours", () => {
    expect(
      pickNextAction({
        ...base,
        greenwashingAlert: { assetId: "a1", company: "Acme" },
        portfolioEmpty: true,
        introDone: false,
      }),
    ).toEqual({ kind: "greenwashing_alert", assetId: "a1", company: "Acme" });
  });

  it("priorise le portefeuille vide sur le cours non commencé", () => {
    expect(pickNextAction({ ...base, portfolioEmpty: true, introDone: false })).toEqual({
      kind: "empty_portfolio",
    });
  });

  it("propose le cours d'intro si rien d'autre n'est plus urgent", () => {
    expect(pickNextAction({ ...base, introDone: false })).toEqual({ kind: "start_course" });
  });

  it("retombe sur l'action par défaut quand tout est en ordre", () => {
    expect(pickNextAction(base)).toEqual({ kind: "default" });
  });
});
