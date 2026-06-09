# Plan global multi-moats — seedow

Objectif : transformer seedow d'un robo ISR de plus en une plateforme avec **3 actifs défensifs cumulatifs** que ni Goodvest ni Yomoni ne peuvent répliquer sans pivoter leur modèle.

Le séquencement n'est pas négociable : **#1 alimente #2 qui alimente #3**. Sauter une étape = effet réseau creux.

---

## Phase 1 — Moat #1 : flywheel valeurs→portefeuille *(4–6 semaines)*

**Thèse** : chaque onboarding doit produire une donnée que personne d'autre ne collecte. Aujourd'hui on saisit `cause_exposure` à la main → on n'apprend rien.

### 1.1 Instrumenter chaque choix (semaine 1–2)
Nouvelle table `preference_events` : un évènement par micro-décision, pas seulement le résultat final.
- `step` : `cause_picked`, `cause_dropped`, `intensity_set`, `exclusion_added`, `exclusion_removed`, `risk_moved`, `horizon_moved`, `fund_rejected`, `fund_swapped`, `allocation_seen`, `allocation_accepted`, `allocation_regenerated`
- `payload` jsonb : valeur avant/après, position dans le flow, temps passé sur l'écran
- `session_id` pour reconstruire les parcours
- `variant` pour A/B futurs (explications, ordres de causes)

### 1.2 Capturer les **arbitrages révélés** (semaine 2–3)
La vraie pépite. À chaque génération, exposer le coût implicite et logger la décision :
- "Exclure les fossiles te coûte 0,4 pt de rendement attendu — tu confirmes ?" → on log accept/refuse + le delta
- Idem pour : armement, intensité d'une cause, plancher ESG
- Stockage : `tradeoff_decisions` (user, portfolio, lever, cost_bps, accepted, alt_chosen)

### 1.3 Rejet de fonds (semaine 3)
Sur la fiche holding : bouton "Pas assez vert pour moi" → ouvre raison (controverse, secteur, score) + suggère un swap. Logge tout dans `fund_rejections`.

### 1.4 Apprendre `cause_exposure` des préférences révélées (semaine 4–5)
Job nocturne (server function + pg_cron) :
- Pour chaque fonds, recalculer son `revealed_cause_exposure` = poids des utilisateurs qui le gardent quand ils déclarent telle cause / poids de ceux qui le rejettent
- Stocker dans `assets.revealed_cause_exposure` (séparé du déclaratif, pour comparaison)
- En dessous de N=50 signaux, on garde le déclaratif (cold-start)

### 1.5 Dashboard interne d'insights (semaine 5–6)
Route `/admin/insights` (gate role admin via `user_roles`) :
- Top co-occurrences de causes
- Élasticité rendement/exclusion (combien de bps les gens acceptent par exclusion)
- Funnels d'onboarding par variante d'explication
- Fonds les plus rejetés et raison dominante

**Livrable mesurable** : à la fin de Phase 1, on peut répondre "quand un Français de 25-35 ans coche Climat + Égalité F/H, qu'accepte-t-il de sacrifier en rendement ?" — réponse chiffrée, exclusive.

---

## Phase 2 — Moat #2 : verdict transparence sur les fonds *(6–8 semaines, démarre semaine 4 en parallèle)*

**Thèse** : être l'**arbitre indépendant**, pas le distributeur. Ça construit la marque "tiers de confiance" qui rend l'acquisition organique gratuite.

### 2.1 Score transparence par fonds (semaine 4–6)
Nouvelle table `fund_transparency` :
- `holdings_disclosure` : fraîcheur + granularité des holdings publiés
- `sfdr_consistency` : article SFDR vs holdings réels (détection greenwashing)
- `controversy_count` : sources publiques (RepRisk-like agrégé, ou flux ouvert)
- `methodology_clarity` : score manuel/LLM sur le prospectus
- `verdict` : enum `transparent | partiel | opaque | suspect`

### 2.2 Pages publiques `/fonds/$ticker` (semaine 6–8)
- Route publique SSR (loader → server fn avec `supabaseAdmin`, projection colonnes safe)
- Head SEO : title/desc/og:image dynamique → canal d'acquisition organique
- Sections : verdict + justification, holdings top 10, controverses, "ce que seedow en pense"
- Pas de CTA "acheter" → pose la posture indépendante

