import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { blocPosition, blocShare, type BlocTally, type VoteChoice } from "@/lib/vote/bloc";

interface Props {
  bloc: BlocTally;
  /** Le choix de l'utilisateur, si déjà voté. Met en avant sa position. */
  myChoice: VoteChoice | null;
  onShare?: () => void;
}

/**
 * Le Bloc — décompte HONNÊTE des votes Seedow sur une résolution. Aucun chiffre
 * fabriqué : si personne n'a voté, on le dit. Registre sombre (ink-section),
 * mint réservé au collectif (jamais à « la bonne réponse » — neutralité §5.1).
 */
export function BlocMeter({ bloc, myChoice, onShare }: Props) {
  const { t } = useTranslation();
  const { lang } = useLang();

  const nf = useMemo(() => new Intl.NumberFormat(lang === "en" ? "en-US" : "fr-FR"), [lang]);

  const forShare = blocShare(bloc, "for");
  const againstShare = blocShare(bloc, "against");
  const position = myChoice ? blocPosition(bloc, myChoice) : null;

  const choiceLabel = (c: VoteChoice) => t(`vote.choice_${c}`);

  return (
    <section
      className="ink-section paper-grain ink-grain overflow-hidden rounded-2xl p-6 md:p-8"
      aria-label={t("vote.bloc.aria")}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="apple-live" />
        <span className="text-tag font-mono uppercase tracking-[0.14em] text-mint">
          {t("vote.bloc.live")}
        </span>
      </div>

      {bloc.total === 0 ? (
        <div className="mt-5">
          <p className="font-value text-2xl leading-tight text-paper">
            {t("vote.bloc.empty_title")}
          </p>
          <p className="mt-2 text-body-sm text-paper/70">{t("vote.bloc.empty_desc")}</p>
        </div>
      ) : (
        <>
          <div className="mt-5">
            <div className="font-mono text-[clamp(2.75rem,10vw,3.75rem)] font-bold leading-none tracking-tight text-paper tabular-nums">
              {nf.format(bloc.total)}
            </div>
            <p className="mt-2 text-body-sm text-paper/75">
              {position
                ? t("vote.bloc.you_line", {
                    n: position.sameChoice,
                    choice: choiceLabel(position.choice),
                  })
                : t("vote.bloc.total_line", { n: bloc.total })}
            </p>
          </div>

          {/* Répartition honnête pour / contre (l'abstention n'entre pas dans la barre) */}
          <div className="mt-6">
            <div
              className="flex h-3 w-full overflow-hidden rounded-full bg-paper/15"
              role="img"
              aria-label={t("vote.bloc.split_aria", {
                against: nf.format(bloc.against),
                forCount: nf.format(bloc.for),
              })}
            >
              <div
                className="h-full bg-mint transition-[width] duration-700"
                style={{ width: `${Math.round(againstShare * 100)}%` }}
              />
              <div
                className="h-full bg-paper/45 transition-[width] duration-700"
                style={{ width: `${Math.round(forShare * 100)}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between font-mono text-tag uppercase tracking-[0.08em] text-paper/70">
              <span>
                {choiceLabel("against")} · {nf.format(bloc.against)}
              </span>
              <span>
                {choiceLabel("for")} · {nf.format(bloc.for)}
              </span>
            </div>
          </div>
        </>
      )}

      {onShare && (
        <button
          type="button"
          onClick={onShare}
          className="mt-7 inline-flex w-full items-center justify-center rounded-full bg-mint px-6 py-3.5 text-body font-semibold text-paper transition-transform duration-300 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
        >
          {t("vote.bloc.reinforce")}
        </button>
      )}
    </section>
  );
}
