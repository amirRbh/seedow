-- ─────────────────────────────────────────────────────────────────────────────
-- Ton Argent Vote — le Bloc actionnarial.
--
-- Deux tables :
--   1. `agm_resolutions` : résolutions d'assemblée générale soumises au vote
--      (donnée publique, sourcée — §1.2). Lecture ouverte, écriture réservée
--      au service_role (équipe éditoriale). AUCUN chiffre inventé : chaque
--      ligne porte sa source et sa date.
--   2. `resolution_votes` : l'intention de vote d'un utilisateur sur une
--      résolution. Une ligne = un utilisateur × une résolution. RLS scopée
--      auth.uid(), écritures bornées (rate limit) au niveau DB car les inserts
--      viennent directement du client.
--
-- Le « Bloc » (décompte agrégé affiché à tous) n'est PAS exposé via une vue
-- security_invoker : la RLS de resolution_votes ne laisserait voir à chacun que
-- son propre vote. L'agrégat est calculé côté serveur avec le service_role
-- (voir src/lib/vote/vote.functions.ts), qui ne renvoie que des comptes — jamais
-- une ligne nominative. Même modèle de sécurité que les vues de rétention bêta.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Résolutions ───────────────────────────────────────────────────────────
CREATE TABLE public.agm_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL CHECK (char_length(company) BETWEEN 1 AND 120),
  ticker text CHECK (ticker IS NULL OR char_length(ticker) <= 16),
  theme text CHECK (theme IS NULL OR char_length(theme) <= 40),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  summary text NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 2000),
  for_label text NOT NULL CHECK (char_length(for_label) BETWEEN 1 AND 300),
  against_label text NOT NULL CHECK (char_length(against_label) BETWEEN 1 AND 300),
  funds_stance text NOT NULL CHECK (char_length(funds_stance) BETWEEN 1 AND 300),
  source_name text NOT NULL CHECK (char_length(source_name) BETWEEN 1 AND 160),
  source_url text NOT NULL CHECK (char_length(source_url) BETWEEN 1 AND 500),
  meeting_date date NOT NULL,
  closes_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  -- Résultat (rempli une fois la résolution close). numeric(5,2) = 0.00 à 100.00.
  outcome_pct numeric(5, 2) CHECK (outcome_pct IS NULL OR (outcome_pct >= 0 AND outcome_pct <= 100)),
  outcome_note text CHECK (outcome_note IS NULL OR char_length(outcome_note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX agm_resolutions_status_idx ON public.agm_resolutions (status, closes_at);

ALTER TABLE public.agm_resolutions ENABLE ROW LEVEL SECURITY;

-- Donnée publique : lisible par tous (y compris aperçu non connecté). Les
-- écritures passent par le service_role (bypass RLS), pas de policy write.
CREATE POLICY "Resolutions are public" ON public.agm_resolutions
  FOR SELECT USING (true);

GRANT SELECT ON public.agm_resolutions TO anon, authenticated;
GRANT ALL ON public.agm_resolutions TO service_role;

-- ── 2. Votes ─────────────────────────────────────────────────────────────────
CREATE TABLE public.resolution_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resolution_id uuid NOT NULL REFERENCES public.agm_resolutions(id) ON DELETE CASCADE,
  choice text NOT NULL CHECK (choice IN ('for', 'against', 'abstain')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resolution_id)
);

CREATE INDEX resolution_votes_resolution_idx ON public.resolution_votes (resolution_id, choice);
CREATE INDEX resolution_votes_user_idx ON public.resolution_votes (user_id, created_at DESC);

ALTER TABLE public.resolution_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own votes" ON public.resolution_votes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users cast own vote" ON public.resolution_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users change own vote" ON public.resolution_votes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users retract own vote" ON public.resolution_votes
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resolution_votes TO authenticated;
GRANT ALL ON public.resolution_votes TO service_role;

-- Garde-fous d'écriture (inserts client direct) :
--   • on ne vote que sur une résolution encore ouverte,
--   • rate limit anti-script (30 votes / minute / utilisateur — large mais borné).
CREATE OR REPLACE FUNCTION public.enforce_resolution_vote_rules()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_open boolean;
  v_allowed boolean;
BEGIN
  SELECT (status = 'open' AND closes_at > now())
    INTO v_open
    FROM public.agm_resolutions
    WHERE id = NEW.resolution_id;

  IF v_open IS NOT TRUE THEN
    RAISE EXCEPTION 'Ce vote est clos.' USING ERRCODE = 'P0001';
  END IF;

  SELECT public.check_and_increment_rate_limit(
    'resolution_vote:' || NEW.user_id::text, 30, 60
  ) INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Trop de votes coup sur coup. Réessaie dans un instant.' USING ERRCODE = 'P0001';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_enforce_resolution_vote_rules
  BEFORE INSERT OR UPDATE ON public.resolution_votes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_resolution_vote_rules();

-- ── 3. Amorçage éditorial ────────────────────────────────────────────────────
-- ⚠️ Données de démonstration. Chaque ligne est sourcée, mais les libellés et
-- surtout tout `outcome_pct` DOIVENT être revérifiés par l'équipe éditoriale
-- avant l'ouverture de la bêta (§1.2 : chaque chiffre sourcé et exact). On ne
-- présente jamais une estimation comme un fait.
INSERT INTO public.agm_resolutions
  (company, ticker, theme, title, summary, for_label, against_label, funds_stance,
   source_name, source_url, meeting_date, closes_at, status, outcome_pct, outcome_note)
VALUES
  (
    'TotalEnergies', 'TTE', 'climat',
    'Aligner la stratégie climat du groupe sur l''Accord de Paris',
    'Une résolution demande au groupe d''adopter une trajectoire de réduction de ses émissions chiffrée, datée et auditée. Voter « pour », c''est exiger un plan vérifiable ; voter « contre », c''est laisser la direction fixer seule le rythme.',
    'Conserver la stratégie actuelle de la direction',
    'Engager une trajectoire de réduction chiffrée et auditée',
    'Par défaut, les grands fonds indiciels votent le plus souvent POUR la direction.',
    'Assemblée générale TotalEnergies',
    'https://totalenergies.com/fr/actionnaires/assemblee-generale',
    date '2027-05-28', timestamptz '2027-05-26 16:00:00+00', 'open', NULL, NULL
  ),
  (
    'Nestlé', 'NESN', 'gouvernance',
    'Conditionner la rémunération variable des dirigeants aux objectifs climat',
    'La résolution propose d''indexer une part du bonus des dirigeants sur l''atteinte réelle des cibles environnementales du groupe. Voter « pour », c''est lier la paie aux résultats climat ; voter « contre », c''est garder le système actuel.',
    'Garder la politique de rémunération actuelle',
    'Indexer la rémunération sur les résultats climat',
    'Les grands gestionnaires d''actifs suivent généralement la recommandation du conseil.',
    'Assemblée générale Nestlé',
    'https://www.nestle.com/investors/annual-general-meeting',
    date '2027-04-15', timestamptz '2027-04-13 16:00:00+00', 'open', NULL, NULL
  ),
  (
    'TotalEnergies', 'TTE', 'climat',
    'Résolution climatique d''actionnaires (exercice précédent)',
    'Exemple d''une résolution climatique déjà soumise au vote lors d''une assemblée passée, conservé pour illustrer un résultat clos. Le pourcentage indiqué est celui rapporté par la source ; à revérifier avant mise en avant.',
    'Conserver la stratégie de la direction',
    'Soutenir la résolution climatique des actionnaires',
    'Les grands fonds avaient majoritairement suivi la direction.',
    'Résultats d''assemblée générale (à revérifier)',
    'https://totalenergies.com/fr/actionnaires/assemblee-generale',
    date '2020-05-29', timestamptz '2020-05-27 16:00:00+00', 'closed', 16.80,
    'Résultat rapporté par la source pour l''exercice concerné. À valider par l''équipe éditoriale avant la bêta.'
  );
