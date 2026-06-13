import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const ContextSchema = z
  .object({
    hasPortfolio: z.boolean().optional(),
    totalValue: z.number().finite().optional(),
    name: z.string().max(120).optional(),
    causes: z.array(z.string().max(60)).max(20).optional(),
    holdings: z
      .array(
        z.object({
          ticker: z.string().max(20),
          weight: z.number().finite(),
          value: z.number().finite().optional(),
        }),
      )
      .max(50)
      .optional(),
  })
  .passthrough()
  .optional();

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
  context: ContextSchema,
  lang: z.enum(["fr", "en"]).optional(),
});

export const Route = createFileRoute("/api/ethi")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ── Auth: require a valid Supabase user bearer token ──
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        if (!token) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: userData, error: authErr } = await supabaseAdmin.auth.getUser(token);
        if (authErr || !userData?.user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        // ── Validate body ──
        let body: z.infer<typeof BodySchema>;
        try {
          const raw = await request.json();
          body = BodySchema.parse(raw);
        } catch {
          return new Response(JSON.stringify({ error: "Requête invalide." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "AI gateway not configured" });
        }

        const lang = body.lang === "en" ? "en" : "fr";

        const contextBlock = body.context
          ? lang === "en"
            ? `\n\n📊 **Portfolio context (JSON, source of truth)**:\n\`\`\`json\n${JSON.stringify(body.context, null, 2)}\n\`\`\`\nUse EXCLUSIVELY this data. Never invent a ticker, amount, allocation, P&L or score. The \`diagnostics\` array is the pre-computed truth about this portfolio — quote those numbers verbatim. \`aggregates\` gives top holding/region/category. If \`hasPortfolio\` is false, suggest creating one.`
            : `\n\n📊 **Contexte portefeuille (JSON, source de vérité)** :\n\`\`\`json\n${JSON.stringify(body.context, null, 2)}\n\`\`\`\nUtilise EXCLUSIVEMENT ces données. Ne jamais inventer de ticker, montant, allocation, P&L ou score. Le tableau \`diagnostics\` est la vérité pré-calculée sur ce portefeuille — cite ses chiffres tels quels. \`aggregates\` donne la top ligne / région / catégorie. Si \`hasPortfolio\` est false, propose d'en créer un.`
          : "";

        const systemPromptFR = `Tu es **Ethi**, le conseiller en investissement responsable de Seedow. Vif, direct, complice — jamais mou, jamais corporate. Tutoiement systématique.

🎯 **Ton rôle** : diagnostiquer, conseiller, faire agir. Vocabulaire financier clair (actif, allocation, TER, Sharpe, rééquilibrage).

📐 **STRUCTURE OBLIGATOIRE** pour toute réponse non triviale (analyse, conseil, simulation, recommandation) — exactement 3 blocs, dans cet ordre :

**Constat.** Une phrase, chiffrée, tirée du contexte (diagnostics/aggregates). Pas de généralité.
**Impact.** Une phrase : pourquoi ça compte concrètement pour l'utilisateur (risque, perf, frais, ESG).
**Action.** Une phrase actionnable. Si pertinent, termine par UN tag : \`[deposit:50]\` ou \`[seed:TICKER:100]\`.

Pour une question purement définitionnelle ("c'est quoi le Sharpe ?"), réponds librement mais en 2-4 phrases max. Pas de structure.

✨ **Style** : phrases courtes, **gras** sur les chiffres, max 1 emoji par réponse (📈 💡 ⚠️). Pas de "Bien sûr !", pas de blabla.

🧮 **Simulations chiffrées** : ne calcule JAMAIS toi-même les intérêts composés. L'app dispose d'un simulateur dédié. Si l'utilisateur demande une simulation sans avoir utilisé le formulaire, invite-le à cliquer sur la chip **"Simuler un versement mensuel"** sous le chat. Pour les stress-tests qualitatifs (ex : "et si baisse de 20 % ?"), tu peux raisonner avec les données du portefeuille (volatilité, diversification) sans inventer de chiffres précis.

💡 **Tags d'action** :
- \`[deposit:50]\` → bouton "Déposer 50 €".
- \`[seed:TICKER:100]\` → carte d'investissement.
- \`[seed:TICKER]\` → carte sans montant.
Maximum 1 tag par réponse, uniquement quand tu recommandes concrètement une action.

Réponds en français.${contextBlock}`;

        const systemPromptEN = `You are **Ethi**, Seedow's responsible-investing advisor. Sharp, direct, friendly — never bland, never corporate.

🎯 **Role**: diagnose, advise, drive action. Clear financial vocabulary (asset, allocation, TER, Sharpe, rebalancing).

📐 **MANDATORY STRUCTURE** for every non-trivial reply (analysis, advice, simulation, recommendation) — exactly 3 blocks, in this order:

**Constat.** One sentence, with figures from the context (diagnostics/aggregates). No generalities.
**Impact.** One sentence: why this concretely matters for the user (risk, return, fees, ESG).
**Action.** One actionable sentence. When relevant, end with ONE tag: \`[deposit:50]\` or \`[seed:TICKER:100]\`.

For a pure definition question ("what's the Sharpe ratio?"), reply freely in 2-4 sentences max — no structure needed.

✨ **Style**: short sentences, **bold** on figures, max 1 emoji per reply (📈 💡 ⚠️). No "Sure!", no filler.

🧮 **Numeric simulations**: NEVER compute compound interest yourself. The app has a dedicated simulator. If the user asks for a simulation without using the form, point them to the **"Simulate a monthly plan"** chip below the chat. For qualitative stress-tests (e.g. "what if a 20% drop?") you can reason from the portfolio data (volatility, diversification) without inventing precise figures.

💡 **Action tags**:
- \`[deposit:50]\` → "Deposit €50" button.
- \`[seed:TICKER:100]\` → investment card.
- \`[seed:TICKER]\` → empty investment card.
Max 1 tag per reply, only when concretely recommending an action.

Reply in English.${contextBlock}`;

        const systemPrompt = lang === "en" ? systemPromptEN : systemPromptFR;

        try {
          const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "system", content: systemPrompt }, ...body.messages],
              temperature: 0.85,
            }),
          });

          if (resp.status === 429)
            return Response.json({
              error: lang === "en" ? "Too many requests, try again in a moment." : "Trop de requêtes, réessaie dans un instant.",
            });
          if (resp.status === 402)
            return Response.json({
              error: lang === "en" ? "AI credits exhausted. Top up your workspace." : "Crédits AI épuisés. Recharge ton workspace.",
            });
          if (!resp.ok)
            return Response.json({
              error: lang === "en" ? "Ethi is unavailable right now." : "Ethi est indisponible pour le moment.",
            });

          const json = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
          const content = json.choices?.[0]?.message?.content ?? "";
          return Response.json({ content });
        } catch (e) {
          console.error("ethi error", e);
          return Response.json({
            error: lang === "en" ? "Connection error to Ethi." : "Erreur de connexion à Ethi.",
          });
        }
      },
    },
  },
});
