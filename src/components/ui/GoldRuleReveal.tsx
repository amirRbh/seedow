import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

/**
 * Filet or qui se dessine de gauche à droite à l'entrée dans le viewport.
 * IntersectionObserver — déclenche une fois, respecte prefers-reduced-motion.
 */
export function GoldRuleReveal({ className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setRevealed(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("gold-rule origin-left transition-transform duration-700 ease-out", className)}
      style={{ transform: revealed ? "scaleX(1)" : "scaleX(0)" }}
    />
  );
}
