import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { LexiconProvider } from "@/hooks/useLexicon";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="max-w-md text-center">
        <h1 className="font-value text-7xl text-ink">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-ink">Cette parcelle n'existe pas</h2>
        <p className="mt-2 text-sm text-ink-3">Reviens dans ton jardin pour continuer à cultiver.</p>
        <div className="mt-6">
          <Link to="/" className="btn-plant">Retour au jardin</Link>
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
      { title: "Seedow — Ton jardin d'investissement éthique" },
      { name: "description", content: "Plante, cultive, récolte. L'investissement éthique comme un jardin qui pousse." },
      { property: "og:title", content: "Seedow — Le Jardin" },
      { property: "og:description", content: "L'investissement éthique comme un jardin qui pousse." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
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

function RootComponent() {
  return (
    <LexiconProvider>
      <Outlet />
    </LexiconProvider>
  );
}
