import { useState } from "react";
import { motion } from "framer-motion";
import { DepositSheet } from "@/components/discover/DepositSheet";

export interface EthiAction {
  type: "deposit" | "seed";
  amount?: number;
  ticker?: string;
  name?: string;
}

/**
 * Parses Ethi's response to extract action tags and returns the cleaned content + actions.
 * Tags supported:
 *   [deposit:50]            → quick deposit button for 50€
 *   [seed:VWCE:100]         → rich card to invest 100€ in a specific seed
 *   [seed:VWCE]             → rich card to invest in a specific seed (no preset amount)
 */
export function parseEthiActions(content: string): { cleaned: string; actions: EthiAction[] } {
  const actions: EthiAction[] = [];
  const re = /\[(deposit|seed):([^\]]+)\]/g;
  const cleaned = content.replace(re, (_, type: string, payload: string) => {
    const parts = payload.split(":").map((s) => s.trim());
    if (type === "deposit") {
      const amount = Number(parts[0]);
      if (!Number.isNaN(amount) && amount > 0) actions.push({ type: "deposit", amount });
    } else if (type === "seed") {
      const ticker = parts[0];
      const amount = parts[1] ? Number(parts[1]) : undefined;
      if (ticker) actions.push({ type: "seed", ticker, amount: amount && !Number.isNaN(amount) ? amount : undefined });
    }
    return "";
  });
  return { cleaned: cleaned.trim(), actions };
}

interface EthiActionsProps {
  actions: EthiAction[];
}

export function EthiActions({ actions }: EthiActionsProps) {
  const [open, setOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<EthiAction | null>(null);

  if (actions.length === 0) return null;

  const trigger = (a: EthiAction) => {
    setActiveAction(a);
    setOpen(true);
  };

  return (
    <>
      <div className="mt-2 space-y-2">
        {actions.map((a, i) => {
          if (a.type === "deposit") {
            return (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                onClick={() => trigger(a)}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-moss-2 hover:bg-moss-1 text-paper text-[12px] font-semibold transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span>💧</span>
                  Déposer {a.amount} €
                </span>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </motion.button>
            );
          }
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="rounded-xl border border-moss-3/40 bg-moss-2/15 p-3"
            >
              <p className="text-[10px] uppercase tracking-wider text-moss-3 font-bold">Graine recommandée</p>
              <p className="text-[14px] font-value text-paper mt-1">{a.ticker}</p>
              <button
                onClick={() => trigger(a)}
                className="mt-2 w-full px-3 py-2 rounded-lg bg-paper text-ink text-[11px] font-semibold hover:bg-moss-5 transition-colors"
              >
                Planter {a.amount ? `${a.amount} €` : "cette graine"} 🌱
              </button>
            </motion.div>
          );
        })}
      </div>

      <DepositSheet
        open={open}
        onClose={() => setOpen(false)}
        assetName={activeAction?.type === "seed" ? activeAction.ticker : undefined}
      />
    </>
  );
}
