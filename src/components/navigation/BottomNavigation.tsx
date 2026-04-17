import { motion } from "framer-motion";
import { Link, useLocation } from "@tanstack/react-router";
import { useLexicon } from "@/hooks/useLexicon";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { key: "garden", path: "/dashboard", labelKey: "garden", icon: "leaf" },
  { key: "roots", path: "/portfolio", labelKey: "roots", icon: "roots" },
  { key: "ethi", path: "/ethi", labelKey: "ethi", icon: "ethi" },
  { key: "discover", path: "/discover", labelKey: "discover", icon: "compass" },
] as const;

export function BottomNavigation() {
  const location = useLocation();
  const { L } = useLexicon();

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-paper/90 backdrop-blur-xl border-t border-paper-3 safe-area-bottom"
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto px-3 py-2 gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const isEthi = item.icon === "ethi";

          return (
            <Link
              key={item.key}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-3 py-2.5 rounded-2xl transition-all duration-200 flex-1 min-w-[52px]",
                isEthi && "bg-ink text-paper hover:bg-moss-2",
                !isEthi && !isActive && "text-ink-3 hover:text-ink hover:bg-paper-2",
                !isEthi && isActive && "text-ink bg-paper-2",
              )}
            >
              <NavIcon type={item.icon} />
              <span className={cn("text-[10px] tracking-wide", isEthi || isActive ? "font-semibold" : "font-medium")}>
                {L.nav[item.labelKey]}
              </span>
              {isActive && !isEthi && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-moss-1"
                  transition={{ type: "spring", damping: 24, stiffness: 300 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}

function NavIcon({ type }: { type: "leaf" | "roots" | "compass" | "ethi" }) {
  const sw = 1.8;
  switch (type) {
    case "leaf":
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22V12" />
          <path d="M12 12c0-4 3-7 7-7 0 4-3 7-7 7Z" />
          <path d="M12 12c0-3-2-5-5-5 0 3 2 5 5 5Z" />
        </svg>
      );
    case "roots":
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v6" />
          <path d="M12 9c-2 2-5 3-5 6s3 5 5 5" />
          <path d="M12 9c2 2 5 3 5 6s-3 5-5 5" />
          <circle cx="12" cy="9" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "compass":
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <polygon points="14.5,9.5 9.5,11.5 9.5,14.5 14.5,12.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "ethi":
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
          <circle cx="9" cy="12" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="13" cy="12" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="17" cy="12" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
