import { useEffect, useState } from "react";
import { useInView } from "@/hooks/useInView";

/**
 * Chiffre qui compte jusqu'à sa valeur quand il entre dans la fenêtre.
 *
 * Le rendu serveur et le mouvement réduit affichent la valeur FINALE : un
 * chiffre ne doit jamais être lu faux parce que l'animation n'a pas tourné
 * (CLAUDE.md §1.2 — le chiffre affiché est le chiffre sourcé).
 */
export function CountUp({
  value,
  duration = 900,
  format = (v) => Math.round(v).toLocaleString("fr-FR"),
  className,
}: {
  value: number;
  duration?: number;
  format?: (v: number) => string;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>("0px");
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    setDisplay(0);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {format(display)}
    </span>
  );
}
