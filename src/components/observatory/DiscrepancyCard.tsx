import { useTranslation } from "react-i18next";
import { formatDiscrepancy, type Discrepancy } from "@/lib/esg/v2/discrepancies";

/**
 * Un constat d'écart, dans sa forme fixe en trois lignes (spec §4.4) :
 *
 *   Ce que le fonds déclare : « [citation] » — [document], [date]
 *   Ce que le document montre : [fait] — [document], [date]
 *   Ce que ce constat ne dit pas : [limite explicite]
 *
 * La troisième ligne est obligatoire et elle n'est jamais repliée. Sans elle, un
 * constat E1 (« Article 8 sans exclusion publiée ») se lit comme « ce fonds
 * détient des fossiles » — ce qu'il ne dit pas. Un observatoire qui laisse le
 * lecteur faire ce saut tout seul a écrit l'accusation sans la signer.
 *
 * Le droit de réponse (§8) s'affiche à côté, INTÉGRALEMENT et sans commentaire
 * de Seedow. Un constat contesté reste publié, avec la mention.
 */
export function DiscrepancyCard({ discrepancy }: { discrepancy: Discrepancy }) {
  const { t } = useTranslation();
  const lines = formatDiscrepancy(discrepancy);
  const disputed = discrepancy.state === "conteste";

  return (
    <article className="paper-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">{discrepancy.code}</span>
        <span className="text-body-sm font-semibold text-ink">
          {t(`constats.type.${discrepancy.code}`)}
        </span>
        {disputed && <span className="chip chip--disputed">{t("constats.disputed")}</span>}
      </div>

      <dl className="mt-4 flex flex-col gap-3">
        <div>
          <dt className="stamp">{t("constats.line_declares")}</dt>
          <dd className="mt-1 text-body-sm leading-snug text-ink">{lines.declares}</dd>
        </div>
        <div>
          <dt className="stamp">{t("constats.line_shows")}</dt>
          <dd className="mt-1 text-body-sm leading-snug text-ink">{lines.shows}</dd>
        </div>
        <div>
          <dt className="stamp">{t("constats.line_does_not_say")}</dt>
          <dd className="mt-1 text-body-sm leading-snug text-ink-2">{lines.doesNotSay}</dd>
        </div>
      </dl>

      {discrepancy.notified_at && (
        <p className="mono-meta mt-4">
          {t("constats.notified_at", { date: discrepancy.notified_at })}
        </p>
      )}

      {discrepancy.issuer_response && (
        <div className="mt-4 pt-4 border-t border-paper-3">
          <p className="stamp">{t("constats.issuer_response")}</p>
          {/* Publiée telle quelle : pas de résumé, pas de mise en perspective. */}
          <blockquote className="mt-1.5 text-body-sm leading-relaxed text-ink whitespace-pre-line">
            {discrepancy.issuer_response.text}
          </blockquote>
          {discrepancy.issuer_response.received_at && (
            <p className="mono-meta mt-2">
              {t("constats.response_received", { date: discrepancy.issuer_response.received_at })}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
