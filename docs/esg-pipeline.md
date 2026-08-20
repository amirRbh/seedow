# Pipeline ESG/SFDR — architecture & flux

> Infrastructure gratuite, **traçable** et **légalement défendable** pour attacher
> à un fonds une classification SFDR **prouvée par un document officiel** — jamais
> déduite (§1 « ne rien inventer »). Le principe directeur : _une donnée manquante
> vaut mieux qu'une donnée inventée ; une preuve vaut mieux qu'une note opaque ;
> un système qui sait dire `UNKNOWN` vaut mieux qu'un système qui prétend tout
> savoir._

Code : `src/lib/esg/sfdr-pipeline/` · Runner POC : `scripts/esg-sfdr-poc.ts` ·
Workflow : `.github/workflows/esg-sfdr-poc.yml`.

## Flux

```text
ISIN
 ↓  DocumentResolver (GECO / AMF — source primaire, priorité 1)
Fonds officiel + documents (KID · DICI · prospectus · annexe SFDR)
 ↓  DocumentDownloader + DocumentExtractor (téléchargement + PDF → texte, caché)
Texte du document officiel  (+ empreinte SHA-256, §14 cache / §15 repro)
 ↓  SFDRParser (bilingue FR/EN, contextuel, anti-négation, anti-ambiguïté)
Preuve : { article, evidence_text, regulation_reference, confidence }
 ↓  EvidenceValidator (hiérarchie de source → verification_status)
Observation traçable  →  data_observations (+ evidence_text, document_id, parser_version)
 ↓
ESG Gate  (PRIMARY + VERIFIED ⇒ PASS ; SECONDARY seul / UNKNOWN ⇒ FAIL)
```

## Les briques (génériques, injectées — §5 « pas 20 scrapers »)

| Brique                | Fichier                        | Rôle                                                                                  |
| --------------------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| `DocumentResolver`    | `pipeline.ts` (interface)      | ISIN → fonds officiel + liste de documents. Ordonnés par priorité (§2).               |
| `GecoResolver`        | `geco-resolver.ts`             | Adapte le client GECO **existant** (`data-engine/sources/geco.server`). Source PRIMARY. |
| `downloadAndExtract`  | `document-extractor.ts`        | Télécharge + extrait le texte (backend PDF injecté), avec cache par URL/empreinte.     |
| `extractSfdrEvidence` | `sfdr-parser.ts`               | Détermine l'article SFDR **et la preuve**, ou `null`. Bilingue, versionné.            |
| `runSfdrForIsin`      | `pipeline.ts`                  | Orchestre le tout ; renvoie une observation traçable OU un échec catégorisé (§12).    |

Un second resolver (asset-manager) s'ajoute **sans toucher le cœur** : il suffit
d'implémenter `DocumentResolver` et de l'insérer dans la liste ordonnée. C'est le
point d'extension prévu par le §5 (fallback niveau 2), à n'ajouter que si la
mesure le justifie (§13).

## Hiérarchie des sources (§2)

| Niveau        | Exemples                                        | `source_tier` | `verification_status` | Passe le gate ?          |
| ------------- | ----------------------------------------------- | ------------- | --------------------- | ------------------------ |
| 1 — primaire  | AMF/GECO, KID/DICI/prospectus officiels          | `PRIMARY`     | `VERIFIED`            | **Oui** (avec preuve)    |
| 2 — secondaire | extraETF, justETF, agrégateurs                  | `SECONDARY`   | `UNVERIFIED`          | **Non** (à lui seul)     |
| 3 — aucune    | pas de preuve trouvée                            | `UNKNOWN`     | `UNKNOWN`             | **Non** — reste bloqué   |

Le POC n'utilise que le **niveau 1** (GECO). Aucun scraping d'agrégateur : si les
ToS/robots d'une source interdisent l'automatisation, elle n'est pas utilisée (§16).

## Le parser SFDR (le cœur — §6, §18)

