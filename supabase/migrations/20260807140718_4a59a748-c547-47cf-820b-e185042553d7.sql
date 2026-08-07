UPDATE public.assets
SET waci_tco2e_per_musd_sales = NULL,
    updated_at = now()
WHERE waci_tco2e_per_musd_sales >= 300
   OR waci_tco2e_per_musd_sales < 0;