### 2.3 Contenu éditorial (semaine 8–10)
- Route `/decryptages` : 1 article/semaine sur un fonds ou une pratique
- Format court, signature seedow, ton factuel
- Backlinks naturels depuis les pages fonds

### 2.4 Cadrage du conflit indépendance↔distribution (semaine 10–12)
**Point critique** : le jour où seedow distribue, la posture saute. À décider maintenant :
- Option A : ne jamais devenir distributeur direct → modèle abonnement + courtier partenaire
- Option B : muraille de Chine — la rédaction "verdict" n'a pas accès aux deals distribution
- Option C : verdict ouvert même négatif sur les fonds distribués (pari risqué mais ultra défendable)
À trancher avec toi avant Phase 2.4.

**Livrable mesurable** : 200 fonds notés, 20 pages publiques indexées Google sur "[nom fonds] avis", premier trafic SEO non-marque.

---

## Phase 3 — Moat #3 : effet réseau communautaire *(6 semaines, démarre semaine 10)*

**Thèse** : le produit doit s'**améliorer** quand un user de plus arrive. Aujourd'hui `portfolio_shares` est statique → c'est de la galerie, pas du réseau.

### 3.1 Paniers thématiques émergents (semaine 10–12)
- Job : clusteriser les `portfolio_shares` par signature (causes + exclusions + risk bucket)
- Surfacer les top 5 clusters comme "paniers communauté" sur `/discover`
- Chaque panier = allocation moyenne + nombre de membres + perf agrégée
- Onboarding peut démarrer depuis un panier ("commence comme 1 247 personnes qui partagent tes valeurs")

### 3.2 Suivre des pairs (semaine 12–14)
- Table `follows` (anonymisée via `public_handle` déjà en place)
- Feed perso : "3 personnes que tu suis ont ajouté l'exclusion fast-fashion cette semaine"
- Notification opt-in (alerts existant)

### 3.3 Benchmark vs pairs (semaine 14–16)
- Sur `/portfolio` : "Ton ESG vs médiane des profils similaires : +12 pts. Ton rendement attendu : −0,3 pt."
- Sélection des pairs : même cluster Phase 3.1
- Renforce le moat #1 (encore plus de signal sur les arbitrages)

**Livrable mesurable** : 30 % des nouveaux onboardings démarrent depuis un panier communauté ; rétention M3 +X pts vs cohorte pré-Phase 3.

---

## Dépendances et anti-patterns

```text
Phase 1 (events + arbitrages)
   │
   ├──► alimente Phase 3 (clusters basés sur signaux révélés, pas déclaratif)
   │
   └──► alimente Phase 2 (rejets de fonds = signal transparence)

Phase 2 (verdicts + SEO)
   │
   └──► canal d'acquisition pour Phase 3 (sinon clusters vides)
```

**À ne PAS faire** :
- Lancer Phase 3 avant Phase 1 → clusters basés sur déclaratif = bruit
- Mettre le statut régulé en avant marketing (cf. Moat #5 — c'est du table stakes)
- Mélanger distribution et verdicts dans la même UI tant que 2.4 n'est pas tranché
- Toucher au lexique "jardin/graines" (retiré, ne pas revenir)

## Technique — points d'attention

- **Tables**: `preference_events`, `tradeoff_decisions`, `fund_rejections`, `fund_transparency`, `follows`, `portfolio_clusters` → toutes avec RLS scoped `auth.uid()` + GRANT explicites (cf. règles projet)
- **Jobs** : pg_cron + server fn pour recalcul nocturne clusters & revealed_cause_exposure (pattern `apikey` header déjà en place via CRON_SECRET hérité)
- **Admin** : table `user_roles` + `has_role()` (déjà la règle projet) pour `/admin/insights`
- **SEO Phase 2** : routes publiques `/fonds/$ticker` avec head() dynamique par loader — pas de gate auth, pas de `requireSupabaseAuth` dans le loader
- **Privacy** : `portfolio_shares` projection colonnes safe déjà en place — étendre le même pattern à `follows` et clusters

## Ce qu'il faut décider avec toi avant build

1. **2.4 indépendance vs distribution** : option A / B / C ?
2. **Sources controverses** (Phase 2.1) : flux gratuit type GDELT ou budget pour data provider ?
3. **Friction onboarding** (Phase 1.2) : montrer les arbitrages chiffrés peut faire chuter la conversion court terme — on assume ?
4. **Admin role** : créer le système `user_roles` maintenant (Phase 1.5) ou attendre ?
