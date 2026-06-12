import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLang } from "@/hooks/useLang";
import type { Lang } from "@/i18n";

interface LanguageToggleProps {
  className?: string;
}

/**
 * Bascule FR | EN — style Emerald Prestige.
 * Uppercase, tracking large, ligne or sous l'option active.
 */
export function LanguageToggle({ className }: LanguageToggleProps) {
  const { lang, setLang } = useLang();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const options: Lang[] = ["fr", "en"];
  return (
    <div
      role="group"
      aria-label="Language"
      className={cn("inline-flex items-center gap-2", className)}
    >
      {options.map((opt, idx) => {
        const active = mounted && lang === opt;
        return (
          <span key={opt} className="inline-flex items-center gap-2">
            {idx > 0 && (
              <span aria-hidden="true" className="text-ink-3 text-[10px]">·</span>
            )}
            <button
              type="button"
              onClick={() => setLang(opt)}
              aria-pressed={active}
              aria-label={opt === "fr" ? "Français" : "English"}
              className={cn(
                "relative inline-flex items-center h-6 px-1 text-[10px] font-semibold uppercase tracking-[0.22em] transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-moss-1 rounded-sm",
                active ? "text-ink" : "text-ink-3 hover:text-ink",
              )}
            >
              {opt.toUpperCase()}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-1 right-1 -bottom-0.5 h-px bg-gold"
                />
              )}
            </button>
          </span>
        );
      })}
    </div>
  );
}
