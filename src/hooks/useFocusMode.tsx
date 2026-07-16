import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface FocusModeContextValue {
  focus: boolean;
  setFocus: (v: boolean) => void;
  toggle: () => void;
  prefersReducedMotion: boolean;
}

const FocusModeContext = createContext<FocusModeContextValue | null>(null);
const STORAGE_KEY = "seedow:focus-mode";

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [focus, setFocusState] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const hasUserOverride = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        hasUserOverride.current = true;
        setFocusState(saved === "1");
      } else if (mq.matches) {
        setFocusState(true);
      }
    } catch {
      // ignore
    }

    const onChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      if (!hasUserOverride.current) {
        setFocusState(e.matches);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setFocus = useCallback((v: boolean) => {
    hasUserOverride.current = true;
    setFocusState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    hasUserOverride.current = true;
    setFocusState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <FocusModeContext.Provider value={{ focus, setFocus, toggle, prefersReducedMotion }}>
      {children}
    </FocusModeContext.Provider>
  );
}

export function useFocusMode() {
  const ctx = useContext(FocusModeContext);
  if (!ctx) throw new Error("useFocusMode must be used within FocusModeProvider");
  return ctx;
}
