import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ViewMode = "simple" | "expert";

interface ViewModeContextValue {
  mode: ViewMode;
  setMode: (m: ViewMode) => void;
  toggle: () => void;
  isSimple: boolean;
  isExpert: boolean;
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

const STORAGE_KEY = "seedow:view-mode";

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ViewMode>("simple");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "simple" || saved === "expert") setModeState(saved);
    } catch {
      // ignore
    }
  }, []);

  const setMode = (m: ViewMode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      // ignore
    }
  };

  const toggle = () => setMode(mode === "simple" ? "expert" : "simple");

  return (
    <ViewModeContext.Provider
      value={{ mode, setMode, toggle, isSimple: mode === "simple", isExpert: mode === "expert" }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error("useViewMode must be used within ViewModeProvider");
  return ctx;
}
