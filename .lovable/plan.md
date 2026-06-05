# Plan — Enrichir Seedow : briefing, certificat & moments waouh

Trois ajouts qui se renforcent : un **briefing Ethi** intelligent en haut du dashboard, un **certificat d'impact** téléchargeable/partageable, et une couche de **micro-interactions signature** qui les met en scène. Demi-journée, design Emerald Prestige, mobile inchangé (passe 2 si besoin).

## 1. Briefing Ethi quotidien (Dashboard)

Bandeau éditorial en haut de `/dashboard`, juste sous le header, qui résume la journée du portefeuille en 3 lignes.

```text
┌─────────────────────────────────────────────────────────────┐
│ ÉDITION DU 5 JUIN · Ethi                                     │
│                                                              │
│ Ton portefeuille gagne +0,42 % aujourd'hui, porté par        │
│ Climat. 1 ligne dérive de +1,8 pt vs cible — un              │
│ rééquilibrage léger suffirait.                               │
│                                                              │
│ ─── 3 signaux ────────────────────────────────────────       │
│ • Drift allocation     • Opportunité ESG     • Marché       │
└─────────────────────────────────────────────────────────────┘
```

Contenu :
- **Eyebrow** : date du jour + "Ethi" en or.
- **Phrase d'ouverture** générée à partir de la valorisation du jour (perf, thème leader).
- **3 chips de signaux** déterministes calculés côté client à partir du portefeuille existant :
  - Drift d'allocation (écart vs cible > 1.5 pt)
  - Opportunité ESG (asset best-in-class non détenu sur thème actif)
  - Climat marché (jour vert/rouge marqué, > 1 %)
- Clic sur un chip → ouvre l'Ethi bubble avec le contexte pré-rempli.

Pas d'appel IA : tout est dérivé de l'engine `lib/portfolio` et de `usePortfolioValuation`. Cohérent avec le ton sobre, zéro hallucination.

## 2. Certificat d'impact partageable

Bouton "Télécharger mon certificat" dans la section impact du portefeuille (`/portfolio`, près de `ImpactRibbon`). Génère un PDF A4 paysage en pur client (`@react-pdf/renderer` ou impression HTML → `window.print()` sur une route dédiée `/portfolio/certificat`).

Mise en page éditoriale :
- En-tête : "seedow" + numéro de certificat + date.
- KPI géants : CO₂ évité, arbres équivalents, énergie verte, score d'impact (`KPIFigure` réutilisé).
- Filet or, eyebrow "Certificat d'impact · Édition personnelle".
- Pied : méthodologie courte + URL de vérification (`seedow.life/methodologie`).

Bonus partage : bouton "Copier le lien" qui copie l'URL de la page `/portfolio/certificat` (lecture seule, non publique — protégée auth).

## 3. Moments waouh transversaux

Trois signatures discrètes qui parlent toutes la même langue Emerald Prestige :

- **KPIFigure animé** : compteur tabulaire qui anime de 0 vers la valeur cible au mount (300 ms, ease-out, `tabular-nums` stable, pas de jitter). Halo or très léger au survol.
- **Filet or progressif** : `.gold-rule` qui se dessine de gauche à droite quand sa section entre dans le viewport (IntersectionObserver, 600 ms).
- **Confettis or sobres** : 12 particules dorées discrètes après un investissement réussi ou un téléchargement de certificat (toast `sonner` + canvas léger, 1.2 s). Désactivés si `prefers-reduced-motion`.

Toutes les animations respectent le hook `useFocusMode` / `prefersReducedMotion` déjà en place.

## Détails techniques

**Fichiers créés**
- `src/components/dashboard/EthiBriefing.tsx` — bandeau briefing + logique signaux.
- `src/lib/portfolio/signals.ts` — calcul pur des 3 signaux à partir du `PortfolioResult`.
- `src/components/portfolio/ImpactCertificate.tsx` — bouton + déclenchement.
- `src/routes/portfolio.certificat.tsx` — route imprimable (layout A4, full-bleed comme `/auth`).
- `src/components/ui/AnimatedFigure.tsx` — wrapper d'animation pour `KPIFigure`.
- `src/components/ui/GoldRuleReveal.tsx` — filet or animé au scroll.
- `src/lib/confetti.ts` — utilitaire canvas léger (≈ 1 ko).

**Fichiers modifiés**
- `src/routes/dashboard.tsx` — insère `EthiBriefing` en tête.
- `src/routes/portfolio.tsx` — ajoute le CTA certificat près de `ImpactRibbon`.
- `src/components/ui/KPIFigure.tsx` — opt-in `animate` prop.
- `src/components/layout/AppShell.tsx` — ajoute `/portfolio/certificat` à `fullBleed`.

**Dépendances** : aucune nouvelle si on imprime via `window.print()`. Sinon `@react-pdf/renderer` (~120 ko) — à confirmer en build.

**Périmètre exclu** (à proposer en passes suivantes)
- Page publique sociale anonymisée (nécessite RLS + URL publique → chantier auth).
- Briefing IA via Lovable AI (coût + latence, pas demi-journée).
- Onboarding guidé interactif (séparé pour ne pas mélanger les flux).
