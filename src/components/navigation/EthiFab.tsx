import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * Bouton flottant discret pour Ethi (mobile). L'assistant n'a pas besoin d'un
 * onglet dédié dans la barre — il reste accessible « en fond » via cette icône,
 * posée au-dessus de la BottomNavigation. Rendu uniquement sur mobile (le
 * desktop garde Ethi dans le rail) et masqué sur la page Ethi elle-même, pour
 * ne pas offrir un raccourci vers l'écran où l'on est déjà.
 */
export function EthiFab() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/ethi") return null;

  return (
    <Link
      to="/ethi"
      search={{} as never}
      aria-label={t("rail_nav.ethi_assistant")}
      className={cn(
        "md:hidden fixed right-4 bottom-[76px] z-40 flex h-12 w-12 items-center justify-center rounded-full",
        "bg-ink text-paper shadow-lg shadow-ink/20 transition-transform duration-200",
        "hover:scale-[1.03] active:scale-95",
        "outline-none focus-visible:ring-2 focus-visible:ring-highlight-1 focus-visible:ring-offset-2",
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
      </svg>
    </Link>
  );
}
