import { useTranslation } from "react-i18next";
import { scoreBand, type ScoreBand } from "@/lib/esg/sustainability-classification";
import { cn } from "@/lib/utils";

/**
 * Badge de durabilité « lisible en une seconde » : une pastille, un mot, le
 * chiffre. Le mot et le chiffre portent l'information même sans la couleur
 * (DA §4 — jamais de sens par la couleur seule).
 *
 * ── Il affichait le mauvais nombre ─────────────────────────────────────────
 *
 * Il montrait le score ESG du fournisseur sur 10, avec son propre vocabulaire
 * (« limite / correct / solide / fort ») et ses propres seuils. Pendant ce
 * temps, la fiche publique du même fonds affichait le score Seedow sur 100 avec
 * sa bande à lui. Deux échelles, deux vocabulaires, deux verdicts possibles sur
 * un seul fonds : celui qui ouvrait les deux écrans avait raison de douter.
 *
 * Il porte désormais le score Seedow et la bande unique (`scoreBand`) — le même
 * nombre partout, du rayon X de la page d'accueil jusqu'à sa propre ligne de
 * portefeuille. Le score ESG fournisseur n'a pas disparu : il reste visible au
 * niveau de détail de la fiche, comme l'un des trois piliers du composite,
 * c'est-à-dire à l'endroit où il veut dire quelque chose.
 *
 * `score` peut être null : le fonds est alors « non noté », ce qui ne se dit pas
 * comme « mal noté » et ne s'écrit donc pas 0.
 */

const TONE: Record<ScoreBand, { dot: string; text: string }> = {
  strong: { dot: "bg-mint", text: "text-mint-ink" },
  partial: { dot: "bg-solar", text: "text-solar-ink" },
  weak: { dot: "bg-alert", text: "text-alert-ink" },
  unrated: { dot: "bg-paper-3", text: "text-ink-3" },
};

export function SustainabilityBadge({
  score,
  className,
}: {
  /** Score Seedow 0..100, ou null si aucun pilier n'est exploitable. */
  score: number | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const band = scoreBand(score);
  const c = TONE[band];

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={`${t("seedow_score.label")} ${score ?? "—"}/100`}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", c.dot)} aria-hidden="true" />
      <span className={cn("text-tag uppercase tracking-wider font-mono", c.text)}>
        {t(`seedow_score.band.${band}`)}
      </span>
      {score != null && (
        <span className="text-tag text-ink-3 font-semibold tabular-nums">{score}</span>
      )}
    </span>
  );
}
