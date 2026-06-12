import { useBetaCapacity } from "@/hooks/useBetaCapacity";

/**
 * Compteur "X / 300 places prises" pour la landing.
 * Affiche un état chargement minimal pour ne pas casser le layout.
 */
export function BetaCounter({ className = "" }: { className?: string }) {
  const { capacity, loading } = useBetaCapacity();
  if (loading || !capacity) {
    return (
      <span className={`text-[10px] uppercase tracking-[0.22em] text-ink-3 ${className}`}>
        Phase bêta — places limitées
      </span>
    );
  }
  const pct = Math.min(100, Math.round((capacity.slotsTaken / capacity.cap) * 100));
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.22em] text-ink-2">
        <span>Phase bêta</span>
        <span className="font-semibold text-ink">
          {capacity.slotsTaken} / {capacity.cap} places prises
        </span>
      </div>
      <div className="h-1 bg-paper-3 overflow-hidden rounded-full">
        <div
          className="h-full bg-gold transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
