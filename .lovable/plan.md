# Audit critique Seedow

Basé sur un parcours réel de l'app (landing, /onboarding 1/4, /ethi, /cours, /methodologie, /reglages, /tarifs, /dashboard?guest=true, /auth). Les écrans `/dashboard`, `/portfolio`, `/discover` connectés n'ont pas pu être rendus en session headless (garde `beforeLoad` → `/auth`) : ils sont audités sur code + captures partielles, et sont marqués comme tels.

---

## 1. Première impression — 5,5/10

Ce que je vois en 30 s : « Votre argent façonne **déjà** le monde. » + « Seedow vous montre lequel. Investissement ESG, visualisé clairement, expliqué par une IA qui ne vous vend rien. » + un seul bouton : **Accéder à mon espace**.

- **Promesse** : lisible mais abstraite. « Vous montre lequel » ne dit pas ce que je fais concrètement (je simule un portefeuille aligné sur mes convictions).
- **Ce qui donne envie** : la phrase forte, la typo, le module « Ce fonds est-il vraiment vert ? » — mais il est **sous la ligne de flottaison**, alors que c'est le seul moment « aha » instantané du produit.
- **Confusion #1** : le seul CTA visible suppose que j'ai déjà un compte. Le chemin sans compte (`/onboarding`, gratuit, 2 min) n'est pas proposé au-dessus de la ligne de flottaison. C'est la fuite n°1.
- **Confusion #2** : « Seedow est un outil de simulation. Aucun argent réel n'est investi ici. » arrive **immédiatement sous le CTA**, sans contrepartie de valeur. Pour un 18-35, ça se lit « donc ça ne sert à rien ». Le disclaimer est juste — son placement tue la conversion.
- **Confusion #3** : rupture visuelle brutale. La landing est blanche/Apple ; `/onboarding` et `/ethi` sont quasi noirs. On a l'impression de changer de produit au clic. La DA « paper #F5F3EC + Bebas » définie en mémoire projet n'est appliquée nulle part de façon cohérente.
- **Bandeau cookies** présent en overlay bas sur **toutes** les pages parcourues, y compris pendant l'onboarding — masque le CTA « Continuer » sur mobile.

---

## 2. UX écran par écran

**Landing** — Fonctionne : hiérarchie typo, silence visuel, quick-check ESG. Ne fonctionne pas : un seul CTA orienté compte ; 900 px de vide entre le hero et la section suivante ; aucune preuve (pas de capture produit, pas de chiffre, pas de « comment ça marche en 3 étapes »). Un VC ne voit pas le produit avant le scroll 3.

**/onboarding** — Fonctionne : promesse « 4 questions, 2 minutes », étapes 01/02/03 nommées, badge « sans compte ». Frictions : (a) le bulle Ethi affiche un **caractère tofu ▯ à la place de l'emoji ✨** — bug visible dès la première seconde ; (b) l'écran d'intro est une page de plus avant la vraie première question — supprimable, la Q1 peut être l'écran d'accueil ; (c) les 6 causes sont sélectionnables sans limite ni notion de priorité — un débutant coche tout, l'optimiseur perd son signal ; (d) « CONSEILLER EN ALLOCATION » en eyebrow contredit frontalement le positionnement « pas de conseil » tenu partout ailleurs (risque réglementaire **et** de crédibilité) ; (e) écran 01 = « 1/4 » mais les étapes annoncées sont « 3 » — incohérence de progression.

**/dashboard (invité)** — `?guest=true` sans simulation en session affiche « Ta simulation a expiré ou est introuvable. » : un cul-de-sac froid, avec un seul lien. C'est l'état par défaut de tout lien partagé vers le dashboard.

**/dashboard (connecté, lecture code)** — accumulation de cartes hétérogènes (NextStep, Watchlist, Vote, Réveil, Impact, Learn, Understand, Complete profile, Real investment interest, Guest banner…). Aucune hiérarchie stable : sur une petite valorisation (50 €), 9 modules se disputent l'attention. Charge cognitive élevée, pas de « une chose à faire aujourd'hui ».

