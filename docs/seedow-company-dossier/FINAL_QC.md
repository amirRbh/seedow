# FINAL_QC — Second passage critique

## Critical Issues (à trancher par le fondateur avant usage externe)
1. **Absence d'exécution = fait central** : tout le dossier en dépend. Si une intégration courtier/custody existe hors repo, corriger `01`/`07`/`14`. *(Vérifié : aucune trace dans le repo → traité comme FACT « pas d'exécution ».)*
2. **Traction 100 % UNKNOWN** : tous les chiffres business (TAM/SAM/SOM, unit economics, financial model) sont des cadres, pas des preuves. Ne pas présenter comme réels.
3. **Modèle de revenu non défini** dans le produit (`tarifs.future` vide) : les recommandations `07` sont des propositions, pas l'état actuel.

## Data Gaps (UNKNOWN à combler par le fondateur)
Users/waitlist · activation/rétention/NPS · revenu · CAC/LTV réels · équipe (taille, founder story) · entité légale & statut réglementaire · financement levé & valorisation · coûts réels (IA/data/infra) · fournisseurs ESG contractés · métriques boucle certificat. (Liste complète `20` §C.)

## Assumptions (les plus fragiles, à sonder)
- SAM = 30 % du TAM (`04`) — hypothèse la plus sensible.
- ARPU ~50 €/an — aucun prix réel testé.
- Conversion payante 3-12 % — plage large, non observée.
- « Le problème existe tel que décrit » — issu des personas CLAUDE.md, pas d'interviews utilisateurs vérifiées.

## Contradictions relevées
- **Déploiement** : `ci.yml` mentionne « Vercel » ; README/CLAUDE.md disent Cloudflare Workers → probable commentaire obsolète, à corriger dans le repo (hors périmètre de cette mission : ne pas modifier le code).
- **CLAUDE.md §4** dit « design tokens hex » ; **README** dit « tokens oklch ». Divergence de doc mineure à réconcilier.
- Univers « ~58 » = comptage approximatif de tickers distincts insérés dans les migrations ; le nombre *actif* en base peut différer (désactivations). Marqué approximatif partout.

## Cohérence des chiffres (vérifiée)
- Score overall 58 cohérent avec la moyenne pondérée des sous-scores (Business Model 30 et Growth 40 tirent vers le bas). ✔
- LTV/CAC (`08`), scénarios financiers (`13`) et funding ask (`14`) sont mutuellement cohérents (B2C seul insuffisant → data B2B/exécution). ✔
- Sources externes datées et attribuées (`20`). ✔

## Ton (auto-critique)
Le dossier est volontairement sévère (consigne : pas de complaisance). Risque inverse : sous-estimer la valeur de l'avance produit/temps-marché. Contrepoids : `15` « pourquoi investir » et `06` (leviers de moat) équilibrent.

## Recommended Next Actions
1. Le fondateur remplit les UNKNOWN (surtout traction + founder story).
2. Vérifier l'existence/non d'une passerelle d'exécution ; ajuster le dossier.
3. Instrumenter le funnel sous 30 j pour remplacer les cadres par des données.
4. Rafraîchir les sources marché avant toute présentation (données évoluent).
5. Faire relire le volet réglementaire (`19` R12/R14) par un juriste fintech.
