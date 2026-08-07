import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  /** D'où vient le chiffre, en une phrase (i18n déjà résolu). Obligatoire. */
  basis: string;
  /** Source de la donnée (ex. « MSCI ACWI »). */
  source?: string;
  /** Date « as of » de la donnée. */
  asOf?: string;
  /** Part du portefeuille réellement couverte par une donnée mesurée (0..100). */
  coveragePct?: number;
  /** Lien optionnel « voir le détail / les sources » — le parent passe un <Link>. */
  link?: ReactNode;
  className?: string;
}

/**
 * Provenance d'un chiffre d'impact — la traçabilité sur le support principal,
 * jamais reléguée en petit caractère (mission Seedow §1.2). Affiche la base de
 * calcul, la source datée et la couverture réelle, avec un tooltip qui explique
 * « couverture » en langage débutant (le reste n'est pas encore mesuré, pas
 * estimé). Réutilisable partout où un chiffre d'impact est montré.
 */
export function DataProvenance({ basis, source, asOf, coveragePct, link, className = "" }: Props) {
  const { t } = useTranslation();
  const hasCoverage = typeof coveragePct === "number" && Number.isFinite(coveragePct);

  return (
    <p
      className={`font-mono text-[10px] leading-relaxed uppercase tracking-[0.12em] text-ink-3 ${className}`}
    >
      <span className="normal-case tracking-normal">{basis}</span>
      {source && (
        <>
          {" · "}
          {t("impact_signal.source_prefix")} {source}
          {asOf ? ` · ${asOf}` : ""}
        </>
      )}
      {hasCoverage && (
        <>
          {" · "}
          <span className="inline-flex items-center gap-1 align-middle normal-case tracking-normal">
            {t("impact_xp.coverage", { pct: Math.round(coveragePct as number) })}
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("data_provenance.coverage_label")}
                    className="inline-flex items-center justify-center text-ink-3 hover:text-ink transition-colors"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="start"
                  className="max-w-xs bg-ink text-paper text-xs leading-relaxed px-3 py-2 normal-case tracking-normal"
                >
                  {t("data_provenance.coverage_tooltip")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
        </>
      )}
      {link && (
        <>
          {" · "}
          <span className="normal-case tracking-normal">{link}</span>
        </>
      )}
    </p>
  );
}
