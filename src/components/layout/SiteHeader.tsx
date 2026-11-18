import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Wordmark } from "@/components/brand/Wordmark";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { EASE_SIGNATURE } from "@/lib/motion";
import { trackAppEvent } from "@/lib/analytics/appEvents";
import { cn } from "@/lib/utils";

type NavLink = { to: string; label: string };

/**
 * En-tête des pages publiques — DA V4.
 *
 * UN seul en-tête pour toutes les pages qui se lisent sans compte. Avant, la
 * landing, les cours, les tarifs, l'aide, l'Observatoire et les pages légales
 * dessinaient chacun le leur (cinq marques, cinq barres) : on changeait de
 * site à chaque clic.
 *
 * C'est une pilule de verre flottante : elle se resserre dès qu'on défile, une
 * pastille suit le lien survolé, et le menu mobile s'ouvre en cascade. Elle
 * flotte AU-DESSUS du contenu (position fixe) — `SiteHeaderSpacer` réserve sa
 * place en haut des pages qui ne commencent pas par une scène pleine largeur.
 */
export function SiteHeader() {
  const { t } = useTranslation();
  const { session, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const isAuthed = !loading && !!session;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Le menu mobile se referme à chaque navigation, et libère le défilement.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const links: NavLink[] = [
    { to: "/demo", label: t("site.nav_demo") },
    { to: "/observatoire", label: t("landing.footer.observatory") },
    { to: "/comparer", label: t("site.nav_compare") },
    { to: "/cours", label: t("landing.nav.courses") },
    { to: "/methodologie", label: t("landing.nav.methodology") },
  ];
  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  const onCta = (destination: "preview" | "login") => () => {
    void trackAppEvent("landing_cta_clicked", { placement: "nav", destination });
  };

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 safe-area-top">
        <div
          className={cn(
            "glass pointer-events-auto mx-auto flex items-center justify-between rounded-full pl-5 pr-2",
            "transition-[max-width,height] duration-500 ease-brand motion-reduce:transition-none",
            scrolled ? "h-[54px] max-w-[980px]" : "h-[62px] max-w-[1160px]",
          )}
        >
          <Wordmark label={t("site.home_aria")} />

          <nav
            aria-label={t("site.nav_aria")}
            className="hidden items-center md:flex"
            onMouseLeave={() => setHovered(null)}
          >
            {links.map((link) => {
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  aria-current={active ? "page" : undefined}
                  onMouseEnter={() => setHovered(link.to)}
                  onFocus={() => setHovered(link.to)}
                  onBlur={() => setHovered(null)}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-body font-semibold outline-none transition-colors duration-200",
                    "focus-visible:ring-2 focus-visible:ring-mint",
                    active ? "text-ink" : "text-ink-2 hover:text-ink",
                  )}
                >
                  {hovered === link.to && (
                    <motion.span
                      layoutId="site-nav-hover"
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-paper-inset"
                      transition={{ duration: 0.28, ease: EASE_SIGNATURE }}
                    />
                  )}
                  <span className="relative inline-flex items-center gap-1.5">
                    {link.label}
                    {active && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-mint" />}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageToggle className="hidden sm:inline-flex" />
            {isAuthed ? (
              <Button asChild size="sm">
                <Link to="/le-fil">{t("landing.nav.my_space")}</Link>
              </Button>
            ) : (
              <>
                <Link
                  to="/auth"
                  search={{ redirect: "/le-fil", mode: "login" }}
                  onClick={onCta("login")}
                  className="hidden rounded-full px-3 py-2 text-body font-semibold text-ink-2 outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-mint lg:inline"
                >
                  {t("landing.nav.login")}
                </Link>
                <Button asChild size="sm" className="hidden sm:inline-flex">
                  <Link to="/onboarding" search={{ guest: true }} onClick={onCta("preview")}>
                    {t("landing.nav.simulate_cta")}
                  </Link>
                </Button>
              </>
            )}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="site-mobile-menu"
              aria-label={open ? t("site.menu_close") : t("site.menu_open")}
              className="flex h-11 w-11 items-center justify-center rounded-full text-ink outline-none transition-colors hover:bg-paper-inset focus-visible:ring-2 focus-visible:ring-mint md:hidden"
            >
              {open ? (
                <X aria-hidden className="size-5" />
              ) : (
                <Menu aria-hidden className="size-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="site-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t("site.nav_aria")}
            className="fixed inset-0 z-40 flex flex-col bg-paper px-6 pt-[104px] pb-8 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <nav aria-label={t("site.nav_aria")} className="flex flex-col">
              {links.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.05, duration: 0.4, ease: EASE_SIGNATURE }}
                >
                  <Link
                    to={link.to}
                    aria-current={isActive(link.to) ? "page" : undefined}
                    className="flex items-center justify-between border-b border-paper-3 py-5 font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink outline-none focus-visible:text-mint-ink"
                  >
                    {link.label}
                    <span aria-hidden className="text-ink-3">
                      →
                    </span>
                  </Link>
                </motion.div>
              ))}
            </nav>

            <motion.div
              className="mt-auto flex flex-col gap-3"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4, ease: EASE_SIGNATURE }}
            >
              <LanguageToggle className="self-start" />
              {isAuthed ? (
                <Button asChild size="lg">
                  <Link to="/le-fil">{t("landing.nav.my_space")}</Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link to="/onboarding" search={{ guest: true }} onClick={onCta("preview")}>
                      {t("landing.nav.simulate_cta")}
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary">
                    <Link
                      to="/auth"
                      search={{ redirect: "/le-fil", mode: "login" }}
                      onClick={onCta("login")}
                    >
                      {t("landing.nav.login")}
                    </Link>
                  </Button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Réserve la hauteur de l'en-tête fixe en haut d'une page. */
export function SiteHeaderSpacer() {
  return <div aria-hidden className="h-[92px] md:h-[104px]" />;
}
