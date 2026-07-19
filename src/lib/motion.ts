/**
 * Deux courbes d'easing, chacune avec un rôle précis — pas une seule
 * courbe universelle, ce qui serait faux pour des animations de nature
 * différente :
 *
 * - EASE_SIGNATURE : feedback interactif rapide (transitions de page,
 *   hover, tap). Reprend exactement la transition-timing-function déjà
 *   définie en CSS pour les éléments interactifs (voir styles.css).
 * - EASE_REVEAL : révélation de contenu (cartes/listes qui apparaissent,
 *   graphiques qui se dessinent). Reprend exactement la courbe déjà
 *   utilisée par les keyframes CSS hero-title-in/grow-bar/bubble-in
 *   (voir styles.css) — c'était déjà le standard de facto pour ce cas,
 *   simplement jamais nommé ni partagé entre les composants qui
 *   utilisaient à la place des presets Framer approximatifs ("easeOut").
 *
 * Les animations en boucle (repeat: Infinity — pulses, loaders) gardent
 * volontairement "easeInOut" : une courbe à sens unique n'a pas de sens
 * pour un mouvement symétrique aller-retour.
 */
export const EASE_SIGNATURE: [number, number, number, number] = [0.32, 0.72, 0, 1];
export const EASE_REVEAL: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const DURATION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
  reveal: 0.6,
} as const;
