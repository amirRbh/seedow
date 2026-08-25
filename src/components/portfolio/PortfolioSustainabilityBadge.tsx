import { useTranslation } from "react-i18next";
import { impactScore } from "@/lib/portfolio/plain-language";
import { cn } from "@/lib/utils";

// Échelle portefeuille 0..100 (bandes modéré/solide/fort de `impactScore`),
// distincte de l'échelle Découvrir 0..10 — d'où un badge dédié. Même principe
// « lisible en une seconde » : pastille + mot + note, le sens jamais porté par
// la couleur seule (DA §4). Vocabulaire réutilisé de `portfolio_customizer`.
//
// Ce badge rend une moyenne pondérée de notes ESG. Il s'appelait
// « PortfolioImpactBadge » : le mot affirmait un effet sur le monde que la
// donnée ne porte pas.
const TONE: Record<string, { dot: string; text: string }> = {
  fort: { dot: "bg-mint", text: "text-mint-ink" },
  solide: { dot: "bg-mint", text: "text-mint-ink" },
  modere: { dot: "bg-ink-3", text: "text-ink-3" },
};

export function PortfolioSustainabilityBadge({
  esgScore,
  className,
}: {
  esgScore: number;
  className?: string;
}) {
  const { t } = useTranslation();
  const { level, score } = impactScore(esgScore);
  const c = TONE[level] ?? TONE.modere;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={`${t("discover.row.impact")} ${score}/100`}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", c.dot)} aria-hidden="true" />
      <span className={cn("text-tag uppercase tracking-wider font-mono", c.text)}>
        {t("discover.row.impact")} {t(`portfolio_customizer.impact_level.${level}`)}
      </span>
      <span className="text-tag text-ink-3 font-semibold tabular-nums">{score}</span>
    </span>
  );
}
