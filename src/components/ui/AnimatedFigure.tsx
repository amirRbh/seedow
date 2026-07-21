import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  /**
   * Valeur de départ pour animer *à l'apparition* (ex. 0 → valeur). Par défaut
   * le compteur ne s'anime qu'aux changements de valeur, pas au montage.
   */
  from?: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
}

/**
 * Compteur animé — ease-out, 600 ms, tabular-nums.
 * Si `prefers-reduced-motion`, affiche directement la valeur cible.
 */
export function AnimatedFigure({
  value,
  from,
  format = (v) => v.toLocaleString("fr-FR", { maximumFractionDigits: 2 }),
  duration = 600,
  className,
}: Props) {
  const [display, setDisplay] = useState(from ?? value);
  const fromRef = useRef(from ?? value);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (reducedRef.current) {
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * eased;
      setDisplay(v);
      if (t < 1) raf = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {format(display)}
    </span>
  );
}
