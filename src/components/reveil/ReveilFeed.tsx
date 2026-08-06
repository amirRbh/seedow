import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { EASE_REVEAL } from "@/lib/motion";
import type { ReveilDispatch, ReveilTone } from "@/lib/reveil/reveil";

const TONE_STYLE: Record<ReveilTone, { chip: string; icon: string }> = {
  action: { chip: "bg-sky-tint text-ice-ink", icon: "→" },
  caution: { chip: "bg-solar-tint text-solar", icon: "△" },
  bright: { chip: "bg-mint/10 text-mint-ink", icon: "↑" },
};

interface Props {
  dispatches: ReveilDispatch[];
  /** Ouvre le détail d'un actif (dépêches greenwashing / bonne nouvelle). */
  onAssetClick: (assetId: string) => void;
}

/**
 * Le Réveil — rend le fil de conscience produit par lib/reveil. Chaque dépêche
 * affiche son ton (icône + libellé, pas la couleur seule §4), son texte, sa
 * SOURCE datée du jour (§1.2), et son action (voter / voir pourquoi).
 */
export function ReveilFeed({ dispatches, onAssetClick }: Props) {
  const { t } = useTranslation();

  return (
    <ol className="space-y-3" aria-label={t("reveil.title")}>
      {dispatches.map((d, i) => {
        const tone = TONE_STYLE[d.tone];
        const inner = (
          <div className="flex items-start gap-3.5">
            <span
              aria-hidden
              className={`mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl text-lg ${tone.chip}`}
            >
              {tone.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-tag uppercase tracking-[0.14em] text-ink-3">
                {t(`reveil.tone.${d.tone}`)} · {d.source} · {t("reveil.source_today")}
              </p>
              <p className="mt-1.5 font-value text-body-lg leading-snug text-ink">
                {t(d.headlineKey, d.headlineParams)}
              </p>
              {d.bodyKey && (
                <p className="mt-1 text-body-sm leading-relaxed text-ink-2">
                  {t(d.bodyKey, d.bodyParams)}
                </p>
              )}
              <span className="mt-2.5 inline-flex items-center gap-1 font-mono text-tag uppercase tracking-[0.12em] text-ink">
                {d.action?.kind === "vote" ? t("reveil.cta_vote") : t("reveil.cta_why")}
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </span>
            </div>
          </div>
        );

        return (
          <motion.li
            key={d.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: EASE_REVEAL }}
          >
            {d.action?.kind === "vote" ? (
              <Link
                to="/vote/$resolutionId"
                params={{ resolutionId: d.action.resolutionId }}
                className="group block rounded-2xl border border-paper-3 bg-paper p-4 transition-transform duration-300 hover:scale-[1.01] hover:border-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight-1 md:p-5"
              >
                {inner}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => d.action?.kind === "asset" && onAssetClick(d.action.assetId)}
                className="group block w-full rounded-2xl border border-paper-3 bg-paper p-4 text-left transition-transform duration-300 hover:scale-[1.01] hover:border-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight-1 md:p-5"
              >
                {inner}
              </button>
            )}
          </motion.li>
        );
      })}
    </ol>
  );
}
