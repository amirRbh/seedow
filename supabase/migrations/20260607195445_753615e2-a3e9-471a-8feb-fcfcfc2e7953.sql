
-- ── financial_goals ─────────────────────────────────────────────
CREATE TYPE public.goal_type AS ENUM ('retirement', 'real_estate', 'studies', 'safety_net', 'other');

CREATE TABLE public.financial_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE SET NULL,
  name text NOT NULL,
  goal_type public.goal_type NOT NULL DEFAULT 'other',
  target_amount numeric NOT NULL CHECK (target_amount > 0),
  target_date date NOT NULL,
  monthly_contribution numeric NOT NULL DEFAULT 0 CHECK (monthly_contribution >= 0),
  initial_capital numeric NOT NULL DEFAULT 0 CHECK (initial_capital >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_goals TO authenticated;
GRANT ALL ON public.financial_goals TO service_role;

ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own goals" ON public.financial_goals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own goals" ON public.financial_goals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own goals" ON public.financial_goals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own goals" ON public.financial_goals
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_financial_goals_updated_at
  BEFORE UPDATE ON public.financial_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX financial_goals_user_idx ON public.financial_goals(user_id);

-- ── profiles.public_handle ──────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN public_handle text UNIQUE;
ALTER TABLE public.profiles ADD CONSTRAINT public_handle_format
  CHECK (public_handle IS NULL OR public_handle ~ '^[a-z0-9_-]{3,24}$');

-- Permettre la lecture publique du handle (et seulement utile en lecture authenticated)
CREATE POLICY "Public handles readable by authenticated"
  ON public.profiles FOR SELECT TO authenticated
  USING (public_handle IS NOT NULL);

-- ── portfolio_shares ────────────────────────────────────────────
CREATE TABLE public.portfolio_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  public_handle text NOT NULL,
  causes text[] NOT NULL DEFAULT '{}',
  exclusions text[] NOT NULL DEFAULT '{}',
  risk_target numeric NOT NULL,
  horizon_years integer NOT NULL,
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  expected_return numeric,
  volatility numeric,
  esg_score numeric,
  carbon_intensity numeric,
  shared_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portfolio_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_shares TO authenticated;
GRANT ALL ON public.portfolio_shares TO service_role;

ALTER TABLE public.portfolio_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shared portfolios readable by authenticated"
  ON public.portfolio_shares FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own shares"
  ON public.portfolio_shares FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own shares"
  ON public.portfolio_shares FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own shares"
  ON public.portfolio_shares FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_portfolio_shares_updated_at
  BEFORE UPDATE ON public.portfolio_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX portfolio_shares_handle_idx ON public.portfolio_shares(public_handle);
CREATE INDEX portfolio_shares_user_idx ON public.portfolio_shares(user_id);
