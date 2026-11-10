import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Component, useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/i18n";
import { DURATION, EASE_SIGNATURE } from "@/lib/motion";
import { LexiconProvider } from "@/hooks/useLexicon";
import { AuthProvider } from "@/hooks/useAuth";
import { ViewModeProvider } from "@/hooks/useViewMode";
import { FocusModeProvider } from "@/hooks/useFocusMode";
import { UserPortfoliosProvider } from "@/hooks/useUserPortfolios";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/AppShell";
import { CookieNotice } from "@/components/layout/CookieNotice";
import { installGlobalErrorReporting, reportReactError } from "@/lib/monitoring/errorReporter";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/hooks/useTheme";
import { FontScaleProvider, FONT_SCALE_INIT_SCRIPT } from "@/hooks/useFontScale";
import { PreferenceSync } from "@/components/PreferenceSync";
import { socialMeta } from "@/lib/seo/socialMeta";
import { useSpotlight } from "@/hooks/useSpotlight";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div aria-hidden className="aurora">
        <i />
        <i />
        <i />
      </div>
      <div className="relative z-10 max-w-md text-center">
        <p className="display-xl text-gradient animate-float motion-reduce:animate-none">404</p>
        <h1 className="mt-4 text-h1-page">{t("root.not_found_title")}</h1>
        <p className="mt-3 text-body-lg text-ink-2">{t("root.not_found_desc")}</p>
        <div className="mt-8">
          <Button asChild size="pill">
            <Link to="/">{t("root.back_home")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
      },
      ...socialMeta({
        // Valeurs par défaut du site : toute route qui n'appelle pas
        // `socialMeta` hérite de celles-ci pour les deux familles de balises.
        title: "Seedow — Votre argent façonne déjà le monde",
        description:
          "Investis, suis ta performance, mesure ton impact. Une expérience claire et responsable.",
      }),
      { name: "theme-color", content: "#f5f4f1" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Seedow" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        // DA V4 (docs/DA-V4.md) — Bricolage Grotesque pour les titres, Manrope
        // pour le texte et les chiffres (tabulaires), IBM Plex Mono réservé aux
        // tickers, ISIN et lignes de source.
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap",
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Script d'init thème/police exécuté avant hydratation — contenu 100% statique
            (constantes), aucun input utilisateur, donc pas de risque XSS. */}
        <script
          dangerouslySetInnerHTML={{ __html: `${THEME_INIT_SCRIPT}\n${FONT_SCALE_INIT_SCRIPT}` }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

class RootErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    reportReactError(error, info.componentStack ?? undefined);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-md text-center">
            <h1 className="display-lg text-ink">Oups.</h1>
            <p className="mt-4 text-body-lg text-ink-2">
              Une erreur inattendue s'est produite. L'équipe a été notifiée automatiquement.
            </p>
            <Button size="pill" className="mt-6" onClick={() => window.location.assign("/")}>
              Retour à l'accueil
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function RouteTransition() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: DURATION.base, ease: EASE_SIGNATURE }}
        style={{ willChange: "opacity, transform" }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

function RootComponent() {
  useEffect(() => {
    installGlobalErrorReporting();
  }, []);
  // Reflet qui suit le curseur sur les cartes `.spot` — un écouteur pour toute l'app.
  useSpotlight();

  // Une instance par rendu racine (pas un singleton module-level) : en SSR,
  // un client partagé entre requêtes ferait fuiter le cache d'un utilisateur
  // vers un autre.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <MotionConfig reducedMotion="user">
      <RootErrorBoundary>
        <ThemeProvider>
          <FontScaleProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <UserPortfoliosProvider>
                  <LexiconProvider>
                    <ViewModeProvider>
                      <FocusModeProvider>
                        <TooltipProvider delayDuration={150}>
                          <PreferenceSync />
                          <AppShell>
                            <RouteTransition />
                          </AppShell>
                          <Toaster richColors position="bottom-right" />
                          <CookieNotice />
                        </TooltipProvider>
                      </FocusModeProvider>
                    </ViewModeProvider>
                  </LexiconProvider>
                </UserPortfoliosProvider>
              </AuthProvider>
            </QueryClientProvider>
          </FontScaleProvider>
        </ThemeProvider>
      </RootErrorBoundary>
    </MotionConfig>
  );
}
