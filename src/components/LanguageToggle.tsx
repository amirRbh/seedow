import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLang } from "@/hooks/useLang";
import type { Lang } from "@/i18n";

interface LanguageToggleProps {
  className?: string;
}

/**
 * Bascule FR | EN — DA V4 : un sélecteur segmenté compact, dont la pastille
 * glisse d'une langue à l'autre. L'état actif est porté par `aria-pressed`
 * et par la pastille (forme), pas par la seule couleur du texte.
 */
export function LanguageToggle({ className }: LanguageToggleProps) {
  const { lang, setLang } = useLang();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const options: Lang[] = ["fr", "en"];
  const activeIndex = mounted ? options.indexOf(lang) : 0;
  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        "relative inline-flex h-8 items-center rounded-full bg-paper-2 p-[3px] ring-1 ring-inset ring-paper-3",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute top-[3px] bottom-[3px] left-[3px] w-[34px] rounded-full bg-paper shadow-card transition-transform duration-300 ease-brand motion-reduce:transition-none"
        style={{ transform: `translateX(${activeIndex * 34}px)` }}
      />
      {options.map((opt) => {
        const active = mounted && lang === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => setLang(opt)}
            aria-pressed={active}
            aria-label={opt === "fr" ? "Français" : "English"}
            className={cn(
              "relative z-10 inline-flex h-[26px] w-[34px] items-center justify-center rounded-full text-caption font-bold transition-colors duration-200",
              "outline-none focus-visible:ring-2 focus-visible:ring-mint",
              active ? "text-ink" : "text-ink-3 hover:text-ink",
            )}
          >
            {opt.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
