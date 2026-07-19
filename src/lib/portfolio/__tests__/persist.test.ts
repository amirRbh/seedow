import { describe, it, expect } from "vitest";
import { persistPortfolio } from "../server.functions";
import { buildPortfolio } from "../engine";
import { balancedUniverse, defaultParams, diagonalCovMap } from "./fixtures";
import type { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Minimal fluent stub matching only the Supabase query-builder surface
 * persistPortfolio() actually calls (.update/.insert/.select/.eq/.order/.limit
 * chain to either .single()/.maybeSingle() or a direct await). Not a real
 * Supabase client — persistPortfolio() takes `userClient: typeof supabaseAdmin`
 * as a plain parameter specifically so this kind of dependency injection is
 * possible without going through createServerFn's request/middleware lifecycle.
 */
function makeChain(resolveValue: unknown) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.update = self;
  chain.insert = self;
  chain.select = self;
  chain.eq = self;
  chain.order = self;
  chain.limit = self;
  chain.single = () => Promise.resolve(resolveValue);
  chain.maybeSingle = () => Promise.resolve(resolveValue);
  chain.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(resolveValue).then(onFulfilled, onRejected);
  return chain;
}

describe("persistPortfolio", () => {
  const universe = balancedUniverse();
  const covariance = diagonalCovMap(universe);
  const result = buildPortfolio({ universe, covariance, params: defaultParams() });

  it("falls back to the existing active portfolio on a 23505 unique-constraint race", async () => {
    let portfoliosCalls = 0;
    const existingRow = { id: "existing-portfolio-id" };

    const mockClient = {
      from(table: string) {
        if (table === "profiles") return makeChain({ error: null });
        portfoliosCalls += 1;
        // 1st "portfolios" call: the insert attempt, loses the race to a
        // concurrent request and hits the unique-active-portfolio constraint.
        if (portfoliosCalls === 1) {
          return makeChain({ data: null, error: { code: "23505", message: "duplicate key" } });
        }
        // 2nd call: the fallback select, returns the portfolio the concurrent
        // request just created.
        return makeChain({ data: existingRow });
      },
    } as unknown as typeof supabaseAdmin;

    const persisted = await persistPortfolio(
      mockClient,
      "user-1",
      { ...defaultParams(), mode: "create" as const },
      result,
    );

    expect(persisted.portfolio_id).toBe(existingRow.id);
    expect(persisted.weights).toEqual(result.weights);
    expect(portfoliosCalls).toBe(2);
  });

  it("throws a user-facing error when insert fails for a reason other than a race", async () => {
    const mockClient = {
      from(table: string) {
        if (table === "profiles") return makeChain({ error: null });
        return makeChain({ data: null, error: { code: "42501", message: "permission denied" } });
      },
    } as unknown as typeof supabaseAdmin;

    await expect(
      persistPortfolio(mockClient, "user-1", { ...defaultParams(), mode: "create" as const }, result),
    ).rejects.toThrow("Impossible d'enregistrer le portefeuille");
  });

  it("skips the deactivate step entirely in \"create\" mode", async () => {
    let deactivateCalled = false;
    const insertedRow = { id: "new-portfolio-id" };

    const mockClient = {
      from(table: string) {
        if (table === "profiles") return makeChain({ error: null });
        return {
          update: () => {
            deactivateCalled = true;
            return makeChain({ error: null });
          },
          insert: () => makeChain({ data: insertedRow, error: null }),
        };
      },
    } as unknown as typeof supabaseAdmin;

    const persisted = await persistPortfolio(
      mockClient,
      "user-1",
      { ...defaultParams(), mode: "create" as const },
      result,
    );

    expect(deactivateCalled).toBe(false);
    expect(persisted.portfolio_id).toBe(insertedRow.id);
  });
});
