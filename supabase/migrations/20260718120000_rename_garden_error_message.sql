-- Retire la référence "jardin" du message d'erreur du trigger de limite de
-- portefeuilles actifs (nettoyage de la DA jardin, aucun changement de
-- comportement ni de schéma).
CREATE OR REPLACE FUNCTION public.enforce_max_active_portfolios()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  active_count int;
BEGIN
  IF NEW.is_active = true THEN
    SELECT COUNT(*) INTO active_count
    FROM public.portfolios
    WHERE user_id = NEW.user_id
      AND is_active = true
      AND id <> NEW.id;
    IF active_count >= 3 THEN
      RAISE EXCEPTION 'Tu as atteint la limite de 3 portefeuilles actifs. Archive un portefeuille pour en créer un nouveau.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
