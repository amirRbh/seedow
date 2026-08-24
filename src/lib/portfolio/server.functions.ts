/**
 * Server functions du chemin PRODUIT.
 *
 * Une seule ici : le classement du pool. Tout ce qui calcule ou persiste une
 * allocation vit désormais dans `legacy/server.functions.ts`, hors du parcours
 * utilisateur — c'est l'utilisateur qui pose ses poids.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { loadUniverse } from "./universe.server";
import { screenPool } from "./screening";

// ─────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────
const CauseSchema = z.enum(["climat", "biodiversite", "humain", "egalite", "tech", "circulaire"]);
const ExclusionSchema = z.enum(["fossiles", "armes", "tabac", "jeux", "animaux", "fast-fashion"]);

// ─────────────────────────────────────────────────────────
// Server functions
// ─────────────────────────────────────────────────────────

/**
 * Entrées du classement — strictement celles que `screenPool` lit. Les appels
 * historiques envoient encore le paramétrage complet du portefeuille : zod
 * écarte silencieusement le surplus, personne ne casse.
 */
const ScreenParamsSchema = z.object({
  causes: z.array(CauseSchema).max(6),
  exclusions: z.array(ExclusionSchema).max(6),
});

/**
 * Sélectionne un POOL d'actifs classé selon les préférences, SANS proposer
 * d'allocation ni de poids (décision produit : on présente un pool, l'utilisateur
 * compose). Sert l'onboarding, les réglages et le simulateur `/methodologie`.
 */
export const screenAssetPool = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ScreenParamsSchema.parse(input))
  .handler(async ({ data }) => {
    const universe = await loadUniverse();
    const result = screenPool(universe.assets, {
      causes: data.causes,
      exclusions: data.exclusions,
    });
    // Payload léger pour l'UI : on n'expose pas l'objet Asset complet.
    return {
      pool: result.pool.map((s) => ({
        id: s.asset.id,
        ticker: s.asset.ticker,
        name: s.asset.name,
        asset_class: s.asset.asset_class,
        esg_score: s.asset.esg_score,
        esg_score_source: s.asset.esg_score_source,
        ter: s.asset.ter,
        relevance: s.relevance,
        sharpe: s.sharpe,
        seedow_esg_score: s.seedow_esg_score,
        cause_match: s.cause_match,
        data_tier: s.data_tier,
      })),
      excluded_count: result.excluded_count,
      universe_size: result.universe_size,
      screening_version: result.screening_version,
    };
  });