**/ethi** — Fonctionne : le message d'ouverture est excellent (valorisation, 2 constats chiffrés, 3 suggestions). Ne fonctionne pas : ~1 200 px de vide entre le message et la barre de saisie ; disclaimer répété deux fois en 3 lignes ; les puces « IWDA pèse 51 % » supposent qu'on sait ce qu'est IWDA (aucun tooltip) ; pas d'état de chargement visible ni de streaming perçu.

**/reglages** — Fonctionne : tout est au même endroit, recalcul automatique annoncé. Ne fonctionne pas : « Volatilité annuelle visée 13,0 % » est du jargon d'expert imposé en réglage par défaut ; les exclusions sont des pills dont l'état coché est peu différencié (un rond plein) ; la phrase de bas de page cite « pipeline exclusions → best-in-class → optimisation Markowitz contrainte → tilts par convictions » à un utilisateur qui vient juste de cliquer sur « Réglages ».

**/cours** — Le meilleur écran de l'app. Grille claire, durée, niveau, « lecture libre ». Manque : aucune progression visible, aucun ordre recommandé (« commence ici »), aucune reprise de lecture.

**/methodologie** — Remarquable de transparence, unique sur le marché. Mais c'est un document, pas une expérience : blocs 01→05, tableaux de pondération, « Pas de Black-Litterman complet » — écrit pour un analyste. Le bloc « En 30 secondes » est la bonne idée, il devrait être l'écran, le reste en repli.

**Navigation** — Rail latéral de 13 icônes **sans libellé ni tooltip visible**, toggle SIMPLE/EXPERT non expliqué, et double système (rail + bottom nav mobile + header) avec des entrées qui ne se recouvrent pas.

---

## 3. UI — premium ? Partiellement.

- **Typo** : c'est la vraie force. Titres massifs, mono pour la donnée, tracking maîtrisé.
- **Cohérence** : rompue. Trois univers coexistent (landing blanche Apple, app claire papier, onboarding/Ethi sombres). La mémoire projet fixe `--paper #F5F3EC` dominant + Bebas ; la landing est blanche et Inter. Un seul système doit gagner.
- **Couleur** : le vert est bien utilisé comme signal. Mais le dégradé vert→bleu sur « déjà » (hero) est le seul gradient de l'app et sonne « template ».
- **Densité** : trop de vide vertical non intentionnel (Ethi, onboarding, landing). Le vide Apple est composé ; ici il est résiduel.
- **Composants** : cartes correctes, mais 4 hauteurs de boutons différentes selon les écrans, et les pills d'exclusion n'ont pas d'état sélectionné franc.
- **Icônes** : rail lucide générique, aucune identité.
- **Verdict** : ça ressemble à un produit soigné, pas encore à un produit premium — parce que premium = **cohérence**, et c'est précisément ce qui manque.

---

## 4. Compréhension (étudiant de 20 ans)

