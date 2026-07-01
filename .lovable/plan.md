# Harmonisation DA Apple — tokens globaux uniquement

Trois changements ciblés, aucun composant retouché individuellement — l'impact se propage via les tokens CSS.

## 1. Palette globale Apple dans `src/styles.css`

Réécrire les valeurs des tokens racines (les noms restent identiques pour ne rien casser dans l'app) :

```text
--paper       #F5F3EC  →  #FFFFFF   (fond principal blanc pur)
--paper-2     #E0DCCE  →  #F5F5F7   (surface Apple gris signature)
--paper-3     #DEDACE  →  #D2D2D7   (borders Apple)
--paper-inset #E0DCCE  →  #F5F5F7

--ink         #0A0A0A  →  #1D1D1F   (texte principal Apple)
--ink-2       #6B6B66  →  #86868B   (texte secondaire Apple)
--ink-3       #6B6B66  →  #6E6E73

--moss-*      → mêmes valeurs neutres Apple (rétro-compat)
```

Accents assourdis façon Apple :

```text
--mint   #0B7A3E  →  #1D8348  (vert forest sobre)
--ice    #0099CC  →  #0071E3  (bleu Apple signature)
--volt   #8B4FE0  →  #6E56CF  (violet doux)
--alert  #E0294F  →  #E11D48  (rouge saturé Apple-like)
--solar  #D4A300  →  #B7791F  (or plus mat)
```

Aliases legacy (`--gold`, `--rust`, `--sky`, `--bloom`, `--peach`, `--glacier`) remappés vers ces nouvelles valeurs pour que tous les usages existants restent cohérents.

Retirer aussi les tokens spécifiques `.apple-landing` — puisque la palette globale devient déjà Apple, le scope `.apple-landing` n'est plus nécessaire. Les classes `.apple-title`, `.apple-btn-primary`, etc. deviennent utilisables partout et se basent sur `var(--paper)` / `var(--ink)` au lieu de `--apple-*`.

## 2. Wordmark SEEDOW visible

Dans la nav de `src/routes/index.tsx` :
- Taille : `text-[22px]` → poids 700, tracking `-0.02em`
- Ajouter un point mint 6px à côté (rappel identité, consistant avec le `.gold-pulse` du dashboard qui utilise déjà mint)
- Structure : `SEEDOW` (bold) + `•` mint

Même wordmark appliqué au footer de la landing.

## 3. Composant `.paper-card`, boutons, filets

Comme les tokens changent, les composants qui référencent `var(--paper-2)`, `var(--paper-3)`, `var(--ink)` se réharmonisent automatiquement :
- Cards éditoriales du dashboard : fond `#F5F5F7` sur blanc au lieu d'ivoire sur ivoire
- Boutons `.btn-plant` / `.btn-harvest` / `.btn-outline-ink` : couleurs mint/ink recalculées automatiquement
- `.gold-rule` : reste un trait plein, teinte ink Apple

Aucun réglage par écran nécessaire — la propagation via tokens suffit.

## Ce qui n'est pas touché

- Aucun composant applicatif modifié (dashboard, cours, portfolio, ethi, profil, nav app)
- Aucune logique métier
- La typo reste : Bebas + Inter + JetBrains Mono dans l'app, Inter pur sur la landing
- Les memories DA (éditorial magazine/data terminal) restent globalement valides — seule la palette bascule vers l'univers Apple

## Fichiers touchés

- `src/styles.css` : bloc `:root` + section `.apple-landing` (simplifiée ou supprimée)
- `src/routes/index.tsx` : nav (wordmark SEEDOW) + footer (wordmark)
