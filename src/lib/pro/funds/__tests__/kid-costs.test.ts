import { describe, expect, it } from "vitest";
import { kidCosts } from "../kid-costs";

describe("frais courants lus dans le KID", () => {
  it("DICI classique : valeur, page et ligne citée", () => {
    const r = kidCosts([
      "Objectifs et politique",
      "Frais\nFrais courants   1,20 %\nFrais de sortie : néant",
    ]);
    expect(r).toEqual({
      ongoing_charges_pct: 1.2,
      page: 2,
      quote: "Frais courants 1,20 % Frais de sortie : néant",
      status: "auto",
    });
  });

  it("DIC PRIIPs : montant unique « X % de la valeur de votre investissement par an »", () => {
    const r = kidCosts([
      "Que va me coûter cet investissement ?",
      "Frais de gestion et autres frais administratifs et d'exploitation\n1,45 % de la valeur de votre investissement par an.",
    ]);
    expect(r.ongoing_charges_pct).toBe(1.45);
    expect(r.page).toBe(2);
    expect(r.status).toBe("auto");
  });

  it("DIC multi-parts (plusieurs valeurs) : rien n'est attribué", () => {
    const r = kidCosts([
      "Frais de gestion et autres frais\n1,45 % de la valeur de votre investissement par an.\n0,85 % de la valeur de votre investissement par an.",
    ]);
    expect(r).toEqual({ ongoing_charges_pct: null, page: null, quote: null, status: "not_found" });
  });

  it("valeur lisible seulement à cheval sur deux pages : à revoir", () => {
    const r = kidCosts([
      "Frais de gestion et autres frais",
      "1,45 % de la valeur de votre investissement par an.",
    ]);
    expect(r.ongoing_charges_pct).toBe(1.45);
    expect(r.page).toBeNull();
    expect(r.status).toBe("needs_review");
  });
});
