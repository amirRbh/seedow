/**
 * Bandeau permanent affiché en mode démo bêta.
 * Discret, en haut du dashboard / portfolio.
 */
export function BetaBanner() {
  return (
    <div className="bg-paper-2 border-b border-paper-3 px-5 py-2">
      <div className="max-w-lg mx-auto flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-ink-3">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold" aria-hidden />
        <span className="font-semibold text-ink-2">Mode démo</span>
        <span className="text-ink-3 normal-case tracking-normal text-[11px]">
          · capital virtuel · cours réels · aucun argent investi
        </span>
      </div>
    </div>
  );
}
