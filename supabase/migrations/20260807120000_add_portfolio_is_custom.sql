-- Parcours « Personnaliser » : marque les portefeuilles dont les pondérations
-- ont été éditées à la main par l'utilisateur, pour ne pas les écraser
-- silencieusement. RLS existante (owner SELECT/INSERT/UPDATE/DELETE) inchangée :
-- aucune nouvelle table, pas de nouvelle policy nécessaire.

ALTER TABLE public.portfolios
  ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.portfolios.is_custom IS
  'true = pondérations éditées à la main (parcours Personnaliser). Métriques recalculées côté serveur pour ces poids, sans réoptimisation.';
