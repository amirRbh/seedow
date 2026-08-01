import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useReveil } from "@/hooks/useReveil";

/**
 * Teaser « Le Réveil » sur le dashboard — la surface de retour quotidien.
 * Montre le nombre de choses à voir + la première dépêche, lien vers /reveil.
 * Ne rend rien tant qu'il n'y a rien à dire (jamais d'écran mort).
 */
export function ReveilTeaserCard() {
  const { t } = useTranslation();
  const { dispatches, loading } = useReveil();

  if (loading || dispatches.length === 0) return null;
  const top = dispatches[0];

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="px-5 pt-8"
    >
      <Link
        to="/reveil"
        className="group block rounded-2xl border border-paper-3 bg-paper p-5 transition-transform duration-300 hover:scale-[1.01] hover:border-ink-3"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="apple-live" />
            <span className="font-mono text-tag uppercase tracking-[0.14em] text-mint">
              {t("reveil.eyebrow")}
            </span>
          </span>
          <span className="font-mono text-tag uppercase tracking-[0.08em] text-ink-3">
            {t("reveil.teaser.count", { n: dispatches.length })}
          </span>
        </div>
        <p className="mt-3 font-value text-lg leading-snug text-ink">
          {t(top.headlineKey, top.headlineParams)}
        </p>
        <span className="mt-3 inline-flex items-center gap-1 font-mono text-tag uppercase tracking-[0.12em] text-ink">
          {t("reveil.teaser.cta")}
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </Link>
    </motion.section>
  );
}
