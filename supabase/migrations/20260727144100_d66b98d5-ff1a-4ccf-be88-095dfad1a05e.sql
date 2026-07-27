ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS waci_tco2e_per_musd_sales numeric,
  ADD COLUMN IF NOT EXISTS msci_esg_quality_score numeric,
  ADD COLUMN IF NOT EXISTS implied_temp_rise text,
  ADD COLUMN IF NOT EXISTS esg_data_asof timestamptz;