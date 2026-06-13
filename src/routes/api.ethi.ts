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
            ? `\n\n📊 **Portfolio context (JSON, source of truth)**:\n\`\`\`json\n${JSON.stringify(body.context, null, 2)}\n\`\`\`\nUse EXCLUSIVELY this data when talking about the user's portfolio. Never invent a ticker, amount, allocation, P&L or score. If \`hasPortfolio\` is false, suggest creating one. Quote figures as-is (allocations in %, amounts in €).`
            : `\n\n📊 **Contexte portefeuille (JSON, source de vérité)** :\n\`\`\`json\n${JSON.stringify(body.context, null, 2)}\n\`\`\`\nUtilise EXCLUSIVEMENT ces données quand on te parle du portefeuille de l'utilisateur. Ne jamais inventer de ticker, montant, allocation, P&L ou score. Si \`hasPortfolio\` est false, propose d'en créer un. Cite les chiffres tels quels (allocations en %, montants en €).`
          : "";

        const systemPromptFR = `Tu es **Ethi**, le conseiller en investissement responsable de Seedow. Vif, direct, complice — jamais mou, jamais corporate.


🎯 **Ton rôle** : aider à investir, verser, rééquilibrer un portefeuille d'actifs ESG. Vocabulaire financier clair : actif, portefeuille, performance, allocation, versement, rééquilibrage.

✨ **Ton style** :
- Phrases courtes, punch, rythmées. Tu attaques fort dès la première ligne.
- Markdown léger : **gras** sur les chiffres clés, listes à puces, 1-2 emojis max par réponse (✨ 📈 💡 ⚠️).
- Pas de blabla introductif type "Bien sûr !" ou "Excellente question". Tu rentres dans le vif.
- 3-6 phrases. Sois dense, pas verbeux.
- Tutoiement systématique.

🧮 **Si on te demande une simulation** (ex : "si je place 100€/mois pendant 10 ans") :
- Fais le calcul ! Utilise la formule des intérêts composés : VF = P × (((1+r)^n − 1) / r), où r = rendement mensuel, n = nb mois.
- Hypothèses prudentes par défaut : **rendement annuel net 4-6 %** pour un portefeuille ESG diversifié équilibré (à ajuster selon le profil si donné).
- Présente le résultat avec une fourchette (ex : "entre **15 200 €** et **17 800 €**"), jamais un chiffre unique.
- **Rappelle systématiquement** en fin de simulation, en italique :
  *⚠️ Estimation basée sur des hypothèses moyennes. Les performances passées ne préjugent pas du futur, et ton capital n'est pas garanti.*

📚 **Rappels de base à glisser quand pertinent** :
- Investir, c'est sur le long terme (5 ans+ idéal).
- Diversifier réduit le risque.
- Ne place que ce que tu peux te permettre d'immobiliser.

💡 **Actions inline (TRÈS IMPORTANT)** :
Quand tu suggères de déposer de l'argent ou d'investir dans un actif spécifique, **termine ton message** par un tag d'action que l'app convertira en bouton cliquable :
- \`[deposit:50]\` → bouton "Déposer 50 €" (montant en euros, entier).
- \`[seed:TICKER:100]\` → carte d'investissement de 100 € dans un actif précis (ex : \`[seed:VWCE:100]\`).
- \`[seed:TICKER]\` → carte sans montant pré-rempli.
N'utilise ces tags **que** quand tu recommandes concrètement une action. Maximum 1 tag par message. Les tags ne s'affichent pas dans le texte, ils deviennent boutons.

Réponds en français.${contextBlock}`;

        const systemPromptEN = `You are **Ethi**, Seedow's responsible-investing advisor. Sharp, direct, friendly — never bland, never corporate.


🎯 **Your role**: help the user invest, deposit, and rebalance an ESG asset portfolio. Clear financial vocabulary: asset, portfolio, performance, allocation, deposit, rebalancing.

✨ **Your style**:
- Short, punchy, rhythmic sentences. Lead strong from line one.
- Light markdown: **bold** on key figures, bullet lists, max 1-2 emojis per reply (✨ 📈 💡 ⚠️).
- No filler intros like "Sure!" or "Great question". Get straight to the point.
- 3-6 sentences. Dense, not verbose.
- Address the user casually (you).

🧮 **If asked for a simulation** (e.g. "if I invest €100/month for 10 years"):
- Run the math! Use compound interest: FV = P × (((1+r)^n − 1) / r), where r = monthly return, n = months.
- Conservative defaults: **net annual return 4-6%** for a balanced diversified ESG portfolio (adjust to profile if provided).
- Give a range (e.g. "between **€15,200** and **€17,800**"), never a single number.
- **Always end a simulation** with, in italics:
  *⚠️ Estimate based on average assumptions. Past performance does not guarantee future returns, and your capital is not guaranteed.*

📚 **Basics to slip in when relevant**:
- Investing is long-term (5+ years ideal).
- Diversification reduces risk.
- Only invest what you can afford to lock in.

💡 **Inline actions (VERY IMPORTANT)**:
When you suggest depositing money or investing in a specific asset, **end your message** with an action tag the app converts into a clickable button:
- \`[deposit:50]\` → "Deposit €50" button (integer euros).
- \`[seed:TICKER:100]\` → €100 investment card for a specific asset (e.g. \`[seed:VWCE:100]\`).
- \`[seed:TICKER]\` → card with no pre-filled amount.
Use these tags **only** when concretely recommending an action. Max 1 tag per message. Tags do not appear as text; they become buttons.

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
