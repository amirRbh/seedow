# Livrable 1 — Diagnostic Seedow

> Audit mené le 2026-10-09 sur la branche `claude/adoring-darwin-2vzd3c` (clone partiel : 52 commits visibles, dernier commit le 2026-09-02). Les statuts **[VÉRIFIÉ] / [DOC] / [SUPPOSÉ] / [À VÉRIFIER]** sont définis dans le [README](README.md).

## 1. Ce qui a été réellement vérifié

| Élément                     | Résultat                                                                                                                                               | Statut       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| Site public                 | `https://www.seedow.life` répond (redirige vers `seedow.life`), titre « Seedow — Votre argent façonne déjà le monde »                                  | [VÉRIFIÉ]    |
| Installation                | `bun install --frozen-lockfile` : 654 paquets, OK                                                                                                      | [VÉRIFIÉ]    |
| Tests                       | `bun run test` : 105 fichiers, 988 tests passent, 1 échec attendu (`expected fail`)                                                                    | [VÉRIFIÉ]    |
| Types                       | `bun run typecheck` : 0 erreur                                                                                                                         | [VÉRIFIÉ]    |
| Lint                        | `bun run lint` : 0 erreur, 14 avertissements préexistants                                                                                              | [VÉRIFIÉ]    |
| Taille                      | ~504 fichiers TS/TSX, ~73 500 lignes ; 80 migrations SQL, ~50 tables, 58 `enable row level security`                                                   | [VÉRIFIÉ]    |
| Trafic, inscrits, rétention | **Non accessible.** Les tables `app_events`, `beta_retention_cohorts`, la liste d'attente sont protégées par RLS ; pas de clé admin dans cette session | [À VÉRIFIER] |
| Revenu                      | Aucun mécanisme de paiement dans le code ; `/tarifs` annonce « gratuit pendant la bêta »                                                               | [VÉRIFIÉ]    |
| Base de données de prod     | Non consultée (pas d'accès)                                                                                                                            | [À VÉRIFIER] |

**Le fondateur doit remplir lui-même, depuis `/_authenticated/admin.beta` et `/_authenticated/admin.data`** : nombre d'inscrits, de comptes actifs à J7/J30, de visites mensuelles, et d'intentions d'investissement enregistrées. Sans ces chiffres, toute affirmation sur la traction B2C reste une hypothèse.

## 2. Ce qu'est Seedow aujourd'hui

Une application web B2C (TanStack Start, Supabase via Lovable Cloud, Cloudflare Workers) qui :

- montre la composition réelle de fonds et d'ETF (positions iShares ingérées, 29 941 lignes sur 21 fonds selon `docs/n2-holdings-ingestion.md`) [DOC] ;
- construit un portefeuille « de convictions » simulé (Markowitz, données Yahoo Finance) ;
- publie un **Observatoire** de la transparence des fonds (indice STI 2.0, constats d'écart E1–E5) ;
- propose un assistant pédagogique (Ethi, Gemini 2.5 Flash via Lovable AI Gateway), des cours, une communauté, des objectifs, un certificat.

Le parcours s'arrête à un **formulaire d'intention** : Seedow ne fait pas investir, n'a pas de partenaire courtier et ne facture rien [VÉRIFIÉ dans le code].

## 3. Actifs réutilisables

| Actif                                                                                                                                                  | Où                                                            | Valeur hors B2C                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Discipline de preuve** : signal sourcé et daté, trois statuts (`publié` / `absent` / `non_vérifié`), constat = revendication + fait + zéro inférence | `src/lib/esg/v2/` (`signal.ts`, `discrepancies.ts`, `sti.ts`) | **Forte.** C'est la méthode qu'un service de conformité doit pouvoir défendre devant l'AMF |
| Pipeline documentaire SFDR (résolution ISIN → document officiel → extraction → preuve)                                                                 | `src/lib/esg/sfdr-pipeline/`, `kid-parser.ts`                 | Forte : base de l'automatisation des contrôles                                             |
| Data engine : connecteurs AMF GECO, iShares, Amundi, Vanguard ; ledger de provenance ; contrôle ISIN                                                   | `src/lib/data-engine/`                                        | Moyenne à forte : identité des fonds, documents, positions                                 |
| Détection des thèmes revendiqués dans un nom ou un objectif                                                                                            | `src/lib/esg/v2/theme-claims.ts`                              | Forte : point de départ du pré-contrôle « noms de fonds »                                  |
| Ingestion des positions + contrôle qualité                                                                                                             | `src/lib/data-engine/holdings*.ts`                            | Moyenne : utile pour un futur contrôle des positions, pas pour le pilote                   |
| Rigueur d'ingénierie : RLS, CI (lint, types, format, tests, migrations), 988 tests                                                                     | `.github/workflows/`, `supabase/migrations/`                  | Moyenne : crédibilité auprès d'un acheteur conformité                                      |
| Compétences du fondateur : sélection de fonds sur ~3 Md€, gestion de patrimoine SG, droit européen                                                     | —                                                             | **Forte** : il parle la langue de l'acheteur (RCCI, sélectionneur de fonds)                |
| Documentation méthodologique publiée                                                                                                                   | `docs/scoring-v2.md`, `/methodologie`                         | Moyenne : preuve de sérieux, matériel de démonstration                                     |

## 4. Fonctionnalités utiles vs superflues (au regard d'un revenu à court terme)

**Utiles** : pipeline SFDR, data engine, moteur de constats, Observatoire (comme vitrine de méthode), fiche fonds (comme démonstration).

**Superflues pour gagner de l'argent maintenant** (à geler, pas à supprimer) : portefeuille Markowitz, objectifs, communauté, vote, certificat, « wrapped », cours, réveil, Ethi grand public, comparatif MSCI World. Elles ne servent aucun acheteur identifié et coûtent de la maintenance et des appels IA.

## 5. Dette technique et risques

| Point                                                                                                     | Gravité                      | Statut       |
| --------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------ |
| Dépendance à Lovable (Cloud, Auth, AI Gateway, fichiers auto-générés non éditables)                       | Moyenne                      | [VÉRIFIÉ]    |
| Colonnes hors `types.ts` lues par cast (`waci_*`, `msci_*`) — types non régénérés                         | Faible                       | [DOC]        |
| E2 à E5 ne sont pas calculés automatiquement (« E1 seul est calculable sans base documentaire complète ») | Moyenne                      | [VÉRIFIÉ]    |
| Parsers de positions Amundi / Vanguard non écrits                                                         | Faible pour le pilote        | [DOC]        |
| Données Yahoo Finance : conditions d'utilisation incompatibles avec un usage commercial B2B redistribué   | Haute si on revend la donnée | [À VÉRIFIER] |
| Ethi : coût IA par message, borné par un rate limit en base                                               | Faible                       | [VÉRIFIÉ]    |
| Observatoire public nominatif + vente aux émetteurs = conflit d'intérêts apparent                         | **Haute** pour l'offre B2B   | [SUPPOSÉ]    |

## 6. Limites du produit actuel

1. **Pas d'acte d'achat ni d'investissement** : la valeur s'arrête à la compréhension.
2. **Pas d'acheteur** : le particulier n'a pas de budget pour « comprendre un fonds », et quand il en a un, il le dépense chez un courtier ou un CGP.
3. **Risque réglementaire latent** : tout glissement vers une suggestion d'allocation personnalisée rapproche Seedow du conseil en investissement (statut CIF, assurance RC Pro, association agréée).
4. **Distribution B2C coûteuse** : sans audience, sans budget publicitaire, face à Trade Republic, Boursorama, Goodvest ou Yomoni.

## 7. Hypothèses commerciales B2C non validées

Volonté de payer pour de la transparence sur les fonds ; conversion intention → investissement ; rétention mensuelle ; viralité du certificat ; coût d'acquisition organique. **Aucune n'a de preuve accessible.** Voir [hypotheses.md](hypotheses.md).

## 8. Verdict

| Option                                                                      | Verdict                                                                                                                                                                         |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conserver le B2C tel quel                                                   | **Non.** Zéro revenu, pas de chemin court.                                                                                                                                      |
| Monétiser le B2C (abonnement, affiliation courtier)                         | **Non, pour l'instant.** Faible volonté de payer attendue, et l'affiliation rapproche du démarchage et du conseil. Noté 41–42/100 (voir `02`).                                  |
| **Repositionner les actifs vers un service B2B de conformité documentaire** | **Oui.** Même méthode, même code de preuve, mais un acheteur qui a une obligation, un budget et un nom de poste (RCCI). Le produit B2C reste en ligne comme vitrine de méthode. |
| Abandonner                                                                  | Prématuré : l'opportunité B2B n'a pas encore été testée commercialement, et le test coûte moins de 30 jours.                                                                    |
