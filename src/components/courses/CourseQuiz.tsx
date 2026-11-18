import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { QuizQuestion } from "@/content/courses/types";
import { cn } from "@/lib/utils";
import { trackAppEvent } from "@/lib/analytics/appEvents";

interface Props {
  slug: string;
  quiz: QuizQuestion[];
}

export function CourseQuiz({ slug, quiz }: Props) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = quiz.every((_, i) => answers[i] !== undefined);
  const score = quiz.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0);

  function reset() {
    setAnswers({});
    setSubmitted(false);
  }

  function submit() {
    setSubmitted(true);
    try {
      const key = `seedow.course.${slug}.score`;
      window.localStorage.setItem(
        key,
        JSON.stringify({ score, total: quiz.length, at: Date.now() }),
      );
    } catch {
      // ignore
    }
    // Cours terminé = quiz validé jusqu'au bout. On mesure le score sans le nom
    // du cours en clair (slug borné), no-op silencieux pré-auth.
    void trackAppEvent("course_completed", { slug, score, total: quiz.length });
  }

  return (
    <section className="paper-card mx-auto mt-16 max-w-2xl p-6 md:p-9">
      <span className="chip chip--accent">Quiz</span>
      <h2 className="mt-4 text-[clamp(24px,3vw,32px)]">Vérifie ta compréhension</h2>
      <p className="mt-2 mb-10 text-body text-ink-3">
        {quiz.length} questions · réponds sans pression, le score reste sur ton appareil.
      </p>

      <ol className="space-y-10">
        {quiz.map((q, i) => {
          const userAnswer = answers[i];
          return (
            <li key={i}>
              <p className="mb-4 flex gap-3 text-body-lg font-bold leading-snug text-ink">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-section-accent font-value text-caption tabular-nums text-paper">
                  {i + 1}
                </span>
                {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, j) => {
                  const isSelected = userAnswer === j;
                  const isCorrect = j === q.correctIndex;
                  const showResult = submitted;
                  const right = showResult && isCorrect;
                  const wrong = showResult && !isCorrect && isSelected;
                  return (
                    <button
                      key={j}
                      type="button"
                      onClick={() => !submitted && setAnswers({ ...answers, [i]: j })}
                      disabled={submitted}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-body outline-none ring-1 ring-inset transition-[background-color,box-shadow,transform] duration-200 ease-brand",
                        "focus-visible:ring-2 focus-visible:ring-mint motion-reduce:transform-none",
                        !showResult && "active:scale-[0.99]",
                        !showResult && isSelected && "bg-paper-2 text-ink ring-2 ring-ink",
                        !showResult &&
                          !isSelected &&
                          "text-ink-2 ring-paper-3 hover:bg-paper-2 hover:text-ink hover:ring-ink-3",
                        right && "bg-mint-tint text-ink ring-2 ring-mint",
                        wrong && "bg-alert-tint text-ink ring-2 ring-alert",
                        showResult && !isCorrect && !isSelected && "text-ink-3 ring-paper-3",
                        submitted && "cursor-default",
                      )}
                    >
                      {/* Juste / faux se lit à l'ICÔNE et au mot dit aux lecteurs
                          d'écran, pas à la seule couleur (CLAUDE.md §4). */}
                      <span
                        aria-hidden
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-caption font-bold",
                          right
                            ? "bg-mint text-paper"
                            : wrong
                              ? "bg-alert text-paper"
                              : isSelected && !showResult
                                ? "bg-ink text-paper"
                                : "bg-paper-inset text-ink-3",
                        )}
                      >
                        {right ? (
                          <Check className="size-3.5" strokeWidth={3} />
                        ) : wrong ? (
                          <X className="size-3.5" strokeWidth={3} />
                        ) : (
                          String.fromCharCode(65 + j)
                        )}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {right && <span className="sr-only">— bonne réponse</span>}
                      {wrong && <span className="sr-only">— ta réponse, incorrecte</span>}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p className="mt-3 animate-fade-in-up rounded-2xl bg-paper-2 px-4 py-3 text-body-sm leading-relaxed text-ink-2">
                  {q.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-paper-3 pt-8 sm:flex-row">
        {submitted ? (
          <>
            <div className="animate-pop">
              <p className="font-display text-[44px] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums">
                {score} <span className="text-ink-3">/ {quiz.length}</span>
              </p>
              <p className="mt-2 text-body text-ink-2">
                {score === quiz.length
                  ? "Sans faute — solide."
                  : score >= quiz.length - 1
                    ? "Très bon score."
                    : "Relis les passages clés et recommence."}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={reset}>
              Recommencer
            </Button>
          </>
        ) : (
          <Button type="button" size="lg" disabled={!allAnswered} onClick={submit}>
            Valider mes réponses
          </Button>
        )}
      </div>
    </section>
  );
}
