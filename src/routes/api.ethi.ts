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

        const contextBlock = body.context
          ? `\n\n📊 **Contexte portefeuille (JSON, source de vérité)** :\n\`\`\`json\n${JSON.stringify(body.context, null, 2)}\n\`\`\`\nUtilise EXCLUSIVEMENT ces données quand on te parle du portefeuille de l'utilisateur. Ne jamais inventer de ticker, montant, allocation, P&L ou score. Si \`hasPortfolio\` est false, propose d'en créer un. Cite les chiffres tels quels (allocations en %, montants en €).`
          : "";

        const systemPrompt = `Tu es **Ethi**, le conseiller en investissement responsable de Seedow. Vif, direct, complice — jamais mou, jamais corporate.


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

          if (resp.status === 429) return Response.json({ error: "Trop de requêtes, réessaie dans un instant." });
          if (resp.status === 402) return Response.json({ error: "Crédits AI épuisés. Recharge ton workspace." });
          if (!resp.ok) return Response.json({ error: "Ethi est indisponible pour le moment." });

          const json = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
          const content = json.choices?.[0]?.message?.content ?? "";
          return Response.json({ content });
        } catch (e) {
          console.error("ethi error", e);
          return Response.json({ error: "Erreur de connexion à Ethi." });
        }
      },
    },
  },
});
