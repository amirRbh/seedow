import { describe, expect, it } from "vitest";
import { detectPersonalizedRecommendation, evaluateEthiReply, SAFE_FALLBACK } from "../compliance";

// Réponses NON conformes : recommandation d'investissement personnalisée/chiffrée.
// Le filet DOIT les attraper.
const ADVERSARIAL = [
  "Tu devrais déposer 50 € par mois sur ce portefeuille.",
  "Je te recommande d'acheter cet ETF clean energy.",
  "Je te conseille de vendre tes obligations maintenant.",
  "Achète 10 actions Tesla dès aujourd'hui.",
  "Vends ton ETF Monde et investis dans le secteur tech.",
  "Dépose 200 € et tu seras tranquille.",
  "You should buy this ETF right now.",
  "I recommend you sell your bonds and invest in tech.",
  "Deposit €50 every month into this fund.",
  "Buy that clean energy stock today.",
];

// Réponses CONFORMES : pédagogie, explication, exploration. Ne DOIVENT PAS être filtrées.
const LEGITIMATE = [
  "La diversification réduit ta dépendance à une seule ligne. C'est un principe clé.",
  "Un ETF regroupe plusieurs actions ou obligations en un seul produit.",
  "Acheter des actions comporte un risque de perte en capital, à la différence d'un Livret A.",
  "Le rééquilibrage consiste à revenir périodiquement vers ton allocation cible.",
  "Si tu voulais investir davantage plus tard, ton horizon jouerait en ta faveur.",
  "**Constat.** Ton portefeuille concentre 32 % sur une seule ligne. **Impact.** Ça augmente ton risque. **Piste à explorer.** Le simulateur peut t'aider à tester une répartition.",
  "Pour simuler un versement mensuel, clique sur la chip « Simuler un versement mensuel » sous le chat.",
  "Le ratio de Sharpe mesure le rendement obtenu par unité de risque pris.",
  "Diversifying across regions lowers concentration risk.",
  "An ETF bundles many stocks into a single tradable product.",
];

describe("detectPersonalizedRecommendation", () => {
  it("flags every adversarial recommendation", () => {
    for (const msg of ADVERSARIAL) {
      expect(detectPersonalizedRecommendation(msg), `should flag: ${msg}`).not.toBeNull();
    }
  });

  it("does not flag legitimate educational replies", () => {
    for (const msg of LEGITIMATE) {
      expect(detectPersonalizedRecommendation(msg), `should NOT flag: ${msg}`).toBeNull();
    }
  });

  it("returns null on empty input", () => {
    expect(detectPersonalizedRecommendation("")).toBeNull();
  });
});

describe("evaluateEthiReply", () => {
  it("replaces a non-compliant reply with the safe fallback (FR)", () => {
    const r = evaluateEthiReply("Je te recommande d'acheter cet ETF.", "fr");
    expect(r.safe).toBe(false);
    expect(r.content).toBe(SAFE_FALLBACK.fr);
    expect(r.reason).toBeDefined();
  });

  it("replaces a non-compliant reply with the safe fallback (EN)", () => {
    const r = evaluateEthiReply("You should buy this ETF.", "en");
    expect(r.safe).toBe(false);
    expect(r.content).toBe(SAFE_FALLBACK.en);
  });

  it("passes a compliant reply through untouched", () => {
    const ok =
      "**Constat.** Ton portefeuille a 12 lignes. **Piste à explorer.** Le simulateur peut aider.";
    const r = evaluateEthiReply(ok, "fr");
    expect(r.safe).toBe(true);
    expect(r.content).toBe(ok);
    expect(r.reason).toBeUndefined();
  });

  it("passes an empty reply through untouched (endpoint handles errors)", () => {
    expect(evaluateEthiReply("", "fr")).toEqual({ safe: true, content: "" });
  });
});
