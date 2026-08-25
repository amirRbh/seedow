import { describe, it, expect } from "vitest";
import { poolReasons, matchedCauses, CAUSE_EXPOSURE_FLOOR } from "../poolReasons";
import type { CauseTag } from "../types";

/**
 * Ce que ces tests protègent, c'est une promesse produit : la liste de fonds ne
 * doit jamais se lire comme un palmarès, et rien ne doit y être affirmé que la
 * donnée ne porte pas.
 */

const CLIMAT: CauseTag[] = ["climat"];
const THREE: CauseTag[] = ["climat", "biodiversite", "humain"];

/** Un fonds correctement documenté, pour isoler la variable testée. */
const documented = { esgSource: "MSCI", statsObservations: 250, sharpe: 0.8 } as const;

describe("raisons du pool", () => {
  describe("le groupe décrit un rapport aux convictions, pas un rang", () => {
    it("porte les convictions quand il en couvre la majorité", () => {
      const r = poolReasons({
        ...documented,
        causes: THREE,
        causeExposure: { climat: 0.9, biodiversite: 0.6, humain: 0 },
      });
      expect(r.group).toBe("carries_convictions");
      expect(r.matchedCauses).toEqual(["climat", "biodiversite"]);
    });

    it("n'en porte qu'une partie", () => {
      const r = poolReasons({
        ...documented,
        causes: THREE,
        causeExposure: { climat: 0.9, biodiversite: 0, humain: 0 },
      });
      expect(r.group).toBe("partial_match");
    });

    it("bascule sur ses autres qualités quand aucune conviction n'est portée", () => {
      const r = poolReasons({
        ...documented,
        causes: CLIMAT,
        causeExposure: { climat: 0 },
      });
      expect(r.group).toBe("other_strengths");
      expect(r.caveats.map((c) => c.code)).toContain("pool_reasons.caveat.no_cause_match");
    });

    it("sans conviction déclarée, il n'y a pas de rapport à établir", () => {
      const r = poolReasons({ ...documented, causes: [] });
      expect(r.group).toBe("other_strengths");
      // Et surtout : on ne reproche pas à l'utilisateur de n'avoir rien déclaré.
      expect(r.caveats.map((c) => c.code)).not.toContain("pool_reasons.caveat.no_cause_match");
    });

    it("deux fonds au coude-à-coude peuvent tomber dans des groupes différents", () => {
      // C'est tout l'objet du module : le groupe ne réencode pas le classement.
      const aligned = poolReasons({
        ...documented,
        causes: CLIMAT,
        causeExposure: { climat: 0.9 },
      });
      const unaligned = poolReasons({
        ...documented,
        causes: CLIMAT,
        causeExposure: { climat: 0 },
      });
      expect(aligned.group).not.toBe(unaligned.group);
    });
  });

  describe("une donnée absente devient une réserve, jamais un silence", () => {
    it("dit que l'historique de marché manque", () => {
      const r = poolReasons({
        causes: [],
        esgSource: "MSCI",
        sharpe: null,
        statsObservations: 0,
      });
      expect(r.caveats.map((c) => c.code)).toContain("pool_reasons.caveat.no_history");
    });

    it("ne conclut rien sur un historique qu'on n'a pas demandé", () => {
      const r = poolReasons({ causes: [], esgSource: "MSCI" });
      expect(r.caveats.map((c) => c.code)).not.toContain("pool_reasons.caveat.no_history");
    });

    it("signale une note estimée maison plutôt que de la faire passer pour mesurée", () => {
      const r = poolReasons({
        causes: [],
        esgSource: "seedow-internal-v2",
        sustainability: 88,
        statsObservations: 250,
      });
      expect(r.caveats.map((c) => c.code)).toContain("pool_reasons.caveat.esg_estimated");
      // Une note estimée ne devient JAMAIS un argument, même haute.
      expect(r.reasons.map((x) => x.code)).not.toContain("pool_reasons.reason.sustainability");
    });

    it("se tait sur une source non chargée", () => {
      const r = poolReasons({ causes: [], sustainability: 88, statsObservations: 250 });
      expect(r.caveats.map((c) => c.code)).not.toContain("pool_reasons.caveat.esg_estimated");
    });

    it("un fonds sans note sourcée ni historique reste « à examiner », pas effacé", () => {
      const r = poolReasons({ causes: CLIMAT, esgSource: null, sharpe: null });
      expect(r.group).toBe("to_examine");
      expect(r.caveats.length).toBeGreaterThan(0);
    });
  });

  describe("les frais, le seul chiffre vérifiable par l'utilisateur", () => {
    it("compte les frais bas comme un argument, en euros", () => {
      const r = poolReasons({ ...documented, causes: [], ter: 0.002 });
      const fees = r.reasons.find((x) => x.code === "pool_reasons.reason.low_fees");
      expect(fees?.vars).toEqual({ euros: 2 });
    });

    it("compte les frais élevés comme une réserve", () => {
      const r = poolReasons({ ...documented, causes: [], ter: 0.0075 });
      const fees = r.caveats.find((x) => x.code === "pool_reasons.caveat.high_fees");
      expect(fees?.vars).toEqual({ euros: 8 });
    });

    it("ne dit rien de frais qu'on ne connaît pas", () => {
      const r = poolReasons({ ...documented, causes: [] });
      expect(r.reasons.map((x) => x.code)).not.toContain("pool_reasons.reason.low_fees");
      expect(r.caveats.map((x) => x.code)).not.toContain("pool_reasons.caveat.high_fees");
    });
  });

  describe("le seuil d'exposition", () => {
    it("ignore une exposition trop marginale pour être annoncée", () => {
      const below = matchedCauses({
        causes: CLIMAT,
        causeExposure: { climat: CAUSE_EXPOSURE_FLOOR - 0.01 },
      });
      expect(below).toEqual([]);

      const at = matchedCauses({
        causes: CLIMAT,
        causeExposure: { climat: CAUSE_EXPOSURE_FLOOR },
      });
      expect(at).toEqual(["climat"]);
    });

    it("accepte une liste de thèmes quand l'exposition chiffrée n'est pas chargée", () => {
      // Le modèle de vue Découvrir ne porte que les causes dominantes.
      expect(matchedCauses({ causes: THREE, themes: ["climat", "tech"] })).toEqual(["climat"]);
    });

    it("préfère l'exposition chiffrée aux thèmes quand les deux sont là", () => {
      const r = matchedCauses({
        causes: CLIMAT,
        causeExposure: { climat: 0 },
        themes: ["climat"],
      });
      expect(r).toEqual([]);
    });
  });

  it("ne rend que des codes i18n, jamais des phrases", () => {
    const r = poolReasons({
      ...documented,
      causes: CLIMAT,
      causeExposure: { climat: 0.9 },
      sustainability: 80,
      ter: 0.002,
    });
    for (const note of [...r.reasons, ...r.caveats]) {
      expect(note.code).toMatch(/^pool_reasons\.(reason|caveat)\.[a-z_]+$/);
    }
  });

  it("s'arrête à trois raisons — au-delà, plus personne ne lit", () => {
    const r = poolReasons({
      ...documented,
      causes: CLIMAT,
      causeExposure: { climat: 1 },
      sustainability: 95,
      ter: 0.001,
    });
    expect(r.reasons.length).toBeLessThanOrEqual(3);
  });
});
