-- preference_events / tradeoff_decisions / fund_rejections are inserted directly
-- from the browser Supabase client (RLS-scoped to auth.uid() = user_id, which is
-- correct), but nothing bounds the size of the payload/context JSONB the client
-- sends, and nothing rate-limits how often a user can write. A scripted user can
-- insert unbounded JSON blobs into their own rows indefinitely — bloating storage
-- and slowing getBetaAdminStats' scan of these tables. A client-side check would
-- be trivially bypassed (these are direct table inserts, not server functions), so
-- both limits are enforced here, at the only place that can't be skipped.

CREATE OR REPLACE FUNCTION public.enforce_preference_event_limits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_allowed boolean;
BEGIN
  IF pg_column_size(NEW.payload) > 8192 THEN
    RAISE EXCEPTION 'Charge utile trop volumineuse.' USING ERRCODE = 'P0001';
  END IF;

  SELECT public.check_and_increment_rate_limit(
    'analytics_write:preference_events:' || NEW.user_id::text, 120, 60
  ) INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Trop d''écritures. Réessaie dans quelques instants.' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_enforce_preference_event_limits
  BEFORE INSERT ON public.preference_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_preference_event_limits();

CREATE OR REPLACE FUNCTION public.enforce_tradeoff_decision_limits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_allowed boolean;
BEGIN
  IF pg_column_size(NEW.context) > 8192 THEN
    RAISE EXCEPTION 'Contexte trop volumineux.' USING ERRCODE = 'P0001';
  END IF;

  SELECT public.check_and_increment_rate_limit(
    'analytics_write:tradeoff_decisions:' || NEW.user_id::text, 120, 60
  ) INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Trop d''écritures. Réessaie dans quelques instants.' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_enforce_tradeoff_decision_limits
  BEFORE INSERT ON public.tradeoff_decisions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tradeoff_decision_limits();

CREATE OR REPLACE FUNCTION public.enforce_fund_rejection_limits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_allowed boolean;
BEGIN
  IF pg_column_size(NEW.context) > 8192 THEN
    RAISE EXCEPTION 'Contexte trop volumineux.' USING ERRCODE = 'P0001';
  END IF;

  SELECT public.check_and_increment_rate_limit(
    'analytics_write:fund_rejections:' || NEW.user_id::text, 120, 60
  ) INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Trop d''écritures. Réessaie dans quelques instants.' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_enforce_fund_rejection_limits
  BEFORE INSERT ON public.fund_rejections
  FOR EACH ROW EXECUTE FUNCTION public.enforce_fund_rejection_limits();
