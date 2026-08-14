-- Agrégat SQL du Bloc (efficacité §12) : au lieu de rapatrier toutes les lignes
-- de `resolution_votes` côté serveur pour les compter en JS, on fait le GROUP BY
-- en base et on ne transporte que (résolution, choix, compte). Indispensable à
-- l'échelle (des dizaines/centaines de milliers de votes).
--
-- SECURITY DEFINER + search_path figé : la fonction ne renvoie JAMAIS de ligne
-- de vote nominative, seulement des décomptes agrégés — cohérent avec la RLS de
-- `resolution_votes` (une ligne de vote reste privée à son auteur).

CREATE INDEX IF NOT EXISTS resolution_votes_resolution_choice_idx
  ON public.resolution_votes (resolution_id, choice);

CREATE OR REPLACE FUNCTION public.tally_resolution_votes(p_resolution_ids uuid[])
RETURNS TABLE (resolution_id uuid, choice text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rv.resolution_id, rv.choice, count(*)::bigint
  FROM public.resolution_votes rv
  WHERE rv.resolution_id = ANY (p_resolution_ids)
  GROUP BY rv.resolution_id, rv.choice;
$$;

-- Appelée côté serveur via le service_role uniquement (agrégats du Bloc).
REVOKE ALL ON FUNCTION public.tally_resolution_votes(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tally_resolution_votes(uuid[]) TO service_role;
