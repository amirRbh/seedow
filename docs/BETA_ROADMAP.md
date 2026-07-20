# Seedow — Feuille de route beta ouverte (standards fintech 2026)

> Audit point par point de l'app contre les standards Revolut/Stripe/Cash App,
> en gardant l'identité ESG/anti-greenwashing. Chaque item : état actuel,
> recommandation, effort (rapide / moyen / structurant), impact rétention J7.
>
> Légende : ✅ existait déjà · 🆕 implémenté dans cette itération · 🔜 à faire.

## Priorisation impact J7 (résumé exécutif)

| Priorité | Item | Effort | Pourquoi J7 |
|---|---|---|---|
| P0 | 🆕 Quick win pré-auth (recherche ESG + badge greenwashing sur la landing) | moyen | Convertit la waitlist en comptes activés — sans activation, pas de J7 |
| P0 | 🆕 Watchlist + carte dashboard | moyen | Crée la raison de revenir (suivre → alerte → retour) |
| P0 | 🆕 Instrumentation `app_events` + vues rétention J1/J7 | rapide | On ne peut pas améliorer ce qu'on ne mesure pas |
| P1 | 🆕 Badges transparence + risque greenwashing + « D'où vient ce chiffre ? » | moyen | Différenciateur confiance = raison de rester |
| P1 | 🆕 Magic link | rapide | -1 friction à l'entrée et au retour |
| P1 | 🔜 Alertes greenwashing temps réel sur la watchlist | moyen | Transforme la watchlist en moteur de notifications |
| P2 | 🔜 Ethi proactif + mémoire + réponses structurées | structurant | Rétention long terme, pas critique J7 |
| P2 | 🔜 Dashboard adaptatif (scoring d'engagement) | structurant | Utile quand il y aura assez de modules concurrents |
| P2 | 🔜 Comparateur côte à côte, parrainage, éditorial in-app | moyen | Croissance/engagement, après le socle |

---

## 1. Onboarding & première impression

- ✅ **Flow progressif 1 écran = 1 décision** : `src/routes/onboarding.tsx` (valeurs → exclusions → objectif → montant), preview d'allocation AVANT le mur d'inscription, brouillon persisté en sessionStorage.
- ✅ **Micro-questionnaire qui reconfigure le produit** : les réponses (causes, exclusions) paramètrent réellement la génération de portefeuille et les alertes — pas un formulaire ignoré.
- 🆕 **Quick win pré-auth** : widget `EsgQuickCheck` sur la landing + endpoint public `/api/public/esg-preview` (caché en edge). Chercher un fonds → score ESG + risque greenwashing en <10 s, sans compte.
- 🆕 **Passwordless** : magic link (`signInWithOtp`) dans `/auth`, sans création de compte silencieuse en mode connexion (la capacité bêta reste contrôlée au signup).
- 🔜 **Biométrie au retour** (rapide, quand app installable) : WebAuthn/passkeys via Supabase Auth — à activer quand la PWA sera déclarée (manifest + service worker).

## 2. Dashboard adaptatif & hiérarchie

- ✅ Hiérarchie actuelle : valeur → impact → allocation → prochaine étape unique (`NextStepCard`) → alertes dans le header.
- 🆕 **Watchlist sur le dashboard** avec état vide guidant vers Découvrir.
- 🆕 **Traçabilité** : lien « D'où vient ce chiffre ? » (`SourceLink` → `/methodologie`) sous les scores ESG de la fiche actif. À généraliser à chaque KPI ESG affiché (rapide, composant prêt).
- 🔜 **Score de confiance unique en haut** (moyen) : un seul état synthétique (score ESG pondéré × couverture données × alertes ouvertes) au-dessus de la valeur €. Proposition : `trust = esg_portefeuille × (1 − pénalité_alertes) × facteur_couverture`, affiché comme lettre (A–E) cliquable vers le détail.
- 🔜 **Dashboard adaptatif par engagement** (structurant) : les données existent déjà (`app_events` : `asset_viewed`, `alert_opened`, `ethi_message_sent`). Étape 1 simple : une vue SQL `user_module_affinity` (compte d'événements par module sur 14 j) + réordonnancement des sections. À ne faire que quand il y aura >5 modules concurrents — aujourd'hui la hiérarchie fixe est un choix éditorial assumé.

## 3. Ethi — de chatbot à copilote

- ✅ Briefing proactif à l'ouverture (diagnostics pré-calculés côté client, jamais inventés par le LLM), chips de suggestion, simulateur dédié (le LLM n'a pas le droit de calculer les intérêts composés), garde-fous non-conseil stricts, rate-limit DB.
- 🆕 Événement `ethi_message_sent` pour mesurer l'usage réel.
- 🔜 **Insights non sollicités** (moyen) : le canal existe déjà — la table `alerts` + `deriveCandidates()`. Ajouter des dérivations watchlist (« 3 fonds de ta watchlist ont un score en baisse ») quand l'historique de scores existera (cf. §4 alertes).
- 🔜 **Mémoire utilisateur** (rapide) : injecter causes/exclusions/watchlist dans le contexte JSON déjà envoyé à `/api/ethi` — le mécanisme `context` est en place, c'est un enrichissement de payload.
- 🔜 **Réponses structurées** (moyen) : passer la réponse du gateway en JSON contraint (`{ text, cards?: [...] }`) et rendre les cards côté `EthiBubble`. Garder le texte court par défaut + bouton « approfondir » (le prompt impose déjà 3 blocs courts).

## 4. Fonctionnalités différenciantes

- ✅ **Simulateur « et si »** : preview d'allocation pré-inscription (onboarding) + `SimulationForm` dans Ethi + slider d'impact dans la fiche actif.
- ✅ **Comparateur vs marché** : `/comparatif` (vs MSCI World : perf, frais, impact).
- 🆕 **Badge de transparence par fonds** : `DataCoverageBadge` — « données complètes / partielles / estimées », calculé depuis la nullabilité réelle des champs fournisseur (`src/lib/esg/transparency.ts`, testé).
- 🆕 **Risque greenwashing par fonds** : heuristique de cohérence revendications (SFDR, thèmes verts) vs données (scores, exclusions, carbone), TOUJOURS accompagnée de ses raisons en clair — un drapeau argumenté, pas un verdict opaque.
- 🆕 **Watchlist** : table `watchlists` (RLS, plafond anti-abus), hook optimiste avec toast, bouton Suivre dans la fiche actif.
- 🔜 **Alertes greenwashing temps réel** (moyen, prochaine brique prioritaire) : historiser `esg_score`/`sfdr_article` (table `asset_score_history` alimentée par le cron horaire existant), puis un job qui compare et insère dans `alerts` pour chaque utilisateur ayant l'actif en watchlist. Tout le rail de notification (bell, dedup, sévérité) existe déjà.
- 🔜 **Comparateur côte à côte** (moyen) : route `/comparer?a=X&b=Y`, réutilise `DiscoverAsset` + badges transparence ; mise en évidence des écarts (score, TER, SFDR revendiqué vs risque calculé).
- 🔜 **Éditorial dans le flow** (moyen) : table `editorial_articles(asset_tickers text[])` + card contextuelle dans la fiche actif quand un article (Greenwashing Watchdog, Rapport Annuel Décrypté) concerne le fonds consulté.

## 5. Design system & micro-interactions

- ✅ Dark mode natif (classe `.dark` appliquée avant hydratation, tokens oklch dans `src/styles.css`), bottom nav 5 destinations, tokens typographiques documentés, focus rings, skeletons.
- 🆕 Micro-interactions watchlist : toggle optimiste, étoile remplie + scale, toast systématique — jamais d'action silencieuse.
- 🔜 **Audit AA systématique** (rapide) : passer axe-core sur les 6 écrans principaux ; vérifier notamment les text-tag/text-caption sur fonds teintés.
- 🔜 Tailles de police ajustables (rapide) : exposer un multiplicateur `rem` dans Réglages (les tokens sont déjà en `rem`).

## 6. Confiance & conformité

- ✅ Disclaimers non-conseil : onboarding, Ethi (bandeau permanent + interdictions dans le prompt système), mode démo affiché en continu (`BetaBanner`). Pages CGU/confidentialité/mentions légales/méthodologie.
- 🆕 Traçabilité par donnée : `SourceLink` sous les scores + section « Transparence des données » dans chaque fiche actif.
- 🆕 Le disclaimer figure aussi sur le widget public de la landing.
- 🔜 **RGPD dès l'onboarding** (rapide) : une ligne « Tes réponses restent chez toi — chiffrées, jamais vendues » avec lien `/confidentialite` sur l'écran compte de l'onboarding.

## 7. Mécaniques beta ouverte

- ✅ Feedback in-app flottant sur tous les écrans authentifiés (NPS + 2 questions), capacité bêta + waitlist avec position réelle, admin beta.
- 🆕 **Instrumentation des événements clés** : `app_events` (RLS, payload borné, rate-limité en DB) + événements branchés : `search_performed`, `asset_viewed`, `watchlist_added/removed`, `alert_opened`, `ethi_message_sent`, `feedback_submitted`. L'activation « portefeuille créé » est déjà tracée par trigger dans `decision_events`.
- 🆕 **Vues rétention** : `beta_retention_cohorts` (cohortes par jour de premier événement, J1 exact, J7 fenêtre J+5→J+9).
- 🆕 États vides intelligents : watchlist (dashboard). ✅ déjà présents : portefeuille vide, screener vide, alertes vides.
- 🔜 **Parrainage** (moyen) : `referral_code` sur `profiles` + `?ref=` sur la landing + attribution à l'inscription + boost de position waitlist pour le parrain. La waitlist existante est l'actif à exploiter.
- 🔜 Réduire le feedback à 1 clic (rapide) : premier écran = 👍/👎 contextuel, le formulaire NPS seulement en second niveau.

## 8. Performance

- ✅ TanStack Query avec `staleTime` sur l'univers d'actifs, rendu incrémental du screener (IntersectionObserver, pages de 30), skeletons dashboard, SSR edge Cloudflare.
- 🆕 **Cache edge des données ESG publiques** : `/api/public/esg-preview` avec `s-maxage=3600, stale-while-revalidate=86400` — une requête DB par heure et par PoP, pas par visiteur.
- 🔜 **Budget <1 s perçu** (rapide) : mesurer TTFB + LCP réels via l'endpoint `client_errors` existant élargi aux web vitals, avant d'optimiser à l'aveugle.
- 🔜 Lazy import de Recharts (rapide) : `React.lazy` sur les graphiques du portfolio/comparatif — Recharts est le plus gros chunk non critique.

---

## Notes d'implémentation de cette itération

- Migration : `supabase/migrations/20260720100000_watchlist_and_app_events.sql`. Les types
  `src/integrations/supabase/types.ts` étant générés par Lovable Cloud, les accès aux
  nouvelles tables passent temporairement par un client non typé (casts localisés et
  commentés dans `useWatchlist` / `appEvents`) — à retirer après régénération des types.
- L'heuristique greenwashing est volontairement conservatrice et explicable : chaque
  drapeau est accompagné de ses raisons (`transparency.reasons.*`) dans l'UI. Elle ne
  s'améliorera qu'avec l'historisation des scores (cf. §4).
