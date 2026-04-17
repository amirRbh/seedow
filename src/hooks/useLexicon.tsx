import { createContext, useContext, type ReactNode } from "react";
import { lexicon, type Lexicon } from "@/lib/lexicon";

interface LexiconCtx {
  L: Lexicon;
}

const Ctx = createContext<LexiconCtx>({ L: lexicon });

export function LexiconProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={{ L: lexicon }}>{children}</Ctx.Provider>;
}

export function useLexicon() {
  return useContext(Ctx);
}
