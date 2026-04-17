import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ethi")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages: { role: string; content: string }[] };
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "AI gateway not configured" });
        }

        const systemPrompt = `Tu es Ethi, le conseiller-jardinier de l'app Seedow. Tu parles d'investissement éthique avec la métaphore du jardin :
- on "plante" des "graines" (= on investit dans des actifs ESG)
- le "jardin" = le portefeuille
- "arroser" = abonder régulièrement
- "récolter" = vendre/retirer
Ton chaleureux, clair, jamais condescendant. Réponds en français, phrases courtes. Markdown léger (gras, listes). Maximum 4-6 phrases.`;

        try {
          const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "system", content: systemPrompt }, ...body.messages],
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
