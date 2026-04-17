import { motion } from "framer-motion";
import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";

export interface GardenPlant {
  id: string;
  ticker: string;
  name: string;
  allocationPct: number;
  performancePct: number;
  esgScore: number;
  category: string;
}

interface GardenVisualizationProps {
  plants: GardenPlant[];
  maxSlots?: number;
  onPlantClick?: (plant: GardenPlant) => void;
  onEmptySlotClick?: () => void;
}

export function GardenVisualization({
  plants,
  maxSlots = 5,
  onPlantClick,
  onEmptySlotClick,
}: GardenVisualizationProps) {
  const navigate = useNavigate();

  const slots = useMemo(() => {
    const sorted = [...plants].sort((a, b) => b.allocationPct - a.allocationPct);
    const result: (GardenPlant | null)[] = [];
    for (let i = 0; i < maxSlots; i++) result.push(sorted[i] ?? null);
    return result;
  }, [plants, maxSlots]);

  const W = 340;
  const H = 200;
  const GROUND_Y = 160;
  const slotWidth = W / maxSlots;

  return (
    <div className="relative w-full" style={{ aspectRatio: "340/200" }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" role="img" aria-label="Visualisation vivante de ton jardin">
        <defs>
          <pattern id="soilTexture" width="12" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="3" r="0.5" fill="var(--paper-inset)" opacity="0.4" />
            <circle cx="6" cy="2" r="0.5" fill="var(--paper-inset)" opacity="0.4" />
            <circle cx="10" cy="4" r="0.5" fill="var(--paper-inset)" opacity="0.4" />
          </pattern>
        </defs>

        <line x1="0" y1={GROUND_Y - 14} x2={W} y2={GROUND_Y - 14} stroke="var(--paper-3)" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.5" />
        <line x1="0" y1={GROUND_Y - 28} x2={W} y2={GROUND_Y - 28} stroke="var(--paper-3)" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.3" />

        <rect x="0" y={GROUND_Y} width={W} height={H - GROUND_Y} fill="var(--paper-inset)" rx="8" />
        <rect x="0" y={GROUND_Y} width={W} height={H - GROUND_Y} fill="url(#soilTexture)" />

        {slots.map((plant, i) => {
          const cx = i * slotWidth + slotWidth / 2;
          return plant ? (
            <PlantSprite key={plant.id} plant={plant} cx={cx} groundY={GROUND_Y} onClick={() => onPlantClick?.(plant)} />
          ) : (
            <EmptySlot key={`e-${i}`} cx={cx} groundY={GROUND_Y} onClick={() => (onEmptySlotClick ? onEmptySlotClick() : navigate({ to: "/discover" }))} />
          );
        })}
      </svg>
    </div>
  );
}

function PlantSprite({ plant, cx, groundY, onClick }: { plant: GardenPlant; cx: number; groundY: number; onClick: () => void }) {
  const headSize = Math.max(28, Math.min(56, 24 + plant.allocationPct * 0.8));
  const stemHeight = Math.max(10, Math.min(70, 20 + plant.performancePct * 2));
  const isStruggling = plant.performancePct < -1;

  const headColor = isStruggling
    ? "var(--rust)"
    : plant.performancePct > 8
      ? "var(--moss-1)"
      : "var(--moss-2)";
  const stemColor = isStruggling ? "var(--gold)" : "var(--moss-2)";
  const stemTop = groundY - stemHeight - headSize / 2;

  return (
    <motion.g
      initial={{ opacity: 0, scaleY: 0 }}
      animate={{ opacity: 1, scaleY: 1 }}
      transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: Math.random() * 0.2 }}
      style={{ transformOrigin: `${cx}px ${groundY}px`, cursor: "pointer" }}
      onClick={onClick}
      whileHover={{ y: -3 }}
    >
      <line x1={cx} y1={groundY} x2={cx} y2={groundY - stemHeight} stroke={stemColor} strokeWidth="2.5" strokeLinecap="round" />
      {stemHeight > 30 && (
        <>
          <ellipse cx={cx - 5} cy={groundY - stemHeight * 0.5} rx="4" ry="2" fill="var(--moss-2)" transform={`rotate(-30 ${cx - 5} ${groundY - stemHeight * 0.5})`} opacity="0.7" />
          <ellipse cx={cx + 5} cy={groundY - stemHeight * 0.7} rx="4" ry="2" fill="var(--moss-3)" transform={`rotate(30 ${cx + 5} ${groundY - stemHeight * 0.7})`} opacity="0.7" />
        </>
      )}
      <ellipse cx={cx} cy={stemTop + headSize / 2} rx={headSize / 2} ry={(headSize / 2) * 1.1} fill={headColor} />
      <text x={cx} y={stemTop + headSize / 2 + 2} textAnchor="middle" fill="var(--paper)" fontSize="8" fontWeight="700" fontFamily="Geist, sans-serif" style={{ pointerEvents: "none" }}>
        {plant.ticker.slice(0, 5)}
      </text>
      <text x={cx} y={groundY + 18} textAnchor="middle" fill="var(--ink-3)" fontSize="7" fontWeight="500" fontFamily="Geist, sans-serif" style={{ pointerEvents: "none" }}>
        {plant.allocationPct.toFixed(0)}%
      </text>
    </motion.g>
  );
}

function EmptySlot({ cx, groundY, onClick }: { cx: number; groundY: number; onClick: () => void }) {
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ duration: 0.5, delay: 0.3 }} style={{ cursor: "pointer" }} onClick={onClick} whileHover={{ opacity: 1 }}>
      <ellipse cx={cx} cy={groundY + 4} rx="10" ry="3" fill="var(--paper-inset)" />
      <circle cx={cx} cy={groundY - 10} r="8" fill="none" stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="2 2" />
      <line x1={cx - 3} y1={groundY - 10} x2={cx + 3} y2={groundY - 10} stroke="var(--ink-3)" strokeWidth="1" strokeLinecap="round" />
      <line x1={cx} y1={groundY - 13} x2={cx} y2={groundY - 7} stroke="var(--ink-3)" strokeWidth="1" strokeLinecap="round" />
    </motion.g>
  );
}
