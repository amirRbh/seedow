# Refonte de la landing — clarté fintech, DA Seedow

Direction retenue : la troisième (« Clarté fintech ») — hero centré lisible, nav fine avec accès direct aux cours et à la méthodologie, et surtout un **aperçu réel du produit** juste sous les CTA. Mais rendue dans notre univers éditorial papier/encre, pas dans le blanc/emerald générique du prototype.

## Ce qui change concrètement

**Nav (haute, fine, collante)**
- Wordmark seedow + point vert pulsant.
- Liens : Cours gratuits · Méthodologie · Se connecter.
- Pastille « Bêta · X places » alimentée par le compteur réel existant (pas un chiffre écrit en dur).

**Hero**
- Eyebrow mono : « Données MSCI ESG & cours de marché réels ».
- Titre Bebas en deux temps : promesse claire de ce que fait Seedow (aligner son épargne sur ses convictions), pas une phrase abstraite.
- Sous-titre en une phrase qui dit le quoi : simuler un portefeuille responsable, détecter le greenwashing, apprendre avec Ethi.
- CTA duo : « Simuler sans compte · 2 min » (encre plein, primaire) + « Créer mon compte » (outline). Rassurance dessous : sans carte, sans engagement.

**Aperçu produit (le bloc qui manque aujourd'hui)**
Une carte papier avec une barre d'en-tête mono « Simulateur Seedow », divisée en deux :
- à gauche, les convictions sélectionnables (Climat & Énergie actif, Droits humains, Biodiversité en retrait) ;
- à droite, le résultat : score ESG, comparatif vs MSCI World, delta carbone, en chiffres mono.
Statique et illustratif, chaque chiffre étiqueté « exemple » — aucune performance inventée présentée comme réelle.

**Suite de page (conservée, resserrée)**
- Comment ça marche en 3 étapes avec chiffres géants outline.
- Bloc sombre high-contrast : transparence et sources de données (Yahoo Finance, MSCI ESG, méthodologie ouverte).
- Cours gratuits en grille de cartes papier.
- Bandeau capital simulé + mentions légales, footer.

## Respect de la DA existante

- Fonds papier `#F5F3EC`, cartes `#E0DCCE`, bordures `#DEDACE`, encre `#0A0A0A`, texte secondaire `#6B6B66`.
- Vert mûr `#0B7A3E` comme seul accent signal, un par section — pas d'emerald clair, pas de dégradé, pas d'ombre portée.
- Bebas Neue en display, Inter en corps, IBM Plex Mono pour chiffres, labels et eyebrows.
- Pills radius 100px, cartes radius 14px, blocs sombres radius 16px.

## Garde-fous produit

- Aucune promesse de rendement, aucun conseil en investissement.
- Mention « capital simulé — aucun argent réel investi » visible sur la page.
- CTA principal = parcours invité, comme aujourd'hui.
- Chiffres du compteur bêta et de la waitlist tirés des fonctions existantes.

## Détails techniques

- Réécriture de `src/routes/index.tsx` uniquement (plus les tokens manquants dans `src/styles.css` si besoin) ; aucune logique métier touchée.
- Le tracking déjà en place (`landing_viewed`, `landing_cta_clicked`, `preview_started`) est conservé et recâblé sur les nouveaux CTA.
- `EsgQuickCheck` et `LandingCourses` sont réutilisés, restylés au besoin.
- Nouvelles chaînes passées par `update_locales.ts` (fr + en).
- `head()` de la route conservé avec titre/description/OG à jour.
