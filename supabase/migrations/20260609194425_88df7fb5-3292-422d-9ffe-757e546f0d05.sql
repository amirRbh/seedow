
-- ─────────────────────────────────────────────────────────
-- preference_events : journal exhaustif des micro-décisions
-- ─────────────────────────────────────────────────────────
CREATE TABLE public.preference_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  portfolio_id uuid,
  step text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  variant text,
  dwell_ms integer,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pref_events_user_time ON public.preference_events (user_id, occurred_at DESC);
CREATE INDEX idx_pref_events_step ON public.preference_events (step);
CREATE INDEX idx_pref_events_session ON public.preference_events (session_id) WHERE session_id IS NOT NULL;

GRANT SELECT, INSERT ON public.preference_events TO authenticated;
GRANT ALL ON public.preference_events TO service_role;

ALTER TABLE public.preference_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own preference events"
  ON public.preference_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users read own preference events"
  ON public.preference_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────
-- tradeoff_decisions : arbitrages révélés (coût accepté/refusé)
-- ─────────────────────────────────────────────────────────
CREATE TABLE public.tradeoff_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  portfolio_id uuid,
  lever text NOT NULL,
  lever_value text,
  cost_bps numeric,
  esg_delta numeric,
  vol_delta numeric,
  accepted boolean NOT NULL,
  alt_chosen text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tradeoff_user ON public.tradeoff_decisions (user_id, occurred_at DESC);
CREATE INDEX idx_tradeoff_lever ON public.tradeoff_decisions (lever, accepted);

GRANT SELECT, INSERT ON public.tradeoff_decisions TO authenticated;
GRANT ALL ON public.tradeoff_decisions TO service_role;

ALTER TABLE public.tradeoff_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own tradeoffs"
  ON public.tradeoff_decisions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users read own tradeoffs"
  ON public.tradeoff_decisions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────
-- fund_rejections : "ce fonds n'est pas assez vert pour moi"
-- ─────────────────────────────────────────────────────────
CREATE TABLE public.fund_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  portfolio_id uuid,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  reason text NOT NULL,
  reason_detail text,
  swap_asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rejections_asset ON public.fund_rejections (asset_id, occurred_at DESC);
CREATE INDEX idx_rejections_user ON public.fund_rejections (user_id, occurred_at DESC);
CREATE INDEX idx_rejections_reason ON public.fund_rejections (reason);

GRANT SELECT, INSERT ON public.fund_rejections TO authenticated;
GRANT ALL ON public.fund_rejections TO service_role;

ALTER TABLE public.fund_rejections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own rejections"
  ON public.fund_rejections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users read own rejections"
  ON public.fund_rejections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
