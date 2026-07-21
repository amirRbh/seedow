import { Link } from "@tanstack/react-router";
import { getCourse } from "@/content/courses";

interface Props {
  /** Slug du cours à mettre en avant. */
  slug: string;
  /** Accroche courte expliquant pourquoi ce cours est proposé ici. */
  reason?: string;
}

/**
 * Carte de cours contextuelle — tisse la pédagogie dans le flux produit :
 * au moment où l'utilisateur rencontre une notion (ex. un risque de
 * greenwashing sur une fiche actif), on lui propose le cours qui l'éclaire,
 * sans quitter son contexte. Rend `null` si le slug est inconnu.
 */
export function RelatedCourse({ slug, reason }: Props) {
  const course = getCourse(slug);
  if (!course) return null;

  return (
    <Link
      to="/cours/$slug"
      params={{ slug: course.slug }}
      className="group flex items-center gap-3 bg-paper-2/60 border border-ink/8 hover:border-gold/60 transition-colors p-3 rounded-lg"
    >
      <span
        aria-hidden="true"
        className="flex-shrink-0 w-9 h-9 rounded-full bg-gold/15 text-gold flex items-center justify-center"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 7v14" />
          <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-tag font-semibold uppercase tracking-[0.18em] text-gold mb-0.5">
          {reason ?? "Cours en lien"}
        </p>
        <p className="text-body-sm font-medium text-ink leading-snug group-hover:text-gold transition-colors truncate">
          {course.title}
        </p>
      </div>
      <span className="flex-shrink-0 text-tag text-ink-3 tabular-nums">
        {course.readingMinutes} min →
      </span>
    </Link>
  );
}
