import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Wordmark } from "@/components/brand/Wordmark";
import { Aurora } from "@/components/motion/Aurora";
import { useAuth } from "@/hooks/useAuth";

/**
 * Pied de page des pages publiques — DA V4.
 *
 * Une bande sombre aux coins hauts arrondis, qui ferme toutes les pages
 * publiques de la même façon : la signature de marque en grand, trois colonnes
 * de liens, et le rappel que Seedow est un outil de simulation — écrit dans le
 * corps du pied de page, pas relégué en mention minuscule (CLAUDE.md §1.2).
 */
export function SiteFooter() {
  const { t } = useTranslation();
  const { session } = useAuth();

  const columns: { title: string; links: { to: string; label: string }[] }[] = [
    {
      title: t("site.footer.col_product"),
      links: [
        { to: "/demo", label: t("site.nav_demo") },
        { to: "/observatoire", label: t("landing.footer.observatory") },
        { to: "/comparer", label: t("site.nav_compare") },
        { to: "/tarifs", label: t("landing.footer.pricing") },
        { to: "/aide", label: t("landing.footer.help") },
      ],
    },
    {
      title: t("site.footer.col_learn"),
      links: [
        { to: "/cours", label: t("landing.footer.courses") },
        { to: "/methodologie", label: t("landing.footer.methodology") },
        { to: "/donnees", label: t("site.nav_data") },
      ],
    },
    {
      title: t("site.footer.col_legal"),
      links: [
        { to: "/mentions-legales", label: t("landing.footer.legal") },
        { to: "/confidentialite", label: t("landing.footer.privacy") },
        { to: "/cgu", label: t("landing.footer.terms") },
      ],
    },
  ];

  const linkClass =
    "link-u text-body font-medium text-ink-2 outline-none transition-colors hover:text-ink focus-visible:text-ink";

  return (
    <footer className="on-deep relative mt-24 overflow-hidden rounded-t-[40px]">
      <Aurora />
      <div className="relative z-10 mx-auto max-w-[1160px] px-6 pt-16 pb-10 md:px-7 md:pt-24">
        <p className="display-lg max-w-[16ch] text-on-deep">
          {t("site.signature_1")}
          <br />
          <span className="text-gradient">{t("site.signature_2")}</span>
        </p>

        <div className="mt-14 grid gap-10 border-t border-paper-3 pt-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark size="lg" label={t("site.home_aria")} />
            <p className="mt-4 max-w-[34ch] text-body-sm leading-relaxed text-ink-3">
              {t("landing.badge_simulation")}
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              {session ? (
                <Link to="/le-fil" className={linkClass}>
                  {t("landing.footer.my_space")}
                </Link>
              ) : (
                <Link
                  to="/auth"
                  search={{ redirect: "/le-fil", mode: "login" }}
                  className={linkClass}
                >
                  {t("landing.footer.login")}
                </Link>
              )}
              <a href="mailto:hello@seedow.life" className={linkClass}>
                {t("landing.footer.contact")}
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="eyebrow">{col.title}</p>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className={linkClass}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-12 text-body-sm text-ink-3">{t("landing.footer.copyright")}</p>
      </div>
    </footer>
  );
}
