-- Tests RLS / immutabilité des tables Pro. Chaque bloc lève une exception si
-- l'attendu n'est pas respecté ; le script s'arrête au premier échec
-- (psql -v ON_ERROR_STOP=1). Lancement : scripts/pro/test-migration.sh
\set ON_ERROR_STOP 1
SET client_min_messages = warning;

-- Données de test (en superuser).
INSERT INTO auth.users VALUES
  ('00000000-0000-0000-0000-00000000000a', 'a@test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test');
INSERT INTO public.pro_cabinets (id, name, orias_number, owner_user_id) VALUES
  ('10000000-0000-0000-0000-00000000000a', 'Cabinet A', '12345678', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-00000000000b', 'Cabinet B', '87654321', '00000000-0000-0000-0000-00000000000b');
INSERT INTO public.pro_client_profiles (id, cabinet_id, client_ref, sfdr_min_pct, collected_at) VALUES
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'CLI-A-1', 10, '2026-11-01'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'CLI-B-1', 25, '2026-11-01');
INSERT INTO public.pro_funds (isin, name, sfdr_article) VALUES ('FR0010592022', 'Fonds test', 9);

-- ---- Service role : écrit les fonds et les rapports ----
SET ROLE service_role;
INSERT INTO public.pro_fund_documents (id, isin, storage_path, sha256, doc_date)
VALUES ('30000000-0000-0000-0000-000000000001', 'FR0010592022', 'FR0010592022/x.pdf', repeat('a', 64), '2026-01-01');
INSERT INTO public.pro_fund_sustainability_data (document_id, isin, min_sustainable_pct, extraction_model, extraction_version, status)
VALUES ('30000000-0000-0000-0000-000000000001', 'FR0010592022', 80, 'm', 'v1', 'auto');
INSERT INTO public.pro_reports (id, cabinet_id, client_profile_id, profile_snapshot, results, engine_version, data_snapshot_hash, pdf_path, pdf_sha256)
VALUES ('40000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a',
        '{}', '[]', '1.0.0', repeat('b', 64), '10000000-0000-0000-0000-00000000000a/r.pdf', repeat('c', 64));
DO $$ BEGIN
  UPDATE public.pro_reports SET engine_version = 'x';
  RAISE EXCEPTION 'ÉCHEC : UPDATE de pro_reports accepté (service role)';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
DO $$ BEGIN
  DELETE FROM public.pro_reports;
  RAISE EXCEPTION 'ÉCHEC : DELETE de pro_reports accepté (service role)';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
RESET ROLE;

-- ---- Utilisateur A ----
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.pro_cabinets) <> 1 THEN RAISE EXCEPTION 'ÉCHEC : A voit d''autres cabinets'; END IF;
  IF (SELECT count(*) FROM public.pro_client_profiles) <> 1 THEN RAISE EXCEPTION 'ÉCHEC : A voit les profils de B'; END IF;
  IF (SELECT count(*) FROM public.pro_reports) <> 1 THEN RAISE EXCEPTION 'ÉCHEC : A ne voit pas son rapport'; END IF;
  IF (SELECT count(*) FROM public.pro_fund_current_data) <> 1 THEN RAISE EXCEPTION 'ÉCHEC : vue courante illisible'; END IF;
END $$;
-- A ne peut pas créer un profil dans le cabinet de B.
DO $$ BEGIN
  INSERT INTO public.pro_client_profiles (cabinet_id, client_ref, collected_at)
  VALUES ('10000000-0000-0000-0000-00000000000b', 'INTRUS', '2026-11-01');
  RAISE EXCEPTION 'ÉCHEC : A a écrit chez B';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
-- A ne peut pas insérer de rapport (réservé au serveur).
DO $$ BEGIN
  INSERT INTO public.pro_reports (cabinet_id, profile_snapshot, results, engine_version, data_snapshot_hash, pdf_path, pdf_sha256)
  VALUES ('10000000-0000-0000-0000-00000000000a', '{}', '[]', '1', repeat('b', 64), 'p', repeat('c', 64));
  RAISE EXCEPTION 'ÉCHEC : A a inséré un rapport';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
