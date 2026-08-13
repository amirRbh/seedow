import { Link } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFinancialGoals } from "@/hooks/useFinancialGoals";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Objectifs rapatriés dans le portefeuille (analyse UX §04/§06) : un objectif est
 * adossé à un portefeuille, il vit donc ici plutôt que dans une route orpheline.
 * Teaser compact — état vide incitatif, ou compteur + prochain objectif — avec un
 * lien vers la page complète (édition/simulation). Aucune donnée inventée.
 */
export function ObjectivesTeaser() {
  const { t } = useTranslation();
  const { goals, loading } = useFinancialGoals();

  if (loading) {
    return <Skeleton className="h-20 w-full rounded-2xl" />;
  }

  const next = goals[0];

  return (
    <div className="rounded-2xl border border-paper-3 bg-paper-2 p-4">
      <div className="flex items-center gap-2 text-ink-3">
        <Target className="h-4 w-4" strokeWidth={1.8} aria-hidden />
        <span className="text-tag uppercase tracking-[0.14em] font-mono">
          {t("portfolio.goals.title")}
        </span>
      </div>

      {goals.length === 0 ? (
        <>
          <p className="mt-2 text-body-sm text-ink-2 leading-relaxed">
            {t("portfolio.goals.empty")}
          </p>
          <Link
            to="/objectifs"
            className="mt-3 inline-flex items-center gap-1 text-caption font-semibold text-ink border-b border-dotted border-ink-3/60 hover:text-ink-2 transition-colors"
          >
            {t("portfolio.goals.empty_cta")} <span aria-hidden>→</span>
          </Link>
        </>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-body-sm font-semibold text-ink">
              {t("portfolio.goals.count", { count: goals.length })}
            </p>
            {next && (
              <p className="mt-0.5 truncate text-caption text-ink-3">
                {t("portfolio.goals.next", { name: next.name })}
              </p>
            )}
          </div>
          <Link
            to="/objectifs"
            className="flex-shrink-0 text-caption font-semibold text-ink border-b border-dotted border-ink-3/60 hover:text-ink-2 transition-colors"
          >
            {t("portfolio.goals.see_all")}
          </Link>
        </div>
      )}
    </div>
  );
}
