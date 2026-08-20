import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { contrastRatio } from "../contrast";

/** Extrait les déclarations `--token: value;` d'un bloc CSS donné. */
function readTokens(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(selector + " {");
  if (start === -1) throw new Error(`Bloc introuvable: ${selector}`);
  const open = css.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = css.slice(open + 1, end);
  const tokens: Record<string, string> = {};
  for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
const light = readTokens(css, ":root");
const dark = readTokens(css, ".dark");

/** Résout un token, en suivant les `var(--x)` éventuels. */
function resolveToken(tokens: Record<string, string>, name: string, depth = 0): string {
  const raw = tokens[name] ?? light[name];
  if (!raw) throw new Error(`Token manquant: ${name}`);
  const varRef = raw.match(/^var\((--[\w-]+)\)$/);
  if (varRef && depth < 5) return resolveToken(tokens, varRef[1], depth + 1);
  return raw;
}

const themes: Array<[string, Record<string, string>]> = [
  ["clair", light],
  ["sombre", { ...light, ...dark }],
];

/** Texte : doit passer AA (4.5:1). */
const TEXT_PAIRS: Array<[string, string]> = [
  ["--ink", "--paper"],
  ["--ink", "--paper-2"],
  ["--ink-2", "--paper"],
  ["--ink-2", "--paper-2"],
  ["--mint-ink", "--paper"],
  ["--mint-ink", "--paper-2"],
  ["--ice-ink", "--paper"],
  ["--ice-ink", "--paper-2"],
  ["--volt-ink", "--paper"],
  ["--volt-ink", "--paper-2"],
  ["--alert-ink", "--paper"],
  ["--alert-ink", "--paper-2"],
  ["--solar-ink", "--paper"],
  ["--solar-ink", "--paper-2"],
  // Badges/bannières teintés : le texte de rôle doit rester lisible sur son tint.
  ["--alert-ink", "--alert-tint"],
  ["--solar-ink", "--solar-tint"],
  ["--volt-ink", "--bloom-tint"],
  ["--ice-ink", "--sky-tint"],
  // Texte sur aplats pleins (boutons, pills).
  ["--paper", "--ink"],
  ["--primary-foreground", "--primary"],
  ["--destructive-foreground", "--destructive"],
  // DA V2 « Preuve » — le crochet de provenance porte de l'information
  // (source, date, couverture), pas de la décoration : --ink-3 doit donc
  // tenir AA comme n'importe quel texte, et pas seulement être perceptible.
  ["--ink-3", "--paper"],
  ["--ink-3", "--paper-2"],
  // Boutons pleins : `accent` = aplat --ice, `default` = aplat --ink.
  ["--paper", "--ice"],
  ["--paper", "--mint"],
  ["--paper", "--alert"],
  // ── Bande sombre (.on-deep / .ink-section) ──────────────────
  // Ces tokens sont FIXES : non redéfinis dans .dark, donc les deux
  // thèmes doivent donner le même résultat. C'est précisément ce que ce
  // bloc verrouille — utiliser --paper/--ink pour « blanc sur noir »
  // faisait s'effondrer toute la bande en noir sur noir en thème sombre.
  ["--on-deep", "--deep"],
  ["--on-deep-2", "--deep"],
  ["--on-deep-3", "--deep"],
  ["--on-deep", "--deep-2"],
  ["--on-deep-2", "--deep-2"],
  ["--on-deep-3", "--deep-2"],
];

/** Aplats de marque (grands titres, graphiques, filets) : 3:1 suffit. */
const NON_TEXT_PAIRS: Array<[string, string]> = [
  ["--mint", "--paper"],
  ["--ice", "--paper"],
  ["--volt", "--paper"],
  ["--alert", "--paper"],
  ["--solar", "--paper"],
];

/** Séparateurs décoratifs : juste perceptibles (pas une exigence WCAG). */
const SEPARATOR_PAIRS: Array<[string, string]> = [
  ["--paper-3", "--paper"],
  ["--alert-tint-border", "--alert-tint"],
  ["--solar-tint-border", "--solar-tint"],
  ["--bloom-tint-border", "--bloom-tint"],
  ["--sky-tint-border", "--sky-tint"],
];

/**
 * Séparation de SURFACES (carte vs sol). Le seuil est volontairement plus bas
 * que celui des séparateurs : un filet d'un pixel a besoin de contraste pour
 * être vu, une grande surface non — un blanc pur sur un neutre à 1,10 se
 * distingue nettement (c'est le rapport exact qu'utilise Revolut, #FFFFFF sur
 * #F4F4F4). Ce qui est verrouillé ici, c'est que la carte ne soit jamais
 * EXACTEMENT de la couleur de son fond : c'est ce qui les rendait invisibles,
 * puisque la DA V3 remplace les ombres par ces aplats.
 */
const SURFACE_PAIRS: Array<[string, string]> = [["--paper", "--paper-2"]];

describe("contraste des tokens de couleur", () => {
  for (const [themeName, tokens] of themes) {
    describe(`thème ${themeName}`, () => {
      it.each(TEXT_PAIRS)("%s sur %s ≥ 4.5:1", (fg, bg) => {
        const ratio = contrastRatio(resolveToken(tokens, fg), resolveToken(tokens, bg));
        expect(Number(ratio.toFixed(2))).toBeGreaterThanOrEqual(4.5);
      });

      it.each(NON_TEXT_PAIRS)("%s sur %s ≥ 3:1 (aplat)", (fg, bg) => {
        const ratio = contrastRatio(resolveToken(tokens, fg), resolveToken(tokens, bg));
        expect(Number(ratio.toFixed(2))).toBeGreaterThanOrEqual(3);
      });

      it.each(SEPARATOR_PAIRS)("%s sur %s perceptible (≥ 1.3:1)", (fg, bg) => {
        const ratio = contrastRatio(resolveToken(tokens, fg), resolveToken(tokens, bg));
        expect(Number(ratio.toFixed(2))).toBeGreaterThanOrEqual(1.3);
      });

      it.each(SURFACE_PAIRS)("%s se détache de %s (≥ 1.08:1)", (fg, bg) => {
        const ratio = contrastRatio(resolveToken(tokens, fg), resolveToken(tokens, bg));
        expect(Number(ratio.toFixed(2))).toBeGreaterThanOrEqual(1.08);
      });
    });
  }
});
