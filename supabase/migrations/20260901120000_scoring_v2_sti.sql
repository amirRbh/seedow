-- ═════════════════════════════════════════════════════════════════════════════
-- SCORING V2 — Indice de transparence Seedow (STI 2.0), constats d'écart
-- opposables, entités-fonds dédupliquées et gouvernance du droit de réponse.
--
-- Ce que cette migration acte, côté données :
--
--  1. L'entité de référence devient le FONDS, plus la ligne de cotation. Les
--     parts de classe (Acc/Dist, devise, couverture) sont des attributs. Deux
--     scores différents pour le même fonds selon la ligne récupérée est le
--     défaut qui décrédibilise le plus vite : il se vérifie en dix secondes.
--
--  2. Chaque point du STI remonte à un SIGNAL horodaté et sourcé
--     (`fund_transparency_signals`). Trois statuts, et le troisième n'est pas un
--     zéro : `publie` / `absent` (fait sur le FONDS) / `non_verifie` (fait sur
--     SEEDOW). Confondre les deux derniers ferait payer au fonds les trous de
--     collecte de Seedow — c'est ce qui rendait 59 constats de la v1
--     attaquables.
--
--  3. Un constat d'écart n'existe que s'il porte simultanément une
--     revendication sourcée et datée, un fait sourcé et daté qui la contredit,
--     et sa limite explicite (« ce que ce constat ne dit pas »). Les contraintes
--     CHECK ci-dessous rendent cette règle non contournable : un constat
--     incomplet ne peut pas atteindre l'état `publie`.
--
--  4. Droit de réponse (§8 de la spec). Notification préalable, réponse publiée
--     intégralement, correction sous 48 h — et jamais de suppression
--     silencieuse : `fund_discrepancy_events` conserve l'historique.
--
-- 100 % additif : aucune table existante n'est touchée, aucun score v1 n'est
-- effacé en base (le retrait se joue à l'affichage, cf. routes /observatoire et
-- /fonds/$isin). RLS activée sur les quatre tables (CLAUDE.md §1.4).
-- ═════════════════════════════════════════════════════════════════════════════

-- ---------- Types ----------
DO $$ BEGIN
  -- `absent` ≠ `non_verifie` : toute la rigueur de la v2 tient dans cette nuance.
  CREATE TYPE public.sti_signal_status AS ENUM ('publie', 'absent', 'non_verifie');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sti_signal_method AS ENUM ('extraction_llm', 'saisie_manuelle', 'resolution_url');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- Typologie FERMÉE. Toute observation qui n'entre dans aucun de ces cinq
  -- types n'est pas publiée comme constat — c'est ce qui fait passer le
  -- catalogue de 67 « écarts » à 8 constats opposables.
  CREATE TYPE public.discrepancy_code AS ENUM ('E1', 'E2', 'E3', 'E4', 'E5');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.discrepancy_state AS ENUM ('brouillon', 'notifie', 'publie', 'conteste', 'retire');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- 1. Entités-fonds (déduplication) ----------
