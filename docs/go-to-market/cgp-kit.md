# Kit commercial Seedow Pro — cabinets CGP / CIF

> Usage interne. Chaque affirmation réglementaire renvoie à sa source ; voir aussi
> [`docs/pro/veille-reglementaire-2026-11.md`](../pro/veille-reglementaire-2026-11.md).
> Règle d'or : on ne promet jamais une « conformité garantie ». Seedow documente ;
> l'appréciation de l'adéquation reste de la responsabilité du CIF.

## 1. Le problème, dans les mots du régulateur

- **Contrôles SPOT de l'AMF sur les préférences de durabilité (février 2026)** —
  [synthèse](https://www.amf-france.org/sites/institutionnel/files/private/2026-02/synthese-spot-preferences-durabilite-fr.pdf).
  Constats sur cinq établissements :
  - les rapports d'adéquation de **tous** les établissements du panel présentaient
    des anomalies ayant conduit à un constat de manquement (§3.4.2) ;
  - adaptations des préférences documentées par une **mention générique**, ce qui
    constitue un manquement (§3.4.1) ;
  - des conseils délivrés malgré le **refus** du client d'adapter ses préférences ;
  - des explications au client **non traçables** ;
  - des données des producteurs reprises **sans contrôle de cohérence**.
- **Document conjoint ACPR/AMF (novembre 2025)** —
  [PDF](https://acpr.banque-france.fr/system/files/2025-11/Approche_ACPR-AMF_preferences_durabilite_public.pdf) :
  - « une proportion significative des parcours de conseil observés ne sont pas
    conformes » ;
  - un conseil est souvent « insuffisamment étayé » pour que le client comprenne en
    quoi ses préférences sont respectées.
- **Orientations ESMA sur les noms de fonds** (applicables depuis 2024-2025) : un fonds
  « durable », « climat » ou « ESG » doit respecter un seuil de 80 % et des
  exclusions précises. Le CGP qui recommande un fonds sur la foi de son nom prend un
  risque.

**Ce que vit le CGP** : un questionnaire de plus, des données producteurs
hétérogènes (fichiers EET), des annexes SFDR de 10 à 40 pages par fonds, et un
contrôle qui porte sur la **preuve écrite**.

## 2. Ce que fait Seedow Pro (et ce qu'il ne fait pas)

| Fait                                                                                                                                                                                                                              | Ne fait pas                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Recueil** des préférences en trois parcours (neutre, détaillé, profil prédéfini du cabinet), conforme au parcours décrit par l'ACPR et l'AMF, avec une **fiche de recueil** archivée (explication neutre et réponses du client) | Ne remplace pas le questionnaire MiFID complet (connaissances, situation, risque) |
| **Lecture des annexes précontractuelles SFDR** : chaque engagement (taxinomie, investissements durables, PAI, part #1, exclusions) avec **sa citation et sa page** ; doute → revue humaine                                        | N'utilise pas de note ESG propriétaire ni de « score de durabilité »              |
| **Confrontation** fonds par fonds ou **en portefeuille** (moyenne pondérée), approche cumulative, donnée manquante jamais « conforme »                                                                                            | Ne recommande aucun fonds                                                         |
| **Adaptation encadrée** : proposée seulement si rien ne correspond, valable pour ce seul conseil ; refus → rapport « aucune recommandation »                                                                                      | Ne modifie jamais le recueil initial                                              |
| **Rapport PDF horodaté et immuable** : préférences, verdicts, citations, constats sur les noms de fonds (ESMA), empreintes SHA-256, mention de responsabilité                                                                     | Ne garantit pas la conformité du cabinet                                          |
| **Scan de contrat** : la liste des UC d'un contrat d'assurance-vie passée à trois profils types, en une page et un CSV                                                                                                            | Ne vend pas de produits et ne perçoit aucune rétrocession                         |

**Promesse en une phrase** : _« Pour chaque fonds que vous proposez, la preuve, page
par page, qu'il correspond aux préférences de durabilité de votre client — ou
pourquoi il n'y correspond pas. »_

## 3. Cibles et porte d'entrée

1. **CIF indépendants et petits cabinets** (1 à 10 conseillers), adhérents d'une
   association agréée (ANACOFI-CIF, CNCGP…). Décideur : le dirigeant, souvent
   conseiller lui-même.
2. **Responsables conformité** de cabinets plus grands ou de réseaux.
3. **Associations et plateformes** : partenariats de distribution (à explorer).

**Porte d'entrée recommandée : le scan de contrat gratuit.** Le CGP envoie la liste
des UC d'un contrat qu'il utilise ; il reçoit en 48 h la synthèse d'une page (« X UC
sur Y non adéquates pour un profil fort ») et le CSV. Coût pour Seedow : quelques
annexes à ingérer ; valeur immédiate et concrète pour le CGP.

## 4. Séquence d'approche (à personnaliser, jamais en masse)

**Message 1 — LinkedIn ou email (J0)**

> Objet : préférences de durabilité — vos rapports d'adéquation tiennent-ils face à un contrôle ?
>
> Bonjour {Prénom},
> L'AMF a publié en février sa synthèse des contrôles sur les préférences de
> durabilité : chez tous les établissements contrôlés, les rapports d'adéquation
> présentaient des anomalies, notamment des adaptations de préférences
> documentées par une simple mention générique.
> Nous avons construit un outil qui lit les annexes SFDR de vos fonds et produit,
> pour chaque client, un rapport horodaté où chaque chiffre est cité avec sa page.
> Je vous propose de scanner gratuitement la liste d'UC d'un contrat que vous
> utilisez : vous saurez en une page lesquelles correspondent à un client au profil
> « durable ». Intéressé ?

**Message 2 (J+4)** — joindre l'exemple de synthèse de scan (PDF d'une page) et
l'exemple de rapport (`fixtures/report/sample-report.pdf`).

**Message 3 (J+10)** — une question ouverte, sans relance commerciale :
_« Comment documentez-vous aujourd'hui le cas où aucun fonds ne correspond aux
préférences d'un client ? »_

Règles : pas d'urgence fabriquée, pas de peur (« sanctions », « amendes »). On cite
le régulateur, on montre un document, on propose un test gratuit.

## 5. Démo de 15 minutes

1. **(2 min) Contexte** — trois constats de la synthèse SPOT, avec la page projetée.
2. **(3 min) Recueil** — parcours neutre, détaillé ou prédéfini ; montrer la fiche
   de recueil PDF et l'explication neutre des trois critères.
3. **(4 min) Rapport** — coller 5 ISIN et l'allocation, aperçu, cliquer sur une
   citation et retrouver la page dans l'annexe.
4. **(3 min) Adaptation** — cas où rien ne correspond : proposition, accord du
   client, rapport qui retrace l'avant et l'après ; puis le refus et sa page
   « aucune recommandation ».
5. **(2 min) Scan de contrat** — la synthèse d'une page.
6. **(1 min) Limites** — sources, revue humaine, ce que l'outil ne fait pas.

## 6. Questions de découverte

- Combien de clients avez-vous conseillés ces 12 derniers mois ? Quelle part a
  exprimé des préférences détaillées ?
- Quel outil utilisez-vous pour le recueil ? Pour le rapport d'adéquation ?
- D'où viennent vos données de durabilité sur les fonds (plateforme, EET,
  producteurs) ? Les avez-vous déjà vérifiées ?
