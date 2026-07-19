-- Le contrôle de capacité bêta (300 places, app_config.beta_cap/beta_status) n'était
-- appliqué que côté client, et seulement sur /auth : useBetaCapacity() décide, si la
-- bêta est pleine, d'appeler joinWaitlist() plutôt que supabase.auth.signUp(). L'étape
-- "compte" de l'onboarding (/onboarding) appelle signUp() directement, sans jamais
-- consulter la capacité — un contournement complet du contrôle, et un contrôle qui de
-- toute façon n'était qu'une suggestion d'UI côté client, pas une garantie serveur.
--
-- Ce trigger déplace l'application de la règle à la seule source de vérité : la
-- création du compte elle-même. Comme handle_new_user() s'exécute en AFTER INSERT ON
-- auth.users, une exception ici annule toute la transaction d'inscription — quel que
-- soit le chemin client emprunté (onboarding, /auth, OAuth, ou un appel direct à l'API
-- Supabase qui contournerait entièrement le client React).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cap integer;
  v_status text;
  v_count integer;
BEGIN
  SELECT (value #>> '{}')::integer INTO v_cap FROM public.app_config WHERE key = 'beta_cap';
  SELECT value #>> '{}' INTO v_status FROM public.app_config WHERE key = 'beta_status';
  SELECT count(*) INTO v_count FROM public.profiles;

  IF COALESCE(v_status, 'open') = 'closed' OR v_count >= COALESCE(v_cap, 300) THEN
    RAISE EXCEPTION 'La bêta Seedow est complète pour le moment. Inscris-toi sur la liste d''attente.'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END; $$;
