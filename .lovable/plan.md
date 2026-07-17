## Objectif

Réduire le mur d'inscription : que les visiteurs puissent générer et voir leur portefeuille simulé **avant** de créer un compte. La logique existe déjà (phase `preview` de `/onboarding` fonctionne sans auth) — le problème est que les CTA de la landing envoient vers `/auth?mode=signup` au lieu de `/onboarding`.

## Changements

### 1. `src/routes/index.tsx` — Rerouter les CTA principaux
Remplacer les 3 CTA "Rejoindre la beta" (lignes ~89, ~171, ~357) qui pointent vers `/auth?mode=signup` par des liens vers `/onboarding` avec libellé plus engageant :

- **Nav (top-right)** : garder "Se connecter" à gauche + remplacer le bouton primaire par → `Découvrir mon portefeuille` (Link `to="/onboarding"`).
- **Hero CTA** : `Rejoindre la beta` → `Construire mon portefeuille` (Link `to="/onboarding"`), et remplacer le "Voir les cours" en secondaire par un mini-libellé rassurant `Sans compte · 2 min`.
- **CTA final (ligne ~357)** : idem, direction `/onboarding`.

Utilisateurs authentifiés : comportement inchangé (bouton "Accéder à mon espace" → `/dashboard`).

### 2. `src/routes/onboarding.tsx` — Renforcer la promesse "sans compte"
- Sur la phase `intro` : ajouter un micro-label sous le CTA de démarrage (« Aucun compte requis · tes réponses restent en local jusqu'à ce que tu valides »).
- Sur la phase `preview` (l'allocation simulée) : ajouter en tête un petit bandeau clair du type « Voici ta simulation. Crée un compte gratuit uniquement si tu veux la sauvegarder. »
- Sur la phase `account` (mur d'inscription actuel) : reformuler le titre pour insister que la simulation est **déjà prête** et qu'il ne s'agit que de la conserver.

Aucune logique métier modifiée : la génération d'allocation via `generatePortfolio` reste identique, seul le wording + le routage changent.

### 3. `src/components/beta/BetaCounter.tsx` (optionnel, si visible sur landing)
Vérifier que le compteur "places restantes" apparaît bien près du nouveau CTA `/onboarding` pour garder la notion de beta sans forcer l'inscription.

## Hors-scope
- Pas de changement backend, pas de migration.
- Pas de modification du flow `/auth` lui-même (login/signup restent accessibles pour ceux qui viennent d'un lien direct).
- Pas de persistance côté serveur des réponses anonymes (déjà géré côté client dans onboarding).

## Résultat attendu
Un visiteur clique sur le CTA de la landing → arrive directement dans `/onboarding` → répond à 4 questions → **voit son allocation simulée** → à ce moment seulement, choix explicite de créer un compte pour sauvegarder.