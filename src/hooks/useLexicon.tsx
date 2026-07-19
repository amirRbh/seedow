import { createContext, useContext, type ReactNode } from "react";
import { lexicon, type Lexicon } from "@/lib/lexicon";

interface LexiconCtx {
  L: Lexicon;
}

// `lexicon` est une constante module-level immuable : une seule valeur de
// contexte pour toute l'app, jamais recréée à chaque rendu.
const value: LexiconCtx = { L: lexicon };
const Ctx = createContext<LexiconCtx>(value);

export function LexiconProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLexicon() {
  return useContext(Ctx);
}
