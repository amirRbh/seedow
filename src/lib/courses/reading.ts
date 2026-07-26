/**
 * Suivi de lecture des cours — côté navigateur, sans compte.
 *
 * Distinct de la progression « quiz » (`useCourseProgress`, réservée aux
 * comptes) : ici on ne mémorise que les cours *ouverts en lecture*, pour
 * permettre à un visiteur anonyme de reprendre là où il s'était arrêté. C'est
 * le socle de la rétention pré-onboarding : la lecture reste libre, et l'app
 * s'en souvient localement.
 *
 * Logique hors composant (point d'entrée unique), tolérante au SSR.
 */

export const READING_KEY = "seedow.courses.reading";

export interface CourseReadingState {
  /** Slugs ouverts, dans l'ordre de première ouverture. */
  opened: string[];
  /** Dernier cours ouvert (point de reprise), ou null. */
  lastOpened: string | null;
  updatedAt: number;
}

const EMPTY: CourseReadingState = { opened: [], lastOpened: null, updatedAt: 0 };

export function getReadingState(): CourseReadingState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(READING_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<CourseReadingState>;
    const opened = Array.isArray(parsed.opened)
      ? parsed.opened.filter((s): s is string => typeof s === "string")
      : [];
    return {
      opened,
      lastOpened: typeof parsed.lastOpened === "string" ? parsed.lastOpened : null,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return EMPTY;
  }
}

/** Marque un cours comme ouvert et le définit comme point de reprise. */
export function markCourseOpened(slug: string): void {
  if (typeof window === "undefined" || !slug) return;
  try {
    const state = getReadingState();
    const opened = state.opened.includes(slug) ? state.opened : [...state.opened, slug];
    const next: CourseReadingState = { opened, lastOpened: slug, updatedAt: Date.now() };
    window.localStorage.setItem(READING_KEY, JSON.stringify(next));
  } catch {
    // Stockage indisponible : la lecture reste possible, seul le « reprends » est perdu.
  }
}

/** `true` si au moins un cours a été ouvert. */
export function hasStartedCourses(): boolean {
  return getReadingState().opened.length > 0;
}
