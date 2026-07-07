import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { RailNav } from "./RailNav";
import { TopBar } from "./TopBar";
import { CommandPalette } from "./CommandPalette";
import { BetaBanner } from "@/components/beta/BetaBanner";
import { useFocusMode } from "@/hooks/useFocusMode";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Routes affichant des montants/valorisations réelles → bandeau bêta requis. */
const MONEY_ROUTES = [
  "/dashboard",
  "/portfolio",
  "/objectifs",
  "/certificat",
  "/comparatif",
  "/profil",
];
function showBetaBannerFor(pathname: string): boolean {
  return MONEY_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Shell de l'application — rail + topbar persistants sur desktop (md+).
 * Sur mobile : passe-plat, le rendu existant (`AppHeader` + `BottomNavigation`
 * dans chaque route) prend le relais.
 *
 * Raccourcis clavier globaux :
 *   ⌘K / Ctrl+K → palette
 *   g d / g p / g c → navigation rapide
 *   .           → bascule mode focus (rétracte le chrome)
 *   Escape      → sort du mode focus
 *   ?           → palette + aide
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const gPrefix = useRef<number | null>(null);
  const { focus, setFocus, toggle: toggleFocus, prefersReducedMotion } = useFocusMode();

  const openPalette = useCallback(() => setPaletteOpen(true), []);

  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable ||
        el.closest("[contenteditable='true']") !== null
      );
    };

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.key === "Escape" && focus) {
        setFocus(false);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(e.target)) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

      // "." → bascule focus
      if (e.key === ".") {
        e.preventDefault();
        toggleFocus();
        return;
      }

      if (e.key.toLowerCase() === "g") {
        gPrefix.current = Date.now();
        return;
      }
      if (gPrefix.current && Date.now() - gPrefix.current < 1500) {
        const key = e.key.toLowerCase();
        gPrefix.current = null;
        if (key === "d") { e.preventDefault(); navigate({ to: "/dashboard" }); return; }
        if (key === "p") { e.preventDefault(); navigate({ to: "/portfolio" }); return; }
        if (key === "c") { e.preventDefault(); navigate({ to: "/comparatif" }); return; }
        if (key === "o") { e.preventDefault(); navigate({ to: "/objectifs" }); return; }
      }

    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, focus, setFocus, toggleFocus]);

  const fullBleed =
    pathname === "/" ||
    pathname.startsWith("/cours") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/certificat");

  const showBanner = showBetaBannerFor(pathname);

  if (fullBleed) {
    return (
      <>
        {showBanner ? <BetaBanner /> : null}
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      {showBanner ? <BetaBanner /> : null}
      <div
        className={cn(
          prefersReducedMotion ? "" : "transform-gpu will-change-transform transition-[opacity,transform] duration-300 ease-out",
          focus ? "md:opacity-0 md:pointer-events-none md:-translate-x-2" : "md:opacity-100 md:translate-x-0",
        )}
        aria-hidden={focus ? "true" : undefined}
      >
        <RailNav />
      </div>
      <div className={cn(prefersReducedMotion ? "" : "transition-[padding] duration-300 ease-out", focus ? "md:pl-0" : "md:pl-16")}>
        <div
          className={cn(
            prefersReducedMotion ? "grid" : "grid transform-gpu will-change-[grid-template-rows] transition-[grid-template-rows,opacity] duration-300 ease-out",
            focus ? "md:grid-rows-[0fr] md:opacity-0" : "md:grid-rows-[1fr] md:opacity-100",
          )}
          aria-hidden={focus ? "true" : undefined}
        >
          <div className="overflow-hidden min-h-0">
            <TopBar onOpenCommand={openPalette} />
          </div>
        </div>
        <main>{children}</main>
      </div>
      <FocusToggle focus={focus} onToggle={toggleFocus} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

function FocusToggle({ focus, onToggle }: { focus: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={focus}
          aria-label={focus ? t("focus_mode.exit") : t("focus_mode.enter")}
          className={cn(
            "hidden md:flex fixed bottom-4 right-4 z-50 items-center gap-1.5 h-8 px-3 rounded-full",
            "border text-[11px] font-semibold uppercase tracking-[0.18em] transition-all duration-200",
            "outline-none focus-visible:ring-2 focus-visible:ring-moss-1",
            focus
              ? "bg-ink text-paper border-ink shadow-lg hover:bg-ink-2 pointer-events-auto"
              : "bg-paper/80 backdrop-blur text-ink-3 border-paper-3 opacity-0 pointer-events-none focus-visible:opacity-100 focus-visible:pointer-events-auto",
          )}
        >
          <FocusIcon active={focus} />
          <span>{focus ? "Focus" : "Focus"}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" sideOffset={8} className="text-[11px]">
        {focus ? t("focus_mode.show_chrome") : t("focus_mode.hide_chrome")}
        <kbd className="ml-2 text-[9px] text-ink-3 font-mono">.</kbd>
      </TooltipContent>
    </Tooltip>
  );
}

function FocusIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {active ? (
        <>
          <path d="M4 9V5h4" />
          <path d="M20 9V5h-4" />
          <path d="M4 15v4h4" />
          <path d="M20 15v4h-4" />
        </>
      ) : (
        <>
          <path d="M9 4H5v4" />
          <path d="M15 4h4v4" />
          <path d="M9 20H5v-4" />
          <path d="M15 20h4v-4" />
        </>
      )}
    </svg>
  );
}
