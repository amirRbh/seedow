
CREATE TYPE public.deposit_method AS ENUM ('card', 'wallet', 'sepa');
CREATE TYPE public.deposit_status AS ENUM ('pending', 'settled', 'failed');

CREATE TABLE public.deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  method public.deposit_method NOT NULL,
  status public.deposit_status NOT NULL DEFAULT 'settled',
  reference TEXT,
  asset_hint TEXT,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deposits_user ON public.deposits(user_id, created_at DESC);

ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own deposits" ON public.deposits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own deposits" ON public.deposits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own deposits" ON public.deposits
  FOR DELETE USING (auth.uid() = user_id);
