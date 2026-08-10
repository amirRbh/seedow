import { useTranslation } from "react-i18next";
import { impactRating, type ImpactTone } from "@/lib/discover/impact";
import { cn } from "@/lib/utils";

const TONE: Record<ImpactTone, { dot: string; text: string }> = {
  mint: { dot: "bg-mint", text: "text-mint-ink" },
  ink: { dot: "bg-ink", text: "text-ink" },
  muted: { dot: "bg-ink-3", text: "text-ink-3" },
};

/**
 * Badge d'impact « lisible en une seconde » (principe Yuka) : une pastille de
 * couleur + un mot qualitatif + le score chiffré. Le mot et le chiffre portent
 * l'information même sans la couleur (DA §4 — jamais de sens par la couleur
 * seule). Réutilisé partout où un débutant croise un score d'impact pour la
 * première fois (liste Découvrir, aperçu d'onboarding).
 */
export function ImpactBadge({ score, className }: { score: number; className?: string }) {
  const { t } = useTranslation();
  const { level, tone } = impactRating(score);
  const c = TONE[tone];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={`${t("discover.row.impact")} ${score.toFixed(1)}/10`}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", c.dot)} aria-hidden="true" />
      <span className={cn("text-tag uppercase tracking-wider font-semibold", c.text)}>
        {t("discover.row.impact")} {t(`discover.impact_rating.${level}`)}
      </span>
      <span className="text-tag text-ink-3 font-semibold tabular-nums">
        {score.toFixed(1).replace(".", ",")}
      </span>
    </span>
  );
}
