# Seedow — Contexte permanent

> Ce fichier sert de mémoire de référence pour toute personne ou IA qui travaille sur Seedow (dev, contenu, design). Il prime sur l'improvisation : en cas de doute, on revient ici avant de trancher.

---

## 1. Vision & principes non négociables

**Mission.** Seedow est une application d'investissement éthique et durable. Elle structure un portefeuille selon les convictions de l'utilisateur (climat, biodiversité, droits humains…), avec des données de marché réelles, et un assistant conversationnel — **Ethi** — qui explique chaque choix sans jamais rien vendre.

**Signature de marque** (issue de la DA des carousels, à respecter dans toute communication produit) :
> « Ce n'est pas une fatalité. C'est un choix. Le tien aussi. »

**Non négociables :**

1. **Zéro conseil financier déguisé.** Seedow informe et structure, ne recommande jamais un achat/vente précis à un instant T. Voir §5.
2. **Chaque chiffre est sourcé et attribué à l'écran**, pas relégué en petit caractère ou en légende. Si une donnée est contestée par sa source (ex. une banque conteste un chiffre), la contestation est mentionnée sur le support principal, pas cachée.
3. **Pas de sur-promesse.** On ne transforme jamais « 0 € investi dans les fossiles sur un critère précis » en « acteur irréprochable ». On dit ce que dit la donnée, rien de plus.
4. **RLS activée sur toute nouvelle table utilisateur, sans exception.** Une table sans RLS n'est pas mergeable.
5. **Aucun dark pattern.** Pas de friction artificielle pour empêcher un désabonnement, pas de pré-cases cochées, pas d'urgence fabriquée.
6. **Les fichiers auto-générés par Lovable Cloud ne s'éditent jamais à la main** (`.env`, `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`).
7. **Le ton reste factuel et posé, même sur des sujets anxiogènes** (dette publique, canicule, chômage). On informe, on n'alarme pas gratuitement — la peur n'est pas un moteur d'engagement acceptable ici.

---

## 2. Personas

Déduits du positionnement produit et des thèmes récurrents des carousels (dette publique, Livret A, premier achat immobilier à 36,5 ans en moyenne, paiement en 4x, Bitcoin, greenwashing, Shein/Temu).

### Léa, 27 ans — l'investisseuse débutante engagée
Premier salaire stable depuis 2-3 ans. Envie d'investir mais méfiante : elle a vu le mot « Bitcoin » partout sans jamais comprendre comment ça marche (statistique produit : 93 % des Français le connaissent, 17 % savent comment ça fonctionne). Elle veut que son argent soit cohérent avec ses valeurs, sans passer des heures à éplucher des rapports ESG. **Besoin produit** : pédagogie sans jargon, preuve que ce n'est pas plus compliqué qu'un Livret A.

### Karim, 34 ans — l'épargnant désabusé
Il a de l'épargne dormante sur un Livret A dont il sait qu'il ne suit pas l'inflation. Méfiant envers les banques traditionnelles après avoir lu des articles sur leur financement des énergies fossiles. Pas militant, juste lassé de sentir que son argent travaille contre ses valeurs sans qu'il l'ait choisi. **Besoin produit** : transparence radicale, comparaison claire avec ce qu'il connaît (ETF classique, banque actuelle).

### Inès, 31 ans — la pressée qui ne veut pas se faire avoir
Elle a été échaudée par un paiement en 4x qu'elle n'avait pas identifié comme un crédit, ou par un abonnement dont le prix a grimpé sans qu'elle le remarque (Netflix +66 % depuis 2014 cité dans les carousels). Elle scrute les petites lignes maintenant. **Besoin produit** : rien de caché, aucune surprise tarifaire, un onboarding rapide (elle décroche si c'est long).

