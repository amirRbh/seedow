/**
 * Contrôle de contraste (WCAG 2.1) pour les tokens de la DA Seedow.
 * Supporte les formats utilisés dans src/styles.css : #rgb, #rrggbb, rgb(),
 * et oklch(L C H [/ alpha]).
 */

export type Rgb = { r: number; g: number; b: number };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function oklchToRgb(L: number, C: number, hDeg: number): Rgb {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const bb = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * bb;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bb;
  const s_ = L - 0.0894841775 * a - 1.291485548 * bb;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const gamma = (u: number) =>
    u <= 0.0031308 ? 12.92 * u : 1.055 * Math.abs(u) ** (1 / 2.4) - 0.055;

  return {
    r: clamp01(gamma(lr)),
    g: clamp01(gamma(lg)),
    b: clamp01(gamma(lb)),
  };
}

/** Parse une couleur CSS en sRGB normalisé (0..1). Renvoie null si non supportée. */
export function parseColor(input: string): Rgb | null {
  const value = input.trim().toLowerCase();

  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1];
    const full =
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    return {
      r: parseInt(full.slice(0, 2), 16) / 255,
      g: parseInt(full.slice(2, 4), 16) / 255,
      b: parseInt(full.slice(4, 6), 16) / 255,
    };
  }

  const rgb = value.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .slice(0, 3);
    if (parts.length < 3) return null;
    const [r, g, b] = parts.map((p) =>
      p.endsWith("%") ? parseFloat(p) / 100 : parseFloat(p) / 255,
    );
    return { r: clamp01(r), g: clamp01(g), b: clamp01(b) };
  }

  const oklch = value.match(/^oklch\(([^)]+)\)$/);
  if (oklch) {
    const parts = oklch[1].split("/")[0].trim().split(/\s+/);
    if (parts.length < 3) return null;
    const L = parts[0].endsWith("%") ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
    const C = parseFloat(parts[1]);
    const H = parseFloat(parts[2]);
    if ([L, C, H].some((n) => Number.isNaN(n))) return null;
    return oklchToRgb(L, C, H);
  }

  return null;
}

/** Luminance relative WCAG. */
export function relativeLuminance(color: Rgb): number {
  const lin = (u: number) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(color.r) + 0.7152 * lin(color.g) + 0.0722 * lin(color.b);
}

/** Ratio de contraste WCAG entre deux couleurs CSS (1 → 21). */
export function contrastRatio(foreground: string, background: string): number {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (!fg || !bg) throw new Error(`Couleur non supportée: ${foreground} / ${background}`);
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

export type ContrastLevel = "AA" | "AA-large" | "AAA";

const THRESHOLDS: Record<ContrastLevel, number> = {
  AA: 4.5,
  "AA-large": 3,
  AAA: 7,
};

export function meetsContrast(
  foreground: string,
  background: string,
  level: ContrastLevel = "AA",
): boolean {
  return contrastRatio(foreground, background) >= THRESHOLDS[level] - 0.005;
}
