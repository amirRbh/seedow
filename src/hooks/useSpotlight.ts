import { useEffect } from "react";

/**
 * Reflet qui suit le curseur sur les cartes `.spot` (styles.css).
 *
 * UN écouteur pour toute l'app, délégué sur le document : il pose `--mx` et
 * `--my` sur la carte survolée, et le CSS fait le reste. Aucun état React,
 * aucun rendu — le coût est une lecture de rectangle par image, uniquement
 * quand le curseur est sur une carte. Inactif au tactile (pas de survol) et en
 * mouvement réduit.
 */
export function useSpotlight() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let lastEvent: PointerEvent | null = null;

    const apply = () => {
      frame = 0;
      const e = lastEvent;
      if (!e || !(e.target instanceof Element)) return;
      const card = e.target.closest<HTMLElement>(".spot");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      card.style.setProperty("--my", `${e.clientY - rect.top}px`);
    };

    const onMove = (e: PointerEvent) => {
      lastEvent = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
