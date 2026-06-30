import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import "@/i18n";
import { LexiconProvider } from "@/hooks/useLexicon";
import { AuthProvider } from "@/hooks/useAuth";
import { ViewModeProvider } from "@/hooks/useViewMode";
import { FocusModeProvider } from "@/hooks/useFocusMode";
import { UserPortfoliosProvider } from "@/hooks/useUserPortfolios";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/AppShell";


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
          <Link to="/" className="btn-plant">{t("root.back_home")}</Link>
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
      { name: "description", content: "Investis, suis ta performance, mesure ton impact. Une expérience claire et responsable." },
      { property: "og:title", content: "Seedow — Investis avec impact, simplement" },
      { property: "og:description", content: "Investis, suis ta performance, mesure ton impact. Une expérience claire et responsable." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Seedow — Investis avec impact, simplement" },
      { name: "twitter:description", content: "Investis, suis ta performance, mesure ton impact. Une expérience claire et responsable." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/19e08fb9-f330-450c-bd8c-8e92d139eed3/id-preview-4e3b9288--8da0a748-e3ac-433b-89b0-062aead1a028.lovable.app-1776452888382.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/19e08fb9-f330-450c-bd8c-8e92d139eed3/id-preview-4e3b9288--8da0a748-e3ac-433b-89b0-062aead1a028.lovable.app-1776452888382.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
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
        transition={{ duration: 0.18, ease: "easeOut" }}
        style={{ willChange: "opacity, transform" }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

function RootComponent() {
  return (
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
              </TooltipProvider>
            </FocusModeProvider>
          </ViewModeProvider>
        </LexiconProvider>
      </UserPortfoliosProvider>
    </AuthProvider>
  );
}

