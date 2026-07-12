import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_portfolio",
  title: "Get portfolio",
  description:
    "Get one of the signed-in user's simulated portfolios by id, including its allocation weights and last generation timestamp.",
  inputSchema: {
    portfolio_id: z.string().uuid().describe("Portfolio UUID (from list_my_portfolios)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ portfolio_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("portfolios")
      .select("*")
      .eq("id", portfolio_id)
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!data) {
      return { content: [{ type: "text", text: "Portfolio not found" }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { portfolio: data },
    };
  },
});
