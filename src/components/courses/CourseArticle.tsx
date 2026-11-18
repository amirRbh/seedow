import type { Course, CourseSection } from "@/content/courses";
import { Reveal } from "@/components/motion/Reveal";

interface Props {
  course: Course;
  sections: CourseSection[];
  truncated?: boolean;
}

export function CourseArticle({ course, sections, truncated }: Props) {
  return (
    <article className="mx-auto max-w-2xl">
      <header className="mb-12 md:mb-16">
        <p className="flex flex-wrap items-center gap-2">
          <span className="chip chip--accent">
            N° {String(course.number).padStart(2, "0")} · {course.eyebrow}
          </span>
        </p>
        <h1 className="display-lg mt-5">{course.title}</h1>
        <p className="mt-6 text-body-xl leading-relaxed text-ink-2">{course.intro}</p>
        {course.eli5 && (
          <aside className="tile-accent mt-8 p-6 md:p-7">
            <p className="stamp mb-2">En une image</p>
            <p className="text-body-lg leading-relaxed text-ink md:text-body-xl">{course.eli5}</p>
          </aside>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="chip">{course.track === "esg" ? "Finance ESG" : "Finance"}</span>
          <span className="chip">{course.level === "debutant" ? "Débutant" : "Intermédiaire"}</span>
          <span className="chip tabular-nums">{course.readingMinutes} min de lecture</span>
        </div>
      </header>

      <div className="space-y-12 md:space-y-14">
        {sections.map((section, i) => (
          <Reveal as="section" key={i}>
            <h2 className="mb-5 text-[clamp(22px,2.6vw,28px)]">{section.heading}</h2>
            <div className="space-y-4 text-body-lg leading-[1.75] text-ink-2">
              {section.paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
            {section.callout && (
              <aside className="mt-6 rounded-r-2xl border-l-[3px] border-section-accent bg-paper py-4 pr-5 pl-5 text-body-lg font-medium leading-relaxed text-ink shadow-card">
                {section.callout}
              </aside>
            )}
          </Reveal>
        ))}
      </div>

      {!truncated && course.advanced && course.advanced.length > 0 && (
        <Reveal as="section" className="paper-card mt-16 p-6 md:mt-20 md:p-8">
          <h2 className="text-[clamp(20px,2.2vw,24px)]">Aller plus loin</h2>
          <p className="mt-2 text-body-sm text-ink-3">
            Pour ceux qui veulent creuser — formules, nuances, chiffres de marché.
          </p>
          <ul className="mt-6 space-y-4">
            {course.advanced.map((item, i) => (
              <li key={i} className="flex gap-4 text-body leading-relaxed text-ink-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-2 font-value text-caption tabular-nums text-ink-2">
                  {i + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      {!truncated && (
        <Reveal as="section" className="tile-accent mt-6 p-6 md:p-8">
          <h2 className="text-[clamp(20px,2.2vw,24px)]">À retenir</h2>
          <ul className="mt-5 space-y-4">
            {course.keyTakeaways.map((k, i) => (
              <li key={i} className="flex gap-4 text-body-lg leading-relaxed text-ink">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-section-accent font-value text-caption tabular-nums text-paper">
                  {i + 1}
                </span>
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </article>
  );
}
