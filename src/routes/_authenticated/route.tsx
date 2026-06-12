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
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client'

// Lovable's Supabase auth scaffolds use `/auth`; change this if the app uses another sign-in route.
const SIGN_IN_ROUTE = '/auth'

export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      throw redirect({ to: SIGN_IN_ROUTE })
    }
    return { user: data.user }
  },
  component: () => <Outlet />,
})
