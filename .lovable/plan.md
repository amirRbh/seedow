# Mesurer le funnel pré-compte + convertir la landing

Deux chantiers issus de l'analyse des 7 derniers jours : 75 % des visiteurs quittent `/` sans cliquer, et tout ce qui se passe avant la création de compte est aujourd'hui invisible dans les données.

## Constat vérifié

- 54 visiteurs, 148 pages vues. Parcours : `/` 48 → `/auth` 12 → `/onboarding` 11 → `/dashboard` 10 → `/portfolio` 4.
- Côté base sur la même période : 1 inscription, 3 portefeuilles, 3 `allocation_seen`, 3 `allocation_accepted`.
- `trackPreference` et `trackAppEvent` sortent immédiatement quand il n'y a pas de session (`if (!userId) return`). Les 11 visites d'onboarding ne laissent donc que 3 traces : impossible de savoir à quelle étape les autres abandonnent.
- Sur la landing, le bouton d'en-tête pointe vers `/onboarding` sans `guest: true`, alors que le CTA du hero le passe. Deux comportements différents pour la même intention.

## Chantier 1 — Rendre le funnel pré-compte mesurable

**Événements anonymes.** Lever le blocage pré-auth : quand il n'y a pas de session, on écrit quand même l'événement, rattaché au `session_id` déjà généré (`seedow.pref.session`) plutôt qu'à un `user_id`. Cela suppose de rendre `user_id` optionnel sur `preference_events` et `app_events`, d'ajouter une politique d'insertion pour les visiteurs anonymes, et de borner le débit par session (les triggers de rate limit actuels s'appuient sur `user_id`, ils doivent basculer sur la session quand l'utilisateur est anonyme).

**Réconciliation.** À la création de compte, les événements de la session courante sont rattachés au nouvel utilisateur, pour pouvoir dire « ce visiteur a fait 4 étapes puis s'est inscrit ».

**Événements de landing.** Ajouter les jalons manquants : arrivée sur la landing, clic sur chaque CTA (aperçu, connexion, cours), scroll de section. Aujourd'hui aucune interaction sur `/` n'est mesurée, seulement la page vue.

**Vue de lecture.** Une vue SQL d'entonnoir par jour (visiteurs landing → aperçu démarré → étape 1/2/3 → allocation vue → allocation acceptée → compte créé), lisible dans l'admin bêta existante.

## Chantier 2 — Conversion de la landing

- **Un seul chemin d'entrée cohérent** : tous les CTA principaux mènent à l'aperçu invité (`/onboarding` avec `guest: true`), y compris celui de l'en-tête. « Se connecter » redevient une action secondaire discrète.
- **Rendre l'aperçu évident au-dessus de la ligne de flottaison** : dire explicitement qu'on peut tester sans créer de compte et en combien de temps. Aujourd'hui le hero propose deux boutons de poids visuel proche, et 25 % du trafic part vers `/auth` — un mur inutile à ce stade.
- **Preuve immédiate** : montrer un aperçu du résultat (allocation, score, comparaison) directement sur la landing plutôt que de le promettre, pour que le visiteur comprenne la valeur avant de cliquer.
- **Mobile d'abord** : 30 des 59 sessions sont mobiles. Le hero et le premier CTA sont retravaillés en priorité sur cette largeur.

## Détails techniques

- Migration : `preference_events.user_id` et `app_events.user_id` nullables, `session_id` indexé, politiques `INSERT TO anon` limitées aux lignes sans `user_id`, triggers de rate limit basés sur `COALESCE(user_id::text, session_id)`.
- `src/lib/preferences/tracking.ts` et `src/lib/analytics/appEvents.ts` : suppression du `return` pré-auth, insertion avec `user_id: null` quand anonyme.
- `preference_events.session_id` est de type `uuid`, `app_events.session_id` de type `text` — à uniformiser pour pouvoir joindre les deux tables.
- Nouveaux noms d'événements ajoutés à `AppEventName` (`landing_viewed`, `landing_cta_clicked`, `preview_started`).
- Réconciliation via une fonction `SECURITY DEFINER` appelée après inscription, qui affecte le `user_id` aux lignes de la session.
- `src/routes/index.tsx` : harmonisation des CTA, hiérarchie du hero, bloc de preuve.
- Aucun changement au moteur de portefeuille ni au modèle de risque.

## Hors périmètre

Rétention post-création (relances, réveil, alertes) et tableau de bord analytics interne — à traiter dans un second temps, une fois la mesure en place.
