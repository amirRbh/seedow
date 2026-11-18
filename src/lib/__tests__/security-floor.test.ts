import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

/**
 * Plancher de sécurité des dépendances.
 *
 * `bun.lock` peut être régénéré par l'outillage (Lovable, `bun update`) : ce
 * test casse la CI si une version résolue redescend sous un correctif de
 * sécurité déjà appliqué. Chaque ligne cite l'avis qu'elle verrouille.
 */
const lock = readFileSync(join(import.meta.dirname, "../../../bun.lock"), "utf8");

function resolved(name: string): string[] {
  const re = new RegExp(`"${name.replace("/", "\\/")}@(\\d+\\.\\d+\\.\\d+)[^"]*"`, "g");
  return [...new Set([...lock.matchAll(re)].map((m) => m[1]))];
}

function atLeast(version: string, floor: string): boolean {
  const a = version.split(".").map(Number);
  const b = floor.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return true;
}

const FLOORS: [pkg: string, floor: string, advisory: string][] = [
  ["@tanstack/react-start", "1.168.60", "GHSA-qx66-fv34-fjm8 (XSS réfléchi, fonctions serveur)"],
  ["@tanstack/start-server-core", "1.169.39", "GHSA-qx66-fv34-fjm8, GHSA-9m65-766c-r333"],
  ["seroval", "1.6.1", "GHSA-mv8w-475r-vwqw, GHSA-p6vx-979v-rg4c (désérialisation)"],
  [
    "@modelcontextprotocol/sdk",
    "1.32.0",
    "GHSA-46jr-4wx8-v453, GHSA-f897-62hf-6gxq, GHSA-6qxp-vccf-f47h… (serveur /mcp)",
  ],
  ["@lovable.dev/mcp-js", "3.3.1", "embarque @modelcontextprotocol/sdk ≥ 1.32"],
  ["proxy-addr", "2.0.8", "GHSA-jqcg-44mw-7w3h (usurpation d'IP)"],
  ["shell-quote", "1.11.0", "GHSA-pqg4-j6r4-53mv (injection de commande)"],
  [
    "vite",
    "8.0.0",
    "GHSA-rq7h-c2jc-7f22, GHSA-9jrq-w75r-8gcw (serveur de dev) ; Vite 8 exigé par start-plugin-core ≥ 1.171.51",
  ],
];

describe("plancher de sécurité des dépendances (bun.lock)", () => {
  it.each(FLOORS)("%s ≥ %s — %s", (pkg, floor) => {
    const versions = resolved(pkg);
    expect(versions.length).toBeGreaterThan(0);
    for (const v of versions) expect(atLeast(v, floor), `${pkg}@${v} < ${floor}`).toBe(true);
  });

  it("une seule copie du cœur du routeur (pas de double instance au rendu serveur)", () => {
    expect(resolved("@tanstack/router-core")).toHaveLength(1);
    expect(resolved("@tanstack/react-router")).toHaveLength(1);
    expect(resolved("vite")).toHaveLength(1);
  });
});