Il ne fait **pas** un `contains("Article 8")`. Règles :

1. **Classification explicite** (confiance `high`) — le fonds lui-même est classé :
   - FR : « … au sens de l'article 8 du règlement SFDR / (UE) 2019/2088 ».
   - EN : « The Fund is classified as an Article 8 product », « classified under
     Article 9 of Regulation (EU) 2019/2088 ».
2. **Référence liée** (confiance `medium`) — « Article 8 … 2019/2088 » sans verbe de
   classification, retenue seulement si **unique et non ambiguë**.
3. **Sujet = le fonds** : « Article 8 products are described… » (sujet générique) →
   `UNKNOWN`.
4. **Anti-négation** : « ne … pas … au sens de l'article 9 », « does not qualify as
   Article 9 » → l'article nié est écarté.
5. **Anti-ambiguïté** : deux articles distincts affirmés → `UNKNOWN` (jamais un
   choix arbitraire).
6. **Jamais de 6 par défaut** : l'absence de promotion E/S ne « fait » pas un
   article 6 ; il faut une classification 6 affirmée.

Chaque valeur produite est accompagnée du **snippet exact** (`evidence_text`) et
d'une `parser_version` (reproductibilité §15 : si la logique change, la version
change et on peut réexpliquer une donnée modifiée).

## Persistance — le ledger de preuve (§7, §9)

Réutilise le **ledger existant** (`data_engine_foundation`), pas de table
redondante :

- `fund_documents` — le document officiel (url, `published_date`, `checksum` =
  empreinte pour le cache/la détection de changement, `parse_status`).
- `data_observations` — la valeur atomique + sa provenance (`field='sfdr_article'`,
  `value_num`, `source_id`, `source_url`, `reference_date`, `retrieved_at`,
  `confidence`, `method`, `validation_status`), **étendu** (migration
  `esg_evidence_columns`) de `evidence_text`, `parser_version`, `document_id`.

Le modèle **empile les observations par date** : une même ISIN peut avoir plusieurs
observations historiques (les données ESG changent). On ne stocke jamais
`ISIN → SFDR 8` brut, mais `ISIN → SFDR 8, source officielle, observé le …,
document daté du …`.

Seedow peut donc répondre à « **pourquoi cet ETF est-il Article 8 ?** » avec la
phrase exacte du document officiel, sa date, son URL et son empreinte.

## Taxonomie d'échec (§12)

Jamais un simple « failed ». Chaque ISIN non résolu porte SA raison :
`NO_GECO_MATCH` · `NO_DOCUMENT` · `DOCUMENT_BLOCKED` · `PDF_PARSE_FAILED` ·
`NO_SFDR_MENTION` · `AMBIGUOUS_SFDR` · `ISSUER_NOT_RESOLVED` · `RATE_LIMIT` ·
`NETWORK_RESTRICTION` · `OTHER`.

## Contrainte d'exécution (réseau)

GECO (`geco.amf-france.org`) n'est **pas joignable depuis le sandbox agent** (mur
d'egress proxy → 403). Le POC ne tourne donc réellement que depuis un **runner
GitHub Actions** (egress ouvert) : `.github/workflows/esg-sfdr-poc.yml`
(`workflow_dispatch`, `persist=false` par défaut = mesure seule).

> Limite connue : le client GECO agrège toutes les erreurs (réseau + HTTP) en
> `null`, donc un incident réseau transitoire sur l'endpoint de résolution serait
> compté comme `NO_GECO_MATCH`. Acceptable pour un POC ; à affiner si on
> industrialise (distinguer 404 « inconnu » d'une erreur réseau).

## Critère de décision (§13)

`couverture = verified_primary / échantillon`.
≥80 % → industrialiser · 60–80 % → ajouter un 2e resolver puis industrialiser ·
40–60 % → analyser les causes · <40 % → **ne pas** industrialiser, présenter et
revoir la stratégie de source.

Résultats mesurés : voir `docs/esg-sources.md`.
