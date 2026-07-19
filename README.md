# Seedow

Application web d'investissement éthique et durable construite avec **Lovable**.
Un portefeuille structuré par vos convictions (climat, biodiversité, droits humains…), avec des données de marché réelles et un assistant conversationnel (Ethi) qui explique chaque choix — sans jamais rien vendre.

🔗 **Live** : https://www.seedow.life

---

## ✨ Fonctionnalités

- **Découvrir** : explorer l'univers d'actifs investissables, filtré par thème ESG, exclusion, classe d'actif.
- **Portefeuille** : valorisation temps réel, P&L, comparaison de croissance, allocation par classe d'actif.
- **Objectifs** : suivi d'objectifs financiers (retraite, achat immobilier, études…) liés à un portefeuille.
- **Comparatif** : performance/frais/impact vs un ETF classique (MSCI World).
- **Certificat d'impact** : synthèse partageable de l'empreinte du portefeuille.
- **Dashboard** : métriques de portefeuille, allocations, briefing Ethi.
- **Ethi** : assistant IA conversationnel (Lovable AI Gateway).
- **Auth** : inscription / connexion email + Google OAuth, capacité bêta limitée avec liste d'attente.
- **Données de marché** : ingestion automatique horaire via cron + Yahoo Finance, stockage dans `asset_quotes` / `asset_prices`.

> Le montant investi est déclaratif (`initial_amount` sur le portefeuille) — il n'y a pas de système de dépôts successifs à ce stade.

## 🛠️ Stack technique

- **Framework** : TanStack Start v1 (React 19 + SSR/Edge)
- **Build** : Vite 7
- **Styling** : Tailwind CSS v4 + design tokens `oklch` dans `src/styles.css`
- **UI** : shadcn/ui
- **Backend** : Lovable Cloud (Supabase managé) — Postgres + RLS + Edge Functions + Auth + Storage
- **IA** : Lovable AI Gateway (Gemini / GPT-5)
- **Déploiement** : Cloudflare Workers (Edge)

## 📁 Structure

```
src/
├── routes/             # Routing fichier (TanStack Start)
│   ├── __root.tsx
│   ├── index.tsx        # landing
│   ├── onboarding.tsx    # questionnaire → simulation → compte
│   ├── dashboard.tsx
│   ├── discover.tsx
│   ├── portfolio.tsx
│   ├── comparatif.tsx
│   ├── certificat.tsx
│   ├── objectifs.tsx
│   ├── ethi.tsx
│   └── hooks/
│       └── refresh-market-data.ts  # endpoint cron
├── components/
│   ├── discover/        # AssetScreener, AssetRow, filtres
│   ├── roots/           # GrowthComparison
│   ├── portfolio/       # Métriques, allocations, historique
│   ├── goals/           # Objectifs financiers
│   ├── ethi/            # Bubble & suggestions IA
│   ├── community/       # Partage de portefeuille
│   └── ui/              # shadcn
├── hooks/               # useAuth, usePortfolioValuation, useActivePortfolio...
├── lib/
│   ├── portfolio/       # engine, markowitz, metrics, server functions
│   └── market/          # client Yahoo Finance (server)
└── integrations/
    └── supabase/        # client + types (auto-générés)
supabase/
├── config.toml
└── migrations/          # schémas, RLS, cron jobs, vault
```

## 🚀 Démarrage local

```bash
bun install
bun run dev
```

> ⚠️ Les fichiers `.env`, `src/integrations/supabase/client.ts` et `src/integrations/supabase/types.ts` sont **auto-générés par Lovable Cloud** — ne pas les éditer manuellement.

## 🔐 Variables d'environnement

Fournies automatiquement par Lovable Cloud :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Secrets serveur (gérés via le panneau Cloud) :

- `LOVABLE_API_KEY` — pour l'assistant Ethi (AI Gateway)
- `CRON_SECRET` — sécurise l'endpoint d'ingestion des cours

## 🗄️ Backend / Données

- **RLS** activée sur toutes les tables utilisateur.
- **Rôles** dans une table dédiée `user_roles` + fonction `has_role()` SECURITY DEFINER.
- **Cron horaire** (pg_cron) qui appelle `/api/public/refresh-market-data` pour rafraîchir `asset_quotes` & `asset_prices` via Yahoo Finance.
- **Vault** Supabase pour stocker `cron_secret`, accédé via `public.get_vault_secret('cron_secret')`.

## 📦 Modifier le projet

Édition directement dans **Lovable** : https://lovable.dev/projects/8da0a748-e3ac-433b-89b0-062aead1a028

Ou en local : cloner, modifier, puis push (via l'intégration GitHub de Lovable si activée).

## 📜 Licence

Projet privé.
