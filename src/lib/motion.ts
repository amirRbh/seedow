/**
 * Courbe d'easing signature de l'app (voir styles.css, transition-timing-function
 * sur les éléments interactifs). Les composants Framer Motion utilisaient jusqu'ici
 * des presets ad-hoc ("easeOut", [0.22,1,0.36,1]...) différents de cette courbe —
 * ce fichier centralise les valeurs pour qu'un futur ajustement se fasse à un seul
 * endroit plutôt que dans chaque transition={{...}} dispersée.
 */
export const EASE_SIGNATURE: [number, number, number, number] = [0.32, 0.72, 0, 1];

export const DURATION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
  reveal: 0.6,
} as const;
