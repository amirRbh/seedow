// TODO: i18n — les pages /cours sont en français en dur (contenu FR), on
// s'aligne sur l'existant plutôt que d'introduire i18n sur cette seule vue.

interface TrackProgress {
  label: string;
  done: number;
  total: number;
}

/**
 * Certificat de progression des cours — délivré à un apprenant connecté (le
 * quiz et le certificat sont réservés aux comptes ; la lecture reste libre).
 * Reflète des chiffres réels (quiz validés), jamais gonflés. Imprimable /
 * enregistrable en PDF via l'impression navigateur.
 */
export function CourseCertificate({
  name,
  completed,
  total,
  tracks,
}: {
  name: string;
  completed: number;
  total: number;
  tracks: TrackProgress[];
}) {
  const allDone = completed >= total && total > 0;
  const dateStr = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div
        id="course-certificate"
        className="relative overflow-hidden rounded-[18px] border border-ink/15 bg-paper-2 p-8 md:p-12"
      >
        <div className="flex items-center justify-between">
          <span className="font-display font-bold text-lg tracking-tight uppercase text-ink">
            seedow<span className="text-mint-ink">.</span>
          </span>
          <span className="font-mono text-caption uppercase tracking-[0.18em] text-ink-3">
            Certificat de progression
          </span>
        </div>

        <div className="mt-10 md:mt-14">
          <p className="text-caption uppercase tracking-[0.18em] text-ink-3 font-medium">
            Délivré à
          </p>
          <p className="font-value text-2xl md:text-3xl text-ink mt-1">{name}</p>
        </div>

        <div className="mt-8 flex items-end gap-3">
          <span className="font-mono font-bold text-5xl md:text-6xl text-ink tabular-nums leading-none">
            {completed}
          </span>
          <span className="font-mono text-xl text-ink-3 tabular-nums mb-1">/ {total}</span>
          <span className="text-body-sm text-ink-2 mb-1.5">cours validés</span>
        </div>

        <div className="mt-8 flex flex-col divide-y divide-paper-3 border-t border-b border-paper-3">
          {tracks.map((tr) => (
            <div key={tr.label} className="flex items-center justify-between py-3">
              <span className="text-body-sm text-ink-2">{tr.label}</span>
              <span className="font-mono text-body-sm text-ink tabular-nums">
                {tr.done} / {tr.total}
              </span>
            </div>
          ))}
        </div>

        {allDone && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-mint/12 px-3 py-1.5">
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5 text-mint-ink"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span className="text-tag font-semibold uppercase tracking-[0.16em] text-mint-ink">
              Parcours complété
            </span>
          </div>
        )}

        <div className="mt-10 flex items-end justify-between gap-4">
          <p className="text-caption text-ink-3 max-w-[280px] leading-snug">
            Progression pédagogique sur les cours Seedow. Informative, sans valeur de diplôme.
          </p>
          <p className="font-mono text-caption text-ink-3 tabular-nums whitespace-nowrap">
            {dateStr}
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 text-tag font-semibold uppercase tracking-[0.18em] text-ink-3 hover:text-ink transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9V2h12v7" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <path d="M6 14h12v8H6z" />
          </svg>
          Imprimer / PDF
        </button>
      </div>
    </div>
  );
}
