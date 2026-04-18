-- =========================================================
-- PROFILES (auto-créé au signup)
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- ASSET CLASSES & CAUSES (enums)
-- =========================================================
CREATE TYPE public.asset_class AS ENUM (
  'equity_dev', 'equity_em', 'thematic',
  'green_bond', 'social_bond', 'sov_bond',
  'reit', 'commodity', 'cash'
);

CREATE TYPE public.cause_tag AS ENUM (
  'climat', 'biodiversite', 'humain', 'egalite', 'tech', 'circulaire'
);

CREATE TYPE public.exclusion_tag AS ENUM (
  'fossiles', 'armes', 'tabac', 'jeux', 'animaux', 'fast-fashion'
);

-- =========================================================
-- ASSETS (univers investissable)
-- =========================================================
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL UNIQUE,
  isin TEXT UNIQUE,
  name TEXT NOT NULL,
  issuer TEXT,
  asset_class public.asset_class NOT NULL,
  region TEXT,                       -- ex: 'world', 'europe', 'us', 'em'
  currency TEXT NOT NULL DEFAULT 'EUR',
  ter NUMERIC(5,4) NOT NULL DEFAULT 0.003,    -- frais annuels (0.30%)
  esg_score NUMERIC(5,2) NOT NULL DEFAULT 0,  -- 0..100
  sfdr_article INT,                  -- 6, 8, ou 9
  expected_return NUMERIC(6,4) NOT NULL DEFAULT 0,    -- annualisé (0.07 = 7%)
  volatility NUMERIC(6,4) NOT NULL DEFAULT 0.15,      -- annualisée
  cause_exposure JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { climat: 0..1, ... }
  excluded_sectors public.exclusion_tag[] NOT NULL DEFAULT '{}',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_class ON public.assets(asset_class) WHERE is_active;
CREATE INDEX idx_assets_esg ON public.assets(esg_score DESC) WHERE is_active;

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assets readable by authenticated users" ON public.assets
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- ASSET COVARIANCE (matrice pré-calculée)
-- =========================================================
CREATE TABLE public.asset_covariance (
  asset_a UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  asset_b UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  covariance NUMERIC(10,8) NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (asset_a, asset_b)
);

ALTER TABLE public.asset_covariance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Covariance readable by authenticated users" ON public.asset_covariance
  FOR SELECT TO authenticated USING (true);

-- =========================================================
-- PORTFOLIOS (générés par utilisateur)
-- =========================================================
CREATE TABLE public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Mon portefeuille',
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Inputs (params utilisateur)
  causes public.cause_tag[] NOT NULL DEFAULT '{}',
  cause_intensity JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { climat: 0.8, ... }
  exclusions public.exclusion_tag[] NOT NULL DEFAULT '{}',
  risk_target NUMERIC(5,4) NOT NULL DEFAULT 0.10,      -- vol cible annuelle
  horizon_years INT NOT NULL DEFAULT 5,
  initial_amount NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Outputs (résultat optimisation)
  weights JSONB NOT NULL DEFAULT '{}'::jsonb,          -- { asset_id: weight }
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,          -- { vol, sharpe, esg, co2, ... }
  methodology_version TEXT NOT NULL DEFAULT 'v1.0',

  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolios_user ON public.portfolios(user_id, is_active);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own portfolios" ON public.portfolios
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own portfolios" ON public.portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own portfolios" ON public.portfolios
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own portfolios" ON public.portfolios
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();