### Thomas, 40 ans — le sceptique du greenwashing
A déjà vu des banques afficher « nous sommes engagés pour la planète » sans que les faits suivent. Il ne fait plus confiance aux discours, seulement aux chiffres vérifiables. **Besoin produit** : sources primaires visibles, droit de réponse des tiers cités, aucune slide qui affirme sans preuve.

*Ces personas doivent guider les décisions UX (pédagogie, pas de jargon non défini) et éditoriales (jamais d'affirmation non sourcée) — pas seulement le marketing.*

---

## 3. Conventions de code

**Stack réelle du repo** (voir §6) : TanStack Start v1, pas Next.js — toute doc ou onboarding doit refléter ça.

### Architecture (routing fichier, TanStack Start)

> Vue d'orientation, pas un inventaire exhaustif — la source de vérité reste l'arborescence `src/`. Toute nouvelle route doit trouver sa place ici de façon cohérente.

```
src/
├── routes/                     # une route = un fichier (TanStack Start)
│   ├── __root.tsx
│   ├── index.tsx                # landing
│   ├── onboarding.tsx           # questionnaire → simulation → compte
│   ├── auth.tsx · waitlist.tsx  # connexion / liste d'attente bêta
│   ├── dashboard.tsx · discover.tsx · portfolio.tsx · comparatif.tsx
│   ├── certificat.tsx · objectifs.tsx · objectifs.$goalId.tsx
│   ├── ethi.tsx                 # chat Ethi (UI)
│   ├── comprendre.tsx · methodologie.tsx    # pédagogie & méthode
│   ├── cours.tsx · cours.index.tsx · cours.$slug.tsx   # cours
│   ├── communaute.tsx · profil.tsx · reglages.tsx
│   ├── cgu.tsx · confidentialite.tsx · mentions-legales.tsx  # légal
│   ├── _authenticated/          # layout + garde d'auth (route.tsx, admin.beta.tsx)
│   ├── api.ethi.ts              # endpoint IA (server), pas une route UI
│   ├── api.public.esg-preview.ts            # aperçu ESG public (server)
│   ├── hooks/                   # endpoints cron (pas des routes UI)
│   │   ├── refresh-market-data.ts           # ingestion horaire Yahoo Finance
│   │   └── recompute-risk-model.ts          # recalcul du modèle de risque
│   ├── mcp.ts · [.mcp]/         # serveur MCP (list-tools, invoke-tool)
│   └── [.well-known]/ · [.]lovable.oauth.consent.tsx   # OAuth
├── components/                  # organisés par domaine, pas par type
│   ├── discover/ roots/ portfolio/ goals/ dashboard/ impact/
│   ├── ethi/ community/ courses/ landing/ alerts/ beta/
│   ├── profil/ reglages/ layout/ navigation/
│   └── ui/                       # shadcn, ne pas customiser à la main — regénérer
├── hooks/                        # useAuth, usePortfolioValuation, useActivePortfolio…
├── lib/                          # logique métier (jamais de calcul lourd en composant)
│   ├── portfolio/                 # engine, markowitz, metrics, server functions
│   ├── market/                    # client Yahoo Finance (server-only)
│   ├── esg/                       # scoring ESG, détection greenwashing
│   ├── ethi/                      # prompts & contexte de l'assistant
│   ├── mcp/                        # serveur MCP + tools
│   └── account/ auth/ beta/ discover/ preferences/ analytics/ monitoring/
├── i18n/ · content/               # locales (i18next) & contenu des cours
└── integrations/supabase/         # client + types — AUTO-GÉNÉRÉ, ne pas éditer
```

### Règles de nommage

- **Composants** : PascalCase (`AssetScreener.tsx`), un composant = un fichier.
- **Hooks** : camelCase préfixé `use` (`usePortfolioValuation.ts`), toujours dans `src/hooks/` sauf s'ils sont strictement locaux à une route.
- **Routes** : kebab-case ou camelCase selon le fichier TanStack (aligné sur l'existant, ne pas mélanger les deux conventions dans le même dossier).
- **Server functions / logique métier lourde** (Markowitz, métriques de portefeuille) : dans `lib/portfolio/`, jamais dans un composant — un composant ne fait pas de calcul financier inline.
- **Un composant par responsabilité.** Si un fichier de `components/` dépasse largement les autres du dossier, c'est un signal pour le découper, pas pour l'ignorer.

### Style

- Tailwind CSS v4, tokens `oklch` définis dans `src/styles.css` — ne pas coder de couleurs en dur (`#1D8348`) dans les composants, passer par les tokens.
- shadcn/ui pour les primitives d'interface. On ne réécrit pas un composant shadcn depuis zéro si une variante existe déjà.

---

## 4. Règles UX/UI

Direction artistique extraite des supports de contenu (`seedow_carousel_duel.html` et les 4 autres fichiers fournis) — à reprendre telle quelle pour toute interface produit qui doit rester cohérente avec la marque.

### Typographie

- **Inter** (400 à 900) pour tout texte lisible : titres, corps de texte, UI.
- **IBM Plex Mono** (400/500/700) réservée aux éléments « données » : métadonnées, labels, chiffres bruts, timestamps, tags. Ce contraste serif-mono/sans-serif est ce qui donne le ton « factuel, presque journalistique » de la marque — ne pas le diluer en mettant de l'Inter partout.
- Letter-spacing légèrement négatif sur les titres (`-0.01em` à `-0.03em`) pour l'effet « éditorial dense ».

### Palette (design tokens, identiques sur tous les supports — à porter tels quels dans `styles.css`)

| Token | Valeur | Usage |
|---|---|---|
| `--paper` | `#FFFFFF` | Fond neutre principal |
| `--paper-2` | `#F5F5F7` | Fond secondaire / page |
| `--paper-3` | `#D2D2D7` | Bordures, séparateurs |
| `--ink` | `#1D1D1F` | Texte principal, fonds sombres |
| `--ink-2` | `#86868B` | Texte secondaire, métadonnées |
| `--mint` | `#1D8348` | **Positif** — bonne nouvelle, chiffre favorable, CTA de marque |
| `--ice` | `#0071E3` | Information neutre / lien |
| `--volt` | `#6E56CF` | Accent secondaire (usage rare, à ne pas banaliser) |
| `--alert` | `#E11D48` | **Négatif** — chiffre défavorable, alerte, danger réel (pas de sur-usage : perd son sens si trop fréquent) |
| `--solar` | `#B7791F` | Nuance d'avertissement doux (usage rare) |

**Sémantique stricte à respecter** : mint = positif/marque, alert = négatif réel — ne jamais inverser ces deux couleurs, l'utilisateur les lit comme un code binaire (l'exemple type est l'enchaînement mint/alert dans le format « Le Duel »).

### Composants visuels

- Rayons de bordure : `14px` (cartes/légendes), `18px` (tuiles/slides), `100px` (pills/badges).
- Micro-interactions discrètes : `transform: scale(1.03)` au hover, transition `cubic-bezier(0.32,0.72,0,1)` — jamais d'animation agressive ou de rebond exagéré.
- Un point pulsant (`animation: pulse 2s infinite`, opacité 1→0.3) pour signaler un statut « live/actif » (ex. beta disponible) — pattern réutilisable pour tout statut temps réel dans le produit (cours de bourse en cours de rafraîchissement, etc.).

### Accessibilité

- Contraste : `--ink` sur `--paper`/`--paper-2` et blanc sur `--ink`/`--mint`/`--alert` sont les paires validées — ne pas créer de nouvelles combinaisons texte/fond sans vérifier le contraste (WCAG AA minimum, AAA visé sur le texte de decision financière).
- Le texte secondaire (`--ink-2`, souvent en 7-9px sur les supports de contenu) est acceptable en légende marketing mais **jamais en dessous de 13px dans l'app produit** pour un texte porteur d'information financière — la lisibilité prime sur la densité visuelle une fois dans l'outil réel.
- Aucune information (positif/négatif, statut) ne doit reposer sur la couleur seule dans l'app — toujours doubler d'un label ou d'une icône pour les daltoniens.

---

## 5. Règles IA pour Ethi

Ethi est l'assistant conversationnel du produit (Lovable AI Gateway, Gemini/GPT-5). Il porte la promesse de marque : « qui explique chaque choix — sans jamais rien vendre ».

1. **Neutralité.** Ethi n'exprime pas de préférence pour un actif, un secteur ou un produit financier précis. Il explique des mécanismes et des données, il ne recommande pas d'achat/vente à un instant donné.
2. **Pas de conseil financier personnalisé.** Ethi ne dit jamais « tu devrais investir dans X » ou « c'est le bon moment pour vendre Y ». Il peut expliquer ce qu'est un ETF, une allocation, un risque de concentration — jamais formuler une décision à la place de l'utilisateur. Toute réponse qui s'approche d'une recommandation individualisée doit être reformulée en explication générale + invitation à consulter un professionnel si la question dépasse l'explicatif.
3. **Pédagogie d'abord.** Réponses sans jargon non défini. Si un terme technique est nécessaire (RLS n'a rien à faire ici mais « Markowitz », « P&L », « ESG »…), il est expliqué en une phrase simple avant d'être utilisé.
4. **Sourcé, toujours.** Toute donnée chiffrée citée par Ethi doit être attribuable à une source vérifiable, avec sa date. Pas d'estimation présentée comme un fait.
5. **Transparence sur ses limites.** Ethi dit explicitement quand une question sort de son périmètre (fiscalité personnelle complexe, situation patrimoniale spécifique) plutôt que d'improviser une réponse plausible.
6. **Ton constant avec la marque** : factuel, posé, jamais alarmiste ni promotionnel. Ethi ne « vend » jamais une fonctionnalité de l'app dans sa réponse — l'app le sert déjà, Ethi n'a pas à faire du growth.

---

## 6. Choix techniques (état réel du repo `amirRbh/seedow`)

> ⚠️ Le repo utilise **TanStack Start**, pas Next.js. Si Next.js apparaît dans une doc ou un onboarding, c'est une erreur à corriger.

- **Framework** : TanStack Start v1 (React 19, SSR/Edge), routing fichier dans `src/routes/`.
- **Build** : Vite 7.
- **Styling** : Tailwind CSS v4, tokens `oklch` dans `src/styles.css`.
- **UI** : shadcn/ui.
- **Backend** : Lovable Cloud = Supabase managé (Postgres + RLS + Edge Functions + Auth + Storage).
- **IA** : Lovable AI Gateway (Gemini / GPT-5) — moteur d'Ethi.
- **Déploiement** : Cloudflare Workers (Edge).
- **Package manager** : Bun (`bun install`, `bun run dev`). **Un seul lockfile fait foi : `bun.lock` (texte, versionné).** `bunfig.toml` fixe `saveTextLockfile = true` pour que Bun maintienne ce format lisible et diffable — pas de lockfile binaire (`bun.lockb`) ni de `package-lock.json` npm dans le repo (deux sources de vérité = dérive garantie). Ne pas réintroduire un second lockfile.
- **Données de marché** : ingestion horaire automatique via `pg_cron` → endpoint `/api/public/refresh-market-data`, source Yahoo Finance, stockage `asset_quotes` / `asset_prices`.
- **Secrets** : `LOVABLE_API_KEY` (Ethi), `CRON_SECRET` (sécurise l'endpoint d'ingestion), stocké dans **Supabase Vault**, accédé via `public.get_vault_secret('cron_secret')` — jamais en clair dans le code ou les migrations.
- **Rôles** : table dédiée `user_roles` + fonction `has_role()` en `SECURITY DEFINER`. Toute nouvelle route sensible doit passer par cette fonction, pas par une vérification ad hoc côté client.
- **i18n** : `update_locales.ts` à la racine — passer par ce script pour toute nouvelle chaîne traduisible plutôt que d'éditer les fichiers de locale à la main.

---

## 7. Roadmap produit

> Cette section est un squelette à tenir à jour — elle liste ce qui est confirmé par le repo (README) en `Fait / Beta`. Les colonnes `Next` et `Later` sont à remplir en équipe ; ne pas les considérer comme engagées tant qu'elles n'ont pas été validées.

**Fait / Beta actuelle**
- Découvrir (univers d'actifs filtré par thème ESG, exclusion, classe d'actif)
- Portefeuille (valorisation temps réel, P&L, allocation)
- Objectifs financiers liés à un portefeuille
- Comparatif vs ETF classique (MSCI World)
- Certificat d'impact partageable
- Dashboard (métriques, briefing Ethi)
- Ethi (assistant conversationnel)
- Comprendre / Méthodologie (pédagogie, transparence sur la méthode)
- Cours (contenu éducatif structuré)
- Communauté (partage de portefeuille)
- Détection de greenwashing (score, historique, alertes)
- Auth (email + Google OAuth), bêta à liste d'attente + garde `_authenticated`
- Ingestion de données de marché horaire (Yahoo Finance) + recalcul du modèle de risque
- Serveur MCP (exposition d'outils Seedow via le protocole MCP)

**Next** — *(à compléter par l'équipe produit)*

**Later** — *(à compléter par l'équipe produit)*

---

## 8. Critères de qualité avant toute PR

- [ ] **Lint** : `bun run lint` (`eslint.config.js`) passe sans erreur (warnings à justifier en review, pas à ignorer silencieusement).
- [ ] **Format** : `bun run format` conforme à `.prettierrc` / `.prettierignore` — pas de diff de formatage noyé dans un diff fonctionnel.
- [ ] **Types** : `bun run typecheck` (`tsc --noEmit`) passe — aucun `any` non justifié, la génération de types Supabase (`types.ts`) n'a pas été éditée à la main.
- [ ] **Tests** : `bun run test` (`vitest.config.ts`) — toute nouvelle logique métier dans `lib/portfolio/` ou `lib/market/` (et `lib/esg/`) est couverte par un test, pas seulement par un test manuel en local.
- [ ] **Build** : `bun run build` passe sans warning bloquant avant merge sur `main`.
- [ ] **Sécurité** :
  - RLS activée et testée sur toute table touchée ou créée (§1.4 — non négociable).
  - Aucun secret en clair dans le code, les migrations, ou les logs.
  - Toute route sensible passe par `has_role()`, pas par une vérification client-side seule.
- [ ] **Performance** : pas de régression visible sur le SSR/hydration (TanStack Start) ni sur la taille de bundle Edge (Cloudflare Workers a des limites de taille — vérifier avant d'ajouter une dépendance lourde).
- [ ] **i18n** : nouvelles chaînes passées par `update_locales.ts`, pas de texte en dur non traduisible dans un composant destiné à plusieurs langues.
- [ ] **Cohérence DA** : toute UI nouvelle respecte les tokens couleur/typo du §4 — pas de couleur en dur, pas de nouvelle police introduite sans validation.
- [ ] **Conformité Ethi** : si la PR touche à Ethi ou à un texte généré/affiché par lui, elle respecte le §5 (pas de recommandation individualisée, sourçage systématique).

---

*Dernière mise à jour : synthèse initiale à partir du README du repo `amirRbh/seedow` et des 5 fichiers de DA carousels fournis, puis réconciliation de l'arborescence §3 avec l'état réel de `src/routes` et unification du lockfile Bun (§6). À maintenir à jour à chaque décision structurante — ce fichier n'a de valeur que s'il reste vrai.*
