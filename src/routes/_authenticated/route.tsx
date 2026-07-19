// Auto-injected by the Supabase integration when this file does not exist.
//
// Pathless layout route that gates every child under `src/routes/_authenticated/`
// behind a signed-in Supabase user. The subtree is client-rendered (`ssr: false`)
// because Supabase stores the session in `localStorage`, which the server cannot
// read. Trying to gate this subtree server-side produces redirect loops or
// false sign-out flashes on hard refresh.
//
// Public pages and `/auth` continue to SSR normally — they do not import this
// layout and are not affected.
//
// Data fetching inside this subtree should call `createServerFn`s protected by
// `requireSupabaseAuth`. The browser attaches the bearer token automatically
// via `attachSupabaseAuth`, which is registered as `functionMiddleware` in
// `src/start.ts` (auto-wired by the integration).
//
// Edit freely. This file is only re-injected when deleted entirely.
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = await requireAuthedUser(location.pathname);
    return { user };
  },
  component: () => <Outlet />,
});
