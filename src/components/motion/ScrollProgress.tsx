import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

/**
 * Barre de progression de lecture — un filet de 3px en haut de la fenêtre,
 * pour les pages longues (landing, méthodologie, cours, pages légales).
 * Décorative : `aria-hidden`, et absente en mouvement réduit.
 */
export function ScrollProgress() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.3 });
  if (reduced) return null;
  return <motion.div aria-hidden className="scroll-progress" style={{ scaleX }} />;
}
