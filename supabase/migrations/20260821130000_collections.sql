-- ─────────────────────────────────────────────────────────────────────────────
-- PIU — Collections (pivot Personal Investment Universe, §8/§12).
--
-- Une COLLECTION est une liste nommée, pondérée et jetable d'actifs que
-- l'utilisateur construit LUI-MÊME, sans optimisation automatique. C'est le cœur
-- du nouveau parcours : EXPLORE → SELECT → [COLLECTION] → IMPACT. Le portefeuille
-- optimisé (`portfolios`) n'est PAS supprimé — une collection pourra être promue
-- en portefeuille plus tard (colonne `source_collection_id` à ajouter côté
-- portfolios, hors de cette migration).
--
-- Poids LIBRES (l'utilisateur décide) : trois modes — 'equal' (défaut, le plus
-- honnête), 'manual' (poids saisis), 'amount' (montants → poids dérivés). La
-- somme peut ≠ 100 % ; on ne corrige jamais en silence (calcul des poids
-- effectifs côté app, lib/collections/model.ts).
--
-- `watchlists` n'est PAS supprimée ici (migration additive, sans risque) : une
-- watchlist pourra être importée comme collection 'equal' côté app.
--
-- RLS activée (§1.4). Écritures scopées à la propriété de la collection.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.collection_weight_mode AS ENUM ('equal', 'manual', 'amount');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.collections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL DEFAULT 'Ma collection'
    CHECK (char_length(name) BETWEEN 1 AND 120),
  weight_mode public.collection_weight_mode NOT NULL DEFAULT 'equal',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS collections_user_idx ON public.collections (user_id, created_at DESC);
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own collections" ON public.collections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own collections" ON public.collections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own collections" ON public.collections
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own collections" ON public.collections
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
CREATE TRIGGER collections_updated_at BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.collection_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  asset_id      uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  -- Poids saisi (mode 'manual'), en %. NULL sinon (dérivé côté app).
  weight_pct    numeric(7,4) CHECK (weight_pct IS NULL OR (weight_pct >= 0 AND weight_pct <= 100)),
  -- Montant (mode 'amount'), devise du compte. NULL sinon.
  amount        numeric CHECK (amount IS NULL OR amount >= 0),
  note          text CHECK (note IS NULL OR char_length(note) <= 500),
  added_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, asset_id)
);
CREATE INDEX IF NOT EXISTS collection_items_collection_idx
  ON public.collection_items (collection_id, added_at DESC);
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- Propriété via la collection parente (une seule vérification, réutilisée).
CREATE POLICY "users read own collection items" ON public.collection_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.collections c
            WHERE c.id = collection_id AND c.user_id = auth.uid()));
CREATE POLICY "users insert own collection items" ON public.collection_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.collections c
            WHERE c.id = collection_id AND c.user_id = auth.uid()));
CREATE POLICY "users update own collection items" ON public.collection_items
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.collections c
            WHERE c.id = collection_id AND c.user_id = auth.uid()))
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.collections c
            WHERE c.id = collection_id AND c.user_id = auth.uid()));
CREATE POLICY "users delete own collection items" ON public.collection_items
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.collections c
            WHERE c.id = collection_id AND c.user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_items TO authenticated;
GRANT ALL ON public.collection_items TO service_role;

-- Garde-fou : bornes raisonnables pour qu'un client scripté ne gonfle pas les
-- tables. 50 collections / utilisateur, 200 lignes / collection.
CREATE OR REPLACE FUNCTION public.enforce_collection_limits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  IF TG_TABLE_NAME = 'collections' THEN
    SELECT count(*) INTO v_count FROM public.collections WHERE user_id = NEW.user_id;
    IF v_count >= 50 THEN
      RAISE EXCEPTION 'too many collections (max 50)';
    END IF;
  ELSIF TG_TABLE_NAME = 'collection_items' THEN
    SELECT count(*) INTO v_count FROM public.collection_items WHERE collection_id = NEW.collection_id;
    IF v_count >= 200 THEN
      RAISE EXCEPTION 'too many items in collection (max 200)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER collections_limit BEFORE INSERT ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.enforce_collection_limits();
CREATE TRIGGER collection_items_limit BEFORE INSERT ON public.collection_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_collection_limits();

COMMENT ON TABLE public.collections IS
  'PIU — collection nommée et pondérée construite par l''utilisateur, sans optimisation. RLS auth.uid().';
COMMENT ON TABLE public.collection_items IS
  'PIU — ligne d''une collection (actif + poids/montant libre). Poids effectifs dérivés côté app.';
