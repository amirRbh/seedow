-- Seedow Pro — confidentialité des dépôts d'annexes.
-- Les annexes rangées par ISIN (`<isin>/<sha256>.pdf`) sont des documents
-- publics : lisibles par tout utilisateur authentifié. Les dossiers de dépôt
-- (`inbox/`, `processed/`, `failed/`) sont rangés par uid : chacun ne lit que
-- les siens (le chemin révèle qui a déposé quoi).
DROP POLICY IF EXISTS "pro-annexes read by authenticated" ON storage.objects;
CREATE POLICY "pro-annexes read by authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pro-annexes'
    AND (
      (storage.foldername(name))[1] NOT IN ('inbox', 'processed', 'failed')
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  );
