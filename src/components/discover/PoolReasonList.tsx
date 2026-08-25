import { useTranslation } from "react-i18next";
import type { PoolGroup, PoolReasons } from "@/lib/portfolio/poolReasons";

/**
 * Ce qui remplace « 87/100 ».
 *
 * Un score nu, trié par ordre décroissant, se lit comme un palmarès — et un
 * palmarès est une recommandation déguisée. Ce bloc affiche à la place ce que
 * le moteur savait déjà : quelles convictions le fonds porte, ce qui plaide
 * pour lui, et ce qu'on ignore encore.
 *
 * Deux règles de la DA s'appliquent :
 *
 *  · **Le groupe est un mot, jamais une couleur seule** (§4). « À examiner »
 *    n'est pas un mauvais fonds : c'est un fonds sur lequel on manque de
 *    données. Le libellé le dit ; la teinte ne fait que l'accompagner.
 *  · **Les réserves ne se masquent pas.** Elles sont plus discrètes que les
 *    raisons, jamais absentes : c'est la moitié de l'information.
 */

/** Teinte du groupe. `to_examine` reste neutre : ce n'est pas un défaut du fonds. */
const GROUP_TONE: Record<PoolGroup, string> = {
  carries_convictions: "text-mint-ink",
  partial_match: "text-ink-2",
  other_strengths: "text-ink-2",
  to_examine: "text-ink-3",
};

interface Props {
  reasons: PoolReasons;
  /** Masque le libellé de groupe quand il est déjà rendu par l'en-tête de section. */
  hideGroup?: boolean;
  className?: string;
}

export function PoolReasonList({ reasons, hideGroup = false, className = "" }: Props) {
  const { t } = useTranslation();
  const { group, reasons: pros, caveats } = reasons;

  return (
    <div className={className}>
      {!hideGroup && (
        <p className={`text-tag font-mono uppercase tracking-wider ${GROUP_TONE[group]}`}>
          {t(`pool_reasons.group.${group}`)}
        </p>
      )}

      {pros.length > 0 && (
        <ul className="mt-1 flex flex-col gap-0.5">
          {pros.map((r) => (
            <li key={r.code} className="flex items-start gap-1.5 text-caption text-ink-2">
              <span aria-hidden className="text-mint-ink leading-tight">
                ·
              </span>
              <span className="leading-snug">{t(r.code, r.vars)}</span>
            </li>
          ))}
        </ul>
      )}

      {caveats.length > 0 && (
        <ul className="mt-1 flex flex-col gap-0.5">
          {caveats.map((c) => (
            <li key={c.code} className="flex items-start gap-1.5 text-caption text-ink-3">
              <span aria-hidden className="leading-tight">
                ·
              </span>
              <span className="leading-snug">{t(c.code, c.vars)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
