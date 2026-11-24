# Seedow Pro — preuve d'adéquation aux préférences de durabilité

Module B2B pour cabinets CGP/CIF : pour un client et une liste d'ISIN, un verdict
par fonds, sourcé page par page dans l'annexe précontractuelle SFDR, archivé
dans un rapport PDF horodaté. Outil d'aide à la documentation : il ne
constitue pas un conseil en investissement, l'appréciation de l'adéquation
relève de la responsabilité du CIF.

Le B2C n'est pas touché : tout le code Pro vit dans `src/lib/pro/`,
`src/routes/pro/`, `scripts/pro/`, `supabase/migrations/*pro*`, `fixtures/annexes/`.

## Cadre encodé (et rien au-delà)

Préférences de durabilité, règl. délégué 2017/565 art. 2(7) modifié par 2021/1253 :

| Axe | Préférence du client                                             | Donnée fonds (annexe SFDR, RTS 2022/1288)             |
| --- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| (a) | proportion minimale alignée Taxinomie                            | `min_taxonomy_pct`, `min_taxonomy_pct_excl_sovereign` |
| (b) | proportion minimale d'investissements durables (SFDR art. 2(17)) | `min_sustainable_pct`                                 |
| (c) | prise en compte des PAI, éventuellement par catégorie            | `considers_pai`, `pai_categories`                     |

Fonds art. 6 : pas d'annexe, ne satisfait ni (a) ni (b).

## 1. Schéma (`supabase/migrations/20261124120000_pro_sustainability_adequacy.sql`)

Les tables sont préfixées `pro_` : `public.fund_documents` existe déjà côté B2C
avec un autre grain (clé `asset_id`).

