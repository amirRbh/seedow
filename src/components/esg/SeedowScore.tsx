import { useTranslation } from "react-i18next";
import {
  scoreBand,
  type ScoreBand,
  type ScorePillar,
} from "@/lib/esg/sustainability-classification";
import { cn } from "@/lib/utils";

/**
 * Le Score Seedow, affiché de la même façon partout.
 *
 * Avant : la landing montrait le score ESG du fournisseur ×10 sous des libellés
 * d'alignement, l'explorateur le montrait sur 10, et seule la fiche publique
 * montrait le vrai composite Seedow. Trois chiffres, un seul fonds. Ce
 * composant est la réponse : un seul rendu, une seule bande, un seul
 * vocabulaire — et l'aveu explicite quand le fonds n'est pas notable.
 *
 * Lecture à trois niveaux (le principe « simple par défaut, profond à la
 * demande ») :
 *   1. le nombre et la bande écrite — se lit en une seconde ;
 *   2. `<ScorePillars>` — d'où vient ce nombre, pilier par pilier ;
 *   3. la méthodologie, atteignable depuis le bloc appelant.
 *
 * Le score n'est jamais présenté comme une mesure d'impact : `note` porte la
 * réserve, à l'écran, pas en petits caractères (CLAUDE.md §1.2).
 */

/** Chaque bande porte son libellé écrit — la couleur ne suffit jamais (§4). */
const BAND_TONE: Record<ScoreBand, string> = {
  strong: "text-mint-ink",
  partial: "text-solar-ink",
  weak: "text-alert-ink",
  unrated: "text-ink-3",
};

const BAND_BAR: Record<ScoreBand, string> = {
  strong: "bg-mint",
  partial: "bg-solar",
  weak: "bg-alert",
  unrated: "bg-paper-3",
};

export function SeedowScore({
  score,
  size = "md",
  className,
}: {
  score: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { t } = useTranslation();
  const band = scoreBand(score);

  const figureSize = {
    sm: "text-[28px]",
    md: "text-[clamp(38px,6vw,52px)]",
    lg: "text-[clamp(48px,9vw,72px)]",
  }[size];

  return (
    <div className={className}>
      <p className="stamp">{t("seedow_score.label")}</p>

      {score == null ? (
        <>
          <p className={cn("font-value leading-none mt-2 text-ink-3", figureSize)}>—</p>
          <p className="mt-2.5 text-body-sm font-semibold text-ink-2">
            {t("seedow_score.band.unrated")}
          </p>
          <p className="mt-1 text-body-sm text-ink-3 leading-relaxed max-w-[40ch]">
            {t("seedow_score.unrated_hint")}
          </p>
        </>
      ) : (
        <>
          <p
            className={cn("font-value leading-none mt-2 tabular-nums", figureSize, BAND_TONE[band])}
          >
            {score}
            <span className="text-ink-3 text-[0.36em] font-normal"> / 100</span>
          </p>
          <ScoreScale score={score} band={band} />
          <p className={cn("mt-2.5 text-body-sm font-semibold", BAND_TONE[band])}>
            {t(`seedow_score.band.${band}`)}
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Réglure graduée plutôt qu'anneau coloré : un score sur 100 est une mesure,
 * elle se lit sur une échelle avec ses graduations. Les deux bornes de bande
 * (55 et 70) sont marquées — c'est ce qui rend le nombre comparable sans avoir
 * à retenir la grille.
 */
function ScoreScale({ score, band }: { score: number; band: ScoreBand }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="relative mt-3 h-1.5 w-full max-w-[220px] rounded-full bg-paper-2" aria-hidden>
      <span
        className={cn("absolute inset-y-0 left-0 rounded-full", BAND_BAR[band])}
        style={{ width: `${pct}%` }}
      />
      {[55, 70].map((tick) => (
        <span
          key={tick}
          className="absolute -top-0.5 h-2.5 w-px bg-paper-3"
          style={{ left: `${tick}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Niveau 2 — « pourquoi ce score ? ». Les piliers viennent du calcul lui-même
 * (`scoreBreakdown`), pas d'une reconstruction : ce sont ESG, climat et
 * exclusions, jamais E/S/G, parce que c'est ce qui entre réellement dans le
 * composite. Un pilier absent est nommé absent — il n'est pas remplacé par une
 * valeur neutre, il est écarté et les poids sont renormalisés.
 */
export function ScorePillars({
  pillars,
  className,
}: {
  pillars: ScorePillar[];
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className={className}>
      <ul className="flex flex-col gap-3">
        {pillars.map((p) => {
          const band = scoreBand(p.value);
          return (
            <li key={p.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-body-sm text-ink">{t(`seedow_score.pillar.${p.id}`)}</span>
                {p.value == null ? (
                  <span className="text-body-sm text-ink-3">
                    {t("seedow_score.pillar_missing")}
                  </span>
                ) : (
                  <span className="font-value text-body-sm tabular-nums text-ink">
                    {p.value}
                    <span className="text-ink-3"> / 100</span>
                  </span>
                )}
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-paper-2 overflow-hidden">
                {p.value != null && (
                  <span
                    className={cn("block h-full rounded-full", BAND_BAR[band])}
                    style={{ width: `${Math.max(0, Math.min(100, p.value))}%` }}
                  />
                )}
              </div>
              <p className="mt-1 text-caption text-ink-3">
                {p.value == null
                  ? t("seedow_score.pillar_excluded")
                  : t("seedow_score.pillar_weight", {
                      pct: Math.round(p.effectiveWeight * 100),
                    })}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
