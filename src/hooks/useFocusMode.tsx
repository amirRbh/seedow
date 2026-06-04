import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

interface FocusModeContextValue {
  focus: boolean;
  setFocus: (v: boolean) => void;
  toggle: () => void;
}

const FocusModeContext = createContext<FocusModeContextValue | null>(null);
const STORAGE_KEY = "seedow:focus-mode";

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [focus, setFocusState] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "1") setFocusState(true);
    } catch {
      // ignore
    }
  }, []);

  const setFocus = useCallback((v: boolean) => {
    setFocusState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => setFocus(!focus), [focus, setFocus]);

  return (
    <FocusModeContext.Provider value={{ focus, setFocus, toggle }}>
      {children}
    </FocusModeContext.Provider>
  );
}

export function useFocusMode() {
  const ctx = useContext(FocusModeContext);
  if (!ctx) throw new Error("useFocusMode must be used within FocusModeProvider");
  return ctx;
}