CREATE TABLE IF NOT EXISTS public.fund_entities (
  entity_key       text PRIMARY KEY,        -- 'emetteur|strategie|indice' (cf. fund-entity.ts)
  name             text NOT NULL,
  issuer           text,
  benchmark_index  text,                    -- indice répliqué, quand l'émetteur le publie
  asset_class      text,
  isins            text[] NOT NULL DEFAULT '{}',
  tickers          text[] NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.fund_entities IS
  'Une ligne = un FONDS, pas une part de classe. Les ISIN des parts (Acc/Dist, devises, couverture) sont listés dans `isins` : une seule fiche, un seul STI.';
CREATE INDEX IF NOT EXISTS fund_entities_issuer_idx ON public.fund_entities (issuer);
ALTER TABLE public.fund_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fund_entities readable by authenticated" ON public.fund_entities
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.fund_entities TO authenticated;
GRANT ALL ON public.fund_entities TO service_role;
CREATE TRIGGER fund_entities_updated_at BEFORE UPDATE ON public.fund_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 2. Signaux de transparence (le grain du STI) ----------
CREATE TABLE IF NOT EXISTS public.fund_transparency_signals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_key       text NOT NULL REFERENCES public.fund_entities(entity_key) ON DELETE CASCADE,
  signal           text NOT NULL,                       -- id stable (cf. STI_SIGNAL_IDS)
  statut           public.sti_signal_status NOT NULL DEFAULT 'non_verifie',
  valeur           text,                                -- bloc B : 'seuil_quantifie' | 'declare_sans_seuil'
  source_url       text,
  source_document  text,
  date_donnee      date,                                -- date du DOCUMENT
  date_collecte    date,                                -- date de la collecte Seedow
  methode          public.sti_signal_method,
  /* Un signal publié sans source n'est pas vérifiable par un tiers : il n'aurait
     pas dû être saisi. La contrainte l'interdit plutôt que de compter le point. */
  CONSTRAINT fund_transparency_signals_published_sourced
    CHECK (statut <> 'publie' OR source_document IS NOT NULL OR source_url IS NOT NULL),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_key, signal)
);
COMMENT ON COLUMN public.fund_transparency_signals.statut IS
  'publie = le document existe. absent = recherche menée, le fonds ne publie pas (fait sur le fonds, coûte des points). non_verifie = la source n''a pas pu être atteinte (fait sur Seedow, rend le bloc NUL et non zéro).';
CREATE INDEX IF NOT EXISTS fund_transparency_signals_entity_idx
  ON public.fund_transparency_signals (entity_key);
ALTER TABLE public.fund_transparency_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fund_transparency_signals readable by authenticated" ON public.fund_transparency_signals
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.fund_transparency_signals TO authenticated;
GRANT ALL ON public.fund_transparency_signals TO service_role;
CREATE TRIGGER fund_transparency_signals_updated_at BEFORE UPDATE ON public.fund_transparency_signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 3. Constats d'écart ----------
CREATE TABLE IF NOT EXISTS public.fund_discrepancies (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_key             text NOT NULL REFERENCES public.fund_entities(entity_key) ON DELETE CASCADE,
  code                   public.discrepancy_code NOT NULL,
  state                  public.discrepancy_state NOT NULL DEFAULT 'brouillon',
  -- Élément 1 : la revendication du fonds, citée, sourcée, datée.
  claim_text             text NOT NULL,
  claim_document         text,
  claim_url              text,
  claim_date             date,
  -- Élément 2 : le fait public qui la contredit, sourcé, daté.
  fact_text              text NOT NULL,
  fact_document          text,
  fact_url               text,
  fact_date              date,
  -- Élément 3 : la limite explicite. Obligatoire — c'est elle qui distingue un
  -- constat d'une accusation.
  limit_text             text NOT NULL,
  -- Gouvernance (§8) : notifié avant publication, réponse publiée intégralement.
  notified_at            date,
  issuer_response        text,
  issuer_response_at     date,
  retracted_at           timestamptz,
  retraction_reason      text,
  methodology_version    text NOT NULL DEFAULT '2.0',
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  /* Un constat ne peut PAS sortir de l'état brouillon sans ses trois éléments
     complets ET sans notification préalable à l'émetteur. La règle vit ici, pas
     seulement dans le code applicatif : c'est la protection juridique. */
  CONSTRAINT fund_discrepancies_opposable
    CHECK (
      state = 'brouillon'
      OR (
        claim_document IS NOT NULL AND claim_date IS NOT NULL
        AND fact_document IS NOT NULL AND fact_date IS NOT NULL
        AND length(btrim(limit_text)) > 0
        AND notified_at IS NOT NULL
      )
    ),
  CONSTRAINT fund_discrepancies_disputed_has_response
    CHECK (state <> 'conteste' OR issuer_response IS NOT NULL),
  CONSTRAINT fund_discrepancies_retracted_traced
    CHECK (state <> 'retire' OR (retracted_at IS NOT NULL AND retraction_reason IS NOT NULL))
);
COMMENT ON TABLE public.fund_discrepancies IS
  'Constats d''écart, typologie fermée E1–E5. Jamais agrégés en score : un fonds peut avoir un STI de 90 et un constat — cela veut dire qu''il publie beaucoup, et que dans ce qu''il publie il y a une contradiction.';
