import { useTranslation } from "react-i18next";
import { BLOCK_MAX, type StiResult } from "@/lib/esg/v2/sti";

/**
 * Le détail bloc par bloc — la réponse à « pourquoi ce chiffre ? ».
 *
 * Un bloc non évaluable n'affiche PAS zéro : il affiche « non vérifié », et ses
 * signaux manquants sont nommés un par un juste en dessous (spec §7). C'est la
 * différence que toute la v2 protège : « le fonds ne publie rien » et « Seedow
 * n'a pas pu vérifier » ne se disent pas de la même façon, et l'un des deux ne
 * doit rien coûter au fonds.
 */
export function StiBlocks({ sti }: { sti: StiResult }) {
  const { t } = useTranslation();
  return (
    <div>
      <ul>
        {sti.blocks.map((b) => (
          <li
            key={b.id}
            className="flex items-baseline justify-between gap-4 py-2.5 border-b border-paper-3"
          >
            <span className="text-body-sm text-ink">
              <span className="mono-meta mr-2">{b.id}</span>
              {t(`sti.block.${b.id}`)}
            </span>
            {b.evaluable ? (
              <span className="font-value text-body-sm tabular-nums text-ink shrink-0">
                {b.earned}
                <span className="text-ink-3"> / {BLOCK_MAX[b.id]}</span>
              </span>
            ) : (
              <span className="text-body-sm text-ink-3 shrink-0">{t("sti.block_unverified")}</span>
            )}
          </li>
        ))}
      </ul>

      {sti.unverifiedSignals.length > 0 && (
        <div className="mt-4">
          <p className="stamp">{t("sti.unverified_title")}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {sti.unverifiedSignals.map((s) => (
              <li key={s} className="chip chip--modelled">
                {t(`sti.signal.${s}`, { defaultValue: s })}
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-caption text-ink-3 leading-relaxed max-w-[62ch]">
            {t("sti.unverified_note")}
          </p>
        </div>
      )}

      <p className="mt-4 text-caption text-ink-3 leading-relaxed max-w-[62ch]">
        {t("sti.precision_not_severity")}
      </p>
    </div>
  );
}
