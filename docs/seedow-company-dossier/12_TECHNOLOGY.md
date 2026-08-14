# 12 — Technology

## Stack (FACT)

- **Front/SSR** : TanStack Start v1 (React 19), Vite 7, routing fichier, déploiement **Cloudflare Workers (Edge)**.
- **Styling/UI** : Tailwind CSS v4 (design tokens), shadcn/ui, framer-motion, recharts.
- **Backend** : Lovable Cloud = **Supabase managé** — Postgres + **RLS** + Edge Functions + Auth (email + Google OAuth) + Storage + **Vault** (secrets).
- **IA** : Lovable AI Gateway (Gemini / GPT-5) → Ethi. Rate-limiting en base (`ethi_rate_limits`).
- **Données marché** : ingestion horaire Yahoo Finance via **pg_cron** → `asset_quotes` / `asset_prices` ; recalcul du modèle de risque (`recompute-risk-model`).
- **Optimisation** : `quadprog` (QP Markowitz) côté serveur.
- **Data-engine** : pipeline ETF/fonds sourcé (connecteur iShares, holdings, fund requests).
- **MCP** : serveur exposant des outils Seedow.
- **Package manager** : Bun (lockfile texte unique `bun.lock`).

## Architecture & qualité (FACT)

- **39 tables**, RLS activée largement, rôles via `has_role()` SECURITY DEFINER, secrets en Vault. → Posture sécurité **au-dessus de la moyenne d'une bêta**.
- **CI** (typecheck + lint + format + tests), **51 fichiers de test**, logique métier hors UI. → Base de code saine.
- **i18n** FR/EN via i18next.

## Scalabilité

**1 000 → 100 000 utilisateurs ?** *(ESTIMATION)* Oui, sans refonte majeure : l'Edge (Cloudflare) + Supabase managé absorbent cette charge ; le coût dominant devient **l'IA (Ethi)** et l'ingestion data. Points de vigilance :
- **Ethi = coût variable non borné** par utilisateur (tokens LLM) → le rate-limit existe, mais l'économie doit être surveillée (`08`).
- **Agrégats de Vote** lus ligne à ligne avec `limit(100000)` (commentaire dans `vote.functions.ts`) → à remplacer par un `COUNT` groupé avant l'échelle.
- **pg_cron horaire** : OK ; surveiller la fenêtre d'ingestion si l'univers grossit beaucoup.

**Vers 1 000 000 ?** *(ESTIMATION)* Il faudrait :
- Découpler l'ingestion data (file/queue, connecteurs multiples) et matérialiser les agrégats (vues matérialisées / cache).
- Optimiser le coût IA (modèles moins chers pour les tâches simples, cache de réponses, réponses pré-calculées pour Le Fil).
- Cache CDN agressif sur les surfaces publiques (cours, méthodologie, esg-preview).
- **Si exécution réelle** : c'est là qu'un vrai chantier apparaît (custody, réconciliation, conformité) — voir `14`.

## Coûts (structure, valeurs UNKNOWN)

Postes : Lovable Cloud/Supabase (hébergement + DB), Cloudflare Workers, **AI Gateway (variable, le plus incertain)**, sources de données ESG/marché (Yahoo gratuit aujourd'hui ; une donnée ESG *premium* type MSCI est coûteuse — impact direct sur le moat data et la marge). Montants réels : **UNKNOWN — à confirmer.**

## Risques techniques

- **Dépendance plateforme Lovable Cloud** (backend, types auto-générés, AI Gateway) : lock-in + point de défaillance unique. Stratégie de sortie à documenter.
- **Fichiers auto-générés** (`types.ts`, `client.ts`) : plusieurs fonctions passent par des casts `as any` (tables récentes non régénérées) — dette de typage à résorber.
- **Coût/qualité de la donnée ESG** : le différenciateur repose sur une donnée dont la version *premium* est chère.

**Verdict** : stack moderne, sécurité soignée, base testée — **très bon pour le stade**. Le vrai saut de complexité n'est pas la montée en charge web, c'est **l'exécution financière** si elle est choisie.
