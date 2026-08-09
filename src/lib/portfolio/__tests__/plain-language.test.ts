import { describe, expect, it } from "vitest";
import { describeWeight, perceivedRisk } from "../plain-language";

describe("describeWeight", () => {
  it("classe les parts en bandes lisibles", () => {
    expect(describeWeight(0.45).band).toBe("dominante");
    expect(describeWeight(0.25).band).toBe("importante");
    expect(describeWeight(0.1).band).toBe("moyenne");
    expect(describeWeight(0.03).band).toBe("petite");
  });

  it("donne un équivalent « 1 € sur N » exploitable", () => {
    expect(describeWeight(0.2).oneInN).toBe(5);
    expect(describeWeight(0.5).oneInN).toBe(2);
  });

  it("n'invente pas d'équivalent pour une part négligeable", () => {
    expect(describeWeight(0.001).oneInN).toBeNull();
  });

  it("borne les entrées aberrantes", () => {
    expect(describeWeight(Number.NaN).weight).toBe(0);
    expect(describeWeight(5).weight).toBe(1);
  });
});

describe("perceivedRisk", () => {
  it("dérive un niveau du seul indice de répartition", () => {
    expect(perceivedRisk(0.9)).toBe("prudent");
    expect(perceivedRisk(0.7)).toBe("modere");
    expect(perceivedRisk(0.3)).toBe("dynamique");
  });
});
