/**
 * Statut de progression par cours, dans l'ordre pédagogique recommandé.
 * Fonction pure (pas de I/O) : les ensembles "terminé" / "ouvert" sont
 * fournis par l'appelant (localStorage lu en amont côté client).
 */

export type CourseStatus = "not_started" | "in_progress" | "completed";

export interface CourseStatusEntry {
  slug: string;
  status: CourseStatus;
  /** Premier cours non terminé de l'ordre recommandé — point d'entrée conseillé. */
  isStartHere: boolean;
}

/**
 * @param orderedSlugs slugs dans l'ordre pédagogique recommandé (COURSES).
 * @param completedSlugs cours dont le quiz a été validé.
 * @param openedSlugs cours déjà ouverts en lecture, terminés ou non.
 */
export function computeCourseStatuses(
  orderedSlugs: string[],
  completedSlugs: Iterable<string>,
  openedSlugs: Iterable<string>,
): CourseStatusEntry[] {
  const completed = new Set(completedSlugs);
  const opened = new Set(openedSlugs);
  let startHereAssigned = false;

  return orderedSlugs.map((slug) => {
    const isCompleted = completed.has(slug);
    const status: CourseStatus = isCompleted
      ? "completed"
      : opened.has(slug)
        ? "in_progress"
        : "not_started";

    const isStartHere = !isCompleted && !startHereAssigned;
    if (isStartHere) startHereAssigned = true;

    return { slug, status, isStartHere };
  });
}
