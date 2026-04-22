ALTER TABLE public.assets
  ADD COLUMN esg_score_source text NULL,
  ADD COLUMN carbon_intensity_gco2e_per_eur numeric NULL,
  ADD COLUMN carbon_intensity_source text NULL,
  ADD COLUMN carbon_intensity_updated_at timestamptz NULL;

COMMENT ON COLUMN public.assets.esg_score_source IS 'Source du score ESG (MSCI, Sustainalytics, Yahoo, manual...).';
COMMENT ON COLUMN public.assets.carbon_intensity_gco2e_per_eur IS 'Intensité carbone en gCO2e par euro investi par an (Scope 1+2 typiquement).';
COMMENT ON COLUMN public.assets.carbon_intensity_source IS 'Source de l''intensité carbone (Trucost, ISS, Yahoo, manual...).';
COMMENT ON COLUMN public.assets.carbon_intensity_updated_at IS 'Date de dernière mise à jour de l''intensité carbone.';

ALTER TABLE public.assets
  ADD CONSTRAINT carbon_intensity_nonneg
    CHECK (carbon_intensity_gco2e_per_eur IS NULL OR carbon_intensity_gco2e_per_eur >= 0);

ALTER TABLE public.portfolios
  ADD COLUMN esg_floor_relaxed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.portfolios.esg_floor_relaxed IS 'TRUE si l''optimiseur a dû relâcher le plancher ESG (MIN_PORTFOLIO_ESG) pour trouver une solution faisable.';