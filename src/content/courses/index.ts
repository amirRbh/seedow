import type { Course } from "./types";
import { course as c01 } from "./01-cinq-mots";
import { course as c02 } from "./02-interets-composes";
import { course as c03 } from "./03-diversification";
import { course as c04 } from "./04-actions-obligations-etf";
import { course as c05 } from "./05-risque-volatilite";
import { course as c06 } from "./06-frais-caches";
import { course as c07 } from "./07-esg-cest-quoi";
import { course as c08 } from "./08-greenwashing";
import { course as c09 } from "./09-labels-isr-sfdr";
import { course as c10 } from "./10-exclusions-sectorielles";
import { course as c11 } from "./11-mesurer-impact";
import { course as c12 } from "./12-portefeuille-aligne";

export const COURSES: Course[] = [c01, c02, c07, c03, c04, c05, c06, c08, c09, c10, c11, c12];

export function getCourse(slug: string): Course | undefined {
  return COURSES.find((c) => c.slug === slug);
}

export function getNextCourse(slug: string): Course | undefined {
  const idx = COURSES.findIndex((c) => c.slug === slug);
  if (idx === -1 || idx === COURSES.length - 1) return undefined;
  return COURSES[idx + 1];
}

export type { Course } from "./types";
