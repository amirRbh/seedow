import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";

/**
 * Dropdown selector to switch between the user's active portfolios (max 3).
 * Includes a "+ nouveau jardin" action when capacity allows.
 * Hides itself entirely when the user has zero or one portfolio (degenerate UI).
 */
export function PortfolioSelector({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const { portfolios, activeId, setActiveId, canCreateMore, loading } = useUserPortfolios();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (loading || portfolios.length === 0) return null;

  // If only 1 portfolio and can't create more (e.g. archived flow disabled), hide.
  // We still show the selector when portfolios.length === 1 because user can create a 2nd.
  const active = portfolios.find((p) => p.id === activeId) ?? portfolios[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full border border-paper-3 bg-paper hover:border-moss-2 transition-colors ${
          compact ? "h-7 px-2.5" : "h-8 px-3"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-[10px]">🌿</span>
        <span className="text-[11px] font-semibold text-ink truncate max-w-[120px]">{active.name}</span>
        <svg viewBox="0 0 24 24" className={`w-3 h-3 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1.5 z-50 min-w-[200px] bg-paper border border-paper-3 rounded-xl shadow-lg overflow-hidden"
            role="listbox"
          >
            <div className="py-1">
              {portfolios.map((p) => {
                const isActive = p.id === active.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setActiveId(p.id); setOpen(false); }}
                    role="option"
                    aria-selected={isActive}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[12px] transition-colors ${
                      isActive ? "bg-moss-5/40 text-ink" : "text-ink-2 hover:bg-paper-2"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="text-[12px]">🌱</span>
                      <span className="font-medium truncate">{p.name}</span>
                    </span>
                    {isActive && (
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-moss-1 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-paper-3">
              {canCreateMore ? (
                <button
                  onClick={() => { setOpen(false); navigate({ to: "/onboarding", search: { new: 1 } }); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[12px] text-moss-1 hover:bg-moss-5/30 font-medium"
                >
                  <span className="w-4 h-4 rounded-full border border-moss-1 flex items-center justify-center text-[10px] leading-none">+</span>
                  Nouveau jardin
                  <span className="ml-auto text-[9px] text-ink-3">{portfolios.length}/3</span>
                </button>
              ) : (
                <div className="px-3 py-2 text-[10px] text-ink-3 text-center">
                  Limite de 3 jardins atteinte
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
