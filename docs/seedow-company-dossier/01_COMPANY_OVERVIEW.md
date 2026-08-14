# 01 — Company Overview

> Convention de preuve utilisée dans tout le dossier :
> **FACT** (vérifiable dans le repo/source externe) · **HYPOTHÈSE** · **ESTIMATION** (méthode explicitée) · **OBJECTIF** (cible non atteinte) · **UNKNOWN** (donnée manquante).
> Dernière mise à jour : 2026-08-14. Basé sur l'état du repo `amirRbh/seedow` au commit `b7203c8`.

## 1. Ce qu'est Seedow, factuellement

**FACT.** Seedow est une application web (live : https://www.seedow.life) qui construit un **portefeuille d'investissement simulé** structuré par les convictions ESG de l'utilisateur (climat, biodiversité, droits humains, égalité, tech, économie circulaire), avec des **données de marché réelles** (Yahoo Finance, ingestion horaire) et un **assistant conversationnel pédagogique, Ethi**.

**FACT — le point le plus important du dossier.** Seedow **ne déplace pas d'argent**. Il n'y a aucune intégration de courtage, de dépositaire (custody), de KYC/AML ou de paiement dans le repo. La table `real_investment_intents` (migration `20260612…`) capture une **intention** (`amount`, `frequency ∈ {one_shot, monthly}`, `contact_email`) — c'est un formulaire de manifestation d'intérêt, pas une transaction. Le montant investi est **déclaratif** (`initial_amount` sur le portefeuille ; confirmé par le README).
→ **Conséquence stratégique majeure** : Seedow est aujourd'hui un **outil de simulation + pédagogie + capture d'intention**, pas une plateforme d'investissement. Toute lecture « fintech d'investissement » doit être corrigée à « pré-plateforme / couche de conviction ». Voir `07_BUSINESS_MODEL` et `15_INVESTOR_DUE_DILIGENCE`.

## 2. Stade de maturité

| Dimension | État (FACT) |
|---|---|
| Produit | Bêta ouverte, à capacité limitée (cap bêta + liste d'attente, enforced en base) |
| Prix | **0 €** pendant la bêta (`tarifs.tsx`) ; modèle futur **non défini** (`tarifs.future` = placeholder) |
| Monétisation | Aucune — **0 € de revenu** par construction |
| Code | ~68 migrations, 39 tables, 51 fichiers de test, CI (typecheck/lint/format/test) |
| Traction | **UNKNOWN** — aucune donnée d'usage réel dans le repo (users, activation, NPS, rétention) |
| Équipe | **UNKNOWN** — non documenté ; indices : produit construit avec Lovable, un seul contact fondateur |
| Entité légale / statut réglementaire | **UNKNOWN** — aucun statut CIF/PSI/agrément visible |
| Financement levé | **UNKNOWN** — aucune trace ; à confirmer par le fondateur |

## 3. Stack technique (FACT)

TanStack Start v1 (React 19, SSR/Edge) · Vite 7 · Tailwind CSS v4 (design tokens) · shadcn/ui · Backend Lovable Cloud = Supabase managé (Postgres + RLS + Edge Functions + Auth + Storage) · IA via Lovable AI Gateway (Gemini / GPT-5) · Déploiement Cloudflare Workers · Package manager Bun. Optimisation Markowitz via `quadprog`. Visualisation via `recharts`. i18n via `i18next` (FR/EN).

> **Incohérence relevée** : `.github/workflows/ci.yml` commente « déploiement (Vercel) » alors que README/CLAUDE.md indiquent Cloudflare Workers. À trancher (probablement un commentaire obsolète). Voir `FINAL_QC.md`.

## 4. Périmètre fonctionnel réel (FACT)

Le produit a **dépassé** la description du README. Fonctionnalités présentes dans `src/routes` et `src/lib` :

- **Le Fil** (nouvel accueil, format narratif/scrollytelling — « Seedow 2.0 », commits #80→#100)
- **Découvrir** (univers d'actifs filtré par conviction/exclusion/classe)
- **Portefeuille** (valorisation temps réel, P&L, allocation)
- **Objectifs** financiers liés à un portefeuille
- **Comparatif** vs ETF classique (MSCI World / ACWI)
- **Certificat d'impact** partageable (boucle d'acquisition)
- **Dashboard** (métriques + briefing Ethi)
- **Ethi** (chat IA, rate-limité)
- **Comprendre / Méthodologie** (transparence)
- **Cours** (12 modules, `src/content/courses`)
- **Communauté** (partage de portefeuille)
- **Ton Argent Vote** (`vote`, `vote.$resolutionId`) — résolutions d'AG, « Bloc » (agrégat collectif), + **Wrapped** (bilan annuel type Spotify Wrapped)
- **Réveil**, **Wrapped**, **Construire**, **Tarifs**, **Aide**
- **Data-engine** : pipeline d'ingestion de holdings/fonds (connecteur iShares), mécanique « Demander l'analyse » d'un fonds
- **Serveur MCP** (expose des outils Seedow via le protocole MCP)
- **Détection de greenwashing** (score, historique, alertes)
- **Auth** email + Google OAuth ; garde `_authenticated` ; rôles via `has_role()`

## 5. En une phrase

**FACT + interprétation.** Seedow est, aujourd'hui, **la couche de conviction et de pédagogie de l'investissement responsable** : elle transforme des valeurs en un portefeuille modèle chiffré, sourcé et expliqué — mais ne l'exécute pas encore. La question stratégique centrale du dossier : *doit-elle devenir la plateforme d'exécution, ou rester la couche de conviction au-dessus des plateformes existantes ?*
