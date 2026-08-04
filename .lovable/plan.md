# Landing : retirer « Vois ton impact » et remonter « Comment ça marche » + Cours

## Ce qui change

1. **Suppression de la section « Vois ton impact »** (eyebrow + titre + carte d'aperçu d'allocation animée). Elle fait doublon avec l'aperçu sans compte et n'apporte pas de preuve nouvelle.
2. **Remontée de « Comment ça marche »** juste après la section problème / statistiques, donc avant la section Ethi (fond sombre).
3. **Remontée de la section Cours** (`LandingCourses`) juste après « Comment ça marche », toujours avant Ethi.

Ordre final de la landing :
```text
Hero → aperçu ESG → cadre honnête → problème/stats
→ Comment ça marche → Cours → Ethi → Commence gratuitement → CTA final → footer
```

## Détail technique

- Fichier unique : `src/routes/index.tsx`.
- Retirer le bloc `{/* SECTION — voir ton impact */}` et déplacer le bloc `{/* SECTION — comment ça marche */}` ainsi que `<LandingCourses />` avant `{/* SECTION — Ethi */}`.
- Nettoyer la constante `ALLOCATION` si elle n'est plus utilisée ailleurs dans le fichier.
- Clés i18n `landing.impact.*` laissées en place (non utilisées, sans impact runtime).
- Alternance des fonds conservée : « Comment ça marche » sur fond clair, Ethi reste le bloc sombre de contraste.
