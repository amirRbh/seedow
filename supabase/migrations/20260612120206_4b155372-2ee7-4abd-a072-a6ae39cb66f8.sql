
-- 1. app_config : clé/valeur publique en lecture
CREATE TABLE public.app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_config TO anon, authenticated;
GRANT ALL ON public.app_config TO service_role;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_config readable by all" ON public.app_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "app_config writable by admin" ON public.app_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_config (key, value) VALUES
  ('beta_cap', '300'::jsonb),
  ('beta_status', '"open"'::jsonb);

-- 2. waitlist
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.waitlist TO anon, authenticated;
GRANT SELECT ON public.waitlist TO authenticated;
GRANT ALL ON public.waitlist TO service_role;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "waitlist insert open" ON public.waitlist FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "waitlist admin read" ON public.waitlist FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. real_investment_intents
CREATE TABLE public.real_investment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  frequency text NOT NULL CHECK (frequency IN ('one_shot','monthly')),
  contact_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.real_investment_intents TO authenticated;
GRANT ALL ON public.real_investment_intents TO service_role;
ALTER TABLE public.real_investment_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rii owner insert" ON public.real_investment_intents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rii owner read" ON public.real_investment_intents FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 4. beta_feedback
CREATE TABLE public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nps int CHECK (nps BETWEEN 0 AND 10),
  blocker text,
  wish text,
  route_when_sent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.beta_feedback TO authenticated;
GRANT ALL ON public.beta_feedback TO service_role;
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bf owner insert" ON public.beta_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bf owner read" ON public.beta_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 5. beta_events
CREATE TABLE public.beta_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX beta_events_event_idx ON public.beta_events (event, created_at DESC);
GRANT SELECT, INSERT ON public.beta_events TO authenticated;
GRANT INSERT ON public.beta_events TO anon;
GRANT ALL ON public.beta_events TO service_role;
ALTER TABLE public.beta_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "be insert any" ON public.beta_events FOR INSERT TO anon, authenticated WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "be admin read" ON public.beta_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
