import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

/**
 * « Pourquoi ? » contextuel (refonte mobile §11/§24). Au lieu de renvoyer vers
 * un onglet Ethi vide, ce bouton ouvre l'assistant avec la question déjà écrite,
 * en rapport avec ce que l'utilisateur regarde. Il obtient une réponse en un
 * clic — « Pourquoi cette entreprise ? Pourquoi ce score ? » — sans avoir à
 * reformuler ni perdre le fil. Réutilise le chat Ethi existant (`/ethi?q=…`).
 */
export function WhyEthi({ question, label }: { question: string; label?: string }) {
  const { t } = useTranslation();
  return (
    <Link
      to="/ethi"
      search={{ q: question } as never}
      className="inline-flex items-center gap-1.5 rounded-full border border-paper-3 bg-paper-2 px-3 py-1.5 text-caption font-semibold text-ink-2 hover:border-ink/40 hover:text-ink transition-colors outline-none focus-visible:ring-2 focus-visible:ring-highlight-1"
    >
      <svg
        viewBox="0 0 24 24"
        className="w-3.5 h-3.5 flex-none"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M9.1 9a3 3 0 1 1 4 2.8c-.8.4-1.1 1-1.1 1.7v.4" />
        <path d="M12 17h.01" />
      </svg>
      {label ?? t("why_ethi.label")}
    </Link>
  );
}
