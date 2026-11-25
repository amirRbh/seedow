# Seedow — dossier incubateurs (novembre 2026)

> Document de travail pour les échanges avec les incubateurs et accélérateurs.
> Règle : on distingue ce qui **existe et est vérifié** de ce qui reste **à prouver**.
> Aucun chiffre de traction n'est inventé : les cases vides sont à remplir avec
> des données réelles.

## One-pager

**Seedow** rend vérifiable la durabilité de l'épargne.

- **B2C** — une application d'investissement éthique : portefeuille structuré selon
  les convictions de l'utilisateur, données de marché réelles, assistant Ethi qui
  explique sans rien vendre.
- **B2B (Seedow Pro)** — pour les conseillers en gestion de patrimoine (CGP/CIF) :
  la preuve, page par page dans l'annexe réglementaire, que chaque fonds proposé
  correspond aux préférences de durabilité du client. Livrable : un rapport
  d'adéquation horodaté et immuable.

**Pourquoi maintenant**

1. **Contrôles.** L'AMF a publié en février 2026 la synthèse de ses contrôles sur les
   préférences de durabilité : anomalies dans les rapports d'adéquation de tous les
   établissements contrôlés ([source](https://www.amf-france.org/sites/institutionnel/files/private/2026-02/synthese-spot-preferences-durabilite-fr.pdf)).
2. **Doctrine.** L'ACPR et l'AMF ont précisé en novembre 2025 un parcours de recueil
   simplifié et les pratiques attendues ([source](https://acpr.banque-france.fr/system/files/2025-11/Approche_ACPR-AMF_preferences_durabilite_public.pdf)).
3. **Réforme.** Accord politique sur SFDR 2.0 le 19 novembre 2026 : trois catégories
   de produits, termes de durabilité réservés aux produits classés, application vers
   fin 2028 ([analyse Arendt](https://www.arendt.com/news-insights/news/sfdr-2-0-council-of-the-eu-and-eu-parliament-reach-provisional-agreement-on-new-sustainability-product-categories/)).
   Deux ans de transition pendant lesquels les CGP devront documenter avec les
   anciennes règles tout en se préparant aux nouvelles.

**Différenciation** : pas de note ESG propriétaire. Seedow cite le document
opposable (l'annexe précontractuelle SFDR), avec la page ; tout doute part en revue
humaine. C'est le « contrôle de cohérence » avec les données des producteurs que
l'AMF cite comme bonne pratique.

## Ce qui existe (vérifiable dans le dépôt)

| Brique                                                                              | État                                                                                   |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| App B2C (portefeuille, données de marché, Ethi, Observatoire STI 2.0, API publique) | En bêta                                                                                |
| Seedow Pro : schéma de données avec contrôle d'accès, rapports immuables            | Testé sur Postgres ; migrations à appliquer en production                              |
| Extraction des annexes SFDR avec citations vérifiées                                | Construit et testé unitairement ; **précision sur annexes réelles pas encore mesurée** |
| Moteur de matching (fonds et portefeuille, règles ESMA sur les noms)                | 100 % de couverture de tests                                                           |
| Rapport PDF, fiche de recueil, scan de contrat                                      | Exemples générés sur 5 fonds réels                                                     |
| Interface `/pro` (recueil, profils prédéfinis, rapports, fonds)                     | Build validé ; non testée contre la base de production                                 |

## Ce qui reste à prouver — et comment

| Hypothèse                         | Test                                      | Seuil de validation proposé                                          |
| --------------------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| Les CGP ressentent le problème    | 15 entretiens de découverte               | ≥ 10 citent le rapport d'adéquation ou le contrôle comme douleur     |
| Le scan de contrat ouvre la porte | 20 scans gratuits                         | ≥ 8 rendez-vous de démo                                              |
| L'extraction est fiable           | Précision sur 50 annexes relues           | 100 % sur les champs des trois critères, revue humaine pour le reste |
| Les CGP paient                    | Pilote de 3 mois avec 5 à 10 cabinets     | ≥ 3 cabinets convertis au prix testé                                 |
| B2C → B2B (ou l'inverse)          | Suivi des cabinets venant de contenus B2C | À définir                                                            |

## Marché — à compléter avec des chiffres sourcés

- Nombre de CIF immatriculés : **à extraire du rapport annuel ORIAS**
  ([orias.fr](https://orias.fr/home/documents/ORIAS-STATIC-ANNUAL-REPORTS-FR-2023)).
- Concurrence et substituts : logiciels de gestion de patrimoine du marché,
  fournisseurs de données ESG, fichiers EET des producteurs. **Cartographie à
  faire**, sans attribuer de fonctionnalités non vérifiées.
- Part de clients exprimant des préférences détaillées : environ 5 % selon
  l'ACPR et l'AMF (≈ 95 % n'en expriment pas). Le besoin porte donc aussi sur la
  traçabilité des clients neutres ou à profil prédéfini.

## Trame du pitch (10 diapositives)

1. **Accroche** — « Ce n'est pas une fatalité. C'est un choix. Le tien aussi. »
2. **Problème** — les trois constats de la synthèse SPOT, avec la source à l'écran.
3. **Pourquoi maintenant** — SPOT 2026, doctrine ACPR/AMF, SFDR 2.0.
4. **Produit** — démonstration : 5 ISIN, le rapport, une citation, la page.
5. **Différenciation** — la source opposable plutôt qu'une note ; « donnée
   manquante » n'est jamais « conforme ».
6. **Business model** — abonnement par conseiller, scan de contrat ; aucune
   rétrocession (la neutralité est le produit).
7. **Go-to-market** — scan gratuit, pilote de 3 mois, associations professionnelles.
8. **B2C** — l'app et le contenu pédagogique comme moteur de notoriété.
9. **Traction** — _uniquement des chiffres réels : entretiens, pilotes, rapports
   générés_.
10. **Demande** — ce que nous attendons de l'incubateur (mise en relation avec des
    réseaux de CGP, accompagnement juridique pour les CGU Pro et le RGPD,
    financement).

## Questions à poser aux incubateurs

- Avez-vous des partenaires dans les réseaux de CGP ou les associations agréées ?
- Accompagnement réglementaire (avocat financier, DPO) inclus ?
- Accès à des experts conformité AMF ou ACPR (anciens contrôleurs, cabinets) ?
- Conditions : prise de participation, durée, obligations de présence.
