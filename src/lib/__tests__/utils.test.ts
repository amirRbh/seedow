import { describe, expect, it } from "vitest";
import { cn } from "../utils";

/**
 * L'échelle typographique maison est une famille de TAILLES : `cn` ne doit
 * jamais la confondre avec une couleur `text-*` (et effacer l'une ou l'autre).
 */
describe("cn — échelle typographique maison", () => {
  it("garde la taille quand une couleur suit", () => {
    expect(cn("text-tag font-bold", "text-mint-ink")).toBe("text-tag font-bold text-mint-ink");
  });

  it("garde la couleur quand une taille suit", () => {
    expect(cn("text-ink", "text-body-lg")).toBe("text-ink text-body-lg");
  });

  it("résout toujours deux tailles entre elles", () => {
    expect(cn("text-body", "text-label")).toBe("text-label");
  });

  it("résout toujours deux couleurs entre elles", () => {
    expect(cn("text-ink", "text-ink-2")).toBe("text-ink-2");
  });
});
