# Plan i18n FR/EN — toute l'app

## Approche

`react-i18next` avec deux fichiers de traduction (`fr.json`, `en.json`) organisés par namespace = page. Détection auto au premier chargement (`navigator.language`), préférence ensuite stockée dans `localStorage` (`seedow.lang`). Toggle FR | EN dans le header global, présent sur toutes les pages.

## Stack technique

- `react-i18next` + `i18next` + `i18next-browser-languagedetector`
- Provider monté dans `src/routes/__root.tsx`
- Hook `useTranslation()` dans chaque composant
- Format monétaire / dates : `Intl.NumberFormat(lang === 'en' ? 'en-US' : 'fr-FR', ...)` via un util `formatCurrency()` centralisé qui lit la langue courante.

## Composants nouveaux

- `src/i18n/index.ts` — init i18next, détection, fallback FR
- `src/i18n/locales/fr.json` + `en.json` — tous les strings organisés par namespace : `common`, `nav`, `landing`, `auth`, `waitlist`, `dashboard`, `portfolio`, `objectifs`, `methodologie`, `certificat`, `reglages`, `onboarding`, `admin`, `beta`
- `src/components/LanguageToggle.tsx` — pastille FR | EN sobre dans le style Emerald Prestige (eyebrow uppercase or, ligne or sous l'option active)
- `src/lib/format.ts` — `formatCurrency(amount)`, `formatDate(date)` qui réagissent à la langue
- `src/hooks/useLang.ts` — petit wrapper qui retourne `lang` courant et `setLang()`

## Toggle dans le header

Placé à droite du wordmark "seedow" sur **toutes** les pages (landing, auth, waitlist, et toutes les routes `_authenticated`). Style : `FR · EN` avec ligne or sous l'option active, tracking 0.22em uppercase, cohérent avec les eyebrows existants. Pas d'icônes drapeaux.

## Périmètre des pages à traduire

Routes publiques :
- `/` (landing, BetaCounter, sections)
- `/auth`, `/waitlist`, `/methodologie`, `/certificat`, `/share/$handle` (si publique)

Routes connectées :
- `/dashboard`, `/portfolio`, `/objectifs`, `/onboarding`, `/reglages`, `/historique`, `/communaute`, `/impact`, `/journal`, `/profil`
- `/admin/beta`

Composants partagés (header, footer, banners, dialogs, FeedbackButton, BetaBanner, RealInvestmentInterestCard, InvestDialog, ValuationConsistencyBanner, EditorialSection eyebrows, AppNav, KPIFigure labels…)

## Stratégie d'exécution

Pour ne pas casser l'app pendant la migration, je procède **page par page**, en gardant le FR fonctionnel à chaque étape :

1. **Setup** (J1) : installer deps, créer `i18n/index.ts`, monter provider, créer `LanguageToggle`, l'insérer dans tous les headers, créer `formatCurrency`/`formatDate` localisés. À ce stade, EN affiche les strings FR (fallback) sauf pour les éléments du toggle.
2. **Surfaces publiques** (J1) : landing, auth, waitlist, methodologie, certificat — strings extraits, fichier `en.json` rempli.
3. **App connectée — core** (J2) : dashboard, portfolio, onboarding, objectifs.
4. **App connectée — secondaires** (J2) : reglages, historique, communaute, impact, journal, profil.
5. **Banners & dialogs partagés** (J2) : BetaBanner, FeedbackButton, RealInvestmentInterestCard, InvestDialog, ValuationConsistencyBanner.
6. **Admin** (J2) : `/admin/beta`.
7. **QA** : parcourir chaque route dans les deux langues, vérifier qu'aucun string FR n'est resté, vérifier formats `1 234,56 €` (FR) vs `€1,234.56` (EN).

## Ce qui ne change pas

- Pas de traduction des **données** en base (noms d'actifs, descriptions ISIN, alertes générées server-side, decision_events). Ces strings restent en FR — c'est du contenu métier.
- Pas de fichiers `*.functions.ts` modifiés (le serveur reste FR pour les messages d'erreur techniques, qui ne sont pas affichés à l'utilisateur final).
- Lexique financier sobre conservé (pas de retour à "garden/seeds").
- Pas de SEO multilingue (`hreflang`, routes `/en/…`) — c'est hors scope pour un MVP test de 300 personnes.

## Volume estimé

~600-800 clés de traduction, ~40 fichiers à éditer. C'est gros mais sans risque : chaque fichier est un remplacement texte → `t('key')`.

## Question avant lancement

C'est un gros chantier (~3-4h de travail effectif côté agent). Je lance tel quel, ou tu préfères qu'on fasse en deux temps : **(1) infra + toggle + surfaces publiques aujourd'hui**, puis **(2) app connectée plus tard** une fois la phase de test démarrée ?
