import type { Course, CourseSection } from "@/content/courses";

interface Props {
  course: Course;
  sections: CourseSection[];
  truncated?: boolean;
}

export function CourseArticle({ course, sections, truncated }: Props) {
  return (
    <article className="max-w-2xl mx-auto">
      <header className="mb-12 md:mb-16">
        <p className="font-display text-xs tracking-[0.25em] text-gold tabular-nums mb-4">
          N° {String(course.number).padStart(2, "0")} · {course.eyebrow}
        </p>
        <h1 className="font-display text-3xl md:text-5xl leading-[1.05] text-ink mb-6">
          {course.title}
        </h1>
        <div className="gold-rule mb-6" />
        <p className="text-lg md:text-xl text-ink-2 leading-relaxed">{course.intro}</p>
        {course.eli5 && (
          <aside className="mt-8 bg-paper-2/70 border border-ink/8 p-5 md:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3 mb-2">
              En une image
            </p>
            <p className="text-[15px] md:text-base text-ink italic leading-relaxed">
              {course.eli5}
            </p>
          </aside>
        )}
        <div className="mt-6 flex items-center gap-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-3">
          <span>{course.track === "esg" ? "Finance ESG" : "Finance"}</span>
          <span>·</span>
          <span>{course.level === "debutant" ? "Débutant" : "Intermédiaire"}</span>
          <span>·</span>
          <span>{course.readingMinutes} min de lecture</span>
        </div>
      </header>

      <div className="space-y-12 md:space-y-14">
        {sections.map((section, i) => (
          <section key={i}>
            <h2 className="font-display text-xl md:text-2xl text-ink mb-5 leading-tight">
              {section.heading}
            </h2>
            <div className="space-y-4 text-[15px] md:text-base text-ink-2 leading-[1.75]">
              {section.paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
            {section.callout && (
              <aside className="mt-6 border-l-2 border-gold pl-5 py-1 text-sm md:text-base text-ink italic">
                {section.callout}
              </aside>
            )}
          </section>
        ))}
      </div>

      {!truncated && course.advanced && course.advanced.length > 0 && (
        <section className="mt-16 md:mt-20 pt-10 border-t border-ink/10">
          <p className="eyebrow mb-4">Aller plus loin</p>
          <p className="text-xs text-ink-3 mb-5">
            Pour ceux qui veulent creuser — formules, nuances, chiffres de marché.
          </p>
          <div className="gold-rule mb-6" />
          <ul className="space-y-3">
            {course.advanced.map((item, i) => (
              <li
                key={i}
                className="flex gap-3 text-[14px] md:text-[15px] text-ink-2 leading-relaxed"
              >
                <span className="font-mono text-[11px] text-gold tabular-nums shrink-0 w-6 pt-1">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!truncated && (
        <section className="mt-16 md:mt-20 pt-10 border-t border-ink/10">
          <p className="eyebrow mb-5">À retenir</p>
          <ul className="space-y-3">
            {course.keyTakeaways.map((k, i) => (
              <li key={i} className="flex gap-3 text-[15px] md:text-base text-ink leading-relaxed">
                <span className="font-display text-gold tabular-nums shrink-0 w-6">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
