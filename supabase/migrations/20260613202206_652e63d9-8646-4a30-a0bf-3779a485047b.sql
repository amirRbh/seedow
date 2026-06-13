
-- 1) Lock down portfolio_shares.user_id so authenticated readers can't link share handles to user identities
REVOKE SELECT (user_id) ON public.portfolio_shares FROM authenticated;
REVOKE SELECT (user_id) ON public.portfolio_shares FROM anon;

-- 2) Harden waitlist: enforce email uniqueness + basic format; prevents flooding/dedup abuse
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_unique_idx ON public.waitlist (lower(email));
ALTER TABLE public.waitlist
  DROP CONSTRAINT IF EXISTS waitlist_email_format_chk;
ALTER TABLE public.waitlist
  ADD CONSTRAINT waitlist_email_format_chk
  CHECK (email ~* '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND length(email) <= 254);
