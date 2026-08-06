import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useLang } from "@/hooks/useLang";
import { EASE_REVEAL } from "@/lib/motion";
import type { FeedDispatch, DispatchTone } from "@/lib/impact/leFil";

/**
 * LeFil — rend la liste de dépêches d'impact produite par lib/impact/leFil.
 *
 * Chaque dépêche affiche son titre, son corps, sa SOURCE et sa DATE (contrat de
 * transparence, CLAUDE.md §1.2). Le ton est doublé d'une icône + d'un libellé,
 * jamais porté par la seule couleur (§4). Aucun texte en dur : tout passe par i18n.
 */
interface LeFilProps {
  dispatches: FeedDispatch[];
}

const TONE_STYLE: Record<DispatchTone, { chip: string; icon: string }> = {
  growth: { chip: "bg-mint/10 text-mint-ink", icon: "↑" },
  identity: { chip: "bg-paper-2 text-ink", icon: "●" },
  neutral: { chip: "bg-paper-2 text-ink-2", icon: "○" },
  caution: { chip: "bg-solar-tint text-solar-ink", icon: "△" },
};

export function LeFil({ dispatches }: LeFilProps) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const locale = lang === "en" ? "en-US" : "fr-FR";

  const fmtDate = useMemo(
    () => (iso: string) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
    },
    [locale],
  );

  // Traduit un paramètre `cause` en libellé lisible avant interpolation.
  const resolveParams = (params?: Record<string, string | number>) => {
    if (!params) return undefined;
    if (typeof params.cause === "string") {
      return { ...params, cause: t(`impact_living.cause.${params.cause}`) };
    }
    return params;
  };

  return (
    <ol className="space-y-3" aria-label={t("impact_living.fil.title")}>
      {dispatches.map((d, i) => {
        const tone = TONE_STYLE[d.tone];
        const toneLabel = t(`impact_living.fil.tone.${d.tone}`);
        return (
          <motion.li
            key={d.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: EASE_REVEAL }}
            className="rounded-2xl border border-paper-3 bg-paper p-4 md:p-5"
          >
            <div className="flex items-start gap-3.5">
              <span
                aria-hidden
                className={`mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl text-lg ${tone.chip}`}
              >
                {tone.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                  <span className="sr-only">{toneLabel} · </span>
                  {d.anchored
                    ? t("impact_living.fil.since", { date: fmtDate(d.dateISO) })
                    : fmtDate(d.dateISO)}
                </p>
                <p className="mt-1 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink">
                  {t(d.headlineKey, resolveParams(d.headlineParams))}
                </p>
                {d.bodyKey && (
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                    {t(d.bodyKey, resolveParams(d.bodyParams))}
                  </p>
                )}
                <p className="mt-2.5 font-mono text-[11px] tracking-[0.02em] text-ink-3">
                  {t("impact_living.fil.source_prefix")} {d.source}
                  {d.sourceAsOf != null ? ` · ${d.sourceAsOf}` : ""}
                </p>
              </div>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
