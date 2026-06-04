-- ─────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────
CREATE TYPE public.alert_kind AS ENUM (
  'esg_drift',
  'rebalance',
  'missed_contribution',
  'performance',
  'fresh_quotes',
  'concentration'
);

CREATE TYPE public.alert_severity AS ENUM ('info', 'warn', 'alert');

CREATE TYPE public.contribution_frequency AS ENUM ('monthly', 'quarterly');

CREATE TYPE public.decision_kind AS ENUM (
  'creation',
  'cause_added',
  'cause_removed',
  'exclusion_added',
  'exclusion_removed',
  'horizon_changed',
  'risk_changed',
  'rebalance',
  'contribution_scheduled',
  'contribution_paused'
);

-- ─────────────────────────────────────────────────────────────────────────
-- Table : alerts
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  portfolio_id uuid,
  kind        public.alert_kind NOT NULL,
  severity    public.alert_severity NOT NULL DEFAULT 'info',
  title       text NOT NULL,
  body        text NOT NULL,
  cta_label   text,
  cta_href    text,
  dedup_key   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  read_at     timestamptz,
  dismissed_at timestamptz
);

CREATE UNIQUE INDEX alerts_user_dedup_open_idx
  ON public.alerts (user_id, dedup_key)
  WHERE dismissed_at IS NULL;

CREATE INDEX alerts_user_unread_idx
  ON public.alerts (user_id, created_at DESC)
  WHERE read_at IS NULL AND dismissed_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own alerts" ON public.alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own alerts" ON public.alerts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users insert own alerts" ON public.alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own alerts" ON public.alerts
  FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Table : scheduled_contributions
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.scheduled_contributions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  portfolio_id uuid NOT NULL,
  amount      numeric NOT NULL,
  frequency   public.contribution_frequency NOT NULL DEFAULT 'monthly',
  day_of_month int NOT NULL DEFAULT 1,
  started_at  date NOT NULL DEFAULT current_date,
  paused_until date,
  last_processed_at timestamptz,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX scheduled_contributions_portfolio_idx
  ON public.scheduled_contributions (portfolio_id) WHERE is_active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_contributions TO authenticated;
GRANT ALL ON public.scheduled_contributions TO service_role;

ALTER TABLE public.scheduled_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own schedules" ON public.scheduled_contributions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own schedules" ON public.scheduled_contributions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own schedules" ON public.scheduled_contributions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own schedules" ON public.scheduled_contributions
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER scheduled_contributions_updated_at
  BEFORE UPDATE ON public.scheduled_contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────
-- Table : decision_events
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.decision_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  portfolio_id uuid,
  kind        public.decision_kind NOT NULL,
  title       text NOT NULL,
  detail      text,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX decision_events_user_time_idx
  ON public.decision_events (user_id, occurred_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_events TO authenticated;
GRANT ALL ON public.decision_events TO service_role;

ALTER TABLE public.decision_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own decisions" ON public.decision_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own decisions" ON public.decision_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own decisions" ON public.decision_events
  FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Trigger : portfolios → decision_events
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_portfolio_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  added text;
  removed text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.decision_events (user_id, portfolio_id, kind, title, detail, payload)
    VALUES (
      NEW.user_id,
      NEW.id,
      'creation',
      format('Création de « %s »', NEW.name),
      format('Capital initial : %s €', to_char(NEW.initial_amount, 'FM999G999G990D00')),
      jsonb_build_object(
        'initial_amount', NEW.initial_amount,
        'horizon_years', NEW.horizon_years,
        'risk_target', NEW.risk_target
      )
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Causes ajoutées
    FOR added IN
      SELECT unnest(NEW.causes::text[])
      EXCEPT
      SELECT unnest(COALESCE(OLD.causes, '{}')::text[])
    LOOP
      INSERT INTO public.decision_events (user_id, portfolio_id, kind, title, payload)
      VALUES (NEW.user_id, NEW.id, 'cause_added', format('Cause ajoutée : %s', added), jsonb_build_object('cause', added));
    END LOOP;

    -- Causes retirées
    FOR removed IN
      SELECT unnest(COALESCE(OLD.causes, '{}')::text[])
      EXCEPT
      SELECT unnest(NEW.causes::text[])
    LOOP
      INSERT INTO public.decision_events (user_id, portfolio_id, kind, title, payload)
      VALUES (NEW.user_id, NEW.id, 'cause_removed', format('Cause retirée : %s', removed), jsonb_build_object('cause', removed));
    END LOOP;

    -- Exclusions ajoutées
    FOR added IN
      SELECT unnest(NEW.exclusions::text[])
      EXCEPT
      SELECT unnest(COALESCE(OLD.exclusions, '{}')::text[])
    LOOP
      INSERT INTO public.decision_events (user_id, portfolio_id, kind, title, payload)
      VALUES (NEW.user_id, NEW.id, 'exclusion_added', format('Exclusion ajoutée : %s', added), jsonb_build_object('exclusion', added));
    END LOOP;

    -- Exclusions retirées
    FOR removed IN
      SELECT unnest(COALESCE(OLD.exclusions, '{}')::text[])
      EXCEPT
      SELECT unnest(NEW.exclusions::text[])
    LOOP
      INSERT INTO public.decision_events (user_id, portfolio_id, kind, title, payload)
      VALUES (NEW.user_id, NEW.id, 'exclusion_removed', format('Exclusion retirée : %s', removed), jsonb_build_object('exclusion', removed));
    END LOOP;

    -- Horizon modifié
    IF NEW.horizon_years IS DISTINCT FROM OLD.horizon_years THEN
      INSERT INTO public.decision_events (user_id, portfolio_id, kind, title, payload)
      VALUES (
        NEW.user_id, NEW.id, 'horizon_changed',
        format('Horizon modifié : %s ans', NEW.horizon_years),
        jsonb_build_object('from', OLD.horizon_years, 'to', NEW.horizon_years)
      );
    END IF;

    -- Risque modifié
    IF NEW.risk_target IS DISTINCT FROM OLD.risk_target THEN
      INSERT INTO public.decision_events (user_id, portfolio_id, kind, title, payload)
      VALUES (
        NEW.user_id, NEW.id, 'risk_changed',
        format('Cible de risque modifiée : %s %%', to_char(NEW.risk_target * 100, 'FM990D0')),
        jsonb_build_object('from', OLD.risk_target, 'to', NEW.risk_target)
      );
    END IF;

    -- Rééquilibrage (poids modifiés)
    IF NEW.weights::text IS DISTINCT FROM OLD.weights::text
       AND NEW.generated_at IS DISTINCT FROM OLD.generated_at THEN
      INSERT INTO public.decision_events (user_id, portfolio_id, kind, title)
      VALUES (NEW.user_id, NEW.id, 'rebalance', 'Allocation recalculée');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER portfolios_decision_log
  AFTER INSERT OR UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.log_portfolio_decision();