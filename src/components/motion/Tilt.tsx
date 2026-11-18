import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

/**
 * Inclinaison 3D légère sous le curseur — pour UNE pièce maîtresse par écran
 * (la scène du hero, une carte de certificat). 4° au plus : au-delà, le texte
 * posé dessus devient pénible à lire. Inactif au tactile et en mouvement réduit.
 */
export function Tilt({
  children,
  max = 4,
  className,
}: {
  children: ReactNode;
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spring = { stiffness: 180, damping: 20, mass: 0.5 };
  const rotateY = useSpring(useTransform(px, [-1, 1], [-max, max]), spring);
  const rotateX = useSpring(useTransform(py, [-1, 1], [max, -max]), spring);

  const onMove = (e: React.PointerEvent) => {
    if (reduced || e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    px.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    py.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  };
  const reset = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div style={{ perspective: 1400 }} className={className}>
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={reset}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      >
        {children}
      </motion.div>
    </div>
  );
}