Compris : les causes, les exclusions, les cours, « Seedow ne me vend rien ».
Non compris : WACI, tCO₂e/M$ de CA, MSCI ACWI, best-in-class, Markowitz, TER, drawdown, SFDR 8/9, « volatilité annuelle visée 13 % », « intensité carbone gCO₂e/€ », « couverture 62 % », IWDA/tickers, « concentration élevée ».
Données sans signification pour lui : le score ESG 0-100 (bon à partir de combien ?), l'écart WACI vs ETF Monde (−32 % de quoi ?), le taux de couverture.
Besoin : une définition au survol/tap **partout** où un terme apparaît, et un référentiel (« 74/100, c'est mieux que 8 fonds sur 10 »).

---

## 5. Valeur perçue

Vraie valeur : le quick-check greenwashing, Ethi qui explique le portefeuille, les cours, la méthodologie ouverte.
Valeur faible aujourd'hui : le certificat d'impact (capital virtuel → il certifie une simulation), la communauté (vide au démarrage), Vote et Réveil (teasers sans masse critique), le comparatif (une seule comparaison figée).
Raison de revenir demain : **aucune claire**. Sur capital virtuel, la valorisation ne bouge pas assez pour créer une habitude. Aujourd'hui, Seedow est un outil qu'on utilise une fois, pas une app qu'on rouvre.

---

## 6. Différenciation

- **vs Finary** : Finary agrège du réel, Seedow non → écart majeur. Seedow gagne sur la pédagogie ESG et la transparence de méthode.
- **vs Trade Republic / Shares** : eux exécutent, Seedow simule. Tant que rien n'est investissable, la comparaison est perdante ; il faut assumer un positionnement « boussole avant l'achat », pas « alternative au courtier ».
- **vs Revolut** : Revolut gagne sur les micro-interactions et l'onboarding ; Seedow n'a pas encore ce niveau de finition.
- **vs Goodvest** : Goodvest a le produit réel et l'assurance-vie ; Seedow a la transparence radicale et l'absence de conflit d'intérêt — c'est **le** différenciateur à marteler.
- **vs Greenly** : Greenly mesure l'empreinte, Seedow relie empreinte et allocation.
- **Unique** : la page Méthodologie publiquement auditable + le refus documenté d'afficher un chiffre non sourcé. C'est un actif de marque sous-exploité (elle est planquée en nav).
- **Déjà vu** : hero + gradient, cartes KPI, chat IA générique.

---

## 7. Impact — crédible, pas encore émouvant

Compréhensible : moyennement (WACI, couverture, tCO₂e/M$ CA). Crédible : oui — c'est le point fort, chaque chiffre est sourcé, daté, et l'app refuse d'inventer. Scientifique : oui, presque trop. Engageant : non. Émotion : nulle. Envie d'améliorer : nulle, car **aucune action n'est proposée** après le constat.

Pour rendre l'impact beaucoup plus fort : un chiffre unique compréhensible en tête (« ton portefeuille est 32 % moins intensif en carbone qu'un ETF Monde »), le détail sous le pli ; un état « en cours de mesure » designé, pas une absence ; une comparaison à une référence humaine et non seulement à un indice ; l'exposition thématique (climat/biodiv/humain) comme visuel principal — c'est la seule donnée 100 % lisible par un débutant ; et surtout un **levier** : « augmente ton exposition climat de 10 % → voici l'effet sur l'intensité carbone et sur le risque ». L'impact doit être un simulateur, pas un rapport.

---

## 8. Engagement

Existant : notifications, alertes greenwashing, cours, wrapped, vote. Manquant : une raison hebdomadaire.
Idées compatibles avec le ton Seedow (aucune gamification enfantine) :
- **Le Fil hebdo** : un fait sourcé par semaine relié à *ton* portefeuille (« une entreprise que tu détiens à 3 % a été épinglée — voici la source »). C'est du Réveil, mais personnalisé et poussé.
- **Alerte greenwashing** comme produit d'appel : notification rare, factuelle, à haute valeur — le seul motif d'ouverture légitime.
- **Progression cours** avec reprise et parcours recommandé (Duolingo sans les streaks agressifs).
- **Seedow Wrapped** annuel/trimestriel : déjà amorcé, à assumer comme moment de partage.
- **Digest mensuel** par email : valorisation + un fait d'impact + un cours.

---

## 9. Transparence — le meilleur pilier, mal exposé

Atteint sur la méthode. Manque : dire clairement en haut de la méthodologie que **une partie de l'univers est en « notation propriétaire Seedow (v1) »** et pas MSCI (c'est écrit, mais en bas d'un bloc) ; afficher la fraîcheur de la donnée sur chaque écran de portefeuille, pas seulement en bannière ; expliquer ce que le score ESG **ne** dit **pas**, au moment où le score est affiché et non 3 pages plus loin ; et rendre la méthodologie accessible depuis chaque chiffre (« d'où vient ce nombre ? »).

---

## 10. Accessibilité (19 ans, 3 minutes)

