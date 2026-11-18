import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import { PublicPage } from "./PublicPage";
import { SiteHeaderSpacer } from "./SiteHeader";

/**
 * Gabarit des pages légales (CGU, confidentialité, mentions légales) — DA V4.
 *
 * Un document se LIT : pas d'aurore ni de titre animé ici, une colonne de 70
 * caractères posée sur une carte, des titres de section en police de titre, et
 * la date de mise à jour écrite sous le titre (pas en pied de page). Les
 * encadrés « à retenir » gardent leur place en tête du texte : c'est ce que
 * l'utilisateur doit lire même s'il ne lit rien d'autre (CLAUDE.md §1.2).
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <PublicPage accent="ice" progress>
      <SiteHeaderSpacer />
      <div className="mx-auto max-w-3xl px-5 pb-8 sm:px-6">
        <header className="animate-fade-in-up pt-4 pb-8 md:pt-8">
          <span className="icon-badge">
            <FileText aria-hidden />
          </span>
          <h1 className="display-lg mt-5">{title}</h1>
          <p className="mt-3 text-body-sm text-ink-3">{updated}</p>
        </header>
        <article className="legal paper-card space-y-10 p-6 text-body leading-relaxed text-ink-2 sm:p-10">
          {children}
        </article>
      </div>
    </PublicPage>
  );
}
