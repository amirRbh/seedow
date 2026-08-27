import { describe, it, expect } from "vitest";
import { TRACKED_EXCLUSIONS, notExcluded } from "../exclusions";

describe("notExcluded", () => {
  it("renvoie les six secteurs suivis quand le fonds n'exclut rien", () => {
    expect(notExcluded([])).toEqual([...TRACKED_EXCLUSIONS]);
  });

  it("retire ceux que le fonds déclare exclure", () => {
    expect(notExcluded(["fossiles", "armes"])).toEqual([
      "tabac",
      "jeux",
      "animaux",
      "fast-fashion",
    ]);
  });

  it("renvoie une liste vide quand les six sont exclus", () => {
    expect(notExcluded([...TRACKED_EXCLUSIONS])).toEqual([]);
  });

  it("ignore un secteur exclu que Seedow ne suit pas", () => {
    // Un émetteur peut déclarer des exclusions hors de notre grille. Elles ne
    // doivent ni faire disparaître une ligne, ni en ajouter une.
    expect(notExcluded(["nucleaire", "fossiles"])).toEqual([
      "armes",
      "tabac",
      "jeux",
      "animaux",
      "fast-fashion",
    ]);
  });

  it("conserve l'ordre de la liste de référence, quel que soit l'ordre déclaré", () => {
    expect(notExcluded(["fast-fashion", "tabac"])).toEqual([
      "fossiles",
      "armes",
      "jeux",
      "animaux",
    ]);
  });
});