Comprend : les causes, les exclusions, les cours. Ne comprend pas : la moitié des chiffres. À simplifier : un mode SIMPLE réellement simplifié (aujourd'hui le toggle ne réduit pas assez le jargon), un vocabulaire de secours pour chaque terme, et un résultat d'onboarding formulé en une phrase humaine avant tout tableau.
Points techniques : rail nav icônes sans nom accessible, contraste du texte secondaire sur fond sombre à vérifier, bandeau cookies qui recouvre les CTA en bas d'écran mobile.

---

## 11. Micro-interactions

Manquent ou à améliorer : streaming visible des réponses d'Ethi ; skeletons cohérents (certains écrans passent du vide au contenu) ; états vides designés (le « simulation introuvable » est un échec) ; confirmation après changement de réglages (un recalcul silencieux se produit sans feedback) ; transition entre les 4 étapes d'onboarding ; animation du chiffre de valorisation ; feedback tactile/visuel sur les pills d'exclusion ; gestion d'erreur réseau (400 observés en console sur plusieurs pages) ; et le glyphe emoji cassé de la bulle Ethi.

---

## 12. Priorisation

**🔴 Impact énorme / effort faible**
1. Unifier la DA (une seule palette landing ↔ app, fin du contraste blanc/noir accidentel).
2. CTA « Simuler sans compte · 2 min » en primaire sur la landing, disclaimer déplacé plus bas.
3. Corriger le glyphe cassé de la bulle Ethi.
4. Libellés/tooltips sur le rail de navigation + explication du toggle SIMPLE/EXPERT.
5. Remplacer l'eyebrow « Conseiller en allocation » (contradiction de positionnement).
6. État vide du dashboard invité transformé en relance utile.
7. Combler les vides verticaux (Ethi, hero onboarding).
8. Un chiffre d'impact unique en tête, détail replié.

**🟠 Impact énorme / effort moyen**
9. Supprimer l'écran d'intro d'onboarding, démarrer sur la Q1 ; corriger 1/4 vs 3 étapes.
10. Glossaire contextuel systématique sur chaque terme technique.
11. Hiérarchiser le dashboard autour d'une seule action du jour.
12. Impact actionnable : levier de simulation « +10 % climat → effet ».
13. Progression et parcours recommandé dans les cours.
14. Alerte greenwashing personnalisée en notification.
15. Preuve produit sur la landing (captures, 3 étapes, méthodologie mise en avant).

**🟡 Impact moyen**
16. Digest mensuel email. 17. Comparatif multi-références. 18. Streaming + skeletons Ethi. 19. Méthodologie accessible depuis chaque chiffre.

**⚪ Cosmétique**
20. Retirer le gradient du hero, harmoniser hauteurs de boutons et états des pills.

---

## 13. Vision produit

Ne pas refondre. Seedow a deux actifs rares : **la transparence de méthode** et **le refus de vendre**. Le produit doit arrêter d'être un rapport et devenir une boussole : une promesse claire dès la landing, un essai sans compte en un clic, un chiffre d'impact compréhensible avec un levier pour l'améliorer, et une seule raison hebdomadaire de revenir (l'alerte personnalisée). Chaque item du Top 20 sert l'un des quatre effets : adoption (1-3, 5-7, 15), compréhension (4, 8, 10, 19), rétention (11-14, 16), confiance (5, 9, 17, 19).

## Top 20 par ROI

L'ordre ci-dessus (1 → 20) **est** le classement par ROI (impact utilisateur × facilité). Les 8 premiers sont réalisables rapidement et débloquent l'essentiel de la conversion et de la crédibilité.

---

### Suite

Cet audit est un diagnostic, pas encore un chantier. Dis-moi quel bloc tu veux que j'implémente en premier — je recommande le lot 🔴 (1 à 8) en une passe, puis on rouvre l'audit sur les écrans connectés (`/dashboard`, `/portfolio`, `/discover`) que je n'ai pas pu rendre en session automatisée.
