import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Garde d'isolation : l'optimiseur ne doit pas pouvoir revenir sur le chemin
 * produit par un simple import.
 *
 * Seedow ne choisit plus les poids — c'est l'utilisateur qui les pose. Le moteur
 * Markowitz est conservé pour sa valeur d'évaluation (backtest, comparaison au
 * 1/N), mais deux de ses fonctions ÉCRIVENT en base : un import de confort
 * suffirait à réintroduire une allocation calculée par-dessus une composition
 * faite à la main.
 *
 * Ce test lit l'arborescence réelle plutôt que de faire confiance à une
 * convention : il échoue dès qu'un fichier hors de `legacy/` importe un module
 * de `legacy/`.
 */

const SRC = join(process.cwd(), "src");
const LEGACY_DIR = join(SRC, "lib", "portfolio", "legacy");

/** Symboles qui ne doivent jamais transiter par le barrel du chemin produit. */
const LEGACY_SYMBOLS = [
  "buildPortfolio",
  "capAndRedistribute",
  "optimizeMarkowitz",
  "riskParityWeights",
  "normalizeTo100",
];

/** Modules réservés au chemin d'évaluation. */
const LEGACY_MODULES = [
  "engine",
  "markowitz",
  "riskparity",
  "backtest",
  "allocation",
  "server.functions",
];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Un import qui pointe vers `lib/portfolio/legacy`, quelle que soit sa forme. */
const LEGACY_IMPORT = /from\s+["'][^"']*(?:lib\/portfolio\/legacy|\.\/legacy|\.\.\/legacy)\//;

describe("isolation du moteur d'optimisation", () => {
  const files = sourceFiles(SRC);

  it("aucun fichier hors de legacy/ n'importe un module legacy", () => {
    const offenders = files
      .filter((f) => !f.startsWith(LEGACY_DIR))
      .filter((f) => LEGACY_IMPORT.test(readFileSync(f, "utf-8")))
      .map((f) => relative(SRC, f));

    // Deux exceptions connues, nommées plutôt que tolérées en silence :
    //
    //  - `EthiBriefing` vit dans le Dashboard authentifié devenu inatteignable
    //    depuis que /le-fil est l'accueil ; son sort est une décision produit
    //    ouverte (docs/roadmap.md).
    //  - `tradeoffs.functions` est le simulateur « affine ton allocation » : il
    //    recalcule des variantes pour chiffrer ce que coûte un levier, sans
    //    jamais les appliquer. Adossé à l'optimiseur, donc listé ici — que ce
    //    comparateur doive rester adossé à Markowitz est une question produit.
    //
    // Toute nouvelle entrée dans cette liste est un choix à assumer, pas un
    // ajustement de test.
    expect(offenders.sort()).toEqual([
      "components/dashboard/EthiBriefing.tsx",
      "lib/portfolio/tradeoffs.functions.ts",
    ]);
  });

  it("le barrel du chemin produit n'expose aucun module ni symbole legacy", () => {
    const barrel = readFileSync(join(SRC, "lib", "portfolio", "index.ts"), "utf-8");
    for (const mod of LEGACY_MODULES) {
      expect(barrel).not.toContain(`"./${mod}"`);
    }
    // Le ré-export est l'angle mort qui a coûté un build : un fichier du chemin
    // produit peut importer l'optimiseur SANS jamais nommer `legacy/`, si le
    // barrel le lui sert. On vise donc les symboles, pas seulement les chemins —
    // et l'export réel, pas la simple présence du mot dans un commentaire.
    for (const symbol of LEGACY_SYMBOLS) {
      expect(barrel).not.toMatch(new RegExp(`export\\s*\\{[^}]*\\b${symbol}\\b`, "s"));
    }
  });

  it("les modules legacy existent bien là où on les attend", () => {
    const present = readdirSync(LEGACY_DIR).filter((f: string) => f.endsWith(".ts"));
    for (const mod of LEGACY_MODULES) {
      expect(present).toContain(`${mod}.ts`);
    }
  });
});
