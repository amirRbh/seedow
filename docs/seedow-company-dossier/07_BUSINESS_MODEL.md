# 07 — Business Model

## État actuel (FACT)

- **Gratuit (0 €)** pendant la bêta ouverte (`tarifs.tsx`).
- **Aucun revenu**, aucun mécanisme de monétisation dans le code.
- **`tarifs.future`** = chaîne placeholder → **le modèle de revenu n'est pas défini.** C'est la lacune stratégique n°1 côté business.
- **Pas d'exécution** → les modèles basés sur les flux/encours ne sont pas activables sans un chantier réglementaire.

## Options de modèle (évaluées)

| Modèle                                                                                | Revenu potentiel         | +                                                  | −                                                   | Complexité  | Scalabilité | Risque réglementaire | Cohérence promesse |
| ------------------------------------------------------------------------------------- | ------------------------ | -------------------------------------------------- | --------------------------------------------------- | ----------- | ----------- | -------------------- | ------------------ |
| **Freemium + abonnement B2C** (Ethi illimité, analyses avancées, multi-portefeuilles) | Moyen (~50 €/an)         | Aligné « rien à vendre » ; simple ; pas d'agrément | Willingness-to-pay incertaine sur un simulateur     | Faible      | Élevée      | **Faible**           | ●●●                |
| **% d'encours (robo classique)**                                                      | Élevé (0,5-1 %/an d'AUM) | Scalable, aligné long terme                        | **Exige exécution + agrément (PSI/CIF, MiFID/KYC)** | Très élevée | Élevée      | **Élevé**            | ●●                 |
| **Rétrocessions / commissions produits**                                              | Moyen-élevé              | Utilisateur gratuit                                | **Détruit le non-négociable « rien à vendre »**     | Moyenne     | Moyenne     | Moyen                | ● (rédhibitoire)   |
| **B2B2C / white-label** (néobanques, CSE, mutuelles, conseillers)                     | Élevé                    | Distribution + contrats ; la data ESG comme valeur | Cycle de vente long ; dépendance                    | Moyenne     | Élevée      | Moyen                | ●●                 |
| **API / licence data ESG & anti-greenwashing**                                        | Moyen-élevé              | Monétise le moat data ; marge logicielle           | Nécessite data-engine industriel + fiabilité        | Moyenne     | Élevée      | Faible               | ●●●                |
| **Passerelle courtier (referral/affiliation)**                                        | Faible-moyen             | Débloque l'acte sans agrément                      | Marge faible ; fuite de valeur/rétention            | Faible      | Moyenne     | Faible               | ●●                 |

## Recommandation

**Séquence, pas un choix unique :**

1. **Court terme (0-12 mois) — Freemium B2C + passerelle courtier.** Monétiser une petite base convaincue via un abonnement clair (aligné ADN), tout en débloquant l'_acte_ d'investir par une passerelle courtier (affiliation) → prouve la willingness-to-pay ET l'activation réelle sans agrément. _(OBJECTIF.)_
2. **Moyen terme (12-24 mois) — Licence data ESG / anti-greenwashing en B2B2C.** Transformer le data-engine et l'heuristique en produit vendable à des distributeurs (le vrai levier de moat + marge). _(OBJECTIF.)_
3. **Long terme — % d'encours** _seulement si_ la décision d'exécuter en propre est prise (avec le financement et l'agrément que cela suppose — voir `14`).

**Pourquoi.** Le % d'encours est le modèle le plus riche mais le plus coûteux/risqué (réglementaire) et **incohérent avec l'état actuel** (pas d'exécution). Le freemium + data B2B respecte les non-négociables (« rien à vendre »), monétise ce qui est déjà le plus différenciant (la donnée + la pédagogie), et n'exige pas d'agrément immédiat.

**Ligne rouge.** Les **rétrocessions produits** sont à exclure : elles tueraient la proposition de valeur fondatrice (« sans jamais rien vendre », CLAUDE.md §1.1).

> Toute projection de revenu dépend d'hypothèses ARPU/conversion **non prouvées** (traction = UNKNOWN). Voir `08` et `13`.
