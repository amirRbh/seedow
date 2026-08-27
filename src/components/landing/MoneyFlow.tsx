import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  computeFlowAllocation,
  FLOW_CAUSES,
  FLOW_EXCLUSIONS,
  FLOW_LANES,
  type FlowShare,
} from "@/lib/landing/moneyFlow";
import type { CauseTag, ExclusionTag } from "@/lib/portfolio/types";
import { trackAppEvent } from "@/lib/analytics/appEvents";
import { cn } from "@/lib/utils";

/**
 * « Regarde où va ton argent » — la première scène de la landing.
 *
 * Le rayon X répond à « ce fonds finance quoi ? », mais il suppose qu'on a un
 * nom de fonds en tête. Ce bloc s'adresse à l'autre visiteur, celui qui n'a
 * rien à taper : son épargne part d'un point, se répartit dans sept
 * destinations nommées, et se redirige quand il coche une conviction. On
 * montre le mécanisme du produit avant de demander quoi que ce soit.
 *
 * ── Ce qui est affiché ─────────────────────────────────────────────────────
 *
 * Une ILLUSTRATION, écrite comme telle sous le schéma (CLAUDE.md §1.3). Les
 * parts ne décrivent aucun portefeuille réel ; elles montrent le SENS du
 * déplacement. Le vocabulaire est celui de l'onboarding (mêmes `CauseTag` et
 * `ExclusionTag`, mêmes libellés i18n), pour que l'étape suivante ne surprenne
 * personne.
 *
 * ── Couleur ────────────────────────────────────────────────────────────────
 *
 * Le canvas ne connaît aucune couleur : il lit les tokens sur son propre
 * élément. Dans la bande sombre, `.on-deep` a déjà remappé `--mint` & co sur
 * leurs variantes lumineuses ; le même code rend donc correctement sur fond
 * clair, sur fond sombre, et en thème sombre.
 *
 * ── Accessibilité ──────────────────────────────────────────────────────────
 *
 * Le canvas est décoratif (`aria-hidden`) : toute l'information vit dans la
 * liste à côté, avec le nom, la part et le mot « exclu » écrit — jamais porté
 * par la seule couleur (CLAUDE.md §4). `prefers-reduced-motion` rend une image
 * fixe, pas une animation ralentie.
 */

/** Nombre de particules. Assez pour que le flux se lise, assez peu pour qu'un
 *  téléphone d'entrée de gamme tienne les 60 images par seconde. */
const PARTICLE_COUNT = 260;

type Particle = { t: number; lane: number; speed: number; jitter: number; radius: number };

