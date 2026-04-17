import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const ethiChat = createServerFn({ method: "POST" })
  .validator((d: { messages: { role: string; content: string }[] }) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { error: "AI gateway not configured" };
    }

    const systemPrompt = `Tu es Ethi, le conseiller-jardinier de l'app Seedow. Tu parles d'investissement éthique avec la métaphore du jardin :
- on "plante" des "graines" (= on investit dans des actifs ESG)
- le "jardin" = le portefeuille
- "arroser" = abonder régulièrement
- "récolter" = vendre/retirer
Ton ton est chaleureux, clair, jamais condescendant. Tu réponds en français, avec des phrases courtes. Utilise du markdown léger (gras, listes). Maximum 4-6 phrases.`;

    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: systemPrompt }, ...data.messages],
        }),
      });

      if (resp.status === 429) return { error: "Trop de requêtes, réessaie dans un instant." };
      if (resp.status === 402) return { error: "Crédits AI épuisés. Recharge ton workspace." };
      if (!resp.ok) return { error: "Ethi est indisponible pour le moment." };

      const json = await resp.json();
      const content = json.choices?.[0]?.message?.content ?? "";
      return { content };
    } catch (e) {
      console.error("ethi error", e);
      return { error: "Erreur de connexion à Ethi." };
    }
  });

export const Route = createFileRoute("/api/ethi")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json();
        const result = await ethiChat({ data: body });
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
