import { defineMcp } from "@lovable.dev/mcp-js";
import { createMcpProtocolHandler } from "@lovable.dev/mcp-js/protocols/mcp";
import { withMcpClient } from "@lovable.dev/mcp-js/testing/server";
import { describe, expect, it } from "vitest";
import mcp from "../index";
import getPortfolio from "../tools/get-portfolio";
import listMyGoals from "../tools/list-my-goals";
import listMyPortfolios from "../tools/list-my-portfolios";
import listRecentDecisions from "../tools/list-recent-decisions";

/**
 * Serveur MCP de Seedow sur le SDK `@lovable.dev/mcp-js` 3.x, testé EN MÉMOIRE :
 * aucun réseau, aucune base. Deux garanties :
 *   1. le serveur réel refuse toute requête sans jeton (401 + défi OAuth),
 *      avant même de lire les outils ;
 *   2. les quatre outils restent en lecture seule et refusent d'agir pour un
 *      appelant non authentifié — même si l'authentification était retirée
 *      par erreur de `defineMcp`.
 */
const ENDPOINT = "http://localhost/mcp";
const INIT = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "seedow-test", version: "1" },
  },
};

describe("serveur MCP réel (OAuth Supabase)", () => {
  const handler = createMcpProtocolHandler(mcp, { resourcePath: "/mcp" });

  it("sans jeton : 401 et défi qui pointe vers les métadonnées OAuth", async () => {
    const res = await handler(
      new Request(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify(INIT),
      }),
    );
    expect(res.status).toBe(401);
    const challenge = res.headers.get("www-authenticate") ?? "";
    expect(challenge).toMatch(/^Bearer /);
    expect(challenge).toContain("/.well-known/oauth-protected-resource");
  });
});

describe("outils (serveur de test sans authentification)", () => {
  const open = defineMcp({
    name: "seedow-mcp-test",
    title: "Seedow (test)",
    instructions: "Serveur de test, sans authentification.",
    version: "0.0.0",
    metrics: false,
    tools: [listMyPortfolios, getPortfolio, listMyGoals, listRecentDecisions],
  });
  const handler = createMcpProtocolHandler(open, { resourcePath: "/mcp" });

  it("expose les quatre outils, tous en lecture seule", async () => {
    await withMcpClient({ endpoint: ENDPOINT, handler }, async (client) => {
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name).sort()).toEqual([
        "get_portfolio",
        "list_my_goals",
        "list_my_portfolios",
        "list_recent_decisions",
      ]);
      for (const t of tools) {
        expect(t.annotations?.readOnlyHint).toBe(true);
        expect(t.annotations?.openWorldHint).toBe(false);
      }
    });
  });

  it("un appelant non authentifié n'obtient aucune donnée", async () => {
    await withMcpClient({ endpoint: ENDPOINT, handler }, async (client) => {
      const res = await client.callTool({
        name: "get_portfolio",
        arguments: { portfolio_id: "00000000-0000-4000-8000-000000000000" },
      });
      expect(res.isError).toBe(true);
      expect(JSON.stringify(res.content)).toContain("Not authenticated");
    });
  });

  it("une entrée invalide est refusée par le schéma, avant le handler", async () => {
    await withMcpClient({ endpoint: ENDPOINT, handler }, async (client) => {
      const res = await client
        .callTool({ name: "get_portfolio", arguments: { portfolio_id: "pas-un-uuid" } })
        .catch((e: unknown) => ({ isError: true, content: String(e) }));
      expect(res.isError).toBe(true);
      expect(JSON.stringify(res.content)).not.toContain("Not authenticated");
    });
  });
});