| Table                                                                                      | Accès                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pro_funds`, `pro_fund_documents`, `pro_fund_sustainability_data`, `pro_contract_uc_lists` | lecture `authenticated`, écriture service role                                                                                                                                         |
| vue `pro_fund_current_data`                                                                | une ligne courante par ISIN (document le plus récent, extraction validée de préférence), `security_invoker`                                                                            |
| `pro_cabinets`                                                                             | le propriétaire seul                                                                                                                                                                   |
| `pro_client_profiles`                                                                      | le cabinet seul ; `client_ref` = pseudonyme (un email est refusé par CHECK) ; une adaptation exige une note                                                                            |
| `pro_reports`                                                                              | lecture par le cabinet ; insertion service role ; **ni UPDATE ni DELETE** (aucune policy + trigger qui refuse même au service role) ; un profil cité par un rapport ne se supprime pas |

Buckets privés : `pro-annexes` (`<isin>/<sha256>.pdf`, dépôt utilisateur dans
`inbox/<uid>/`), `pro-reports` (`<cabinet_id>/<report_id>.pdf`, lisible par le
seul cabinet).

Tester la migration sur un Postgres jetable (stub Supabase + scénarios RLS) :

```bash
PGHOST=/tmp PGPORT=54329 PGUSER=postgres scripts/pro/test-migration.sh
```

Les tables `pro_*` n'apparaîtront dans `src/integrations/supabase/types.ts`
qu'après régénération par Lovable Cloud (fichier jamais édité à la main) : en
attendant, les scripts utilisent un client non typé et valident chaque lecture
avec zod.

## 2. Extraction des annexes

### Variables d'environnement (jamais dans le repo)

| Variable                                    | Rôle                                           |
| ------------------------------------------- | ---------------------------------------------- |
| `ANTHROPIC_API_KEY`                         | appel du modèle d'extraction                   |
| `EXTRACTION_MODEL`                          | défaut `claude-sonnet-5-5`                     |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | écriture des tables `pro_*` et du Storage      |
| `REVIEWER_USER_ID`                          | uuid de l'utilisateur qui valide (`review.ts`) |

### Ingestion

```bash
bun run scripts/pro/ingest.ts chemin/annexe.pdf --isin FR0010592022 --source-url https://…
bun run scripts/pro/ingest.ts dossier/ --manifest isins.json
bun run scripts/pro/ingest.ts https://…/annexe.pdf --isin FR0013439528
bun run scripts/pro/ingest.ts dossier/ --dry-run
```

Pour chaque PDF :

1. sha256 → ignoré s'il est déjà dans `pro_fund_documents` ;
2. texte page par page (pdfjs-dist) — sert uniquement à vérifier les citations ;
3. appel du modèle, PDF en bloc `document`, sortie contrainte par JSON Schema
   (`output_config.format`) puis revalidée par zod. Chaque valeur arrive avec
   `{value, page, quote, ambiguous, visual, note}` ; absente → `null` ;
   plusieurs chiffres → engagement minimum, `ambiguous: true` ;
4. vérification (`src/lib/pro/extraction/verify.ts`) : la citation doit figurer
   sur la page citée (normalisation : casse, espaces, ponctuation), et un
   pourcentage doit apparaître dans sa citation. `needs_review` si une seule
   citation échoue, si un champ clé (article, (a), (b), (c)) est null pour un
   art. 8/9, ou si un champ clé est ambigu ou lu seulement sur un graphique ;
5. upload Storage, upsert `pro_funds`, insert `pro_fund_documents` et
   `pro_fund_sustainability_data` (`extraction_model` = modèle ayant réellement
   répondu, `extraction_version` = `prompt.v1`).

L'ISIN figure rarement dans une annexe (on y trouve le LEI) : il vient de
`--isin`, du manifeste (`{"<fichier ou sha256>": "<ISIN>"}`), ou du document
si une citation le prouve. Sans ISIN, rien n'est écrit.

Le prompt est versionné (`src/lib/pro/extraction/prompt.v1.ts`) : toute
modification crée `prompt.v2.ts` et une nouvelle `EXTRACTION_VERSION`.

### Revue

```bash
REVIEWER_USER_ID=<uuid> bun run scripts/pro/review.ts [--isin FR…] [--all]
```

Affiche, champ par champ, la valeur, la page, la citation, ✓/✗ et la raison de
la mise en revue. `v` valide ; `c <champ> <valeur>` corrige — la nouvelle
citation est re-vérifiée contre le PDF archivé, sinon la correction est
refusée ; l'ancienne valeur est conservée dans la preuve.

### Précision sur les fixtures

`fixtures/annexes/` : 7 annexes publiques (FR/EN, art. 8 et 9, PAI oui/non,
souverains, fourchettes) et `expected.json`, saisi à la main indépendamment du
modèle — **à relire et corriger**.

```bash
bun run scripts/pro/eval-fixtures.ts            # appels modèle pour ce qui n'est pas en cache
bun run scripts/pro/eval-fixtures.ts --cached   # rejoue sans appel
```

Les sorties du modèle sont mises en cache dans `fixtures/annexes/extractions/`
(à committer) ; `fixtures-accuracy.test.ts` rejoue alors vérification et
notation sans réseau et exige 100 % sur les axes (a), (b), (c). Sans cache, ce
test est ignoré. Rapport : `fixtures/annexes/extractions/REPORT.md`.

Diagnostic : `bun run scripts/pro/dump-text.ts annexe.pdf` imprime le texte vu
par la vérification.

## Limites connues de l'extraction

- Cases à cocher et camemberts sont souvent des éléments graphiques sans texte :
  la valeur ne se vérifie alors pas par le texte (`visual: true`). Sur un champ
  clé, cela envoie en revue.
- Un même engagement peut être chiffré différemment entre l'encadré de la
  première page et l'allocation d'actifs (cas Ecofi Enjeux Futurs) : minimum
  retenu, revue obligatoire.
- L'ISIN n'est presque jamais dans l'annexe.

## 3. Moteur de matching (`src/lib/pro/matching/engine.ts`)

Module pur (aucune I/O, aucune horloge : la date de référence `asOf` est
passée en option), `ENGINE_VERSION = "1.0.0"`, archivée dans chaque rapport.

```ts
match(preferences, fundData | null, { asOf: "2026-11-24", isin? }) → { verdict, axes, alerts, engine_version }
```

Entrées validées par zod (`src/lib/pro/matching/types.ts`) : un minimum
exprimé est strictement positif, des catégories PAI exigent `pai_required`.

| Axe | PASS si                                                              | Sinon                                                                               |
| --- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| (a) | valeur la plus basse entre « avec » et « hors » souverains ≥ minimum | FAIL ; aucune des deux → DONNEE_MANQUANTE ; art. 6 → FAIL                           |
| (b) | `min_sustainable_pct` ≥ minimum                                      | FAIL ; null → DONNEE_MANQUANTE ; art. 6 → FAIL                                      |
| (c) | `considers_pai = true` (et catégories demandées identifiées)         | `false` → FAIL ; null → DONNEE_MANQUANTE ; catégorie non identifiable → A_CONFIRMER |

Verdict, dans cet ordre :

1. `NEUTRE` — aucune préférence exprimée ;
2. `A_VERIFIER` — pas de données pour l'ISIN, extraction `needs_review`, ou un
   axe en DONNEE_MANQUANTE (même si un autre axe échoue) ;
3. `ADEQUAT` — tous les axes PASS ;
4. `NON_ADEQUAT` — tous les axes FAIL ;
5. `A_VERIFIER` — aucun FAIL mais au moins un axe A_CONFIRMER ;
6. `PARTIEL` — sinon.

Une extraction `auto` (citations vérifiées, pas encore revue) peut être
ADEQUAT : l'alerte `NON_VALIDE` le signale.

Alertes (constats factuels, sans effet sur le verdict) :

| Code                        | Niveau    | Condition                                                                                                                                                          |
| --------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NOM_ESG_ALLOCATION_FAIBLE` | attention | nom contenant ESG, durable, ISR, green, climat, impact, transition, sustainable, responsible (et variantes) et #1 < 80 % (orientations ESMA sur les noms de fonds) |
| `NOM_DURABLE_SANS_ID`       | attention | « durable »/« sustainable » dans le nom et `min_sustainable_pct = 0`                                                                                               |
| `ART8_ZERO_INVEST_DURABLE`  | info      | art. 8 et `min_sustainable_pct = 0`                                                                                                                                |
| `TAXO_ZERO`                 | info      | une proportion taxinomie (avec ou hors souverains) = 0                                                                                                             |
| `PAI_NON`                   | attention | `considers_pai = false`                                                                                                                                            |
| `DOC_ANCIEN`                | attention | `doc_date` antérieure de plus de 12 mois à `asOf`                                                                                                                  |
| `NON_VALIDE`                | attention | statut `auto` ou `needs_review`                                                                                                                                    |

