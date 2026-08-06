import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { contrastRatio } from '../contrast';

/** Extrait les déclarations `--token: value;` d'un bloc CSS donné. */
function readTokens(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(selector + ' {');
  if (start === -1) throw new Error(`Bloc introuvable: ${selector}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') {
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

const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
const light = readTokens(css, ':root');
const dark = readTokens(css, '.dark');

/** Résout un token, en suivant les `var(--x)` éventuels. */
function resolveToken(tokens: Record<string, string>, name: string, depth = 0): string {
  const raw = tokens[name] ?? light[name];
  if (!raw) throw new Error(`Token manquant: ${name}`);
  const varRef = raw.match(/^var\((--[\w-]+)\)$/);
  if (varRef && depth < 5) return resolveToken(tokens, varRef[1], depth + 1);
  return raw;
}

const themes: Array<[string, Record<string, string>]> = [
  ['clair', light],
  ['sombre', { ...light, ...dark }],
];

/** Texte : doit passer AA (4.5:1). */
const TEXT_PAIRS: Array<[string, string]> = [
  ['--ink', '--paper'],
  ['--ink', '--paper-2'],
  ['--ink-2', '--paper'],
  ['--ink-2', '--paper-2'],
  ['--mint', '--paper'],
  ['--mint', '--paper-2'],
  ['--ice', '--paper'],
  ['--ice', '--paper-2'],
  ['--volt', '--paper'],
  ['--volt', '--paper-2'],
  ['--alert', '--paper'],
  ['--alert', '--paper-2'],
  ['--solar-ink', '--paper'],
  ['--solar-ink', '--paper-2'],
  // Badges/bannières teintés : le texte de rôle doit rester lisible sur son tint.
  ['--alert', '--alert-tint'],
  ['--solar-ink', '--solar-tint'],
  ['--volt', '--bloom-tint'],
  ['--ice', '--sky-tint'],
  // Texte sur aplats pleins (boutons, pills).
  ['--paper', '--ink'],
  ['--primary-foreground', '--primary'],
  ['--destructive-foreground', '--destructive'],
];

/** Non-texte (bordures, filets, aplats décoratifs) : AA large / UI = 3:1. */
const NON_TEXT_PAIRS: Array<[string, string]> = [
  ['--paper-3', '--paper'],
  ['--solar', '--paper'],
  ['--alert-tint-border', '--alert-tint'],
  ['--solar-tint-border', '--solar-tint'],
  ['--bloom-tint-border', '--bloom-tint'],
  ['--sky-tint-border', '--sky-tint'],
];

describe('contraste des tokens de couleur', () => {
  for (const [themeName, tokens] of themes) {
    describe(`thème ${themeName}`, () => {
      it.each(TEXT_PAIRS)('%s sur %s ≥ 4.5:1', (fg, bg) => {
        const ratio = contrastRatio(resolveToken(tokens, fg), resolveToken(tokens, bg));
        expect(Number(ratio.toFixed(2))).toBeGreaterThanOrEqual(4.5);
      });

      it.each(NON_TEXT_PAIRS)('%s sur %s ≥ 3:1 (non-texte)', (fg, bg) => {
        const ratio = contrastRatio(resolveToken(tokens, fg), resolveToken(tokens, bg));
        expect(Number(ratio.toFixed(2))).toBeGreaterThanOrEqual(3);
      });
    });
  }
});
