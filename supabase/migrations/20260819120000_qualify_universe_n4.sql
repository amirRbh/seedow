-- ─────────────────────────────────────────────────────────────────────────────
-- N4 — Qualification de l'univers d'investissement (feuille de route méthodo V2).
--
-- Ajoute les champs manquants pour juger l'INVESTISSABILITÉ réelle d'un fonds
-- pour un particulier européen, et pour DÉDUPLIQUER les share-classes.
--
-- Contrat de transparence (CLAUDE.md §1.2/§1.3, non négociable) : ces colonnes
-- sont NULLABLES et laissées à NULL. NULL = « inconnu, donc non affirmé » — on ne
-- remplit JAMAIS une valeur inventée (AUM, liquidité, éligibilité). Elles seront
-- renseignées par des ingestions sourcées ultérieures, avec attribution.
--
-- Aucune donnée insérée ici. Aucune table utilisateur touchée → pas d'impact RLS
-- (les colonnes héritent des policies existantes de `public.assets`).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.assets
  -- Encours du fonds (AUM) en EUR. Filtre de liquidité/pérennité (un fonds à très
  -- faible encours est peu investissable et peut fermer). NULL = inconnu.
  ADD COLUMN IF NOT EXISTS aum_eur numeric NULL,
  -- Disponibilité réelle pour un particulier UE (PEA/CTO/AV). NULL = non vérifié ;
  -- ne jamais présenter un fonds comme disponible sans l'avoir confirmé.
  ADD COLUMN IF NOT EXISTS available_eu boolean NULL,
  -- Note de liquidité libre et sourcée (ex. « spread ~5 bps, volume quotidien
  -- élevé, source Xetra 2026-06 »). Texte tracé, pas un chiffre inventé.
  ADD COLUMN IF NOT EXISTS liquidity_note text NULL,
  -- Déduplication des share-classes : pointe vers l'actif CANONIQUE quand cette
  -- ligne est une autre classe de parts (Acc/Dist, devise couverte…) du même
  -- fonds. NULL = actif canonique ou lien non établi. Auto-référence.
  ADD COLUMN IF NOT EXISTS share_class_of uuid NULL REFERENCES public.assets(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.assets.aum_eur IS
  'Encours (AUM) en EUR. NULL = inconnu (jamais inventé) — N4 qualification univers.';
COMMENT ON COLUMN public.assets.available_eu IS
  'Disponible pour un particulier UE (PEA/CTO/AV). NULL = non vérifié — N4.';
COMMENT ON COLUMN public.assets.liquidity_note IS
  'Note de liquidité sourcée et tracée. NULL = inconnu — N4.';
COMMENT ON COLUMN public.assets.share_class_of IS
  'Actif canonique si cette ligne est une autre share-class du même fonds. NULL = canonique — N4 déduplication.';

-- Index pour filtrer rapidement l'univers investissable et lister les share-classes.
CREATE INDEX IF NOT EXISTS assets_available_eu_idx ON public.assets (available_eu)
  WHERE available_eu IS TRUE;
CREATE INDEX IF NOT EXISTS assets_share_class_of_idx ON public.assets (share_class_of)
  WHERE share_class_of IS NOT NULL;
