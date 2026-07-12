import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyPortfolios from "./tools/list-my-portfolios";
import getPortfolio from "./tools/get-portfolio";
import listMyGoals from "./tools/list-my-goals";
import listRecentDecisions from "./tools/list-recent-decisions";

// See app-mcp-server-authoring: OAuth issuer must be the direct Supabase host,
// never the .lovable.cloud proxy. Read the project ref from Vite's inlined env.
const projectRef =
  (import.meta as unknown as { env?: { VITE_SUPABASE_PROJECT_ID?: string } }).env
    ?.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "seedow-mcp",
  title: "Seedow",
  version: "0.1.0",
  instructions:
    "Read-only access to a Seedow user's simulated portfolios, financial goals and recent decision history. All figures are simulated (no real capital is invested). Use `list_my_portfolios` to discover portfolio ids, `get_portfolio` for full allocation weights, `list_my_goals` for savings goals, and `list_recent_decisions` for the user's recent choices.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMyPortfolios, getPortfolio, listMyGoals, listRecentDecisions],
});
