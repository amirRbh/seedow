import type { ReactNode } from "react";
import { Aurora } from "@/components/motion/Aurora";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { SplitWords, wordCount } from "@/components/motion/SplitWords";
import { cn } from "@/lib/utils";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type Accent = "mint" | "ice" | "volt" | "solar";

/**
 * Gabarit des pages publiques — DA V4.
 *
 * Toute page qui se lit sans compte (tarifs, aide, cours, méthodologie,
 * Observatoire, fiche fonds, pages légales…) est posée dans ce cadre : le même
 * en-tête flottant, le même pied de page, et l'accent de la page (`accent`)
 * qui teinte ses pastilles et ses reflets. La couleur SITUE la page ; elle ne
 * porte jamais d'information à elle seule (CLAUDE.md §4).
 */
export function PublicPage({
  accent = "mint",
  progress = false,
  className,
  children,
}: {
  accent?: Accent;
  /** Affiche la barre de progression de lecture (pages longues). */
  progress?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(`accent-${accent}`, "min-h-screen text-ink", className)}>
      {progress && <ScrollProgress />}
      <SiteHeader />
      <main id="main-content">{children}</main>
      <SiteFooter />
    </div>
  );
}

/**
 * En-tête de page publique : une aurore, une pastille de section, un grand
 * titre qui monte mot par mot, une phrase. `accentTitle` est la partie du titre
 * rendue en dégradé de marque.
 */
export function PageHero({
  eyebrow,
  title,
  accentTitle,
  subtitle,
  align = "center",
  size = "lg",
  children,
  className,
}: {
  eyebrow?: ReactNode;
  title: string;
  accentTitle?: string;
  subtitle?: ReactNode;
  align?: "center" | "left";
  size?: "lg" | "xl";
  /** Contenu sous le sous-titre (actions, filtres…). */
  children?: ReactNode;
  className?: string;
}) {
  const centered = align === "center";
  return (
    <header className={cn("relative overflow-hidden", className)}>
      <Aurora />
      <div
        className={cn(
          "relative z-10 mx-auto max-w-[1160px] px-5 pt-[124px] pb-12 sm:px-7 md:pt-[164px] md:pb-16",
          centered && "text-center",
        )}
      >
        {eyebrow && <span className="chip chip--accent bg-paper shadow-card">{eyebrow}</span>}
        <h1
          className={cn(
            size === "xl" ? "display-xl" : "display-lg",
            "mt-6",
            centered ? "mx-auto max-w-[18ch]" : "max-w-[20ch]",
          )}
        >
          <SplitWords text={title} />
          {accentTitle && (
            <>
              {" "}
              <SplitWords
                text={accentTitle}
                wordClassName="text-gradient"
                startIndex={wordCount(title)}
              />
            </>
          )}
        </h1>
        {subtitle && (
          <div
            className={cn(
              "mt-6 max-w-[58ch] animate-fade-in-up text-body-lg leading-relaxed text-ink-2 md:text-body-xl",
              centered && "mx-auto",
            )}
            style={{ animationDelay: "260ms" }}
          >
            {subtitle}
          </div>
        )}
        {children && (
          <div
            className="mt-8 animate-fade-in-up"
            style={{ animationDelay: "360ms" }}
          >
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