-- A ne peut ni modifier ni supprimer un rapport.
DO $$ DECLARE n int; BEGIN
  BEGIN
    UPDATE public.pro_reports SET engine_version = 'x';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE EXCEPTION 'ÉCHEC : A a modifié un rapport'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.pro_reports;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE EXCEPTION 'ÉCHEC : A a supprimé un rapport'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
-- A ne peut pas écrire dans les tables fonds.
DO $$ BEGIN
  INSERT INTO public.pro_funds (isin, name) VALUES ('FR0000000001', 'x');
  RAISE EXCEPTION 'ÉCHEC : A a écrit dans pro_funds';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
-- client_ref : un email est refusé.
DO $$ BEGIN
  INSERT INTO public.pro_client_profiles (cabinet_id, client_ref, collected_at)
  VALUES ('10000000-0000-0000-0000-00000000000a', 'jean@dupont.fr', '2026-11-01');
  RAISE EXCEPTION 'ÉCHEC : email accepté comme client_ref';
EXCEPTION WHEN check_violation THEN NULL; END $$;
-- Adaptation sans note refusée.
DO $$ BEGIN
  INSERT INTO public.pro_client_profiles (cabinet_id, client_ref, collected_at, adapted)
  VALUES ('10000000-0000-0000-0000-00000000000a', 'CLI-A-2', '2026-11-01', true);
  RAISE EXCEPTION 'ÉCHEC : adaptation sans note acceptée';
EXCEPTION WHEN check_violation THEN NULL; END $$;
-- Un profil cité par un rapport ne se supprime pas.
DO $$ BEGIN
  DELETE FROM public.pro_client_profiles WHERE id = '20000000-0000-0000-0000-00000000000a';
  RAISE EXCEPTION 'ÉCHEC : profil archivé supprimé';
EXCEPTION WHEN foreign_key_violation THEN NULL; END $$;
-- Stockage : dépôt dans sa propre inbox seulement.
INSERT INTO storage.objects (bucket_id, name) VALUES ('pro-annexes', 'inbox/00000000-0000-0000-0000-00000000000a/annexe.pdf');
DO $$ BEGIN
  INSERT INTO storage.objects (bucket_id, name) VALUES ('pro-annexes', 'inbox/00000000-0000-0000-0000-00000000000b/annexe.pdf');
  RAISE EXCEPTION 'ÉCHEC : dépôt dans l''inbox d''un autre';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
RESET ROLE;

-- ---- Utilisateur B : ne voit pas le rapport de A ----
INSERT INTO storage.objects (bucket_id, name) VALUES ('pro-reports', '10000000-0000-0000-0000-00000000000a/r.pdf');
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.pro_reports) <> 0 THEN RAISE EXCEPTION 'ÉCHEC : B voit le rapport de A'; END IF;
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'pro-reports') <> 0 THEN RAISE EXCEPTION 'ÉCHEC : B voit le PDF de A'; END IF;
END $$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
DO $$ BEGIN
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'pro-reports') <> 1 THEN RAISE EXCEPTION 'ÉCHEC : A ne voit pas son PDF'; END IF;
END $$;
RESET ROLE;

-- Dépôts : chacun ne lit que les siens ; les annexes rangées par ISIN restent lisibles.
INSERT INTO storage.objects (bucket_id, name) VALUES ('pro-annexes', 'FR0010592022/abc.pdf');
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
DO $$ BEGIN
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'pro-annexes' AND name LIKE 'inbox/%') <> 0 THEN
    RAISE EXCEPTION 'ÉCHEC : B voit le dépôt de A';
  END IF;
  IF (SELECT count(*) FROM storage.objects WHERE name = 'FR0010592022/abc.pdf') <> 1 THEN
    RAISE EXCEPTION 'ÉCHEC : annexe publique illisible';
  END IF;
END $$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
DO $$ BEGIN
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'pro-annexes' AND name LIKE 'inbox/%') <> 1 THEN
    RAISE EXCEPTION 'ÉCHEC : A ne voit pas son dépôt';
  END IF;
END $$;
RESET ROLE;

SELECT 'OK — RLS et immutabilité Pro vérifiées' AS result;
