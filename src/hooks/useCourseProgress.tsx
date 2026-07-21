import { useEffect, useState } from "react";

/**
 * Progression des cours — engagement personnel, sans backend.
 *
 * Source de vérité : les clés `seedow.course.<slug>.score` déjà écrites par
 * CourseQuiz au moment de la validation d'un quiz. Un cours est « terminé »
 * dès qu'un score y est enregistré.
 *
 * Lecture uniquement côté client (localStorage indisponible en SSR) : l'état
 * démarre vide et se remplit après le montage, ce qui évite tout écart
 * d'hydratation. `ready` passe à true une fois la lecture faite.
 */
export interface CourseScore {
  score: number;
  total: number;
  at: number;
}

const KEY_PREFIX = "seedow.course.";
const KEY_SUFFIX = ".score";

export function readCourseScore(slug: string): CourseScore | null {
  try {
    const raw = window.localStorage.getItem(`${KEY_PREFIX}${slug}${KEY_SUFFIX}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CourseScore>;
    if (typeof parsed.score !== "number" || typeof parsed.total !== "number") return null;
    return { score: parsed.score, total: parsed.total, at: parsed.at ?? 0 };
  } catch {
    return null;
  }
}

interface CourseProgress {
  ready: boolean;
  scores: Record<string, CourseScore>;
  isCompleted: (slug: string) => boolean;
  scoreOf: (slug: string) => CourseScore | null;
  completedCount: number;
}

/**
 * @param slugs liste des cours à suivre (l'ordre importe peu ; sert à borner
 *   le comptage et à cibler les lectures localStorage).
 */
export function useCourseProgress(slugs: string[]): CourseProgress {
  const [scores, setScores] = useState<Record<string, CourseScore>>({});
  const [ready, setReady] = useState(false);

  // Clé stable pour l'effet : la liste des slugs, jamais recréée en pratique.
  const slugsKey = slugs.join(",");

  useEffect(() => {
    const next: Record<string, CourseScore> = {};
    for (const slug of slugsKey.split(",").filter(Boolean)) {
      const s = readCourseScore(slug);
      if (s) next[slug] = s;
    }
    setScores(next);
    setReady(true);
  }, [slugsKey]);

  return {
    ready,
    scores,
    isCompleted: (slug: string) => slug in scores,
    scoreOf: (slug: string) => scores[slug] ?? null,
    completedCount: Object.keys(scores).length,
  };
}