CREATE INDEX IF NOT EXISTS fund_discrepancies_entity_idx ON public.fund_discrepancies (entity_key);
CREATE INDEX IF NOT EXISTS fund_discrepancies_state_idx ON public.fund_discrepancies (state);
ALTER TABLE public.fund_discrepancies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fund_discrepancies readable by authenticated" ON public.fund_discrepancies
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.fund_discrepancies TO authenticated;
GRANT ALL ON public.fund_discrepancies TO service_role;
CREATE TRIGGER fund_discrepancies_updated_at BEFORE UPDATE ON public.fund_discrepancies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 4. Historique — on ne supprime jamais silencieusement ----------
CREATE TABLE IF NOT EXISTS public.fund_discrepancy_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discrepancy_id uuid NOT NULL REFERENCES public.fund_discrepancies(id) ON DELETE CASCADE,
  from_state     public.discrepancy_state,
  to_state       public.discrepancy_state NOT NULL,
  note           text,
  occurred_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.fund_discrepancy_events IS
  'Trace des changements d''état d''un constat (notification, contestation, correction). Un constat corrigé est retiré de l''affichage mais reste ici : ne jamais supprimer silencieusement (§8).';
CREATE INDEX IF NOT EXISTS fund_discrepancy_events_parent_idx
  ON public.fund_discrepancy_events (discrepancy_id, occurred_at DESC);
ALTER TABLE public.fund_discrepancy_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fund_discrepancy_events readable by authenticated" ON public.fund_discrepancy_events
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.fund_discrepancy_events TO authenticated;
GRANT ALL ON public.fund_discrepancy_events TO service_role;

-- Chaque transition d'état s'inscrit toute seule : une trace qu'il faut penser à
-- écrire est une trace qui manquera le jour où elle compte.
CREATE OR REPLACE FUNCTION public.log_discrepancy_state_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.fund_discrepancy_events (discrepancy_id, from_state, to_state, note)
    VALUES (NEW.id, NULL, NEW.state, 'création');
  ELSIF NEW.state IS DISTINCT FROM OLD.state THEN
    INSERT INTO public.fund_discrepancy_events (discrepancy_id, from_state, to_state, note)
    VALUES (NEW.id, OLD.state, NEW.state, NEW.retraction_reason);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fund_discrepancies_state_log ON public.fund_discrepancies;
CREATE TRIGGER fund_discrepancies_state_log
  AFTER INSERT OR UPDATE OF state ON public.fund_discrepancies
  FOR EACH ROW EXECUTE FUNCTION public.log_discrepancy_state_change();

-- ---------- 5. Versionnage public de la grille ----------
CREATE TABLE IF NOT EXISTS public.sti_methodology_versions (
  version     text PRIMARY KEY,
  published_at date NOT NULL,
  changelog   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.sti_methodology_versions IS
  'Toute modification de la grille produit une nouvelle version numérotée, avec changelog public et recalcul complet du catalogue (§8). Les scores portent leur numéro de version.';
ALTER TABLE public.sti_methodology_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sti_methodology_versions readable by authenticated" ON public.sti_methodology_versions
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.sti_methodology_versions TO authenticated;
GRANT ALL ON public.sti_methodology_versions TO service_role;

INSERT INTO public.sti_methodology_versions (version, published_at, changelog)
VALUES (
  '2.0',
  '2026-09-01',
  'Abandon du score de durabilité 0–100. Remplacé par l''indice de transparence Seedow (STI) : cinq blocs de faits documentaires (documentation accessible, précision des exclusions, métriques d''impact publiées, fraîcheur, vérification tierce), règle d''abstention (un bloc non évaluable rend le bloc nul, il ne vaut pas zéro), publication conditionnée à 4 blocs sur 5 dont A et B. Typologie des constats ramenée à cinq types opposables (E1–E5), notification préalable et droit de réponse. Pourcentages thématiques supprimés au profit de trois niveaux sourcés. Déduplication des parts de classe.'
)
ON CONFLICT (version) DO NOTHING;
