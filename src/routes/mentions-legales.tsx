import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales — Seedow" },
      { name: "description", content: "Mentions légales du site Seedow." },
    ],
  }),
  component: MentionsLegalesPage,
});

function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="max-w-3xl mx-auto px-6 pt-10 pb-8 border-b border-paper-3">
        <Link
          to="/"
          className="text-[10px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink transition-colors"
        >
          ← Retour à l'accueil
        </Link>
        <h1 className="font-value text-4xl mt-4">Mentions légales</h1>
        <p className="text-[12px] text-ink-3 mt-2">Dernière mise à jour : 15 juillet 2026</p>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10 text-[14px] text-ink-2 leading-relaxed">
        <section className="paper-card p-5 border-l-4 border-l-gold">
          <p className="text-[13px] text-ink">
            <strong>À compléter avant l'ouverture au public :</strong> Seedow n'est, à ce stade, pas
            encore immatriculé en tant que structure juridique. Les informations d'éditeur
            ci-dessous sont provisoires et doivent être remplacées par la raison sociale, l'adresse
            du siège et le SIREN/SIRET dès l'immatriculation, conformément à l'article 6-III de la
            loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN).
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">1. Éditeur du site</h2>
          <p className="mt-2">
            Éditeur : [à compléter — nom ou raison sociale, statut juridique, adresse du siège,
            SIREN/SIRET]
            <br />
            Directeur de la publication : [à compléter]
            <br />
            Contact :{" "}
            <a href="mailto:hello@seedow.life" className="underline hover:text-ink">
              hello@seedow.life
            </a>
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">2. Hébergement</h2>
          <p className="mt-2">
            L'application est déployée en edge sur l'infrastructure de Cloudflare, Inc. Les données
            (comptes, portefeuilles simulés, préférences) sont hébergées et gérées via Supabase,
            utilisé dans le cadre d'un abonnement Lovable Cloud. Les coordonnées complètes de ces
            hébergeurs (raison sociale, adresse du siège) sont disponibles sur demande auprès de
            l'éditeur ou directement auprès de ces prestataires.
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">3. Nature du service</h2>
          <p className="mt-2">
            Seedow est un outil pédagogique de simulation d'investissement responsable (ESG). Le
            portefeuille présenté dans l'application est un portefeuille virtuel valorisé sur des
            cours de marché réels — aucune somme d'argent réelle n'est investie via l'application à
            ce stade. Ce fonctionnement est rappelé sur les pages concernées par un bandeau « Mode
            démo ». Pour plus de détails sur la nature du service, voir les{" "}
            <Link to="/cgu" className="underline hover:text-ink">
              Conditions Générales d'Utilisation
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">4. Propriété intellectuelle</h2>
          <p className="mt-2">
            La marque Seedow, son logo, la charte graphique, les contenus pédagogiques (cours,
            méthodologie) et le code de l'application sont protégés par le droit de la propriété
            intellectuelle. Toute reproduction ou représentation, totale ou partielle, sans
            autorisation préalable, est interdite.
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">5. Données personnelles et cookies</h2>
          <p className="mt-2">
            Le traitement des données personnelles est décrit dans la{" "}
            <Link to="/confidentialite" className="underline hover:text-ink">
              politique de confidentialité
            </Link>
            . Seedow n'utilise aucun cookie publicitaire ou de mesure d'audience tierce ; seules des
            informations strictement nécessaires (session de connexion, préférences d'affichage)
            sont stockées localement dans le navigateur.
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">6. Responsabilité</h2>
          <p className="mt-2">
            Les informations et simulations fournies par Seedow, y compris via l'assistant Ethi, ont
            une visée pédagogique et ne constituent en aucun cas un conseil en investissement
            personnalisé. L'éditeur s'efforce d'assurer l'exactitude des informations diffusées mais
            ne peut garantir l'absence d'erreur ou d'interruption du service.
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">7. Droit applicable</h2>
          <p className="mt-2">Les présentes mentions légales sont soumises au droit français.</p>
        </section>
      </div>
    </div>
  );
}
