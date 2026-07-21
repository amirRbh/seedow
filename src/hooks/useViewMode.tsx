import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import i18n from "i18next";
import { toast } from "sonner";

export type ViewMode = "simple" | "expert";

interface SetModeOptions {
  /** N'affiche pas le toast de confirmation (ex. hydratation depuis le profil). */
  silent?: boolean;
}

interface ViewModeContextValue {
  mode: ViewMode;
  setMode: (m: ViewMode, opts?: SetModeOptions) => void;
  toggle: () => void;
  isSimple: boolean;
  isExpert: boolean;
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

const STORAGE_KEY = "seedow:view-mode";

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ViewMode>("simple");
  const modeRef = useRef<ViewMode>(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "simple" || saved === "expert") setModeState(saved);
    } catch {
      // ignore
    }
  }, []);

  const setMode = useCallback((m: ViewMode, opts?: SetModeOptions) => {
    // Retour immédiat et explicite : la bascule ne doit jamais sembler sans
    // effet, même sur un écran où peu de contenu change visiblement. Silencieux
    // lors d'une hydratation programmatique (préférence chargée depuis le profil).
    if (m !== modeRef.current && !opts?.silent) {
      toast.success(i18n.t(`view_mode.toast_${m}`), {
        description: i18n.t(`view_mode.toast_${m}_desc`),
      });
    }
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === "simple" ? "expert" : "simple");
  }, [mode, setMode]);

  const value = useMemo(
    () => ({ mode, setMode, toggle, isSimple: mode === "simple", isExpert: mode === "expert" }),
    [mode, setMode, toggle],
  );

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error("useViewMode must be used within ViewModeProvider");
  return ctx;
}
