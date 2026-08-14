CREATE TABLE public.agm_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  ticker text,
  theme text,
  title text NOT NULL,
  summary text NOT NULL,
  for_label text NOT NULL,
  against_label text NOT NULL,
  funds_stance text NOT NULL,
  source_name text NOT NULL,
  source_url text NOT NULL,
  meeting_date date NOT NULL,
  closes_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  outcome_pct numeric,
  outcome_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.agm_resolutions TO anon;
GRANT SELECT ON public.agm_resolutions TO authenticated;
GRANT ALL ON public.agm_resolutions TO service_role;

ALTER TABLE public.agm_resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resolutions are publicly readable"
  ON public.agm_resolutions FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage resolutions"
  ON public.agm_resolutions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER agm_resolutions_updated_at
  BEFORE UPDATE ON public.agm_resolutions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.resolution_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resolution_id uuid NOT NULL REFERENCES public.agm_resolutions(id) ON DELETE CASCADE,
  choice text NOT NULL CHECK (choice IN ('for','against','abstain')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resolution_id)
);

CREATE INDEX resolution_votes_resolution_idx ON public.resolution_votes (resolution_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resolution_votes TO authenticated;
GRANT ALL ON public.resolution_votes TO service_role;

ALTER TABLE public.resolution_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own votes"
  ON public.resolution_votes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own votes"
  ON public.resolution_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own votes"
  ON public.resolution_votes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own votes"
  ON public.resolution_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER resolution_votes_updated_at
  BEFORE UPDATE ON public.resolution_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.agm_resolutions
  (company, ticker, theme, title, summary, for_label, against_label, funds_stance, source_name, source_url, meeting_date, closes_at, status, outcome_pct, outcome_note)
VALUES
  ('TotalEnergies', 'TTE', 'climat',
   'Alignement des investissements avec l''Accord de Paris',
   'Une résolution externe demande au groupe de publier une trajectoire d''investissement compatible avec un réchauffement limité à 1,5 °C, incluant les projets pétroliers et gaziers nouveaux.',
   'Publier une trajectoire alignée 1,5 °C',
   'Conserver la stratégie actuelle',
   'La majorité des grands gérants d''actifs a voté contre ou s''est abstenue lors des exercices précédents.',
   'Avis de convocation AG TotalEnergies',
   'https://totalenergies.com/fr/actionnaires/assemblee-generale',
   '2026-05-22', '2026-05-20 12:00:00+00', 'open', NULL, NULL),
  ('Amazon', 'AMZN', 'humain',
   'Rapport indépendant sur les conditions de travail en entrepôt',
   'La résolution demande un audit indépendant des accidents du travail et des cadences dans les centres logistiques, avec publication des résultats.',
   'Commander un audit indépendant',
   'Rejeter la demande d''audit',
   'Les positions des grands gérants sont partagées ; plusieurs fonds indiciels ont voté contre.',
   'Proxy statement Amazon (SEC DEF 14A)',
   'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=AMZN&type=DEF+14A',
   '2026-05-27', '2026-05-25 12:00:00+00', 'open', NULL, NULL),
  ('Nestlé', 'NESN', 'biodiversite',
   'Objectifs contraignants sur la déforestation importée',
   'La résolution propose de rendre publics des objectifs chiffrés et vérifiables sur les chaînes d''approvisionnement à risque (cacao, huile de palme, soja).',
   'Adopter des objectifs contraignants',
   'S''en tenir aux engagements volontaires',
   'Les principaux fonds ont majoritairement suivi la recommandation du conseil.',
   'Rapport d''assemblée générale Nestlé',
   'https://www.nestle.com/investors/shareholder-meetings',
   '2026-04-16', '2026-04-14 12:00:00+00', 'closed', 21.4,
   'La résolution a recueilli une minorité de voix ; le conseil a maintenu ses engagements volontaires.');