- Que faites-vous quand aucun fonds ne correspond ?
- Avez-vous été contrôlé (AMF, association) depuis 2022 ? Qu'a-t-on regardé ?
- Combien de contrats d'assurance-vie et de listes d'UC utilisez-vous ?

## 7. Objections et réponses

| Objection                                        | Réponse                                                                                                                                                                                                        |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Mon logiciel de gestion le fait déjà. »        | Il recueille souvent les préférences et lit l'EET du producteur. Seedow relit l'annexe opposable et cite la page : c'est le contrôle de cohérence que l'AMF cite comme bonne pratique. Les deux se complètent. |
| « 95 % de mes clients n'ont pas de préférence. » | C'est ce que constatent l'ACPR et l'AMF. Le rapport doit pourtant le dire, et le parcours prédéfini, prévu par les régulateurs, évite le questionnaire détaillé.                                               |
| « Je n'ai pas le temps. »                        | Le recueil prend 2 minutes, le rapport se génère en un clic à partir d'une liste d'ISIN.                                                                                                                       |
| « Et si l'outil se trompe ? »                    | Chaque valeur est citée avec sa page et vérifiée automatiquement contre le texte ; les cas ambigus passent en revue humaine et sont signalés comme tels dans le rapport.                                       |
| « Mes données clients ? »                        | Seul un pseudonyme est stocké, jamais le nom ni l'email du client. Hébergement et RGPD : voir §9.                                                                                                              |
| « SFDR 2.0 va tout changer. »                    | Accord politique du 19 novembre 2026, application vers fin 2028. D'ici là, les annexes actuelles restent la référence ; le moteur est versionné pour la bascule.                                               |

## 8. Offre pilote et prix — HYPOTHÈSES À TESTER

Rien n'est arrêté. Hypothèses pour les premiers entretiens, à valider ou invalider :

- **Pilote** : 3 mois offerts pour 5 à 10 cabinets, en échange de retours
  structurés (un entretien par mois) et de l'autorisation de citer le cabinet,
  sans données client.
- **Prix (à tester en entretien, pas à annoncer)** : abonnement mensuel par
  conseiller, avec une option « scan de contrat » à l'acte. Mesurer le
  consentement à payer avec la question : _« Quel coût vous paraîtrait trop élevé
  pour ne plus y penser ? »_
- **Pas de rétrocession** ni de commission sur les produits : c'est la condition de
  la neutralité.

## 9. FAQ conformité, données, sécurité

- **Statut** : outil d'aide à la documentation. Seedow ne fournit pas de conseil en
  investissement et n'est pas CIF. La mention figure sur chaque page des PDF.
- **Données clients** : pseudonyme interne au cabinet uniquement ; une base de
  données refuse un email comme identifiant.
- **Cloisonnement** : chaque cabinet ne voit que ses profils, fiches et rapports
  (contrôle d'accès au niveau de la base, testé).
- **Archivage** : rapports et fiches **immuables** (ni modification ni suppression,
  même par Seedow) ; empreinte SHA-256 de chaque PDF.
- **Sources** : annexes précontractuelles publiques des sociétés de gestion ;
  aucune donnée de tiers sous licence dans les rapports.
- **Hébergement** : Supabase managé par Lovable Cloud et Cloudflare Workers.
  _À compléter avant la commercialisation : région d'hébergement, sous-traitants
  RGPD, contrat de traitement (DPA)._

## 10. À faire avant le premier rendez-vous

- [ ] Appliquer les migrations et vérifier `/pro` sur un vrai compte.
- [ ] Ingérer les annexes des fonds les plus distribués par les cabinets cibles
      (liste à constituer avec les premiers CGP).
- [ ] Mesurer la précision de l'extraction : clé Anthropic, puis
      `bun run scripts/pro/eval-fixtures.ts`.
- [ ] Compléter la FAQ hébergement et RGPD, et rédiger les CGU Pro.
- [ ] Préparer 2 ou 3 scans de contrats d'assurance-vie courants, à partir de
      listes d'UC publiques.
