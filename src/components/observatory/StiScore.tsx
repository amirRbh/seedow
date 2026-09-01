import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { STI_VERSION, type StiResult } from "@/lib/esg/v2/sti";

/**
 * L'affichage du STI — et les interdictions qui vont avec (spec §7).
 *
 *   · aucun score sans son taux de couverture au MÊME niveau visuel ;
 *   · aucun libellé qualitatif sans le chiffre ;
 *   · un fonds non notable n'affiche pas de chiffre du tout — « Documentation
 *     insuffisante pour être noté », et rien d'autre.
 *
 * Ces règles sont tenues ici, dans le composant, pas dans une consigne de revue.
 * Un score et sa couverture séparés par une hiérarchie typographique, c'est la
 * couverture qui disparaît — et le chiffre redevient l'affirmation nue que la v2
 * supprime.
 *
 * Aucun libellé ne contient « aligné », « durable », « responsable » ou « bon » :
 * le vocabulaire de la v1 affirmait un verdict de durabilité sous couvert de
 * neutralité.
 */
export function StiScore({
  sti,
  size = "md",
  className,
}: {
  sti: StiResult;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { t } = useTranslation();

  const numberSize =
    size === "lg" ? "text-[clamp(38px,6vw,56px)]" : size === "md" ? "text-[28px]" : "text-[22px]";

  if (!sti.publishable) {
    return (
      <div className={className}>
        <p className="stamp">{t("sti.title")}</p>
        <p
          className={cn(
            "font-display leading-tight text-ink-2 mt-2 max-w-[24ch]",
            size === "sm" ? "text-body-sm" : "text-body",
          )}
        >
          {t("sti.not_ratable")}
        </p>
        <p className="mono-meta mt-1.5">
          {t("sti.blocks_evaluated", { evaluated: sti.blocksEvaluated, total: sti.blocksTotal })}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="stamp">{t("sti.title")}</p>
      <p className={cn("font-value leading-none tabular-nums text-ink mt-2", numberSize)}>
        {sti.score}
        <span className="text-ink-3 text-caption"> /100</span>
      </p>
      {/* Libellé ET couverture, sur la même ligne de lecture que le chiffre. */}
      <p className="text-body-sm text-ink-2 mt-2 leading-snug">{t(`sti.label.${sti.label}`)}</p>
      <p className="mono-meta mt-1">
        {t("sti.blocks_evaluated", { evaluated: sti.blocksEvaluated, total: sti.blocksTotal })}
        {" · "}
        {t("sti.version", { version: STI_VERSION })}
      </p>
    </div>
  );
}
