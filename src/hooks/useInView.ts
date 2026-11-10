import { useEffect, useRef, useState } from "react";

/**
 * Vrai dès que l'élément entre dans la fenêtre — une seule fois.
 *
 * Sans IntersectionObserver (vieux navigateur, rendu serveur), renvoie `true`
 * tout de suite : un contenu ne doit jamais rester invisible parce qu'une
 * animation n'a pas pu se déclencher.
 */
export function useInView<T extends Element>(rootMargin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}
