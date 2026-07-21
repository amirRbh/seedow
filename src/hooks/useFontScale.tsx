import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Accessibilité — taille de texte ajustable par l'utilisateur.
 *
 * On pilote une seule variable CSS `--font-scale` appliquée sur <html> ;
 * l'échelle typographique nommée de styles.css (text-tag … text-body-xl,
 * text-h1-page) et le corps de texte la multiplient via calc(). Un seul
 * levier, aucun composant à modifier.
 *
 * Même contrat que useTheme : persistance localStorage best-effort, script
 * d'init avant hydratation pour éviter un reflow visible au premier paint.
 */
export type FontScale = "standard" | "large" | "xlarge";

const SCALE_VALUE: Record<FontScale, number> = {
  standard: 1,
  large: 1.15,
  xlarge: 1.3,
};

const STORAGE_KEY = "seedow_font_scale";

interface FontScaleCtx {
  scale: FontScale;
  setScale: (scale: FontScale) => void;
}

const Ctx = createContext<FontScaleCtx | null>(null);

function isFontScale(v: unknown): v is FontScale {
  return v === "standard" || v === "large" || v === "xlarge";
}

function applyToDocument(scale: FontScale) {
  document.documentElement.style.setProperty("--font-scale", String(SCALE_VALUE[scale]));
}

export function FontScaleProvider({ children }: { children: ReactNode }) {
  const [scale, setScaleState] = useState<FontScale>(() => {
    if (typeof window === "undefined") return "standard";
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isFontScale(stored)) return stored;
    } catch {
      /* ignore */
    }
    return "standard";
  });

  useEffect(() => {
    applyToDocument(scale);
  }, [scale]);

  const setScale = useCallback((next: FontScale) => {
    setScaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Stockage indisponible (mode privé strict) : le choix ne survivra pas au reload. */
    }
  }, []);

  const value = useMemo(() => ({ scale, setScale }), [scale, setScale]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFontScale(): FontScaleCtx {
  const ctx = useContext(Ctx);
  if (!ctx) return { scale: "standard", setScale: () => {} };
  return ctx;
}

/**
 * Script inline exécuté avant l'hydratation React (voir RootShell) : pose
 * `--font-scale` dès le premier paint pour éviter un saut de taille au chargement.
 * Doit rester en synchronisation avec SCALE_VALUE ci-dessus.
 */
export const FONT_SCALE_INIT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem("${STORAGE_KEY}");
    var map = { standard: 1, large: 1.15, xlarge: 1.3 };
    var v = map[stored];
    if (v) document.documentElement.style.setProperty("--font-scale", String(v));
  } catch (e) {}
})();
`.trim();
