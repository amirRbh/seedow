export type Track = "finance" | "esg";
export type Level = "debutant" | "intermediaire";

export interface CourseSection {
  heading: string;
  paragraphs: string[];
  callout?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Course {
  slug: string;
  number: number;
  track: Track;
  level: Level;
  isFree: boolean;
  readingMinutes: number;
  title: string;
  eyebrow: string;
  description: string;
  /** Analogie ultra-simple affichée sous l'intro (« en une image »). */
  eli5?: string;
  /** Bloc « Aller plus loin » : 3–5 puces avancées, affichées en fin d'article. */
  advanced?: string[];
  intro: string;
  sections: CourseSection[];
  keyTakeaways: string[];
  quiz: QuizQuestion[];
}
