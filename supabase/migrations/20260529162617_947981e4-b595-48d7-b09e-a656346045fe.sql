-- Batch A: pivot to audit model. Remove deposits subsystem.
-- The app no longer promises to place money; users will manually input
-- their existing portfolio for an ESG audit.

DROP TABLE IF EXISTS public.deposits CASCADE;
DROP TYPE IF EXISTS public.deposit_status;
DROP TYPE IF EXISTS public.deposit_method;

-- Track when ESG data was last fetched, to drive the monthly refresh cron.
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS esg_score_fetched_at timestamptz;