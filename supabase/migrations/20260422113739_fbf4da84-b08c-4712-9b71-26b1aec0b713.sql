ALTER TABLE public.assets
  ADD COLUMN env_score numeric NULL,
  ADD COLUMN social_score numeric NULL,
  ADD COLUMN governance_score numeric NULL;

COMMENT ON COLUMN public.assets.env_score IS 'Pilier Environnement (0-100). Si NULL, esg_score global est utilisé.';
COMMENT ON COLUMN public.assets.social_score IS 'Pilier Social (0-100). Si NULL, esg_score global est utilisé.';
COMMENT ON COLUMN public.assets.governance_score IS 'Pilier Gouvernance (0-100). Si NULL, esg_score global est utilisé.';

ALTER TABLE public.assets
  ADD CONSTRAINT env_score_range CHECK (env_score IS NULL OR (env_score >= 0 AND env_score <= 100)),
  ADD CONSTRAINT social_score_range CHECK (social_score IS NULL OR (social_score >= 0 AND social_score <= 100)),
  ADD CONSTRAINT governance_score_range CHECK (governance_score IS NULL OR (governance_score >= 0 AND governance_score <= 100));