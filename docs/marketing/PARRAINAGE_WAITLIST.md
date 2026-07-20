# Boucle de parrainage waitlist — mécanisme à coût zéro + emails

## 1. Le mécanisme (aligné sur ce qui existe déjà dans le produit)

La roadmap produit (`docs/BETA_ROADMAP.md` §7) prévoit déjà : `referral_code` sur `profiles`, `?ref=` sur la landing, attribution à l'inscription, boost de position waitlist. Le dispositif marketing s'appuie dessus — rien à payer, tout est du statut et de l'accès :

**La boucle** :
1. Chaque inscrit reçoit un lien personnel `seedow.life/?ref=CODE`.
2. **1 filleul inscrit = tu remontes dans la file** (la position réelle est déjà affichée — la progression est donc visible, c'est le moteur émotionnel de la boucle).
3. **Paliers de récompenses non monétaires** :
   - 1 filleul → accès immédiat à la beta (saute la file) ;
   - 3 filleuls → badge **« Early Seed »** sur le profil + affiché sur le certificat d'impact partageable (le certificat existe déjà : chaque partage de certificat devient une pub du badge, donc de la boucle) ;
   - 5 filleuls → accès en avant-première aux **alertes greenwashing temps réel** (prochaine brique de la roadmap — on transforme la roadmap en récompense) + son nom (opt-in) dans les remerciements des notes de version.
4. Pourquoi 2-3 invitations par inscrit est atteignable : la demande est formulée comme un **service à rendre au filleul** (« fais vérifier le fonds d'un proche ») et non comme de la promo (« invite tes amis »).

**Anti-abus minimal** (sans dev lourd) : compter uniquement les filleuls qui font ≥ 1 action (`search_performed` ou watchlist) — déjà instrumenté dans `app_events` ; plafond de 10 filleuls comptabilisés.

**Métrique de boucle** : facteur K = invitations envoyées × taux de conversion. Objectif réaliste à froid : K ≈ 0,3-0,5 (chaque 10 inscrits en amènent 3-5). Se mesure avec l'attribution `?ref=` + `source` sur la waitlist.

⏱ Côté produit : la brique est estimée « moyen » dans la roadmap. Côté marketing : 1 h pour les textes ci-dessous. **Version dégradée sans dev** (utilisable dès demain) : un simple lien `?ref=prenom` + comptage manuel hebdo + promesses tenues à la main — acceptable jusqu'à ~200 inscrits.

## 2. Email aux inscrits actuels de la waitlist (transformer l'attente en privilège)

**Objet (A/B)** :
- A : `Vous êtes parmi les [200] premiers sur Seedow — voici ce que ça vous donne`
- B : `Votre accès Seedow + une faveur à vous demander`

> Bonjour [Prénom],
>
> Vous vous êtes inscrit sur la liste d'attente de Seedow — vous faites partie des **[200] premiers**, avant même que quiconque ait vu le produit. Je voulais que ça compte pour quelque chose.
>
> **1. Votre accès est ouvert.** La beta est désormais accessible pour vous : [lien magique/lien d'accès]. Deux choses à tester en priorité :
> — Tapez le nom d'un fonds que vous détenez (assurance-vie, PEA…) : score ESG sourcé, transparence des données, signal de greenwashing expliqué. 10 secondes.
> — Mettez-le en watchlist : quand son statut bougera (déclassement, changement de score), vous serez prévenu.
>
> **2. Votre statut d'early adopter est réel, pas symbolique.** Voici votre lien personnel : `seedow.life/?ref=[CODE]`
> — 1 personne inscrite via votre lien → vous gardez un accès prioritaire à toutes les nouvelles fonctionnalités ;
> — 3 personnes → badge « Early Seed » sur votre profil et votre certificat d'impact ;
> — 5 personnes → accès en avant-première aux alertes greenwashing temps réel, avant tout le monde.
>
> La meilleure façon d'utiliser ce lien : envoyez-le à **une personne précise qui détient un fonds "durable" et n'a jamais vérifié ce qu'il y a dedans**. Vous ne lui recommandez pas un produit — vous lui rendez le service de pouvoir vérifier.
>
> **3. Une chose en retour.** Seedow se construit sans budget marketing, uniquement sur la confiance. Ce qui m'aide le plus : votre retour brutalement honnête. Le bouton feedback est dans l'app — dites-moi ce qui est inutile, faux ou manquant. Je lis tout, et je réponds.
>
> Merci d'avoir été là avant tout le monde.
>
> [Prénom], fondateur de Seedow
>
> *Seedow fournit de l'information fondée sur des données publiques et ne fournit aucun conseil en investissement.*

**Relance J+3 (uniquement aux non-ouvreurs / non-activés)** — objet : `Le fonds que vous n'avez pas encore vérifié`

> Bonjour [Prénom],
>
> Version courte : votre accès Seedow est ouvert ([lien]), et la première chose que font 9 personnes sur 10, c'est vérifier le fonds de leur propre assurance-vie. Résultat en 10 secondes, et souvent une surprise — dans un sens ou dans l'autre.
>
> Si vous testez cette semaine, vous faites toujours partie du premier cercle (badge, accès prioritaire aux nouveautés). Après, la beta s'élargit et l'avantage se dilue.
>
> Une seule question si vous ne testez pas : qu'est-ce qui vous retient ? Répondez à cet email en un mot, ça m'aide énormément.
>
> [Prénom]

## 3. Message d'invitation type (celui que le parrain transfère)

Fournir ce texte prêt à transférer DANS l'email et dans l'app (bouton « copier le message ») — réduire la friction d'écriture est ce qui fait passer de « je devrais inviter » à « j'ai invité » :

> Salut — tu as bien un fonds « durable » quelque part (assurance-vie, PEA) ? Vérifie ce qu'il y a vraiment dedans, ça prend 10 secondes et c'est gratuit : [seedow.life/?ref=CODE]. C'est fait par un [ancien de la banque / de mon réseau], sans rien à vendre : ça montre le score ESG du fonds, les données qui manquent, et si les promesses collent aux chiffres. Moi j'ai vérifié le mien, résultat surprenant. Passe par mon lien, ça me fait remonter dans leur file d'attente.

⏱ Envoi de la campagne : 1 h 30. Relance : 20 min.