Une valeur inconnue ne déclenche jamais d'alerte (on ne constate pas ce qu'on
ne sait pas).

```bash
bun run test:pro:coverage   # tests du moteur, seuil de couverture 100 %
```

## 4. Rapport PDF (`src/lib/pro/report/`)

**Choix : pdf-lib** (+ `@pdf-lib/fontkit`), pas Cloudflare Browser Rendering.
pdf-lib est du JS pur : il tourne tel quel dans le Worker et dans les scripts,
sans binding payant ni navigateur distant, et son rendu est déterministe (même
entrée → mêmes octets), ce qui permet de régénérer un rapport archivé et de le
comparer à son empreinte.

- `model.ts` : entrées validées (zod), verdicts via le moteur, date de
  référence en heure de Paris, `data_snapshot_hash` (SHA-256 du JSON canonique
  des données fonds utilisées) et `content_hash` (contenu du rapport).
- `pdf.ts` : rendu A4 portrait. En-tête (cabinet, ORIAS, pseudonyme, date et
  heure, ID), préférences et adaptation documentée, tableau de synthèse,
  détail par fonds avec citations et pages, méthodologie et limites, versions
  et empreintes, mention légale (encadrée en fin de rapport et en pied de
  chaque page).
- Polices : Inter (sous-ensemble latin, OFL) et IBM Plex Mono (fichiers WOFF
  d'origine, non modifiés : la licence réserve le nom « Plex » aux versions
  non modifiées ; le sous-ensemble est fait à l'embarquement dans le PDF).
  Licences dans `src/lib/pro/report/fonts/`.
- L'empreinte du fichier PDF ne peut pas figurer dans le fichier lui-même :
  elle est calculée après rendu et archivée dans `pro_reports.pdf_sha256`.

Exemple à 5 fonds réels (cabinet fictif, ORIAS 00000000, bandeau « EXEMPLE »),
citations vérifiées contre les PDF avant rendu :

```bash
bun run scripts/pro/sample-report.ts   # → fixtures/report/sample-report.pdf
```

## 5. Interface `/pro`

Pages (`src/routes/pro/`, rendu client derrière la garde d'authentification,
comme `_authenticated`) :

| Route               | Rôle                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `/pro`              | création du cabinet au premier passage (nom, ORIAS), puis redirection vers les rapports                                 |
| `/pro/fonds`        | recherche par ISIN ou nom, engagements et statut des données (validées / non revues / à revoir), dépôt d'une annexe PDF |
| `/pro/clients/new`  | préférences : (a), (b), (c) + catégories PAI, adaptation documentée ; pseudonyme obligatoire                            |
| `/pro/rapports/new` | profil + ISIN collés ou CSV (clé de contrôle vérifiée), aperçu des verdicts, génération                                 |
| `/pro/rapports`     | historique, téléchargement par lien signé de 60 s, empreinte SHA-256 du PDF ; aucune suppression                        |

Fonctions serveur : `src/lib/pro/pro.functions.ts` (toutes derrière
`requireSupabaseAuth`, entrées zod). Lectures et écritures du cabinet avec le
client de l'utilisateur (RLS) ; seule la génération écrit `pro_reports` et le
PDF en service role, après avoir relu le profil sous RLS.

Interface en français uniquement : le module s'adresse aux CIF français et le
rapport est un document réglementaire en français. Ses chaînes ne passent donc
pas par `update_locales.ts` ; à revoir si une version multilingue est décidée.

### Dépôt d'annexes depuis l'interface

L'extraction est trop lourde pour le Worker. Le PDF déposé part dans
`pro-annexes/inbox/<uid>/<ISIN>__<horodatage>.pdf` (chaque utilisateur ne voit
que ses dépôts), puis :

```bash
bun run scripts/pro/ingest.ts --inbox
```

traite chaque dépôt (ISIN lu dans le nom de fichier) et le range dans
`processed/<uid>/` ou `failed/<uid>/` ; l'interface affiche ces états. Les
données n'apparaissent qu'après ingestion, avec leur statut de revue.

### Génération dans le Worker

- Le PDF est rendu dans le Worker : pdf-lib + fontkit (~0,5 Mo compressés) et
  polices inlinées (~0,2 Mo) ne sont chargés que par la fonction de génération
  (import dynamique), jamais côté client. Bundle serveur total ≈ 2,8 Mo
  compressés.
- Vérifié dans workerd (`wrangler dev --local`) : le PDF produit est identique
  à l'octet près à celui produit par Bun pour la même entrée.
- Temps de rendu mesuré en local : ~1,3 s pour 5 fonds. Au-delà de la limite
  CPU du plan Workers gratuit (10 ms) : plan payant requis (30 s par défaut).
