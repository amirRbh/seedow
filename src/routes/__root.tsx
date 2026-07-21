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

import appCss from "../styles.css?url";

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="max-w-md text-center">
        <h1 className="font-value text-7xl text-ink">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-ink">{t("root.not_found_title")}</h2>
        <p className="mt-2 text-sm text-ink-3">{t("root.not_found_desc")}</p>
        <div className="mt-6">
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
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Seedow — Investis avec impact, simplement" },
      {
        name: "description",
        content:
          "Investis, suis ta performance, mesure ton impact. Une expérience claire et responsable.",
      },
      { property: "og:title", content: "Seedow — Investis avec impact, simplement" },
      {
        property: "og:description",
        content:
          "Investis, suis ta performance, mesure ton impact. Une expérience claire et responsable.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Seedow — Investis avec impact, simplement" },
      {
        name: "twitter:description",
        content:
          "Investis, suis ta performance, mesure ton impact. Une expérience claire et responsable.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/19e08fb9-f330-450c-bd8c-8e92d139eed3/id-preview-4e3b9288--8da0a748-e3ac-433b-89b0-062aead1a028.lovable.app-1776452888382.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/19e08fb9-f330-450c-bd8c-8e92d139eed3/id-preview-4e3b9288--8da0a748-e3ac-433b-89b0-062aead1a028.lovable.app-1776452888382.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0d1f14" },
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
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;700&display=swap",
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
        {/* eslint-disable-next-line react/no-danger -- lit localStorage avant hydratation, pas d'input utilisateur */}
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
        <div className="flex min-h-screen items-center justify-center bg-paper px-4">
          <div className="max-w-md text-center">
            <h1 className="font-value text-4xl text-ink">Oups.</h1>
            <p className="mt-3 text-sm text-ink-3">
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
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: DURATION.fast, ease: EASE_SIGNATURE }}
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