export function MoneyFlow() {
  const { t } = useTranslation();
  const [causes, setCauses] = useState<CauseTag[]>(["climat"]);
  const [exclusions, setExclusions] = useState<ExclusionTag[]>([]);

  const shares = useMemo(() => computeFlowAllocation(causes, exclusions), [causes, exclusions]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Le flux est redessiné 60 fois par seconde : il lit la cible dans une ref,
  // sinon chaque clic relancerait toute la boucle d'animation.
  const targetRef = useRef<FlowShare[]>(shares);
  const redrawRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    targetRef.current = shares;
  }, [shares]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let colors: string[] = [];
    let frame = 0;

    const readColors = () => {
      const style = getComputedStyle(canvas);
      colors = FLOW_LANES.map((lane) => style.getPropertyValue(lane.token).trim() || "#7f8489");
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Poids courants — ils rejoignent la cible en douceur, c'est ce glissement
    // qui rend le geste lisible : on VOIT l'argent changer de destination.
    const weights = targetRef.current.map((s) => s.share);

    const laneY = (index: number) => {
      const top = height * 0.12;
      const bottom = height * 0.88;
      return top + ((bottom - top) * index) / (FLOW_LANES.length - 1);
    };

    const pickLane = () => {
      const total = weights.reduce((a, b) => a + b, 0);
      if (total <= 0) return FLOW_LANES.length - 1;
      let r = Math.random() * total;
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) return i;
      }
      return weights.length - 1;
    };

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      // En mouvement réduit, les positions sont réparties régulièrement :
      // l'image fixe montre quand même un flux, pas un paquet de points.
      t: reduced ? (i % 40) / 40 : Math.random(),
      lane: pickLane(),
      speed: 0.0028 + Math.random() * 0.0034,
      jitter: (Math.random() - 0.5) * 26,
      radius: 1.1 + Math.random() * 1.5,
    }));

    const bezier = (t: number, a: number, b: number, c: number, d: number) => {
      const u = 1 - t;
      return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
    };

    const draw = (animate: boolean) => {
      if (width === 0 || height === 0) return;
      ctx.clearRect(0, 0, width, height);

      const target = targetRef.current;
      if (animate) {
        for (let i = 0; i < weights.length; i++) {
          weights[i] += (target[i].share - weights[i]) * 0.06;
        }
      } else {
        for (let i = 0; i < weights.length; i++) weights[i] = target[i].share;
      }

      const x0 = width * 0.09;
      const x1 = width * 0.97;
      const midY = height / 2;

      // Un rail par destination, épais comme sa part : le schéma reste lisible
      // même arrêté, et la part se lit sans compter les points.
      FLOW_LANES.forEach((_, i) => {
        const y = laneY(i);
        ctx.beginPath();
        ctx.moveTo(x0, midY);
        ctx.bezierCurveTo(width * 0.45, midY, width * 0.58, y, x1, y);
        ctx.strokeStyle = colors[i];
        ctx.globalAlpha = 0.06 + Math.min(weights[i] / 100, 0.4) * 0.34;
        ctx.lineWidth = 1 + (weights[i] / 100) * 16;
        ctx.stroke();
      });
      ctx.globalAlpha = 1;

      for (const p of particles) {
        if (animate) {
          p.t += p.speed;
          if (p.t >= 1) {
            p.t -= 1;
            p.lane = pickLane();
            p.jitter = (Math.random() - 0.5) * 26;
          }
        }
        const y = laneY(p.lane);
        const px = bezier(p.t, x0, width * 0.45, width * 0.58, x1);
        const py = bezier(p.t, midY + p.jitter * 0.4, midY + p.jitter, y + p.jitter * 0.5, y);
        // Les points naissent et meurent en fondu : sans ça, ils apparaissent
        // et disparaissent d'un coup aux deux bouts.
        const fade = p.t < 0.06 ? p.t / 0.06 : p.t > 0.93 ? (1 - p.t) / 0.07 : 1;
        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = colors[p.lane];
        ctx.globalAlpha = 0.85 * fade;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Le point de départ : l'épargne, avant qu'elle ne se répartisse.
      ctx.beginPath();
      ctx.arc(x0, midY, 5, 0, Math.PI * 2);
      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue("--ink").trim() || "#16181a";
      ctx.fill();
    };

    const loop = () => {
      draw(true);
      frame = requestAnimationFrame(loop);
    };

    readColors();
    resize();
    // Uniquement en mouvement réduit : en animation, `draw(false)` collerait
    // les poids à leur cible et supprimerait le glissement, qui EST la
    // démonstration.
    redrawRef.current = reduced ? () => draw(false) : null;

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduced) draw(false);
    });
    resizeObserver.observe(host);

    // Le thème peut changer sous le composant (bascule clair/sombre) : les
    // tokens sont relus, pas mémorisés une fois pour toutes.
    const themeObserver = new MutationObserver(() => {
      readColors();
      if (reduced) draw(false);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    if (reduced) draw(false);
    else loop();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      redrawRef.current = null;
    };
  }, []);

  // En mouvement réduit il n'y a pas de boucle : c'est le changement de
  // convictions qui déclenche le redessin.
  useEffect(() => {
    redrawRef.current?.();
  }, [shares]);

  // L'appel analytique reste HORS de l'updater : React peut le rejouer, et
  // l'événement partirait deux fois.
  const toggleCause = (tag: CauseTag) => {
    const on = causes.includes(tag);
    void trackAppEvent("landing_flow_toggled", { tag, kind: "cause", on: !on });
    setCauses(on ? causes.filter((c) => c !== tag) : [...causes, tag]);
  };

  const toggleExclusion = (tag: ExclusionTag) => {
    const on = exclusions.includes(tag);
    void trackAppEvent("landing_flow_toggled", { tag, kind: "exclusion", on: !on });
    setExclusions(on ? exclusions.filter((c) => c !== tag) : [...exclusions, tag]);
  };

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:gap-10">
        <div>
          <p className="stamp">{t("landing.flow.want_label")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FLOW_CAUSES.map((tag) => (
              <FlowPill
                key={tag}
                label={t(`onboarding.steps.values.${tag}`)}
                pressed={causes.includes(tag)}
                onClick={() => toggleCause(tag)}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="stamp">{t("landing.flow.refuse_label")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FLOW_EXCLUSIONS.map((tag) => (
              <FlowPill
                key={tag}
                label={t(`onboarding.steps.exclusions.${tag}`)}
                pressed={exclusions.includes(tag)}
                onClick={() => toggleExclusion(tag)}
                refuse
              />
            ))}
          </div>
        </div>
      </div>

      <div className="paper-card grid overflow-hidden lg:grid-cols-[1fr_21rem]">
        <div className="relative h-[280px] sm:h-[340px] lg:h-[400px]">
          <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
          {/* Juste AU-DESSUS du point d'origine : centré, le libellé tombait
              dessus. */}
          <div className="pointer-events-none absolute top-1/2 left-6 -translate-y-[calc(100%+12px)]">
            <p className="font-value text-body-xl">{t("landing.flow.source_amount")}</p>
            <p className="text-body-sm text-ink-3">{t("landing.flow.source_label")}</p>
          </div>
        </div>

        <div className="border-t border-paper-3 p-6 lg:border-t-0 lg:border-l">
          <p className="eyebrow">{t("landing.flow.ledger_title")}</p>
          <ul className="mt-3 flex flex-col">
            {shares.map((lane) => (
              <li
                key={lane.id}
                className="flex items-center gap-3 border-b border-paper-3 py-2.5 last:border-b-0"
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: lane.excluded ? "var(--ink-3)" : `var(${lane.token})` }}
                />
                <span
                  className={cn(
                    "flex-1 text-body-sm",
                    lane.excluded ? "text-ink-3 line-through" : "text-ink-2",
                  )}
                >
                  {t(`landing.flow.lane.${lane.id}`)}
                </span>
                <span
                  className={cn(
                    "font-value text-body-sm",
                    lane.excluded ? "text-ink-3" : "text-ink",
                  )}
                >
                  {lane.excluded ? t("landing.flow.excluded") : `${lane.share} %`}
                </span>
              </li>
            ))}
          </ul>
          <p className="mono-meta mt-4 leading-relaxed">{t("landing.flow.source_note")}</p>
        </div>
      </div>

      <p className="max-w-[68ch] text-body-sm text-ink-3">{t("landing.flow.disclaimer")}</p>
    </div>
  );
}

function FlowPill({
  label,
  pressed,
  onClick,
  refuse = false,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  refuse?: boolean;
}) {
  const { t } = useTranslation();
  // Coché / pas coché se lit à la FORME (une coche contre un plus), pas à la
  // couleur : c'est ce qui rend l'état visible en daltonisme (CLAUDE.md §4).
  // Le mot complet reste dit aux lecteurs d'écran.
  const Icon = pressed ? Check : Plus;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn("flow-pill", refuse && "flow-pill--refuse")}
    >
      <Icon aria-hidden className="size-4 shrink-0" strokeWidth={2.5} />
      {label}
      <span className="sr-only">{pressed ? t("landing.flow.on") : t("landing.flow.off")}</span>
    </button>
  );
}
