import { useEffect, useRef } from "react";
import type { Organism, OrganismBranch } from "@/lib/impact/leVivant";

/**
 * LeVivant — rendu canvas de l'« organisme d'impact ».
 *
 * Reçoit une structure d'organisme DÉTERMINISTE (cf. lib/impact/leVivant) et la
 * dessine comme une forme vivante, sobre et monochrome (vert de marque), dont la
 * vitalité module la luminosité des graines. Ce n'est pas un graphique : c'est une
 * signature. Respecte `prefers-reduced-motion` (frame statique) et le thème
 * (couleurs relues depuis les tokens CSS, jamais codées en dur — CLAUDE.md §3).
 *
 * Accessibilité : le canvas est purement décoratif ; l'information par thème est
 * portée par le texte alternatif (`ariaLabel`) et par Le Fil, jamais par la seule
 * couleur (CLAUDE.md §4).
 */
interface LeVivantProps {
  organism: Organism;
  ariaLabel: string;
  className?: string;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function readColor(probe: HTMLElement, cssVar: string): RGB {
  probe.style.color = `var(${cssVar})`;
  const c = getComputedStyle(probe).color; // toujours "rgb(r, g, b)" ou "rgba(...)"
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return { r: 26, g: 122, b: 66 };
  const [r, g, b] = m[1].split(",").map((v) => parseFloat(v.trim()));
  return { r: r || 0, g: g || 0, b: b || 0 };
}

function rgba({ r, g, b }: RGB, a: number): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
}

/** Mélange deux couleurs (t = 0 → a, 1 → b). */
function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

export function LeVivant({ organism, ariaLabel, className }: LeVivantProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const probeRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const probe = probeRef.current;
    if (!canvas || !probe) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Le Vivant est dessiné sur un panneau `bg-ink` (qui s'inverse selon le thème).
    // On lit donc `--paper` — la couleur de texte du panneau, garantie contrastante
    // dans les deux thèmes — comme neutre, et `--mint` (vert de marque, stable).
    let palette = {
      mint: readColor(probe, "--mint"),
      neutral: readColor(probe, "--paper"),
    };
    const refreshPalette = () => {
      palette = {
        mint: readColor(probe, "--mint"),
        neutral: readColor(probe, "--paper"),
      };
    };

    let width = 0;
    let height = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Couleur d'une branche : une conviction saine tire vers le vert de marque,
    // une conviction terne (ESG faible) reste pâle/neutre. La part non classée est
    // toujours neutre. Rien n'est encodé par la seule couleur (§4) — le texte
    // alternatif et Le Fil portent le détail par thème.
    const branchColor = (b: OrganismBranch): RGB => {
      if (b.kind === "unclassified") return palette.neutral;
      return mix(palette.neutral, palette.mint, 0.4 + 0.6 * b.vitality);
    };

    const start = performance.now();
    let raf = 0;

    const draw = (now: number) => {
      const time = (now - start) / 1000;
      ctx.clearRect(0, 0, width, height);

      // Ancrage bas-centre : l'organisme pousse vers le haut.
      const ox = width * 0.5;
      const oy = height * 0.98;
      const scale = Math.min(width, height) / 240 + 0.35;
      const reduce = reduceMq.matches;

      organism.branches.forEach((b, bi) => {
        const col = branchColor(b);
        const breathe = reduce ? 0 : Math.sin(time * 0.5 + bi * 1.3) * 0.05;
        const sway = reduce ? 0 : Math.sin(time * 0.32 + bi) * 0.08;
        const ang = b.angle + sway;
        const dx = Math.cos(ang);
        const dy = Math.sin(ang);
        const px = -dy;
        const py = dx;
        const len = (70 + b.reach * 90) * scale * (1 + breathe);

        // Tige de la branche.
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        const midJit = Math.sin(time * 0.4 + bi * 2) * 10 * scale * (reduce ? 0 : 1);
        ctx.quadraticCurveTo(
          ox + dx * len * 0.5 + px * midJit,
          oy + dy * len * 0.5 + py * midJit,
          ox + dx * len,
          oy + dy * len,
        );
        ctx.strokeStyle = rgba(col, 0.16);
        ctx.lineWidth = 1.4 * scale;
        ctx.stroke();

        // Graines réparties le long de la branche.
        for (let s = 0; s < b.seedCount; s++) {
          const tt = (s + 1) / b.seedCount;
          const along = len * tt;
          const wobble = Math.sin(time * 0.6 + s + bi) * (10 - 8 * tt) * scale * (reduce ? 0.4 : 1);
          const x = ox + dx * along + px * wobble;
          const y = oy + dy * along + py * wobble;
          const pulse = reduce ? 1 : 0.8 + 0.2 * Math.sin(time * 0.9 + s * 1.7 + bi);
          const r = (1.6 + (1 - tt) * 3.2) * scale * pulse;

          // Halo doux.
          const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3.4);
          glow.addColorStop(0, rgba(col, 0.28 + 0.22 * b.vitality));
          glow.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, r * 3.4, 0, Math.PI * 2);
          ctx.fill();

          // Cœur de la graine.
          ctx.fillStyle = rgba(col, 0.55 + 0.35 * b.vitality);
          ctx.beginPath();
          ctx.arc(x, y, Math.max(0.8, r * 0.66), 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Germination : aucun holding → une graine unique qui pulse au centre.
      if (organism.branches.length === 0) {
        const pulse = reduce ? 1 : 0.75 + 0.25 * Math.sin(time * 1.1);
        const r = 6 * scale * pulse;
        const glow = ctx.createRadialGradient(ox, oy - 40 * scale, 0, ox, oy - 40 * scale, r * 4);
        glow.addColorStop(0, rgba(palette.mint, 0.35));
        glow.addColorStop(1, rgba(palette.mint, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ox, oy - 40 * scale, r * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(palette.mint, 0.7);
        ctx.beginPath();
        ctx.arc(ox, oy - 40 * scale, r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduceMq.matches) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    const ro = new ResizeObserver(() => {
      resize();
      if (reduceMq.matches) requestAnimationFrame(draw);
    });
    ro.observe(canvas);

    // Rejouer une frame quand le thème change (couleurs relues).
    const onThemeChange = () => {
      refreshPalette();
      requestAnimationFrame(draw);
    };
    const colorMq = window.matchMedia("(prefers-color-scheme: dark)");
    colorMq.addEventListener("change", onThemeChange);
    const mo = new MutationObserver(onThemeChange);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });

    // Frame statique si le mouvement est réduit.
    const onReduceChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };
    reduceMq.addEventListener("change", onReduceChange);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      colorMq.removeEventListener("change", onThemeChange);
      reduceMq.removeEventListener("change", onReduceChange);
    };
  }, [organism]);

  return (
    <div className={className}>
      <span ref={probeRef} aria-hidden className="sr-only" style={{ position: "absolute" }} />
      <canvas ref={canvasRef} role="img" aria-label={ariaLabel} className="block h-full w-full" />
    </div>
  );
}
