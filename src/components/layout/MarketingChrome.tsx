import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

/**
 * Chrome partagé des pages publiques hors app (tarifs, aide) : une barre de
 * navigation légère et un footer, dans le scope `.apple-landing` pour rester
 * cohérent avec la landing. Extrait ici pour ne pas dupliquer le markup entre
 * les pages marketing.
 */
export function MarketingNav() {
  const { t } = useTranslation();
  return (
    <nav
      className="sticky top-0 z-50 backdrop-blur-xl"
      style={{ background: "rgba(255,255,255,0.72)", borderBottom: "1px solid var(--paper-3)" }}
    >
      <div className="max-w-[1024px] mx-auto px-6 h-12 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[22px] font-bold text-[color:var(--apple-text)]"
          style={{ letterSpacing: "-0.02em" }}
        >
          SEEDOW
          <span
            aria-hidden
            className="inline-block w-[6px] h-[6px] rounded-full"
            style={{ background: "var(--mint)" }}
          />
        </Link>
        <Link
          to="/onboarding"
          className="apple-btn-primary"
          style={{ padding: "6px 14px", fontSize: 13 }}
        >
          {t("landing.nav.simulate_cta")}
        </Link>
      </div>
    </nav>
  );
}

export function MarketingFooter() {
  const { t } = useTranslation();
  return (
    <footer
      className="px-6 py-10 text-label text-[color:var(--apple-text-2)]"
      style={{ background: "var(--apple-surface)", borderTop: "1px solid var(--paper-3)" }}
    >
      <div className="max-w-[1024px] mx-auto flex flex-wrap gap-x-6 gap-y-2 justify-center">
        <Link to="/" className="hover:text-[color:var(--apple-text)]">
          {t("landing.nav.my_space")}
        </Link>
        <Link to="/tarifs" className="hover:text-[color:var(--apple-text)]">
          {t("landing.footer.pricing")}
        </Link>
        <Link to="/aide" className="hover:text-[color:var(--apple-text)]">
          {t("landing.footer.help")}
        </Link>
        <Link to="/methodologie" className="hover:text-[color:var(--apple-text)]">
          {t("landing.footer.methodology")}
        </Link>
        <Link to="/confidentialite" className="hover:text-[color:var(--apple-text)]">
          {t("landing.footer.privacy")}
        </Link>
        <Link to="/cgu" className="hover:text-[color:var(--apple-text)]">
          {t("landing.footer.terms")}
        </Link>
      </div>
    </footer>
  );
}
