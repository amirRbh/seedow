import { useEffect, useState } from "react";
import { checkBetaCapacity, type BetaCapacity } from "@/lib/beta/beta.functions";

export function useBetaCapacity() {
  const [capacity, setCapacity] = useState<BetaCapacity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    checkBetaCapacity()
      .then((c) => {
        if (!cancelled) setCapacity(c);
      })
      .catch((err) => console.warn("[useBetaCapacity]", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { capacity, loading };
}
