## Ce que j'ai vérifié avant d'écrire ce plan

- **0 actif sur 112** a une valeur de WACI en base aujourd'hui.
- Le parseur de fiches produit iShares US existe déjà, est testé, et l'infrastructure d'ingestion gouvernée (source + date obligatoires) existe aussi.
- **Fiches iShares US : accessibles** (téléchargement OK, format attendu par le parseur).
- **Fiches iShares UCITS (Europe) : accessibles mais sans section durabilité MSCI.** J'en ai téléchargé et lu une : elle contient l'ISIN, les frais, la classification SFDR — mais aucun WACI, aucun score de qualité MSCI, aucune température implicite.
- **MSCI en direct : inaccessible** (pages de notation de fonds en erreur).
- **Amundi, UBS, DWS/Xtrackers : inaccessibles** en lecture automatisée (erreurs 403/404 ou pages vides sans données).
- Répartition de l'univers : **32 lignes cotées aux États-Unis**, **80 lignes cotées en Europe**.

Conclusion honnête : on peut remplir une minorité de l'univers avec des données réelles. On ne peut pas remplir les 112. Je ne comblerai aucun trou par estimation.

## Objectif

Récupérer tout ce qui est réellement sourçable, et rendre visible ce qui ne l'est pas — au lieu de laisser l'app calculer un impact sur une base vide sans le dire.

## Étapes

### 1. Moisson iShares US (base solide)
Lancer le script d'ingestion existant sur les 11 fonds iShares cotés aux États-Unis présents dans l'univers. Chaque ligne récupérée porte : WACI, score de qualité MSCI, température implicite, note MSCI, et la date « as of » de la fiche. Rien n'est écrit sans source ni date.

### 2. Élargir aux autres émetteurs US
21 autres lignes sont cotées aux États-Unis (KraneShares, Global X, VanEck, First Trust, Vanguard, Invesco, State Street, ALPS, Vert). Leurs fiches produit suivent des formats différents. Je teste l'accès émetteur par émetteur, j'écris un petit parseur par format qui marche, et j'abandonne proprement ceux qui ne publient pas la donnée. Objectif réaliste : quelques lignes de plus, pas les 21.

### 3. Tentative ciblée sur l'Europe
Les fiches marketing UCITS ne portent pas la donnée. Deux pistes restent à tester avant de conclure :
- les documents « caractéristiques de durabilité » / rapports PAI que certains émetteurs publient séparément de la fiche produit ;
- les documents réglementaires SFDR annexés au prospectus.

Si aucune de ces pistes n'aboutit sur un format lisible automatiquement, je le dis et je m'arrête là — pas de valeur reconstituée à la main sur 80 lignes.

### 4. Récupérer ce qui EST disponible sur les fiches UCITS
Même sans WACI, les fiches européennes portent des données vérifiables et actuellement approximées en base : **classification SFDR officielle** et **frais réels (TER)**. Je les extrais et je corrige les valeurs estimées par les valeurs publiées, avec source et date.

### 5. Rendre la couverture visible dans l'app
C'est le point non négociable. Le moteur calcule déjà un taux de couverture carbone, mais l'interface ne le montre pas assez :
- sur le bloc Impact : afficher explicitement « calculé sur X % du portefeuille » et masquer le chiffre quand la couverture est trop faible pour être honnête, plutôt que d'afficher un nombre trompeur ;
- sur la fiche d'un fonds : afficher « non publié par l'émetteur » au lieu d'un blanc ;
- sur la page Méthodologie : lister quels émetteurs publient la donnée et lesquels ne la publient pas.

### 6. Journal de provenance
Une note datée dans la documentation méthodologie : quelles sources ont été interrogées, lesquelles répondent, lesquelles ne répondent pas, à quelle date. Pour que le prochain passage n'ait pas à refaire cette enquête.

## Détails techniques

- Ingestion via la server function admin existante (`ingestIssuerEsgData`), qui impose source + date « as of » au niveau du schéma — pas de migration one-off avec des valeurs en dur.
- Le parseur actuel gère le format US ; les autres formats émetteurs feront l'objet de fonctions séparées, chacune couverte par un test sur un extrait réel.
- Aucune valeur écrite sans provenance : un champ non trouvé reste `null`.
- Le côté affichage (étape 5) touche uniquement les composants d'impact et de fiche produit, pas le moteur de calcul.

## Ce que ce plan ne promet pas

Il ne promet pas une couverture carbone complète. Au vu de ce que les émetteurs européens publient en accès libre, l'issue probable est une couverture partielle — de l'ordre du quart de l'univers. La valeur livrée est double : les données réelles là où elles existent, et l'honnêteté affichée là où elles n'existent pas.
