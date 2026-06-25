import { useState } from "react";
import type { QuizQuestion } from "@/content/courses/types";
import { cn } from "@/lib/utils";

interface Props {
  slug: string;
  quiz: QuizQuestion[];
}

export function CourseQuiz({ slug, quiz }: Props) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = quiz.every((_, i) => answers[i] !== undefined);
  const score = quiz.reduce(
    (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
    0,
  );

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
  }

  return (
    <section className="max-w-2xl mx-auto mt-20 pt-12 border-t-2 border-ink">
      <p className="eyebrow mb-3">Quiz</p>
      <h2 className="font-display text-2xl md:text-3xl text-ink mb-2">
        Vérifie ta compréhension
      </h2>
      <p className="text-sm text-ink-3 mb-10">
        {quiz.length} questions · réponds sans pression, le score reste sur ton appareil.
      </p>

      <ol className="space-y-10">
        {quiz.map((q, i) => {
          const userAnswer = answers[i];
          return (
            <li key={i}>
              <p className="font-display text-base md:text-lg text-ink mb-4 leading-snug">
                <span className="text-gold tabular-nums mr-2">
                  {String(i + 1).padStart(2, "0")}.
                </span>
                {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, j) => {
                  const isSelected = userAnswer === j;
                  const isCorrect = j === q.correctIndex;
                  const showResult = submitted;
                  return (
                    <button
                      key={j}
                      type="button"
                      onClick={() => !submitted && setAnswers({ ...answers, [i]: j })}
                      disabled={submitted}
                      className={cn(
                        "w-full text-left px-4 py-3 border text-sm md:text-base transition-colors",
                        !showResult && isSelected && "border-ink bg-ink/5",
                        !showResult && !isSelected && "border-ink/15 hover:border-ink/40",
                        showResult && isCorrect && "border-moss bg-moss/8 text-ink",
                        showResult && !isCorrect && isSelected && "border-red-400 bg-red-50 text-ink",
                        showResult && !isCorrect && !isSelected && "border-ink/10 text-ink-3",
                        submitted && "cursor-default",
                      )}
                    >
                      <span className="font-mono text-[10px] text-ink-3 mr-3">
                        {String.fromCharCode(65 + j)}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p className="mt-3 text-sm text-ink-2 italic leading-relaxed pl-1">
                  {q.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-12 pt-8 border-t border-ink/10 flex flex-col sm:flex-row items-center gap-4 justify-between">
        {submitted ? (
          <>
            <div>
              <p className="font-display text-3xl text-ink tabular-nums">
                {score} <span className="text-ink-3">/ {quiz.length}</span>
              </p>
              <p className="text-sm text-ink-3 mt-1">
                {score === quiz.length
                  ? "Sans faute — solide."
                  : score >= quiz.length - 1
                    ? "Très bon score."
                    : "Relis les passages clés et recommence."}
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-xs font-semibold uppercase tracking-[0.18em] text-ink hover:text-gold transition-colors"
            >
              Recommencer →
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={!allAnswered}
            onClick={submit}
            className={cn(
              "px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] transition-colors",
              allAnswered ? "bg-ink text-paper hover:bg-ink-2" : "bg-ink/20 text-ink-3 cursor-not-allowed",
            )}
          >
            Valider mes réponses
          </button>
        )}
      </div>
    </section>
  );
}
