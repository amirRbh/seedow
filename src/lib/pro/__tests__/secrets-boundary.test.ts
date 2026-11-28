/**
 * Frontière des secrets de Seedow Pro : la clé Anthropic et le SDK Anthropic ne
 * vivent que dans les scripts hors ligne (`scripts/pro/`), jamais dans le code
 * de l'application (Worker ou navigateur), et aucune variable `VITE_*` (exposée
 * au navigateur par Vite) ne porte de secret.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "__tests__" ? [] : files(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

const appFiles = files("src");

describe("frontière des secrets", () => {
  it("le code de l'application n'importe pas le SDK Anthropic", () => {
    const offenders = appFiles.filter((f) => /@anthropic-ai\/sdk/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("le code de l'application ne lit pas ANTHROPIC_API_KEY", () => {
    const offenders = appFiles.filter((f) => /ANTHROPIC_API_KEY/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("aucune variable exposée au navigateur ne porte un secret", () => {
    const re = /VITE_[A-Z0-9_]*(SECRET|SERVICE_ROLE|ANTHROPIC|API_KEY|PRIVATE)/;
    const offenders = appFiles.filter((f) => re.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("l'extraction reste un script hors ligne", () => {
    const src = readFileSync("scripts/pro/lib/anthropic-extract.ts", "utf8");
    expect(src).toMatch(/process\.env\.ANTHROPIC_API_KEY/);
    expect(src).not.toMatch(/apiKey:\s*["'`]/); // jamais de clé en dur
  });
});
