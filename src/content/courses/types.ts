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
  intro: string;
  sections: CourseSection[];
  keyTakeaways: string[];
  quiz: QuizQuestion[];
}
