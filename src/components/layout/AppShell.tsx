import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { RailNav } from "./RailNav";
import { TopBar } from "./TopBar";
import { CommandPalette } from "./CommandPalette";

/**
 * Shell de l'application — rail + topbar persistants sur desktop (md+).
 * Sur mobile : passe-plat, le rendu existant (`AppHeader` + `BottomNavigation`
 * dans chaque route) prend le relais.
 *
 * Raccourcis clavier globaux :
 *   ⌘K / Ctrl+K → palette
 *   g d         → /dashboard
 *   g p         → /portfolio
 *   g c         → /comparatif
 *   ?           → palette + aide
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const gPrefix = useRef<number | null>(null);

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
      // ⌘K / Ctrl+K — toujours actif, même dans un champ
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(e.target)) return;

      // ? → aide / palette
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

      // séquence "g <x>" — go-to
      if (e.key.toLowerCase() === "g") {
        gPrefix.current = Date.now();
        return;
      }
      if (gPrefix.current && Date.now() - gPrefix.current < 1500) {
        const key = e.key.toLowerCase();
        gPrefix.current = null;
        if (key === "d") {
          e.preventDefault();
          navigate({ to: "/dashboard" });
          return;
        }
        if (key === "p") {
          e.preventDefault();
          navigate({ to: "/portfolio" });
          return;
        }
        if (key === "c") {
          e.preventDefault();
          navigate({ to: "/comparatif" });
          return;
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  // Routes "plein écran" (auth, onboarding, landing) — pas de shell
  const fullBleed =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding");

  if (fullBleed) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-paper">
      <RailNav />
      <div className="md:pl-16">
        <TopBar onOpenCommand={openPalette} />
        <main>{children}</main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
