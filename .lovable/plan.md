# Plan — Lancement MVP test 300 testeurs

Objectif : ouvrir l'app à 300 personnes **cette semaine**, en mode **paper trading** (argent virtuel), pour valider l'onboarding, la pertinence des allocations ESG et la willingness to pay. Inscription libre **cappée à 300**, puis waitlist auto. Bouton "Investir pour de vrai" qui capture l'intérêt.

L'app fait déjà 90% du job (portefeuilles, allocations, valuation sur vrais cours, dashboard, comparatif). Il manque surtout : le **cap d'accès**, le **framing "démo"**, la **capture d'intention d'investissement réel**, et un **feedback in-app** léger.

---

## 1. Cap à 300 inscrits + waitlist

- Nouvelle table `waitlist` (email, created_at, source, position).
- Table `app_config` (clé/valeur) avec `beta_cap = 300` et `beta_status = 'open' | 'closed'`, modifiable sans redeploy.
- À l'inscription (`/auth` signup) : server function `checkBetaCapacity` qui compte les profils existants. Si `count >= cap` → l'inscription est bloquée et l'email part en waitlist avec sa position.
- Page `/waitlist` : confirmation + position dans la file + estimation.
- Petit compteur public "X / 300 places prises" sur la landing pour créer la rareté.

## 2. Framing "compte démo" partout

- Bandeau permanent fin en haut du dashboard : `Mode démo — capital virtuel, cours réels. Aucun argent investi.` Style discret (paper-2, eyebrow or).
- Réécrire les CTA `Investir` → `Investir (démo)` dans `InvestDialog`, `NextStepCard`, dashboard.
- Page `/methodologie` : ajouter une section "Pourquoi un mode démo pendant la bêta".
- Footer auth : mention "Phase de test — aucune transaction réelle".

## 3. Capture "Je veux investir pour de vrai"

- Nouveau composant `RealInvestmentInterestCard` placé sur le dashboard sous `NextStepCard` et dans le détail portefeuille.
- Bouton `Je veux investir pour de vrai` → dialog qui demande : montant envisagé (slider 100–10000€), fréquence (one-shot / mensuel), email de contact (pré-rempli).
- Table `real_investment_intents` (user_id, amount, frequency, created_at, portfolio_id).
- Confirmation : "Tu seras prévenu·e dès l'ouverture des comptes réels." → signal direct de **willingness to pay**.

## 4. Feedback in-app léger

- Bouton flottant `Feedback` en bas à droite (visible sur toutes les pages auth).
- Dialog 3 questions max : 1 NPS (0–10), 1 texte libre "Qu'est-ce qui te bloque ?", 1 texte libre "Ce que tu aimerais voir".
- Table `beta_feedback` (user_id, nps, blocker, wish, route_when_sent, created_at).
- Trigger automatique : après création du 1er portefeuille (modal différée 24h), et après 3 visites du dashboard.

## 5. Analytics testeurs (basique)

- Table `beta_events` (user_id, event, payload, created_at) — events critiques : `signup`, `onboarding_step_X`, `portfolio_created`, `invest_demo_clicked`, `real_invest_intent`, `feedback_submitted`.
- Server function `logBetaEvent` appelée aux points clés (déjà partiellement couvert par `decision_events` et `preference_events` — on étend, on ne duplique pas).
- Page admin `/admin/beta` (réservée role `admin`) : compteur inscrits / 300, conversion onboarding → portefeuille, NPS moyen, liste des intents d'investissement réel.

## 6. Onboarding ajustements minimaux

- 1er écran onboarding : ajouter le contexte "Tu fais partie des 300 testeurs. Ton retour façonne le produit."
- Dernier écran onboarding : remplacer "Investir" par "Créer mon portefeuille démo" pour clarifier.

## 7. Comms & accès

- Page landing (`/`) : ajouter section "Phase bêta — 300 places" avec compteur live + lien signup.
- Email de bienvenue (template auth Lovable) : explication mode démo + lien feedback + invitation à inviter 1 ami.
- Rien à faire côté domaine (déjà `seedow.life`).

---

## Détails techniques

**Nouvelles tables (1 migration)** :
- `waitlist`, `app_config`, `real_investment_intents`, `beta_feedback`, `beta_events`
- RLS : `waitlist` insert anon OK / select admin ; `app_config` select public / write admin ; les 3 autres = user_id auth.uid() + admin read.
- GRANT explicites par rôle.

**Server functions** (`src/lib/beta/*.functions.ts`) :
- `checkBetaCapacity()` — public, retourne `{ slotsTaken, cap, status }`.
- `joinWaitlist({ email })` — public.
- `submitRealInvestmentIntent(...)` — auth.
- `submitBetaFeedback(...)` — auth.
- `logBetaEvent(...)` — auth.
- `getBetaAdminStats()` — auth + `has_role('admin')`.

**Composants** :
- `src/components/beta/BetaBanner.tsx`
- `src/components/beta/RealInvestmentInterestCard.tsx` + dialog
- `src/components/beta/FeedbackButton.tsx` + dialog
- `src/components/beta/BetaCounter.tsx` (landing)

**Routes** :
- `src/routes/waitlist.tsx` (public)
- `src/routes/_authenticated/admin.beta.tsx` (admin only)

**Modifs existantes** :
- `src/routes/auth.tsx` — check capacity avant signup
- `src/routes/index.tsx` — section bêta + compteur
- `src/routes/dashboard.tsx` — bandeau + carte intent + bouton feedback
- `src/components/portfolio/InvestDialog.tsx` — label "(démo)"
- `src/routes/onboarding.tsx` — copy ajustée

**Ce qu'on NE fait PAS dans ce sprint** :
- Aucune intégration courtier / PSAN (la waitlist suffit pour mesurer l'intent).
- Pas de KYC, pas de paiement.
- Pas de refonte de l'engine d'allocation — il est déjà solide.
- Pas de mobile native — la PWA actuelle suffit pour 300 testeurs.

---

## Planning indicatif (5 jours ouvrés)

- **J1** : Migration DB + server functions + cap inscription + page waitlist.
- **J2** : Bandeau démo + relabel CTA + RealInvestmentInterestCard.
- **J3** : Feedback button + dialog + table + intégration onboarding.
- **J4** : Page admin `/admin/beta` + analytics events + landing bêta.
- **J5** : QA bout-en-bout, polish copy, publish.

Veux-tu que je lance l'implémentation tel quel, ou tu veux ajuster un point (par ex. monter le cap, ajouter parrainage, ou demander un montant min sur l'intent réel) ?